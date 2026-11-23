import { expect, test, type Locator } from '@playwright/test'

test.use({ baseURL: process.env.SYNTROFIC_SITE_TEST_URL ?? 'http://127.0.0.1:4188' })

test('site search displays an animated loading state and focuses its results after the index arrives', async ({ page }) => {
  let release = () => {}
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route('**/search-index.json', async route => {
    await loading
    await route.continue()
  })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '搜索官网' })
  try {
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '搜索资源' })
    const results = dialog.locator('[data-search-results]')
    await expect(results).toHaveAttribute('aria-busy', 'true')
    const message = results.getByText('正在加载搜索索引…')
    await expect(message).toBeVisible()
    expect(await message.evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('site-load')
    const search = dialog.getByRole('searchbox')
    await search.fill('标准设计')
    await results.evaluate(node => {
      const dialog = node.closest('dialog')!
      const observer = new MutationObserver(() => {
        const link = node.querySelector('a[href]')
        if (!link) return
        const resize = dialog.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.height))
        const reveal = link.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.opacity))
        dialog.dataset.testSearchResize = resize?.effect?.getTiming().easing ?? 'none'
        dialog.dataset.testSearchAligned = String(Boolean(resize && reveal && resize.startTime === reveal.startTime))
        observer.disconnect()
      })
      observer.observe(node, { childList: true })
    })
    release()
    const first = results.getByRole('link').first()
    await expect(first).toBeVisible()
    await expect(dialog).toHaveAttribute('data-test-search-resize', /cubic-bezier/)
    await expect(dialog).toHaveAttribute('data-test-search-aligned', 'true')
    await expect(results).not.toHaveAttribute('aria-busy', 'true')
    await search.press('ArrowDown')
    await expect(first).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  } finally { release() }
})

test('a fast search skips the visual loader while still returning the results', async ({ page }) => {
  await page.addInitScript(() => {
    const fetchPage = window.fetch.bind(window)
    window.fetch = (input, init) => input === '/search-index.json'
      ? Promise.resolve(new Response(JSON.stringify([['快速开始', '/docs/quick-start/', '文档', '安装']])))
      : fetchPage(input, init)
  })
  await page.goto('/')
  const results = page.locator('[data-search-results]')
  await results.evaluate(node => {
    const observer = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(child => child instanceof HTMLElement && child.hasAttribute('data-search-loading')))) {
        node.setAttribute('data-test-flashed-loader', '')
      }
    })
    observer.observe(node, { childList: true })
  })
  await page.getByRole('button', { name: '搜索官网' }).click()
  await expect(results.getByRole('link', { name: /快速开始/ })).toBeVisible()
  await expect(results).not.toHaveAttribute('aria-busy', 'true')
  await expect(results).not.toHaveAttribute('data-test-flashed-loader')
})

test('search keeps its field visible when the results scroll on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 520 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const opener = page.getByRole('button', { name: '搜索官网' })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: '搜索资源' })
  const search = dialog.getByRole('searchbox')
  const rows = dialog.getByRole('link')
  await expect(rows).toHaveCount(12)
  await rows.last().focus()
  await expect(rows.last()).toBeInViewport()
  await expect(search).toBeInViewport()
  expect(await dialog.locator('.search-scroll').evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  await search.fill('没有结果 abcdefg')
  await expect(dialog.getByText('没有匹配的结果。')).toBeVisible()
  expect(await dialog.evaluate(node => node.getAnimations().length)).toBe(0)
  expect(await dialog.locator('.search-scroll').evaluate(node => node.scrollTop)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
})

test('search refinements keep the focused result or return focus to the field when it leaves', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '搜索官网' }).click()
  const dialog = page.getByRole('dialog', { name: '搜索资源' })
  const input = dialog.getByRole('searchbox')
  await input.fill('标准设计 动效')
  const links = dialog.getByRole('link')
  await expect(links).toHaveCount(2)
  const result = dialog.locator('a[data-title="标准设计"]')
  await result.focus()
  const narrow = async (query: string) => input.evaluate((node, value) => {
    (node as HTMLInputElement).value = value
    node.dispatchEvent(new Event('input', { bubbles: true }))
  }, query)
  await narrow('标准设计')
  await expect(links).toHaveCount(12)
  await expect(result).toBeFocused()
  await narrow('没有匹配的关键词 abcxyz')
  await expect(dialog.getByText('没有匹配的结果。')).toBeVisible()
  await expect(input).toBeFocused()
  await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('lightbox captions expand over the white media stage and restore keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/docs/vue/components/lightbox/')
  const trigger = page.getByRole('button', { name: '单张预览' })
  await trigger.press('Enter')
  const dialog = page.getByRole('dialog', { name: '单张图表' })
  const stage = dialog.locator('.sy-lightbox__stage')
  const more = dialog.getByRole('button', { name: '查看完整说明' })
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  await expect(stage).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const height = await stage.evaluate(node => node.clientHeight)
  const excerpt = dialog.locator('.sy-lightbox__caption-preview .sy-line-clamp')
  await expect(excerpt).toHaveCSS('-webkit-line-clamp', '2')
  expect(await excerpt.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  await more.press('Enter')
  const caption = dialog.getByRole('region', { name: '图片说明' })
  await expect(caption).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await expect(caption).toContainText('周日回升')
  await expect(caption).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await stage.evaluate(node => node.clientHeight)).toBe(height)
  await page.keyboard.press('Escape')
  await expect(caption).toHaveCount(0)
  await expect(more).toBeFocused()
  await expect(dialog).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await more.press('Enter')
  await expect(caption).toHaveCSS('transition-duration', '0s')
  await caption.getByRole('button', { name: '收起说明' }).press('Enter')
  await expect(more).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.getByRole('button', { name: '预览交付量趋势' }).press('Enter')
  const gallery = page.getByRole('dialog', { name: '项目照片图集' })
  const galleryMore = gallery.getByRole('button', { name: '查看完整说明' })
  await galleryMore.press('Enter')
  await expect(gallery.getByRole('region', { name: '图片说明' })).toBeFocused()
  const previous = gallery.getByRole('button', { name: '上一张项目照片' })
  await previous.press('Enter')
  await expect(gallery.getByRole('region', { name: '图片说明' })).toHaveCount(0)
  await expect(galleryMore).toHaveCount(0)
  await expect(previous).toBeFocused()
})

test('the homepage demo keeps its fallback during loading and reveals the ready controls', async ({ page }) => {
  let release = () => {}
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route(/\/(?:assets\/HeroDemo-[\w-]+\.js|HeroDemo\.vue)(?:\?.*)?$/, async route => {
    await loading
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'commit' })
  const demo = page.locator('[data-island="hero"]')
  try {
    await expect(demo).toHaveAttribute('aria-busy', 'true')
    await expect(demo.getByRole('progressbar', { name: '项目进度' })).toBeVisible()
    expect(await demo.evaluate(node => getComputedStyle(node, '::after').animationName)).toBe('site-load')
    release()
    await expect(demo).toHaveAttribute('data-island-state', 'ready')
    await expect(demo).not.toHaveAttribute('aria-busy', 'true')
  } finally { release() }
})

test('homepage template images keep a white skeleton until decoding and crossfade at a fixed size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this)
      if (!this.currentSrc.endsWith('/previews/table-page.webp')) return
      this.dataset.testDecoding = ''
      await new Promise<void>(resolve => document.addEventListener('test-preview-decoded', () => resolve(), { once: true }))
    }
  })
  let release = () => {}
  const delivery = new Promise<void>(resolve => { release = resolve })
  await page.route('**/previews/table-page.webp', async route => {
    await delivery
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const link = page.locator('a.template-preview[href="/templates/table-page/"]')
  const picture = link.locator('[data-site-preview]')
  const skeleton = picture.locator('.template-preview__placeholder')
  const image = picture.locator('img')
  try {
    await link.scrollIntoViewIfNeeded()
    await expect(picture).toHaveAttribute('data-preview-state', 'loading')
    await expect(image).toHaveCSS('opacity', '0')
    await expect(skeleton).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(skeleton).toHaveCSS('opacity', '1')
    await expect(skeleton.locator('span').first()).toHaveCSS('animation-play-state', 'running')
    const bounds = (await picture.boundingBox())!
    const copyHeight = (await link.locator('.template-preview__copy').boundingBox())!.height

    release()
    await expect(image).toHaveAttribute('data-test-decoding', '')
    await expect(picture).toHaveAttribute('data-preview-state', 'loading')
    await image.evaluate(node => node.addEventListener('transitionrun', event => {
      if (event.propertyName === 'opacity') node.setAttribute('data-test-preview-easing', getComputedStyle(node).transitionTimingFunction)
    }))
    await page.evaluate(() => document.dispatchEvent(new Event('test-preview-decoded')))
    await expect(picture).toHaveAttribute('data-preview-state', 'ready')
    await expect(image).toHaveAttribute('data-test-preview-easing', /cubic-bezier/)
    await expect(image).toHaveCSS('opacity', '1')
    await expect(skeleton).toHaveCSS('opacity', '0')
    const ready = (await picture.boundingBox())!
    expect(ready.width).toBeCloseTo(bounds.width)
    expect(ready.height).toBeCloseTo(bounds.height)
    expect((await link.locator('.template-preview__copy').boundingBox())!.height).toBeCloseTo(copyHeight)
  } finally { release() }
})

test('homepage thumbnails start white before site JavaScript and keep a decoded native image visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function () {
      if (this.currentSrc.endsWith('/previews/table-page.webp')) {
        this.dataset.testDecodeComplete = String(this.complete)
        await new Promise<void>(resolve => document.addEventListener('test-native-preview-decoded', () => resolve(), { once: true }))
      }
      await decode.call(this)
    }
  })
  let releaseRuntime = () => {}
  let releaseImage = () => {}
  const runtime = new Promise<void>(resolve => { releaseRuntime = resolve })
  const transfer = new Promise<void>(resolve => { releaseImage = resolve })
  await page.route(/\/(?:assets\/index-[\w-]+\.js|runtime\.ts)(?:\?.*)?$/, async route => {
    await runtime
    await route.continue()
  })
  await page.route('**/previews/table-page.webp', async route => {
    await transfer
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'commit' })
  const picture = page.locator('a.template-preview[href="/templates/table-page/"] [data-site-preview]')
  const image = picture.locator('img')
  const skeleton = picture.locator('.template-preview__placeholder')
  try {
    await picture.scrollIntoViewIfNeeded()
    await expect(picture).not.toHaveAttribute('data-preview-state')
    await expect(picture).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(skeleton).toHaveCSS('opacity', '1')
    await expect(skeleton.locator('span').first()).toHaveCSS('animation-play-state', 'paused')
    releaseImage()
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    releaseRuntime()
    await expect(image).toHaveAttribute('data-test-decode-complete', 'true')
    await expect(image).toHaveCSS('opacity', '1')
    await expect(picture).not.toHaveAttribute('data-preview-state', 'loading')
    await page.evaluate(() => document.dispatchEvent(new Event('test-native-preview-decoded')))
    await expect(picture).toHaveAttribute('data-preview-state', 'ready')
    await expect(skeleton).toHaveCSS('opacity', '0')
  } finally { releaseImage(); releaseRuntime() }
})

test('homepage charts keep the old data, quiet plot and focus through a failed refresh and retry', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' })
  let fail = () => {}
  let succeed = () => {}
  let requests = 0
  const first = new Promise<void>(resolve => { fail = resolve })
  const retried = new Promise<void>(resolve => { succeed = resolve })
  await page.route('**/demo-data/monthly-delivery.json', async route => {
    if (++requests === 1) {
      await first
      await route.fulfill({ status: 503, body: 'Unavailable' })
    } else {
      await retried
      await route.fulfill({ json: [13, 24, 28, 40, 56, 64, 82] })
    }
  })
  await page.goto('/')
  const hero = page.getByRole('region', { name: '交付工作台互动示例' })
  const chart = hero.locator('.sy-chart')
  const plot = chart.getByRole('slider', { name: '项目进度趋势' })
  const line = plot.locator('.sy-chart__line')
  try {
    await expect(hero.locator('.dashboard-pulse')).toContainText('76%')
    await expect(line).toHaveAttribute('d', /[LC]/)
    const initial = await line.getAttribute('d')
    const height = await plot.evaluate(node => node.clientHeight)
    await hero.getByRole('button', { name: '本月' }).press('Enter')
    await expect(chart).toHaveAttribute('data-chart-state', 'loading')
    await expect(plot).toHaveAttribute('aria-busy', 'true')
    await expect(plot).toHaveAttribute('aria-disabled', 'true')
    await expect(chart.getByRole('status', { name: '正在更新进度' })).toBeVisible()
    await expect(line).toHaveAttribute('d', initial!)
    await expect(hero.locator('.dashboard-pulse')).toContainText('76%')
    fail()
    await expect(chart.getByRole('alert')).toHaveText('暂时无法更新进度。')
    await expect(chart).toHaveAttribute('data-chart-state', 'error')
    await expect(plot).not.toHaveAttribute('aria-busy', 'true')
    await chart.getByRole('button', { name: '重试' }).press('Enter')
    await expect(chart).toHaveAttribute('data-chart-state', 'loading')
    await expect(plot).toBeFocused()
    await expect(plot.locator('svg')).toHaveCSS('opacity', '0.38')
    await plot.evaluate(node => node.addEventListener('transitionrun', event => {
      if (event.propertyName === 'opacity' && event.target instanceof SVGElement && event.target.matches('svg')) {
        node.setAttribute('data-test-chart-easing', getComputedStyle(event.target).transitionTimingFunction)
      }
    }))
    succeed()
    await expect(chart).toHaveAttribute('data-chart-state', 'ready')
    await expect(plot).toHaveAttribute('data-test-chart-easing', /cubic-bezier/)
    await expect(line).not.toHaveAttribute('d', initial!)
    await expect(hero.locator('.dashboard-pulse')).toContainText('82%')
    await expect(plot).toBeFocused()
    await plot.press('End')
    await expect(plot).toHaveAttribute('aria-valuetext', /30 日.*82/)
    expect(await plot.evaluate(node => node.clientHeight)).toBe(height)
    await expect(plot).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(requests).toBe(2)
  } finally { fail(); succeed() }
})

test('switching homepage chart ranges ignores a late response for the old selection', async ({ page }) => {
  let release = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/demo-data/monthly-delivery.json', async route => {
    await pending
    // The browser may already have canceled this request.
    await route.fulfill({ json: [13, 24, 28, 40, 56, 64, 82] }).catch(() => {})
  })
  await page.goto('/')
  const hero = page.getByRole('region', { name: '交付工作台互动示例' })
  const chart = hero.locator('.sy-chart')
  try {
    await hero.getByRole('button', { name: '本月' }).press('Enter')
    await expect(chart).toHaveAttribute('data-chart-state', 'loading')
    const canceled = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/monthly-delivery.json') })
    await hero.getByRole('button', { name: '本周' }).press('Enter')
    await canceled
    release()
    await expect(chart).toHaveAttribute('data-chart-state', 'ready')
    await expect(hero.locator('.dashboard-pulse')).toContainText('76%')
    await expect(chart.getByRole('alert')).toHaveCount(0)
  } finally { release() }
})

test('the pie-chart preview eases in data controls while keeping its white plot fixed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/docs/vue/components/pie-chart/')
  const stage = page.getByRole('group', { name: '下一批数据预览' })
  const chart = stage.locator('.sy-chart')
  const plot = chart.locator('.sy-chart__plot')
  const empty = stage.getByRole('button', { name: '空数据' })
  const loading = stage.getByRole('button', { name: '载入中' })
  const ready = stage.getByRole('button', { name: '已就绪' })
  await expect(chart).toHaveAttribute('data-chart-state', 'empty')
  await loading.press('Enter')
  await expect(chart.getByRole('status', { name: '正在载入下一批数据' })).toBeVisible()
  const skeleton = chart.locator('.sy-chart__skeleton')
  await expect(skeleton).toHaveAttribute('data-shape', 'circle')
  await expect(skeleton.locator('.sy-skeleton')).toBeVisible()
  const height = await plot.evaluate(node => node.clientHeight)
  await chart.evaluate(node => {
    const animate = node.animate.bind(node)
    node.animate = (frames, options) => {
      const effect = animate(frames, options)
      if ((effect.effect as KeyframeEffect).getKeyframes().some(frame => frame.blockSize)) {
        node.setAttribute('data-test-chart-resize', effect.effect!.getTiming().easing)
      }
      return effect
    }
  })
  await ready.press('Enter')
  await expect(chart).toHaveAttribute('data-chart-state', 'ready')
  await expect(chart).toHaveAttribute('data-test-chart-resize', /cubic-bezier/)
  await expect(skeleton).toHaveCount(0)
  await expect(chart.getByRole('button', { name: '查看数据' })).toBeVisible()
  await expect(plot).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await plot.evaluate(node => node.clientHeight)).toBe(height)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await chart.evaluate(node => node.removeAttribute('data-test-chart-resize'))
  await empty.press('Enter')
  await expect(chart).toHaveAttribute('data-chart-state', 'empty')
  await loading.press('Enter')
  await expect(skeleton.locator('.sy-skeleton')).toBeVisible()
  await ready.press('Enter')
  await expect(chart).toHaveAttribute('data-chart-state', 'ready')
  expect(await chart.getAttribute('data-test-chart-resize')).toBeNull()
})

test('Vega keeps a white, painted chart while drawing a delayed replacement', async ({ page }) => {
  let release = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/\/vega-delivery-next(?:-[\w-]+)?\.json(?:\?.*)?$/, async route => {
    await pending
    await route.continue()
  })
  await page.goto('/docs/vue/components/vega-chart/')
  const chart = page.locator('.sy-vega-chart')
  const host = chart.locator('.sy-vega-chart__host')
  const painted = host.locator('[data-vega-layer="ready"]')
  try {
    await expect(painted.locator('svg.marks')).toBeVisible()
    await expect(painted.getByText('交付量', { exact: true })).toBeVisible()
    const height = await host.evaluate(node => node.clientHeight)
    await page.getByRole('button', { name: '查看下一批交付数据' }).press('Enter')
    await expect(chart).toHaveAttribute('aria-busy', 'true')
    await expect(painted.locator('svg.marks')).toBeVisible()
    await expect(painted).toHaveAttribute('inert', '')
    await expect(host.locator('[data-vega-layer="pending"]')).toHaveCSS('visibility', 'hidden')
    await expect(host).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect(await host.evaluate(node => node.clientHeight)).toBe(height)
    release()
    await expect(chart).toHaveAttribute('aria-busy', 'false')
    await expect(painted.getByText('下一批交付量')).toBeVisible()
    await expect(painted).not.toHaveAttribute('inert', '')
    await expect(host.locator('[data-vega-layer="leaving"]')).toHaveCount(0)
  } finally { release() }
})

test('the failed homepage thumbnail keeps its template link and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/previews/table-page.webp', route => route.abort())
  await page.goto('/')
  const link = page.locator('a.template-preview[href="/templates/table-page/"]')
  await link.scrollIntoViewIfNeeded()
  const picture = link.locator('[data-site-preview]')
  await expect(picture).toHaveAttribute('data-preview-state', 'failed')
  const failure = picture.locator('.template-preview__unavailable')
  await expect(failure).toHaveCSS('opacity', '1')
  await expect(failure).toHaveAttribute('aria-hidden', 'true')
  await expect(failure).toHaveCSS('transition-duration', '0s')
  await expect(failure).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await link.press('Enter')
  await expect(page).toHaveURL(/\/templates\/table-page\/$/)
})

test('3D camera eases through keyboard moves and pauses automatic rotation for hover, focus and reduced motion', async ({ page }) => {
  await page.goto('/docs/vue/components/spatial-chart/')
  await page.getByRole('button', { name: '使用 SVG 绘制' }).click()
  const plot = page.getByRole('img', { name: '三维样本' })
  const grid = plot.locator('svg > path').first()
  await expect(plot).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const initial = await grid.getAttribute('d')
  const sample = (key?: string) => plot.evaluate(async (element, key) => {
    if (key) element.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true }))
    const paths = new Set<string | null>()
    for (let frame = 0; frame < 12; frame++) {
      await new Promise(requestAnimationFrame)
      paths.add(element.querySelector('svg > path')?.getAttribute('d') ?? null)
    }
    return paths.size
  }, key)
  await plot.focus()
  expect(await sample('ArrowUp')).toBeGreaterThan(2)
  await expect(grid).not.toHaveAttribute('d', initial!)
  await plot.press('Home')
  await expect(grid).toHaveAttribute('d', initial!)
  await plot.press('+')
  await expect(grid).not.toHaveAttribute('d', initial!)
  await plot.press('Home')
  await expect(grid).toHaveAttribute('d', initial!)

  const toggle = page.getByRole('button', { name: '自动旋转' })
  await toggle.click()
  expect(await sample()).toBeGreaterThan(2)
  await plot.hover()
  expect(await sample()).toBe(1)
  await plot.focus()
  await toggle.hover()
  expect(await sample()).toBe(1)
  await toggle.focus()
  expect(await sample()).toBeGreaterThan(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await sample()).toBe(1)
  await plot.press('Home')
  await expect(grid).toHaveAttribute('d', initial!)
})

test('3D samples load and retry on a fixed white stage with the previous scene in place', async ({ page }) => {
  await page.goto('/docs/vue/components/spatial-chart/')
  await page.getByRole('button', { name: '使用 SVG 绘制' }).click()
  const figure = page.locator('.sy-spatial-chart')
  const plot = page.getByRole('img', { name: '三维样本' })
  const marks = plot.locator('circle')
  await expect(marks).toHaveCount(49)
  const old = await marks.evaluateAll(nodes => nodes.map(node => node.getAttribute('cy')))
  const load = page.getByRole('button', { name: '加载下一批样本' })
  const dataRoute = /\/spatial-samples-next[^/]*\.json(?:\?.*)?$/
  let release = () => {}
  const delivery = new Promise<void>(resolve => { release = resolve })
  let attempts = 0
  await page.route(dataRoute, async route => {
    if (++attempts === 1) {
      await delivery
      await route.fulfill({ status: 503, body: 'Unavailable' })
    } else await route.continue()
  })
  const viewSize = (await plot.boundingBox())!.height
  const controlsTop = (await figure.getByRole('group').boundingBox())!.y
  await load.click()
  try {
    await expect(plot).toHaveAttribute('aria-busy', 'true')
    await expect(figure.getByRole('status', { name: '正在加载三维样本' })).toBeVisible()
    await expect(plot).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(plot.locator('.sy-spatial-chart__svg')).toHaveCSS('opacity', '0.32')
    expect(await marks.evaluateAll(nodes => nodes.map(node => node.getAttribute('cy')))).toEqual(old)
  } finally { release() }
  await expect(figure.getByRole('alert')).toHaveText('三维样本加载失败。')
  await figure.getByRole('button', { name: '重试加载三维样本' }).press('Enter')
  await expect(plot).toBeFocused()
  await expect(figure).toHaveAttribute('data-spatial-state', 'ready')
  await expect.poll(() => marks.evaluateAll(nodes => nodes.map(node => node.getAttribute('cy')))).not.toEqual(old)
  expect((await plot.boundingBox())!.height).toBe(viewSize)
  expect((await figure.getByRole('group').boundingBox())!.y).toBe(controlsTop)

  await page.getByRole('button', { name: '清空样本' }).click()
  await expect(figure.getByRole('status').filter({ hasText: '暂无三维样本' })).toBeVisible()
  let fill = () => {}
  const firstLoad = new Promise<void>(resolve => { fill = resolve })
  await page.unroute(dataRoute)
  await page.route(dataRoute, async route => { await firstLoad; await route.continue() })
  try {
    await load.click()
    await expect(figure.locator('.sy-skeleton')).toBeVisible()
    await expect(plot).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect((await plot.boundingBox())!.height).toBe(viewSize)
  } finally { fill() }
  await expect(marks).toHaveCount(49)
  await expect(figure.locator('.sy-skeleton')).toHaveCount(0)
})

