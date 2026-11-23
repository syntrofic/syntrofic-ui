import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { themeCommand } from '../../scripts/platform/theme.mjs'

const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }

async function editor(t) {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-paint-coverage-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  await writeFile(join(project, 'package.json'), '{}')
  return (action, id, args = [], options = {}) => themeCommand(project, ['editor', action, id, ...args], options)
}

test('show compares painted surfaces in both modes and distinguishes an explicit fill from inherited ink', browser, async t => {
  const edit = await editor(t)
  const report = () => edit('show', 'studio', [], { section: 'colors' })
  await edit('new', 'studio', [], { like: 'neutral' })
  const original = await report()
  assert.equal(original.paintCoverage.status, 'unchanged')
  assert.deepEqual(original.unreached, [])

  await edit('set', 'studio', ['accent', '#16753f'])
  const accent = await report()
  assert.equal(accent.paintCoverage.status, 'measured')
  assert.deepEqual(accent.paintCoverage.modes, ['light', 'dark'])
  assert.ok(accent.paintCoverage.compared > 500)
  assert.ok(accent.unreached.slice(0, 5).includes('tooltip'))
  assert.ok(accent.unreached.includes('toast'))
  assert.ok(accent.unreached.includes('banner'))
  assert.equal(accent.unreached.includes('button'), false)
  assert.equal(accent.unreached.includes('heading'), false)
  const toast = accent.paintCoverage.parts.find(part => part.part === 'toast')
  assert.deepEqual(toast.unchanged, ['fill', 'text'])
  assert.deepEqual(toast.examples[0].before, toast.examples[0].after)

  await edit('set', 'studio', ['background-color', '#dce6dc'], { on: 'toast', mode: 'light' })
  const adjusted = await report()
  const measured = adjusted.paintCoverage.parts.find(part => part.part === 'toast')
  assert.equal(measured.status, 'explicit')
  assert.equal(measured.modes.light.fillChanged, true)
  assert.equal(measured.modes.dark.fillChanged, false)
  assert.deepEqual(measured.unchanged, ['text'])
  assert.equal(measured.examples[0].after.fill.color, '#dce6dc')
  assert.equal(adjusted.unreached.includes('toast'), false)
  const sheet = await readFile(join(adjusted.preview.directory, 'sheet-colors.html'), 'utf8')
  assert.match(sheet, /href="#theme-paint-coverage"/)
  assert.match(sheet, /id="theme-paint-coverage"/)
  assert.match(sheet, /<th scope="row"><code>tooltip<\/code><\/th>/)
  assert.doesNotMatch(sheet, /<th scope="row"><code>toast<\/code><\/th>/)

  const scope = { on: 'banner', when: ['tone:warning+variant:section'], mode: 'light' }
  const banner = await edit('set', 'studio', ['background-color', '#e4dfcd'], scope)
  assert.equal(banner.changes.paint.status, 'measured')
  assert.equal(banner.changes.paint.reaches.length, 1)
  const shown = await edit('show', 'studio', [], scope)
  assert.equal(shown.modes.light[0].styles['background-color'].value, 'rgb(228, 223, 205)')
  await edit('set', 'studio', ['mode', 'dark-only'])
  const dark = await report()
  assert.deepEqual(dark.paintCoverage.modes, ['dark'])
  assert.ok(dark.unreached.includes('toast'))
})

test('a derived theme compares to the saved parent and reports a selected side navigation change', browser, async t => {
  const edit = await editor(t)
  await edit('new', 'origin', [], { like: 'neutral' })
  await edit('set', 'origin', ['accent', '#16753f'])
  await edit('set', 'origin', ['background-color', '#dce6dc'], { on: 'toast', mode: 'light' })
  await edit('new', 'variant', [], { like: 'origin' })
  await edit('set', 'origin', ['accent', '#2059a1'])
  const report = () => edit('show', 'variant', [], { section: 'colors' })
  const inherited = await report()
  assert.equal(inherited.paintCoverage.base, 'origin')
  assert.equal(inherited.paintCoverage.status, 'unchanged')
  const scope = { on: 'side-nav-item', when: ['size:sm'], state: 'selected', mode: 'light' }
  const selected = await edit('set', 'variant', ['background-color', '#dde4dc'], scope)
  assert.equal(selected.changes.paint.status, 'measured')
  assert.equal(selected.changes.paint.reaches.length, 1)
  const result = await report()
  const nav = result.paintCoverage.parts.find(part => part.part === 'side-nav-item')
  assert.equal(result.paintCoverage.base, 'origin')
  assert.deepEqual(nav.modes.light, { fillChanged: true, textChanged: false })
  assert.deepEqual(nav.modes.dark, { fillChanged: false, textChanged: false })
  assert.deepEqual(nav.unchanged, ['text'])
  assert.ok(result.unreached.includes('toast'))
})

