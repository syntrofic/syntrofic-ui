import { expect, test, type Page } from '@playwright/test'

for (const direction of ['ltr', 'rtl'] as const) {
  test(`the ${direction} divider has a centered grab strip and a reachable hover grip`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/?component=WP.resizable')
    const sample = page.getByRole('region', { name: '可调整区域工具' })
    await sample.evaluate((node, value) => node.setAttribute('dir', value), direction)
    const handle = sample.getByRole('separator', { name: '调整主区域宽度' })
    await handle.evaluate(node => node.ownerDocument.fonts.ready.then(() => {}))
    await handle.scrollIntoViewIfNeeded()
    await expect(handle).toHaveAttribute('aria-valuenow', '200')
    const zone = handle.locator('.sy-shell-resize__grab')
    const pill = handle.locator('.sy-shell-resize__pill')
    await page.mouse.move(0, 0)
    await expect(pill).toHaveCSS('opacity', '0')
    await expect.poll(async () => {
      const area = (await zone.boundingBox())!
      const grip = (await pill.boundingBox())!
      return direction === 'ltr' ? grip.x - area.x - area.width : area.x - grip.x - grip.width
    }).toBeCloseTo(4, 0)
    const stroke = (await handle.boundingBox())!
    const area = (await zone.boundingBox())!
    const grip = (await pill.boundingBox())!
    expect(area.width).toBeCloseTo(16, 0)
    expect(area.x + area.width / 2).toBeCloseTo(stroke.x + stroke.width / 2, 0)
    expect(area.width).toBeGreaterThan(stroke.width)
    const reach = direction === 'ltr' ? area.x + area.width - 1 : area.x + 1
    const y = grip.y + grip.height / 2
    await page.mouse.move(reach, y)
    await expect(pill).toHaveCSS('opacity', '1')
    await expect(pill).toHaveCSS('transition-timing-function', /cubic-bezier/)
    const gap = direction === 'ltr' ? (area.x + area.width + grip.x) / 2 : (grip.x + grip.width + area.x) / 2
    await page.mouse.move(gap, y)
    expect(await handle.evaluate(async (node, point) => {
      for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame)
      return node.contains(document.elementFromPoint(point.x, point.y))
    }, { x: gap, y })).toBe(true)
    await expect(pill).toHaveCSS('opacity', '1')
    const farSide = direction === 'ltr' ? grip.x + grip.width + 2 : grip.x - 2
    expect(await handle.evaluate((node, point) => node.contains(document.elementFromPoint(point.x, point.y)),
      { x: farSide, y })).toBe(false)
    const x = grip.x + grip.width / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + (direction === 'ltr' ? 24 : -24), y, { steps: 4 })
    await page.mouse.up()
    await expect(handle).toHaveAttribute('aria-valuenow', '224')
    await expect(handle).toBeFocused()
  })
}

for (const position of ['inline', 'overlay'] as const) {
  test(`a short panel keeps half its own pointer area with an ${position} divider`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/?component=WP.resizable')
    const sample = page.getByRole('region', { name: '可调整区域工具' })
    if (position === 'overlay') {
      await sample.getByRole('combobox', { name: '短面板分隔条位置' }).click()
      await page.getByRole('option', { name: '覆盖面板边缘' }).click()
    }
    const handle = sample.getByRole('separator', { name: '调整短面板高度' })
    await handle.scrollIntoViewIfNeeded()
    await expect(handle).toHaveAttribute('data-resize-position', position)
    await expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
    const zone = handle.locator('.sy-shell-resize__grab')
    const bounds = (await zone.boundingBox())!
    const pane = await handle.evaluate(node => {
      const pane = document.getElementById(node.getAttribute('aria-controls')!)!
      const body = pane.getBoundingClientRect()
      const divider = node.getBoundingClientRect()
      return { height: body.height, top: body.top, bottom: body.bottom, centre: divider.top + divider.height / 2,
        bodyAcceptsPointer: pane.contains(document.elementFromPoint(body.x + body.width / 2, body.top + body.height / 4)) }
    })
    expect(pane.height).toBeCloseTo(12, 0)
    expect(bounds.y + bounds.height / 2).toBeCloseTo(pane.centre, 0)
    expect(Math.min(bounds.y + bounds.height, pane.bottom) - Math.max(bounds.y, pane.top)).toBeLessThanOrEqual(6.5)
    expect(pane.bodyAcceptsPointer).toBe(true)
    if (position === 'overlay') expect(bounds.height).toBeCloseTo(6, 0)
    const x = bounds.x + 6
    const y = bounds.y + bounds.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 10, { steps: 3 })
    await page.mouse.up()
    await expect(handle).toHaveAttribute('aria-valuenow', '22')
  })
}