test('build logs keep the visible row anchored when the live buffer rolls over and ease back to the latest entry', async ({ page }) => {
  await page.setViewportSize({ width: 1160, height: 880 })
  await page.goto('/docs/vue/components/log-stream/')
  const log = page.getByRole('log', { name: '构建日志' })
  const entries = log.locator('[data-log-entry]')
  const distance = () => log.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)
  await expect(log).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(log).toHaveAttribute('aria-live', 'polite')
  await expect.poll(distance).toBeLessThan(2)
  await log.press('Home')
  await expect(log).toHaveAttribute('aria-live', 'off')
  await expect.poll(() => log.evaluate(node => node.scrollTop)).toBeLessThan(1)
  await log.evaluate(node => { node.scrollTop = 100 })
  const anchor = log.locator('[data-log-entry="types"]')
  const readingPosition = () => anchor.evaluate(node => node.getBoundingClientRect().top - node.closest('[role="log"]')!.getBoundingClientRect().top)
  const before = await readingPosition()
  await page.getByRole('button', { name: '追加日志' }).click()
  await expect(entries).toHaveCount(14)
  await expect(entries.first()).toHaveAttribute('data-log-entry', 'tokens')
  expect(await readingPosition()).toBeCloseTo(before, 0)
  expect(await distance()).toBeGreaterThan(25)
  await expect(entries.last()).toContainText('组件检查通过 #1')

  const positions = await log.evaluate(async node => {
    const control = node.closest('.sy-log-stream')!.querySelector<HTMLButtonElement>('button[aria-controls="' + node.id + '"]')!
    const frames = [node.scrollTop]
    control.click()
    for (let frame = 0; frame < 16; frame++) {
      await new Promise(requestAnimationFrame)
      frames.push(node.scrollTop)
    }
    return frames
  })
  expect(new Set(positions).size).toBeGreaterThan(3)
  expect(positions.at(-1)).toBeGreaterThan(positions[0])
  await expect.poll(distance).toBeLessThan(2)
  await expect(log).toHaveAttribute('aria-live', 'polite')

  const details = log.getByRole('button', { name: /3 个组件等待视觉评审/ })
  await details.press('Enter')
  await expect(details).toHaveAttribute('aria-expanded', 'true')
  await expect(log).toHaveAttribute('aria-live', 'off')
  await expect(log.getByText('日期范围选择器', { exact: false })).toBeVisible()
  await details.press('Space')
  await expect(details).toBeFocused()
  await expect(log.getByText('日期范围选择器', { exact: false })).toBeHidden()

  const timestamp = log.locator('.sy-log-stream__time').first()
  await expect(timestamp).toHaveText('09:41:02')
  await page.getByRole('button', { name: '隐藏时间' }).click()
  await expect(timestamp).toHaveAttribute('aria-hidden', 'true')
  await expect(timestamp).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: '终端视图' }).click()
  await expect(log).toHaveCSS('background-color', 'rgb(23, 23, 25)')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.getByRole('button', { name: '终端视图' }).click()
  await expect(log).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('build logs retain visible records during refresh and show a white skeleton on an initial load', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/docs/vue/components/log-stream/')
  const widget = page.locator('.sy-log-stream')
  const log = widget.getByRole('log', { name: '构建日志' })
  const load = page.getByRole('button', { name: '加载构建记录' })
  const previous = log.getByText('构建步骤已完成')
  await expect(previous).toBeVisible()
  const before = (await log.boundingBox())!.height
  const path = /\/build-log-archive[^/]*\.json(?:\?.*)?$/
  let fail = () => {}
  const response = new Promise<void>(resolve => { fail = resolve })
  let attempts = 0
  await page.route(path, async route => {
    if (++attempts === 1) {
      await response
      await route.fulfill({ status: 503, body: 'Unavailable' })
    } else await route.continue()
  })
  try {
    await load.click()
    await expect(log).toHaveAttribute('aria-busy', 'true')
    await expect(widget.getByRole('status', { name: '正在加载构建日志' })).toBeVisible()
    await expect(previous).toBeVisible()
    await expect(log).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect((await log.boundingBox())!.height).toBe(before)
  } finally { fail() }
  await expect(widget.getByRole('alert')).toHaveText('构建日志加载失败。')
  await expect(previous).toBeVisible()
  await widget.getByRole('button', { name: '重试加载构建日志' }).press('Enter')
  await expect(log).toBeFocused()
  await expect(log.getByText('归档构建已完成')).toBeVisible()
  await expect(previous).toHaveCount(0)

  await page.getByRole('button', { name: '清空日志' }).click()
  await expect(widget.getByRole('status').filter({ hasText: '暂无构建日志' })).toBeVisible()
  const emptyHeight = (await log.boundingBox())!.height
  let fill = () => {}
  const initial = new Promise<void>(resolve => { fill = resolve })
  await page.unroute(path)
  await page.route(path, async route => { await initial; await route.continue() })
  try {
    await load.click()
    await expect(widget.locator('.sy-log-stream__skeleton .sy-skeleton')).toHaveCount(3)
    await expect(log).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect((await log.boundingBox())!.height).toBe(emptyHeight)
  } finally { fill() }
  await expect(log.getByText('归档构建已完成')).toBeVisible()
  await expect(widget.locator('.sy-log-stream__skeleton')).toHaveCount(0)
})

test('transfer lists recover a failed member directory without moving the white panels', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  let release = () => {}
  const first = new Promise<void>(resolve => { release = resolve })
  let attempts = 0
  await page.route(/\/transfer-directory[^/]*\.json$/, async route => {
    if (++attempts === 1) { await first; await route.fulfill({ status: 503, body: 'Unavailable' }) }
    else await route.continue()
  })
  await page.goto('/docs/vue/components/transfer-list/')
  const editor = page.getByRole('group', { name: '项目成员编组' })
  const pane = editor.getByRole('region', { name: '团队成员' })
  const panelLayout = () => pane.evaluate(node => {
    const bounds = node.getBoundingClientRect()
    return { top: bounds.top - node.closest('.sy-transfer-list')!.getBoundingClientRect().top, height: bounds.height }
  })
  try {
    await expect(editor.getByRole('status', { name: '正在读取成员目录' })).toBeVisible()
    await expect(editor.locator('.sy-transfer-list__skeleton .sy-skeleton')).toHaveCount(6)
    await expect(pane).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    const before = await panelLayout()
    release()
    await expect(editor.getByRole('alert')).toHaveText('成员目录加载失败。')
    await editor.getByRole('button', { name: '重试加载成员' }).press('Enter')
    await expect(editor).toBeFocused()
    await expect(pane.getByRole('checkbox', { name: '林舟' })).toBeVisible()
    const after = await panelLayout()
    expect(after.top).toBeCloseTo(before.top, 1)
    expect(after.height).toBeCloseTo(before.height, 1)
    await expect(editor.locator('.sy-transfer-list__skeleton')).toHaveCount(0)
  } finally { release() }
})

test('transfer rows animate across the two panes and reorder by keyboard and pointer around a pinned member', async ({ page }) => {
  await page.setViewportSize({ width: 1220, height: 940 })
  await page.goto('/docs/vue/components/transfer-list/')
  const editor = page.getByRole('group', { name: '项目成员编组' })
  const available = editor.getByRole('region', { name: '团队成员' })
  const selected = editor.getByRole('region', { name: '项目成员' })
  const order = () => page.evaluate(() => [...document.querySelectorAll('.transfer-review > .sy-transfer-list ul[data-transfer-side="selected"] [data-transfer-id]')]
    .map(node => node.getAttribute('data-transfer-id')))
  await available.getByRole('checkbox', { name: '林舟' }).check()
  const motion = await available.getByRole('button', { name: '加入选中成员' }).evaluate(async (button: HTMLButtonElement) => {
    const list = button.closest('.sy-transfer-list')!
    button.click()
    for (let frame = 0; frame < 8; frame++) {
      await new Promise(requestAnimationFrame)
      const copy = list.querySelector('[data-layout-swap-copy]')
      const effect = copy?.getAnimations().find(animation => (animation.effect as KeyframeEffect).getKeyframes().some(keyframe => keyframe.translate))?.effect
      if (effect) return { easing: effect.getTiming().easing, hidden: copy?.getAttribute('aria-hidden') }
    }
    return null
  })
  await expect.poll(order).toEqual(['zhou', 'xu', 'lin'])
  expect(motion).toMatchObject({ easing: expect.stringMatching(/cubic-bezier/), hidden: 'true' })
  await page.waitForFunction(() => !document.querySelector('.transfer-review [data-layout-swap-copy]'))
  await expect(selected.getByRole('checkbox', { name: '周昱' })).toBeDisabled()
  await expect(selected.getByRole('button', { name: '调整顺序 周昱' })).toHaveCount(0)
  const handle = selected.getByRole('button', { name: '调整顺序 林舟' })
  await handle.press('Alt+ArrowUp')
  await expect.poll(order).toEqual(['zhou', 'lin', 'xu'])
  await expect(handle).toBeFocused()
  await selected.evaluate(async element => { await Promise.allSettled(element.getAnimations({ subtree: true }).map(animation => animation.finished)) })
  const start = (await handle.boundingBox())!
  const target = (await selected.locator('[data-transfer-id="xu"]').boundingBox())!
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2, target.y + target.height * .8, { steps: 8 })
  await page.mouse.up()
  await expect.poll(order).toEqual(['zhou', 'xu', 'lin'])
  await selected.getByRole('button', { name: '清除可移出成员' }).click()
  await expect.poll(order).toEqual(['zhou'])
})

test('transfer selectors support immediate edits and retry a staged commit while keeping the draft', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 920 })
  await page.goto('/docs/vue/components/transfer-list/')
  const quick = page.getByRole('combobox', { name: '快捷添加成员' })
  await expect(quick).not.toHaveAttribute('aria-busy', 'true')
  await quick.press('ArrowDown')
  const quickPanel = page.getByRole('dialog', { name: '快捷添加成员' })
  await expect(quickPanel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await quickPanel.getByRole('button', { name: '加入 刘珂' }).press('Enter')
  await expect(quickPanel.getByRole('button', { name: '移出 刘珂' })).toBeVisible()
  await expect(quick).toContainText('已选 2 人')
  await quickPanel.getByRole('textbox', { name: '筛选成员' }).press('Escape')
  await expect(quick).toBeFocused()

  const trigger = page.getByRole('combobox', { name: '编辑项目成员' })
  const panel = page.getByRole('dialog', { name: '编辑项目成员' })
  const saved = page.getByRole('status', { name: '已保存编组' })
  await trigger.press('ArrowDown')
  const search = panel.getByRole('textbox', { name: '筛选成员' })
  await search.fill('动效')
  const selected = panel.getByRole('region', { name: '项目成员' })
  await expect(selected.getByRole('button', { name: '移出 许然' })).toBeVisible()
  await expect(selected.getByRole('button', { name: '调整顺序 许然' })).toHaveCount(0)
  await search.fill('')
  await panel.getByRole('button', { name: '加入 林舟' }).click()
  await expect(saved).toContainText('周昱、许然')
  await expect(saved).not.toContainText('林舟')
  await panel.getByRole('button', { name: '取消编辑' }).click()
  await expect(trigger).toBeFocused()
  await trigger.press('ArrowDown')
  await panel.getByRole('button', { name: '加入 林舟' }).click()

  let release = () => {}
  const response = new Promise<void>(resolve => { release = resolve })
  let writes = 0
  await page.route(/\/transfer-directory[^/]*\.json\?validate=selection$/, async route => {
    if (++writes === 1) { await response; await route.fulfill({ status: 503, body: 'Unavailable' }) }
    else await route.continue()
  })
  const apply = panel.getByRole('button', { name: '应用编组' })
  try {
    await apply.click()
    await expect(panel).toHaveAttribute('aria-busy', 'true')
    await expect(apply).toBeFocused()
  } finally { release() }
  await expect(panel.getByRole('alert')).toHaveText('编组保存失败，请重试。')
  await expect(saved).not.toContainText('林舟')
  await expect(selected.getByRole('button', { name: '移出 林舟' })).toBeVisible()
  await apply.press('Enter')
  await expect(panel).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(saved).toContainText('周昱、许然、林舟')
  expect(writes).toBe(2)
})

test('comment timelines preserve separate drafts and ease rows into activity order', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/docs/vue/components/comments/')
  const discussion = page.getByRole('region', { name: '评审讨论' })
  const note = discussion.getByRole('article', { name: '状态提示' })
  const keyboard = discussion.getByRole('article', { name: '键盘检查' })
  const firstDraft = note.getByRole('combobox', { name: '填写回复 · 状态提示' })
  const secondDraft = keyboard.getByRole('combobox', { name: '填写回复 · 键盘检查' })
  await expect(discussion).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(discussion.locator('.sy-comments__event')).toContainText('将版本移入评审')
  await expect(discussion.locator('.sy-comments__list > li')).toHaveCount(3)
  await note.getByRole('button', { name: '回复', exact: true }).click()
  await firstDraft.fill('状态提示的草稿')

  const locate = page.getByRole('button', { name: '查看键盘检查' })
  await locate.press('Enter')
  await expect(locate).toBeFocused()
  await expect(keyboard.getByText('请一并检查 Escape 和关闭按钮。')).toBeVisible()
  await expect(secondDraft).toBeHidden()
  await expect(firstDraft).toBeHidden()
  await keyboard.getByRole('button', { name: '回复', exact: true }).click()
  await secondDraft.fill('键盘检查的草稿')
  const reorder = page.getByRole('button', { name: '最近活动优先' })
  const moved = await reorder.evaluate(button => new Promise<boolean>(resolve => {
    if (button instanceof HTMLButtonElement) button.click()
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const rows = document.querySelectorAll('.sy-comments__list > li')
      resolve([...rows].some(row => row.getAnimations().some(animation => (animation as CSSTransition).transitionProperty === 'transform')
        && getComputedStyle(row).transitionTimingFunction.includes('cubic-bezier')))
    }))
  }))
  expect(moved).toBe(true)
  await expect(discussion.getByRole('article').first()).toHaveAttribute('aria-label', '键盘检查')
  await expect(secondDraft).toBeFocused()
  await expect(secondDraft).toHaveText('键盘检查的草稿')
  await keyboard.getByRole('button', { name: '收起回复' }).click()
  await expect(secondDraft).toBeHidden()
  await note.getByRole('button', { name: '回复', exact: true }).click()
  await expect(firstDraft).toHaveText('状态提示的草稿')
  await keyboard.getByRole('button', { name: '回复', exact: true }).click()
  await expect(secondDraft).toHaveText('键盘检查的草稿')
})

test('comment pagination keeps the white timeline readable and retries in place', async ({ page }) => {
  let attempts = 0
  let release = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/assets/earlier-discussions-*.json', async route => {
    if (++attempts === 1) { await pending; await route.abort(); return }
    await route.continue()
  })
  await page.goto('/docs/vue/components/comments/')
  const discussion = page.getByRole('region', { name: '评审讨论' })
  const viewport = discussion.locator('.sy-comments__viewport')
  const older = discussion.getByRole('button', { name: '加载更早的讨论' })
  await older.press('Enter')
  try {
    await expect(discussion.getByRole('button', { name: '正在加载更早的讨论' })).toBeFocused()
    await expect(discussion.getByRole('article', { name: '状态提示' })).toBeVisible()
    await expect(discussion.locator('.sy-comments__older')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  } finally { release() }
  await expect(discussion.getByRole('alert')).toHaveText('无法加载更早的讨论。')
  const retry = discussion.getByRole('button', { name: '重试加载讨论' })
  await expect(retry).toBeFocused()
  await retry.press('Enter')
  await expect(discussion.getByRole('article').first()).toHaveAttribute('aria-label', '发布说明')
  await expect(viewport).toBeFocused()
  await expect(discussion.getByRole('article', { name: '状态提示' })).toBeVisible()
  expect(attempts).toBe(2)
})

test('comment collaboration reveals unread rows without opening an editor and animates typing on a white thread', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/docs/vue/components/comment-thread/')
  await page.getByRole('button', { name: '协作状态' }).click()
  const thread = page.getByRole('article', { name: '交付段落讨论' })
  const reveal = page.getByRole('button', { name: '收到未读回复' })
  const markRead = page.getByRole('button', { name: '标为已读' })
  const reply = thread.getByRole('combobox', { name: '写下回复' })
  const response = thread.getByText('我会补上发布前的截图和核对记录。')
  await expect(thread).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(thread.locator('.sy-comment-thread__body').first()).toHaveAttribute('data-clamped', 'true')
  await expect(response).toBeHidden()
  await reveal.press('Enter')
  await expect(response).toBeVisible()
  await expect(thread).toHaveAttribute('data-unread-replies', 'true')
  await expect(thread).not.toHaveAttribute('data-selected', 'true')
  await expect(thread.getByText('新回复', { exact: true })).toBeVisible()
  await expect(reply).toHaveCount(0)
  await expect(markRead).toBeFocused()
  await expect(thread.getByText('已读 周昱', { exact: true })).toBeVisible()
  await expect(thread.getByText('新回复', { exact: true })).toBeHidden({ timeout: 7000 })
  await expect(response).toBeVisible()
  await markRead.press('Enter')
  await expect(response).toBeHidden()
  await expect(thread.getByRole('button', { name: '查看 2 条回复' })).toBeVisible()

  const orphan = page.getByRole('button', { name: '标记原文过期' })
  await orphan.click()
  await expect(thread.getByText('原文已修改', { exact: true })).toBeVisible()
  await expect(thread.locator('blockquote')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const controlled = page.getByRole('button', { name: '选中讨论' })
  await controlled.press('Enter')
  await expect(thread).toHaveAttribute('data-selected', 'true')
  await expect(controlled).toBeFocused()
  await expect(reply).toHaveCount(0)

  const typing = thread.locator('.sy-comment-thread__typing')
  const toggleTyping = page.getByRole('button', { name: '切换输入状态' })
  await toggleTyping.click()
  await expect(typing).toContainText('周昱正在输入…')
  await expect(typing).not.toContainText('林舟')
  await expect(typing.locator('i').first()).toHaveCSS('animation-name', 'sy-comment-typing')
  await toggleTyping.click()
  await expect(typing).toContainText('周昱、许然正在输入…')
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await expect(typing.locator('i').first()).toHaveCSS('animation-name', 'none')
  await expect(thread.getByRole('link', { name: '查看接入' })).toBeVisible()
  await page.getByRole('button', { name: '完成助手检查' }).click()
  await expect(thread.getByText('模板检查完成，时间和时区已核对。')).toBeVisible()
  await expect(thread.getByRole('link', { name: '查看接入' })).toHaveCount(0)

  await thread.getByRole('button', { name: '回复', exact: true }).click()
  await expect(reply).toBeFocused()
  await reply.fill('我会确认发布记录。')
  await thread.getByRole('button', { name: '回复', exact: true }).click()
  await expect(thread.getByRole('listitem').filter({ hasText: '我会确认发布记录。' })).toBeVisible()
  await expect(reply).toBeEmpty()
})

test('comment history preserves its white loading stage, then retries and restores keyboard focus', async ({ page }) => {
  let release = () => {}
  const first = new Promise<void>(resolve => { release = resolve })
  let requests = 0
  await page.route(/\/comment-history[^/]*\.json$/, async route => {
    if (++requests === 1) { await first; await route.fulfill({ status: 503, body: 'Unavailable' }) }
    else await route.continue()
  })
  await page.goto('/docs/vue/components/comment-thread/')
  const thread = page.getByRole('article', { name: '交付讨论', exact: true })
  const opener = thread.getByRole('button', { name: '版本历史' })
  const dialog = page.getByRole('dialog', { name: '版本历史' })
  const stage = dialog.locator('.sy-comment-history')
  await expect(thread.getByText('已读 周昱', { exact: true })).toHaveCount(0)
  try {
    await opener.press('Enter')
    await expect(dialog.getByRole('status', { name: '正在加载历史' })).toBeVisible()
    await expect(stage.locator('.sy-skeleton')).toHaveCount(3)
    await expect(dialog.locator('.sy-dialog__panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    const height = await stage.evaluate(node => node.offsetHeight)
    release()
    await expect(dialog.getByRole('alert')).toHaveText('版本历史加载失败。')
    await expect.poll(() => stage.evaluate(node => node.offsetHeight)).toBe(height)
    await dialog.getByRole('button', { name: '重试', exact: true }).press('Enter')
    await expect(stage).toBeFocused()
    await expect(dialog.getByText('交付意见的初始版本。')).toBeVisible()
    await expect(dialog.getByText('当前版本')).toBeVisible()
    await expect(dialog.locator('.sy-skeleton')).toHaveCount(0)
    await stage.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  } finally { release() }
})

test('closing comment history prevents an earlier response from replacing a reopened history', async ({ page }) => {
  let finish = () => {}
  const delay = new Promise<void>(resolve => { finish = resolve })
  let requests = 0
  let oldResponseSettled = false
  await page.route(/\/comment-history[^/]*\.json$/, async route => {
    if (++requests === 1) {
      await delay
      await route.fulfill({ json: [{ id: 'stale', text: '此版本来自已经关闭的请求。' }] }).catch(() => {})
      oldResponseSettled = true
    } else await route.continue()
  })
  await page.goto('/docs/vue/components/comment-thread/')
  const thread = page.getByRole('article', { name: '交付讨论', exact: true })
  const opener = thread.getByRole('button', { name: '版本历史' })
  const dialog = page.getByRole('dialog', { name: '版本历史' })
  try {
    await opener.click()
    await expect.poll(() => requests).toBe(1)
    await dialog.getByRole('button', { name: '关闭历史' }).press('Escape')
    await expect(dialog).toBeHidden()
    await opener.press('Enter')
    await expect(dialog.getByText('交付意见的初始版本。')).toBeVisible()
    finish()
    await expect.poll(() => oldResponseSettled).toBe(true)
    await expect(dialog.getByText('此版本来自已经关闭的请求。')).toHaveCount(0)
    expect(requests).toBe(2)
  } finally { finish() }
})

test('homepage control placeholders leave room for the loaded controls on neutral panels', async ({ page }) => {
  let release = () => {}
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route(/\/(?:assets\/SampleDemo-[\w-]+\.js|SampleDemo\.vue)(?:\?.*)?$/, async route => {
    await loading
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const sample = page.locator('.sample-stage[data-component="W.input"]')
  const cards = page.locator('.sample-grid > .sample-card')
  const skeleton = sample.locator('.sample-placeholder')
  const expectCardSurfaces = async () => {
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.sample-grid')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(cards).toHaveCount(6)
    for (const card of await cards.all()) {
      await expect(card).toHaveCSS('background-color', 'rgb(248, 248, 248)')
      await expect(card).toHaveCSS('border-width', '0px')
    }
  }
  try {
    await sample.scrollIntoViewIfNeeded()
    await expect(sample).toHaveAttribute('aria-busy', 'true')
    await expectCardSurfaces()
    await expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    await expect(skeleton.locator('span').first()).toHaveCSS('animation-play-state', 'running')
    const height = (await sample.boundingBox())!.height
    release()
    await expect(sample.getByRole('textbox', { name: '项目名称' })).toBeVisible()
    await expect(skeleton).toHaveCount(0)
    await expect(sample).not.toHaveAttribute('aria-busy', 'true')
    await expectCardSurfaces()
    expect((await sample.boundingBox())!.height).toBeCloseTo(height)
    await page.setViewportSize({ width: 360, height: 820 })
    await expectCardSurfaces()
    expect(await cards.evaluateAll(elements => elements.every(element => {
      const { left, right } = element.getBoundingClientRect()
      return left >= 0 && right <= document.documentElement.clientWidth
    }))).toBe(true)
  } finally { release() }
})

test('table selection expands the action row with nonlinear motion and follows reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/templates/table/')
  await expect(page.locator('[data-island="table-template"]')).toHaveAttribute('data-island-state', 'ready')
  const selection = page.locator('.table-template__selection')
  const checkbox = page.getByRole('row', { name: /团队交付指南/ }).getByRole('checkbox')
  await expect(selection).toHaveCSS('grid-template-rows', '0px')
  const before = await selection.evaluate(node =>
    node.nextElementSibling!.getBoundingClientRect().y - node.getBoundingClientRect().y)
  await selection.evaluate(node => node.addEventListener('transitionrun', (event: Event) => {
    if (event.target !== node || (event as TransitionEvent).propertyName !== 'grid-template-rows') return
    const motion = node.getAnimations().find(effect =>
      'transitionProperty' in effect && effect.transitionProperty === 'grid-template-rows')
    if (!motion) return
    const y = () => node.nextElementSibling!.getBoundingClientRect().y - node.getBoundingClientRect().y
    motion.pause()
    motion.currentTime = Number(motion.effect!.getTiming().duration) / 5
    const during = y()
    motion.finish()
    node.setAttribute('data-test-table-motion', JSON.stringify({ during, after: y(),
      easing: getComputedStyle(node).transitionTimingFunction }))
  }))
  await checkbox.click()
  await expect(checkbox).toBeChecked()
  await expect(selection).toHaveAttribute('data-test-table-motion', /cubic-bezier/)
  const { during, after } = JSON.parse((await selection.getAttribute('data-test-table-motion'))!)
  expect(during).toBeGreaterThan(before)
  expect(during).toBeLessThan(after)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await checkbox.click()
  await expect(checkbox).not.toBeChecked()
  await expect(selection).toHaveCSS('grid-template-rows', '0px')
  expect(await selection.evaluate(node => node.getAnimations())).toHaveLength(0)
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('component previews wait for nested imports with motion preference ' + reducedMotion, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion })
    let release = () => {}
    const loading = new Promise<void>(resolve => { release = resolve })
    await page.route(/\/(?:assets\/StandardReview-[\w-]+\.js|StandardReview\.vue)(?:\?.*)?$/, async route => {
      await loading
      await route.continue()
    })
    await page.goto('/docs/vue/components/item/', { waitUntil: 'commit' })
    const demo = page.locator('[data-island="component"]')
    try {
      await expect(demo.locator('[data-island-host]')).toHaveAttribute('data-island-host', 'pending')
      await expect(demo.locator('[data-island-host]')).toHaveAttribute('data-sy-initializing', '')
      await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await demo.scrollIntoViewIfNeeded()
      await expect(demo).toHaveAttribute('aria-busy', 'true')
      await expect(demo.getByRole('status')).toHaveText('示例加载中…')
      const skeleton = demo.locator('.island-placeholder')
      await expect(skeleton).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(skeleton.locator('.island-skeleton span').first()).toHaveCSS('animation-name', reducedMotion === 'reduce' ? 'none' : 'site-skeleton-sweep')
      await demo.evaluate(node => {
        const ready = new MutationObserver(() => {
          if (node.getAttribute('data-island-state') !== 'ready') return
          const host = node.querySelector('[data-island-host="ready"]')!
          const frames = [node, ...host.children].flatMap(element => element.getAnimations())
          node.setAttribute('data-test-ready-effects', String(frames.length))
          node.setAttribute('data-test-departing-frame', String(Boolean(node.querySelector('[data-site-departure]'))))
          ready.disconnect()
        })
        ready.observe(node, { attributes: true, attributeFilter: ['data-island-state'] })
      })
      release()
      await expect(demo).toHaveAttribute('data-test-ready-effects', '0')
      await expect(demo).toHaveAttribute('data-test-departing-frame', 'false')
      await expect(demo).not.toHaveAttribute('aria-busy', 'true')
      await expect(demo.getByText('示例加载中…')).toHaveCount(0)
      await expect(demo.getByText('双向滑动记录', { exact: true })).toBeVisible()
      await expect(demo.locator('[data-island-host]')).not.toHaveAttribute('data-sy-initializing')
    } finally { release() }
  })
}

