import { expect, test, type Locator, type Page } from '@playwright/test'

async function drag(page: Page, tile: Locator, distance: number, release: 'hold' | 'flick') {
  if (release === 'flick') {
    await tile.evaluate((element, dx) => {
      const view = element.ownerDocument.defaultView!
      const event = { pointerId: 19, isPrimary: true, button: 0, pointerType: 'mouse' }
      element.dispatchEvent(new view.PointerEvent('pointerdown', { ...event, clientX: 100 }))
      view.dispatchEvent(new view.PointerEvent('pointermove', { ...event, clientX: 100 + dx }))
      view.dispatchEvent(new view.PointerEvent('pointerup', { ...event, clientX: 100 + dx }))
    }, distance)
    return
  }
  await tile.scrollIntoViewIfNeeded()
  const box = await tile.boundingBox()
  if (!box) throw new Error('Missing draggable tile')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + distance, y, { steps: 8 })
  await expect.poll(() => tile.evaluate(element => parseFloat(element.style.translate))).toBeCloseTo(distance, 0)
  await page.waitForTimeout(125)
  await page.mouse.up()
}

test('native pan and the Vue hook follow the same pointer travel and spring home', async ({ page }) => {
  await page.goto('/?component=W.motion')
  const sample = page.getByRole('region', { name: '手势 API 对照' })
  for (const api of ['hook', 'factory']) {
    const tile = sample.locator('[data-pan-tile="' + api + '"]')
    await drag(page, tile, 40, 'hold')
    await expect.poll(() => tile.evaluate(element => parseFloat(getComputedStyle(element).translate) || 0)).toBe(0)
  }
})

test('cards spring back, discard on a flick, and support keyboard and reduced motion', async ({ page }) => {
  await page.goto('/?component=W.motion')
  const deck = page.getByRole('region', { name: 'usePanGesture 卡片' })
  const tile = deck.locator('[data-deck-tile]')
  await drag(page, tile, 42, 'hold')
  await expect(tile.locator('.sy-visually-hidden')).toHaveText('版式复核')
  await expect.poll(() => tile.evaluate(element => parseFloat(getComputedStyle(element).translate) || 0)).toBe(0)
  await drag(page, tile, 64, 'flick')
  await expect(tile.locator('.sy-visually-hidden')).toHaveText('目录校验')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const api of ['createAnimator', 'useAnimator']) {
    const sample = page.getByRole('region', { name: api + ' 卡片', exact: true })
    const move = sample.getByRole('button', { name: '移除当前卡片' })
    await move.press('Enter')
    await expect(sample.locator('[data-deck-tile] .sy-visually-hidden')).toHaveText('目录校验')
    await expect(sample.locator('[aria-live="polite"]')).toContainText('已移除版式复核')
    await expect(move).toBeFocused()
  }
})

test('snap cards settle via flick and keyboard and preserve the stop when direction reverses', async ({ page }) => {
  await page.goto('/?component=W.motion')
  const hook = page.getByRole('region', { name: 'useDragToSnapPoints 卡片' })
  const factory = page.getByRole('region', { name: 'createDragToSnapPoints 卡片' })
  await drag(page, hook.locator('[data-snap-card]'), 43, 'flick')
  const review = hook.getByRole('button', { name: '复核中' })
  await expect(review).toHaveAttribute('aria-pressed', 'true')
  await factory.getByRole('button', { name: '已归档' }).press('Enter')
  await expect(factory.getByRole('status', { name: '卡片当前位置' }).locator('.sy-visually-hidden')).toHaveText('已归档')
  await page.getByRole('switch', { name: '从右往左排列卡片' }).press('Space')
  await expect(hook).toHaveAttribute('dir', 'rtl')
  await expect(review).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => hook.locator('[data-snap-card]').evaluate(element => parseFloat(getComputedStyle(element).translate))).toBe(-68)
  await expect.poll(() => factory.locator('[data-snap-card]').evaluate(element => parseFloat(getComputedStyle(element).translate))).toBe(-136)
})
