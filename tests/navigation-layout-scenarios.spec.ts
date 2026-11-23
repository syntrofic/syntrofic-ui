import { expect, test } from '@playwright/test'

test('the controlled outline reflects external selection, four levels of indentation and compact density', async ({ page }) => {
  await page.goto('/?component=W.outline')
  const outline = page.getByRole('navigation', { name: '受控发布大纲' })
  const panel = page.getByRole('region', { name: '大纲密度与受控选中' })
  const setup = outline.getByRole('link', { name: '准备工作' })
  const fonts = outline.getByRole('link', { name: '字体授权' })
  await expect(setup).toHaveAttribute('aria-current', 'location')
  await expect(fonts).toHaveCSS('--sy-outline-depth', '3')
  await panel.getByRole('combobox', { name: '高亮章节' }).click()
  await page.getByRole('option', { name: '字体授权' }).click()
  await expect(fonts).toHaveAttribute('aria-current', 'location')
  await expect(setup).not.toHaveAttribute('aria-current')
  const indicator = outline.locator('.sy-outline__indicator')
  const before = await indicator.evaluate(element => element.getBoundingClientRect().height)
  await panel.getByRole('switch', { name: '紧凑目录' }).click()
  await expect(outline).toHaveAttribute('data-density', 'compact')
  await expect.poll(() => indicator.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(before)
  await setup.press('Enter')
  await expect(setup).toHaveAttribute('aria-current', 'location')
})

test('headings appended to both a DOM article and Markdown receive working outline links', async ({ page }) => {
  await page.goto('/?component=W.outline')
  for (const item of [
    { add: '添加正文小节', nav: '实时正文目录', name: '补充发布记录 1', section: '动态发布正文' },
    { add: '添加 Markdown 小节', nav: '实时 Markdown 目录', name: '补充交接 1', section: '可更新的 Markdown 正文' },
  ]) {
    const link = page.getByRole('navigation', { name: item.nav }).getByRole('link', { name: item.name })
    await expect(link).toHaveCount(0)
    await page.getByRole('button', { name: item.add }).press('Enter')
    const heading = page.getByRole('region', { name: item.section }).getByRole('heading', { name: item.name })
    const id = await heading.getAttribute('id')
    await expect(link).toHaveAttribute('href', '#' + encodeURIComponent(id!))
    await link.press('Enter')
    await expect(link).toHaveAttribute('aria-current', 'location')
    expect(decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(id)
  }
})

test('overflow toolbars cap visible actions, open a keyboard menu and fold the earliest versions first', async ({ page }) => {
  await page.setViewportSize({ width: 1130, height: 850 })
  await page.goto('/?component=W.overflow-list')
  const toolbar = page.getByRole('list', { name: '受限工具栏' })
  const trigger = toolbar.getByRole('button', { name: '其余交付操作 (3)' })
  await expect(toolbar.getByRole('button')).toHaveCount(4)
  await expect(toolbar.getByRole('button', { name: '查看历史' })).toHaveCount(0)
  await trigger.press('Enter')
  const menu = page.getByRole('menu', { name: '受限工具栏' })
  await expect(menu.getByRole('menuitem')).toHaveCount(3)
  await menu.getByRole('menuitem', { name: '查看历史' }).press('Enter')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('status', { name: '溢出操作结果' }).locator('.sy-visually-hidden')).toHaveText('已选择查看历史')
  const versions = page.getByRole('list', { name: '最近发布批次' })
  const buttons = versions.getByRole('button')
  await expect(buttons).toHaveText(['较早的发布批次', '发布批次 5', '发布批次 6'])
  await buttons.first().press('Enter')
  await expect(page.getByRole('menu', { name: '最近发布批次' }).getByRole('menuitem', { name: '发布批次 1' })).toBeVisible()
})

test('wrapped tags retain two rows and a count-only overflow badge updates as its container grows', async ({ page }) => {
  await page.goto('/?component=W.overflow-list')
  const single = page.getByRole('list', { name: '分类徽标' })
  const multi = page.getByRole('list', { name: '双行分类标签' })
  const summary = single.getByRole('status', { name: /另有分类/ })
  await expect(summary).toBeVisible()
  await expect(multi.getByRole('status')).toBeVisible()
  const singleVisible = await single.locator('[data-overflow-item]:not([inert])').count()
  const multiVisible = await multi.locator('[data-overflow-item]:not([inert])').count()
  expect(multiVisible).toBeGreaterThan(singleVisible)
  const visibleRows = await multi.locator('li:not([inert])').evaluateAll(items => {
    const rows: number[] = []
    for (const item of items as HTMLElement[]) {
      const center = item.offsetTop + item.offsetHeight / 2
      if (rows.every(previous => Math.abs(previous - center) > 4)) rows.push(center)
    }
    return rows.length
  })
  expect(visibleRows).toBe(2)
  await expect(single.getByRole('button')).toHaveCount(0)
  await page.getByRole('switch', { name: '缩窄分类栏' }).click()
  await expect.poll(() => single.locator('[data-overflow-item]:not([inert])').count()).toBeGreaterThan(singleVisible)
})

test('file, settings and mailbox trees expose row activation, selected links and animated counts', async ({ page }) => {
  await page.goto('/?component=W.tree-list')
  const files = page.getByRole('tree', { name: '素材文件浏览器' })
  const folder = files.getByRole('treeitem', { name: '标志文件' })
  await folder.press('ArrowRight')
  const file = files.getByRole('treeitem', { name: '主标志.svg' })
  await expect(file.locator('svg path')).toBeVisible()
  await file.click()
  await expect(file).toHaveAttribute('aria-selected', 'true')
  const result = page.getByLabel('目录操作结果').locator('.sy-visually-hidden')
  await expect(result).toHaveText('已打开主标志.svg')
  await page.getByRole('switch', { name: '显示文件树连接线' }).click()
  await expect(files).toHaveAttribute('data-guides', 'false')
  await page.getByRole('switch', { name: '宽松行距' }).click()
  await expect(files).toHaveAttribute('data-size', 'lg')

  const settings = page.getByRole('tree', { name: '工作室设置目录' })
  await expect(settings.getByRole('treeitem', { name: '团队概览' })).toHaveAttribute('aria-selected', 'true')
  const release = settings.getByRole('treeitem', { name: '发布设置' })
  await release.press('F2')
  await expect(release.getByRole('button', { name: '快捷设置' })).toBeFocused()
  await release.getByRole('button', { name: '快捷设置' }).press('Enter')
  await expect(result).toHaveText('已进入快捷设置')
  const docs = settings.getByRole('treeitem', { name: '维护文档' })
  await docs.getByRole('link').click()
  await expect(docs).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/-docs$/)
  await expect(result).toHaveText('已打开维护文档')

  const inbox = page.getByRole('tree', { name: '项目邮件目录' }).getByRole('treeitem', { name: '收件箱' })
  await expect(inbox.locator('.sy-badge .sy-visually-hidden')).toHaveText('4')
  await page.getByRole('button', { name: '标记一条为已读' }).click()
  await expect(inbox.locator('.sy-badge .sy-visually-hidden')).toHaveText('3')
})

