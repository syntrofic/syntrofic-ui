import { expect, test } from '@playwright/test'

test('keeps aspect ratios stable through image loading and failure', async ({ page }) => {
  let deliver!: () => void
  const pending = new Promise<void>(resolve => { deliver = resolve })
  await page.route(/profile-chen[^/]*\.jpg(?:\?|$)/, async route => {
    if (route.request().resourceType() === 'image') await pending
    await route.continue()
  })
  await page.goto('/?component=W.aspect-ratio', { waitUntil: 'domcontentloaded' })
  const samples = page.getByRole('region', { name: '等高比例对照' }).locator('.sy-aspect-ratio')
  await expect(samples).toHaveCount(4)
  const dimensions = await samples.evaluateAll(nodes => nodes.map(node => {
    const { width, height } = node.getBoundingClientRect()
    return { width, height }
  }))
  expect(dimensions.map(item => Math.round(item.height))).toEqual([90, 90, 90, 90])
  expect(dimensions.map(item => Math.round(item.width))).toEqual([90, 120, 160, 90])
  const region = page.getByRole('region', { name: '照片加载占位' })
  const frame = region.locator('.sy-aspect-ratio')
  const picture = frame.locator('.sy-image')
  try {
    await region.getByRole('switch', { name: '显示骨架占位' }).click()
    await expect(picture).toHaveAttribute('data-image-state', 'pending')
    await expect(picture.locator('.sy-image__placeholder')).toBeVisible()
  } finally {
    deliver()
  }
  const bounds = (await frame.boundingBox())!
  await expect(picture).toHaveAttribute('data-image-state', 'ready')
  const image = frame.getByRole('img', { name: '工程资料肖像' })
  await expect(image).toHaveCSS('object-fit', 'contain')
  await region.getByRole('switch', { name: '模拟图片不可用' }).click()
  await expect(picture).toHaveAttribute('data-image-state', 'failed')
  await expect(image).toHaveClass(/sy-image__fallback/)
  expect((await frame.boundingBox())!.height).toBe(bounds.height)
})

test('the image placeholder waits for a decoded frame after the network load', async ({ page }) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this)
      if (this.alt !== '工程资料肖像') return
      this.dataset.testDecoding = ''
      await new Promise<void>(resolve => document.addEventListener('test-image-decoded', () => resolve(), { once: true }))
    }
  })
  await page.goto('/?component=W.aspect-ratio')
  const region = page.getByRole('region', { name: '照片加载占位' })
  await region.getByRole('switch', { name: '显示骨架占位' }).check()
  const picture = region.locator('.sy-image')
  const image = picture.getByRole('img', { name: '工程资料肖像' })
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveAttribute('data-test-decoding', '')
  await expect(picture).toHaveAttribute('data-image-state', 'pending')
  await expect(picture.locator('.sy-image__placeholder')).toBeVisible()
  await expect(image).toHaveCSS('opacity', '0')
  await page.evaluate(() => document.dispatchEvent(new Event('test-image-decoded')))
  await expect(picture).toHaveAttribute('data-image-state', 'ready')
  await expect(image).toHaveCSS('opacity', '1')
  await expect(picture.locator('.sy-image__placeholder')).toHaveCount(0)
})