test('a failed nested preview retries in place with the keyboard and retains focus through loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const example = /\/(?:assets\/StandardReview-[\w-]+\.js|StandardReview\.vue)(?:\?.*)?$/
  let release = () => {}
  const attempts = new Set<string>()
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route(example, async route => {
    const query = new URL(route.request().url()).searchParams
    if (query.has('vue')) return route.continue()
    const attempt = query.get('site-retry') ?? 'initial'
    attempts.add(attempt)
    if (attempt === 'initial') return route.abort()
    await loading
    await route.continue()
  })
  await page.goto('/docs/vue/components/item/', { waitUntil: 'commit' })
  const demo = page.locator('[data-island="component"]')
  try {
    await expect(demo).toHaveAttribute('data-island-state', 'error')
    await expect(demo).not.toHaveAttribute('aria-busy', 'true')
    await expect(demo.getByRole('status')).toHaveText('互动示例加载失败。')
    await demo.evaluate(node => node.setAttribute('data-test-original-demo', 'true'))
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    const action = demo.getByRole('button', { name: '重新加载示例' })
    const offset = (await action.boundingBox())!.x
    await action.press('Enter')
    await expect(demo).toHaveAttribute('aria-busy', 'true')
    const retry = demo.getByRole('button', { name: '正在重试…' })
    await expect(retry).toHaveAttribute('aria-disabled', 'true')
    await expect(retry).toBeFocused()
    expect((await retry.boundingBox())!.x).toBeCloseTo(offset)
    await expect(demo.getByRole('status')).toHaveText('正在重新加载互动示例…')
    await retry.press('Enter')
    release()
    await expect(demo).toHaveAttribute('data-island-state', 'ready')
    await expect(demo).toHaveAttribute('data-test-original-demo', 'true')
    await expect(demo).toBeFocused()
    await expect(demo.getByRole('switch', { name: '订阅更新' })).toBeVisible()
    await expect(demo).not.toHaveAttribute('aria-busy', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
    expect([...attempts]).toEqual(['initial', '1'])
  } finally { release() }
})

test('checkbox theme geometry eases on white and follows the motion preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/')
  const demo = page.getByRole('region', { name: '交付工作台互动示例' })
  await expect(demo).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const box = demo.locator('.sy-checkbox__box').first()
  await expect(box).toHaveCSS('width', '18px')
  const state = await box.evaluate(element => {
    const control = element as HTMLElement
    control.style.width = '22px'
    control.style.height = '24px'
    const style = getComputedStyle(control)
    return { width: style.width, easing: style.transitionTimingFunction,
      properties: control.getAnimations().flatMap(animation => 'transitionProperty' in animation ? [animation.transitionProperty] : []) }
  })
  expect(state.width).toBe('18px')
  expect(state.easing).toMatch(/cubic-bezier/)
  expect(state.properties).toEqual(expect.arrayContaining(['width', 'height']))
  await expect(box).toHaveCSS('height', '24px')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await box.evaluate(element => {
    const control = element as HTMLElement
    control.style.width = '19px'
    return { width: getComputedStyle(control).width, moving: control.getAnimations().some(animation =>
      'transitionProperty' in animation && animation.transitionProperty === 'width') }
  })
  expect(reduced).toEqual({ width: '19px', moving: false })
})

test('the homepage isolates repeated preview failures and offers a manual refresh', async ({ page }) => {
  const example = /\/(?:assets\/HeroDemo-[\w-]+\.js|HeroDemo\.vue)(?:\?.*)?$/
  const attempts = new Set<string>()
  await page.route(example, route => {
    const query = new URL(route.request().url()).searchParams
    if (query.has('vue')) return route.continue()
    const attempt = query.get('site-retry') ?? 'initial'
    attempts.add(attempt)
    return attempt === '2' ? route.continue() : route.abort()
  })
  await page.goto('/', { waitUntil: 'commit' })
  const demo = page.locator('[data-island="hero"]')
  const samples = page.locator('[data-island="sample"][data-island-state="ready"]')
  await expect(demo.getByRole('button', { name: '重新加载示例' })).toBeVisible()
  await expect(samples.first()).toBeVisible()
  await samples.first().evaluate(node => node.setAttribute('data-test-other-preview', 'true'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const retry = demo.getByRole('button', { name: '重新加载示例' })
  await retry.press('Enter')
  await expect(demo.getByRole('status')).toHaveText('互动示例仍未载入。')
  await expect(demo.getByRole('button', { name: '刷新网页' })).toBeVisible()
  await expect(retry).toBeFocused()
  await retry.press('Enter')
  await expect(demo).toHaveAttribute('data-island-state', 'ready')
  await expect(demo).toBeFocused()
  await expect(samples.first()).toHaveAttribute('data-test-other-preview', 'true')
  expect([...attempts]).toEqual(['initial', '1', '2'])
})

test('an unavailable preview bootstrap can be retried without navigating away', async ({ page }) => {
  let release = () => {}
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route(/\/(?:assets\/islands-[\w-]+\.js|islands\.ts)(?:\?.*)?$/, async route => {
    if (!new URL(route.request().url()).searchParams.has('site-retry')) return route.abort()
    await loading
    await route.continue()
  })
  await page.goto('/themes/', { waitUntil: 'commit' })
  const demo = page.locator('[data-island="theme"]')
  try {
    await expect(demo).toHaveAttribute('data-island-state', 'error')
    await demo.evaluate(node => node.setAttribute('data-test-original-demo', 'true'))
    await demo.getByRole('button', { name: '重新加载示例' }).press('Enter')
    await expect(demo).toHaveAttribute('data-island-state', 'loading')
    const search = page.getByRole('button', { name: '搜索官网' })
    await search.focus()
    release()
    await expect(demo).toHaveAttribute('data-island-state', 'ready')
    await expect(demo).toHaveAttribute('data-test-original-demo', 'true')
    await expect(demo.getByRole('region', { name: '主题预览' })).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(search).toBeFocused()
  } finally { release() }
})

test('retrying a failed preview stylesheet restores the styled example', async ({ page }) => {
  await page.route(/\/assets\/StandardReview-[\w-]+\.css(?:\?.*)?$/, route =>
    new URL(route.request().url()).searchParams.has('site-retry') ? route.continue() : route.abort())
  await page.goto('/docs/vue/components/item/', { waitUntil: 'commit' })
  const demo = page.locator('[data-island="component"]')
  await expect(demo).toHaveAttribute('data-island-state', 'error')
  await demo.getByRole('button', { name: '重新加载示例' }).press('Enter')
  await expect(demo).toHaveAttribute('data-island-state', 'ready')
  await expect(demo).toBeFocused()
  const style = page.locator('link[rel="stylesheet"][href*="/StandardReview-"][href*="site-retry="]')
  await expect(style).toHaveCount(1)
  expect(await style.evaluate(node => Boolean((node as HTMLLinkElement).sheet))).toBe(true)
})

function skipNativeViewTransition() {
  window.addEventListener('pagereveal', event => {
    ;(event as Event & { viewTransition?: { skipTransition(): void } }).viewTransition?.skipTransition()
  })
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`site navigation keeps both page bodies static with ${reducedMotion}`, async ({ page }) => {
    await page.addInitScript(skipNativeViewTransition)
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')
    const link = page.locator('.topnav a[href="/templates/"]')
    expect(await link.evaluate(node => {
      (node as HTMLAnchorElement).click()
      return document.querySelector('main#main')?.getAnimations().length
    })).toBe(0)
    await expect(page).toHaveURL('/templates/')
    const main = page.locator('main#main')
    await expect(main).toBeVisible()
    await expect(main).toHaveCSS('animation-name', 'none')
    await expect(main).toHaveCSS('opacity', '1')
    await expect(main).toHaveCSS('transform', 'none')
    await expect(main).toHaveCSS('translate', 'none')
  })
}

test('browser back and forward keep the page static and restore the original scroll position', async ({ page }) => {
  await page.addInitScript(skipNativeViewTransition)
  await page.goto('/docs/vue/components/')
  await page.evaluate(async () => {
    await document.fonts.ready
    window.scrollTo(0, 670)
  })
  const originalTop = await page.evaluate(() => scrollY)
  expect(originalTop).toBeGreaterThan(600)
  const link = (await page.locator('.topnav a[href="/templates/"]').boundingBox())!
  await page.mouse.click(link.x + link.width / 2, link.y + link.height / 2)
  await expect(page).toHaveURL('/templates/')
  await page.goBack({ waitUntil: 'commit' })
  await expect(page).toHaveURL('/docs/vue/components/')
  await expect(page.locator('.docs-content')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.docs-content')).toHaveCSS('transform', 'none')
  await expect.poll(() => page.evaluate(async top => { await document.fonts.ready; return Math.abs(scrollY - top) }, originalTop)).toBeLessThanOrEqual(2)
  await page.goForward({ waitUntil: 'commit' })
  await expect(page).toHaveURL('/templates/')
  await expect(page.locator('main#main')).toHaveCSS('animation-name', 'none')
})

test('navigation that changes only the query keeps both page bodies static', async ({ page }) => {
  await page.addInitScript(skipNativeViewTransition)
  await page.goto('/templates/')
  expect(await page.locator('main#main').evaluate(main => {
    const link = document.createElement('a')
    link.href = '?category=form'
    main.append(link)
    link.click()
    return main.getAnimations().some(effect => effect.playState === 'running')
  })).toBe(false)
  await expect(page).toHaveURL('/templates/?category=form')
  await expect(page.locator('main#main')).toHaveCSS('animation-name', 'none')
  await page.reload()
  await expect(page.locator('main#main')).toHaveCSS('animation-name', 'none')
})

test('cross-document navigation only snapshots the navigation marker', async ({ page, browserName }) => {
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', event => {
      const transition = (event as Event & { viewTransition?: { ready: Promise<void> } }).viewTransition
      if (!transition) return
      document.documentElement.dataset.testNativeArrival = ''
      void transition.ready.then(() => {
        const root = document.documentElement
        const group = (name: string) => getComputedStyle(root, '::view-transition-group(' + name + ')')
        root.dataset.testNativeRoot = group('root').animationName
        const marker = group('site-nav-current')
        if (marker.animationName !== 'none') root.dataset.testNativeMarker = marker.animationTimingFunction
      }, () => {})
    })
  })
  await page.goto('/docs/')
  await page.locator('.topnav a[href="/templates/"]').click()
  await expect(page).toHaveURL('/templates/')
  const main = page.locator('main#main')
  await expect(main).toHaveCSS('animation-name', 'none')
  await expect(main).toHaveCSS('transform', 'none')
  await expect(main).toHaveCSS('translate', 'none')
  if (browserName === 'chromium' || await page.locator('html[data-test-native-arrival]').count()) {
    await expect(page.locator('html')).toHaveAttribute('data-test-native-root', 'none')
    await expect(page.locator('html')).toHaveAttribute('data-test-native-marker', /cubic-bezier/)
  }
})

test('template filtering controls keep their space while the site script loads', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 })
  let release = () => {}
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route('**/assets/index-*.js', async route => {
    await loading
    await route.continue()
  })
  try {
    await page.goto('/templates/', { waitUntil: 'commit' })
    const tools = page.locator('[data-template-tools]')
    const firstCard = page.locator('[data-template-card]').first()
    await expect(tools).toHaveAttribute('inert', '')
    await expect(firstCard).toBeVisible()
    const before = (await firstCard.boundingBox())!.y
    release()
    await expect(tools).not.toHaveAttribute('inert')
    expect((await firstCard.boundingBox())!.y).toBeCloseTo(before, 0)
  } finally { release() }
})

for (const [path, selector, width] of [
  ['/templates/', '#template-filter', 1180],
  ['/docs/vue/components/', '#component-filter', 390],
] as const) {
  test(`filtering ${path} eases results and the footer while the page header stays in place`, async ({ page }) => {
    await page.setViewportSize({ width, height: 680 })
    await page.goto(path)
    const field = page.locator(selector)
    await field.focus()
    const { before, after, frames, easing, gutter } = await field.evaluate(async node => {
      await document.fonts.ready
      const field = node as HTMLInputElement
      const results = document.querySelector('[data-catalog-results]')!
      const brand = document.querySelector('.topbar .brand')!
      const title = document.querySelector('main h1')!
      const footer = document.querySelector('.site-footer')!
      const measure = () => {
        const { x, y } = brand.getBoundingClientRect()
        const heading = title.getBoundingClientRect()
        return { x, y, titleX: heading.x, titleY: heading.y, footerTop: footer.getBoundingClientRect().top,
          footerBottom: footer.getBoundingClientRect().bottom, scroll: scrollY }
      }
      const before = measure()
      field.value = 'syntrofic-test-no-match'
      field.dispatchEvent(new Event('input', { bubbles: true }))
      const height = results.getAnimations().find(animation => (animation.effect as KeyframeEffect).getKeyframes()
        .some(frame => 'height' in frame))
      const start = measure()
      const timing = height?.effect?.getTiming()
      if (height && typeof timing?.duration === 'number') {
        height.pause()
        height.currentTime = timing.duration / 8
      }
      const during = measure()
      height?.finish()
      await height?.finished
      return { before, after: measure(), frames: [start, during], easing: timing?.easing,
        gutter: getComputedStyle(document.documentElement).scrollbarGutter }
    })
    expect(gutter).toBe('stable')
    expect(easing).toMatch(/cubic-bezier/)
    expect(before.footerTop - after.footerTop).toBeGreaterThan(80)
    expect(after.footerBottom).toBeCloseTo(680, 0)
    expect(Math.abs(frames[0]!.footerTop - before.footerTop)).toBeLessThan(2)
    expect(frames.some(frame => frame.footerTop < before.footerTop - 15 && frame.footerTop > after.footerTop + 15)).toBe(true)
    for (const frame of [...frames, after]) {
      expect(Math.abs(frame.x - before.x)).toBeLessThan(1)
      expect(Math.abs(frame.y - before.y)).toBeLessThan(1)
      expect(Math.abs(frame.titleX - before.titleX)).toBeLessThan(1)
      expect(Math.abs(frame.titleY - before.titleY)).toBeLessThan(1)
      expect(frame.scroll).toBe(before.scroll)
    }
    await expect(field).toBeFocused()
  })
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('slow navigation provides loading feedback with motion preference ' + reducedMotion, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    let release = () => {}
    const paused = new Promise<void>(resolve => { release = resolve })
    await page.route('**/templates/', async route => {
      await paused
      await route.continue()
    })
    try {
      await page.goto('/')
      const progress = await page.evaluate(async () => {
        const root = document.documentElement
        await new Promise<void>(resolve => {
          let timer: ReturnType<typeof setTimeout>
          const finish = () => { clearTimeout(timer); observer.disconnect(); resolve() }
          const observer = new MutationObserver(finish)
          observer.observe(root, { attributes: true, attributeFilter: ['data-site-navigation'] })
          timer = setTimeout(finish, 2400)
          document.querySelector<HTMLAnchorElement>('.topnav a[href="/templates/"]')!.click()
        })
        const style = getComputedStyle(document.querySelector('.topbar')!, '::after')
        return { name: style.animationName, easing: style.animationTimingFunction, pending: root.dataset.siteNavigation,
          label: document.querySelector('[data-site-navigation-status]')?.textContent,
          opacity: Number(getComputedStyle(document.querySelector('main#main')!).opacity) }
      })
      expect(progress.pending).toBe('pending')
      expect(progress.label).toBe('正在加载页面…')
      expect(progress.name).toBe(reducedMotion === 'reduce' ? 'none' : 'site-route-load')
      if (reducedMotion !== 'reduce') expect(progress.easing).toMatch(/cubic-bezier/)
      expect(progress.opacity).toBe(1)
      release()
      await expect(page).toHaveURL('/templates/')
      await expect(page.locator('html')).not.toHaveAttribute('data-site-navigation', 'pending')
      await expect(page.locator('[data-site-navigation-status]')).toBeEmpty()
    } finally { release() }
  })
}

test('an interrupted history navigation clears the pending indicator', async ({ page }) => {
  await page.addInitScript(() => {
    if (!('navigation' in window)) Object.defineProperty(window, 'navigation', { value: new EventTarget() })
  })
  await page.goto('/docs/')
  await page.evaluate(() => {
    const browser = window as Window & { navigation: EventTarget }
    const cancel = new AbortController()
    const event = new Event('navigate')
    Object.defineProperties(event, {
      destination: { value: { url: new URL('/templates/', location.href).href, sameDocument: false } },
      navigationType: { value: 'traverse' },
      signal: { value: cancel.signal },
    })
    document.addEventListener('test-interrupt-navigation', () => cancel.abort(), { once: true })
    browser.navigation.dispatchEvent(event)
  })
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-site-navigation', 'pending')
  await expect(page.locator('[data-site-navigation-status]')).toHaveText('正在加载页面…')
  await page.evaluate(() => document.dispatchEvent(new Event('test-interrupt-navigation')))
  await expect(root).not.toHaveAttribute('data-site-navigation')
  await expect(page.locator('[data-site-navigation-status]')).toBeEmpty()
  await expect(page).toHaveURL('/docs/')
})

test('responsive navigation preserves keyboard access when menus close and the viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/standard-design/')
  const mobile = page.locator('.mobile-nav')
  const mobileToggle = mobile.locator('summary')
  await mobileToggle.press('Enter')
  const templates = mobile.getByRole('link', { name: '模板' })
  await templates.focus()
  await expect(templates).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(mobileToggle).toBeFocused()
  await expect(mobile).not.toHaveAttribute('open', '')

  const docs = page.locator('.docs-nav details')
  const docsToggle = docs.locator('summary')
  const guide = docs.getByRole('link', { name: '文档总览' })
  await expect(docs).not.toHaveAttribute('open', '')
  await docsToggle.press('Enter')
  await guide.focus()
  await expect(guide).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(docsToggle).toBeFocused()
  await expect(docs).not.toHaveAttribute('open', '')
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(guide).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(guide).toBeHidden()
})

test('the site header centers its links, animates reflow, and hands focus across its compact menu', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 960 })
  await page.goto('/docs/')
  const header = page.getByRole('banner')
  const row = header.locator('.topbar-row')
  const desktop = header.getByRole('navigation', { name: '主导航', exact: true })
  const actions = header.locator('.top-actions')
  const templates = desktop.getByRole('link', { name: '模板', exact: true })
  await expect(templates).toBeVisible()
  await expect.poll(() => row.evaluate(element => {
    const wide = element.getBoundingClientRect()
    const centered = element.querySelector('.topnav')!.getBoundingClientRect()
    return Math.abs(wide.left + wide.width / 2 - centered.left - centered.width / 2)
  })).toBeLessThan(1)
  await header.evaluate(element => {
    const main = document.querySelector('main')!
    const gap = main.getBoundingClientRect().top - element.getBoundingClientRect().bottom
    const nav = element.querySelector('.topnav')!
    let frames = 180
    function sample() {
      const height = element.getAnimations().find(animation => animation.id === 'sy-navbar-reflow-height')
      const glide = nav.getAnimations().find(animation => animation.id === 'sy-navbar-reflow')
      const progress = height?.effect?.getComputedTiming().progress ?? 0
      if (height && glide && progress > .02 && progress < .98) {
        const box = element.getBoundingClientRect()
        if (Math.abs(main.getBoundingClientRect().top - box.bottom - gap) < 1) {
          element.setAttribute('data-test-topbar-reflow', glide.effect!.getTiming().easing)
          return
        }
      }
      if (--frames > 0) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.setViewportSize({ width: 840, height: 960 })
  await expect(header).toHaveAttribute('data-test-topbar-reflow', /cubic-bezier/)
  await expect.poll(async () => (await desktop.boundingBox())!.y - (await actions.boundingBox())!.y - (await actions.boundingBox())!.height).toBeGreaterThan(0)
  const search = header.getByRole('button', { name: '搜索官网' })
  const desktopSearchWidth = (await search.boundingBox())!.width
  const searchCopy = search.locator('.search-button__copy')
  await searchCopy.evaluate(element => element.addEventListener('transitionrun', event => {
    if (event.propertyName === 'grid-template-columns') element.setAttribute('data-test-collapse', getComputedStyle(element).transitionTimingFunction)
  }))
  await templates.focus()
  await page.setViewportSize({ width: 390, height: 844 })
  const menu = header.locator('.mobile-nav')
  const toggle = menu.locator('summary')
  await expect(toggle).toBeFocused()
  await expect(searchCopy).toHaveAttribute('data-test-collapse', /cubic-bezier/)
  await expect.poll(async () => (await search.boundingBox())!.width).toBeLessThan(desktopSearchWidth - 20)
  await toggle.press('Enter')
  const mobileTemplates = menu.getByRole('link', { name: '模板', exact: true })
  await mobileTemplates.focus()
  await expect(mobileTemplates).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1360, height: 960 })
  await expect(templates).toBeFocused()
  await expect(menu).not.toHaveAttribute('open', '')
  expect(await header.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.id.startsWith('sy-navbar-reflow')).length)).toBe(0)
  await page.setViewportSize({ width: 280, height: 844 })
  await expect(toggle).toBeFocused()
  expect(await header.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('documentation sticky panels and anchor padding follow the rendered header through reflow', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/docs/standard-design/')
  const header = page.getByRole('banner')
  const sidebar = page.locator('.docs-nav')
  const toc = page.locator('.page-toc')
  const docsGap = 16
  await expect(page.locator('html')).toHaveAttribute('style', /--site-header-offset/)
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  const gap = (panel: Locator) => panel.evaluate(node => node.getBoundingClientRect().top - document.querySelector('.topbar')!.getBoundingClientRect().bottom)
  await expect.poll(() => gap(sidebar)).toBeCloseTo(docsGap, 0)
  await expect.poll(() => gap(toc)).toBeCloseTo(docsGap, 0)

  await header.evaluate((element, docsGap) => {
    const sidebar = document.querySelector('.docs-nav')!
    const root = document.documentElement
    const heights = new Set<number>()
    let largestGapError = 0
    let largestPaddingError = 0
    let frames = 180
    function sample() {
      requestAnimationFrame(() => setTimeout(() => {
        const animation = element.getAnimations().find(effect => effect.id === 'sy-navbar-reflow-height')
        const progress = animation?.effect?.getComputedTiming().progress ?? 0
        if (progress > .01 && progress < .99) {
          const bottom = element.getBoundingClientRect().bottom
          heights.add(bottom)
          const gap = sidebar.getBoundingClientRect().top - bottom
          const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) - bottom
          largestGapError = Math.max(largestGapError, Math.abs(gap - docsGap))
          largestPaddingError = Math.max(largestPaddingError, Math.abs(padding - 20))
        }
        if ((heights.size && !animation) || --frames === 0) {
          element.setAttribute('data-test-sticky-trace', JSON.stringify({ heights: heights.size, largestGapError, largestPaddingError }))
        } else sample()
      }, 0))
    }
    sample()
  }, docsGap)
  await page.setViewportSize({ width: 840, height: 900 })
  await expect(header).toHaveAttribute('data-test-sticky-trace', /.+/)
  const trace = JSON.parse((await header.getAttribute('data-test-sticky-trace'))!)
  expect(trace.heights).toBeGreaterThan(1)
  expect(trace.largestGapError).toBeLessThan(1)
  expect(trace.largestPaddingError).toBeLessThan(1)
  await expect.poll(() => gap(sidebar)).toBeCloseTo(docsGap, 0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1360, height: 900 })
  await expect.poll(() => gap(toc)).toBeCloseTo(docsGap, 0)
  expect(await header.evaluate(node => node.getAnimations().some(animation => animation.id === 'sy-navbar-reflow-height'))).toBe(false)
  const anchor = toc.getByRole('link').first()
  const id = (await anchor.getAttribute('href'))!.slice(1)
  await anchor.press('Enter')
  await expect.poll(() => page.evaluate(id => document.getElementById(id)!.getBoundingClientRect().top
    - document.querySelector('.topbar')!.getBoundingClientRect().bottom, id)).toBeCloseTo(20, 0)
  await expect(page.locator('html')).not.toHaveAttribute('data-site-anchor-scroll')
})

