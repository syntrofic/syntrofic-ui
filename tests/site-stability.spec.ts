import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ baseURL: process.env.SYNTROFIC_SITE_TEST_URL ?? 'http://127.0.0.1:4188', viewport: { width: 1440, height: 820 } })

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

test('both homepages share alignment and expose localized search metadata', async ({ page }) => {
  for (const [path, language, locale] of [['/', 'zh-CN', 'zh_CN'], ['/en/', 'en', 'en_US']] as const) {
    await page.setViewportSize({ width: 1440, height: 820 })
    await page.goto(path)
    const origin = 'https://ui.syntrofic.com'
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + path)
    await expect(page.locator('link[hreflang="zh-CN"][rel="alternate"]')).toHaveAttribute('href', origin + '/')
    await expect(page.locator('link[hreflang="en"][rel="alternate"]')).toHaveAttribute('href', origin + '/en/')
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', locale)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /MIT/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', origin + '/previews/dashboard-comparison.webp')
    expect(JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)).toMatchObject({
      '@type': 'WebSite', name: 'Syntrofic UI', url: origin + '/',
    })
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.home-title')).toHaveCSS('background-color', 'rgb(248, 248, 248)')
    await expect(page.locator('.hero-demo')).toHaveCSS('background-color', 'rgb(248, 248, 248)')
    await expect(page.locator('.home-platforms .resource-link').first()).toHaveCSS('background-color', 'rgb(248, 248, 248)')
    await expect(page.locator('.home-setup .code-block')).toHaveCSS('background-color', 'rgb(248, 248, 248)')
    await expect(page.locator('.home-setup .code-toolbar')).toHaveCSS('background-color', 'rgb(245, 245, 245)')
    const columns = await page.locator('.home-title, .home-platforms, .hero-demo, .sample-grid').evaluateAll(elements =>
      elements.map(element => element.getBoundingClientRect().left))
    expect(Math.abs(columns[0]! - columns[2]!)).toBeLessThan(.5)
    expect(Math.abs(columns[1]! - columns[3]!)).toBeLessThan(.5)
    const rightColumns = await page.locator('.home-platforms > :nth-child(2), .sample-grid > :nth-child(2)').evaluateAll(elements =>
      elements.map(element => element.getBoundingClientRect().left))
    expect(Math.abs(rightColumns[0]! - rightColumns[1]!)).toBeLessThan(.5)
    const previews = await page.locator('.template-preview__picture').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height))
    expect(previews).toHaveLength(3)
    for (const height of previews) expect(Math.abs(height - previews[0]!)).toBeLessThan(.5)

    await page.setViewportSize({ width: 360, height: 820 })
    await page.reload()
    const narrow = await page.locator('.home-title, .home-platforms, .hero-demo, .sample-grid').evaluateAll(elements =>
      elements.map(element => ({ left: element.getBoundingClientRect().left, top: element.getBoundingClientRect().top })))
    for (const [index, item] of narrow.entries()) {
      expect(item.left).toBeCloseTo(narrow[0]!.left)
      if (index > 0) expect(item.top).toBeGreaterThan(narrow[index - 1]!.top)
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  }
})

