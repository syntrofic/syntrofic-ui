import { expect, test } from '@playwright/test'

test('moves layout tracks with easing and keeps the content viewport mounted', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?component=W.layout')
  const viewport = page.getByRole('region', { name: '主要资料' })
  await viewport.evaluate(node => { node.scrollTop = 75 })
  const position = await viewport.evaluate(node => node.scrollTop)
  const tracks = await page.getByRole('button', { name: '切换分类' }).evaluate(async (button) => {
    const frame = button.ownerDocument.querySelector<HTMLElement>('.sy-layout')!
    const trigger = button as HTMLButtonElement
    trigger.click()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    return frame.getAnimations().flatMap(animation => {
      const effect = animation.effect as KeyframeEffect
      const frames = effect.getKeyframes()
      return frames.some(frame => frame.gridTemplateColumns) ? [{
        easing: effect.getTiming().easing,
        from: frames[0]?.gridTemplateColumns, to: frames.at(-1)?.gridTemplateColumns,
      }] : []
    })
  })
  expect(tracks).toHaveLength(1)
  expect(tracks[0]?.easing).toMatch(/cubic-bezier/)
  expect(tracks[0]?.from).not.toBe(tracks[0]?.to)
  await expect(page.getByRole('navigation', { name: '资料分类', exact: true })).toHaveCount(0)
  expect(await viewport.evaluate(node => node.scrollTop)).toBe(position)
})

test('resizes or collapses panels with the keyboard and restores focus on collapse', async ({ page }) => {
  await page.goto('/?component=W.layout')
  const demo = page.getByRole('region', { name: '工作台布局演示' })
  const handle = demo.getByRole('separator', { name: '调整分类宽度' })
  const panel = demo.getByRole('navigation', { name: '发布资料分类' })
  await expect(handle).toHaveAttribute('aria-valuenow', '144')
  await handle.press('ArrowRight')
  await expect(handle).toHaveAttribute('aria-valuenow', '176')
  await panel.getByRole('button', { name: '待办' }).press('Enter')
  await expect(panel.getByRole('button', { name: '待办' })).toHaveAttribute('aria-current', 'true')
  await panel.getByRole('button', { name: '待办' }).focus()
  await demo.getByRole('button', { name: '收放分类' }).evaluate(node => (node as HTMLElement).click())
  await expect(handle).toBeFocused()
  await expect(panel).toHaveCount(0)
  await handle.press('Enter')
  await expect(panel.getByRole('button', { name: '待办' })).toBeVisible()
  await demo.getByRole('button', { name: '保存视图' }).click()
  await expect(demo.locator('.sy-motion-text > [aria-live="polite"]')).toHaveText('已保存待办')
  await demo.getByRole('combobox', { name: '布局模式' }).click()
  await page.getByRole('option', { name: '仅正文' }).click()
  await expect(panel).toHaveCount(0)
  await expect(demo.getByRole('complementary', { name: '发布审核记录' })).toHaveCount(0)
  const content = demo.getByRole('region', { name: '发布资料正文' }).locator('..')
  await demo.getByRole('switch', { name: '限制正文宽度' }).click()
  await expect(content).toHaveCSS('max-inline-size', '360px')
  await demo.getByRole('switch', { name: '内容贴边' }).click()
  await expect(demo.getByRole('region', { name: '发布资料正文' }).locator('.sy-layout__region-content')).toHaveCSS('padding-inline-start', '0px')
  await page.setViewportSize({ width: 320, height: 760 })
  await demo.getByRole('combobox', { name: '布局模式' }).click()
  await page.getByRole('option', { name: '双侧栏' }).click()
  for (const pane of [panel, demo.getByRole('region', { name: '发布资料正文' })]) {
    await expect.poll(() => pane.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
  }
})

test('reflows auto-fit grid columns and keeps explicit row and column spans', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/?component=W.grid')
  const region = page.getByRole('region', { name: '响应式资料网格' })
  const positions = async () => region.locator('.sy-grid').evaluate(node => {
    const children = [...node.children]
    const firstTop = children[0]?.getBoundingClientRect().top
    return children.filter(child => Math.abs(child.getBoundingClientRect().top - (firstTop ?? 0)) < 1).length
  })
  const wideCount = await positions()
  expect(wideCount).toBeGreaterThan(2)
  await region.getByRole('switch', { name: '使用窄栏宽度' }).click()
  await expect.poll(positions).toBe(2)
  const dashboard = page.locator('.sy-grid[aria-label="跨行与跨列的交付面板"]')
  await expect(dashboard).toHaveCSS('grid-auto-rows', '62px')
  await expect(dashboard.locator('.sy-grid-span').first()).toHaveCSS('grid-row-end', 'auto')
  await expect(dashboard.locator('.sy-grid-span').first()).toHaveCSS('grid-row-start', 'span 2')
  await expect(dashboard.locator('.sy-grid-span').last()).toHaveCSS('grid-column-end', '-1')
  await expect(page.locator('[aria-label="三列跨栏布局"] .sy-grid-span').first()).toHaveCSS('grid-column-start', 'span 2')
})