test('changing the grip position animates while the grab strip stays fixed and a slot can replace the pill', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const visibility = sample.getByRole('switch', { name: '始终显示短面板把手' })
  const placement = sample.getByRole('combobox', { name: '短面板把手位置' })
  const handle = sample.getByRole('separator', { name: '调整短面板高度' })
  await visibility.click()
  const zone = handle.locator('.sy-shell-resize__grab')
  const pill = handle.locator('.sy-shell-resize__pill')
  await expect(pill).toHaveCSS('opacity', '1')
  const before = (await zone.boundingBox())!
  await placement.click()
  await page.getByRole('option', { name: '末端' }).click()
  await expect(pill).toHaveAttribute('data-side', 'end')
  const cap = await pill.evaluate(async node => {
    await Promise.allSettled(node.getAnimations().map(animation => animation.finished))
    return node.getBoundingClientRect().top
  })
  const after = (await zone.boundingBox())!
  expect(after.y).toBeCloseTo(before.y, 0)
  expect(cap).toBeGreaterThan(after.y + after.height)
  await placement.click()
  await page.getByRole('option', { name: '自定义标记' }).click()
  await expect(pill).toHaveCount(0)
  await expect(handle.locator('.sy-shell-resize__grip')).toBeVisible()
  await expect(handle.locator('button, [tabindex]')).toHaveCount(0)
})

test('an unbounded separator announces the viewport extent and End follows it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 840 })
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const handle = sample.getByRole('separator', { name: '调整短面板高度' })
  const limit = sample.getByRole('switch', { name: '将短面板限高为 96 px' })
  await expect(handle).toHaveAttribute('aria-valuemax', '96')
  await limit.click()
  await expect(handle).toHaveAttribute('aria-valuemax', '840')
  await handle.press('End')
  await expect(handle).toHaveAttribute('aria-valuenow', '840')
  await page.setViewportSize({ width: 1280, height: 680 })
  await expect(handle).toHaveAttribute('aria-valuemax', '840')
  await handle.press('Home')
  await expect(handle).toHaveAttribute('aria-valuenow', '6')
  await expect(handle).toHaveAttribute('aria-valuemax', '680')
  await handle.press('End')
  await expect(handle).toHaveAttribute('aria-valuenow', '680')
})

async function recordResizeWrites(page: Page, pixels?: number, id = 'resize-review:files') {
  await page.addInitScript(({ key, pixels }) => {
    if (pixels !== undefined && !sessionStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ pixels, collapsed: false }))
      sessionStorage.setItem(key, 'seeded')
    }
    const writes: unknown[] = []
    Object.defineProperty(window, 'resizeWrites', { value: writes })
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (entry, value) {
      if (this === localStorage && entry === key) writes.push(JSON.parse(value))
      setItem.call(this, entry, value)
    }
  }, { key: 'syntrofic:resizable:' + id, pixels })
  return () => page.evaluate(() => Reflect.get(window, 'resizeWrites'))
}

async function openNativeSplitter(page: Page) {
  await page.getByRole('button', { name: '原生分隔条', exact: true }).click()
  const sample = page.getByRole('region', { name: '原生分隔条示例' })
  const divider = sample.getByRole('separator', { name: '调整资料导航宽度' })
  await divider.evaluate(async node => {
    const animations = node.closest('.sy-disclosure__content')?.getAnimations() ?? []
    await Promise.allSettled(animations.map(animation => animation.finished))
    node.scrollIntoView({ block: 'center', behavior: 'instant' })
  })
  return { sample, divider }
}

test('a native splitter supports RTL keys, collapse, disabled focus, and persistence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/?component=WP.resizable')
  const { sample, divider } = await openNativeSplitter(page)
  await expect(divider).toHaveAttribute('aria-valuenow', '112')
  await expect(divider).toHaveAttribute('aria-orientation', 'vertical')
  expect(await divider.evaluate(node => node.ownerDocument.getElementById(node.getAttribute('aria-controls')!)?.textContent)).toBe('资料导航')
  await sample.evaluate(node => node.setAttribute('dir', 'rtl'))
  await divider.press('ArrowLeft')
  await expect(divider).toHaveAttribute('aria-valuenow', '160')
  await divider.dblclick()
  await expect(divider).toHaveAttribute('aria-valuetext', '导航已收起')
  await expect(divider).toHaveAttribute('aria-valuenow', '0')
  await divider.press('Enter')
  await expect(divider).toHaveAttribute('aria-valuenow', '160')
  const disabled = sample.getByRole('switch', { name: '禁用原生分隔条' })
  await disabled.click()
  await expect(divider).toHaveAttribute('aria-disabled', 'true')
  await expect(divider).toHaveAttribute('tabindex', '0')
  await divider.press('ArrowLeft')
  await expect(divider).toBeFocused()
  await expect(divider).toHaveAttribute('aria-valuenow', '160')
  await page.reload()
  const restored = await openNativeSplitter(page)
  await expect(restored.divider).toHaveAttribute('aria-valuenow', '160')
})

