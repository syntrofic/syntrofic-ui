import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { openThemeChrome } from './theme-picture-chrome.mjs'

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
    const selectors = ['[role="menu"]', '[role="tooltip"]', '.sy-popover', '[role="listbox"]']
    await waitUntil(() => selectors.every(selector => visible(overlays.querySelector(selector))), 'Theme overlays did not open', 8000)
  }
  if (expand) {
    document.querySelectorAll('[data-theme-example-panel]').forEach(detail => { detail.open = true })
    const examples = [...document.querySelectorAll('[data-theme-example]')]
    await waitUntil(() => examples.every(example => example.dataset.ready === 'failed' ||
      example.querySelector(':scope > [data-sy-brand] > :not(style)')), 'Theme examples did not finish loading', 10000)
  }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await waitUntil(() => document.fonts.status === 'loaded', 'Theme fonts did not finish loading', 8000)
  return {
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    breaks: [...document.querySelectorAll('[data-theme-example-panel], .theme-palette-family, .theme-assignment-table tr')]
      .filter(visible).map(element => Math.floor(element.getBoundingClientRect().top + scrollY)).sort((a, b) => a - b),
  }
}

async function picturesForView(renderer, view, files) {
  const { width, height, breaks } = await renderer.evaluate(prepareDocument, { mode: view.mode, expand: view.expand })
  const ranges = []
  let from = 0
  while (from < height) {
    const limit = from + 1600
    const end = !view.expand || limit >= height ? height
      : breaks.findLast(top => top > from && top <= limit) ?? breaks.find(top => top > from) ?? height
    ranges.push({ x: 0, y: from, width, height: end - from })
    from = end
  }
  for (const [index, clip] of ranges.entries()) {
    const file = ranges.length > 1 ? view.file.replace(/(-dark)?\.png$/, (_, mode = '') => `-${index + 1}${mode}.png`) : view.file
    files.push({ file, expected: await renderer.screenshot(clip), view: view.file })
  }
}

async function openRenderer(engine, executablePath, directory, signal) {
  let browser
  if (engine) {
    try {
      browser = await engine.launch({ executablePath, timeout: 12000 })
      signal.throwIfAborted()
      const page = await browser.newPage({ viewport: { width: 1200, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce', offline: true })
      return {
        async load(view) {
          await page.emulateMedia({ colorScheme: view.mode })
          await page.goto('about:blank')
          await page.setContent(view.html, { waitUntil: 'load', timeout: 10000 })
        },
        evaluate: (callback, input) => page.evaluate(callback, input),
        screenshot: clip => page.screenshot({ fullPage: true, clip, animations: 'disabled', timeout: 10000 }),
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
      await chrome.load(pathToFileURL(source).href, view.mode)
    } }
  }
}

export async function captureThemePictures(directory, views) {
  if (!views.length) return { files: [] }
  const [engine, executablePath] = await Promise.all([chromium(directory), chrome()])
  const scratch = await mkdtemp(join(tmpdir(), 'syntrofic-theme-pictures-'))
  let renderer
  const controller = new AbortController()
  const files = []
  let watchdog
  try {
    const available = 60000 + 20000 * (views.length - 1)
    const deadline = new Promise((_, reject) => {
      watchdog = setTimeout(() => {
        const error = new Error('PNG rendering exceeded ' + available / 1000 + ' seconds')
        controller.abort(error)
        reject(error)
      }, available)
    })
    const render = async () => {
      renderer = await openRenderer(engine, executablePath, scratch, controller.signal)
      if (!renderer) return { files, note: 'Install Playwright Chromium or Google Chrome to generate PNG previews.' }
      for (const view of views) {
        controller.signal.throwIfAborted()
        await renderer.load(view)
        await picturesForView(renderer, view, files)
      }
      return { files }
    }
    return await Promise.race([render(), deadline])
  } catch (error) {
    return { files, note: 'PNG capture stopped: ' + error.message.split('\n')[0] }
  } finally {
    clearTimeout(watchdog)
    try { await renderer?.close() }
    finally { await rm(scratch, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }) }
  }
}
