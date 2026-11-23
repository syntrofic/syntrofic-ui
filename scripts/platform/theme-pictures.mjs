import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { openThemeChrome } from './theme-picture-chrome.mjs'
import { pngChecksum } from './png-image.mjs'

const imageMetadata = Buffer.from('tEXtSoftware\0Syntrofic Theme Editor', 'latin1')
const pngStamp = Buffer.alloc(imageMetadata.length + 8)
pngStamp.writeUInt32BE(imageMetadata.length - 4)
imageMetadata.copy(pngStamp, 4)
pngStamp.writeUInt32BE(pngChecksum(imageMetadata), 4 + imageMetadata.length)

function stampPicture(picture) {
  if (picture.subarray(-8, -4).toString('ascii') !== 'IEND') throw new Error('The browser returned an incomplete PNG')
  return Buffer.concat([picture.subarray(0, -12), pngStamp, picture.subarray(-12)])
}

async function chromium(directory) {
  const local = createRequire(join(directory, 'package.json'))
  for (const importer of [local, createRequire(import.meta.url)]) {
    for (const name of ['playwright', '@playwright/test']) {
      try {
        const library = await import(pathToFileURL(importer.resolve(name)).href)
        if (library.chromium ?? library.default?.chromium) return library.chromium ?? library.default.chromium
      } catch {}
    }
  }
}

async function chrome() {
  const paths = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
      .filter(Boolean).map(root => join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')),
  ]
  for (const path of paths) {
    if (!path) continue
    try { await access(path); return path } catch {}
  }
}

async function prepareDocument({ mode, expand }) {
  async function waitUntil(ready, message, limit) {
    const deadline = performance.now() + limit
    while (!ready()) {
      if (performance.now() >= deadline) throw new Error(message)
      await new Promise(resolve => setTimeout(resolve, 35))
    }
  }
  const picker = document.querySelector('#theme-appearance')
  if (!picker) throw new Error('The theme page is missing its appearance controls')
  picker.value = mode
  picker.dispatchEvent(new Event('change', { bubbles: true }))
  await waitUntil(() => document.body.dataset.syTheme === mode, 'The theme appearance did not update', 5000)

  const visible = element => element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'
  const overlays = document.querySelector('[data-theme-overlays]')
  if (overlays) {
    const selectors = ['[role="menu"]', '[role="tooltip"]', '.sy-popover', '[role="listbox"]', '.sy-hover-card__panel',
      '.theme-overlay-preview .sy-dialog[data-visible]', '.theme-overlay-preview .sy-panel-layer:is([data-side="left"], [data-side="right"]) .sy-panel',
      '.theme-overlay-preview .sy-panel-layer[data-side="bottom"] .sy-panel']
    await waitUntil(() => selectors.every(selector => visible(overlays.querySelector(selector))), 'Theme overlays did not open', 8000)
  }
  if (expand) {
    document.querySelectorAll('[data-theme-example-panel], [data-theme-template-panel]').forEach(detail => { detail.open = true })
    const examples = [...document.querySelectorAll('[data-theme-example], [data-theme-template]')]
    await waitUntil(() => examples.every(example => ['true', 'failed'].includes(example.dataset.ready)), 'Theme examples did not finish loading', 10000)
  }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await waitUntil(() => document.fonts.status === 'loaded', 'Theme fonts did not finish loading', 8000)
  for (const animation of document.getAnimations()) {
    if (animation.playState !== 'running' || !animation.playbackRate || !animation.effect) continue
    const { endTime, duration, delay } = animation.effect.getComputedTiming()
    if (Number.isFinite(endTime)) animation.finish()
    else if (Number.isFinite(duration) && duration > 0) {
      animation.pause()
      animation.currentTime = delay + duration / 2
    }
  }
  await new Promise(resolve => requestAnimationFrame(resolve))
  return {
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    breaks: [...document.querySelectorAll('[data-theme-variant-panel], [data-theme-variant-row], [data-theme-example-panel], [data-theme-template-panel], .theme-palette-family, .theme-assignment-table tr')]
      .filter(visible).map(element => Math.floor(element.getBoundingClientRect().top + scrollY)).sort((a, b) => a - b),
  }
}