test('theme repairs are scoped, tested against rendered styles and disappear when applied', browser, async t => {
  const edit = await editor(t)
  await edit('new', 'parent', [], { like: 'neutral' })
  const selected = { on: 'side-nav-item', when: ['size:sm'], state: 'selected', mode: 'light', only: true }
  await edit('set', 'parent', ['background-color', '#e8e8e8'], selected)
  const badge = { on: 'badge', when: ['tone:success'], mode: 'light', only: true }
  await edit('set', 'parent', ['background-color', '#e5eee5'], badge)
  await edit('new', 'studio', [], { like: 'parent' })
  await edit('set', 'studio', ['accent', '#16753f'])
  await edit('set', 'studio', ['success', '#246541'])
  await edit('set', 'studio', ['corners', 'square'])
  const show = () => edit('show', 'studio', [], { section: 'colors' })
  const initial = await show()
  assert.equal(initial.missedError, undefined)
  const disabled = initial.missed.find(issue => issue.kind === 'disabled-fill' && issue.mode === 'light')
  const navigation = initial.missed.find(issue => issue.kind === 'selected-fill' && issue.part === 'side-nav-item')
  const status = initial.missed.find(issue => issue.kind === 'status-fill' && issue.part === 'badge')
  const square = initial.missed.find(issue => issue.kind === 'pill-corners' && issue.part === 'badge')
  const shadow = initial.missed.find(issue => issue.kind === 'soft-shadow' && issue.part === 'dialog' && issue.mode === 'light')
  assert.ok(disabled.verifiedSamples > 1)
  assert.ok(square.verifiedSamples > 1)
  assert.match(disabled.line, /--when variant:primary --state disabled --mode light/)
  assert.deepEqual(navigation.when, { size: 'sm' })
  assert.equal(navigation.mode, 'light')
  assert.deepEqual(status.when, { tone: 'success' })
  assert.match(shadow.line, /--on dialog --state open --mode light/)
  assert.deepEqual(initial.missed.slice(0, 5).map(issue => issue.kind), ['disabled-fill', 'selected-fill', 'status-fill', 'pill-corners', 'soft-shadow'])
  assert.equal(initial.missed.some(issue => issue.part === 'tooltip' || issue.part === 'radio'), false)
  const sheet = await readFile(join(initial.preview.directory, 'sheet-colors.html'), 'utf8')
  assert.match(sheet, /href="#theme-repairs"/)
  assert.match(sheet, /id="theme-repairs"/)

  const registry = join(initial.preview.directory, '../../syntrofic.themes.json')
  const saved = await readFile(registry, 'utf8')
  const query = await edit('how', 'repairs', [], { theme: 'studio' })
  assert.deepEqual(query.missed, initial.missed)
  assert.equal(await readFile(registry, 'utf8'), saved)

  for (const candidate of [disabled, navigation, status, square, shadow]) {
    for (const step of candidate.steps) {
      const result = await edit('set', 'studio', [step.setting, step.value], step.options)
      assert.ok(result.changes.paint?.reaches?.length || result.changes.styles?.reaches?.length)
    }
  }
  const updated = await show()
  for (const candidate of [disabled, navigation, status, square, shadow]) {
    assert.ok(updated.missed.every(item => item.line !== candidate.line), candidate.line)
  }
  assert.ok(updated.missed.some(issue => issue.kind === 'disabled-fill' && issue.mode === 'dark'))

  await edit('new', 'geometry', [], { like: 'neutral' })
  await edit('set', 'geometry', ['--sy-radius-md', '8px'])
  const geometry = await edit('how', 'repairs', [], { theme: 'geometry' })
  const framed = geometry.missed.find(issue => issue.kind === 'container-corners' && issue.part === 'card')
  assert.ok(framed.verifiedSamples > 1)
  for (const step of framed.steps) await edit('set', 'geometry', [step.setting, step.value], step.options)
  assert.ok((await edit('how', 'repairs', [], { theme: 'geometry' })).missed.every(issue => issue.line !== framed.line))
})

