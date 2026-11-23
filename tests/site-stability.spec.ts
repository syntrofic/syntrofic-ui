import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4188', viewport: { width: 1440, height: 820 } })

async function recordPageLayout(page: Page) {
  await page.evaluate(() => {
    const documentRoot = document.documentElement
    const header = document.querySelector('.topbar-row')!
    const title = document.querySelector('main h1')!
    const measure = () => {
      const heading = title.getBoundingClientRect()
      const topbar = header.getBoundingClientRect()
      return [documentRoot.offsetWidth, document.body.clientWidth, scrollX, scrollY, topbar.left, topbar.width, heading.left, heading.top]
    }
    const samples = [measure()]
    let frame = 0
    function read() { samples.push(measure()); frame = requestAnimationFrame(read) }
    frame = requestAnimationFrame(read)
    const stop = () => { cancelAnimationFrame(frame); return [...samples, measure()] }
    ;(window as Window & { stopLayoutProbe?: typeof stop }).stopLayoutProbe = stop
  })
  return async () => {
    const samples = await page.evaluate(() => (window as Window & { stopLayoutProbe?: () => number[][] }).stopLayoutProbe!())
    expect(samples.length).toBeGreaterThan(2)
    for (const sample of samples) {
      expect(Math.max(...sample.map((value, index) => Math.abs(value - samples[0]![index]!))),
        JSON.stringify({ start: samples[0], sample })).toBeLessThan(1)
    }
  }
}

async function enableClassicScrollbar(page: Page, required: boolean) {
  if (!required) return
  await page.addStyleTag({ content: 'html::-webkit-scrollbar { width: 18px; height: 18px; }' })
  await expect.poll(() => page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBe(18)
}

async function clickAtCenter(page: Page, control: Locator) {
  const target = (await control.boundingBox())!
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
}

test('dashboard selects and site search keep the viewport in place during open and close', async ({ page }, info) => {
  await page.goto('/templates/dashboard-comparison/')
  const stage = page.locator('[data-template="dashboard-comparison"]')
  const scope = stage.getByRole('combobox', { name: '团队范围' })
  await expect(scope).toBeVisible()
  await stage.evaluate(node => Promise.allSettled(node.getAnimations().map(effect => effect.finished)))
  await enableClassicScrollbar(page, info.project.name === 'site-classic-scrollbar')
  const verify = await recordPageLayout(page)
  for (const name of ['团队范围', '时间范围']) {
    const select = stage.getByRole('combobox', { name })
    await clickAtCenter(page, select)
    await expect(page.getByRole('listbox')).toBeVisible()
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden')
    await page.keyboard.press('Escape')
    await expect(select).toBeFocused()
  }
  await verify()
  await page.evaluate(async () => {
    scrollTo({ top: 190, behavior: 'instant' })
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  const verifySearch = await recordPageLayout(page)
  const search = page.getByRole('button', { name: '搜索官网' })
  await clickAtCenter(page, search)
  await expect(page.locator('.search-dialog')).toHaveJSProperty('open', true)
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden')
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await verifySearch()
})

test('modal context menus retain the shared viewport width and return focus', async ({ page }, info) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '局部浮层主题' }).click()
  const trigger = preview.getByRole('button', { name: '右键菜单示例' })
  await trigger.scrollIntoViewIfNeeded()
  await trigger.focus()
  await enableClassicScrollbar(page, info.project.name === 'site-classic-scrollbar')
  const verify = await recordPageLayout(page)
  await trigger.press('Shift+F10')
  const menu = page.getByRole('menu', { name: '局部主题菜单' })
  await expect(menu).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden')
  await menu.press('Escape')
  await expect(trigger).toBeFocused()
  await verify()
})

