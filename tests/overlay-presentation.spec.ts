import { expect, test, type Locator } from '@playwright/test'

async function recordOpenerGeometry(opener: Locator) {
  await opener.evaluate(element => {
    element.setAttribute('data-test-geometry-reads', '0')
    element.getBoundingClientRect = () => {
      element.setAttribute('data-test-geometry-reads', String(Number(element.getAttribute('data-test-geometry-reads')) + 1))
      return DOMRect.fromRect({ x: 8, y: innerHeight / 2 - 10, width: 20, height: 20 })
    }
  })
}

test('standard dialogs travel from the opener and fullscreen dialogs fade in place', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/?component=W.modal')
  const preview = page.getByRole('region', { name: '对话框展示方式' })
  const standardOpener = preview.getByRole('button', { name: '编辑联系人' })
  const fullOpener = preview.getByRole('button', { name: '全屏预览' })
  await recordOpenerGeometry(standardOpener)
  await recordOpenerGeometry(fullOpener)
  await preview.locator('dialog').evaluate(dialog => {
    new MutationObserver(() => {
      if (!dialog.hasAttribute('data-visible')) return
      const panel = dialog.querySelector('.sy-dialog__panel')!
      const animations = panel.getAnimations()
      const moving = animations.find(animation => animation instanceof CSSTransition && animation.transitionProperty === 'transform')
      const transform = (moving?.effect as KeyframeEffect | undefined)?.getKeyframes()[0]?.transform as string | undefined
      dialog.setAttribute('data-test-translation', String(transform ? new DOMMatrixReadOnly(transform).m41 : 0))
      dialog.setAttribute('data-test-fade', String(animations.some(animation => animation instanceof CSSTransition && animation.transitionProperty === 'opacity')))
      if (moving) dialog.setAttribute('data-test-curve', getComputedStyle(panel).transitionTimingFunction)
    }).observe(dialog, { attributes: true, attributeFilter: ['data-visible'] })
  })

  await standardOpener.press('Enter')
  const standard = page.getByRole('dialog', { name: '联系人资料' })
  await expect(standardOpener).toHaveAttribute('data-test-geometry-reads', '1')
  await expect(standard).toHaveAttribute('data-test-translation', '-16')
  await expect(standard).toHaveAttribute('data-test-curve', /cubic-bezier/)
  await expect(standard.locator('.sy-dialog__panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.keyboard.press('Escape')
  await expect(standardOpener).toBeFocused()

  await fullOpener.press('Enter')
  const fullscreen = page.getByRole('dialog', { name: '全屏交付预览' })
  await expect(fullscreen).toHaveAttribute('data-test-fade', 'true')
  await expect(fullscreen).toHaveAttribute('data-test-translation', '0')
  await expect(fullOpener).toHaveAttribute('data-test-geometry-reads', '0')
  await expect(fullscreen.locator('.sy-dialog__panel')).toHaveCSS('transform', 'none')
  await page.keyboard.press('Escape')
  await expect(fullOpener).toBeFocused()
})

test('a dialog avoids reading opener geometry under system or theme reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?component=W.modal')
  const preview = page.getByRole('region', { name: '对话框展示方式' })
  const opener = preview.getByRole('button', { name: '编辑联系人' })
  const dialog = page.getByRole('dialog', { name: '联系人资料' })
  await recordOpenerGeometry(opener)
  await opener.press('Enter')
  await expect(dialog).toHaveAttribute('data-settled', '')
  await expect(dialog.locator('.sy-dialog__panel')).toHaveCSS('transition-duration', '0s')
  await expect(opener).toHaveAttribute('data-test-geometry-reads', '0')
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await preview.evaluate(node => node.setAttribute('data-sy-reduced-motion', ''))
  await opener.press('Enter')
  await expect(dialog).toHaveAttribute('data-settled', '')
  await expect(opener).toHaveAttribute('data-test-geometry-reads', '0')
  const field = dialog.getByRole('textbox', { name: '联系人姓名' })
  await field.fill('李禾')
  await preview.evaluate(node => node.removeAttribute('data-sy-reduced-motion'))
  await expect(opener).toHaveAttribute('data-test-geometry-reads', '1')
  await expect(field).toHaveValue('李禾')
  await expect(field).toBeFocused()
  await expect(dialog).toBeVisible()
})