test('replacing a native splitter settles its active drag once and restores the old element', async ({ page }) => {
  const writes = await recordResizeWrites(page, undefined, 'native-resize-review')
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/?component=WP.resizable')
  const { sample, divider } = await openNativeSplitter(page)
  const original = await divider.elementHandle()
  await divider.evaluate(node => {
    node.addEventListener('pointerdown', event => { node.dataset.testPointer = String(event.pointerId) }, { once: true })
  })
  const box = (await divider.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 48, y, { steps: 4 })
  await expect(divider).toHaveAttribute('aria-valuenow', '160')
  await expect(divider).toHaveAttribute('data-dragging', '')
  expect(await writes()).toEqual([])
  const pointerIsCaptured = await divider.evaluate(node => node.hasPointerCapture(Number(node.dataset.testPointer)))
  expect(pointerIsCaptured).toBe(true)
  await divider.evaluate(node => node.setAttribute('aria-label', '调用方更新后的名称'))
  await sample.getByRole('button', { name: '更换分隔条元素' }).evaluate(node => (node as HTMLElement).click())
  await expect(divider).toHaveAttribute('aria-valuenow', '160')
  await expect.poll(writes).toEqual([{ pixels: 160, collapsed: false }])
  expect(await original!.evaluate(node => ({
    connected: node.isConnected, role: node.getAttribute('role'), tab: node.getAttribute('tabindex'),
    name: node.getAttribute('aria-label'), value: node.getAttribute('aria-valuenow'), touch: (node as HTMLElement).style.getPropertyValue('touch-action'),
    captured: node.hasPointerCapture(Number((node as HTMLElement).dataset.testPointer)),
  }))).toEqual({ connected: false, role: null, tab: null, name: '调用方更新后的名称', value: null, touch: '', captured: false })
  await page.mouse.up()
  await divider.press('ArrowRight')
  await expect(divider).toHaveAttribute('aria-valuenow', '208')
  await expect.poll(writes).toEqual([{ pixels: 160, collapsed: false }, { pixels: 208, collapsed: false }])
})

test('resizable regions resolve their initial percentage once and track live bounds', async ({ page }) => {
  const writes = await recordResizeWrites(page)
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const handle = sample.getByRole('separator', { name: '调整主区域宽度' })
  const primary = sample.getByRole('status', { name: '主区域宽度' }).locator('.sy-visually-hidden')
  const details = sample.getByRole('status', { name: '详情区域宽度' }).locator('.sy-visually-hidden')
  await expect(primary).toHaveText('200')
  await expect(details).toHaveText('115')
  expect(await writes()).toEqual([])
  await handle.hover()
  const bounds = (await handle.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 56, bounds.y + bounds.height / 2, { steps: 6 })
  await expect(primary).toHaveText('260')
  expect(await writes()).toEqual([])
  await page.mouse.up()
  await expect(handle).toHaveAttribute('aria-valuenow', '260')
  await expect.poll(writes).toEqual([{ pixels: 260, collapsed: false }])
  await handle.press('Home')
  await expect(primary).toHaveText('200')
  await handle.press('Shift+ArrowRight')
  await expect(primary).toHaveText('260')
  await handle.press('Enter')
  await expect(primary).toHaveText('0')
  await expect(handle).toHaveAttribute('aria-valuetext', '已收起')
  await expect(sample.getByRole('status', { name: '区域状态' }).locator('.sy-visually-hidden')).toHaveText('主区域已收起')
  await handle.press('Enter')
  await expect(primary).toHaveText('260')
  await sample.getByRole('button', { name: '调整参考容器' }).click()
  await expect(primary).toHaveText('224')
  await expect(details).toHaveText('115')
  await expect(handle).toHaveAttribute('aria-valuemax', '224')
  await page.reload()
  await expect(primary).toHaveText('224')
  expect(await writes()).toEqual([])
})