test('a static stack item can shrink while the fill item claims all remaining width', async ({ page }) => {
  await page.goto('/?component=W.stack')
  const sample = page.getByRole('region', { name: '固定栏与可伸展栏' })
  const fixed = sample.locator('[data-size="static"]')
  const fill = sample.locator('[data-size="fill"]')
  const before = await fill.evaluate(element => element.getBoundingClientRect().width)
  await sample.getByRole('switch', { name: '收窄交付边栏' }).click()
  await expect.poll(() => fill.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(before + 30)
  await expect.poll(() => fixed.evaluate(element => element.getBoundingClientRect().width)).toBe(72)
})

test('the resizable sidebar snaps to a preset and restores that width after collapsing', async ({ page }) => {
  await page.setViewportSize({ width: 1130, height: 890 })
  await page.goto('/?component=WP.resizable')
  const sample = page.getByRole('region', { name: '可调整区域工具' })
  const handle = sample.getByRole('separator', { name: '调整主区域宽度' })
  await expect(handle).toHaveAccessibleDescription(/260 和 310/)
  await handle.scrollIntoViewIfNeeded()
  const width = sample.getByRole('status', { name: '主区域宽度', exact: true }).locator('.sy-visually-hidden')
  async function drag(change: number) {
    const box = (await handle.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + change, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
  }
  const current = Number(await width.textContent())
  await drag(255 - current)
  await expect(width).toHaveText('260')
  await drag(-230)
  await expect(sample.getByRole('button', { name: '展开主区域' })).toBeVisible()
  await sample.getByRole('button', { name: '展开主区域' }).press('Enter')
  await expect(width).toHaveText('260')
})