test('retains the painted image during replacement, eases its new height, and ignores late requests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let releasePlan = () => {}
  let releaseTeam = () => {}
  const plan = new Promise<void>(resolve => { releasePlan = resolve })
  const team = new Promise<void>(resolve => { releaseTeam = resolve })
  await page.route('**/*?view=image-switch-plan', async route => { await plan; await route.continue() })
  await page.route('**/*?view=image-switch-team', async route => { await team; await route.continue() })
  await page.goto('/?component=W.aspect-ratio')
  const preview = page.getByRole('region', { name: '照片替换预览' })
  const image = preview.locator('.sy-image')
  const status = preview.getByRole('status')
  const previous = image.locator('[data-image-layer="previous"]')
  try {
    await expect(image).toHaveAttribute('data-image-state', 'ready')
    await expect(image.getByRole('img', { name: '交付成员照片' })).toHaveCSS('opacity', '1')
    await expect(image.locator('.sy-image__placeholder')).toHaveCount(0)
    const initial = (await image.boundingBox())!
    const initialOffset = (await status.boundingBox())!.y - initial.y
    await image.evaluate(node => {
      const animate = node.animate.bind(node)
      node.animate = (frames, options) => {
        const result = animate(frames, options)
        const keyframes = (result.effect as KeyframeEffect).getKeyframes()
        if (keyframes.some(frame => 'blockSize' in frame)) {
          node.setAttribute('data-test-size-easing', result.effect!.getTiming().easing)
          node.setAttribute('data-test-from', String(keyframes[0]?.blockSize))
          node.setAttribute('data-test-to', String(keyframes.at(-1)?.blockSize))
        }
        return result
      }
    })
    await preview.getByRole('button', { name: '载入配送范围图' }).click()
    await expect(image).toHaveAttribute('data-image-state', 'pending')
    await expect(previous).toHaveCSS('opacity', '1')
    await expect(previous).toHaveAttribute('aria-hidden', 'true')
    await expect(image.getByRole('img', { name: '配送范围图' })).toHaveAttribute('aria-busy', 'true')
    await expect(image.locator('.sy-image__placeholder')).toHaveCount(0)
    const pending = (await image.boundingBox())!
    expect(pending.height).toBeCloseTo(initial.height)
    expect((await status.boundingBox())!.y - pending.y).toBeCloseTo(initialOffset)
    releasePlan()
    await expect(image).toHaveAttribute('data-image-state', 'ready')
    await expect(image).toHaveAttribute('data-test-size-easing', /cubic-bezier/)
    expect(Number.parseFloat((await image.getAttribute('data-test-from'))!)).toBeCloseTo(initial.height)
    expect(Number.parseFloat((await image.getAttribute('data-test-to'))!)).toBeLessThan(initial.height)
    await expect(image.getByRole('img', { name: '配送范围图' })).toHaveCSS('opacity', '1')
    await expect(previous).toHaveCount(0)
    await expect(status).toContainText('照片已更新')
    await preview.getByRole('button', { name: '载入工程照片' }).click()
    await expect(image).toHaveAttribute('data-image-state', 'pending')
    await expect(previous).toHaveAttribute('src', /image-switch-plan/)
    await preview.getByRole('button', { name: '模拟替换失败' }).click()
    await expect(image).toHaveAttribute('data-image-state', 'failed')
    releaseTeam()
    await expect(status).toContainText('无法读取照片')
    await expect(image.getByRole('img', { name: '未能读取的交付照片' })).toHaveClass(/sy-image__fallback/)
    await expect(image.getByRole('img', { name: '工程成员照片' })).toHaveCount(0)
    await expect(previous).toHaveCount(0)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await image.evaluate(node => node.removeAttribute('data-test-size-easing'))
    await preview.getByRole('button', { name: '载入成员照片' }).click()
    await expect(image.getByRole('img', { name: '交付成员照片' })).toHaveCSS('transition-property', 'none')
    await expect(image).toHaveAttribute('data-image-state', 'ready')
    await expect(image).not.toHaveAttribute('data-test-size-easing')
  } finally {
    releasePlan()
    releaseTeam()
  }
})