async function picturesForView(renderer, view, files) {
  const { width, height, breaks } = await renderer.evaluate(prepareDocument, { mode: view.mode, expand: view.expand })
  const ranges = []
  const paginate = view.paginate ?? view.expand
  let from = 0
  while (from < height) {
    const limit = from + 1600
    const end = !paginate || limit >= height ? height
      : breaks.findLast(top => top > from && top <= limit) ?? breaks.find(top => top > from) ?? height
    ranges.push({ x: 0, y: from, width, height: end - from })
    from = end
  }
  const captured = []
  for (const [index, clip] of ranges.entries()) {
    const file = ranges.length > 1 ? view.file.replace(/(-dark)?\.png$/, (_, mode = '') => `-${index + 1}${mode}.png`) : view.file
    captured.push({ file, expected: stampPicture(await renderer.screenshot(clip)), view: view.file })
  }
  files.push(...captured)
}

async function openRenderer(engine, executablePath, directory, signal) {
  let browser
  if (engine) {
    try {
      browser = await engine.launch({ executablePath, timeout: 12000 })
      signal.throwIfAborted()
      const page = await browser.newPage({ viewport: { width: 1200, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce', offline: true })
      signal.throwIfAborted()
      return {
        async load(view) {
          await page.emulateMedia({ colorScheme: view.mode, reducedMotion: view.motion ?? 'reduce' })
          await page.goto('about:blank')
          await page.setContent(view.html, { waitUntil: 'load', timeout: 10000 })
        },
        evaluate: (callback, input) => page.evaluate(callback, input),
        screenshot: clip => page.screenshot({ fullPage: true, clip, timeout: 10000 }),
        close: () => browser.close(),
      }
    } catch { await browser?.close() }
  }
  signal.throwIfAborted()
  if (executablePath) {
    const chrome = await openThemeChrome(executablePath, join(directory, 'profile'), signal)
    let sequence = 0
    return { ...chrome, async load(view) {
      const source = join(directory, 'sheet-' + (++sequence) + '.html')
      await writeFile(source, view.html)
      await chrome.load(pathToFileURL(source).href, view.mode, view.motion)
    } }
  }
}

export async function withThemeBrowser(directory, { timeout, timeoutMessage, missingBrowser }, work) {
  const [engine, executablePath] = await Promise.all([chromium(directory), chrome()])
  const scratch = await mkdtemp(join(tmpdir(), 'syntrofic-theme-browser-'))
  let renderer
  const controller = new AbortController()
  let watchdog
  try {
    const deadline = new Promise((_, reject) => {
      watchdog = setTimeout(() => {
        const error = new Error(timeoutMessage)
        controller.abort(error)
        reject(error)
      }, timeout)
    })
    const render = async () => {
      renderer = await openRenderer(engine, executablePath, scratch, controller.signal)
      if (!renderer) throw Object.assign(new Error(missingBrowser), { code: 'ERR_THEME_BROWSER_REQUIRED' })
      controller.signal.throwIfAborted()
      return work(renderer, controller.signal)
    }
    return await Promise.race([render(), deadline])
  } finally {
    clearTimeout(watchdog)
    try { await renderer?.close() }
    finally { await rm(scratch, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }) }
  }
}

export async function captureThemePictures(directory, views) {
  const files = []
  if (!views.length) return { files }
  const timeout = 60000 + 20000 * (views.length - 1)
  try {
    await withThemeBrowser(directory, { timeout, timeoutMessage: 'PNG rendering exceeded ' + timeout / 1000 + ' seconds',
      missingBrowser: 'Install Playwright Chromium or Google Chrome to generate PNG previews.' }, async (renderer, signal) => {
      for (const view of views) {
        signal.throwIfAborted()
        await renderer.load({ ...view, motion: 'no-preference' })
        await picturesForView(renderer, view, files)
      }
    })
    return { files }
  } catch (error) {
    const message = error.message.split('\n')[0]
    return { files, note: error.code === 'ERR_THEME_BROWSER_REQUIRED' ? message : 'PNG capture stopped: ' + message }
  }
}