test('programmatic sizes and previous saves resolve to a declared stop, and keys respect RTL', async ({ page }) => {
  const writes = await recordResizeWrites(page, 241)
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const grip = sample.getByRole('separator', { name: '调整主区域宽度' })
  const primary = sample.getByRole('status', { name: '主区域宽度' }).locator('.sy-visually-hidden')
  await expect(primary).toHaveText('224')
  await expect.poll(writes).toEqual([{ pixels: 224, collapsed: false }])
  await sample.getByRole('button', { name: '设为 294 像素' }).click()
  await expect(grip).toHaveAttribute('aria-valuenow', '310')
  await expect(primary).toHaveText('310')
  await expect.poll(writes).toHaveLength(2)
  await sample.evaluate(node => node.setAttribute('dir', 'rtl'))
  // The RTL divider uses left to grow, and two stops to shrink with Shift.
  await grip.press('Shift+ArrowRight')
  await expect(grip).toHaveAttribute('aria-valuenow', '224')
  await grip.press('ArrowLeft')
  await expect(grip).toHaveAttribute('aria-valuenow', '260')
  const modifiedWasHandled = await grip.evaluate(node => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true })
    node.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(modifiedWasHandled).toBe(false)
  await expect(grip).toHaveAttribute('aria-valuenow', '260')
  await page.reload()
  await expect(grip).toHaveAttribute('aria-valuenow', '260')
  expect(await writes()).toEqual([])
})

test('a cancelled drag persists its reached stop once without committing a collapse', async ({ page }) => {
  const writes = await recordResizeWrites(page)
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const grip = sample.getByRole('separator', { name: '调整主区域宽度' })
  await expect(grip).toHaveAttribute('aria-valuenow', '200')
  await grip.evaluate(async handle => {
    const pane = document.getElementById(handle.getAttribute('aria-controls')!)!
    await Promise.allSettled(pane.getAnimations().map(animation => animation.finished))
    const start = handle.getBoundingClientRect().left
    const pointer = (type: string, clientX: number) => handle.dispatchEvent(new PointerEvent(type,
      { pointerId: 85, pointerType: 'mouse', clientX, bubbles: true }))
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
    try {
      pointer('pointerdown', start)
      pointer('pointermove', start + 84)
      pointer('pointercancel', start + 84)
    } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
  })
  await expect(grip).toHaveAttribute('aria-valuenow', '260')
  await expect.poll(writes).toEqual([{ pixels: 260, collapsed: false }])
  await expect(sample.getByRole('button', { name: '收起主区域' })).toBeVisible()
})

test('resizable controls accept externally owned collapse and keep the expanded value', async ({ page }) => {
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const handle = sample.getByRole('separator', { name: '调整主区域宽度' })
  await sample.getByRole('checkbox', { name: '外部控制' }).check()
  await handle.press('ArrowRight')
  await expect(handle).toHaveAttribute('aria-valuenow', '224')
  await sample.getByRole('button', { name: '收起主区域' }).click()
  await expect(handle).toHaveAttribute('aria-valuenow', '0')
  await sample.getByRole('button', { name: '展开主区域' }).click()
  await expect(handle).toHaveAttribute('aria-valuenow', '224')
})

test('a resize handle picks up a closing custom pane at the size it shows', async ({ page }) => {
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  await expect(sample.getByRole('status', { name: '主区域宽度' }).locator('.sy-visually-hidden')).toHaveText('200')
  const handle = sample.getByRole('separator', { name: '调整主区域宽度' })
  const result = await handle.evaluate(async grip => {
    const pane = document.getElementById(grip.getAttribute('aria-controls')!)!
    const button = [...grip.closest('section')!.querySelectorAll('button')].find(node => node.querySelector('.sy-visually-hidden')?.textContent === '收起主区域')!
    const width = () => pane.getBoundingClientRect().width
    const render = async () => { await Promise.resolve(); await Promise.resolve() }
    const pointer = (type: string, clientX: number) => grip.dispatchEvent(new PointerEvent(type,
      { pointerId: 42, pointerType: 'mouse', clientX, button: 0, bubbles: true }))
    await Promise.allSettled(pane.getAnimations().map(animation => animation.finished))
    button.click()
    await render()
    for (const animation of [...pane.getAnimations(), ...grip.getAnimations()]) {
      animation.pause()
      animation.currentTime = 38
    }
    const before = width()
    const start = grip.getBoundingClientRect().left
    Object.defineProperty(grip, 'setPointerCapture', { configurable: true, value: () => {} })
    try {
      pointer('pointerdown', start)
      await render()
      const grabbed = width()
      pointer('pointermove', start + 24)
      await render()
      const moved = width()
      pointer('pointerup', start + 24)
      await render()
      return { before, grabbed, moved, settled: Number(grip.getAttribute('aria-valuenow')) }
    } finally { Reflect.deleteProperty(grip, 'setPointerCapture') }
  })
  expect(result.before).toBeGreaterThan(80)
  expect(result.before).toBeLessThan(190)
  expect(result.grabbed).toBeCloseTo(result.before, 0)
  expect(result.moved).toBeCloseTo(result.before + 24, 0)
  expect(result.settled).toBe(200)
})

