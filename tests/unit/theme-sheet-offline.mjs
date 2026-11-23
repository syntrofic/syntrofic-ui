import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { chromium, expect } from '@playwright/test'
import * as library from '@syntrofic/ui'
import { themeCommand } from '../../scripts/platform/theme.mjs'

test('the exported theme sheet loads archived component data on a white canvas without network access', {
  skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
}, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-offline-sheet-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  try {
    await writeFile(join(project, 'package.json'), '{"name":"theme-archive"}')
    await themeCommand(project, ['editor', 'new', 'archive'], { like: 'neutral' })
    const edit = (action, ...args) => themeCommand(project, ['editor', action, 'archive', ...args], {})
    const tempo = await edit('set', 'motion-tempo', 'less')
    assert.equal(tempo.motionSettings['motion-tempo'], .9)
    assert.ok(tempo.changes.tokens.light.some(entry => entry.token === '--sy-motion-tempo' && entry.after === '0.9'))
    const initial = await themeCommand(project, ['editor', 'show', 'archive'], { section: 'feedback' })
    const feedback = join(initial.preview.directory, 'sheet-feedback.html')
    assert.match(await readFile(feedback, 'utf8'), /<html lang="zh-CN">/)
    const forced = await edit('set', 'reduced-motion', 'always')
    assert.equal(forced.motionSettings['reduced-motion'], 'always')
    assert.match(library.exportBrandTheme(forced.theme)['DESIGN.md'], /data-sy-reduced-motion/)
    assert.ok(forced.preview.staleSheets.includes('sheet-feedback.html'))
    await edit('set', 'motion-character', 'crisp')
    await themeCommand(project, ['editor', 'set', 'archive', 'background-color', '#d1e0cf'], {
      on: 'button', when: ['variant:secondary+size:sm+elevation:med'], state: 'hover', mode: 'light',
    })
    const archived = await edit('show')
    const page = await browser.newPage({ colorScheme: 'dark', reducedMotion: 'no-preference', viewport: { width: 390, height: 850 } })
    const requests = []
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
    await page.route(/^https?:/, route => route.abort())
    await page.goto(pathToFileURL(join(archived.preview.directory, 'sheet.html')).href)
    await expect(page.locator('html')).toHaveAttribute('data-sy-reduced-motion')
    const appearance = page.getByLabel('模式', { exact: true })
    await page.evaluate(() => {
      for (const name of ['startViewTransition', 'animate']) {
        const target = name === 'animate' ? document.body : document
        target[name] = () => { throw new Error('The sheet should change mode without motion') }
      }
    })
    await appearance.selectOption('dark')
    await expect(page.locator('body')).toHaveAttribute('data-sy-theme', 'dark')
    await appearance.selectOption('light')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    const statusVision = page.locator('#theme-status-vision')
    await expect(statusVision.getByRole('table', { name: '浅色状态色模拟' })).toBeVisible()
    await expect(statusVision.getByRole('table', { name: '深色状态色模拟' })).toBeHidden()
    const success = statusVision.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '成功', exact: true }) })
    await expect(success.getByRole('cell')).toHaveText([
      archived.statusVision.modes.light.colors.success,
      ...Object.values(archived.statusVision.modes.light.simulated).map(tones => tones.success),
    ])
    assert.ok((await success.locator('.theme-status-swatch').first().boundingBox()).width >= 12)
    const scrollable = statusVision.getByRole('region', { name: '状态色对照' })
    assert.ok(await scrollable.evaluate(node => node.scrollWidth > node.clientWidth))
    await appearance.selectOption('dark')
    await expect(statusVision.getByRole('table', { name: '深色状态色模拟' })).toBeVisible()
    await expect(statusVision.getByRole('table', { name: '浅色状态色模拟' })).toBeHidden()
    await appearance.selectOption('light')
    await expect(page.locator('#feedback .sy-spinner__ring').first()).toHaveCSS('animation-name', 'none')
    const overlays = page.locator('[data-theme-overlays]')
    await expect(overlays.getByRole('region', { name: '悬浮卡' }).getByRole('dialog', { name: '负责评审' })).toBeVisible()
    await expect(overlays).not.toHaveAttribute('data-sy-initializing')
    const comparisons = page.locator('[data-theme-variant-panel="button"]')
    await expect(comparisons).not.toHaveAttribute('open')
    await comparisons.locator('summary').press('Enter')
    await expect(comparisons).toHaveAttribute('open', '')
    assert.equal(await comparisons.locator('[data-theme-variant-state]').count(), 288)
    const states = comparisons.locator('[data-theme-variant-row]').filter({
      has: page.getByRole('heading', { name: 'secondary · sm · med', exact: true }),
    })
    const resting = states.locator('[data-theme-variant-state="rest"] .sy-button')
    const hovered = states.locator('[data-theme-variant-state="hover"] .sy-button')
    await expect(hovered).toHaveCSS('background-color', 'rgb(209, 224, 207)')
    assert.notEqual(await resting.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(209, 224, 207)')
    await page.setViewportSize({ width: 1200, height: 850 })
    const first = await resting.boundingBox()
    const second = await hovered.boundingBox()
    assert.ok(Math.abs(first.y - second.y) < 1 && second.x > first.x)
    await page.setViewportSize({ width: 390, height: 850 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await comparisons.locator('summary').press('Enter')
    await expect(comparisons).not.toHaveAttribute('open')
    const checkboxes = page.locator('[data-theme-variant-panel="checkbox"]')
    await checkboxes.locator('summary').press('Enter')
    const mixed = checkboxes.locator('[data-theme-variant-state="mixed"] input').first()
    assert.equal(await mixed.evaluate(input => input.indeterminate), true)
    await checkboxes.locator('summary').press('Enter')
    const dialogPreview = overlays.getByRole('region', { name: '发布交付资料' })
    const drawerPreview = overlays.getByRole('dialog', { name: '交付详情' })
    const sheetPreview = overlays.getByRole('dialog', { name: '可见范围' })
    for (const preview of [dialogPreview, drawerPreview, sheetPreview]) {
      await expect(preview).toBeVisible()
      assert.equal(await preview.evaluate(node => {
        const area = node.closest('.theme-overlay-preview').getBoundingClientRect()
        const box = node.getBoundingClientRect()
        return box.left >= area.left - 1 && box.right <= area.right + 1
          && box.top >= area.top - 1 && box.bottom <= area.bottom + 1
      }), true)
    }
    assert.ok(await dialogPreview.locator('.sy-dialog__panel').evaluate(node => parseFloat(getComputedStyle(node).paddingInlineStart) > 0))
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('.theme-overlay-preview'))), false)
    const drawerTrigger = overlays.getByRole('button', { name: '查看详情' })
    await drawerPreview.getByRole('button', { name: '关闭' }).press('Enter')
    await expect(drawerPreview).toBeHidden()
    await drawerTrigger.press('Enter')
    await expect(drawerPreview).toBeVisible()
    await expect(drawerTrigger).toBeFocused()
    const open = async id => {
      const panel = page.locator(`[data-theme-example-panel="${id}"]`)
      await panel.locator('summary').first().press('Enter')
      const view = panel.locator(`[data-theme-example="${id}"]`)
      await expect(view).toHaveAttribute('data-ready', 'true')
      await expect(view).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      assert.equal(await view.evaluate(node => parseFloat(getComputedStyle(node).getPropertyValue('--sy-motion-replace'))), 0)
      return view
    }

    const logs = await open('W.log-stream')
    await logs.getByRole('button', { name: '加载构建记录' }).click()
    await expect(logs.getByText('归档构建已完成')).toBeVisible()
    const directory = await open('W.transfer-list')
    await expect(directory.getByText('林舟', { exact: true }).first()).toBeVisible()
    const thread = await open('W.comment-thread')
    const history = thread.getByRole('button', { name: '版本历史' })
    const dialog = page.getByRole('dialog', { name: '版本历史' })
    await history.click()
    await expect(dialog.getByText('交付意见的初始版本。')).toBeVisible()
    await page.getByRole('button', { name: '关闭历史' }).click()
    await expect(dialog).toBeHidden()
    await expect(history).toBeFocused()
    const comments = await open('W.comments')
    await comments.getByRole('button', { name: '加载更早的讨论' }).click()
    await expect(comments.getByRole('article', { name: '发布说明' })).toBeVisible()

    const checkout = page.locator('[data-theme-template-panel="checkout-wizard"]')
    const stage = checkout.locator('[data-theme-template]')
    const island = await stage.getAttribute('data-theme-template-island')
    await stage.evaluate(node => { node.dataset.themeTemplateIsland = 'unavailable' })
    await checkout.locator('summary').first().press('Enter')
    await expect(stage).toHaveAttribute('data-ready', 'failed')
    await expect(stage).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await stage.evaluate((node, name) => { node.dataset.themeTemplateIsland = name }, island)
    await stage.getByRole('button', { name: '重新加载示例' }).press('Enter')
    await expect(stage).toHaveAttribute('data-ready', 'true')
    await expect(stage).toBeFocused()
    await expect(stage.getByRole('button', { name: '继续' }).first()).toBeVisible()
    assert.deepEqual(requests, [])

    const reverted = await edit('undo', 'reduced-motion')
    assert.deepEqual(reverted.motionSettings, { 'motion-tempo': .9, 'motion-character': 'crisp', 'reduced-motion': 'system' })
    const actions = await themeCommand(project, ['editor', 'show', 'archive'], { section: 'actions' })
    await page.goto(pathToFileURL(join(actions.preview.directory, 'sheet-actions.html')).href)
    await expect(comparisons).toHaveAttribute('open', '')
    await expect(page.locator('[data-theme-variant-panel="checkbox"]')).toHaveCount(0)
    const buttonGroup = page.locator('[data-theme-variant-panel="button-group"]')
    await buttonGroup.locator('summary').scrollIntoViewIfNeeded()
    await buttonGroup.locator('..').evaluate(frame => {
      const animate = frame.animate.bind(frame)
      frame.animate = (keyframes, options) => {
        const animation = animate(keyframes, options)
        frame.dataset.testDisclosureEasing = animation.effect.getTiming().easing
        return animation
      }
    })
    await buttonGroup.locator('summary').press('Enter')
    await expect(buttonGroup).not.toHaveAttribute('open')
    await expect(buttonGroup.locator('..')).toHaveAttribute('data-test-disclosure-easing', /cubic-bezier/)
    assert.deepEqual(requests, [])
  } finally {
    await browser.close()
  }
})