test('the delivery chart changes presentation in the same dialog and re-aims at its opener', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?component=W.modal')
  const opener = page.getByRole('button', { name: '查看交付量' })
  await recordOpenerGeometry(opener)
  await opener.press('Enter')
  const dialog = page.getByRole('dialog', { name: '每日交付量' })
  await expect(dialog).toHaveAttribute('data-settled', '')
  await dialog.evaluate(node => node.setAttribute('data-test-original-dialog', ''))
  const panel = dialog.locator('.sy-dialog__panel')
  await panel.evaluate(node => {
    const animate = node.animate.bind(node)
    node.animate = (keyframes, options) => {
      const animation = animate(keyframes, options)
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      node.setAttribute('data-test-replay', frames[0]?.transform ? 'directional' : 'fade')
      return animation
    }
  })
  await dialog.getByRole('button', { name: '全屏查看' }).press('Enter')
  await expect(dialog).toHaveAttribute('data-variant', 'fullscreen')
  await expect(panel).toHaveAttribute('data-test-replay', 'fade')
  await expect(panel).toHaveCSS('transform', 'none')
  await expect(opener).toHaveAttribute('data-test-geometry-reads', '1')

  await dialog.getByRole('button', { name: '退出全屏' }).press('Enter')
  await expect(dialog).not.toHaveAttribute('data-variant')
  await expect(dialog).toHaveAttribute('data-test-original-dialog', '')
  await expect(panel).toHaveAttribute('data-test-replay', 'directional')
  await expect(opener).toHaveAttribute('data-test-geometry-reads', '2')
  await expect(dialog.getByRole('button', { name: '全屏查看' })).toBeFocused()
  await dialog.getByRole('button', { name: '完成', exact: true }).press('Enter')
  await expect(opener).toBeFocused()
})

test('the inline dialog animates the page layout and leaves adjacent controls operable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/?component=W.modal')
  const scene = page.getByRole('region', { name: '发布清单与边缘定位' })
  const toggle = scene.getByRole('switch', { name: '显示发布清单' })
  const checklist = scene.getByRole('region', { name: '发布清单', exact: true })
  const files = checklist.getByRole('checkbox', { name: '核对交付附件' })
  const recipients = checklist.getByRole('checkbox', { name: '确认接收成员' })
  const outside = scene.getByRole('button', { name: '编辑对话框位置' })
  await expect(checklist).toHaveAttribute('data-inline')
  expect(await checklist.evaluate(node => node.tagName)).toBe('SECTION')
  await expect(checklist.locator('.sy-dialog__panel')).toHaveCSS('background-color', 'rgb(245, 245, 245)')
  await expect(checklist.locator('.sy-dialog__panel')).toHaveCSS('padding-inline-start', '12px')
  await files.press('Space')
  await recipients.press('Space')
  await expect(checklist.getByText('已就绪', { exact: true }).first()).toBeVisible()
  await outside.focus()
  await expect(outside).toBeFocused()
  const before = await outside.evaluate(node => node.getBoundingClientRect().top + scrollY)
  await checklist.evaluate(node => {
    node.addEventListener('transitionrun', event => {
      if (event.propertyName === 'grid-template-rows') {
        node.setAttribute('data-test-row-easing', getComputedStyle(node).transitionTimingFunction)
      }
    })
  })
  await toggle.press('Space')
  await expect(scene.locator('[data-inline]')).toHaveAttribute('data-test-row-easing', /cubic-bezier/)
  await expect(scene.locator('[data-inline]')).toHaveAttribute('aria-hidden', 'true')
  await expect.poll(() => outside.evaluate(node => node.getBoundingClientRect().top + scrollY)).toBeLessThan(before - 30)
  await expect(files).toBeHidden()
  await expect(toggle).toBeFocused()
  await toggle.press('Space')
  await expect(files).toBeChecked()
  await expect(recipients).toBeChecked()
})

test('dialog edge offsets animate and mirror with reading direction', async ({ page }) => {
  await page.setViewportSize({ width: 1130, height: 780 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?component=W.modal')
  const opener = page.getByRole('button', { name: '编辑对话框位置' })
  await opener.press('Enter')
  const dialog = page.getByRole('dialog', { name: '对话框位置' })
  await expect(dialog).toHaveAttribute('data-settled', '')
  await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.id = 'test-dialog-viewport'
    probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'
    document.body.append(probe)
  })
  const gap = (side: 'top' | 'right' | 'bottom' | 'left') => dialog.evaluate((node, side) => {
    const box = node.getBoundingClientRect()
    const viewport = document.getElementById('test-dialog-viewport')!.getBoundingClientRect()
    return side === 'right' || side === 'bottom' ? viewport[side] - box[side] : box[side] - viewport[side]
  }, side)
  await expect.poll(() => gap('top')).toBeCloseTo(16)
  await expect.poll(() => gap('right')).toBeCloseTo(16)
  await dialog.evaluate(node => {
    const animate = node.animate.bind(node)
    node.animate = (keyframes, options) => {
      const animation = animate(keyframes, options)
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      if (frames[0]?.translate && frames.length > 2) node.setAttribute('data-test-glide', String(frames.length))
      return animation
    }
  })
  const rtl = dialog.getByRole('switch', { name: '从右向左排版' })
  await rtl.press('Space')
  await expect(rtl).toBeFocused()
  await expect(dialog).toHaveAttribute('dir', 'rtl')
  await expect(dialog).toHaveAttribute('data-test-glide', /\d+/)
  await expect.poll(() => gap('left')).toBeCloseTo(16)
  await dialog.getByLabel('起始边', { exact: true }).press('Enter')
  await expect.poll(() => gap('right')).toBeCloseTo(16)
  await dialog.getByRole('switch', { name: '贴近底边' }).press('Space')
  await expect.poll(() => gap('bottom')).toBeCloseTo(16)

  await page.setViewportSize({ width: 375, height: 700 })
  await expect.poll(() => gap('left')).toBeGreaterThanOrEqual(0)
  await expect.poll(() => gap('right')).toBeCloseTo(16)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await dialog.evaluate(node => node.removeAttribute('data-test-glide'))
  await rtl.press('Space')
  await expect.poll(() => gap('left')).toBeCloseTo(16)
  await expect(dialog).not.toHaveAttribute('data-test-glide')
  await dialog.getByRole('button', { name: '完成定位' }).press('Enter')
  await expect(opener).toBeFocused()
})