for (const when of ['before paint', 'mid-slide'] as const) {
  test(`the layout panel follows its resize handle when grabbed ${when}`, async ({ page }) => {
    await page.setViewportSize({ width: 1660, height: 900 })
    await page.goto('/?component=W.layout')
    const demo = page.getByRole('region', { name: '工作台布局演示' })
    const grip = demo.getByRole('separator', { name: '调整分类宽度' })
    await expect(grip).toHaveAttribute('aria-valuenow', '144')
    const result = await grip.evaluate(async (handle, when) => {
      const pane = document.getElementById(handle.getAttribute('aria-controls')!)!
      const layout = handle.closest('.sy-layout')!
      const toggle = [...layout.querySelectorAll('button')].find(node => node.textContent?.trim() === '收放分类')!
      const content = pane.querySelector<HTMLElement>('.sy-layout__region-content')!
      const width = () => pane.getBoundingClientRect().width
      const render = async () => { for (let turn = 0; turn < 4; turn++) await Promise.resolve() }
      const pointer = (type: string, clientX: number) => handle.dispatchEvent(new PointerEvent(type,
        { pointerId: 55, pointerType: 'mouse', clientX, button: 0, bubbles: true }))
      await Promise.allSettled([...layout.getAnimations(), ...pane.getAnimations()].map(animation => animation.finished))
      pane.querySelector('button')!.focus({ preventScroll: true })
      const opened = width()
      const textBox = content.getBoundingClientRect().width
      await new Promise(requestAnimationFrame)
      toggle.click()
      await render()
      const [slide] = pane.getAnimations()
      const [track] = layout.getAnimations()
      const sameStart = Boolean(slide && track && slide.startTime === track.startTime)
      const pending = Number(slide?.currentTime) <= 0
      if (when === 'mid-slide') {
        for (const motion of [slide, track]) {
          motion.pause()
          motion.currentTime = 38
        }
      }
      const before = width()
      const contentHeld = content.getBoundingClientRect().width
      const nextStop = [76, 96, 144, 176].find(stop => stop > before + .5) ?? 200
      const distance = when === 'before paint' ? 24 : Math.min(24, (nextStop - before) / 2)
      const start = handle.getBoundingClientRect().left
      const visible = getComputedStyle(pane).visibility === 'visible'
      const focused = document.activeElement === handle
      const inert = pane.inert
      Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
      try {
        pointer('pointerdown', start)
        await render()
        const grabbed = width()
        const divider = handle.getBoundingClientRect().left
        pointer('pointermove', start + distance)
        await render()
        const moved = width()
        const dividerMoved = handle.getBoundingClientRect().left
        if (when === 'before paint') {
          pointer('pointermove', start + 48)
          await render()
        }
        const atRelease = width()
        pointer('pointerup', start + (when === 'before paint' ? 48 : distance))
        await render()
        await Promise.allSettled([...layout.getAnimations(), ...pane.getAnimations()].map(animation => animation.finished))
        return { opened, textBox, before, contentHeld, grabbed, moved, start, divider, dividerMoved, distance, atRelease,
          sameStart, pending, visible, focused, inert, end: width(), reopened: !pane.inert }
      } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
    }, when)
    expect(result.opened).toBeCloseTo(144, 0)
    expect(result.contentHeld).toBeCloseTo(result.textBox, 0)
    expect(result).toMatchObject({ sameStart: true, pending: true, visible: true, focused: true, inert: true, reopened: true })
    expect(result.before).toBeGreaterThan(60)
    if (when === 'before paint') expect(result.before).toBeCloseTo(result.opened, 0)
    else expect(result.before).toBeLessThan(result.opened - 10)
    expect(result.grabbed).toBeCloseTo(result.before, 0)
    expect(result.divider).toBeCloseTo(result.start, 0)
    expect(Math.abs(result.moved - result.before - result.distance)).toBeLessThan(1.5)
    expect(Math.abs(result.dividerMoved - result.start - result.distance)).toBeLessThan(1.5)
    if (when === 'before paint') expect(result.atRelease).toBeCloseTo(176, 0)
    expect(result.end).toBeGreaterThanOrEqual(76)
  })
}