test('keyboard anchors glide past growing previews and keep native page history', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/docs/standard-design/')
  const root = page.locator('html')
  const anchor = page.locator('.page-toc').getByRole('link', { name: '验收口径', exact: true })
  await expect(root).toHaveAttribute('style', /--site-header-offset/)
  await anchor.evaluate(link => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const root = document.documentElement
    const preview = document.querySelector<HTMLElement>('[data-island="layout-motion"]')!
    link.addEventListener('click', () => {
      const positions = [window.scrollY]
      const record = () => {
        positions.push(window.scrollY)
        if (window.scrollY > 40 && !root.hasAttribute('data-test-anchor-expanded')) {
          preview.style.paddingBlockEnd = '64px'
          root.dataset.testAnchorExpanded = ''
        }
        root.dataset.testAnchorPositions = JSON.stringify(positions)
      }
      window.addEventListener('scroll', record)
      window.setTimeout(() => window.removeEventListener('scroll', record), 2000)
    }, { once: true })
  })
  await anchor.press('Enter')
  await expect(root).toHaveAttribute('data-test-anchor-expanded', '')
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('验收口径')!.getBoundingClientRect().top
    - document.querySelector('.topbar')!.getBoundingClientRect().bottom - 20))).toBeLessThan(1.05)
  await expect(root).not.toHaveAttribute('data-site-anchor-scroll')
  const positions: number[] = JSON.parse((await root.getAttribute('data-test-anchor-positions'))!)
  expect(positions.filter(position => position > positions[0]! + 25 && position < positions.at(-1)! - 25).length).toBeGreaterThan(1)
  await page.goBack()
  await expect(page).toHaveURL('/docs/standard-design/')
  await expect(root).toHaveAttribute('data-test-anchor-positions', /.+/)
})

test('wheel input takes over an in-flight documentation anchor', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/docs/standard-design/')
  const root = page.locator('html')
  await expect(root).toHaveAttribute('style', /--site-header-offset/)
  await page.mouse.move(20, 550)
  await page.exposeFunction('interruptAnchorWithWheel', async () => { await page.mouse.wheel(0, -600) })
  await page.evaluate(() => {
    const interrupt = () => {
      const root = document.documentElement
      if (!root.hasAttribute('data-site-anchor-scroll') || scrollY <= 10) return
      window.removeEventListener('scroll', interrupt)
      root.dataset.testAnchorWheelAt = String(scrollY)
      void (window as Window & { interruptAnchorWithWheel: () => Promise<void> }).interruptAnchorWithWheel()
    }
    window.addEventListener('scroll', interrupt, { passive: true })
  })
  await page.locator('.page-toc').getByRole('link', { name: '验收口径', exact: true }).press('Enter')
  await expect(root).toHaveAttribute('data-test-anchor-wheel-at', /\d+/)
  expect(Number(await root.getAttribute('data-test-anchor-wheel-at'))).toBeLessThan(600)
  await expect(root).not.toHaveAttribute('data-site-anchor-scroll')
  const settled = await page.evaluate(async () => {
    const until = performance.now() + 800
    let furthest = scrollY
    do {
      await new Promise(requestAnimationFrame)
      furthest = Math.max(furthest, scrollY)
    } while (performance.now() < until)
    return furthest
  })
  expect(settled).toBeLessThan(1000)
  expect(await page.evaluate(() => decodeURIComponent(location.hash))).toBe('#验收口径')
})

test('the site header animates the theme icon without moving its button', async ({ page }) => {
  await page.goto('/themes/')
  const root = page.locator('html')
  await expect(root).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const toggle = page.getByRole('button', { name: '切换明暗主题' })
  const [sun, moon] = await toggle.locator('svg').all()
  await expect(sun!).toHaveCSS('opacity', '1')
  await expect(moon!).toHaveCSS('opacity', '0')
  const geometry = await toggle.boundingBox()
  await toggle.evaluate(element => element.addEventListener('transitionrun', event => {
    if (event.target instanceof SVGElement && event.propertyName === 'opacity') {
      element.setAttribute('data-test-theme-motion', getComputedStyle(event.target).transitionTimingFunction)
    }
  }))
  await toggle.press('Enter')
  await page.getByRole('radio', { name: '深色', exact: true }).check()
  await expect(root).toHaveAttribute('data-site-theme-preference', 'dark')
  await expect(toggle).toHaveAttribute('data-test-theme-motion', /cubic-bezier/)
  await expect(moon!).toHaveCSS('opacity', '1')
  expect(await toggle.boundingBox()).toEqual(geometry)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('radio', { name: '浅色', exact: true }).check()
  await expect(root).toHaveAttribute('data-site-theme-preference', 'light')
  await expect(sun!).toHaveCSS('opacity', '1')
  expect(await toggle.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
})

test('site theme changes reach open tabs and a cached page restores the latest palette on its first frame', async ({ page }) => {
  await page.goto('/docs/')
  const other = await page.context().newPage()
  await other.goto('/templates/')
  const root = page.locator('html')
  await expect(root).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await other.getByRole('button', { name: '切换明暗主题' }).press('Enter')
  await other.getByRole('radio', { name: '深色', exact: true }).check()
  await expect(root).toHaveCSS('background-color', 'rgb(29, 30, 31)')
  await expect(root).toHaveAttribute('data-site-theme-preference', 'dark')

  const restored = await root.evaluate(async element => {
    localStorage.removeItem('syntrofic-site-theme')
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    await new Promise(requestAnimationFrame)
    return { background: getComputedStyle(element).backgroundColor, scheme: document.querySelector('meta[name=color-scheme]')?.getAttribute('content') }
  })
  expect(restored).toEqual({ background: 'rgb(255, 255, 255)', scheme: 'light' })
  await expect(root).toHaveAttribute('data-site-theme-preference', 'system')
  await expect(other.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(root).not.toHaveAttribute('data-site-theme-restoring')
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('mobile documentation disclosure moves the article with motion preference ' + reducedMotion, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/docs/standard-design/')
    const heading = page.locator('.docs-nav summary')
    const motion = await heading.evaluate((summary: HTMLElement) => {
      const details = summary.parentElement as HTMLDetailsElement
      const frame = details.parentElement!
      const article = document.querySelector('.docs-content')!
      const top = () => article.getBoundingClientRect().top
      const resize = () => frame.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(keyframe => keyframe.height))
      const start = top()
      summary.click()
      const opening = resize()
      const reveal = details.querySelector('nav')?.getAnimations()[0]
      const aligned = Boolean(reveal && opening && reveal.startTime === opening.startTime)
      if (opening) { opening.pause(); opening.currentTime = 100 }
      const beforeClose = top()
      summary.click()
      const closing = resize()
      if (closing) { closing.pause(); closing.currentTime = 0 }
      const afterClose = top()
      const snapshot = frame.querySelector<HTMLElement>(':scope > [data-site-departure]')
      const result = { start, beforeClose, afterClose, closed: !details.open,
        easing: closing?.effect?.getTiming().easing, aligned,
        inert: snapshot?.inert, hidden: snapshot?.getAttribute('aria-hidden') }
      closing?.play()
      return result
    })
    expect(motion.closed).toBe(true)
    expect(motion.beforeClose).toBeGreaterThan(motion.start + 10)
    if (reducedMotion === 'reduce') {
      expect(motion.easing).toBeUndefined()
      expect(motion.inert).toBeUndefined()
      expect(motion.afterClose).toBeCloseTo(motion.start, 0)
    } else {
      expect(motion.easing).toMatch(/cubic-bezier/)
      expect(motion.aligned).toBe(true)
      expect(motion.inert).toBe(true)
      expect(motion.hidden).toBe('true')
      expect(Math.abs(motion.afterClose - motion.beforeClose)).toBeLessThan(2)
    }
    await expect(page.locator('.docs-nav > [data-site-departure]')).toHaveCount(0)
  })
}

test('the Astryx example disclosure settles its table before applying a new search', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 480 })
  await page.goto('/docs/standard-design/examples/')
  const summary = page.locator('.design-coverage > summary').filter({ hasText: /^Button · / })
  await summary.scrollIntoViewIfNeeded()
  const result = await summary.evaluate((heading: HTMLElement) => {
    const details = heading.parentElement as HTMLDetailsElement
    const frame = details.parentElement!
    heading.scrollIntoView({ block: 'center' })
    heading.click()
    for (const animation of frame.getAnimations({ subtree: true })) animation.finish()
    const fullHeight = frame.offsetHeight
    const visibleHeight = innerHeight - frame.getBoundingClientRect().top
    heading.click()
    const size = frame.getAnimations()[0]?.effect as KeyframeEffect | null
    const from = Number.parseFloat(String(size?.getKeyframes()[0]?.height))
    const easing = size?.getTiming().easing
    const leaving = frame.querySelector<HTMLTableElement>('table[data-site-departure]')
    const field = document.querySelector<HTMLInputElement>('#design-coverage-query')!
    field.value = 'ButtonFloating'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    return { easing, fullHeight, visibleHeight, from, closedTableHadSnapshot: Boolean(leaving),
      settled: !leaving?.isConnected, resized: frame.getAnimations().length }
  })
  expect(result.easing).toMatch(/cubic-bezier/)
  expect(result.fullHeight).toBeGreaterThan(result.visibleHeight)
  expect(result.from).toBeCloseTo(result.visibleHeight, 0)
  expect(result.closedTableHadSnapshot).toBe(true)
  expect(result.settled).toBe(true)
  expect(result.resized).toBe(0)
  await expect(page.getByRole('rowheader', { name: 'ButtonFloating', exact: true })).toBeVisible()
})

test('the standard design article demonstrates existing layout motion on its white canvas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/standard-design/')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const demo = page.getByRole('region', { name: '布局变化' })
  const toggle = demo.getByRole('button', { name: '切换两处内容' })
  await toggle.press('Enter')
  await expect(demo.locator('output')).toHaveText('正在滑动')
  await expect(demo.getByText('核对访谈记录和品牌资产')).toBeVisible()
  await demo.getByRole('button', { name: '完成移动' }).press('Enter')
  await expect(demo.locator('output')).toHaveText('已更新位置')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.press('Enter')
  await expect(demo.locator('output')).toHaveText('已更新位置')
  await expect(toggle).toBeFocused()
  expect(await demo.locator('[data-layout-trailing]').evaluate(node => node.getAnimations().length)).toBe(0)
})

test('the standard design layout demo starts its glide, reveal, and swap together after a blocking commit', async ({ page }) => {
  await page.goto('/docs/standard-design/')
  const demo = page.getByRole('region', { name: '布局变化' })
  const toggle = demo.getByRole('button', { name: '切换两处内容' })
  const result = await toggle.evaluate(async button => {
    const region = button.closest('section')!
    const trailing = region.querySelector<HTMLElement>('[data-layout-trailing]')!
    const next = region.querySelector<HTMLElement>('[data-layout-swap-next]')!
    const position = () => trailing.getBoundingClientRect().top - region.getBoundingClientRect().top
    await new Promise(requestAnimationFrame)
    const before = position()
    ;(button as HTMLElement).click()
    for (let tick = 0; tick < 6; tick++) await Promise.resolve()
    const previous = document.querySelector<HTMLElement>('[data-layout-swap-copy]')!
    const animations = [...trailing.getAnimations(), ...next.getAnimations(), ...previous.getAnimations()]
    const until = performance.now() + 320
    while (performance.now() < until) { /* Hold the main thread before the new layout paints. */ }
    await new Promise(requestAnimationFrame)
    const first = position()
    const opacity = Number(getComputedStyle(next).opacity)
    const clip = getComputedStyle(next).clipPath
    const dates = new Set(animations.map(animation => animation.startTime)).size
    await Promise.all(animations.map(animation => animation.finished))
    return { before, first, opacity, clip, dates, count: animations.length,
      landed: position(), copyDisposed: !previous.isConnected }
  })
  expect(result.count).toBeGreaterThanOrEqual(4)
  expect(result.dates).toBe(1)
  expect(Math.abs(result.first - result.before)).toBeLessThan(2)
  expect(result.opacity).toBeCloseTo(.12, 2)
  expect(result.clip).toMatch(/^inset\(\d+(?:\.\d+)?% /)
  expect(Number.parseFloat(result.clip.slice('inset('.length))).toBeCloseTo(100, 1)
  expect(result.landed - result.before).toBeGreaterThan(10)
  expect(result.copyDisposed).toBe(true)
})

test('the standard design layout demo carries an in-flight glide through a delayed reversal', async ({ page }) => {
  await page.goto('/docs/standard-design/')
  const demo = page.getByRole('region', { name: '布局变化' })
  const toggle = demo.getByRole('button', { name: '切换两处内容' })
  await toggle.scrollIntoViewIfNeeded()
  const result = await toggle.evaluate(async control => {
    const button = control as HTMLButtonElement
    const trailing = button.closest('section')!.querySelector<HTMLElement>('[data-layout-trailing]')!
    const glide = () => trailing.getAnimations().find(animation => (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.translate))!
    const y = (translate: string) => Number.parseFloat(translate.split(' ')[1] ?? '0') || 0
    const frames = (animation: Animation) => (animation.effect as KeyframeEffect).getKeyframes()
    const origin = () => trailing.getBoundingClientRect().top - y(getComputedStyle(trailing).translate)
    await new Promise(requestAnimationFrame)
    button.click()
    await new Promise<void>(resolve => {
      const afterStart = () => Number(glide()?.currentTime ?? 0) >= 45 ? resolve() : requestAnimationFrame(afterStart)
      requestAnimationFrame(afterStart)
    })
    const previous = glide()
    const oldStart = Number(previous.startTime)
    const oldDuration = Number(previous.effect!.getComputedTiming().duration)
    const oldOrigin = origin()
    const oldFrames = frames(previous)
    const topBefore = trailing.getBoundingClientRect().top
    button.addEventListener('click', () => {
      queueMicrotask(() => {
        const end = performance.now() + 280
        while (performance.now() < end) { /* Delay the layout effect after Vue has queued the update. */ }
      })
    }, { once: true })
    button.click()
    await new Promise(requestAnimationFrame)
    const next = glide()
    const position = Math.max(0, Math.min(1, (Number(next.startTime) - oldStart) / oldDuration)) * (oldFrames.length - 1)
    const left = Math.floor(position)
    const from = y(String(oldFrames[left].translate))
    const to = y(String(oldFrames[Math.min(left + 1, oldFrames.length - 1)].translate))
    const carried = oldOrigin + from + (to - from) * (position - left)
    const started = origin() + y(String(frames(next)[0].translate))
    await next.finished
    return { topBefore, carried, started, landed: trailing.getBoundingClientRect().top }
  })
  expect(result.carried - result.topBefore).toBeGreaterThan(6)
  expect(result.started).toBeCloseTo(result.carried, 0)
  expect(result.landed).toBeLessThan(result.topBefore)
  await expect(demo.locator('output')).toHaveText('已更新位置')
  await expect(page.locator('[data-layout-swap-copy]')).toHaveCount(0)
})

test('the standard design audit combines text and status and restores folded sections', async ({ page }) => {
  await page.goto('/docs/standard-design/')
  const first = page.locator('.design-coverage').first()
  await first.locator('summary').press('Enter')
  await expect(first).toHaveAttribute('open', '')
  const query = page.getByRole('searchbox', { name: '搜索对照清单' })
  const status = page.getByLabel('筛选覆盖情况')
  await query.fill('theme-build')
  await expect(page.getByRole('rowheader', { name: 'theme-build', exact: true })).toBeVisible()
  await expect(page.locator('[data-coverage-count]')).toHaveText('1 项')
  await status.selectOption('gap')
  await expect(page.locator('[data-no-coverage]')).toBeVisible()
  await expect(page.locator('[data-coverage-count]')).toHaveText('0 项')
  await query.clear()
  await status.selectOption('')
  await expect(first).toHaveAttribute('open', '')
  await expect(page.locator('.design-coverage[open]')).toHaveCount(1)

  await page.getByRole('link', { name: '独立示例对照', exact: true }).click()
  await expect(page.getByRole('heading', { name: '独立示例对照' })).toBeVisible()
  await expect(page.locator('[data-coverage-count]')).toHaveText('730 项')
  await page.getByRole('searchbox', { name: '搜索对照清单' }).fill('ButtonFloating')
  await expect(page.getByRole('rowheader', { name: 'ButtonFloating', exact: true })).toBeVisible()
  const button = page.getByRole('row', { name: /^ButtonFloating / })
  await expect(button.getByRole('link', { name: '试用对应示例' })).toHaveAttribute('href', '/docs/vue/components/button/#实时预览')
  await page.getByRole('searchbox', { name: '搜索对照清单' }).fill('SwitchSettingsPanel')
  await page.getByRole('link', { name: '试用对应示例' }).click()
  const switches = page.getByRole('region', { name: '开关状态' })
  await expect(switches.getByRole('switch', { name: '每周简报' })).toBeVisible()
  await expect(switches.getByRole('checkbox', { name: '标签在开关前' })).toBeChecked()
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('the example index ' + (reducedMotion === 'reduce' ? 'filters immediately with reduced motion' : 'animates matching rows with nonlinear easing'), async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 1280, height: 1050 })
    await page.goto('/docs/standard-design/examples/')
    const search = page.getByRole('searchbox', { name: '搜索对照清单' })
    await expect(page.locator('.topbar-row')).toHaveCSS('position', 'relative')
    await expect(search).toBeInViewport()
    const easings = await search.evaluate(input => {
      const field = input as HTMLInputElement
      field.value = 'ButtonFloating'
      field.dispatchEvent(new Event('input', { bubbles: true }))
      const row = [...document.querySelectorAll('tr')].find(row => row.querySelector('th[scope="row"]')?.textContent === 'ButtonFloating')
      return row?.getAnimations().map(animation => animation.effect?.getTiming().easing) ?? []
    })
    await expect(page.getByRole('rowheader', { name: 'ButtonFloating', exact: true })).toBeVisible()
    await expect(page.locator('[data-coverage-count]')).toHaveText('2 项')
    if (reducedMotion === 'reduce') expect(easings).toHaveLength(0)
    else expect(easings.some(easing => easing?.includes('cubic-bezier'))).toBe(true)
  })
}

test('site clipboard errors are visible and a second copy restarts the confirmation timer', async ({ page }) => {
  await page.addInitScript(() => {
    let writes = 0
    Object.defineProperty(navigator, 'clipboard', { value: { async writeText() {
      if (++writes === 1) throw new Error('clipboard denied')
    } } })
  })
  await page.goto('/docs/quick-start/')
  const copy = page.locator('[data-copy]').first()
  const width = await copy.evaluate(button => button.getBoundingClientRect().width)
  const label = copy.locator('[data-site-action-label]')
  await label.evaluate(node => {
    const observer = new MutationObserver(() => {
      const old = document.querySelector<HTMLElement>('[data-site-text-copy]')
      const outgoing = old?.getAnimations()[0]
      const incoming = node.getAnimations()[0]
      node.dataset.testLabelSwap = String(Boolean(old?.inert && old.getAttribute('aria-hidden') === 'true'
        && old.textContent === '复制' && outgoing && incoming && outgoing.startTime === incoming.startTime))
      observer.disconnect()
    })
    observer.observe(node, { childList: true })
  })
  await copy.press('Enter')
  await expect(copy).toHaveText('重试复制')
  await expect(label).toHaveAttribute('data-test-label-swap', 'true')
  expect(await copy.evaluate(button => button.getBoundingClientRect().width)).toBe(width)
  await expect(copy).toBeFocused()
  await copy.press('Enter')
  await expect(copy).toHaveText('已复制')
  await page.waitForTimeout(850)
  await copy.press('Enter')
  await page.waitForTimeout(850)
  await expect(copy).toHaveText('已复制')
  await expect(copy).toHaveText('复制')
})

test('the theme lab animates the generated tokens when badge appearance changes', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  const badge = preview.getByText('已确认', { exact: true })
  const tokens = page.locator('.theme-demo .code-block code')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const soft = await badge.evaluate(node => getComputedStyle(node).backgroundColor)
  await tokens.evaluate(node => {
    const changed = new MutationObserver(() => {
      const easing = node.getAnimations().find(animation => animation.playState === 'running')?.effect?.getTiming().easing
      if (easing) node.setAttribute('data-test-transition', easing)
    })
    changed.observe(node, { characterData: true, childList: true, subtree: true })
  })
  const choice = page.getByRole('combobox', { name: '徽标样式' })
  await choice.press('ArrowDown')
  await page.getByRole('option', { name: '描边' }).click()
  await expect(badge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(badge).toHaveCSS('box-shadow', /inset/)
  await expect(tokens).toContainText('--sy-design-badge-outline')
  await expect(tokens).toHaveAttribute('data-test-transition', /cubic-bezier/)
  await choice.press('ArrowDown')
  await page.getByRole('option', { name: '实心' }).click()
  await expect(tokens).toContainText('--sy-design-badge-success-fill')
  await expect(badge).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(badge).not.toHaveCSS('background-color', soft)
})

