import { expect, test } from '@playwright/test'

test('anchored layers preserve local style and follow logical placement', async ({ page }) => {
  await page.goto('/?component=W.overlay')
  const review = page.getByRole('region', { name: '图层定位示例' })
  const scope = review.getByRole('region', { name: '局部样式' })
  const anchor = review.getByRole('button', { name: '显示锚定图层' })
  const markerCount = () => scope.locator('p').first().evaluate(node => Array.from(node.childNodes).filter(child =>
    child.nodeType === Node.COMMENT_NODE && (child as Comment).data === 'sy-layer-anchor').length)
  const layer = scope.locator(':scope > .sy-layer')
  await expect.poll(markerCount).toBe(1)
  await expect(layer).toHaveCount(0)
  await anchor.click()
  await expect(layer).toBeVisible()
  await expect(layer).toHaveCSS('color', 'rgb(38, 70, 103)')
  await expect(layer).toHaveAttribute('data-side', 'bottom')
  let buttonBounds = (await anchor.boundingBox())!
  let layerBounds = (await layer.boundingBox())!
  expect(layerBounds.x).toBeCloseTo(buttonBounds.x, 0)
  expect(layerBounds.y - buttonBounds.y - buttonBounds.height).toBeCloseTo(8, 0)
  await page.keyboard.press('Escape')
  await expect(layer).toHaveCount(0)
  await expect.poll(markerCount).toBe(1)

  await review.getByRole('checkbox', { name: '从右到左' }).check()
  await anchor.click()
  await expect(layer).toHaveCSS('direction', 'rtl')
  buttonBounds = (await anchor.boundingBox())!
  layerBounds = (await layer.boundingBox())!
  expect(layerBounds.x + layerBounds.width).toBeCloseTo(buttonBounds.x + buttonBounds.width, 0)
  await page.keyboard.press('Escape')
  await review.getByRole('checkbox', { name: '竖排' }).check()
  await review.getByLabel('锚点方向').selectOption('above')
  await anchor.click()
  await expect(layer).toHaveCSS('writing-mode', 'vertical-rl')
  await expect(layer).toHaveAttribute('data-side', 'right')
})

test('layers flip and slide at edges and can use fixed or authored coordinates', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 720 })
  await page.goto('/?component=W.overlay')
  const review = page.getByRole('region', { name: '图层定位示例' })
  await review.getByRole('checkbox', { name: '贴近视口底部' }).check()
  await review.getByRole('button', { name: '显示锚定图层' }).click()
  const anchored = review.locator('[aria-label="锚定图层"]')
  await expect(anchored).toHaveAttribute('data-side', 'top')
  let bounds = (await anchored.boundingBox())!
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(989)
  expect(bounds.y + bounds.height).toBeLessThan(685)
  await page.keyboard.press('Escape')
  await expect(anchored).toHaveCount(0)

  await review.getByRole('button', { name: '显示坐标图层' }).click()
  const fixed = review.locator('[aria-label="坐标图层"]')
  await expect(fixed).toBeVisible()
  bounds = (await fixed.boundingBox())!
  expect(bounds.x).toBe(45)
  expect(bounds.y).toBe(80)
  await fixed.getByRole('button', { name: '关闭坐标图层' }).click()
  await expect(fixed).toBeHidden()

  const trigger = review.getByRole('button', { name: '显示自定义图层' })
  await trigger.click()
  const custom = review.locator('[aria-label="自定义图层"]')
  await expect(custom).toBeVisible()
  if (await page.evaluate(() => CSS.supports('top', 'anchor(bottom)'))) {
    const target = (await trigger.boundingBox())!
    const popup = (await custom.boundingBox())!
    expect(popup.x).toBeCloseTo(target.x, 0)
    expect(popup.y).toBeCloseTo(target.y + target.height + 8, 0)
  }
  await custom.getByRole('button', { name: '关闭自定义图层' }).click()
  await expect(custom).toBeHidden()
})

test('layer providers scope collision insets and share the outer toast viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 720 })
  await page.goto('/?component=W.overlay')
  const review = page.getByRole('region', { name: '图层定位示例' })
  await review.getByRole('button', { name: '切换边缘避让锚点' }).click()
  await review.getByRole('button', { name: '打开避让图层' }).click()
  const layer = review.locator('[aria-label="避让图层"]')
  await expect(layer).toHaveAttribute('data-side', 'top')
  let bounds = (await layer.boundingBox())!
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(961)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(585)
  await page.keyboard.press('Escape')
  await expect(layer).toBeHidden()

  await review.getByRole('button', { name: '打开避让菜单' }).click()
  const popover = review.getByRole('dialog', { name: '避让菜单' })
  await expect(popover).toBeVisible()
  await expect.poll(async () => {
    const box = await popover.boundingBox()
    return box ? box.x + box.width : Number.POSITIVE_INFINITY
  }).toBeLessThanOrEqual(965)
  await page.keyboard.press('Escape')

  await review.getByRole('button', { name: '发送图层通知' }).click()
  const viewport = review.locator('.sy-toast-viewport')
  await expect(viewport).toHaveCount(1)
  await expect(viewport).toHaveAttribute('data-placement', 'bottom-end')
  await expect(viewport).toHaveCSS('bottom', '98px')
  await expect(viewport).toHaveCSS('right', '62px')
  const toast = viewport.locator('.sy-toast')
  await expect(toast).toBeVisible()
  await expect(toast).toContainText('布局设置已应用')
})