test('switches stack direction and centers content without losing intrinsic and fill sizing', async ({ page }) => {
  await page.goto('/?component=W.stack')
  const preview = page.getByRole('region', { name: '堆叠方向与对齐' })
  await expect(preview.locator('.sy-stack')).toHaveCSS('justify-content', 'space-between')
  await preview.getByRole('combobox', { name: '排列方向' }).click()
  await page.getByRole('option', { name: '纵向' }).click()
  await expect(preview.locator('.sy-stack')).toHaveCSS('flex-direction', 'column')
  await preview.getByRole('combobox', { name: '项目间距' }).click()
  await page.getByRole('option', { name: '宽松' }).click()
  await expect(preview.locator('.sy-stack')).toHaveCSS('gap', '14px')
  const flexible = page.locator('.sy-stack-item[data-size="fill"]').first()
  await expect(flexible).toHaveCSS('flex-grow', '1')
  await page.getByRole('button', { name: '联系顾川' }).click()
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: '已选择顾川' })).toBeAttached()
  const centered = page.locator('.sy-center[aria-label="卡片中的双轴居中"]')
  await expect(centered).toHaveCSS('align-items', 'center')
  await expect(centered).toHaveCSS('justify-content', 'center')
  await centered.getByRole('button', { name: '放入示例资料' }).click()
  await expect(centered.locator('strong .sy-visually-hidden')).toHaveText('已放入一份资料')
  await page.goto('/?component=W.section')
  const section = page.getByRole('region', { name: '本期交付提示' })
  await expect(page.getByRole('region', { name: '内容归档' })).toHaveCSS('background-color', 'rgb(248, 248, 248)')
  await page.getByRole('combobox', { name: '区域表面' }).click()
  await page.getByRole('option', { name: '透明' }).click()
  await expect(section).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(section).toHaveCSS('border-block-end-width', '1px')
})

test('keeps inline and two-axis viewports keyboard scrollable only while they overflow', async ({ page }) => {
  await page.setViewportSize({ width: 410, height: 760 })
  await page.goto('/?component=W.scrollable-area')
  const rail = page.getByRole('region', { name: '最近资料' })
  await expect(rail).toHaveAttribute('data-inline', 'true')
  await expect(rail).toHaveCSS('margin-inline-start', '-12px')
  await expect(rail.locator('.sy-scrollable-area__content')).toHaveCSS('padding-inline-start', '12px')
  await rail.evaluate(node => { node.scrollLeft = node.scrollWidth })
  await page.getByRole('button', { name: '回到资料带开头' }).click()
  await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBe(0)
  await page.getByRole('switch', { name: '仅展示最近资料' }).click()
  await expect(rail).toHaveAttribute('tabindex', '-1')
  const board = page.getByRole('region', { name: '交付看板', exact: true })
  await expect(board).toHaveAttribute('data-inline', 'true')
  await expect(board).toHaveAttribute('data-block', 'true')
  await board.press('End')
  await expect.poll(() => board.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  await page.getByRole('switch', { name: '仅纵向滚动' }).click()
  await expect(board).not.toHaveAttribute('data-inline')
})

test('lets fitting sticky headers pass through and applies different nested overscroll policies', async ({ page }) => {
  await page.goto('/?component=W.scrollable-area')
  const sticky = page.getByRole('region', { name: '粘性标题边界对比' })
  const relativeTops = await sticky.evaluate(node => {
    const start = node.querySelector<HTMLElement>('h3')!
    const end = node.querySelectorAll<HTMLElement>('h3')[1]!
    const top = node.getBoundingClientRect().top
    const initial = (item: HTMLElement) => item.getBoundingClientRect().top - top
    const second = initial(end)
    node.scrollTop = initial(start) + 30
    const passed = initial(start)
    node.scrollTop = second + 24
    return { passed, contained: initial(end) }
  })
  expect(relativeTops.passed).toBeGreaterThanOrEqual(0)
  expect(relativeTops.passed).toBeLessThan(12)
  expect(relativeTops.contained).toBeLessThan(-10)
  const chaining = page.getByRole('region', { name: '滚动传递对比' })
  const allow = chaining.getByRole('group', { name: '允许继续滚动' })
  const contain = chaining.getByRole('group', { name: '限制继续滚动' })
  await expect(allow).toHaveCSS('overscroll-behavior-y', 'auto')
  await expect(contain).toHaveCSS('overscroll-behavior-y', 'contain')
})