test('the site follows system appearance before hydration and honors manual choices', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const blockRuntime = /\/(?:assets\/index-[^/]+\.js|runtime\.ts)(?:\?.*)?$/
  await page.route(blockRuntime, route => route.abort())
  await page.goto('/')
  const root = page.locator('html')
  const image = page.locator('.template-preview img').first()
  await expect(root).toHaveAttribute('data-site-theme-preference', 'system')
  await expect(root).toHaveCSS('background-color', 'rgb(29, 30, 31)')
  await expect(image).toHaveCSS('filter', 'brightness(0.72)')
  await expect(page.locator('header .brand img')).toHaveCSS('filter', 'none')

  await page.unroute(blockRuntime)
  await page.reload()
  const menu = page.getByRole('button', { name: '切换明暗主题' })
  await menu.press('Enter')
  await expect(page.getByRole('radio', { name: '跟随系统' })).toBeChecked()
  await page.getByRole('radio', { name: '浅色', exact: true }).check()
  await expect(root).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(image).toHaveCSS('filter', 'none')
  await page.reload()
  await expect(root).toHaveAttribute('data-site-theme-preference', 'light')
  await menu.press('Enter')
  await expect(page.getByRole('radio', { name: '浅色', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: '跟随系统' }).check()
  await expect(root).toHaveAttribute('data-sy-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(root).toHaveAttribute('data-sy-theme', 'light')
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
})

test('functional example surfaces sit directly on the site canvas', async ({ page }) => {
  for (const [path, panel] of [
    ['/docs/vue/components/button/', '.demo-body[data-preview-surface]'],
    ['/docs/standard-design/', '.design-motion-demo .demo-body'],
    ['/templates/dashboard-comparison/', '.sy-dashboard-template__metrics .sy-kpi'],
    ['/templates/table-page/', '.table-template__filter'],
    ['/templates/checkout-wizard/', '.sy-form-wizard__form'],
    ['/templates/documentation-design/', '.reference-template__sample'],
    ['/templates/documentation-technical/', '.reference-template__article .sy-code-block'],
    ['/themes/', '.theme-settings'],
    ['/agent/', '.agent-preview > .sy-chart-host'],
  ]) {
    await page.goto(path)
    await expect(page.locator(panel).first()).toHaveCSS('background-color', 'rgb(248, 248, 248)')
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  }
})

test('documentation tables have thin grids and fit narrow pages', async ({ page }) => {
  const expectGrid = async (table: Locator) => {
    await expect(table).toBeVisible()
    await expect(table).toHaveCSS('border-collapse', 'collapse')
    for (const element of [table, table.getByRole('columnheader').first(), table.getByRole('cell').first()]) {
      await expect(element).toHaveCSS('border-width', '1px')
      await expect(element).toHaveCSS('border-style', 'solid')
      await expect(element).toHaveCSS('border-color', 'rgb(227, 227, 227)')
    }
    expect(await table.evaluate(node => {
      const { left, right } = node.getBoundingClientRect()
      return left >= 0 && right <= document.documentElement.clientWidth
    })).toBe(true)
    await expect.poll(() => page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.documentElement
      return scrollWidth - clientWidth
    })).toBe(0)
  }

  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 820 })
    for (const path of ['/docs/design-rules/', '/en/docs/design-rules/']) {
      await page.goto(path)
      await expectGrid(page.locator('.doc-prose').getByRole('table'))
    }
  }

  await page.goto('/docs/standard-design/')
  const coverage = page.locator('.design-coverage').first()
  await coverage.locator('summary').click()
  await expectGrid(coverage.getByRole('table'))
})

test('the dashboard template mounts directly on the canvas without an entering frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let release = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/OperationsTemplateDemo-*.js', async route => {
    await pending
    await route.continue()
  })
  try {
    await page.goto('/templates/dashboard-comparison/', { waitUntil: 'commit' })
    const stage = page.locator('[data-template="dashboard-comparison"]')
    await expect(stage).toHaveAttribute('data-island-state', 'loading')
    await expect(stage).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await stage.evaluate(node => {
      const observer = new MutationObserver(() => {
        if (node.getAttribute('data-island-state') !== 'ready') return
        const dashboard = node.querySelector('.sy-dashboard-template')!
        const effects = [node.closest('main')!, node, dashboard].flatMap(element => element.getAnimations())
        node.setAttribute('data-test-frame-animations', String(effects.length))
        observer.disconnect()
      })
      observer.observe(node, { attributes: true, attributeFilter: ['data-island-state'] })
    })
    release()
    await expect(stage.getByRole('region', { name: '团队交付对比', exact: true })).toBeVisible()
    await expect(stage).toHaveAttribute('data-test-frame-animations', '0')
    await expect(stage.locator('[data-island-placeholder], [data-site-departure]')).toHaveCount(0)
  } finally { release() }
})

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

test('documentation rail keeps equal insets with or without a scrollbar', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 740 })
  const rail = page.locator('.docs-rail')
  const pane = rail.locator('.docs-nav')
  const insets = () => pane.getByRole('link', { name: '文档总览', exact: true }).evaluate(link => {
    const shell = link.closest('.docs-rail')!.getBoundingClientRect()
    const row = link.getBoundingClientRect()
    return { start: row.left - shell.left, end: shell.right - row.right }
  })

  await page.goto('/docs/releases/')
  const short = await insets()
  expect(await pane.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
  expect(short.start).toBeCloseTo(short.end, 0)
  await expect(rail).toHaveCSS('background-color', 'rgb(248, 248, 248)')
  await expect(pane).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(pane).toHaveCSS('scrollbar-color', /(?:transparent|rgba\(0, 0, 0, 0\))$/)

  await page.goto('/docs/vue/components/checkbox/')
  const long = await insets()
  expect(await pane.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  expect(long.start).toBeCloseTo(long.end, 0)
  expect(long.start).toBeCloseTo(short.start, 0)
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