test('the compact table detail sheet keeps the document in place through open and exit', async ({ page }, info) => {
  await page.setViewportSize({ width: 680, height: 610 })
  await page.goto('/templates/table-filter/')
  const record = page.getByRole('table', { name: '交付资料', exact: true }).getByRole('button', { name: '组件评审', exact: true })
  await expect(record).toHaveAttribute('aria-haspopup', 'dialog')
  await record.scrollIntoViewIfNeeded()
  await record.focus()
  await enableClassicScrollbar(page, info.project.name === 'site-classic-scrollbar')
  const verify = await recordPageLayout(page)
  await record.press('Enter')
  const sheet = page.getByRole('dialog', { name: '资料详情', exact: true })
  await expect(sheet.getByRole('heading', { name: '组件评审' })).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden')
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(record).toBeFocused()
  await verify()
})

test('component navigation keeps the left rail scroll and clicked link on the same row', async ({ page }, info) => {
  await page.setViewportSize({ width: 1240, height: 740 })
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', event => {
      const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition
      void transition?.ready.then(() => {
        const root = document.documentElement
        root.dataset.testSnapshotRoot = getComputedStyle(root, '::view-transition-group(root)').animationName
      }, () => {})
    })
    if (location.pathname !== '/docs/vue/components/cell-select/') return
    const frames: { scroll: number; top: number; row: number }[] = []
    function sampleRail() {
      const active = document.querySelector('.docs-nav [aria-current="page"]')
      const pane = active?.closest<HTMLElement>('.docs-nav')
      if (active && pane) frames.push({ scroll: pane.scrollTop, top: pane.getBoundingClientRect().top, row: active.getBoundingClientRect().top })
      if (frames.length < 8) requestAnimationFrame(sampleRail)
      else document.documentElement.dataset.testDocsRail = JSON.stringify(frames)
    }
    requestAnimationFrame(sampleRail)
  })
  await page.goto('/docs/vue/components/power-search/')
  const side = page.locator('.docs-nav')
  const link = side.getByRole('link', { name: 'Cell Select', exact: true })
  await link.evaluate(anchor => {
    const pane = anchor.closest<HTMLElement>('.docs-nav')!
    pane.scrollTop += anchor.getBoundingClientRect().top - pane.getBoundingClientRect().top - 90
  })
  const position = () => link.evaluate(anchor => {
    const pane = anchor.closest<HTMLElement>('.docs-nav')!
    const bounds = pane.getBoundingClientRect()
    return { scroll: pane.scrollTop, top: bounds.top, row: anchor.getBoundingClientRect().top }
  })
  const before = await position()
  expect(before.scroll).toBeGreaterThan(300)
  function expectSamePosition(current: typeof before) {
    expect(current.scroll).toBeCloseTo(before.scroll, 0)
    expect(current.top).toBeCloseTo(before.top, 0)
    expect(current.row).toBeCloseTo(before.row, 0)
  }
  for (const target of ['.docs-content h2', '.site-footer']) {
    await page.locator(target).first().evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }))
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
    expectSamePosition(await position())
  }
  await link.click()
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('main')).toHaveCSS('animation-name', 'none')
  expectSamePosition(await position())
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-test-docs-rail', /\[/)
  const frames = JSON.parse((await root.getAttribute('data-test-docs-rail'))!) as (typeof before)[]
  for (const frame of frames) expectSamePosition(frame)
  if (info.project.name === 'site-classic-scrollbar') {
    await expect(root).toHaveAttribute('data-test-snapshot-root', 'none')
  }
  await side.evaluate(pane => { pane.scrollTop += 80 })
  await page.goBack({ waitUntil: 'commit' })
  await expect(page).toHaveURL('/docs/vue/components/power-search/')
  await expect.poll(async () => (await position()).scroll).toBeCloseTo(before.scroll, 0)
  expectSamePosition(await position())
})

