import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function center(target: Locator) {
  const box = (await target.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function observeAnchorMotion(page: Page, pause = false) {
  await page.addInitScript(pause => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options)
      if (this instanceof HTMLElement && this.hasAttribute('data-sy-anchor-motion')) {
        const effect = animation.effect as KeyframeEffect
        const [first] = effect.getKeyframes()
        const matrix = new DOMMatrix(first.transform as string | undefined)
        const box = this.parentElement!.getBoundingClientRect()
        this.dataset.testAnchorStart = JSON.stringify({ x: box.x + matrix.e, y: box.y + matrix.f, width: box.width * matrix.a, height: box.height * matrix.d })
        this.dataset.testAnchorCurve = effect.getTiming().easing
        this.dataset.testAnchorTransform = String(Boolean(first.transform))
        if (pause) {
          animation.pause()
          animation.currentTime = Number(effect.getTiming().duration) * .25
        }
      }
      return animation
    }
  }, pause)
}

test('the cold menu preview has its final geometry before the first frame and still animates theme changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const frames: number[][] = []
    function sample() {
      const result = document.querySelector('.review-menu-result')
      const button = result?.closest('section')?.querySelector('button')
      if (result && button) {
        const rect = button.getBoundingClientRect()
        frames.push([rect.height, result.getBoundingClientRect().top - rect.top])
      }
      if (frames.length < 12) requestAnimationFrame(sample)
      else document.body.dataset.testMenuStart = JSON.stringify(frames)
    }
    requestAnimationFrame(sample)
  })
  await page.goto('/?component=W.export.menu')
  const body = page.locator('body')
  await expect(body).toHaveAttribute('data-test-menu-start', /\[/)
  const frames = JSON.parse(await body.getAttribute('data-test-menu-start') ?? '[]')
  expect(frames).toEqual(Array.from({ length: 12 }, () => [34, 40]))
  await expect(page.locator('#app')).not.toHaveAttribute('data-sy-initializing')
  const trigger = page.getByRole('button', { name: '打开逐项操作' })
  await trigger.evaluate(element => {
    element.addEventListener('transitionrun', event => {
      if (event.propertyName === 'background-color') {
        element.setAttribute('data-test-theme-easing', getComputedStyle(element).transitionTimingFunction)
      }
    })
  })
  await page.getByRole('switch', { name: '深色' }).press('Space')
  await expect(trigger).toHaveAttribute('data-test-theme-easing', /cubic-bezier/)
})

test('the dropdown opens on press and chooses only the row under the released mouse', async ({ page }) => {
  await page.goto('/?component=W.export.menu')
  const trigger = page.getByRole('button', { name: '文件操作' })
  const menu = page.getByRole('menu', { name: '文件操作' })
  await trigger.hover()
  await page.mouse.down()
  await expect(menu).toBeVisible()
  const details = menu.getByRole('menuitem', { name: '查看详情' })
  await details.hover()
  await expect(details).toBeFocused()
  await page.mouse.up()
  await expect(menu).toBeHidden()
  await expect(page.locator('.review__result')).toContainText('已打开详情')
  await trigger.click()
  await expect(menu).toBeVisible()
  await trigger.press('Escape')
  await expect(menu).toBeHidden()
})

test('menu presses clear over disabled items, forward modifiers and scroll at an edge', async ({ page }) => {
  await page.goto('/?component=W.export.menu')
  const review = page.getByRole('region', { name: '按下拖动选择' })
  const status = review.locator('output .sy-visually-hidden')
  const trigger = review.getByRole('button')
  const menu = review.getByRole('menu')
  await trigger.hover()
  await page.mouse.down()
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: '动作 1', exact: true }).hover()
  await expect(menu.getByRole('menuitem', { name: '动作 1', exact: true })).toBeFocused()
  await menu.getByRole('menuitem', { name: '动作 2', exact: true }).hover()
  await expect(menu).toBeFocused()
  await page.mouse.move(2, 2)
  await page.mouse.up()
  await expect(menu).toBeHidden()
  await expect(status).toBeEmpty()

  await trigger.hover()
  await page.mouse.down()
  await expect(menu).toBeVisible()
  const box = (await menu.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 7)
  await expect.poll(() => menu.evaluate(node => node.scrollTop)).toBeGreaterThan(40)
  const item = menu.getByRole('menuitem', { name: '动作 10', exact: true })
  await item.scrollIntoViewIfNeeded()
  await item.hover()
  await page.keyboard.down('Shift')
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await expect(status).toHaveText('动作 10 · 释放与 Shift · 1')
  await trigger.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: '动作 1', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: '动作 3', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(status).toHaveText('动作 3 · 选择 · 2')
  await expect(trigger).toBeFocused()
})