test('native dialogs support guarded editing, pinned scrolling, fullscreen and required confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 760 })
  await page.goto('/?component=W.modal')
  const preview = page.getByRole('region', { name: '对话框展示方式' })
  const edit = preview.getByRole('button', { name: '编辑联系人' })
  await edit.click()
  const profile = page.getByRole('dialog', { name: '联系人资料' })
  await expect(profile).toHaveAttribute('data-settled', '')
  const name = profile.getByRole('textbox', { name: '联系人姓名' })
  await expect(name).toBeFocused()
  await name.fill('小林')
  await page.mouse.click(10, 20)
  await expect(profile).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(profile).toBeHidden()
  await expect(edit).toBeFocused()
  await edit.press('Enter')
  await expect(name).toHaveValue('小林')
  await profile.getByRole('button', { name: '保存联系人' }).click()
  await expect(preview.locator('.overlay-review__result .sy-visually-hidden')).toHaveText('已保存 小林')

  await preview.getByRole('button', { name: '阅读交付条款' }).click()
  const terms = page.getByRole('dialog', { name: '交付条款' })
  const content = terms.locator('.sy-dialog__body')
  const footer = terms.getByRole('button', { name: '完成阅读' })
  await expect(terms).toHaveAttribute('data-settled', '')
  const position = await footer.boundingBox()
  const scrolled = await content.evaluate(el => {
    el.scrollTop = el.scrollHeight
    return el.scrollTop
  })
  expect(scrolled).toBeGreaterThan(0)
  expect(await footer.boundingBox()).toEqual(position)
  await footer.click()

  await preview.getByRole('button', { name: '全屏预览' }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏交付预览' })
  await expect(fullscreen).toHaveAttribute('data-settled', '')
  expect(await fullscreen.boundingBox()).toEqual({ x: 0, y: 0, width: 1100, height: 760 })
  await page.keyboard.press('Escape')
  await expect(fullscreen).toBeHidden()

  const permission = preview.getByRole('button', { name: '确认发布权限' })
  await permission.click()
  const required = page.getByRole('dialog', { name: '确认发布权限' })
  await expect(required).toHaveAttribute('data-settled', '')
  await page.keyboard.press('Escape')
  await page.mouse.click(10, 20)
  await expect(required).toBeVisible()
  await required.getByRole('button', { name: '同意并完成' }).click()
  await expect(permission).toBeFocused()

  await preview.getByRole('button', { name: '打开交付说明' }).click()
  const info = page.getByRole('dialog', { name: '交付说明' })
  await expect(info).toHaveAccessibleDescription('确认文件名称与发布版本。')
  await expect(info.getByRole('button', { name: '查看状态' })).toBeVisible()
  await info.getByRole('button', { name: '关闭交付说明' }).click()
  await expect(info).toBeHidden()
})

test('drawer forms protect edits and honor logical sides and width units', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto('/?component=W.drawer')
  const preview = page.getByRole('region', { name: '抽屉展示方式' })
  const trigger = preview.getByRole('button', { name: '编辑交付负责人' })
  const drawer = page.getByRole('dialog', { name: '交付详情' })
  await trigger.click()
  await expect(drawer).toHaveAttribute('aria-modal', 'true')
  await page.mouse.click(10, 20)
  await expect(drawer).toBeVisible()
  const edit = drawer.getByRole('textbox', { name: '负责人姓名' })
  await edit.fill('陈晨')
  await drawer.getByRole('button', { name: '查看修订' }).click()
  await expect(drawer.getByText('已更新共享资料的发布范围。')).toBeVisible()
  await drawer.getByRole('button', { name: '保存负责人' }).click()
  await expect(trigger).toBeFocused()
  await expect(preview.locator('.overlay-review__result .sy-visually-hidden')).toHaveText('已保存负责人 陈晨')

  const switcher = preview.getByRole('switch', { name: '从右到左阅读' })
  const start = preview.getByRole('button', { name: '从起始侧打开' })
  await start.click()
  await expect(drawer.locator('..')).toHaveAttribute('data-side', 'left')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await switcher.click()
  await start.click()
  await expect(drawer.locator('..')).toHaveAttribute('data-side', 'right')
  await page.keyboard.press('Escape')

  await preview.getByRole('button', { name: '比较抽屉宽度' }).click()
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(320)
  await drawer.getByRole('button', { name: '26 rem' }).click()
  const rem = await page.locator('html').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBeCloseTo(26 * rem, 0)
  await drawer.getByRole('button', { name: '视口宽度的 50%' }).click()
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(500)
  await page.setViewportSize({ width: 320, height: 720 })
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(160)
})