test('loads the chosen gallery asset on demand, retries failures, and restores the thumbnail focus', async ({ page }) => {
  let deliver!: () => void
  const pending = new Promise<void>(resolve => { deliver = resolve })
  let requests = 0
  await page.route(/profile-chen[^/]*\.jpg\?view=gallery$/, async route => {
    requests++
    if (requests === 1) {
      await pending
      await route.fulfill({ status: 503, body: 'Temporarily unavailable', headers: { 'cache-control': 'no-store' } })
    } else {
      await route.continue()
    }
  })
  await page.goto('/?component=W.lightbox')
  const trigger = page.getByRole('button', { name: '预览陈远 · 工程' })
  await expect(trigger).toBeVisible()
  expect(requests).toBe(0)
  const dialog = page.getByRole('dialog', { name: '项目照片图集' })
  const stage = dialog.locator('.sy-lightbox__stage')
  await trigger.press('Enter')
  try {
    await expect(dialog).toHaveAttribute('data-fullscreen', 'true')
    expect((await dialog.boundingBox())!.width).toBe(page.viewportSize()!.width)
    await expect.poll(() => dialog.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
    await expect(dialog.locator('.sy-lightbox__actions [aria-live]')).toHaveText('2 / 3')
    await expect(stage).toHaveAttribute('data-media-state', 'pending')
    await expect(stage.getByRole('status', { name: '正在加载媒体' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: '放大项目照片' })).toHaveAttribute('aria-disabled', 'true')
  } finally {
    deliver()
  }
  const initialHeight = await stage.evaluate(node => node.clientHeight)
  await expect(stage.getByRole('alert')).toHaveText('无法加载当前媒体。')
  await stage.getByRole('button', { name: '重试加载' }).press('Enter')
  await expect(stage).toBeFocused()
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  expect(requests).toBe(2)
  const photo = stage.getByRole('img', { name: '深蓝色背景的陈远肖像' })
  await photo.dblclick()
  await expect(photo).toHaveAttribute('data-zoomed', 'true')
  await stage.press('0')
  const handled = await stage.evaluate(node => {
    const box = node.getBoundingClientRect()
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -220, ctrlKey: true,
      clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 })
    return !node.dispatchEvent(event)
  })
  expect(handled).toBe(true)
  await expect(photo).toHaveAttribute('data-zoomed', 'true')
  await stage.press('0')
  await dialog.getByRole('button', { name: '下一张项目照片' }).click()
  await expect(stage.getByRole('img', { name: '每日交付量面积图' })).toBeVisible()
  await expect(dialog.locator('.sy-lightbox__actions [aria-live]')).toHaveText('3 / 3')
  expect(await stage.evaluate(node => node.clientHeight)).toBe(initialHeight)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('a gallery holds the painted image until the selected frame has decoded', async ({ page }) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this)
      if (!this.currentSrc.endsWith('?view=gallery') || !this.alt.includes('陈远')) return
      this.dataset.testDecoding = ''
      await new Promise<void>(resolve => document.addEventListener('test-gallery-decoded', () => resolve(), { once: true }))
    }
  })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/?component=W.lightbox')
  await page.getByRole('button', { name: '预览林舟 · 设计' }).press('Enter')
  const dialog = page.getByRole('dialog', { name: '项目照片图集' })
  const stage = dialog.locator('.sy-lightbox__stage')
  const previous = stage.locator('[data-previous]')
  const first = stage.getByRole('img', { name: '浅绿色背景的林舟肖像' })
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  await expect(first).toHaveCSS('opacity', '1')
  await expect(stage).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const height = await stage.evaluate(node => node.clientHeight)
  await dialog.getByRole('button', { name: '下一张项目照片' }).press('Enter')
  const selected = stage.getByRole('img', { name: '深蓝色背景的陈远肖像' })
  await expect(selected).toHaveAttribute('data-test-decoding', '')
  await expect(stage).toHaveAttribute('data-media-state', 'pending')
  await expect(previous).toHaveAttribute('aria-hidden', 'true')
  await expect(previous.locator('img')).toHaveAttribute('src', /profile-lin/)
  await expect(previous.locator('img')).toHaveCSS('opacity', '1')
  await expect(previous).toHaveCSS('opacity', '0.6')
  await expect(first).toHaveCount(0)
  await expect(selected).toHaveCSS('opacity', '0')
  await expect(stage.getByRole('status', { name: '正在加载媒体' })).toBeVisible()
  await selected.evaluate(node => node.addEventListener('transitionrun', event => {
    if (event.propertyName === 'opacity') node.setAttribute('data-test-preview-easing', getComputedStyle(node).transitionTimingFunction)
  }))
  await page.evaluate(() => document.dispatchEvent(new Event('test-gallery-decoded')))
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  await expect(selected).toHaveAttribute('data-test-preview-easing', /cubic-bezier/)
  await expect(selected).toHaveCSS('opacity', '1')
  await expect(previous).toHaveCount(0)
  expect(await stage.evaluate(node => node.clientHeight)).toBe(height)
})

test('late decoding cannot replace the gallery frame selected most recently', async ({ page }) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this)
      if (!this.currentSrc.endsWith('?view=gallery') || !this.alt.includes('陈远')) return
      this.dataset.testDecoding = ''
      await new Promise<void>(resolve => document.addEventListener('test-skipped-decoded', () => resolve(), { once: true }))
      document.documentElement.dataset.testDecodeResolved = ''
    }
  })
  await page.goto('/?component=W.lightbox')
  await page.getByRole('button', { name: '预览林舟 · 设计' }).press('Enter')
  const dialog = page.getByRole('dialog', { name: '项目照片图集' })
  const stage = dialog.locator('.sy-lightbox__stage')
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  const next = dialog.getByRole('button', { name: '下一张项目照片' })
  await next.press('Enter')
  await expect(stage.getByRole('img', { name: '深蓝色背景的陈远肖像' })).toHaveAttribute('data-test-decoding', '')
  await next.press('Enter')
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  await page.evaluate(() => document.dispatchEvent(new Event('test-skipped-decoded')))
  await expect(page.locator('html')).toHaveAttribute('data-test-decode-resolved', '')
  await expect(dialog.locator('.sy-lightbox__actions [aria-live]')).toHaveText('3 / 3')
  await expect(stage.getByRole('img', { name: '每日交付量面积图' })).toHaveCSS('opacity', '1')
  await expect(stage.getByRole('img', { name: '深蓝色背景的陈远肖像' })).toHaveCount(0)
})