test('the left rail stays below the header near the footer in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 220 })
  await page.goto('/docs/vue/components/power-search/')
  const link = page.locator('.docs-nav').getByRole('link', { name: 'Cell Select', exact: true })
  const position = () => link.evaluate(anchor => {
    const pane = anchor.closest<HTMLElement>('.docs-nav')!
    return {
      top: pane.getBoundingClientRect().top,
      scroll: pane.scrollTop,
      row: anchor.getBoundingClientRect().top,
    }
  })
  await link.evaluate(anchor => {
    const pane = anchor.closest<HTMLElement>('.docs-nav')!
    const row = anchor.getBoundingClientRect()
    pane.scrollTop += row.top - pane.getBoundingClientRect().top - (pane.clientHeight - row.height) / 2
  })
  const start = await position()
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect.poll(async () => (await position()).top).toBeCloseTo(start.top, 0)
  expect((await position()).row).toBeCloseTo(start.row, 0)
  await clickAtCenter(page, link)
  await expect(link).toHaveAttribute('aria-current', 'page')
  const arrival = await position()
  expect(arrival.top).toBeCloseTo(start.top, 0)
  expect(arrival.scroll).toBeCloseTo(start.scroll, 0)
  expect(arrival.row).toBeCloseTo(start.row, 0)

  await page.setViewportSize({ width: 800, height: 190 })
  const docs = page.locator('.docs-nav details')
  const toggle = docs.locator('summary')
  await expect(toggle).toBeVisible()
  await expect(docs).not.toHaveAttribute('open', '')
  await toggle.press('Enter')
  await expect(docs).toHaveAttribute('open', '')
  await toggle.press('Escape')
  await expect(docs).not.toHaveAttribute('open', '')
  await expect(toggle).toBeFocused()
})

test('returning to a component keeps the rail where the reader left it', async ({ page }) => {
  const powerSearchPath = '/docs/vue/components/power-search/'
  await page.goto(powerSearchPath)
  const pane = page.locator('.docs-nav')
  const selected = pane.getByRole('link', { name: 'PowerSearch', exact: true })
  await pane.evaluate(node => { node.scrollTop = 0 })
  expect(await selected.evaluate(node => node.getBoundingClientRect().top -
    node.closest('.docs-nav')!.getBoundingClientRect().bottom)).toBeGreaterThan(0)
  await pane.getByRole('link', { name: '标准设计', exact: true }).click()
  await expect(page).toHaveURL('/docs/standard-design/')
  await page.goBack()
  await expect(page).toHaveURL(powerSearchPath)
  await expect(pane).toHaveJSProperty('scrollTop', 0)
  await page.reload()
  await expect(pane).toHaveJSProperty('scrollTop', 0)
  await expect(selected).toHaveAttribute('aria-current', 'page')
})

test('each visit to the same component retains its own rail position in browser history', async ({ page }) => {
  const powerSearchPath = '/docs/vue/components/power-search/'
  const cellSelectPath = '/docs/vue/components/cell-select/'
  await page.goto(powerSearchPath)
  const pane = page.locator('.docs-nav')
  const cellSelect = pane.getByRole('link', { name: 'Cell Select', exact: true })
  const powerSearch = pane.getByRole('link', { name: 'PowerSearch', exact: true })
  const setPosition = (top: number) => pane.evaluate((node, value) => {
    node.scrollTop = value
    return node.scrollTop
  }, top)
  const first = await setPosition(750)
  await clickAtCenter(page, cellSelect)
  await expect(page).toHaveURL(cellSelectPath)
  await powerSearch.press('Enter')
  await expect(page).toHaveURL(powerSearchPath)
  const second = await setPosition(995)
  expect(second - first).toBeGreaterThan(100)
  await clickAtCenter(page, cellSelect)
  await expect(page).toHaveURL(cellSelectPath)
  await page.goBack()
  await expect(pane).toHaveJSProperty('scrollTop', second)
  await page.goBack()
  await page.goBack()
  await expect(page).toHaveURL(powerSearchPath)
  await expect(pane).toHaveJSProperty('scrollTop', first)
  await page.goForward()
  await page.goForward()
  await expect(page).toHaveURL(powerSearchPath)
  await expect(pane).toHaveJSProperty('scrollTop', second)
})