test('a non-modal drawer or sheet keeps the underlying page actionable', async ({ page }) => {
  for (const scene of [
    { component: 'W.drawer', trigger: '打开并列详情', dialog: '交付详情', action: '登记页面变更', close: '关闭交付详情' },
    { component: 'W.sheet', trigger: '打开无罩备注', dialog: '无需遮罩的备注', action: '更新页面记录', close: '关闭底部面板' },
  ]) {
    await page.setViewportSize({ width: 1200, height: 880 })
    await page.goto('/?component=' + scene.component)
    const trigger = page.getByRole('button', { name: scene.trigger })
    await trigger.click()
    const panel = page.getByRole('dialog', { name: scene.dialog })
    await expect(panel.locator('..').locator('.sy-panel-layer__backdrop')).toHaveCount(0)
    await page.getByRole('button', { name: scene.action }).click()
    await expect(page.getByText('已登记 1 次', { exact: true }).filter({ visible: true })).not.toHaveCount(0)
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: scene.close }).click()
    await expect(trigger).toBeFocused()
  }
})

test('bottom sheets fit content, cap scrollable content and slide into a lighter peek stop', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto('/?component=W.sheet')
  const hug = page.getByRole('dialog', { name: '当前交付状态' })
  await page.getByRole('button', { name: '按内容定高' }).click()
  await expect.poll(async () => (await hug.boundingBox())?.height ?? Infinity).toBeLessThan(220)
  await page.keyboard.press('Escape')
  await expect(hug).toBeHidden()
  const capped = page.getByRole('dialog', { name: '更新记录' })
  await page.getByRole('button', { name: '限制最高高度' }).click()
  await expect.poll(async () => (await capped.boundingBox())?.height).toBeCloseTo(480, 1)
  expect(await capped.locator('.sy-panel__body').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: '查看停靠位置' }).click()
  const peek = page.getByRole('dialog', { name: '配送进度' })
  const resize = peek.getByRole('button', { name: '切换配送面板高度' })
  const scrim = peek.locator('..').locator('.sy-panel-layer__backdrop')
  await expect.poll(async () => (await peek.boundingBox())?.height).toBeCloseTo(400, 1)
  await resize.press('Home')
  await expect(peek).toHaveAttribute('data-peek', 'true')
  await expect.poll(async () => (await peek.boundingBox())?.y).toBeCloseTo(704, 0)
  expect((await peek.boundingBox())?.height).toBeCloseTo(400, 1)
  await expect(scrim).toHaveCSS('opacity', '0.22')
  await expect(peek.locator('.sy-panel__body')).toHaveAttribute('inert', '')
  await resize.press('ArrowUp')
  await expect(peek).not.toHaveAttribute('data-peek')
  await expect(scrim).toHaveCSS('opacity', '1')
  await expect.poll(async () => (await peek.boundingBox())?.y).toBeCloseTo(400, 0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '筛选交付', exact: true }).click()
  const filters = page.getByRole('dialog', { name: '筛选交付记录' })
  await filters.getByRole('checkbox', { name: '仅显示待处理' }).check()
  await filters.getByRole('button', { name: '应用筛选' }).click()
  await expect(filters).toBeHidden()
  await expect(page.locator('.overlay-review__result .sy-visually-hidden')).toHaveText('仅显示待处理记录')
})

test('touch scrolling hands only travel beyond the inner scroll edge to the sheet', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Sends native touch contacts through Chromium')
  const context = await browser.newContext({ viewport: { width: 400, height: 780 }, hasTouch: true, isMobile: true })
  try {
    const page = await context.newPage()
    await page.goto('/?component=W.sheet')
    await page.getByRole('button', { name: '拖动与滚动' }).tap()
    const sheet = page.getByRole('dialog', { name: '交付历史' })
    const history = sheet.getByRole('list', { name: '修订记录' })
    const slider = sheet.getByRole('slider', { name: '已阅进度' })
    await sheet.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)))
    const y = async () => (await sheet.boundingBox())!.y
    const baseline = await y()
    const pageScroll = await page.evaluate(() => scrollY)
    const cdp = await context.newCDPSession(page)
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', touchPoints: { x: number; y: number }[] = []) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
    async function startAt(target: Locator, vertical = .5) {
      const box = (await target.boundingBox())!
      const point = { x: Math.round(box.x + box.width * .35), y: Math.round(box.y + box.height * vertical) }
      await send('touchStart', [point])
      return (dy: number) => send('touchMove', [{ x: point.x, y: point.y + dy }])
    }
    const getScroll = () => history.evaluate(node => node.scrollTop)
    const initialScroll = await history.evaluate(node => {
      node.scrollTop = node.scrollHeight - node.clientHeight
      return node.scrollTop
    })
    expect(initialScroll).toBeGreaterThan(30)
    const pull = await startAt(history, .25)
    await pull(20)
    await pull(30)
    await expect.poll(getScroll).toBeLessThan(initialScroll)
    expect(await y()).toBeCloseTo(baseline, 0)
    await pull(initialScroll + 38)
    await expect.poll(getScroll).toBe(0)
    await pull(initialScroll + 51)
    await pull(initialScroll + 77)
    await expect(sheet).toHaveAttribute('data-dragging', 'true')
    await expect.poll(y).toBeGreaterThan(baseline + 10)
    expect(await y()).toBeLessThan(baseline + 68)
    await send('touchCancel')
    await expect.poll(y).toBeCloseTo(baseline, 0)

    const fromSlider = await startAt(slider)
    await fromSlider(60)
    await expect(sheet).not.toHaveAttribute('data-dragging')
    expect(await y()).toBeCloseTo(baseline, 0)
    await send('touchEnd')

    const atBottom = await history.evaluate(node => {
      node.scrollTop = node.scrollHeight
      return node.scrollTop
    })
    const push = await startAt(history)
    await push(-74)
    await expect.poll(y).toBeLessThan(baseline - 55)
    await push(-153)
    await send('touchEnd')
    await expect.poll(y).toBeCloseTo(780 * .18, 0)
    expect(await getScroll()).toBe(atBottom)
    expect(await page.evaluate(() => scrollY)).toBe(pageScroll)
    await sheet.getByRole('button', { name: '标为已读' }).tap()
    await expect(slider).toHaveAttribute('aria-valuenow', '100')
  } finally {
    await context.close()
  }
})

