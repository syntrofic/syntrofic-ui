import { expect, test, type Locator, type Page } from '@playwright/test'

async function box(element: Locator) {
  const bounds = await element.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}

async function drag(page: Page, handle: Locator, x: number, y: number) {
  const bounds = await box(handle)
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + x, start.y + y, { steps: 10 })
  await page.mouse.up()
}

test('opens drawers at four edges, restores focus, and dismisses by dragging', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 })
  await page.goto('/?component=W.drawer')
  const panel = page.getByRole('dialog', { name: '项目详情' })
  const right = page.getByRole('button', { name: '右侧抽屉' })
  const left = page.getByRole('button', { name: '左侧抽屉' })
  const top = page.getByRole('button', { name: '顶部抽屉' })
  const bottom = page.getByRole('button', { name: '底部抽屉' })

  for (const [button, edge] of [[left, 'left'], [top, 'top'], [bottom, 'bottom']] as const) {
    await button.click()
    await expect(panel).toBeVisible()
    await expect.poll(async () => {
      const bounds = await box(panel)
      return edge === 'left' ? bounds.x : edge === 'top' ? bounds.y : 720 - bounds.y - bounds.height
    }).toBeCloseTo(0, 0)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(button).toBeFocused()
  }

  await right.click()
  await expect.poll(async () => {
    const bounds = await box(panel)
    return bounds.x + bounds.width
  }).toBeCloseTo(640, 0)
  await panel.getByRole('combobox', { name: '发布渠道' }).click()
  await page.getByRole('option', { name: '公开品牌站' }).click()
  await expect(page.locator('.sy-select__popup')).toBeHidden()
  await expect(panel).toBeVisible()

  const handle = panel.locator('.sy-panel__handle')
  await drag(page, handle, 19, 0)
  await expect(panel).toBeVisible()
  await expect.poll(async () => (await box(panel)).x).toBeCloseTo(248, 0)
  await drag(page, handle, 158, 0)
  await expect(panel).toBeHidden()
  await expect(right).toBeFocused()
})

test('resizes sheets on either axis and keeps the parent open after closing a nested sheet', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 })
  await page.goto('/?component=W.sheet')
  const panel = page.getByRole('dialog', { name: '版本记录' })
  const bottom = page.getByRole('button', { name: '底部面板' })
  await bottom.click()
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)
  await expect.poll(async () => {
    const bounds = await box(panel)
    return bounds.y + bounds.height
  }).toBeCloseTo(708, 0)
  const resize = panel.getByRole('button', { name: '调整面板大小' })
  await drag(page, resize, 0, -225)
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(487.2, 0)
  await resize.press('End')
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(696, 0)
  await resize.press('Home')
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)

  const nestedTrigger = panel.getByRole('button', { name: '筛选版本', exact: true })
  await nestedTrigger.click()
  const nested = page.getByRole('dialog', { name: '筛选版本', exact: true })
  await expect(nested).toBeVisible()
  await nested.getByRole('switch', { name: '仅显示稳定版' }).click()
  await page.keyboard.press('Escape')
  await expect(nested).toBeHidden()
  await expect(panel).toBeVisible()
  await expect(nestedTrigger).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  await page.getByRole('button', { name: '左侧面板' }).click()
  await expect.poll(async () => (await box(panel)).width).toBeCloseTo(234.08, 0)
  await panel.getByRole('button', { name: '调整面板大小' }).press('ArrowRight')
  await expect.poll(async () => (await box(panel)).width).toBeCloseTo(338.8, 0)
  await page.setViewportSize({ width: 320, height: 620 })
  await expect.poll(async () => (await box(panel)).width).toBeCloseTo(162.8, 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('sheets use release momentum and preserve the current detent during a slow pull toward dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 })
  await page.goto('/?component=W.sheet')
  await page.getByRole('button', { name: '底部面板' }).click()
  const panel = page.getByRole('dialog', { name: '版本记录' })
  const handle = panel.getByRole('button', { name: '调整面板大小' })
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)
  await expect.poll(async () => (await box(panel)).y).toBeCloseTo(429.6, 0)

  async function release(distance: number, elapsed: number) {
    const bounds = await box(handle)
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await handle.evaluate(node => {
      node.addEventListener('pointerdown', event => {
        const pointer = event as PointerEvent
        const element = node as HTMLElement
        element.dataset.testPointer = String(pointer.pointerId)
        element.dataset.testStart = String(pointer.timeStamp)
      }, { once: true })
    })
    await page.mouse.move(x, y)
    await page.mouse.down()
    await handle.evaluate((node, data) => {
      const { testPointer, testStart } = (node as HTMLElement).dataset
      const pointerId = Number(testPointer)
      for (const [type, time] of [['pointermove', data.elapsed], ['pointerup', data.elapsed + 2]] as const) {
        const event = new PointerEvent(type, { pointerId, isPrimary: true, pointerType: 'mouse', clientX: data.x, clientY: data.y, bubbles: true })
        Object.defineProperty(event, 'timeStamp', { value: Number(testStart) + time })
        node.dispatchEvent(event)
      }
    }, { x, y: y + distance, elapsed })
    await page.mouse.up()
  }

  await release(-26, 160)
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)
  await expect(panel).not.toHaveAttribute('data-settling', 'true')
  await release(-26, 5)
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(487.2, 0)
  await handle.press('Home')
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)
  const bounds = await box(handle)
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 43)
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(278.4, 0)
  await expect.poll(async () => (await box(panel)).y).toBeGreaterThan(450)
  await page.waitForTimeout(105)
  await page.mouse.up()
  await expect.poll(async () => (await box(panel)).y).toBeCloseTo(429.6, 0)
})

