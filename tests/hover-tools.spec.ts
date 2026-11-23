import { expect, test } from '@playwright/test'

test('a headless hover card follows its separate anchor and keeps a pointer path to its controls', async ({ page }) => {
  await page.goto('/?component=WP.hover-card')
  const review = page.getByRole('region', { name: '自定义悬浮预览' })
  const trigger = review.getByRole('button', { name: '品牌资源' })
  const panel = page.getByRole('dialog', { name: '资源预览' })
  await trigger.hover()
  await expect(panel).toBeVisible()
  const anchorBounds = (await review.locator('[data-preview-anchor]').boundingBox())!
  await expect.poll(async () => {
    const bounds = (await panel.boundingBox())!
    return Math.abs((bounds.x + bounds.width / 2) - (anchorBounds.x + anchorBounds.width / 2))
  }).toBeLessThan(2)
  const panelBounds = (await panel.boundingBox())!
  expect(panelBounds.y - anchorBounds.y - anchorBounds.height).toBeGreaterThan(8)
  await panel.getByRole('button', { name: '收藏' }).click()
  await expect(review.locator('output')).toHaveText('已收藏品牌资源')
  await page.mouse.click(2, 2)
  await expect(panel).toBeHidden()
})

test('keyboard focus enters a headless hover card and Escape returns to the custom trigger', async ({ page }) => {
  await page.goto('/?component=WP.hover-card')
  const review = page.getByRole('region', { name: '自定义悬浮预览' })
  const trigger = review.getByRole('button', { name: '品牌资源' })
  const panel = page.getByRole('dialog', { name: '资源预览' })
  await trigger.focus()
  await expect(panel).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(panel.getByRole('button', { name: '收藏' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('button', { name: '收藏' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(trigger).toBeFocused()

  await review.getByRole('switch', { name: '启用预览' }).click()
  await trigger.focus()
  await expect(panel).toBeHidden()
})

test.describe('headless hover card touch interaction', () => {
  test.use({ hasTouch: true })

  test('the explicit tap mode opens and dismisses the preview', async ({ page }) => {
    await page.goto('/?component=WP.hover-card')
    const trigger = page.getByRole('button', { name: '品牌资源' })
    const panel = page.getByRole('dialog', { name: '资源预览' })
    await trigger.tap()
    await expect(panel).toBeVisible()
    await trigger.tap()
    await expect(panel).toBeHidden()
  })
})