test('bottom sheet body gestures yield to custom touch actions and a second finger', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 780 })
  await page.goto('/?component=W.sheet')
  await page.getByRole('button', { name: '拖动与滚动' }).click()
  const sheet = page.getByRole('dialog', { name: '交付历史' })
  const history = sheet.getByRole('list', { name: '修订记录' })
  await sheet.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)))
  const top = async () => (await sheet.boundingBox())!.y
  const baseline = await top()
  const dispatch = (touchAction: string, second = false) => history.evaluate((node, options) => {
    node.style.touchAction = options.touchAction
    const point = (identifier: number, clientY: number) => ({ identifier, clientY, clientX: 80, target: node })
    const send = (type: string, touches: ReturnType<typeof point>[], changedTouches = touches) => {
      const event = new Event(type, { bubbles: true, cancelable: true, composed: true })
      Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } })
      node.dispatchEvent(event)
      return event.defaultPrevented
    }
    send('touchstart', [point(0, 490)])
    const claimed = send('touchmove', [point(0, 535)])
    if (options.second) send('touchstart', [point(0, 535), point(1, 510)], [point(1, 510)])
    return claimed
  }, { touchAction, second })
  expect(await dispatch('pinch-zoom')).toBe(false)
  await expect(sheet).not.toHaveAttribute('data-dragging')
  expect(await top()).toBeCloseTo(baseline, 0)

  // The horizontal region can still hand a vertical pull to the outer sheet.
  expect(await dispatch('pan-x')).toBe(true)
  await expect(sheet).toHaveAttribute('data-dragging', 'true')
  expect(await top()).toBeCloseTo(baseline + 45, 0)
  expect(await dispatch('auto', true)).toBe(true)
  await expect(sheet).not.toHaveAttribute('data-dragging')
  await expect.poll(top).toBeCloseTo(baseline, 0)
})

const backdropExamples = [
  { component: 'W.modal', trigger: '打开交付说明', title: '交付说明' },
  { component: 'W.drawer', trigger: '比较抽屉宽度', title: '交付详情' },
  { component: 'W.sheet', trigger: '拖动与滚动', title: '交付历史' },
  { component: 'W.sheet', trigger: '打开三步发布流程', title: '已准备发布' },
]

for (const { component, trigger, title } of backdropExamples) {
  test(`${title} closes only on a complete backdrop press, one layer at a time`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 760 })
    await page.goto('/?component=' + component)
    const opener = page.getByRole('button', { name: trigger })
    await opener.click()
    if (title === '已准备发布') {
      await page.getByRole('textbox', { name: '发布摘要' }).fill('确认交付版本')
      await page.getByRole('button', { name: '核对摘要' }).click()
      await page.getByRole('button', { name: '确认摘要' }).click()
    }
    const surface = page.getByRole('dialog', { name: title, exact: true })
    await surface.evaluate(node => Promise.allSettled(node.getAnimations({ subtree: true }).map(effect => effect.finished)))
    const box = (await surface.boundingBox())!
    const scrim = { x: 12, y: 16 }
    const inside = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
    const press = async (from = scrim, to = scrim) => {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y)
      await page.mouse.up()
    }
    await page.mouse.move(scrim.x, scrim.y)
    await page.mouse.down()
    await expect(surface).toBeVisible()
    await page.mouse.move(inside.x, inside.y)
    await page.mouse.up()
    await expect(surface).toBeVisible()
    await press(inside, scrim)
    await expect(surface).toBeVisible()
    await page.mouse.click(scrim.x, scrim.y, { button: 'right' })
    await expect(surface).toBeVisible()

    const actions = surface.getByRole('button', { name: '交付操作' })
    await actions.press('Enter')
    const menu = page.getByRole('menu', { name: '交付操作' })
    await expect(menu).toBeVisible()
    await press()
    await expect(menu).toBeHidden()
    await expect(surface).toBeVisible()
    await expect.poll(() => surface.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true)
    await press()
    await expect(surface).toBeHidden()
    await expect(opener).toBeFocused()
  })
}