test('removing a resize handle settles the last reached stop', async ({ page }) => {
  await page.setViewportSize({ width: 1660, height: 900 })
  await page.goto('/?component=W.layout')
  const demo = page.getByRole('region', { name: '工作台布局演示' })
  const grip = demo.getByRole('separator', { name: '调整分类宽度' })
  await expect(grip).toHaveAttribute('aria-valuenow', '144')
  await grip.evaluate(handle => {
    const start = handle.getBoundingClientRect().left
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
    try {
      handle.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 88, pointerType: 'mouse', clientX: start, bubbles: true }))
      handle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 88, pointerType: 'mouse', clientX: start + 32, bubbles: true }))
    } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
  })
  await expect(grip).toHaveAttribute('aria-valuenow', '176')
  const modes = demo.getByRole('combobox', { name: '布局模式' })
  await modes.press('ArrowDown')
  await page.getByRole('option', { name: '仅正文' }).click()
  await expect(grip).toHaveCount(0)
  await modes.press('ArrowDown')
  await page.getByRole('option', { name: '双侧栏' }).click()
  await expect(grip).toHaveAttribute('aria-valuenow', '176')
})

for (const pointerType of ['mouse', 'touch', 'pen'] as const) {
  test(`a ${pointerType} drag stretches just the layout divider and can catch its spring`, async ({ page }) => {
    await page.setViewportSize({ width: 1660, height: 900 })
    await page.goto('/?component=W.layout')
    const grip = page.getByRole('separator', { name: '调整分类宽度' })
    await expect(grip).toHaveAttribute('aria-valuenow', '144')
    const result = await grip.evaluate(async (handle, pointerType) => {
      const pane = document.getElementById(handle.getAttribute('aria-controls')!)!
      const layout = handle.closest('.sy-layout')!
      const render = async () => { for (let turn = 0; turn < 4; turn++) await Promise.resolve() }
      const width = () => pane.getBoundingClientRect().width
      const left = () => handle.getBoundingClientRect().left
      const gap = () => left() - pane.getBoundingClientRect().right
      function pointer(type: string, id: number, x: number, time: number) {
        const event = new PointerEvent(type, { pointerType, pointerId: id, clientX: x, bubbles: true })
        Object.defineProperty(event, 'timeStamp', { value: time })
        handle.dispatchEvent(event)
      }
      await Promise.allSettled([...layout.getAnimations(), ...pane.getAnimations()].map(animation => animation.finished))
      const start = left()
      Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
      try {
        pointer('pointerdown', 92, start, 10)
        pointer('pointermove', 92, start - 87, 160)
        await render()
        const atBound = width()
        const firstGap = gap()
        pointer('pointermove', 92, start - 88, 215)
        await render()
        const atPull = width()
        const lastGap = gap()
        const openDuringPull = !pane.inert
        pointer('pointerup', 92, start - 88, 217)
        await render()
        const spring = handle.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.translate))!
        const easing = spring?.effect?.getTiming().easing ?? ''
        const releaseGap = gap()
        spring.pause()
        spring.currentTime = 42
        const mid = left()
        const midGap = gap()
        pointer('pointerdown', 93, mid, 260)
        await render()
        const caught = left()
        pointer('pointermove', 93, mid + 1, 285)
        await render()
        const followed = left()
        const atCatch = width()
        pointer('pointercancel', 93, mid + 1, 288)
        await render()
        await Promise.allSettled(handle.getAnimations().map(animation => animation.finished))
        return { atBound, firstGap, atPull, lastGap, openDuringPull, easing, releaseGap, mid, midGap, caught, followed, atCatch,
          end: width(), finalGap: gap() }
      } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
    }, pointerType)
    expect(result.atBound).toBeCloseTo(76, 0)
    expect(result.atPull).toBeCloseTo(result.atBound, 0)
    expect(result.openDuringPull).toBe(true)
    expect(result.firstGap).toBeLessThan(-2)
    expect(result.lastGap).toBeGreaterThan(-8)
    expect(result.lastGap).toBeLessThan(result.firstGap)
    expect(result.releaseGap).toBeCloseTo(result.lastGap, 1)
    expect(result.easing).toMatch(/^linear\(/)
    expect(result.midGap).toBeGreaterThan(result.lastGap)
    expect(result.caught).toBeCloseTo(result.mid, 0)
    expect(result.followed - result.caught).toBeCloseTo(1, 0)
    expect(result.atCatch).toBeCloseTo(76, 0)
    expect(result.end).toBeCloseTo(76, 0)
    expect(result.finalGap).toBeCloseTo(0, 0)
  })
}