test('expands the toast stack, runs actions, and pauses automatic closing on hover', async ({ page }) => {
  await page.goto('/?component=W.toast')
  const toasts = page.locator('.sy-toast')
  await page.getByRole('button', { name: '保存项目', exact: true }).click()
  await page.getByRole('button', { name: '检查授权', exact: true }).click()
  await page.getByRole('button', { name: '归档项目', exact: true }).click()
  await expect(toasts).toHaveCount(3)
  const action = toasts.filter({ hasText: '项目已归档' })
  await action.hover()
  await expect(page.locator('.sy-toast[data-expanded]')).toHaveCount(3)
  await action.getByRole('button', { name: '撤销' }).click()
  await expect(action).toBeHidden()
  await expect(page.locator('.review__result')).toHaveText('已恢复项目')

  await page.getByRole('button', { name: '短时提示' }).click()
  const timed = toasts.filter({ hasText: '已保存临时版本' })
  await timed.hover()
  await page.waitForTimeout(1250)
  await expect(timed).toBeVisible()
  await page.mouse.move(3, 3)
  await expect(timed).toBeHidden({ timeout: 3800 })

  await page.getByRole('button', { name: '同步更改' }).click()
  await expect(toasts.filter({ hasText: '正在同步' })).toBeVisible()
  await expect(toasts.filter({ hasText: '同步完成' })).toBeVisible()
})

test('changes bottom-sheet steps inside one dialog and preserves form state', async ({ page }) => {
  await page.goto('/?component=W.sheet')
  const opener = page.getByRole('button', { name: '打开配送流程' })
  await opener.click()
  const details = page.getByRole('dialog', { name: '配送设置' })
  const address = details.getByRole('textbox', { name: '街道地址' })
  await address.fill('品牌街 12 号')
  const panel = await details.elementHandle()
  await details.getByRole('button', { name: '核对地址', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: '核对配送地址' })
  await expect(confirmation.getByText('品牌街 12 号')).toBeVisible()
  expect(await confirmation.evaluate((element, previous) => element === previous, panel)).toBe(true)
  await expect(confirmation.getByRole('region', { name: '核对配送地址' })).toBeFocused()
  await confirmation.getByRole('button', { name: '返回修改' }).click()
  await expect(address).toHaveValue('品牌街 12 号')
  await expect(address).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  await expect(opener).toBeFocused()
})

test('the toast hook provides a fallback viewport and ignores duplicate notifications', async ({ page }) => {
  await page.goto('/?component=W.toast')
  await page.getByRole('button', { name: '全局连接提示' }).click()
  const fallback = page.locator('.sy-toast-fallback')
  await expect(fallback.locator('.sy-toast')).toHaveCount(1)
  await expect(fallback.getByText('连接检查通过', { exact: true }).first()).toBeVisible()
  await expect(fallback.getByText('重复的连接提示', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '关闭全局提示' }).click()
  await expect(fallback.locator('.sy-toast')).toHaveCount(0)
  await expect(page.getByText('已关闭连接提示')).toBeVisible()
})