test('a native auto popover consumes its backdrop click before the containing dialog', async ({ page }) => {
  await page.goto('/?component=W.modal')
  await page.getByRole('button', { name: '打开交付说明' }).click()
  const dialog = page.getByRole('dialog', { name: '交付说明' })
  await expect(dialog).toHaveAttribute('data-settled', '')
  await dialog.evaluate(node => {
    const popover = document.createElement('div')
    popover.setAttribute('popover', 'auto')
    popover.textContent = '浏览器原生操作'
    node.append(popover)
    popover.showPopover()
  })
  const popover = dialog.locator('[popover="auto"]')
  await expect(popover).toBeVisible()
  await page.mouse.click(12, 16)
  await expect(popover).toBeHidden()
  await expect(dialog).toBeVisible()
  await page.mouse.click(12, 16)
  await expect(dialog).toBeHidden()
})

test('touch backdrop dismissal preserves the sheet across edge crossings and closes the nested menu first', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 400, height: 780 }, hasTouch: true, isMobile: browserName !== 'firefox' })
  try {
    const page = await context.newPage()
    await page.goto('/?component=W.sheet')
    const opener = page.getByRole('button', { name: '拖动与滚动' })
    await opener.tap()
    const sheet = page.getByRole('dialog', { name: '交付历史' })
    await sheet.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)))
    const scrim = { x: 12, y: 16 }
    if (browserName === 'chromium') {
      const cdp = await context.newCDPSession(page)
      const slider = (await sheet.getByRole('slider', { name: '已阅进度' }).boundingBox())!
      const inside = { x: Math.round(slider.x + slider.width / 2), y: Math.round(slider.y + slider.height / 2) }
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', touchPoints: { x: number; y: number }[] = []) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
      for (const [from, to] of [[scrim, inside], [inside, scrim]]) {
        await send('touchStart', [from])
        await send('touchMove', [to])
        await send('touchEnd')
        await expect(sheet).toBeVisible()
      }
      await send('touchStart', [scrim])
      await send('touchCancel')
      await expect(sheet).toBeVisible()
    }
    const actions = sheet.getByRole('button', { name: '交付操作' })
    await actions.tap()
    const menu = page.getByRole('menu', { name: '交付操作' })
    await expect(menu).toBeVisible()
    await expect(menu).not.toHaveAttribute('data-sy-anchor-pending')
    await menu.evaluate(node => Promise.allSettled(node.getAnimations().map(effect => effect.finished)))
    await page.touchscreen.tap(scrim.x, scrim.y)
    await expect(menu).toBeHidden()
    await expect(sheet).toBeVisible()
    await expect.poll(() => sheet.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true)
    await page.touchscreen.tap(scrim.x, scrim.y)
    await expect(sheet).toBeHidden()
    await expect(opener).toBeFocused()
  } finally {
    await context.close()
  }
})

test('a three-step sheet changes its height without replacing the dialog or losing the draft', async ({ page }) => {
  await page.goto('/?component=W.sheet')
  const trigger = page.getByRole('button', { name: '打开三步发布流程' })
  await trigger.click()
  const edit = page.getByRole('dialog', { name: '填写发布说明' })
  const id = await edit.getAttribute('id')
  const summary = edit.getByRole('textbox', { name: '发布摘要' })
  await summary.fill('更新共享图标')
  await edit.getByRole('button', { name: '核对摘要' }).click()
  const review = page.getByRole('dialog', { name: '核对发布说明' })
  await expect(review).toHaveAttribute('id', id!)
  await expect(review.locator('.sy-panel__title .sy-motion-text .sy-visually-hidden')).toHaveText('核对发布说明')
  await expect(review.getByText('更新共享图标')).toBeVisible()
  await review.getByRole('button', { name: '返回编辑' }).click()
  await expect(summary).toBeFocused()
  await expect(summary).toHaveValue('更新共享图标')
  await edit.getByRole('button', { name: '核对摘要' }).click()
  await review.getByRole('button', { name: '确认摘要' }).click()
  const done = page.getByRole('dialog', { name: '已准备发布' })
  await expect(done).toHaveAttribute('id', id!)
  await done.getByRole('button', { name: '结束发布流程' }).click()
  await expect(trigger).toBeFocused()
})