test('a held touch selects on release and discards the browser click echo', async ({ page }) => {
  await page.goto('/?component=W.export.menu')
  const review = page.getByRole('region', { name: '按下拖动选择' })
  const trigger = review.getByRole('button')
  const menu = review.getByRole('menu')
  const result = review.locator('output')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await trigger.evaluate(element => Promise.allSettled(element.getAnimations().map(animation => animation.finished)))
  const position = () => result.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const anchor = element.closest('section')!.querySelector('button')!.getBoundingClientRect()
    return { width: rect.width, height: rect.height, top: rect.top - anchor.top }
  })
  const bounds = await position()
  await result.evaluate(element => {
    element.addEventListener('transitionrun', event => {
      if (event.propertyName === 'opacity' && event.target instanceof HTMLElement) {
        element.dataset.testResultEase = getComputedStyle(event.target).transitionTimingFunction
      }
    })
  })
  const start = await center(trigger)
  const pointer = { pointerType: 'touch', pointerId: 19, isPrimary: true, bubbles: true, button: 0 }
  await trigger.dispatchEvent('pointerdown', { ...pointer, clientX: start.x, clientY: start.y })
  await expect(menu).toBeVisible()
  const release = await center(menu.getByRole('menuitem', { name: '动作 3', exact: true }))
  await trigger.dispatchEvent('pointermove', { ...pointer, clientX: release.x, clientY: release.y })
  await trigger.dispatchEvent('pointerup', { ...pointer, clientX: release.x, clientY: release.y, shiftKey: true })
  await trigger.dispatchEvent('click', { detail: 1, bubbles: true })
  await expect(result.locator('.sy-visually-hidden')).toHaveText('动作 3 · 释放与 Shift · 1')
  await expect(result).toHaveAttribute('data-test-result-ease', /cubic-bezier/)
  expect(await position()).toEqual(bounds)
  await expect(menu).toBeHidden()
})