test('the theme lab animates only the primary hover color within the button preview', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '按钮状态配色' }).click()
  const sample = preview.getByRole('group', { name: '按钮配色预览' })
  const primary = sample.getByRole('button', { name: '主按钮' })
  const secondary = sample.getByRole('button', { name: '次按钮' })
  const rest = await primary.evaluate(node => getComputedStyle(node).backgroundColor)
  await secondary.hover()
  await expect.poll(() => secondary.evaluate(node => node.getAnimations().length)).toBe(0)
  const secondaryHover = await secondary.evaluate(node => getComputedStyle(node).backgroundColor)
  await primary.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'background-color') node.setAttribute('data-color-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await preview.getByRole('switch', { name: '应用主按钮悬停色' }).click()
  await expect(primary).toHaveCSS('background-color', rest)
  await primary.hover()
  await expect(primary).toHaveCSS('background-color', 'rgb(52, 77, 100)')
  await expect(primary).toHaveAttribute('data-color-easing', /cubic-bezier/)
  await secondary.hover()
  await expect(secondary).toHaveCSS('background-color', secondaryHover)
  await expect(primary).toHaveCSS('background-color', rest)
  await expect(page.locator('.theme-demo .code-block code')).toContainText('--sy-accent-hover: #344d64;')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('the theme lab animates the input group prefix and placeholder together', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '输入组辅助文字' }).click()
  const sample = preview.getByRole('group', { name: '输入组配色预览' })
  const group = sample.locator('.sy-input-group')
  const input = sample.getByRole('textbox', { name: '项目编号' })
  const prefix = sample.locator('.sy-input-group__affix').filter({ hasText: 'PRJ-' })
  const elsewhere = preview.getByRole('textbox', { name: '项目名称' })
  const placeholder = (field: Locator) => field.evaluate(node => getComputedStyle(node, '::placeholder').color)
  const defaultColor = await placeholder(elsewhere)
  const initial = await placeholder(input)
  const initialSurface = await group.evaluate(node => getComputedStyle(node).backgroundColor)
  await input.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === '--sy-field-placeholder-color') node.setAttribute('data-placeholder-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await prefix.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'color') node.setAttribute('data-color-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await group.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'background-color') node.setAttribute('data-background-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  const toggle = sample.getByRole('switch', { name: '应用灰紫配色' })
  await toggle.click()
  await expect(prefix).toHaveCSS('color', 'rgb(98, 77, 115)')
  await expect.poll(() => placeholder(input)).toBe('rgb(98, 77, 115)')
  await expect(prefix).toHaveAttribute('data-color-easing', /cubic-bezier/)
  await expect(input).toHaveAttribute('data-placeholder-easing', /cubic-bezier/)
  const surface = sample.getByRole('switch', { name: '使用半透明底色' })
  await surface.click()
  await expect(group).toHaveCSS('background-color', 'rgba(66, 88, 73, 0.16)')
  await expect(group).toHaveAttribute('data-background-easing', /cubic-bezier/)
  await expect(prefix).toHaveCSS('color', 'rgb(98, 77, 115)')
  await expect.poll(() => placeholder(input)).toBe('rgb(98, 77, 115)')
  await expect.poll(() => placeholder(elsewhere)).toBe(defaultColor)
  await expect(page.locator('.theme-demo .code-block code')).toContainText('--sy-text-muted: #624d73;')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.click()
  await surface.click()
  await expect(group).toHaveCSS('background-color', initialSurface)
  await expect.poll(() => placeholder(input)).toBe(initial)
  expect(await prefix.evaluate(node => node.getAnimations().length)).toBe(0)
  expect(await group.evaluate(node => node.getAnimations().length)).toBe(0)
})

test('the theme lab animates one card surface on a white canvas', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '卡片变体底色' }).click()
  const samples = preview.getByRole('group', { name: '卡片底色预览' })
  const base = samples.locator('.sy-card[data-variant="default"]')
  const muted = samples.locator('.sy-card[data-variant="muted"][data-elevation="low"]')
  await expect(base).toHaveCSS('background-color', 'rgb(248, 248, 248)')
  await muted.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'background-color') {
      node.setAttribute('data-test-surface-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  const edit = samples.getByRole('switch', { name: '调整低阴影浅灰卡片' })
  await edit.check()
  await expect(muted).toHaveAttribute('data-test-surface-easing', /cubic-bezier/)
  await expect(muted).toHaveCSS('background-color', 'rgb(237, 237, 237)')
  const css = page.locator('.theme-demo .code-block code')
  await expect(css).toContainText('[data-elevation="low"]')
  await expect(css).toContainText('--sy-surface-muted: #ededed;')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(base).toHaveCSS('background-color', 'rgb(248, 248, 248)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('switch', { name: '预览深色主题' }).check()
  await expect(muted).toHaveCSS('background-color', 'rgb(58, 58, 58)')
  await expect(muted).toHaveCSS('transition-duration', '0s')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('the theme lab shares the chart palette across SVG, inspection and Canvas', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '图表数据配色' }).click()
  const charts = preview.getByRole('group', { name: '数据配色预览' })
  const plot = charts.getByRole('slider', { name: '季度交付量' })
  const bar = charts.locator('[data-series="delivered"] .sy-chart__bar').first()
  const planned = charts.locator('[data-series="planned"] .sy-chart__bar').first()
  const legend = charts.locator('.sy-chart__legend .sy-chart__indicator').first()
  const canvasColor = () => charts.locator('canvas').evaluate(node =>
    Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(48, 225, 1, 1).data))
  await expect(bar).toHaveCSS('fill', 'rgb(87, 115, 100)')
  await expect.poll(canvasColor).toEqual([87, 115, 100, 255])
  await bar.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'fill') node.setAttribute('data-test-ink-easing', getComputedStyle(node).transitionTimingFunction)
  }))

  const edit = preview.getByRole('switch', { name: '调整已交付系列颜色' })
  await charts.evaluate(group => group.style.setProperty('--sy-motion-replace', '520ms'))
  const samples = await edit.evaluate(async trigger => {
    const charts = document.querySelector('[aria-label="数据配色预览"]')!
    const context = charts.querySelector('canvas')!.getContext('2d')!
    const mark = charts.querySelector('[data-series="delivered"] .sy-chart__bar')!
    const frames: { canvas: number; svg: number }[] = []
    ;(trigger as HTMLElement).click()
    const until = performance.now() + 420
    while (performance.now() < until) {
      await new Promise(requestAnimationFrame)
      await new Promise(done => setTimeout(done, 0))
      const channels = getComputedStyle(mark).fill.match(/\d+/g)
      frames.push({ canvas: context.getImageData(48, 225, 1, 1).data[2], svg: Number(channels?.[2]) })
    }
    return frames
  })
  const interior = samples.filter(({ svg }) => svg >= 112 && svg <= 144)
  expect(interior.length).toBeGreaterThan(1)
  expect(Math.max(...interior.map(({ canvas, svg }) => Math.abs(canvas - svg)))).toBeLessThanOrEqual(6)
  await expect(bar).toHaveAttribute('data-test-ink-easing', /cubic-bezier/)
  await expect(bar).toHaveCSS('fill', 'rgb(84, 107, 152)')
  await expect(legend).toHaveCSS('background-color', 'rgb(84, 107, 152)')
  await expect(planned).toHaveCSS('fill', 'rgb(160, 117, 108)')
  await expect.poll(canvasColor).toEqual([84, 107, 152, 255])
  await expect(plot).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.theme-demo .code-block code').first()).toContainText('--sy-data-categorical-sage: #546b98;')

  await plot.press('Home')
  await expect(charts.locator('.sy-chart-tooltip .sy-chart__indicator').first()).toHaveCSS('background-color', 'rgb(84, 107, 152)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('switch', { name: '预览深色主题' }).check()
  await expect(bar).toHaveCSS('fill', 'rgb(173, 190, 230)')
  await expect.poll(canvasColor).toEqual([173, 190, 230, 255])
  expect(await bar.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('the theme lab transfers a pagination frame with nonlinear motion on white', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 820 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '分页边框和圆角' }).click()
  const samples = preview.getByRole('group', { name: '分页样式预览' })
  const pager = samples.getByRole('navigation', { name: '资料分页' })
  const row = pager.locator('.sy-pagination__controls')
  await expect(row).toHaveCSS('border-top-width', '0px')
  await row.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'border-top-width') {
      node.setAttribute('data-test-frame-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  await samples.getByRole('switch', { name: '显示共享边框' }).check()
  await expect(row).toHaveAttribute('data-test-frame-easing', /cubic-bezier/)
  await expect(row).toHaveCSS('border-top-width', '1px')
  await expect(row).toHaveCSS('border-top-left-radius', '16px')
  await expect(pager).toHaveCSS('border-top-width', '0px')

  const fill = samples.getByRole('switch', { name: '给分页区填底色' })
  await fill.check()
  await expect(row).toHaveCSS('border-top-width', '0px')
  await expect(pager).toHaveCSS('border-top-left-radius', '16px')
  await expect(pager).toHaveCSS('background-color', 'rgb(245, 245, 245)')
  await samples.getByRole('switch', { name: '调整单个控件圆角' }).check()
  await pager.getByRole('button', { name: '下一页' }).press('Enter')
  const current = pager.getByRole('button', { name: '第 5 页', exact: true })
  await expect(current).toHaveAttribute('aria-current', 'page')
  await expect(current).toHaveCSS('border-top-left-radius', '8px')
  await expect(samples.locator('output')).toContainText('第 5 页，共 12 页')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await fill.uncheck()
  await expect(row).toHaveCSS('border-top-width', '1px')
  expect(await row.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('the theme lab applies reduced motion to nested themes and portaled content', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  const preference = page.getByRole('switch', { name: '减少预览动效' })
  const duration = (element: Locator) => element.evaluate(node => {
    const time = getComputedStyle(node).getPropertyValue('--sy-motion-replace').trim()
    return parseFloat(time) * (time.endsWith('ms') ? 1 : 1000)
  })
  await expect.poll(() => duration(preview)).toBe(220)
  await preference.press('Space')
  await expect(preview).toHaveAttribute('data-sy-reduced-motion')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect.poll(() => duration(preview)).toBe(0)
  await expect.poll(() => duration(preference)).toBe(220)

  const save = preview.getByRole('button', { name: '保存设置' })
  await save.press('Enter')
  const saved = preview.getByRole('button', { name: '已保存' })
  await expect(saved).toBeFocused()
  await expect(saved.locator('.sy-motion-text__glyph').first()).toHaveCSS('transform', 'none')

  await preview.getByRole('button', { name: '局部浮层主题' }).click()
  const origin = preview.getByRole('button', { name: '右键菜单示例' })
  await origin.press('Shift+F10')
  const menu = page.getByRole('menu', { name: '局部主题菜单' })
  await expect(menu).toBeVisible()
  const scope = menu.locator('xpath=ancestor::*[@data-sy-brand][1]')
  await expect(scope).toHaveAttribute('data-sy-brand', 'floating-example')
  await expect(scope).toHaveAttribute('data-sy-reduced-motion')
  expect(await menu.evaluate(node => node.closest('.theme-preview'))).toBeNull()
  await expect.poll(() => duration(menu)).toBe(0)
  await menu.press('Escape')
  await expect(origin).toBeFocused()

  await preference.press('Space')
  await expect(preview).not.toHaveAttribute('data-sy-reduced-motion')
  await expect.poll(() => duration(preview)).toBe(220)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => duration(preview)).toBe(0)
})

test('the theme lab carries local tokens and component rules to the shared host and body', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '局部浮层主题' }).click()
  const samples = preview.getByRole('group', { name: '局部浮层预览' })
  const trigger = samples.getByRole('button', { name: '打开预览浮层' })
  await trigger.press('Enter')
  const popover = preview.locator('.sy-layer-host').getByRole('dialog', { name: '局部主题浮层' })
  const scope = popover.locator('xpath=ancestor::*[@data-sy-brand][1]')
  await expect(scope).toHaveAttribute('data-sy-brand', 'floating-example')
  await expect(popover).toHaveCSS('border-top-left-radius', /^22px\b/)
  await expect(popover).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const action = popover.getByRole('button', { name: '局部主题操作' })
  await expect(action).toHaveCSS('background-color', 'rgb(85, 62, 107)')
  for (const surface of [popover, action]) {
    await surface.evaluate(node => node.addEventListener('transitionrun', event => {
      if (event.target === node && event.propertyName === 'background-color') node.setAttribute('data-test-color-easing', getComputedStyle(node).transitionTimingFunction)
    }))
  }
  const appearance = popover.getByRole('switch', { name: '浮层深色模式' })
  await appearance.press('Space')
  await expect(appearance).toBeChecked()
  await expect(appearance).toBeFocused()
  await expect(scope).toHaveAttribute('data-sy-theme', 'dark')
  await expect(action).toHaveCSS('background-color', 'rgb(212, 200, 230)')
  await expect(popover).toHaveAttribute('data-test-color-easing', /cubic-bezier/)
  await expect(action).toHaveAttribute('data-test-color-easing', /cubic-bezier/)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()

  const context = samples.getByRole('button', { name: '右键菜单示例' })
  await context.press('Shift+F10')
  const menu = page.getByRole('menu', { name: '局部主题菜单' })
  await expect(menu.locator('xpath=ancestor::*[@data-sy-brand][1]')).toHaveAttribute('data-sy-brand', 'floating-example')
  await expect(menu.getByRole('menuitem', { name: '复制项目编号' })).toHaveCSS('padding-inline-start', '18px')
  await page.keyboard.press('Escape')
  await expect(context).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await trigger.press('Enter')
  await appearance.press('Space')
  await expect(popover).toHaveCSS('transition-duration', '0s')
  await expect(popover).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('the theme lab preserves compiled CSS scope and part-level tokens across a portal', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '局部浮层主题' }).click()
  const source = preview.getByRole('group', { name: 'CSS 局部主题' })
  const trigger = source.getByRole('button', { name: '打开 CSS 主题浮层' })
  await trigger.press('Enter')
  const popover = preview.locator('.sy-layer-host').getByRole('dialog', { name: 'CSS 局部主题浮层' })
  const action = popover.getByRole('button', { name: 'CSS 主题操作' })
  await expect(popover).toHaveCSS('border-top-left-radius', '12px')
  await expect(popover).toHaveCSS('background-color', 'rgb(247, 247, 247)')
  await expect(action).toHaveCSS('background-color', 'rgb(52, 77, 100)')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(popover).toHaveCSS('background-color', 'rgb(41, 41, 41)')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(popover).toHaveCSS('background-color', 'rgb(247, 247, 247)')
  const switchMode = popover.getByRole('switch', { name: 'CSS 浮层深色模式' })
  await switchMode.press('Space')
  await expect(switchMode).toBeFocused()
  await expect(popover).toHaveCSS('background-color', 'rgb(41, 41, 41)')
  await expect(action).toHaveCSS('background-color', 'rgb(197, 213, 223)')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  const menuTrigger = source.getByRole('button', { name: 'CSS 右键菜单' })
  await menuTrigger.press('Shift+F10')
  const menu = page.getByRole('menu', { name: 'CSS 局部主题菜单' })
  await expect(menu.locator('xpath=ancestor::*[@data-sy-brand][1]')).toHaveAttribute('data-sy-brand', 'markup-example')
  await expect(menu.getByRole('menuitem', { name: '复制 CSS 项目编号' })).toHaveCSS('padding-inline-start', '22px')
  await page.keyboard.press('Escape')
  await expect(menuTrigger).toBeFocused()
})

test('the theme lab applies one height to its button, input and select with nonlinear motion', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  const controls = [preview.getByRole('button', { name: '保存设置' }), preview.getByRole('textbox', { name: '项目名称' }),
    preview.getByRole('combobox', { name: '可见范围' })]
  const option = page.getByRole('combobox', { name: '控件高度' })
  await option.press('ArrowDown')
  await page.getByRole('option', { name: '56 px' }).click()
  for (const control of controls) {
    await expect(control).toHaveCSS('height', '56px')
    await expect(control).toHaveCSS('transition-timing-function', /cubic-bezier/)
  }
  await expect(page.locator('.theme-demo .code-block code')).toContainText('--sy-control-height-md: 56px;')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await option.press('ArrowDown')
  await page.getByRole('option', { name: '48 px' }).click()
  for (const control of controls) await expect(control).toHaveCSS('height', '48px')
  await expect.poll(async () => controls[0].evaluate(node => node.getAnimations().length)).toBe(0)
})

test('the theme lab protects the vertical padding of growing controls and animates the file drop zone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '多行控件内边距' }).click()
  const samples = preview.getByRole('group', { name: '内边距预览', exact: true })
  const selector = samples.getByRole('combobox', { name: '通知方式' })
  const field = samples.getByRole('group', { name: '文件字段', exact: true })
  const drop = samples.getByRole('group', { name: '文件拖放区', exact: true })
  await expect(selector).toHaveAttribute('data-description', 'true')
  const top = (await selector.evaluate(node => getComputedStyle(node).paddingTop))
  await expect(field).toHaveCSS('padding-top', '5px')
  await expect(drop).toHaveCSS('padding-top', '12px')
  await drop.evaluate(node => {
    node.addEventListener('transitionrun', event => {
      if (event.propertyName.startsWith('padding')) (node as HTMLElement).dataset.testPaddingEasing = getComputedStyle(node).transitionTimingFunction
    })
  })
  const toggle = samples.getByRole('switch', { name: /应用上下 24 px/ })
  await toggle.click()
  for (const control of [selector, field, drop]) {
    await expect(control).toHaveCSS('padding-left', '20px')
    await expect(control).toHaveCSS('padding-right', '20px')
  }
  await expect(selector).toHaveCSS('padding-top', top)
  await expect(field).toHaveCSS('padding-top', '5px')
  await expect(drop).toHaveCSS('padding-top', '24px')
  await expect(drop).toHaveCSS('padding-bottom', '24px')
  await expect(drop).toHaveAttribute('data-test-padding-easing', /cubic-bezier/)
  await expect(page.locator('.theme-demo .code-block code')).toContainText('padding-inline: 20px')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.click()
  await expect(drop).toHaveCSS('padding-top', '12px')
  expect(await drop.evaluate(node => node.getAnimations().length)).toBe(0)
})

test('the theme lab animates navigation text size and preserves the supporting text across viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '导航文字字号' }).click()
  const samples = preview.getByRole('group', { name: '字号预览' })
  const brand = samples.getByRole('link', { name: '交付工作台', exact: true })
  await expect(brand).toHaveAccessibleDescription('设计团队')
  const tab = samples.getByRole('tab', { name: '概览' })
  const titles = [brand.locator('.sy-navbar__brand-title'), samples.locator('.sy-side-nav-heading__title'), tab]
  const sideNotes = samples.locator('.sy-side-nav-heading__text > span')
  const support = [brand.locator('.sy-navbar__brand-description'), sideNotes.first(), sideNotes.last()]
  const secondarySizes = await Promise.all(support.map(node => node.evaluate(element => getComputedStyle(element).fontSize)))
  for (const title of titles) await title.evaluate(node => {
    node.addEventListener('transitionrun', (event: TransitionEvent) => {
      if (event.propertyName === 'font-size' && event.target === node) node.setAttribute('data-test-size-easing', getComputedStyle(node).transitionTimingFunction)
    })
  })
  const size = samples.getByRole('combobox', { name: '主文字字号' })
  await size.press('ArrowDown')
  await page.getByRole('option', { name: '22 px' }).click()
  for (const title of titles) {
    await expect(title).toHaveCSS('font-size', '22px')
    await expect(title).toHaveAttribute('data-test-size-easing', /cubic-bezier/)
  }
  for (const [index, node] of support.entries()) await expect(node).toHaveCSS('font-size', secondarySizes[index]!)
  const css = page.locator('.theme-demo .code-block code')
  for (const token of ['--sy-top-nav-title-size', '--sy-side-nav-title-size', '--sy-tab-label-size']) {
    await expect(css).toContainText(token + ': 22px;')
  }
  await samples.getByRole('tab', { name: '活动' }).click()
  await expect(samples.getByRole('tabpanel', { name: '活动' })).toContainText('已上传品牌组件清单')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await size.press('ArrowDown')
  await page.getByRole('option', { name: '18 px' }).click()
  for (const title of titles) {
    await expect(title).toHaveCSS('font-size', '18px')
    expect(await title.evaluate(node => node.getAnimations().length)).toBe(0)
  }
})

test('the navigation marker follows resized labels and mobile focus follows the same item', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 960 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '导航选中项' }).click()
  const sample = preview.getByRole('group', { name: '导航选中项预览' })
  const nav = sample.getByRole('navigation', { name: '工作区导航示例' })
  const overview = nav.getByRole('button', { name: '概览', exact: true })
  const file = nav.getByRole('button', { name: '文件', exact: true })
  const marker = nav.locator('.sy-navbar__indicator')
  await expect(file).toHaveAttribute('aria-current', 'page')
  await expect(overview).toHaveAttribute('data-icon-only', 'true')
  const tile = (await overview.boundingBox())!
  expect(tile.width).toBeCloseTo(tile.height, 0)

  await marker.evaluate(element => {
    const observer = new MutationObserver(() => {
      const movement = element.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => 'scale' in frame && 'translate' in frame))
      if (!movement) return
      element.setAttribute('data-test-selection-easing', movement.effect!.getTiming().easing)
      observer.disconnect()
    })
    observer.observe(element, { attributes: true, attributeFilter: ['style'] })
  })
  await overview.click()
  await expect(overview).toHaveAttribute('aria-current', 'page')
  await expect(marker).toHaveAttribute('data-test-selection-easing', /cubic-bezier/)
  await file.click()
  await expect(file).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => marker.evaluate(node => node.getAnimations().length)).toBe(0)
  await file.evaluate(element => {
    const initial = element.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const effect = element.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => 'inlineSize' in frame))
      if (!effect || element.getBoundingClientRect().width <= initial + .5) return
      const marker = element.closest('.sy-navbar')!.querySelector('.sy-navbar__indicator')!
      const width = element.getBoundingClientRect().width
      if (Math.abs(marker.getBoundingClientRect().width - (width - 8)) > 1) return
      element.setAttribute('data-test-label-easing', effect.effect!.getTiming().easing)
      observer.disconnect()
    })
    observer.observe(element)
  })
  await sample.getByRole('switch', { name: '使用完整文件名称' }).click()
  const renamed = nav.getByRole('button', { name: '交付文件', exact: true })
  await expect(renamed).toHaveAttribute('data-test-label-easing', /cubic-bezier/)
  await expect(renamed).toHaveAttribute('aria-current', 'page')
  await renamed.focus()
  await page.setViewportSize({ width: 390, height: 844 })
  const toggle = nav.getByRole('button', { name: '打开工作区导航' })
  await expect(toggle).toBeFocused()
  const toggleWidth = (await toggle.boundingBox())!.width
  const menu = nav.locator('.sy-navbar__menu')
  await menu.evaluate(element => element.addEventListener('transitionrun', event => {
    if (event.propertyName === 'clip-path' && event.target === element) {
      element.setAttribute('data-test-open-easing', getComputedStyle(element).transitionTimingFunction)
    }
  }))
  await toggle.press('Enter')
  await expect(menu).toHaveAttribute('data-test-open-easing', /cubic-bezier/)
  expect((await toggle.boundingBox())!.width).toBeCloseTo(toggleWidth, 1)
  const mobileOverview = nav.getByRole('button', { name: '概览', exact: true })
  await expect(mobileOverview.locator('.sy-visually-hidden')).toHaveText('概览')
  await expect(mobileOverview).not.toHaveAttribute('data-icon-only')
  await mobileOverview.scrollIntoViewIfNeeded()
  await expect.poll(() => mobileOverview.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2))
  })).toBe(true)
  const activity = nav.getByRole('button', { name: '活动', exact: true })
  await activity.focus()
  await page.setViewportSize({ width: 1360, height: 960 })
  await expect(activity).toBeFocused()
  await expect(renamed).toHaveAttribute('aria-current', 'page')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await sample.getByRole('switch', { name: '使用完整文件名称' }).click()
  await expect(file).toHaveAttribute('aria-current', 'page')
  expect(await file.evaluate(node => node.getAnimations().length)).toBe(0)
})