test('popover recipes preserve selection, require confirmation and share named keyboard hints', async ({ page }) => {
  await page.goto('/?component=W.popover')
  const scene = page.getByRole('region', { name: '浮层使用示例' })
  const remove = scene.getByRole('button', { name: '移除草稿' })
  await remove.click()
  const deletion = page.getByRole('dialog', { name: '移除交付草稿' })
  await deletion.getByRole('button', { name: '保留草稿' }).click()
  await expect(remove).toBeFocused()
  await remove.click()
  await deletion.getByRole('button', { name: '确认移除' }).click()
  await expect(scene.locator('p .sy-visually-hidden')).toHaveText('草稿已移入回收站')
  const filterTrigger = scene.getByRole('button', { name: '筛选交付记录' })
  await expect(page.locator('.sy-popover[aria-label="移除交付草稿"]')).toHaveCount(0)
  await expect(filterTrigger).toBeFocused()
  await filterTrigger.click()
  const filters = page.getByRole('dialog', { name: '交付筛选' })
  await filters.getByRole('button', { name: '重置' }).click()
  await expect(filters.getByRole('checkbox', { name: '有负责人' })).not.toBeChecked()
  await filters.getByRole('checkbox', { name: '仅草稿' }).check()
  await filters.getByRole('button', { name: '应用筛选' }).click()
  await expect(scene.locator('p .sy-visually-hidden')).toHaveText('已应用 · 仅草稿')
  const options = scene.getByRole('button', { name: '通知选项' })
  await options.click()
  const notifications = page.getByRole('dialog', { name: '通知选项' })
  await notifications.getByRole('switch', { name: '交付变更' }).click()
  await page.keyboard.press('Escape')
  await options.click()
  await expect(notifications.getByRole('switch', { name: '交付变更' })).toBeChecked()
  await page.keyboard.press('Escape')
  await scene.getByRole('button', { name: '查看快捷键' }).click()
  await expect(page.getByRole('dialog', { name: '交付快捷键' }).locator('kbd')).not.toHaveCount(0)
})

test('closing a popover in a native blur lets the next control receive focus', async ({ page }) => {
  await page.goto('/?component=W.popover')
  const opener = page.getByRole('button', { name: '筛选交付记录' })
  const destination = page.getByRole('button', { name: '通知选项' })
  await opener.press('Enter')
  const popover = page.getByRole('dialog', { name: '交付筛选' })
  const apply = popover.getByRole('button', { name: '应用筛选' })
  const filter = popover.getByRole('checkbox', { name: '有负责人' })
  await filter.focus()
  await opener.evaluate(node => node.addEventListener('focus', () => { node.dataset.testFocusReturned = '' }))
  await filter.evaluate((node, apply) => node.addEventListener('blur', () => (apply as HTMLElement).click(), { once: true }), await apply.elementHandle())
  await destination.focus()
  await expect(page.locator('.sy-popover[aria-label="交付筛选"]')).toHaveCount(0)
  await expect(destination).toBeFocused()
  await expect(opener).not.toHaveAttribute('data-test-focus-returned')
  await expect(page.getByRole('region', { name: '浮层使用示例' }).locator('p .sy-visually-hidden')).toHaveText('已应用 · 有负责人')
})

test('closing a popover with a removed opener moves to its former tab position', async ({ page }) => {
  await page.goto('/?component=W.popover')
  const scene = page.getByRole('region', { name: '浮层使用示例' })
  const opener = scene.getByRole('button', { name: '移除草稿' })
  const openerNode = (await opener.elementHandle())!
  await opener.press('Enter')
  const popover = scene.getByRole('dialog', { name: '移除交付草稿' })
  const keep = popover.getByRole('button', { name: '保留草稿' })
  await keep.focus()
  await openerNode.evaluate(node => node.remove())
  await keep.press('Escape')
  await expect(popover).toHaveCount(0)
  await expect(scene.getByRole('button', { name: '筛选交付记录' })).toBeFocused()
})