test('a closing flick shares one release spring across the pane, grid and divider', async ({ page }) => {
  await page.setViewportSize({ width: 1660, height: 900 })
  await page.goto('/?component=W.layout')
  const grip = page.getByRole('separator', { name: '调整分类宽度' })
  await expect(grip).toHaveAttribute('aria-valuenow', '144')
  const result = await grip.evaluate(async handle => {
    const pane = document.getElementById(handle.getAttribute('aria-controls')!)!
    const layout = handle.closest('.sy-layout')!
    const width = () => pane.getBoundingClientRect().width
    const gap = () => handle.getBoundingClientRect().left - pane.getBoundingClientRect().right
    const render = async () => { for (let turn = 0; turn < 4; turn++) await Promise.resolve() }
    function pointer(type: string, x: number, time: number) {
      const event = new PointerEvent(type, { pointerType: 'mouse', pointerId: 96, clientX: x, bubbles: true })
      Object.defineProperty(event, 'timeStamp', { value: time })
      handle.dispatchEvent(event)
    }
    await Promise.allSettled([...layout.getAnimations(), ...pane.getAnimations()].map(animation => animation.finished))
    const start = handle.getBoundingClientRect().left
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
    try {
      pointer('pointerdown', start, 10)
      pointer('pointermove', start - 73, 155)
      await render()
      pointer('pointermove', start - 89, 175)
      await render()
      const pulled = width()
      const dividerOffset = gap()
      const openDuringPull = !pane.inert
      pointer('pointerup', start - 89, 176)
      await render()
      const firstWidth = width()
      const firstOffset = gap()
      const spring = handle.getAnimations().filter(animation =>
        (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.translate))
      const motions = [...pane.getAnimations(), ...layout.getAnimations(), ...spring]
      const distinct = (pick: (animation: Animation) => unknown) => new Set(motions.map(pick)).size
      const easing = motions[0]?.effect?.getTiming().easing
      const aligned = distinct(animation => animation.startTime) === 1
        && distinct(animation => animation.effect?.getTiming().duration) === 1
        && distinct(animation => animation.effect?.getTiming().easing) === 1
      for (const motion of motions) {
        motion.pause()
        motion.currentTime = 38
      }
      const midway = width()
      for (const motion of motions) motion.finish()
      await render()
      return { pulled, firstWidth, dividerOffset, firstOffset, openDuringPull, aligned, count: motions.length,
        easing, midway, finalWidth: width(), collapsed: pane.inert, bandGone: !handle.hasAttribute('data-sy-resize-band') }
    } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
  })
  expect(result).toMatchObject({ openDuringPull: true, aligned: true, count: 3, collapsed: true, bandGone: true })
  expect(result.easing).toMatch(/^linear\(/)
  expect(result.pulled).toBeCloseTo(76, 0)
  expect(result.firstWidth).toBeCloseTo(result.pulled, 0)
  expect(result.firstOffset).toBeCloseTo(result.dividerOffset, 1)
  expect(result.midway).toBeLessThan(result.pulled - 10)
  expect(result.finalWidth).toBeCloseTo(0, 0)
})

test('the upper limit matches the rendered pane and the divider keeps its release velocity', async ({ page }) => {
  await page.setViewportSize({ width: 1660, height: 900 })
  await page.goto('/?component=W.layout')
  const grip = page.getByRole('separator', { name: '调整分类宽度' })
  await grip.press('End')
  await expect(grip).toHaveAttribute('aria-valuenow', /\d/)
  const pull = (handle: Element) => {
    const pane = document.getElementById(handle.getAttribute('aria-controls')!)!
    const layout = handle.closest('.sy-layout')!
    const gap = () => handle.getBoundingClientRect().left - pane.getBoundingClientRect().right
    const width = () => pane.getBoundingClientRect().width
    const render = async () => { for (let turn = 0; turn < 4; turn++) await Promise.resolve() }
    function pointer(type: string, x: number, time: number) {
      const event = new PointerEvent(type, { pointerType: 'mouse', pointerId: 99, clientX: x, bubbles: true })
      Object.defineProperty(event, 'timeStamp', { value: time })
      handle.dispatchEvent(event)
    }
    return (async () => {
      await Promise.allSettled([...layout.getAnimations(), ...pane.getAnimations()].map(animation => animation.finished))
      const maximum = Number(handle.getAttribute('aria-valuemax'))
      const before = width()
      const start = handle.getBoundingClientRect().left
      const keyProducedBand = handle.hasAttribute('data-sy-resize-band')
      Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
      try {
        pointer('pointerdown', start, 10)
        pointer('pointermove', start + 3, 165)
        pointer('pointermove', start + 5, 167)
        pointer('pointermove', start + 7, 169)
        pointer('pointermove', start + 9, 171)
        await render()
        const pulled = width()
        const pullGap = gap()
        const box = handle.getBoundingClientRect()
        const hittable = handle.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
        pointer('pointerup', start + 9, 179)
        await render()
        const spring = handle.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.translate))
        if (spring) {
          spring.pause()
          spring.currentTime = 9
          await new Promise(requestAnimationFrame)
          await new Promise(requestAnimationFrame)
        }
        const earlyGap = gap()
        spring?.finish()
        await render()
        return { maximum, before, pulled, pullGap, hittable, earlyGap, remaining: gap(), keyProducedBand, sprang: Boolean(spring) }
      } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
    })()
  }
  await grip.scrollIntoViewIfNeeded()
  const result = await grip.evaluate(pull)
  expect(result.before).toBeCloseTo(result.maximum, 0)
  expect(result.pulled).toBeCloseTo(result.before, 1)
  expect(result.pullGap).toBeGreaterThan(1)
  expect(result.pullGap).toBeLessThan(8)
  expect(result.earlyGap).toBeGreaterThan(result.pullGap + .15)
  expect(result.remaining).toBeCloseTo(0, 1)
  expect(result.hittable).toBe(true)
  expect(result.keyProducedBand).toBe(false)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await grip.evaluate(pull)
  expect(reduced.pulled).toBeCloseTo(reduced.maximum, 0)
  expect(reduced.pullGap).toBeCloseTo(0, 1)
  expect(reduced.sprang).toBe(false)
})