test('the theme lab wraps centered navigation in place and preserves its search in the compact menu', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 960 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '居中导航与换行' }).click()
  const sample = preview.getByRole('group', { name: '导航换行预览' })
  const nav = sample.getByRole('navigation', { name: '项目搜索导航' })
  const search = nav.getByRole('searchbox', { name: '搜索项目' })
  const status = sample.getByRole('status')
  const results = status.locator('.sy-visually-hidden')
  const width = sample.getByRole('combobox', { name: '导航可用宽度' })
  const bar = nav.locator('.sy-navbar__bar')
  const clear = nav.getByRole('button', { name: '清除搜索' })
  await expect(search).toBeVisible()
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const middle = (await search.boundingBox())!
  const row = (await bar.boundingBox())!
  expect(Math.abs(middle.x + middle.width / 2 - row.x - row.width / 2)).toBeLessThan(2)
  await search.fill('交付')
  await expect(results).toHaveText('交付记录')
  await nav.evaluate(element => {
    const preview = element.parentElement!
    const status = preview.querySelector('[role="status"]')!
    preview.addEventListener('transitionrun', event => {
      if (event.target === preview && ['inline-size', 'width'].includes(event.propertyName)) {
        element.setAttribute('data-test-width-motion', getComputedStyle(preview).transitionTimingFunction)
      }
    })
    const gap = status.getBoundingClientRect().top - element.getBoundingClientRect().bottom
    let remaining = 180
    function sample() {
      const height = element.getAnimations().find(animation => animation.id === 'sy-navbar-reflow-height')
      const move = element.querySelector('.sy-navbar__actions')!.getAnimations().find(animation => animation.id === 'sy-navbar-reflow')
      const progress = height?.effect?.getComputedTiming().progress ?? 0
      if (height && move && progress > .02 && progress < .98) {
        const box = element.getBoundingClientRect()
        const frames = (height.effect as KeyframeEffect).getKeyframes()
        const from = parseFloat(String(frames[0]!.blockSize))
        const to = parseFloat(String(frames[1]!.blockSize))
        if (box.height > from && box.height < to && Math.abs(status.getBoundingClientRect().top - box.bottom - gap) < 1) {
          element.setAttribute('data-test-reflow', move.effect!.getTiming().easing)
          return
        }
      }
      if (--remaining > 0) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await width.press('ArrowDown')
  await page.getByRole('option', { name: '自动换行' }).click()
  await expect(nav).toHaveAttribute('data-test-width-motion', /cubic-bezier/)
  await expect(nav).toHaveAttribute('data-test-reflow', /cubic-bezier/)
  await expect.poll(() => nav.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.id.startsWith('sy-navbar-reflow')).length)).toBe(0)
  expect((await clear.boundingBox())!.y).toBeGreaterThan(middle.y - row.y + (await bar.boundingBox())!.y)
  expect(await nav.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await expect(search).toHaveValue('交付')

  await search.focus()
  await nav.evaluate(element => { element.parentElement!.style.inlineSize = '225px' })
  const toggle = nav.getByRole('button', { name: '打开项目搜索' })
  await expect(toggle).toBeFocused()
  await toggle.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(search).toHaveValue('交付')
  await expect(nav.locator('input')).toHaveCount(1)
  await expect.poll(() => nav.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await search.focus()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await nav.evaluate(element => { element.parentElement!.style.inlineSize = '100%' })
  await expect(search).toBeFocused()
  await expect(toggle).toBeHidden()
  expect(await nav.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.id.startsWith('sy-navbar-reflow')).length)).toBe(0)
  await clear.click()
  await expect(search).toHaveValue('')
  await expect(results).toHaveText('品牌指南、交付记录、组件文档')
})

test('the theme lab settles the navigation row, header and following content together', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '导航行尺寸' }).click()
  const sample = preview.getByRole('group', { name: '导航尺寸预览' })
  const fit = sample.getByRole('status')
  const reading = fit.locator('.sy-visually-hidden')
  const header = sample.locator('.sy-layout-header')
  const row = sample.locator('.sy-navbar__bar')
  const picker = preview.getByRole('combobox', { name: '头部与导航尺寸' })
  const pick = async (name: string) => {
    await picker.press('ArrowDown')
    await page.getByRole('option', { name, exact: true }).click()
  }
  await expect(header).toHaveCSS('height', '68px')
  await expect(row).toHaveCSS('height', '60px')
  await expect(reading).toHaveText('导航行可用 60 px')
  await sample.evaluate(node => {
    const header = node.querySelector('.sy-layout-header')!
    const row = node.querySelector('.sy-navbar__bar')!
    const content = node.querySelector('.theme-navigation-preview__content')!
    const offset = () => content.getBoundingClientRect().top - header.getBoundingClientRect().top
    const observer = new MutationObserver(() => {
      const sizeEffect = (element: Element) => element.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => 'blockSize' in frame))
      const hostEffect = sizeEffect(header)
      const rowEffect = sizeEffect(row)
      if (!hostEffect || !rowEffect) return
      observer.disconnect()
      const aligned = hostEffect.startTime === rowEffect.startTime
      const easing = rowEffect.effect!.getTiming().easing
      const start = offset()
      for (const effect of node.getAnimations({ subtree: true })) {
        const duration = effect.effect?.getTiming().duration
        if (typeof duration === 'number' && duration > 0) effect.currentTime = duration / 4
      }
      const progress = offset() - start
      node.setAttribute('data-test-navigation-motion', JSON.stringify({ aligned, easing, start, progress }))
    })
    observer.observe(node, { childList: true, characterData: true, subtree: true })
  })
  await pick('头部高度不同')
  await expect(sample).toHaveAttribute('data-test-navigation-motion', /cubic-bezier/)
  const motion = JSON.parse((await sample.getAttribute('data-test-navigation-motion'))!)
  expect(motion.aligned).toBe(true)
  expect(motion.start).toBeCloseTo(68, 0)
  expect(motion.progress).toBeGreaterThan(2)
  expect(motion.progress).toBeLessThan(8)
  await expect(header).toHaveCSS('height', '76px')
  await expect(row).toHaveCSS('height', '48px')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(sample).toHaveCSS('background-color', 'rgb(248, 248, 248)')
  await expect(sample).toHaveCSS('border-top-width', '0px')

  await pick('导航项超出高度')
  await expect(header).toHaveCSS('height', '40px')
  await expect(row).toHaveCSS('height', '28px')
  await expect(fit).toHaveAttribute('data-overflow', '')
  await expect(reading).toHaveText('可用 28 px · 评审需要 48 px')
  await expect(sample.getByRole('link', { name: '评审', exact: true })).toHaveCSS('height', '48px')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)

  await pick('导航项内边距过大')
  const item = sample.getByRole('link', { name: '评审', exact: true })
  await expect(header).toHaveCSS('height', '40px')
  await expect(reading).toHaveText('可用 40 px · 评审需要 51 px')
  await expect(item).toHaveCSS('padding-block-start', '16px')
  await item.evaluate(node => {
    const observer = new ResizeObserver(() => {
      const effect = node.getAnimations().find(animation => (animation.effect as KeyframeEffect | null)?.getKeyframes()
        .some(frame => 'paddingBlockStart' in frame))?.effect
      if (!effect) return
      node.setAttribute('data-test-compact-repair', effect.getTiming().easing)
      observer.disconnect()
    })
    observer.observe(node)
  })
  await pick('收紧导航项内边距')
  await expect(item).toHaveAttribute('data-test-compact-repair', /cubic-bezier/)
  await expect(item).toHaveCSS('padding-block-start', '10.5px')
  await expect(header).toHaveCSS('height', '40px')
  await expect(reading).toHaveText('导航行可用 40 px')
  await expect(fit).not.toHaveAttribute('data-overflow')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pick('单独设置导航行')
  await expect(row).toHaveCSS('height', '54px')
  await expect(reading).toHaveText('导航行可用 60 px')
  expect(await row.evaluate(node => node.getAnimations().length)).toBe(0)
})

test('native navigation states animate between intrinsic and themed dimensions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '导航行尺寸' }).click()
  const picker = preview.getByRole('combobox', { name: '头部与导航尺寸' })
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: '悬停与键盘焦点' }).click()
  const sample = preview.getByRole('group', { name: '导航尺寸预览' })
  const reading = sample.getByRole('status').locator('.sy-visually-hidden')
  const link = sample.getByRole('link', { name: '评审', exact: true })
  const brand = sample.getByRole('link', { name: '交付工作台', exact: true })
  await expect(reading).toHaveText('导航行可用 40 px')
  await expect(link).toHaveCSS('height', '32px')

  const observeHeight = (from: number, to: number) => link.evaluate((element, { from, to }) => {
    element.removeAttribute('data-test-state-motion')
    const observer = new ResizeObserver(() => {
      const height = element.getBoundingClientRect().height
      if (height <= Math.min(from, to) + .25 || height >= Math.max(from, to) - .25) return
      const effect = element.getAnimations().find(animation => (animation.effect as KeyframeEffect | null)?.getKeyframes()
        .some(frame => 'height' in frame || 'blockSize' in frame))?.effect
      if (!effect) return
      element.setAttribute('data-test-state-motion', effect.getTiming().easing)
      observer.disconnect()
    })
    observer.observe(element)
  }, { from, to })
  const moved = () => expect(link).toHaveAttribute('data-test-state-motion', /cubic-bezier/)

  await observeHeight(32, 48)
  await link.hover()
  await moved()
  await expect(reading).toHaveText('可用 40 px · 评审需要 48 px')

  await observeHeight(48, 44)
  await page.mouse.down()
  await moved()
  await expect(reading).toHaveText('可用 40 px · 评审需要 44 px')
  await link.evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }))
  await page.mouse.up()
  await expect(reading).toHaveText('可用 40 px · 评审需要 48 px')

  await observeHeight(48, 32)
  await page.mouse.move(0, 0)
  await moved()
  await expect(reading).toHaveText('导航行可用 40 px')

  const keyboardFocus = async () => {
    await brand.press('Tab')
    // WebKit on macOS can require Option-Tab to include links.
    if (!await link.evaluate(element => element.matches(':focus-visible'))) await brand.press('Alt+Tab')
    await expect(link).toBeFocused()
  }
  await observeHeight(32, 56)
  await keyboardFocus()
  await moved()
  await expect(reading).toHaveText('可用 40 px · 评审需要 56 px')
  await expect(link).toHaveCSS('padding-inline-start', '14px')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await picker.focus()
  await expect(link).toHaveCSS('height', '32px')
  await keyboardFocus()
  await expect(link).toHaveCSS('height', '56px')
  expect(await link.evaluate(element => element.getAnimations().length)).toBe(0)
})

test('the theme lab repairs dark media controls and captions on its white page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '媒体文字配色' }).click()
  const opener = preview.getByRole('button', { name: '打开交付图片' })
  const repair = preview.getByRole('switch', { name: '修正媒体文字色' })
  const dialog = page.getByRole('dialog', { name: '交付图片' })
  const caption = dialog.locator('.sy-lightbox__caption-preview')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(repair).toBeChecked()
  await expect(opener).toHaveCSS('color', 'rgb(37, 37, 37)')
  await repair.click()
  await expect(opener).toHaveCSS('color', 'rgb(241, 241, 241)')
  await opener.click()
  await expect(caption).toHaveCSS('color', 'rgb(52, 52, 52)')
  await dialog.getByRole('button', { name: '关闭交付图片' }).click()
  await expect(opener).toBeFocused()
  await repair.click()
  await expect(opener).toHaveCSS('color', 'rgb(37, 37, 37)')
  await opener.click()
  await expect(caption).toHaveCSS('color', 'rgb(241, 241, 241)')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await dialog.getByRole('button', { name: '关闭交付图片' }).click()
  await expect(opener).toBeFocused()
})