test('gradient text repairs are provided by set and how, keep the fill, and leave the other mode alone', browser, async t => {
  const edit = await editor(t)
  await edit('new', 'studio', [], { like: 'neutral' })
  const scope = { on: 'button', when: ['variant:primary'], mode: 'light', only: true }
  const dark = { ...scope, mode: 'dark' }
  const originalDark = await edit('show', 'studio', [], dark)
  const gradient = 'linear-gradient(#ffffff, #dedede)'
  const changed = await edit('set', 'studio', ['background', gradient], scope)
  const warning = changed.changes.paint.contrast.find(row => row.state === 'rest')
  assert.equal(warning.method, 'gradient-bounds')
  assert.ok(warning.ratio < 2)
  assert.match(warning.fix, /--on button --when variant:primary --mode light --only$/)

  const query = () => edit('how', 'repairs', [], { theme: 'studio' })
  const { contrastRepairs, renderedContrast } = await query()
  const repair = contrastRepairs.find(candidate => candidate.line === warning.fix)
  assert.ok(repair.afterRatio >= repair.minimum)
  assert.ok(repair.verifiedSamples > 1)
  assert.ok(renderedContrast.measured > 1000)
  const shown = await edit('show', 'studio', [], { section: 'colors' })
  const sample = await readFile(join(shown.preview.directory, 'sheet-colors.html'), 'utf8')
  assert.match(sample, /文字对比度 [\d.]+∶1 → [\d.]+∶1/)

  for (const step of repair.steps) await edit('set', 'studio', [step.setting, step.value], step.options)
  const fixed = await edit('show', 'studio', [], scope)
  const fixedRest = fixed.modes.light.find(row => row.state === 'rest')
  assert.ok(fixedRest.contrast.text.ratio >= fixedRest.contrast.text.minimum)
  assert.match(fixedRest.styles['background-color'].value, /rgba\(0, 0, 0, 0\)/)
  assert.equal((await query()).contrastRepairs.some(candidate => candidate.line === repair.line), false)
  assert.deepEqual((await edit('show', 'studio', [], dark)).modes.dark.map(row => row.contrast),
    originalDark.modes.dark.map(row => row.contrast))

  // This gradient contains both extremes. One foreground cannot clear its entire range.
  const mixed = await edit('set', 'studio', ['background', 'linear-gradient(#000000, #ffffff)'], scope)
  const unresolved = mixed.changes.paint.contrast.find(row => row.state === 'rest')
  assert.equal(unresolved.method, 'gradient-bounds')
  assert.equal(unresolved.fix, undefined)
})

test('photo captions and dark media controls receive rendered repairs inside a light-only theme', browser, async t => {
  const edit = await editor(t)
  await edit('new', 'studio', [], { like: 'neutral' })
  const caption = { on: 'lightbox', mode: 'dark', only: true }
  const badCaption = await edit('set', 'studio', ['color', '#202020'], caption)
  const captionWarning = badCaption.changes.paint.contrast.find(issue => issue.surface === 'media')
  assert.ok(captionWarning.ratio < 2)
  assert.match(captionWarning.fix, /--on lightbox --mode dark --only$/)
  await edit('set', 'studio', ['mode', 'light-only'])
  const query = () => edit('how', 'repairs', [], { theme: 'studio' })
  const look = (await query()).contrastRepairs.find(issue => issue.line === captionWarning.fix)
  assert.deepEqual(look.verifiedModes, ['dark'])
  assert.deepEqual(look.surfaces, ['media'])
  for (const step of look.steps) {
    const fixed = await edit('set', 'studio', [step.setting, step.value], step.options)
    assert.deepEqual(fixed.changes.paint.reaches, [])
    assert.ok(fixed.changes.paint.mediaReaches.length)
  }
  const inspected = await edit('show', 'studio', [], caption)
  assert.deepEqual(inspected.modes, {})
  assert.ok(inspected.media.dark[0].contrast.text.ratio >= 4.5)

  const controls = { on: 'button', when: ['variant:secondary'], only: true }
  const badButton = await edit('set', 'studio', ['background', 'linear-gradient(#ffffff, #dedede)'], controls)
  const darker = badButton.changes.paint.contrast.find(issue => issue.mode === 'dark' && issue.surface === 'media')
  assert.ok(darker.ratio < 2)
  assert.match(darker.fix, /--on button --when variant:secondary --only$/)
  const audit = await query()
  const repair = audit.contrastRepairs.find(issue => issue.line === darker.fix)
  assert.deepEqual(repair.verifiedModes, ['light', 'dark'])
  assert.deepEqual(repair.surfaces, ['media'])
  const sheet = await edit('show', 'studio', [], { section: 'overlays' })
  const html = await readFile(join(sheet.preview.directory, 'sheet-overlays.html'), 'utf8')
  assert.match(html, /aria-label="媒体区域配色"/)
  assert.match(html, /aria-label="媒体区域配色"[\s\S]*data-sy-brand="theme-overlay-media-dark"/)
  assert.match(html, /文字对比度 [\d.]+∶1 → [\d.]+∶1/)

  for (const step of repair.steps) await edit('set', 'studio', [step.setting, step.value], step.options)
  const result = await edit('show', 'studio', [], controls)
  assert.deepEqual(Object.keys(result.modes), ['light'])
  assert.ok(result.media.dark.find(sample => sample.state === 'rest').contrast.text.ratio >= 4.5)
  const lookup = await edit('how', 'what is the color of secondary buttons in dark mode', [], { theme: 'studio' })
  assert.equal(lookup.lookups[0].readings[0].surface, 'media')
  const suggestion = await edit('how', 'set secondary button color to #353535 in dark mode', [], { theme: 'studio' })
  assert.equal(suggestion.steps[0].validation, 'rendered')
  assert.match(suggestion.commands[0], /--on button --when variant:secondary --mode dark --only$/)
  assert.equal((await query()).renderedContrast.issues.some(issue => issue.surface === 'media'
    && ['button', 'lightbox', 'lightbox-caption-panel'].includes(issue.part)), false)
})