test('the toast hook overwrites an existing notification in place and ignores duplicates during exit', async ({ page }) => {
  await page.goto('/?component=W.toast')
  const toast = page.locator('.sy-toast-fallback .sy-toast')
  await page.getByRole('button', { name: '全局连接提示' }).click()
  await expect(toast).toBeVisible()
  const card = await toast.elementHandle()
  await page.getByRole('button', { name: '替换全局提示' }).click()
  await expect(toast).toContainText('连接复核已完成')
  expect(await toast.evaluate((current, old) => current === old, card)).toBe(true)
  await page.getByRole('button', { name: '关闭全局提示' }).click()
  await expect(toast).toBeVisible()
  await toast.getByRole('button', { name: 'Dismiss notification' }).click()
  await expect(toast).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: '已关闭复核提示' })).toBeVisible()
  await page.getByRole('button', { name: '测试退出提示去重' }).click()
  await expect(toast).toHaveCount(0)
})

test('top-layer notifications move into the active modal and keep the same card and controls', async ({ page }) => {
  await page.goto('/?component=W.toast')
  await page.getByRole('button', { name: '全局连接提示' }).click()
  const fallback = page.locator('.sy-toast-fallback')
  const toast = page.locator('.sy-toast-surface[data-top] .sy-toast')
  await expect(fallback.locator('.sy-toast')).toBeVisible()
  const card = await toast.elementHandle()
  await page.getByRole('button', { name: '打开通知对话框' }).click()
  const dialog = page.getByRole('dialog', { name: '通知与对话框' })
  await expect(dialog.locator('.sy-toast')).toBeVisible()
  const openDrawer = dialog.getByRole('button', { name: '打开通知副面板' })
  await openDrawer.click()
  const drawer = page.getByRole('dialog', { name: '通知副面板' })
  await expect(drawer.locator('.sy-toast')).toBeVisible()
  expect(await toast.evaluate((current, old) => current === old, card)).toBe(true)
  await drawer.getByRole('button', { name: '关闭通知副面板' }).click()
  await expect(dialog.locator(':scope > .sy-toast-surface .sy-toast')).toBeVisible()
  await openDrawer.focus()
  await page.keyboard.press('F6')
  const closeToast = toast.getByRole('button', { name: 'Dismiss notification' })
  await expect(closeToast).toBeFocused()
  await closeToast.press('Enter')
  await expect(toast).toHaveCount(0)
  await expect(openDrawer).toBeFocused()
})

test('changes slider handles with the keyboard and pointer while keeping range and step limits', async ({ page }) => {
  await page.goto('/?component=W.slider')
  const lower = page.getByRole('slider', { name: '最小分配' })
  const upper = page.getByRole('slider', { name: '最大分配' })
  await expect(lower).toHaveAttribute('aria-valuenow', '25')
  await lower.press('ArrowRight')
  await expect(lower).toHaveAttribute('aria-valuenow', '30')
  await expect(upper).toHaveAttribute('aria-valuenow', '65')
  for (let index = 0; index < 11; index++) await lower.press('ArrowRight')
  await expect(lower).toHaveAttribute('aria-valuenow', '55')
  const rail = page.locator('.sy-slider').filter({ has: lower })
  await expect(rail.locator('.sy-slider__step')).toHaveCount(21)
  const bounds = await box(rail)
  await page.mouse.click(bounds.x + bounds.width * .9, bounds.y + bounds.height / 2)
  await expect(upper).toHaveAttribute('aria-valuenow', '90')

  await page.getByRole('switch', { name: '纵向' }).click()
  const vertical = page.getByRole('slider', { name: '环境照度' })
  await expect(vertical).toHaveAttribute('aria-orientation', 'vertical')
  await vertical.press('ArrowUp')
  await expect(vertical).toHaveAttribute('aria-valuenow', '50')
})