test('reduced-motion swipes change the selected image without sliding the stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?component=W.lightbox')
  await page.getByRole('button', { name: '预览林舟 · 设计' }).press('Enter')
  const dialog = page.getByRole('dialog', { name: '项目照片图集' })
  const stage = dialog.locator('.sy-lightbox__stage')
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
  const drag = async (type: string, offset: number) => stage.evaluate((node, { type, offset }) => {
    const box = node.getBoundingClientRect()
    node.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 19, isPrimary: true,
      button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: box.x + box.width / 2 + offset, clientY: box.y + box.height / 2,
    }))
  }, { type, offset })
  await drag('pointerdown', 0)
  await drag('pointermove', -96)
  await expect(stage).toHaveAttribute('data-moving', 'true')
  await expect(stage.locator('.sy-lightbox__media')).toHaveCSS('translate', 'none')
  await drag('pointerup', -96)
  await expect(dialog.locator('.sy-lightbox__actions [aria-live]')).toHaveText('2 / 3')
  await expect(stage).toHaveAttribute('data-media-state', 'ready')
})

test('keeps light and dark media actions legible and reveals a wrapperless hover strip by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 530, height: 760 })
  await page.goto('/?component=W.overlay')
  const modes = page.getByRole('region', { name: '亮暗媒体蒙层' })
  await expect(modes.locator('[data-media-mode="light"]')).toHaveCSS('color-scheme', 'light')
  await expect(modes.locator('[data-media-mode="dark"]')).toHaveCSS('color-scheme', 'dark')
  const tool = page.getByRole('region', { name: '图层工具示例' })
  const overlay = tool.locator('.sy-overlay__content')
  await expect(overlay).not.toHaveAttribute('data-visible')
  await tool.focus()
  await expect(overlay).toHaveAttribute('data-visible', 'true')
  await tool.getByRole('button', { name: '添加到交付清单' }).press('Enter')
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: '已添加交付区域图' })).toHaveCount(1)
})

test('staggers card and table skeletons and reveals content without resizing the table', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?component=W.skeleton')
  const table = page.getByRole('table', { name: '交付表格占位' })
  const placeholders = table.locator('.sy-skeleton__cover')
  await expect(placeholders).toHaveCount(9)
  const delays = await placeholders.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node, '::before').animationDelay)))
  expect(delays[0]).toBe(0)
  expect(delays[1]).toBeGreaterThan(delays[0]!)
  expect(delays[8]).toBeGreaterThan(delays[1]!)
  const dimensions = (await table.boundingBox())!
  await page.getByRole('switch', { name: '加载资料清单' }).click()
  await expect(table.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(table.getByRole('cell', { name: '设计规范' })).toBeVisible()
  expect((await table.boundingBox())!.height).toBe(dimensions.height)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('switch', { name: '加载资料清单' }).click()
  expect(await placeholders.first().evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('none')
  await expect(placeholders.first()).toHaveCSS('transition-property', 'none')
})

test('provides visible and accessible spinner labels without moving the initiating button', async ({ page }) => {
  await page.goto('/?component=W.spinner')
  const rings = page.getByRole('region', { name: '四种加载尺寸' }).locator('.sy-spinner__ring')
  await expect(rings).toHaveCount(4)
  expect(await rings.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).width)))).toEqual([14, 18, 24, 32])
  await expect(page.getByRole('status', { name: '正在读取地图' })).toHaveCSS('color', 'rgb(255, 255, 255)')
  const trigger = page.getByRole('button', { name: '生成交付包' })
  const bounds = (await trigger.boundingBox())!
  await trigger.click()
  const loading = page.getByRole('status', { name: '交付包生成中' })
  await expect(loading).toContainText('正在汇总版本和说明文件')
  await expect(trigger).toHaveAttribute('aria-busy', 'true')
  expect((await trigger.boundingBox())!.width).toBe(bounds.width)
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: '交付包已生成' })).toHaveCount(1)
  await expect(loading).toHaveCount(0)
})

test('shows buffering feedback using the native playback state', async ({ page }) => {
  await page.goto('/?component=W.lightbox')
  const player = page.getByRole('group', { name: '路线视频' })
  const video = player.locator('video')
  await expect.poll(() => video.evaluate(node => node.readyState)).toBeGreaterThanOrEqual(1)
  await player.getByRole('button', { name: '播放路线' }).click()
  await expect(player.getByRole('button', { name: '暂停路线' })).toBeVisible()
  await expect.poll(() => video.evaluate(node => node.currentTime)).toBeGreaterThan(0)
  await video.evaluate(node => node.dispatchEvent(new Event('waiting')))
  await expect(player.locator('.sy-media-player__waiting .sy-spinner')).toBeVisible()
  await video.evaluate(node => node.dispatchEvent(new Event('canplay')))
  await expect(player.locator('.sy-media-player__waiting')).toHaveCount(0)
})