test.describe('anchored touch motion', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 850 } })

  for (const example of [
    { id: 'W.dropdown', trigger: '文件操作', surface: '.sy-menu' },
    { id: 'W.dropdown', trigger: '快捷操作', surface: '.sy-menu' },
    { id: 'W.popover', trigger: '筛选项目', surface: '.sy-popover' },
  ]) {
    test(`${example.trigger} grows from its trigger and shrinks back`, async ({ page }) => {
      await observeAnchorMotion(page)
      await page.goto(`/?component=${example.id}`)
      const trigger = page.getByRole('button', { name: example.trigger, exact: true })
      const panel = page.locator(`${example.surface}[data-sy-anchor-motion]`)
      await trigger.tap()
      await expect(panel).toHaveAttribute('data-test-anchor-curve', /cubic-bezier/)
      const from = JSON.parse((await panel.getAttribute('data-test-anchor-start'))!)
      const source = (await trigger.boundingBox())!
      for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(from[key] - source[key])).toBeLessThan(2)
      await panel.evaluate(async node => {
        await Promise.allSettled(node.getAnimations().map(animation => animation.finished))
        node.addEventListener('animationstart', event => { document.body.dataset.testAnchorExit = event.animationName }, { once: true })
      })
      await page.keyboard.press('Escape')
      await expect(page.locator('body')).toHaveAttribute('data-test-anchor-exit', 'sy-anchor-touch-out')
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })
  }

  test('a new touch stays held during entrance and Escape closes from the presented rect', async ({ page }) => {
    await observeAnchorMotion(page, true)
    await page.goto('/?component=W.dropdown')
    const trigger = page.getByRole('button', { name: '文件操作', exact: true })
    await trigger.tap()
    const panel = page.locator('.sy-menu[data-sy-anchor-motion]')
    await expect(panel).toHaveAttribute('data-test-anchor-transform', 'true')
    await page.evaluate(() => {
      const target = document.createElement('button')
      target.textContent = '下一个操作'
      target.style.cssText = 'position: fixed; top: 48px; right: 12px; z-index: 99; padding: 12px; touch-action: manipulation'
      target.addEventListener('click', () => { document.body.dataset.testOutsideClick = '' })
      document.body.append(target)
    })
    const outsideButton = page.getByRole('button', { name: '下一个操作' })
    const outside = await center(outsideButton)
    await expect.poll(() => outsideButton.evaluate((button, point) => button.contains(document.elementFromPoint(point.x, point.y)), outside)).toBe(true)
    await page.touchscreen.tap(outside.x, outside.y)
    await expect(page.locator('body')).not.toHaveAttribute('data-test-outside-click')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: '下一个操作' })).not.toBeFocused()
    const gestures = await page.getByRole('button', { name: '下一个操作' }).evaluate(node => {
      const held = { identifier: 62, target: node, clientX: 355, clientY: 60 }
      const second = { ...held, identifier: 63, clientX: 333 }
      const pointer = { pointerId: 61, pointerType: 'touch', bubbles: true, cancelable: true, clientX: 355, clientY: 60 }
      const touch = (type: string, touches: object[], changedTouches: object[]) => {
        const event = new Event(type, { bubbles: true, cancelable: true })
        Object.assign(event, { touches, changedTouches })
        return node.dispatchEvent(event)
      }
      node.dispatchEvent(new PointerEvent('pointerdown', pointer))
      touch('touchstart', [held], [held])
      const panHeld = !touch('touchmove', [held], [held])
      const pinchAllowed = touch('touchmove', [held, second], [held, second])
      node.dispatchEvent(new PointerEvent('pointercancel', pointer))
      touch('touchcancel', [], [held])
      return { panHeld, pinchAllowed }
    })
    expect(gestures).toEqual({ panHeld: true, pinchAllowed: true })
    const from = await panel.evaluate(node => {
      node.addEventListener('animationstart', event => {
        const motion = node.getAnimations().find(animation => (animation as CSSAnimation).animationName === event.animationName)!
        motion.pause()
        motion.currentTime = 0
        document.body.dataset.testAnchorExitFrame = getComputedStyle(node).transform
        motion.play()
      }, { once: true })
      return getComputedStyle(node).transform
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).toHaveAttribute('data-test-anchor-exit-frame', from)
    await expect(panel).toHaveCount(0)
    await outsideButton.tap()
    await expect(page.locator('body')).toHaveAttribute('data-test-outside-click', '')
  })

  test('a held contact can pick a row and an outside pan closes the next menu', async ({ page }) => {
    await observeAnchorMotion(page)
    await page.goto('/?component=W.export.menu')
    const trigger = page.getByRole('button', { name: '文件操作', exact: true })
    const menu = page.getByRole('menu', { name: '文件操作' })
    const start = await center(trigger)
    const contact = { pointerType: 'touch', pointerId: 32, isPrimary: true, bubbles: true, cancelable: true, button: 0 }
    await trigger.dispatchEvent('pointerdown', { ...contact, clientX: start.x, clientY: start.y })
    await expect(menu).toHaveAttribute('data-test-anchor-transform', 'true')
    await menu.evaluate(async node => { await Promise.allSettled(node.getAnimations().map(animation => animation.finished)) })
    const row = await center(menu.getByRole('menuitem', { name: '查看详情' }))
    await trigger.dispatchEvent('pointermove', { ...contact, clientX: row.x, clientY: row.y })
    await trigger.dispatchEvent('pointerup', { ...contact, clientX: row.x, clientY: row.y })
    await expect(page.locator('.review__result').first()).toContainText('已打开详情')
    await expect(menu).toBeHidden()
    await trigger.tap()
    await expect(menu).toHaveAttribute('data-test-anchor-transform', 'true')
    await menu.evaluate(async node => { await Promise.allSettled(node.getAnimations().map(animation => animation.finished)) })
    await page.locator('body').dispatchEvent('pointerdown', { ...contact, clientX: 370, clientY: 520 })
    await page.locator('body').dispatchEvent('pointermove', { ...contact, clientX: 370, clientY: 498 })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('reduced motion uses a stationary fade and a pinned popover uses standard motion', async ({ page }) => {
    await observeAnchorMotion(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?component=W.dropdown')
    const trigger = page.getByRole('button', { name: '文件操作', exact: true })
    await trigger.tap()
    const menu = page.getByRole('menu', { name: '文件操作' })
    await expect(menu).toHaveAttribute('data-sy-anchor-motion', 'fade')
    await expect(menu).toHaveAttribute('data-test-anchor-transform', 'false')
    await menu.evaluate(node => node.addEventListener('animationstart', event => {
      document.body.dataset.testAnchorExit = event.animationName
    }, { once: true }))
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).toHaveAttribute('data-test-anchor-exit', 'sy-anchor-touch-fade-out')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const pinned = page.getByRole('button', { name: '草稿快捷操作', exact: true })
    await pinned.tap()
    const fixedMenu = page.getByRole('menu', { name: '草稿快捷操作' })
    await expect(fixedMenu).toBeVisible()
    await expect(fixedMenu).not.toHaveAttribute('data-sy-anchor-motion')
  })

  test('a menu that waits for permissions still uses its accepted touch when it opens', async ({ page }) => {
    await observeAnchorMotion(page)
    await page.goto('/?component=W.dropdown')
    const trigger = page.getByRole('button', { name: '管理项目', exact: true })
    const menu = page.getByRole('menu', { name: '管理项目' })
    await trigger.tap()
    await expect(trigger).toHaveAttribute('aria-busy', 'true')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toHaveAttribute('data-test-anchor-transform', 'true')
    await expect(menu.getByRole('menuitem', { name: '查看访问权限' })).toBeVisible()
  })
})