test('a kinetic slider carries pointer velocity to a stepped value and commits once', async ({ page }) => {
  await page.goto('/?component=W.slider')
  await page.getByRole('switch', { name: '纵向' }).click()
  const slider = page.getByRole('slider', { name: '环境照度' })
  const point = await box(slider)
  const x = point.x + point.width / 2
  const y = point.y + point.height / 2
  await slider.evaluate(node => {
    const document = node.ownerDocument
    let pointer: number | undefined
    function stamp(event: PointerEvent) {
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) pointer = event.pointerId
      if (pointer !== event.pointerId) return
      const samples: Record<string, number> = { pointerdown: 100, pointermove: 116, pointerup: 132 }
      Object.defineProperty(event, 'timeStamp', { value: samples[event.type] })
      if (event.type === 'pointerup') {
        node.setAttribute('data-value-at-release', node.getAttribute('aria-valuenow') ?? '')
        for (const type of ['pointerdown', 'pointermove', 'pointerup'] as const) document.removeEventListener(type, stamp, true)
      }
    }
    for (const type of ['pointerdown', 'pointermove', 'pointerup'] as const) document.addEventListener(type, stamp, true)
  })
  await page.mouse.move(x, y)
  await page.mouse.down()
  await expect(slider).toHaveAttribute('data-pointer-pressed', 'true')
  await page.mouse.move(x, y - 32)
  await page.mouse.up()
  const atLift = Number(await slider.getAttribute('data-value-at-release'))
  await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(atLift)
  const output = page.getByLabel('最终照度')
  await expect(output).toHaveText(/^\d+ · 1$/)
  const [value, count] = (await output.textContent())!.split(' · ').map(Number)
  expect(value % 5).toBe(0)
  expect(count).toBe(1)
  await expect(slider).not.toHaveAttribute('data-pointer-pressed')
})

test('distinguishes meters and progress indicators and reserves space for an unknown value', async ({ page }) => {
  await page.goto('/?component=W.meter')
  const meter = page.getByRole('meter', { name: '资源存储' })
  await expect(meter).toHaveAttribute('aria-valuemax', '128')
  await page.getByRole('button', { name: '增加用量' }).click()
  await expect(meter).toHaveAttribute('aria-valuenow', '74')
  await expect(meter).toHaveAttribute('aria-valuetext', '74 GB')

  for (const [id, label] of [['W.progress-bar', '素材上传'], ['W.progress-circle', '同步进度']]) {
    await page.goto('/?component=' + id)
    const progress = page.getByRole('progressbar', { name: label })
    await expect(progress).toHaveAttribute('aria-valuenow', '62')
    const before = await box(progress)
    await page.getByRole('button', { name: '更新进度' }).click()
    await expect(progress).toHaveAttribute('aria-valuetext', '74%')
    const pending = page.getByRole('switch', { name: '进度未知' })
    await pending.click()
    await expect(progress).not.toHaveAttribute('aria-valuenow')
    const after = await box(progress)
    expect(after.height).toBe(before.height)
    expect(after.width).toBe(before.width)
    await pending.click()
    await expect(progress).toHaveAttribute('aria-valuenow', '74')
  }
})

test('progress retargets its eased fill from the displayed position and uses a stationary pulse with reduced motion', async ({ page }) => {
  await page.goto('/?component=W.progress-bar')
  const progress = page.getByRole('progressbar', { name: '素材上传' })
  const paint = await progress.evaluate(async node => {
    const fill = node.querySelector('.sy-measure__fill')!
    const change = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === '更新进度')!
    change.click()
    await Promise.resolve()
    const first = fill.getAnimations()[0]
    const duration = Number(first.effect?.getTiming().duration)
    const easing = first.effect?.getTiming().easing
    first.pause()
    await first.ready
    first.currentTime = duration / 2
    const displayed = parseFloat(getComputedStyle(fill).getPropertyValue('--sy-measure-fraction'))
    change.click()
    await Promise.resolve()
    const second = fill.getAnimations()[0].effect as KeyframeEffect
    return { duration, easing, displayed, from: Number(second.getKeyframes()[0]['--sy-measure-fraction']) }
  })
  expect(paint.duration).toBeCloseTo(120, 2)
  expect(paint.easing).toContain('cubic-bezier')
  expect(paint.displayed).toBeGreaterThan(.7)
  expect(paint.displayed).toBeLessThan(.74)
  expect(paint.from).toBeCloseTo(paint.displayed, 3)
  await expect(progress).toHaveAttribute('aria-valuenow', '86')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('switch', { name: '进度未知' }).click()
  const fill = progress.locator('.sy-measure__sweep > span')
  await expect(fill).toHaveCSS('animation-name', 'sy-measure-pulse')
  await expect(fill).toHaveCSS('transform', 'none')
})