test('the theme lab animates an outlined danger button through hover, press, and loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  const disclosure = preview.getByRole('button', { name: '按钮状态配色' })
  await disclosure.click()
  const group = preview.getByRole('group', { name: '按钮配色预览' })
  const danger = group.locator('[data-variant="danger"]')
  const primary = group.getByRole('button', { name: '主按钮' })
  const primaryFill = await primary.evaluate(node => getComputedStyle(node).backgroundColor)
  const switcher = preview.getByRole('switch', { name: '危险按钮描边' })
  await danger.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'border-top-color') node.setAttribute('data-outline-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await switcher.click()
  await expect(danger).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(danger).toHaveCSS('border-top-width', '1px')
  await expect(danger).toHaveAttribute('data-outline-easing', /cubic-bezier/)
  expect(await danger.evaluate(node => getComputedStyle(node).borderTopColor)).toBe(await danger.evaluate(node => getComputedStyle(node).color))
  await expect(primary).toHaveCSS('background-color', primaryFill)
  await danger.hover()
  await expect(danger).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const restingShadow = await danger.evaluate(node => getComputedStyle(node).boxShadow)
  await page.mouse.down()
  await expect(danger).not.toHaveCSS('box-shadow', restingShadow)
  await page.mouse.up()
  await expect(danger).toHaveAttribute('aria-busy', 'true')
  await expect(danger.locator('.sy-button__spinner')).toHaveAttribute('data-spinning', 'true')
  await expect(danger).toHaveAccessibleName('恢复样例')
  await expect(danger).not.toHaveAttribute('aria-busy', 'true')
  await expect(danger).toBeFocused()
  await page.mouse.move(0, 0)
  const secondary = group.getByRole('button', { name: '次按钮' })
  await secondary.press('Tab')
  if (!await danger.evaluate(element => element.matches(':focus-visible'))) await secondary.press('Alt+Tab')
  await expect(danger).toBeFocused()
  await expect(danger).toHaveCSS('outline-width', '2px')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await switcher.click()
  await expect(danger).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await danger.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates progress geometry, paint, and loading on white', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '进度条样式' }).click()
  const sample = preview.getByRole('group', { name: '进度条预览' })
  const progress = sample.getByRole('progressbar', { name: '资料同步' })
  const track = progress.locator('.sy-measure__track')
  const fill = progress.locator('.sy-measure__fill')
  const loader = progress.locator('.sy-measure__sweep > span')
  const success = sample.getByRole('progressbar', { name: '已校验' }).locator('.sy-measure__fill')
  const successPaint = await success.evaluate(node => getComputedStyle(node).backgroundColor)
  await expect(track).toHaveCSS('height', '8px')
  await track.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === '--sy-progress-track-height') {
      node.setAttribute('data-test-progress-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  const thin = preview.getByRole('switch', { name: '细轨道' })
  await thin.click()
  await expect(track).toHaveCSS('height', '4px')
  await expect(track).toHaveAttribute('data-test-progress-easing', /cubic-bezier/)
  await preview.getByRole('switch', { name: '分别配色' }).click()
  await expect(fill).toHaveCSS('background-color', 'rgb(54, 89, 117)')
  await expect(success).toHaveCSS('background-color', successPaint)

  const pending = preview.getByRole('switch', { name: '加载中' })
  await pending.click()
  await expect(progress).not.toHaveAttribute('aria-valuenow')
  await expect(fill).toHaveCSS('opacity', '0')
  await expect(loader).toHaveCSS('background-color', 'rgb(98, 77, 115)')
  await expect(loader).toHaveCSS('animation-play-state', 'running')
  await expect(loader).toHaveCSS('animation-timing-function', /cubic-bezier/)
  await page.getByRole('switch', { name: '减少预览动效' }).click()
  await expect(loader).toHaveCSS('animation-name', 'sy-measure-pulse')
  await thin.click()
  await expect(track).toHaveCSS('height', '8px')
  expect(await track.evaluate(node => node.getAnimations().length)).toBe(0)
  await pending.click()
  await preview.getByRole('button', { name: '更新进度' }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '76')
  await expect(fill).toHaveCSS('opacity', '1')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates choice marks and follows the actual switch drag and loading states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '选择控件标记' }).click()
  const group = preview.getByRole('group', { name: '选择控件预览' })
  const assets = group.getByRole('checkbox', { name: '包含源文件' })
  const checked = assets.locator('..').locator(':scope > .sy-checkbox__box')
  const mixed = group.getByRole('checkbox', { name: '复核附件' }).locator('..').locator(':scope > .sy-checkbox__box')
  const radio = group.getByRole('radio', { name: '团队预览' }).locator('..').locator(':scope > .sy-radio__ring')
  const scheduled = group.getByRole('switch', { name: '发送发布提醒' })
  const track = scheduled.locator('..').locator(':scope > .sy-switch__track')
  const thumb = track.locator('.sy-switch__thumb')
  const boxFill = await checked.evaluate(node => getComputedStyle(node).backgroundColor)
  const checkMark = checked.locator('.sy-checkbox__check')
  await checkMark.evaluate(node => node.addEventListener('transitionrun', event => {
    if ((event as TransitionEvent).propertyName === 'color') {
      node.setAttribute('data-test-mark-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  const colors = preview.getByRole('switch', { name: '自定义控件标记' })
  await colors.click()
  await expect(checkMark).toHaveCSS('fill', 'rgb(255, 240, 192)')
  await expect(mixed.locator('.sy-checkbox__mixed')).toHaveCSS('fill', 'rgb(241, 224, 255)')
  await expect.poll(() => radio.evaluate(node => getComputedStyle(node, '::after').backgroundColor)).toBe('rgb(54, 89, 117)')
  await expect(checkMark).toHaveAttribute('data-test-mark-easing', /cubic-bezier/)
  await expect(checked).toHaveCSS('background-color', boxFill)
  await colors.press('Tab')
  if (!await assets.evaluate(element => element.matches(':focus-visible'))) await colors.press('Alt+Tab')
  await expect(assets).toBeFocused()
  await expect(checked).toHaveCSS('outline-width', '2px')

  await expect(thumb).toHaveCSS('background-color', 'rgb(98, 77, 115)')
  await track.scrollIntoViewIfNeeded()
  const box = (await track.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 7, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 24, y, { steps: 4 })
  await expect(track).toHaveAttribute('data-preview', 'true')
  await expect(scheduled).not.toBeChecked()
  await expect(thumb).toHaveCSS('background-color', 'rgb(255, 238, 204)')
  await page.mouse.up()
  await expect(scheduled).toHaveAttribute('aria-busy', 'true')
  await expect(thumb.locator('.sy-spinner')).toBeVisible()
  await expect(scheduled).not.toHaveAttribute('aria-busy', 'true')
  await expect(scheduled).toBeChecked()
  await expect(thumb).toHaveCSS('background-color', 'rgb(255, 238, 204)')

  const publish = group.getByRole('radio', { name: '公开发布' })
  const ring = publish.locator('..').locator(':scope > .sy-radio__ring')
  await publish.press('Space')
  await expect(publish).toHaveAttribute('aria-busy', 'true')
  await expect(ring.locator('.sy-spinner')).toBeVisible()
  await expect.poll(() => ring.evaluate(node => getComputedStyle(node, '::after').scale)).toBe('0')
  await expect(publish).not.toHaveAttribute('aria-busy', 'true')
  await expect(publish).toBeChecked()
  await expect.poll(() => ring.evaluate(node => getComputedStyle(node, '::after').scale)).toBe('1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await colors.click()
  await expect(thumb).not.toHaveCSS('background-color', 'rgb(255, 238, 204)')
  expect(await checked.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab applies grouped toggle styles in a compact white layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  await page.getByRole('button', { name: '切换按钮组', exact: true }).click()
  const group = page.getByRole('group', { name: '交付视图' })
  const list = group.getByRole('button', { name: '列表' })
  const board = group.getByRole('button', { name: '看板' })
  await page.getByRole('switch', { name: '自定义组样式' }).click()
  await expect(group).toHaveCSS('gap', '6px')
  await expect(group).toHaveCSS('transition-timing-function', /cubic-bezier/)
  await expect(list).toHaveCSS('background-color', 'rgb(230, 237, 231)')
  await board.press('Space')
  await expect(board).toHaveCSS('background-color', 'rgb(230, 237, 231)')
  await expect(list).not.toHaveCSS('background-color', 'rgb(230, 237, 231)')
  await expect(board).toHaveCSS('border-top-width', '0px')
  await page.getByRole('switch', { name: '纵向排列' }).click()
  await expect(group).toHaveAttribute('data-orientation', 'vertical')
  expect(await board.evaluate(node => node.getAnimations().some(animation =>
    (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.translate)))).toBe(true)
  await expect(board).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab handles optimistic toggle actions and failure on white', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  await page.getByRole('button', { name: '异步切换', exact: true }).click()
  const sample = page.getByRole('group', { name: '异步切换预览' })
  const pin = sample.getByRole('button', { name: '固定预览资料', exact: true })
  await pin.evaluate(node => node.addEventListener('transitionrun', event => {
    const target = event.target as HTMLElement
    if (event.propertyName === 'opacity' && target.matches('.sy-spinner')) {
      node.setAttribute('data-test-spinner-easing', getComputedStyle(target).transitionTimingFunction)
    }
  }))
  await pin.press('Space')
  await expect(pin).toHaveAttribute('aria-pressed', 'true')
  await expect(pin).toHaveAttribute('aria-busy', 'true')
  await expect(pin.locator('.sy-spinner')).toBeVisible()
  await expect(pin).toHaveAttribute('data-test-spinner-easing', /cubic-bezier/)
  await expect(pin).toBeFocused()
  await expect(pin).not.toHaveAttribute('aria-busy')
  await sample.getByRole('switch', { name: '模拟保存失败' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pin.press('Space')
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  await expect(pin.locator('.sy-spinner__ring')).toHaveCSS('animation-name', 'none')
  await expect(sample.getByRole('alert')).toHaveText('保存失败，请重试')
  await expect(pin).toHaveAttribute('aria-pressed', 'true')
  await expect(pin).not.toHaveAttribute('aria-busy')
  await expect(pin).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab resolves simultaneous states with nonlinear transitions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  await page.getByRole('button', { name: '组合状态', exact: true }).click()
  const sample = page.getByRole('group', { name: '组合状态预览' })
  const pin = sample.getByRole('button', { name: '固定交付资料', exact: true })
  const configure = sample.getByRole('switch', { name: '自定义组合状态' })
  const lock = sample.getByRole('switch', { name: '锁定附件选项' })
  const attachment = sample.getByRole('checkbox', { name: '包含交付附件' })
  const box = attachment.locator('..').locator('.sy-checkbox__box')
  const glyph = () => box.locator('.sy-checkbox__check').evaluate(node => getComputedStyle(node).fill)
  await configure.click()
  await pin.hover()
  await expect(pin).toHaveCSS('background-color', 'rgb(237, 242, 245)')
  await configure.hover()
  await pin.press('Space')
  await expect(pin).toHaveAttribute('aria-pressed', 'true')
  await expect(pin).toHaveCSS('background-color', 'rgb(226, 236, 227)')
  await pin.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'background-color') node.setAttribute('data-test-state-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await pin.hover()
  await expect(pin).toHaveCSS('background-color', 'rgb(234, 225, 240)')
  await expect(pin).toHaveAttribute('data-test-state-easing', /cubic-bezier/)
  await configure.hover()
  await expect(pin).toHaveCSS('background-color', 'rgb(226, 236, 227)')
  await expect.poll(glyph).toBe('rgb(255, 240, 192)')
  await lock.click()
  await expect(attachment).toBeChecked()
  await expect(attachment).toBeDisabled()
  await expect.poll(glyph).toBe('rgb(232, 215, 246)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await lock.press('Space')
  await expect(attachment).toBeEnabled()
  await expect.poll(glyph).toBe('rgb(255, 240, 192)')
  expect(await box.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates independent button and overlay details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '控件图标', exact: true }).click()
  const group = preview.getByRole('group', { name: '控件图标预览' })
  await expect(group.getByRole('combobox', { name: '预览权限' })).toBeVisible()
  const select = page.locator('[data-sy-brand="component-icons"] .sy-select__control')
  const arrow = select.locator('.sy-select__arrow')
  const opener = group.getByRole('button', { name: '打开预览对话框' })
  const notify = group.getByRole('button', { name: '显示通知' })
  const openerInk = await opener.evaluate(node => getComputedStyle(node).color)
  const text = await select.evaluate(node => getComputedStyle(node).color)
  const transform = await arrow.evaluate(node => getComputedStyle(node).transform)
  await arrow.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'color') node.setAttribute('data-test-color-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  const customize = group.getByRole('switch', { name: '自定义控件图标' })
  await customize.click()
  await expect(opener.locator('.sy-button__start path')).toHaveCSS('stroke', 'rgb(54, 89, 117)')
  await expect(notify.locator('.sy-button__end path')).toHaveCSS('stroke', 'rgb(54, 89, 117)')
  await opener.hover()
  await expect(opener.locator('.sy-button__start path')).toHaveCSS('stroke', 'rgb(98, 77, 115)')
  await expect(opener).toHaveCSS('color', openerInk)
  await expect(arrow).toHaveCSS('border-bottom-color', 'rgb(54, 89, 117)')
  await expect(arrow).toHaveAttribute('data-test-color-easing', /cubic-bezier/)
  await expect(select).toHaveCSS('color', text)
  await select.press('ArrowDown')
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  await expect(arrow).toHaveCSS('border-bottom-color', 'rgb(98, 77, 115)')
  await expect(arrow).not.toHaveCSS('transform', transform)
  await page.keyboard.press('Escape')
  await expect(arrow).toHaveCSS('border-bottom-color', 'rgb(54, 89, 117)')

  await opener.press('Enter')
  const dialog = page.getByRole('dialog', { name: '预览资料' })
  const title = dialog.getByRole('heading', { name: '预览资料' })
  const size = await title.evaluate(node => getComputedStyle(node).fontSize)
  await title.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'font-size') node.setAttribute('data-test-title-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await dialog.getByRole('switch', { name: '强调标题' }).press('Space')
  await expect(title).toHaveCSS('font-size', '22px')
  await expect(title).toHaveCSS('font-weight', '800')
  await expect(title).toHaveAttribute('data-test-title-easing', /cubic-bezier/)
  await dialog.getByRole('switch', { name: '强调标题' }).press('Space')
  await expect(title).toHaveCSS('font-size', size)
  const name = dialog.getByRole('textbox', { name: '预览名称' })
  await title.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'opacity') node.setAttribute('data-test-text-easing', getComputedStyle(event.target as HTMLElement).transitionTimingFunction)
  }))
  await name.fill('交付资料')
  const renamed = page.getByRole('dialog', { name: '交付资料' })
  await expect(renamed.getByRole('heading', { name: '交付资料' })).toHaveAttribute('data-test-text-easing', /cubic-bezier/)
  await expect(renamed.getByRole('textbox', { name: '预览名称' })).toBeFocused()
  await renamed.getByRole('textbox', { name: '预览名称' }).fill('预览资料')
  const dismiss = dialog.getByRole('button', { name: '关闭预览', exact: true })
  await expect(dismiss.locator('.sy-dialog__close-icon')).toHaveCSS('color', 'rgb(119, 81, 73)')
  await expect(dismiss).not.toHaveCSS('color', 'rgb(119, 81, 73)')
  await expect(dialog.locator('.sy-dialog__panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await dismiss.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()

  await notify.click()
  const toast = page.getByRole('button', { name: '关闭主题通知' })
  await expect(toast).toHaveCSS('color', 'rgb(54, 89, 117)')
  await toast.hover()
  await expect(toast).toHaveCSS('color', 'rgb(98, 77, 115)')
  await toast.press('Enter')
  await expect(toast).toBeHidden()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await customize.click()
  await expect(arrow).not.toHaveCSS('border-bottom-color', 'rgb(54, 89, 117)')
  expect(await arrow.evaluate(node => node.getAnimations().length)).toBe(0)
  await opener.press('Enter')
  await page.getByRole('dialog', { name: '预览资料' }).getByRole('textbox', { name: '预览名称' }).fill('最终预览')
  const reducedTitle = page.getByRole('dialog', { name: '最终预览' }).getByRole('heading', { name: '最终预览' })
  await expect(reducedTitle).toBeVisible()
  expect(await reducedTitle.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab separates picker selection from range and calendar focus styles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '日历日期样式' }).click()
  const sample = preview.getByRole('group', { name: '日期样式预览' })
  const days = (iso: string) => `.sy-calendar__day[data-value="${iso}"]:not([data-outside-view])`
  const range = sample.getByRole('group', { name: '评审日期范围' })
  const start = range.locator(days('2026-11-23'))
  const interior = range.locator(days('2026-11-25'))
  const end = range.locator(days('2026-11-27'))
  await expect(start).toHaveAttribute('data-selection-start')
  await expect(end).toHaveAttribute('data-selection-end')
  const endpointPaint = await start.evaluate(node => getComputedStyle(node).backgroundColor)
  const field = sample.locator('.sy-date-control')
  const fieldPaint = await field.evaluate(node => getComputedStyle(node).backgroundColor)
  await interior.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'background-color') node.setAttribute('data-test-day-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  const custom = preview.getByRole('switch', { name: '自定义日期样式' })
  await custom.click()
  await expect(interior).toHaveCSS('background-color', 'rgb(236, 239, 242)')
  await expect(interior).toHaveAttribute('data-test-day-easing', /cubic-bezier/)
  await expect(start).toHaveCSS('background-color', endpointPaint)
  await expect(end).toHaveCSS('background-color', endpointPaint)
  await expect(field).toHaveCSS('background-color', fieldPaint)

  const trigger = sample.getByRole('button', { name: '选择交付日期' })
  await trigger.press('Enter')
  const popup = page.locator('.sy-calendar-popup[data-state="open"]')
  const selected = popup.locator(days('2026-11-24'))
  const next = popup.locator(days('2026-11-25'))
  await expect(selected).toHaveCSS('background-color', 'rgb(54, 89, 117)')
  await selected.press('ArrowRight')
  await expect(next).toBeFocused()
  await expect(next).toHaveCSS('outline-color', 'rgb(98, 77, 115)')
  await expect(next).toHaveCSS('outline-width', '2px')
  await expect(selected).toHaveCSS('outline-width', '0px')
  await next.press('Enter')
  await expect(popup).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  await expect(next).toHaveAttribute('data-selected')
  await expect(next).toHaveCSS('background-color', 'rgb(54, 89, 117)')
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await custom.click()
  await expect(interior).not.toHaveCSS('background-color', 'rgb(236, 239, 242)')
  expect(await interior.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates independent focus rings by status and mode without resizing fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '输入焦点环' }).click()
  const fields = preview.getByRole('group', { name: '输入焦点环预览' })
  const normal = fields.getByRole('textbox', { name: '项目编号', exact: true })
  const invalid = fields.getByRole('textbox', { name: '无效的项目编号' })
  const grouped = fields.getByRole('textbox', { name: '交付链接' })
  const customize = preview.getByRole('switch', { name: '自定义焦点环' })
  const dark = preview.getByRole('switch', { name: '深色预览' })
  await expect(normal).toHaveCSS('outline-width', '0px')
  await dark.press('Tab')
  await expect(normal).toBeFocused()
  await expect(normal).toHaveCSS('outline-width', '2px')
  const size = await normal.evaluate(node => [node.offsetWidth, node.offsetHeight])
  await normal.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'outline-color') node.setAttribute('data-focus-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await customize.evaluate(node => node.click())
  await expect(normal).toBeFocused()
  await expect(normal).toHaveCSS('outline-color', 'rgb(54, 89, 117)')
  await expect(normal).toHaveAttribute('data-focus-easing', /cubic-bezier/)
  await normal.press('Tab')
  await expect(invalid).toBeFocused()
  await expect(invalid).toHaveCSS('outline-width', '3px')
  await expect(invalid).toHaveCSS('outline-offset', '-3px')
  await expect(invalid).toHaveCSS('outline-color', 'rgb(150, 54, 48)')
  await invalid.press('Tab')
  await expect(grouped).toBeFocused()
  await expect(fields.locator('.sy-input-group')).toHaveCSS('outline-offset', '-2px')
  await expect(fields.locator('.sy-input-group')).toHaveCSS('outline-color', 'rgb(54, 89, 117)')
  await normal.focus()
  await dark.evaluate(node => node.click())
  await expect(normal).toHaveCSS('outline-width', '1px')
  await expect(normal).toHaveCSS('outline-color', 'rgb(166, 197, 223)')
  expect(await normal.evaluate(node => [node.offsetWidth, node.offsetHeight])).toEqual(size)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await customize.evaluate(node => node.click())
  await expect(normal).toHaveCSS('outline-width', '2px')
  expect(await normal.evaluate(node => node.getAnimations().length)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('the theme lab animates compact menu shapes and keeps the theme on nested and portaled panels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '菜单面板' }).click()
  const trigger = preview.getByRole('button', { name: '资料菜单', exact: true })
  const menu = page.getByRole('menu', { name: '资料菜单', exact: true })
  await trigger.press('Enter')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveCSS('border-top-width', '0px')
  await expect(menu).toHaveCSS('padding-top', '5px')
  await menu.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'padding-top') node.setAttribute('data-size-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await menu.getByRole('menuitemcheckbox', { name: '紧凑面板' }).press('Enter')
  await expect(menu).toHaveCSS('padding-top', '3px')
  await expect(menu).toHaveCSS('border-top-left-radius', '4px')
  await expect(menu).toHaveCSS('border-bottom-left-radius', '10px')
  await expect(menu).toHaveAttribute('data-size-easing', /cubic-bezier/)
  await expect(menu).toHaveCSS('--sy-floating-clip-radius', '4px 4px 10px 10px')
  await menu.getByRole('menuitem', { name: '切换资料' }).press('ArrowRight')
  const submenu = page.locator('.sy-menu[data-menu-variant="submenu"][data-state="open"]')
  await expect(submenu).toHaveCSS('border-bottom-left-radius', '10px')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()

  const contextTrigger = preview.getByRole('button', { name: '资料右键菜单' })
  await contextTrigger.press('Shift+F10')
  const context = page.getByRole('menu', { name: '资料右键菜单' })
  await expect(context).toHaveCSS('border-bottom-left-radius', '10px')
  await page.keyboard.press('Escape')
  await expect(contextTrigger).toBeFocused()

  for (const [label, selector] of [['默认资料', ':not([data-multiple])'], ['包含资料', '[data-multiple]']]) {
    await preview.getByRole('combobox', { name: label }).press('Enter')
    const popup = page.locator(`.sy-select__popup${selector}[data-state="open"]`)
    await expect(popup).toHaveCSS('border-bottom-left-radius', '10px')
    await page.keyboard.press('Escape')
  }
  const search = preview.getByRole('combobox', { name: '查找资料' })
  await search.fill('交付')
  await expect(search).toHaveAttribute('aria-busy', 'true')
  const results = page.locator('.sy-popover:has(> .sy-base-typeahead__results)')
  await expect(results).toHaveCSS('padding-top', '5px')
  await expect(results.getByRole('option', { name: '交付说明' })).toBeVisible()
  await expect(search).not.toHaveAttribute('aria-busy', 'true')
  await search.press('Escape')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab fades and collapses menu separators while keyboard navigation stays active', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '菜单面板' }).click()
  const trigger = preview.getByRole('button', { name: '资料菜单', exact: true })
  await trigger.press('Enter')
  const menu = page.getByRole('menu', { name: '资料菜单', exact: true })
  const divider = menu.getByRole('separator')
  const toggle = menu.getByRole('menuitemcheckbox', { name: '显示分隔线' })
  const tint = menu.getByRole('menuitemcheckbox', { name: '加深分隔线' })
  await expect(divider).toHaveCSS('height', '1px')
  const startColor = await divider.evaluate(node => getComputedStyle(node).backgroundColor)
  await divider.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'height' || event.propertyName === 'background-color') {
      node.setAttribute('data-test-menu-' + event.propertyName, getComputedStyle(node).transitionTimingFunction)
    }
  }))
  await tint.press('Enter')
  await expect(divider).toHaveCSS('background-color', 'rgb(175, 175, 175)')
  await expect(divider).toHaveAttribute('data-test-menu-background-color', /cubic-bezier/)
  await toggle.press('Enter')
  await expect(divider).toHaveCSS('height', '0px')
  await expect(divider).toHaveAttribute('data-test-menu-height', /cubic-bezier/)
  await expect(toggle).toBeFocused()
  await tint.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: '切换资料' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()

  const contextTrigger = preview.getByRole('button', { name: '资料右键菜单' })
  await contextTrigger.press('Shift+F10')
  const context = page.getByRole('menu', { name: '资料右键菜单' }).getByRole('separator')
  await expect(context).toHaveCSS('height', '1px')
  await expect(context).toHaveCSS('background-color', startColor)
  await page.keyboard.press('Escape')
  await expect(contextTrigger).toBeFocused()

  const touchTrigger = preview.getByRole('button', { name: '触屏菜单' })
  await touchTrigger.press('Enter')
  const sheet = page.getByRole('dialog', { name: '触屏菜单' })
  await expect(sheet.getByRole('separator')).toHaveCSS('height', '0px')
  await expect(sheet.getByRole('separator')).toHaveCSS('border-width', '0px')
  await sheet.getByRole('button', { name: '交付说明' }).press('Enter')
  await expect(sheet).toBeHidden()
  await expect(touchTrigger).toBeFocused()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await trigger.press('Enter')
  await toggle.press('Enter')
  await expect(divider).toHaveCSS('height', '1px')
  expect(await divider.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('the theme lab animates optional parts while leaving their content and keyboard interactions available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  await page.getByRole('button', { name: '可选部件', exact: true }).click()
  const group = page.getByRole('group', { name: '可选部件预览' })
  const copy = group.getByRole('button', { name: '复制命令' })
  const header = group.locator('.sy-code-block__header')
  const icon = group.locator('.sy-banner__icon')
  const mark = group.locator('.sy-tabs__indicator')
  const copyToggle = page.getByRole('switch', { name: '显示复制按钮' })
  const bannerToggle = page.getByRole('switch', { name: '显示横幅图标' })
  const tabToggle = page.getByRole('switch', { name: '显示标签页下划线' })
  await expect(copy).toBeVisible()
  await expect(header).toHaveCSS('height', '34px')
  for (const [element, properties] of [[header, ['grid-template-rows']], [icon, ['inline-size', 'width']], [mark, ['opacity']]] as const) {
    await element.evaluate((node, names) => {
      node.addEventListener('transitionrun', event => {
        if (names.some(name => name === event.propertyName)) node.setAttribute('data-test-part-easing', getComputedStyle(node).transitionTimingFunction)
      })
      const animate = node.animate.bind(node)
      node.animate = (frames, options) => {
        const motion = animate(frames, options)
        if (motion.id === 'sy-theme-piece' && Array.isArray(frames) && frames.some(frame => names.some(name => name in frame || name === 'inline-size' && 'inlineSize' in frame))) {
          node.setAttribute('data-test-part-easing', motion.effect!.getTiming().easing)
        }
        return motion
      }
    }, properties)
  }
  await copyToggle.press('Space')
  await expect(copy).toHaveCount(0)
  await expect(header).toHaveCSS('height', '0px')
  await expect(header).toHaveAttribute('data-test-part-easing', /cubic-bezier/)
  await tabToggle.press('Tab')
  await expect(group.getByRole('region', { name: '发布命令' })).toBeFocused()
  await expect(group.getByText('pnpm build', { exact: true })).toBeVisible()

  await bannerToggle.press('Space')
  await expect(icon).toBeHidden()
  await expect(icon).toHaveAttribute('data-test-part-easing', /cubic-bezier/)
  await expect(group.getByText('文档构建成功')).toBeVisible()
  await expect(group.getByRole('button', { name: '关闭横幅' })).toBeEnabled()

  await tabToggle.press('Space')
  await expect(mark).toBeHidden()
  await expect(mark).toHaveAttribute('data-test-part-easing', /cubic-bezier/)
  await group.getByRole('tab', { name: '构建' }).press('ArrowRight')
  await expect(group.getByRole('tab', { name: '预览' })).toHaveAttribute('aria-selected', 'true')
  await expect(group.getByRole('tabpanel')).toHaveText('预览已就绪')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await copyToggle.press('Space')
  await expect(copy).toBeVisible()
  await expect(header).toHaveCSS('height', '34px')
  expect(await header.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates the tab indicator between a subtle fill and a line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '标签页选中指示' }).click()
  const list = preview.getByRole('tablist', { name: '交付视图' })
  const mark = list.locator('.sy-tabs__indicator')
  const track = list.locator('.sy-tabs__indicator-track')
  const overview = list.getByRole('tab', { name: '概览' })
  const activity = list.getByRole('tab', { name: '活动' })
  const toggle = preview.getByRole('switch', { name: '使用细线' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(list).toHaveCSS('border-bottom-width', '0px')
  await expect(mark).toHaveCSS('height', '28px')
  await mark.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'height') node.setAttribute('data-shape-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await track.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'translate') node.setAttribute('data-move-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await toggle.click()
  await expect(mark).toHaveCSS('height', '3px')
  await expect(mark).toHaveAttribute('data-shape-easing', /cubic-bezier/)
  await overview.press('ArrowRight')
  await expect(activity).toBeFocused()
  await expect(activity).toHaveAttribute('aria-selected', 'true')
  await expect(track).toHaveAttribute('data-move-easing', /cubic-bezier/)
  await expect.poll(async () => Math.abs((await mark.boundingBox())!.x - (await activity.boundingBox())!.x)).toBeLessThan(1)
  await list.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'opacity' && (event.target as HTMLElement).closest('.sy-tabs__label')) {
      node.setAttribute('data-label-easing', getComputedStyle(event.target as HTMLElement).transitionTimingFunction)
    }
  }))
  await preview.getByRole('switch', { name: '使用完整标签' }).click()
  const expanded = list.getByRole('tab', { name: '最近活动' })
  await expect(expanded).toHaveAttribute('aria-selected', 'true')
  await expect(list).toHaveAttribute('data-label-easing', /cubic-bezier/)
  await expect.poll(async () => Math.abs((await mark.boundingBox())!.width - (await expanded.boundingBox())!.width)).toBeLessThan(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.click()
  await expect(mark).toHaveCSS('height', '28px')
  expect(await mark.evaluate(node => node.getAnimations().length)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('the theme lab animates table density and optional dividers on white', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '表格间距' }).click()
  const table = preview.getByRole('table', { name: '交付记录' })
  const bodyCell = table.getByRole('cell', { name: '品牌规范' })
  const header = table.getByRole('columnheader', { name: '资料' })
  const compact = preview.getByRole('switch', { name: '收紧单元格' })
  const dividers = preview.getByRole('switch', { name: '显示行分隔线' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(bodyCell).toHaveCSS('padding-top', '5px')
  await expect(bodyCell).toHaveCSS('box-shadow', 'none')
  await bodyCell.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'padding-top') node.setAttribute('data-density-easing', getComputedStyle(node).transitionTimingFunction)
    if (event.propertyName === 'box-shadow') node.setAttribute('data-divider-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await compact.click()
  await expect(bodyCell).toHaveCSS('padding-top', '2px')
  await expect(header).toHaveCSS('padding-top', '2px')
  await expect(bodyCell).toHaveAttribute('data-density-easing', /cubic-bezier/)
  await dividers.click()
  await expect(bodyCell).toHaveCSS('box-shadow', /inset/)
  await expect(bodyCell).toHaveAttribute('data-divider-easing', /cubic-bezier/)
  await header.getByRole('button').click()
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await compact.click()
  await dividers.click()
  await expect(bodyCell).toHaveCSS('padding-top', '5px')
  await expect(bodyCell).toHaveCSS('box-shadow', 'none')
  expect(await bodyCell.evaluate(node => node.getAnimations().length)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('the theme lab scales display headings as a hierarchy and preserves the document outline', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  await page.getByRole('button', { name: '展示标题', exact: true }).click()
  const group = page.getByRole('group', { name: '展示标题预览' })
  const heading = group.getByRole('heading', { name: '设计规范', level: 2 })
  const progress = group.getByRole('heading', { name: '发布进度', exact: true })
  const update = group.getByRole('heading', { name: '最新更新', level: 4 })
  const scale = page.getByRole('switch', { name: '放大标题' })
  await expect(heading).toHaveCSS('font-size', '48px')
  await expect(progress).toHaveCSS('font-size', '36px')
  await expect(update).toHaveCSS('font-size', '28px')
  expect(await progress.evaluate(node => node.tagName)).toBe('H2')
  await expect(progress).toHaveAttribute('aria-level', '3')
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const announced = nodes.find(node => node.role?.value === 'heading' && node.name?.value === '发布进度')
    expect(announced?.properties?.find(property => property.name === 'level')?.value.value).toBe(3)
    await cdp.detach()
  }
  const firstDistance = () => group.evaluate(node => {
    const boxes = [...node.querySelectorAll('h2')].map(heading => heading.getBoundingClientRect().top)
    return boxes[1] - boxes[0]
  })
  const original = await firstDistance()
  await heading.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'font-size') node.setAttribute('data-test-ease', getComputedStyle(node).transitionTimingFunction)
  }))
  await scale.press('Space')
  await expect(heading).toHaveAttribute('data-test-ease', /cubic-bezier/)
  await expect(heading).toHaveCSS('font-size', '60px')
  await expect(progress).toHaveCSS('font-size', '45px')
  await expect(update).toHaveCSS('font-size', '35px')
  expect(await firstDistance()).toBeGreaterThan(original)
  await expect(group).toHaveCSS('border-top-width', '0px')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await scale.press('Space')
  await expect(heading).toHaveCSS('font-size', '48px')
  expect(await heading.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the theme lab animates inherited heading sizes while preserving a local override', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '主题继承' }).click()
  const examples = preview.getByRole('group', { name: '继承字号预览' })
  const inherited = examples.getByRole('heading', { name: '基础主题标题' })
  const local = examples.getByRole('heading', { name: '手动指定的四级标题' })
  await expect(inherited).toHaveCSS('font-size', '26px')
  await expect(local).toHaveCSS('font-size', '16px')
  await inherited.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'font-size') node.setAttribute('data-size-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  const toggle = preview.getByRole('switch', { name: '应用通用标题字号 20 px' })
  await toggle.click()
  await expect(inherited).toHaveCSS('font-size', '20px')
  await expect(inherited).toHaveAttribute('data-size-easing', /cubic-bezier/)
  await expect(local).toHaveCSS('font-size', '16px')
  await expect(examples).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.click()
  await expect(inherited).toHaveCSS('font-size', '26px')
  expect(await inherited.evaluate(node => node.getAnimations().length)).toBe(0)
})

test('font roles crossfade independently on white and respect reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const theme = page.getByRole('region', { name: '主题预览' })
  await theme.getByRole('button', { name: '字体角色' }).click()
  const preview = theme.getByRole('group', { name: '字体预览' })
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const heading = preview.getByRole('heading', { name: 'Project review' })
  const body = preview.getByText('Delivery notes', { exact: true })
  const code = preview.getByText('status = ready', { exact: true })
  const family = (element: Element) => getComputedStyle(element).fontFamily
  const bodyBefore = await body.evaluate(family)
  const codeBefore = await code.evaluate(family)
  await heading.evaluate(node => {
    const animate = node.animate
    node.animate = function (...args) {
      const effect = animate.apply(this, args)
      const easing = effect.effect?.getTiming().easing
      if (easing) node.setAttribute('data-font-easing', easing)
      return effect
    }
  })
  const picker = theme.getByRole('combobox', { name: '标题字体' })
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: 'Georgia', exact: true }).click()
  await expect(heading).toHaveCSS('font-family', 'Georgia, serif')
  await expect(heading).toHaveAttribute('data-font-easing', /cubic-bezier/)
  await expect(body).toHaveCSS('font-family', bodyBefore)
  await expect(code).toHaveCSS('font-family', codeBefore)
  await expect(theme.locator('[data-layout-swap-copy]')).toHaveCount(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await heading.evaluate(node => node.removeAttribute('data-font-easing'))
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: 'Tahoma', exact: true }).click()
  await expect(heading).toHaveCSS('font-family', 'Tahoma, sans-serif')
  expect(await heading.getAttribute('data-font-easing')).toBeNull()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('theme borders ease on a white preview while an input can keep its original width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const theme = page.getByRole('region', { name: '主题预览' })
  await theme.getByRole('button', { name: '全局边框' }).click()
  const preview = theme.getByRole('group', { name: '边框预览' })
  const card = preview.locator('.sy-card')
  const input = preview.getByRole('textbox', { name: '评审名称' })
  const action = preview.getByRole('button', { name: '查看详情' })
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(action).toHaveCSS('border-top-color', 'rgb(225, 225, 225)')
  for (const element of [card, input, action]) await expect(element).toHaveCSS('border-top-width', '1px')
  await card.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'border-top-width') {
      node.setAttribute('data-border-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))

  const preserve = theme.getByRole('switch', { name: '保留输入框的 1 px 边框' })
  await preserve.check()
  const picker = theme.getByRole('combobox', { name: '全局边框厚度' })
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: '3 px', exact: true }).click()
  await expect(card).toHaveCSS('border-top-width', '3px')
  await expect(card).toHaveAttribute('data-border-easing', /cubic-bezier/)
  await expect(action).toHaveCSS('border-top-width', '3px')
  await expect(input).toHaveCSS('border-top-width', '1px')

  await preserve.uncheck()
  await expect(input).toHaveCSS('border-top-width', '3px')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await card.evaluate(node => node.removeAttribute('data-border-easing'))
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: '1 px', exact: true }).click()
  await expect(card).toHaveCSS('border-top-width', '1px')
  expect(await card.getAttribute('data-border-easing')).toBeNull()
  await expect(theme).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('the theme lab animates three levels of shadow on a white canvas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const theme = page.getByRole('region', { name: '主题预览' })
  await theme.getByRole('button', { name: '阴影层级' }).click()
  const preview = theme.getByRole('group', { name: '阴影层级预览' })
  const cards = preview.locator('.sy-card')
  await expect(cards).toHaveCount(3)
  const shadows = () => cards.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).boxShadow))
  const original = await shadows()
  expect(new Set(original).size).toBe(3)
  expect(original).not.toContain('none')
  await cards.last().evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'box-shadow') {
      node.setAttribute('data-shadow-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  const picker = theme.getByRole('combobox', { name: '阴影浓度' })
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: '深', exact: true }).click()
  await expect(cards.last()).toHaveAttribute('data-shadow-easing', /cubic-bezier/)
  await expect.poll(async () => (await shadows()).filter((entry, index) => entry !== original[index]).length).toBe(3)
  for (const surface of [page.locator('body'), preview, ...(await cards.all())]) {
    await expect(surface).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await cards.last().evaluate(node => node.removeAttribute('data-shadow-easing'))
  await picker.press('ArrowDown')
  await page.getByRole('option', { name: '标准', exact: true }).click()
  await expect.poll(shadows).toEqual(original)
  expect(await cards.last().getAttribute('data-shadow-easing')).toBeNull()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.offsetWidth)).toBe(0)
})

