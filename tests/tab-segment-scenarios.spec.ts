import { expect, test } from '@playwright/test'

test('fill tabs keep equal widths while the selected icon and content change', async ({ page }) => {
  await page.goto('/?component=W.tabs')
  const list = page.getByRole('tablist', { name: '发布环节' })
  const widths = await list.getByRole('tab').evaluateAll(tabs => tabs.map(tab => tab.getBoundingClientRect().width))
  expect(widths).toHaveLength(3)
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2)
  const first = list.getByRole('tab', { name: '资料' })
  const review = list.getByRole('tab', { name: '复核' })
  const unselectedReview = await review.locator('svg path').getAttribute('d')
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await first.press('ArrowRight')
  await expect(review).toBeFocused()
  await expect(review).toHaveAttribute('aria-selected', 'true')
  await expect(review.locator('svg path')).toHaveCount(1)
  await expect(review.locator('svg path')).not.toHaveAttribute('d', unselectedReview ?? '')
  await expect(page.getByRole('tabpanel', { name: '复核', exact: true }).locator('.sy-visually-hidden')).toHaveText('核对文案、语言和签名。')
  await expect(list).toHaveCSS('border-bottom-width', '1px')
})

test('tabs ease the space below panels of different heights and keep the tab list steady', async ({ page }) => {
  await page.goto('/?component=W.tabs')
  const list = page.getByRole('tablist', { name: '发布环节' })
  const review = list.getByRole('tab', { name: '复核' })
  const triggerId = await review.getAttribute('id')
  await page.addStyleTag({ content: `[role="tabpanel"][aria-labelledby="${triggerId}"] { min-block-size: 160px; }` })
  const tabs = list.locator('..')
  const before = await tabs.evaluate((root: HTMLElement) => {
    const animate = root.animate.bind(root)
    root.animate = (frames, timing) => {
      const animation = animate(frames, timing)
      if (animation.id === 'sy-tabs-layout') { animation.pause(); animation.currentTime = 0 }
      return animation
    }
    return root.nextElementSibling!.getBoundingClientRect().top
  })
  const listTop = (await list.boundingBox())!.y
  await list.getByRole('tab', { name: '资料' }).press('ArrowRight')
  await expect(review).toBeFocused()
  await expect(tabs.getByRole('tabpanel', { name: '复核', exact: true })).toBeVisible()
  const motion = await tabs.evaluate(root => {
    const animation = root.getAnimations().find(effect => effect.id === 'sy-tabs-layout')!
    const { duration, easing } = animation.effect!.getTiming()
    const following = root.nextElementSibling!
    const start = following.getBoundingClientRect().top
    animation.currentTime = Number(duration) / 2
    const middle = following.getBoundingClientRect().top
    animation.currentTime = Number(duration) - 1
    const end = following.getBoundingClientRect().top
    animation.currentTime = Number(duration) / 2
    return { start, middle, end, easing }
  })
  expect(motion.easing).toMatch(/cubic-bezier/)
  expect(motion.start).toBeCloseTo(before, 0)
  expect(motion.middle).toBeGreaterThan(before + 10)
  expect(motion.end).toBeGreaterThan(motion.middle + 5)
  expect((await list.boundingBox())!.y).toBeCloseTo(listTop, 0)
  await review.press('ArrowLeft')
  const first = list.getByRole('tab', { name: '资料' })
  await expect(first).toBeFocused()
  const reversed = await tabs.evaluate(root => {
    const start = root.nextElementSibling!.getBoundingClientRect().top
    root.getAnimations().find(effect => effect.id === 'sy-tabs-layout')!.finish()
    return { start, end: root.nextElementSibling!.getBoundingClientRect().top }
  })
  expect(reversed.start).toBeCloseTo(motion.middle, 0)
  expect(reversed.end).toBeCloseTo(before, 0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await first.press('ArrowRight')
  await expect(review).toBeFocused()
  await expect(tabs.getByRole('tabpanel', { name: '复核', exact: true })).toBeVisible()
  expect(await tabs.evaluate(root => root.getAnimations().some(effect => effect.id === 'sy-tabs-layout'))).toBe(false)
  expect(await tabs.evaluate(root => root.nextElementSibling!.getBoundingClientRect().top)).toBeCloseTo(motion.end, 0)
})

test('tab badges, status indicators and header actions coexist with the overflow menu', async ({ page }) => {
  await page.goto('/?component=W.tabs')
  const toolbar = page.getByRole('toolbar', { name: '发布资料操作' })
  const tabs = toolbar.getByRole('tablist', { name: '发布资料与状态' })
  const draft = tabs.getByRole('tab', { name: /文稿/ })
  const indicator = tabs.locator('.sy-tabs__indicator-track')
  await expect(indicator).toHaveCSS('opacity', '1')
  await indicator.evaluate(node => node.setAttribute('data-test-retained', ''))
  await expect(draft.locator('.sy-badge .sy-visually-hidden')).toHaveText('2')
  await expect(tabs.getByRole('tab', { name: /图片/ }).locator('.sy-badge')).toHaveText('7')
  await expect(tabs.getByRole('tab', { name: /版本/ }).locator('.sy-status-dot')).toHaveAttribute('aria-label', '版本已同步')
  await toolbar.getByRole('button', { name: '登记复核' }).click()
  await expect(draft.locator('.sy-badge .sy-visually-hidden')).toHaveText('3')
  await tabs.getByRole('button', { name: '其余资料' }).press('Enter')
  const menu = page.getByRole('menu', { name: '其余资料' })
  await expect(menu.getByRole('menuitemradio', { name: '受限资料' })).toBeDisabled()
  await menu.getByRole('menuitemradio', { name: '导出文件' }).press('Enter')
  await expect(tabs.getByRole('button', { name: '导出文件' })).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: '导出文件' }).locator('.sy-visually-hidden')).toHaveText('下载已生成的交付文件。')
  await expect(indicator).toHaveCSS('opacity', '0')
  await draft.click()
  await expect(indicator).toHaveAttribute('data-test-retained', '')
  await expect(indicator).toHaveCSS('opacity', '1')
})

test('icon-only segments retain accessible labels and synchronize the full-width text controls', async ({ page }) => {
  await page.goto('/?component=WP.segment')
  const plain = page.getByRole('group', { name: '切换任务视图' })
  const icons = page.getByRole('group', { name: '视图图标快捷入口' })
  const widths = await plain.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().width))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2)
  const schedule = icons.getByRole('button', { name: '时间线' })
  await expect(schedule.locator('svg path')).toBeVisible()
  await expect(schedule).toHaveText('')
  await icons.getByRole('button', { name: '列表' }).press('ArrowRight')
  await expect(schedule).toBeFocused()
  await schedule.press('Space')
  await expect(plain.getByRole('button', { name: '时间线' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status', { name: '当前任务视图' }).locator('.sy-visually-hidden')).toHaveText('时间线')
  const periods = page.getByRole('group', { name: '按周期查看交付量' })
  await expect(periods.getByRole('button', { name: '每月' })).toBeDisabled()
  await periods.getByRole('button', { name: '每周' }).press('ArrowRight')
  await expect(periods.getByRole('button', { name: '每日' })).toBeFocused()
})