test.describe('touch overlay presentation', () => {
  test.use({ hasTouch: true, viewport: { width: 395, height: 780 } })

  test('a touch held on the dialog backdrop is consumed through release', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Uses trusted touch contacts with separate start and end events')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/?component=W.modal')
    await page.addStyleTag({ content: '.sy-dialog { --sy-motion-enter: 1600ms; }' })
    const scene = page.getByRole('region', { name: '对话框展示方式' })
    const opener = scene.getByRole('button', { name: '打开交付说明' })
    const dialog = page.getByRole('dialog', { name: '交付说明' })
    await opener.press('Enter')
    await expect(dialog).toHaveAttribute('data-visible', '')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 6, y: 16 }] })
    await dialog.getByRole('button', { name: '查看状态' }).press('Enter')
    await expect(scene.locator('.overlay-review__result .sy-visually-hidden')).toHaveText('已查看发布状态')
    await expect(dialog).not.toHaveAttribute('data-settled')
    await expect(dialog).toHaveAttribute('data-settled', '')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(dialog).toHaveAttribute('data-visible', '')
    await page.touchscreen.tap(6, 16)
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()

    await opener.press('Enter')
    await expect(dialog).not.toHaveAttribute('data-settled')
    await page.mouse.click(6, 16)
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('a nonmodal drawer only holds touches on its own moving surface', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Uses primary coarse-pointer emulation')
    await page.setViewportSize({ width: 900, height: 780 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/?component=W.drawer')
    await page.addStyleTag({ content: '.sy-panel { --sy-motion-enter: 1600ms; }' })
    await page.getByRole('button', { name: '打开并列详情' }).press('Enter')
    const panel = page.getByRole('dialog', { name: '交付详情' })
    const action = panel.getByRole('button', { name: '查看修订' })
    const point = await action.evaluate(node => {
      const entrance = node.closest('.sy-panel')!.getAnimations()[0]
      entrance.currentTime = 1000
      const bounds = node.getBoundingClientRect()
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    })
    await page.touchscreen.tap(point.x, point.y)
    await expect(action).toHaveAttribute('aria-expanded', 'false')
    await page.getByRole('button', { name: '登记页面变更' }).tap()
    await expect(page.getByText('已登记 1 次', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await panel.evaluate(async node => { await Promise.allSettled(node.getAnimations().map(animation => animation.finished)) })
    await action.tap()
    await expect(action).toHaveAttribute('aria-expanded', 'true')
  })

  test('an adaptive form uses the bottom sheet and can be overridden', async ({ page }) => {
    await page.goto('/?component=W.modal')
    const edit = page.getByRole('button', { name: '编辑联系人' })
    await edit.tap()
    const profile = page.getByRole('dialog', { name: '联系人资料' })
    await expect(profile).toHaveClass(/sy-panel/)
    const field = profile.getByRole('textbox', { name: '联系人邮箱' })
    await field.fill('studio@example.com')
    await page.setViewportSize({ width: 1090, height: 780 })
    await expect(profile).toHaveClass(/sy-panel/)
    await expect(field).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(edit).toBeFocused()
    await page.setViewportSize({ width: 395, height: 780 })
    await page.getByRole('combobox', { name: '联系人弹窗展示' }).tap()
    await page.getByRole('option', { name: '居中对话框' }).tap()
    await edit.tap()
    await expect(profile).toHaveClass(/sy-dialog/)
    await expect(field).toHaveValue('studio@example.com')
  })

  test('a tall sheet fits the keyboard viewport and keeps focused fields and actions accessible', async ({ page }) => {
    await page.goto('/?component=W.sheet')
    await page.getByRole('button', { name: '填写收件信息' }).tap()
    const delivery = page.getByRole('dialog', { name: '收件信息' })
    await delivery.getByRole('textbox', { name: '收件人' }).fill('周岚')
    await page.evaluate(() => {
      const viewport = window.visualViewport!
      Object.defineProperty(viewport, 'height', { configurable: true, get: () => 480 })
      Object.defineProperty(viewport, 'offsetTop', { configurable: true, get: () => 0 })
      viewport.dispatchEvent(new Event('resize'))
    })
    await expect.poll(async () => (await delivery.boundingBox())?.height).toBe(480)
    const phone = delivery.getByRole('textbox', { name: '收件电话' })
    await phone.fill('13800138000')
    await expect(phone).toBeFocused()
    const save = delivery.getByRole('button', { name: '保存收件信息' })
    await expect.poll(async () => {
      const box = await save.boundingBox()
      return box ? box.y + box.height : Infinity
    }).toBeLessThanOrEqual(480)
    await save.tap()
    await expect(delivery).toBeHidden()
  })

  test('a tall sheet follows a docked keyboard reported without a viewport resize', async ({ page }) => {
    await page.addInitScript(() => {
      const keyboard = Object.assign(new EventTarget(), { boundingRect: new DOMRect() })
      Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, value: keyboard })
      window.addEventListener('test-sheet-keyboard', () => {
        const root = document.documentElement
        keyboard.boundingRect = new DOMRect(0, 315, root.clientWidth, root.clientHeight - 315)
        keyboard.dispatchEvent(new Event('geometrychange'))
      })
    })
    await page.goto('/?component=W.sheet')
    await page.getByRole('button', { name: '填写收件信息' }).tap()
    const sheet = page.getByRole('dialog', { name: '收件信息' })
    const phone = sheet.getByRole('textbox', { name: '收件电话' })
    await phone.evaluate(node => (node as HTMLElement).focus({ preventScroll: true }))
    await page.evaluate(() => dispatchEvent(new Event('test-sheet-keyboard')))
    await expect.poll(async () => (await sheet.boundingBox())?.height).toBe(315)
    await expect.poll(() => phone.evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(306)
    await expect(phone).toBeFocused()
    const save = sheet.getByRole('button', { name: '保存收件信息' })
    await expect.poll(async () => {
      const box = (await save.boundingBox())!
      return box.y + box.height
    }).toBeLessThanOrEqual(315)
  })

  test('touch quick actions use a bottom sheet and return focus after selecting', async ({ page }) => {
    await page.goto('/?component=W.popover')
    const trigger = page.getByRole('button', { name: '资料快捷操作' })
    await trigger.tap()
    const actions = page.getByRole('dialog', { name: '资料快捷操作' })
    await expect(actions).toHaveClass(/sy-panel/)
    await actions.getByRole('button', { name: '设置日期' }).tap()
    await expect(actions).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(page.getByRole('region', { name: '浮层使用示例' }).locator('p .sy-visually-hidden')).toHaveText('设置日期')
  })
})