test('a white input keeps the bevel visible through hover, keyboard focus, and invalid status', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/themes/')
  const theme = page.getByRole('region', { name: '主题预览' })
  await theme.getByRole('button', { name: '阴影层级' }).click()
  const preview = theme.getByRole('group', { name: '输入框阴影预览' })
  const bevel = preview.getByRole('switch', { name: '内凹描边' })
  const invalid = preview.getByRole('switch', { name: '模拟校验失败' })
  const input = preview.getByRole('textbox', { name: '资料编号' })
  const read = () => input.evaluate(node => getComputedStyle(node).boxShadow)
  await expect.poll(read).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 1px inset$/)
  await bevel.check()
  await expect.poll(read).toMatch(/-1px -1px 0px 0px inset/)
  const rest = await read()
  const bevelLayers = rest.split(' inset, ').slice(1).join(' inset, ')
  await input.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.target === node && event.propertyName === 'box-shadow') {
      node.setAttribute('data-field-shadow-easing', getComputedStyle(node).transitionTimingFunction)
    }
  }))
  await input.hover()
  await expect(input).toHaveAttribute('data-field-shadow-easing', /cubic-bezier/)
  await expect.poll(async () => {
    const value = await read()
    return value !== rest && value.endsWith(bevelLayers)
  }).toBe(true)
  const hover = await read()
  await invalid.focus()
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()
  await expect(input).toHaveCSS('outline-style', 'solid')
  await expect(input).toHaveCSS('outline-width', '2px')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await invalid.check()
  await input.hover()
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect.poll(async () => {
    const value = await read()
    return value !== hover && value !== rest && value.endsWith(bevelLayers)
  }).toBe(true)
  expect(await input.evaluate(node => node.getAnimations().length)).toBe(0)
  for (const surface of [page.locator('body'), preview, input]) {
    await expect(surface).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  }

  await invalid.uncheck()
  await bevel.hover()
  await input.evaluate(node => {
    node.style.setProperty('--sy-field-resting-shadow', ', 0 4px 9px rgb(25 25 25 / .2)')
  })
  const outer = 'rgba(25, 25, 25, 0.2) 0px 4px 9px 0px'
  await expect.poll(read).toMatch(/inset, rgba\(25, 25, 25, 0\.2\) 0px 4px 9px 0px$/)
  const unhovered = await read()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await input.evaluate(node => node.addEventListener('transitionstart', event => {
    if (event.target !== node || event.propertyName !== 'box-shadow') return
    const motion = node.getAnimations().find(animation => 'transitionProperty' in animation && animation.transitionProperty === 'box-shadow')
    const duration = motion?.effect?.getComputedTiming().activeDuration
    if (!motion || typeof duration !== 'number') return
    motion.pause()
    motion.currentTime = duration / 2
    node.setAttribute('data-shadow-midpoint', getComputedStyle(node).boxShadow)
    motion.play()
  }, { once: true }))
  await input.hover()
  await expect(input).toHaveAttribute('data-shadow-midpoint', /inset,/)
  const midpoint = await input.getAttribute('data-shadow-midpoint')
  expect(midpoint).not.toBe(unhovered)
  expect(midpoint?.endsWith(outer)).toBe(true)
})

test('the theme lab highlights readable option labels and descriptions by keyboard and pointer', async ({ page }) => {
  await page.goto('/themes/')
  const preview = page.getByRole('region', { name: '主题预览' })
  await preview.getByRole('button', { name: '选项行高亮' }).click()
  const samples = preview.getByRole('group', { name: '选项样式预览' })
  await samples.getByRole('switch', { name: '使用深色高亮' }).click()
  const tokenCode = page.locator('.theme-demo .code-block code')
  await expect(tokenCode).toContainText('--sy-option-label-color: #ffffff;')
  await expect(tokenCode).toContainText('--sy-option-description-color: #ffffff;')
  const highlighted = async (row: Locator) => {
    await expect(row).toHaveAttribute('data-highlighted', /^(?:true)?$/)
    await expect(row).toHaveCSS('background-color', 'rgb(51, 75, 59)')
    await expect(row).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(row.locator('small')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(row.locator('small')).toHaveCSS('transition-timing-function', /cubic-bezier/)
  }
  const select = samples.getByRole('combobox', { name: '交付阶段', exact: true })
  await select.press('ArrowDown')
  const selector = page.locator('.sy-select__popup')
  await highlighted(selector.locator('[data-highlighted][role="option"]'))
  const unavailable = selector.getByRole('option', { name: '正式发布' })
  await expect(unavailable).toHaveAttribute('aria-disabled', 'true')
  await expect(unavailable).not.toHaveCSS('background-color', 'rgb(51, 75, 59)')
  await page.keyboard.press('Escape')
  const search = samples.getByRole('combobox', { name: '搜索交付阶段' })
  await search.focus()
  await search.press('ArrowDown')
  const suggestions = page.getByRole('listbox', { name: '搜索交付阶段' })
  await highlighted(suggestions.locator('[data-highlighted][role="option"]'))
  await search.press('Escape')
  await expect(suggestions).toBeHidden()
  await samples.getByRole('button', { name: '打开候选项' }).click()
  const candidate = samples.locator('.sy-candidates').getByRole('option', { name: '发送评审' })
  await candidate.hover()
  await highlighted(candidate)
  await candidate.click()
  const shortcut = samples.getByRole('button', { name: '交付快捷操作' })
  await shortcut.click()
  const action = page.getByRole('menuitem', { name: '准备材料' })
  await action.hover()
  await highlighted(action)
  await action.click()
  await expect(select).toContainText('准备材料')
  const item = samples.getByRole('listbox', { name: '可选交付阶段' }).getByRole('option', { name: '发送评审' })
  await expect(item).toHaveAccessibleDescription('邀请团队核对交付资料')
  await item.hover()
  await highlighted(item)
  await item.click()
  await expect(select).toContainText('发送评审')
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('reviewed empty states and inline code keep working on their official component pages', async ({ page }) => {
  const examples = '/docs/standard-design/examples/'
  const search = page.getByRole('searchbox', { name: '搜索对照清单' })
  await page.goto(examples)
  await search.fill('EmptyStateActions')
  await page.getByRole('row', { name: /^EmptyStateActions / }).getByRole('link', { name: '试用对应示例' }).click()
  await expect(page.getByRole('region', { name: '资料筛选结果' }).getByRole('heading', { name: '找不到归档资料' })).toBeVisible()
  await page.goto(examples)
  await search.fill('CodeAcrossTextSizes')
  await page.getByRole('row', { name: /^CodeAcrossTextSizes / }).getByRole('link', { name: '试用对应示例' }).click()
  const heading = page.getByRole('heading', { name: '准备 release 目录' })
  const fontSize = await heading.evaluate(node => getComputedStyle(node).fontSize)
  await expect(heading.locator('code')).toHaveCSS('font-size', fontSize)
})

for (const example of [
  { name: '查找交付资料', panel: '.sy-candidates', busy: '正在读取交付资料…' },
  { name: '在资料库中检索', panel: '.sy-base-typeahead__results', busy: '正在检索资料库…' },
]) {
  test(`the ${example.name} example synchronizes async suggestions with the viewport`, async ({ page }) => {
    await page.goto('/docs/vue/components/autocomplete/')
    const input = page.getByRole('combobox', { name: example.name, exact: true })
    await input.focus()
    const frame = page.locator(`${example.panel} .sy-collection-content`)
    await expect(frame.getByRole('option', { name: '品牌手册' })).toBeVisible()
    await frame.evaluate(node => {
      const observer = new MutationObserver(() => requestAnimationFrame(() => {
        const body = node.firstElementChild!
        if (!body.querySelector('[role="option"]')) return
        const resize = node.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.blockSize))
        const reveal = body.getAnimations().find(animation =>
          (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.opacity))
        const copy = node.querySelector<HTMLElement>('[data-layout-swap-copy]')
        if (!resize || !reveal || !copy) return
        node.setAttribute('data-test-resize-easing', resize.effect!.getTiming().easing)
        node.setAttribute('data-test-aligned-start', String(resize.startTime === reveal.startTime))
        node.setAttribute('data-test-copy-inert', String(copy.inert && copy.getAttribute('aria-hidden') === 'true'
          && !copy.querySelector('[id], [data-reka-collection-item]')))
        observer.disconnect()
      }))
      observer.observe(node, { childList: true, subtree: true })
    })
    await input.fill('品牌')
    await expect(frame.getByRole('status')).toContainText(example.busy)
    await expect(frame.getByRole('option', { name: '品牌版式' })).toBeVisible()
    await expect(frame).toHaveAttribute('data-test-resize-easing', /cubic-bezier/)
    await expect(frame).toHaveAttribute('data-test-aligned-start', 'true')
    await expect(frame).toHaveAttribute('data-test-copy-inert', 'true')
    await input.press('ArrowDown')
    await expect(input).toHaveAttribute('aria-activedescendant', /\S/)
    const highlighted = await input.evaluate(node => node.ownerDocument.getElementById(node.getAttribute('aria-activedescendant') ?? '')?.getAttribute('aria-label'))
    expect(highlighted).toBeTruthy()
    await input.press('Enter')
    await expect(input).toHaveValue(highlighted!)
    await expect(input).toBeFocused()

    await page.getByRole('switch', { name: '模拟资料库不可用' }).click()
    await input.fill('旧资料')
    await input.fill('色彩')
    await expect(frame.getByRole('status')).toHaveText('资料库不可用')
    await expect(frame.getByRole('option')).toHaveCount(0)
    await expect(frame.locator('[data-layout-swap-copy]')).toHaveCount(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('switch', { name: '模拟资料库不可用' }).click()
    await input.fill('不存在的资料')
    await expect(frame.getByRole('status')).toHaveText('未找到资料')
    await expect(frame.locator('[data-layout-swap-copy]')).toHaveCount(0)
    expect(await frame.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)
  })
}

test('sortable detail tables carry an in-flight row into a rapid re-sort and expose sort priority', async ({ page }) => {
  await page.goto('/templates/table-collapsible/')
  const table = page.getByRole('table', { name: '设计组' })
  const size = table.getByRole('button', { name: '文件数', exact: true })
  const owner = table.getByRole('button', { name: '负责人', exact: true })
  await size.press('Enter')
  await expect(table.getByRole('columnheader', { name: '文件数' })).toHaveAttribute('aria-sort', 'ascending')
  const flight = await size.evaluate(async button => {
    const row = button.closest('table')!.querySelector<HTMLTableRowElement>('tbody tr')!
    const step = () => new Promise(requestAnimationFrame)
    const current = () => row.getAnimations().find(animation =>
      (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.translate))
    ;(button as HTMLButtonElement).click()
    await step()
    const first = current()
    if (!first) return { resumed: false }
    const frames = (first.effect as KeyframeEffect).getKeyframes()
    const positions = frames.map(item => Number.parseFloat(String(item.translate).split(' ')[1]))
    const traveled = positions[0] - positions[1]
    first.pause()
    first.currentTime = 60
    const before = row.getBoundingClientRect().top
    ;(button as HTMLButtonElement).click()
    await step()
    const second = current()
    if (!second) return { resumed: false }
    second.pause()
    second.currentTime = 0
    const delta = Math.abs(row.getBoundingClientRect().top - before)
    second.finish()
    return { resumed: second !== first, delta, nonlinear: positions.length > 2 && Math.abs(positions[1] - positions[2] - traveled) > .01 }
  })
  expect(flight.resumed).toBe(true)
  expect(flight.delta).toBeLessThan(2)
  expect(flight.nonlinear).toBe(true)
  await expect(size).toBeFocused()

  await size.press('Enter')
  await owner.press('Shift+Enter')
  await expect(size.locator('[data-priority]')).toHaveAttribute('data-priority', '1')
  await expect(owner.locator('[data-priority]')).toHaveAttribute('data-priority', '2')
  await expect(owner).toHaveAttribute('aria-description', '第 2 排序优先级，升序')
  await expect(table.getByRole('columnheader', { name: '负责人' })).not.toHaveAttribute('aria-sort')
  await owner.press('Shift+Enter')
  await expect(owner).toHaveAttribute('aria-description', '第 2 排序优先级，降序')
  await owner.press('Shift+Enter')
  await expect(table.locator('[data-priority]')).toHaveCount(0)
  await expect(owner).toBeFocused()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await size.press('Enter')
  await expect(table.getByRole('columnheader', { name: '文件数' })).toHaveAttribute('aria-sort', 'descending')
  expect(await table.locator('tbody').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)
})

test('table-filter inspection fades the details in place and retains the row focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/templates/table-filter/')
  const table = page.getByRole('table', { name: '交付资料', exact: true })
  const pane = page.getByRole('complementary', { name: '资料详情' })
  const brand = table.getByRole('button', { name: '品牌资源', exact: true })
  const review = table.getByRole('button', { name: '组件评审', exact: true })
  await expect(brand).toBeVisible()
  await pane.evaluate(element => {
    const observe = new MutationObserver(() => requestAnimationFrame(() => {
      const copy = element.querySelector<HTMLElement>('[data-layout-swap-copy]')
      const live = element.querySelector<HTMLElement>('div:not([data-layout-swap-copy])')
      const fade = live?.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.opacity))
      if (!copy || !fade) return
      const next = live!.getBoundingClientRect()
      const previous = copy.getBoundingClientRect()
      if (Math.abs(previous.top - next.top) < 1 && Math.abs(previous.left - next.left) < 1 && copy.inert) {
        element.dataset.testDetailFade = fade.effect!.getTiming().easing
      }
      observe.disconnect()
    }))
    observe.observe(element, { childList: true, subtree: true })
  })
  await brand.press('Enter')
  await expect(pane.getByRole('heading', { name: '品牌资源' })).toBeVisible()
  await expect(pane).toHaveAttribute('data-test-detail-fade', /cubic-bezier/)
  await expect(brand).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(pane.locator('[data-layout-swap-copy]')).toHaveCount(0)
  await review.press('Enter')
  await expect(pane.getByRole('heading', { name: '组件评审' })).toBeVisible()
  await expect(pane.locator('[data-layout-swap-copy]')).toHaveCount(0)
  await expect(review).toBeFocused()
})

test('table filtering fades only removed rows and starts the height and remaining rows together', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 })
  await page.goto('/templates/table-page/')
  const table = page.getByRole('table', { name: '资料目录', exact: true })
  const viewport = table.locator('..')
  await expect(table.getByRole('row')).toHaveCount(5)
  await viewport.evaluate(node => {
    const observer = new MutationObserver(() => requestAnimationFrame(() => {
      const old = node.querySelector<HTMLTableElement>('[data-layout-swap-copy]')
      const live = node.querySelector<HTMLTableElement>('table:not([data-layout-swap-copy])')
      const rows = live?.tBodies[0]?.rows
      if (!old || rows?.length !== 2) return
      const departing = Array.from(old.tBodies[0].rows).filter(row => row.style.opacity !== '0').map(row => row.cells[2].textContent?.trim())
      const glide = rows[0].getAnimations().find(animation => (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.translate))
      const fade = old.getAnimations()[0]
      const shrink = node.getAnimations().find(animation => (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.blockSize))
      node.setAttribute('data-test-row-departures', JSON.stringify(departing))
      node.setAttribute('data-test-row-motion', String(Boolean(glide && fade && shrink && glide.startTime === fade.startTime && fade.startTime === shrink.startTime)))
      node.setAttribute('data-test-row-inert', String(old.inert && old.getAttribute('aria-hidden') === 'true' && !old.querySelector('[id], [name]')))
      observer.disconnect()
    }))
    observer.observe(node, { childList: true, subtree: true })
  })
  const scope = page.getByRole('button', { name: '工程组', exact: true })
  await scope.press('Space')
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(viewport).toHaveAttribute('data-test-row-departures', '["团队交付指南","品牌资料归档"]')
  await expect(viewport).toHaveAttribute('data-test-row-motion', 'true')
  await expect(viewport).toHaveAttribute('data-test-row-inert', 'true')
  await expect(viewport.locator('[data-layout-swap-copy]')).toHaveCount(0)
  await expect(scope).toBeFocused()
})

test('table loading hands focus to the table and animates the controls below the rows', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 })
  await page.goto('/docs/vue/components/table/')
  await page.getByRole('button', { name: '加载更多的表格' }).click()
  const demo = page.getByRole('region', { name: '表格加载过渡' })
  const table = demo.getByRole('table', { name: '交付记录', exact: true })
  const region = demo.getByRole('region', { name: '交付记录', exact: true })
  const clear = demo.getByRole('button', { name: '清空交付记录' })
  await demo.scrollIntoViewIfNeeded()
  await region.evaluate(viewport => {
    const observer = new MutationObserver(() => requestAnimationFrame(() => {
      const live = viewport.querySelector(':scope > table:not([data-layout-swap-copy])')!
      const content = live.querySelector('tbody')!
      if (!content.querySelector('[data-sy-row-parity]')) return
      const resize = viewport.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.blockSize))
      const fade = content.getAnimations().find(animation =>
        (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.opacity))
      const outgoing = viewport.querySelector<HTMLTableElement>('table[data-layout-swap-copy]')
      if (!resize || !fade || !outgoing) return
      viewport.setAttribute('data-test-table-easing', resize.effect!.getTiming().easing)
      viewport.setAttribute('data-test-table-aligned', String(resize.startTime === fade.startTime))
      viewport.setAttribute('data-test-table-copy-hidden', String(outgoing.inert && outgoing.getAttribute('aria-hidden') === 'true'
        && getComputedStyle(outgoing.tHead!).visibility === 'hidden'))
      viewport.setAttribute('data-test-table-bottom', String(viewport.getBoundingClientRect().bottom))
      observer.disconnect()
    }))
    observer.observe(viewport, { childList: true, subtree: true })
  })
  await table.getByRole('button', { name: '加载交付记录' }).press('Enter')
  await expect(table).toHaveAttribute('aria-busy', 'true')
  await expect(region).toBeFocused()
  const ring = table.locator('.sy-spinner__ring')
  await expect(ring).toHaveCSS('animation-name', 'sy-spin')
  await expect(table.getByRole('rowheader', { name: '发布日志 4' })).toBeVisible()
  await expect(region).toHaveAttribute('data-test-table-easing', /cubic-bezier/)
  await expect(region).toHaveAttribute('data-test-table-aligned', 'true')
  await expect(region).toHaveAttribute('data-test-table-copy-hidden', 'true')
  const firstBottom = Number(await region.getAttribute('data-test-table-bottom'))
  await expect.poll(() => clear.evaluate(node => node.getBoundingClientRect().top)).toBeGreaterThan(firstBottom + 20)
  await expect(region.locator('[data-layout-swap-copy]')).toHaveCount(0)
  await expect(table.getByRole('row')).toHaveCount(5)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await clear.click()
  await expect(table.getByRole('button', { name: '加载交付记录' })).toBeVisible()
  await expect(region.locator('[data-layout-swap-copy]')).toHaveCount(0)
  expect(await region.evaluate(node => node.getAnimations().length + (node.querySelector('tbody')?.getAnimations().length ?? 0))).toBe(0)
})

for (const reduced of [false, true]) {
  test(`template search ${reduced ? 'updates immediately with reduced motion' : 'synchronizes the results count and cards'}`, async ({ page }) => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/templates/')
    const filter = page.getByRole('searchbox', { name: '筛选模板' })
    const running = await filter.evaluate(node => {
      (node as HTMLInputElement).value = 'dashboard-progress'
      node.dispatchEvent(new Event('input', { bubbles: true }))
      const copy = document.querySelector<HTMLElement>('[data-site-departure]')
      const previousCount = document.querySelector<HTMLElement>('[data-site-text-copy]')
      const count = document.querySelector('[data-template-count]')?.getAnimations().find(effect => effect.playState !== 'finished')
      const previousText = previousCount?.getAnimations()[0]
      const departure = copy?.getAnimations().find(effect => effect.playState !== 'finished')
      const survivor = document.querySelector('[data-template-card][href="/templates/dashboard-progress/"]')?.getAnimations().find(effect =>
        (effect.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame.translate || frame.opacity && frame.transform))
      return {
        count: Boolean(count),
        departure: Boolean(copy && !copy.hidden && copy.inert && !copy.hasAttribute('href') && departure),
        aligned: Boolean(count && departure && survivor && count.startTime === departure.startTime && count.startTime === survivor.startTime),
        countSwap: Boolean(previousCount?.inert && previousCount.getAttribute('aria-hidden') === 'true'
          && !previousCount.hasAttribute('data-template-count') && previousText && previousText.startTime === count?.startTime),
      }
    })
    expect(running).toEqual({ count: !reduced, departure: !reduced, aligned: !reduced, countSwap: !reduced })
    await expect(page.locator('[data-template-count]')).toHaveText('1 个模板')
    await expect(page.getByRole('link', { name: /排期与进度/ })).toBeVisible()
    await expect(page).toHaveURL(/q=dashboard-progress/)
    await expect(page.locator('[data-site-departure]')).toHaveCount(0)
    await expect(page.locator('[data-site-text-copy]')).toHaveCount(0)
  })
}

test('a rapid template count replacement carries its visible outgoing text into the next filter', async ({ page }) => {
  await page.goto('/templates/')
  const filter = page.getByRole('searchbox', { name: '筛选模板' })
  const observed = await filter.evaluate(node => {
    const count = document.querySelector<HTMLElement>('[data-template-count]')!
    const original = count.textContent
    const change = (query: string) => {
      (node as HTMLInputElement).value = query
      node.dispatchEvent(new Event('input', { bubbles: true }))
    }
    change('dashboard-progress')
    const copy = document.querySelector<HTMLElement>('[data-site-text-copy]')!
    count.getAnimations()[0].currentTime = 8
    copy.getAnimations()[0].currentTime = 8
    const previous = Number(getComputedStyle(copy).opacity)
    change('不匹配的模板 abcxyz')
    const replacement = copy.getAnimations()[0]
    const frame = (replacement.effect as KeyframeEffect).getKeyframes()[0]
    return {
      label: copy.textContent === original,
      count: document.querySelectorAll('[data-site-text-copy]').length,
      continuity: Math.abs(Number(frame.opacity) - previous) < .01,
      easing: replacement.effect?.getTiming().easing,
    }
  })
  expect(observed).toEqual({ label: true, count: 1, continuity: true, easing: expect.stringMatching(/^cubic-bezier/) })
  await expect(page.locator('[data-template-count]')).toHaveText('0 个模板')
  await expect(page.locator('[data-site-text-copy]')).toHaveCount(0)
})

test('the template category highlight moves across rows and preserves focus on white', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 820 })
  await page.goto('/templates/?category=native')
  const track = page.locator('[data-site-filter-selection]')
  const indicator = track.locator('[data-site-filter-indicator]')
  const active = track.locator('[aria-pressed="true"]')
  await expect(active).toHaveText('Native')
  const aligned = () => track.evaluate(node => {
    const mark = node.querySelector('[data-site-filter-indicator]')!.getBoundingClientRect()
    const selected = node.querySelector('[aria-pressed="true"]')!.getBoundingClientRect()
    return Math.abs(mark.x - selected.x) < 1 && Math.abs(mark.y - selected.y) < 1 && Math.abs(mark.width - selected.width) < 1
  })
  await expect.poll(aligned).toBe(true)
  await indicator.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'translate') node.setAttribute('data-test-glide', getComputedStyle(node).transitionTimingFunction)
  }))
  const all = track.getByRole('button', { name: '全部', exact: true })
  await all.press('Enter')
  await expect(all).toBeFocused()
  await expect(indicator).toHaveAttribute('data-test-glide', /cubic-bezier/)
  await expect.poll(aligned).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const native = track.getByRole('button', { name: 'Native', exact: true })
  await native.press('Enter')
  await expect(native).toBeFocused()
  await expect.poll(aligned).toBe(true)
  expect(await indicator.evaluate(node => node.getAnimations().length)).toBe(0)
  await expect(indicator).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})