for (const release of ['pointerup', 'pointercancel'] as const) {
  test(`the resizable grid takes over its closing tracks and handles ${release}`, async ({ page }) => {
    await page.goto('/?component=WP.resizable')
    const group = page.getByRole('group', { name: '文档工作区' })
    const grip = group.getByRole('separator', { name: '调整文档面板' })
    await expect(grip).toHaveAttribute('aria-valuenow', '144')
    const result = await grip.evaluate(async (handle, release) => {
      const grid = handle.closest('.sy-resizable')!
      const pane = grid.querySelector<HTMLElement>('[data-panel="files"]')!
      const width = () => pane.getBoundingClientRect().width
      const render = async () => { for (let turn = 0; turn < 3; turn++) await Promise.resolve() }
      const pointer = (type: string, clientX: number) => handle.dispatchEvent(new PointerEvent(type,
        { pointerId: 67, pointerType: 'mouse', clientX, button: 0, bubbles: true }))
      await Promise.allSettled(grid.getAnimations().map(animation => animation.finished))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await render()
      const [slide] = grid.getAnimations()
      slide.pause()
      slide.currentTime = 38
      const before = width()
      const start = handle.getBoundingClientRect().left
      Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: () => {} })
      try {
        pointer('pointerdown', start)
        await render()
        const grabbed = width()
        pointer('pointermove', start + 28)
        await render()
        const moved = width()
        const announced = Number(handle.getAttribute('aria-valuenow'))
        pointer(release, start + 28)
        await render()
        await Promise.allSettled(grid.getAnimations().map(animation => animation.finished))
        return { before, grabbed, moved, announced, end: width(), closed: pane.dataset.collapsed === 'true' }
      } finally { Reflect.deleteProperty(handle, 'setPointerCapture') }
    }, release)
    expect(result.before).toBeGreaterThan(82)
    expect(result.before).toBeLessThan(136)
    expect(result.grabbed).toBeCloseTo(result.before, 0)
    expect(result.moved).toBeCloseTo(result.grabbed + 28, 0)
    expect(result.announced).toBeCloseTo(result.moved, 0)
    expect(result.closed).toBe(release === 'pointercancel')
    expect(result.end).toBeCloseTo(release === 'pointercancel' ? 36 : result.moved, 0)
  })
}