test('switch drag previews the next value and toggles the native input once in either direction', async ({ page }) => {
  await page.goto('/?component=W.switch')
  const control = page.getByRole('switch', { name: '邮件提醒' })
  const track = control.locator('+ .sy-switch__track')
  await expect(control).toBeChecked()
  await control.evaluate(node => {
    node.setAttribute('data-changes', '0')
    node.addEventListener('change', () => node.setAttribute('data-changes', String(Number(node.getAttribute('data-changes')) + 1)))
  })
  const bounds = await box(track)
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 13, y, { steps: 4 })
  await expect(track).toHaveAttribute('data-preview', 'false')
  await expect(control).toBeChecked()
  await page.mouse.up()
  await expect(control).not.toBeChecked()
  await expect(control).toHaveAttribute('data-changes', '1')
  await expect(track).not.toHaveAttribute('data-dragging')
  await control.press('Space')
  await expect(control).toBeChecked()
  await control.locator('..').evaluate(node => node.setAttribute('dir', 'rtl'))
  await drag(page, track, 13, 0)
  await expect(control).not.toBeChecked()
  await expect(control).toHaveAttribute('data-changes', '3')
  await control.click()
  await expect(control).toBeChecked()
  await expect(control).toHaveAttribute('data-changes', '4')
})

test('shows avatar overflow counts, keyboard labels and semantic heading levels', async ({ page }) => {
  await page.goto('/?component=W.avatar-group')
  const group = page.getByRole('group', { name: '品牌协作者' })
  await expect(group.getByRole('img')).toHaveCount(5)
  await expect(group.getByRole('img', { name: '另有 2 位协作者' })).toBeVisible()
  await expect(group.getByRole('img', { name: '江时' })).toHaveCount(0)
  await page.getByRole('switch', { name: '展开协作者' }).click()
  await expect(group.getByRole('img')).toHaveCount(6)
  await expect(group.getByRole('img', { name: '江时' })).toBeVisible()

  await page.goto('/?component=W.kbd')
  await expect(page.locator('kbd .sy-visually-hidden').first()).toHaveText('Command 加 K')
  await expect(page.locator('kbd abbr[title="Escape"]')).toHaveText('Esc')

  await page.goto('/?component=W.typography')
  await expect(page.getByRole('heading', { name: '品牌资源库', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: '文件与授权', level: 3 })).toBeVisible()
  await expect(page.locator('article code')).toHaveText('assets/brand')
})

test('tracks scroll edges and clears cues when the content no longer overflows', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 680 })
  await page.goto('/?component=W.scroll-shadow')
  const edges = page.locator('.sy-scroll-shadow__edge[data-visible]')
  const edge = (name: string) => page.locator(`.sy-scroll-shadow__edge[data-edge="${name}"]`)
  const viewport = page.getByRole('region', { name: '版本更新' })
  await expect(viewport).toHaveAttribute('tabindex', '0')
  await expect(edges).toHaveCount(1)
  await expect(edges).toHaveAttribute('data-edge', 'bottom')
  await viewport.press('End')
  await expect(edge('top')).toHaveAttribute('data-visible')
  await expect(edge('bottom')).not.toHaveAttribute('data-visible')
  await page.getByRole('switch', { name: '仅看最近' }).click()
  await expect(edges).toHaveCount(0)
  await expect(viewport).not.toHaveAttribute('tabindex')

  await page.getByRole('switch', { name: '横向' }).click()
  const horizontal = page.getByRole('region', { name: '资料分类' })
  await expect(horizontal).toHaveAttribute('tabindex', '0')
  await expect(edges).toHaveCount(1)
  await expect(edges).toHaveAttribute('data-edge', 'end')
  await horizontal.evaluate(element => { element.scrollLeft = element.scrollWidth })
  await expect(edge('start')).toHaveAttribute('data-visible')
  await expect(edge('end')).not.toHaveAttribute('data-visible')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
