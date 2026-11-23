import { readFile } from 'node:fs/promises'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { measureNavigationFit } from './navigation-fit.mjs'
import { themeEditorChange, themeEditorCommand, themeEditorModes } from './theme-editor.mjs'
import { documentFor } from './theme-part-report.mjs'
import { withThemeBrowser } from './theme-pictures.mjs'
import { projectThemeInteractions } from './theme-interactions.mjs'

const navigationParts = new Set(['app-shell-header', 'layout-header', 'top-nav', 'top-nav-item', 'top-nav-heading', 'top-nav-heading-title'])
const geometry = /^(?:height|min-height|padding(?:-|$)|border(?:-|$)|font-size|font-family|line-height|--sy-top-nav-title-size)/
const blockPadding = /^(?:padding|padding-block(?:-start|-end)?|padding-top|padding-bottom)$/
const sampleKey = ({ mode, placement, density, state, viewport }) => [mode, placement, density, state, viewport].join('/')
const issueGap = issue => issue.height - issue.available
const needsRoom = samples => samples.some(sample => sample.issues.length)

function navigationSamples(ui, states) {
  const samples = [
    { bar: 'app-shell-header', placement: 'app-shell-header', render: nav => h(ui.SAppLayout, { stickyNavbar: false }, { navbar: nav }) },
    { bar: 'layout-header', placement: 'layout-header', render: nav => h(ui.SLayoutHeader, { padding: '0', hasDivider: false }, { default: nav }) },
    { bar: 'layout-header', placement: 'layout-header-scrollable', render: nav =>
      h(ui.SLayoutHeader, { padding: '0', hasDivider: false, scrollable: true }, { default: nav }) },
    { bar: 'layout-header', placement: 'layout-region', render: nav =>
      h(ui.SLayout, { padding: '0', defaultHasDividers: false }, { header: nav }) },
    { bar: 'top-nav', placement: 'standalone', render: nav => nav() },
  ]
  const app = createSSRApp({ render: () => h('div', samples.flatMap(({ bar, placement, render }) =>
    ['compact', 'comfortable'].flatMap(density => states.flatMap(state => {
      const items = [{ id: 'reviews', label: 'Reviews', href: '#reviews', disabled: state === 'disabled' }]
      const nav = () => h(ui.SNavbar, { brand: 'Studio', brandDescription: 'Workspace', brandHref: '#studio',
        defaultCurrent: state === 'selected' ? 'reviews' : undefined, items, density, breakpoint: 0 })
      // Match the element-sized breakpoint without hydrating the diagnostics page.
      // A narrow navigation shell shows its actual compact disclosure control.
      const viewports = state === 'rest' ? ['wide', 'narrow'] : ['wide']
      return viewports.map(viewport => h('div', {
        'data-navigation-fit': bar, 'data-placement': placement, 'data-density': density, 'data-state': state,
        'data-viewport': viewport, ...(viewport === 'narrow' && { style: { maxInlineSize: '390px' } }),
      }, render(nav)))
    })))) })
  return renderToString(app)
}

function projectNavigationCases() {
  const states = { hover: 'hover', active: 'hover active', 'focus-visible': 'focus focus-visible' }
  for (const sample of document.querySelectorAll('[data-navigation-fit]')) {
    const navbar = sample.querySelector('.sy-navbar')
    if (!navbar) continue
    if (sample.dataset.viewport === 'narrow') navbar.dataset.compact = ''
    const state = states[sample.dataset.state]
    if (state) navbar.querySelector('.sy-navbar__desktop > li > .sy-navigation-link')?.setAttribute('data-theme-state', state)
  }
}

const change = (setting, value, on, state) => ({ setting, value, options: { on, ...(state && { state }) } })

function compactSteps(rules, samples) {
  const authored = new Set(rules.filter(rule => rule.target === 'top-nav-item'
    && Object.keys(rule.declarations).some(name => blockPadding.test(name))).map(rule => rule.state))
  const reductions = new Map()
  for (const sample of samples) {
    const state = authored.has(sample.state) ? sample.state : sample.state === 'active' && authored.has('hover') ? 'hover' : undefined
    if (!authored.has(state)) continue
    for (const issue of sample.issues) {
      if (issue.part !== 'top-nav-item') continue
      const [start, end] = issue.padding
      const sum = start + end
      if (sum <= 0 || sum < issueGap(issue)) continue
      const scale = (sum - issueGap(issue)) / sum
      const smaller = [start, end].map(value => Math.floor(value * scale * 100) / 100)
      const old = reductions.get(state)
      if (!old || smaller[0] + smaller[1] < old[0] + old[1]) reductions.set(state, smaller)
    }
  }
  return [...reductions].map(([state, [start, end]]) => change('padding-block',
    start === end ? start + 'px' : start + 'px ' + end + 'px', 'top-nav-item', state))
}

function largerSteps(reach, row, rules, samples) {
  const heights = new Map()
  function raise(part, height, state) {
    const key = [part, state].join('/')
    const rounded = Math.ceil(height * 100) / 100
    if (rounded > (heights.get(key)?.height ?? 0)) heights.set(key, { part, height: rounded, state })
  }
  for (const sample of samples.filter(sample => sample.issues.length)) {
    const { bar, available, hostHeight, rowHeight, rowCssHeight, rowInset, issues } = sample
    const required = Math.max(rowHeight, ...issues.map(issue => issue.height + (issue.part === 'top-nav' ? 0 : rowInset)))
    if (bar !== 'top-nav' && required - available > .25) {
      const targets = reach?.reaches ? reach.bars.map(entry => entry.part) : [bar]
      for (const target of targets) raise(target, hostHeight + required - available)
    }
    if ((bar === 'top-nav' || row?.height) && required - rowHeight > .25) raise('top-nav', rowCssHeight + required - rowHeight)
    for (const issue of issues) {
      if (issue.part !== 'top-nav-item' || !issue.clipped) continue
      const scope = rules.some(rule => rule.target === issue.part && rule.state === sample.state && rule.declarations.height) ? sample.state : undefined
      raise(issue.part, issue.cssHeight + issue.height - issue.boxHeight, scope)
    }
  }
  return [...heights.values()].map(({ part, height, state }) => change('height', height + 'px', part, state))
}

// Test the same editor changes the published commands will apply, including
// a project source file that can shadow a proposed override.
async function patchedTheme(ui, registered, steps, effective) {
  let candidate = registered
  for (const { setting, value, options } of steps) {
    const changes = themeEditorChange(ui, candidate, setting, value, options)
    candidate = ui.applyBrandPatch(candidate, { revision: candidate.revision, changes })
  }
  return effective(candidate)
}

function verifyLayout(before, after) {
  if (before.length !== after.length || needsRoom(after)) return false
  const observed = new Map(after.map(sample => [sampleKey(sample), sample]))
  return before.every(sample => {
    const compare = observed.get(sampleKey(sample))
    return compare?.controls.length === sample.controls.length && sample.controls.every((control, index) => {
      const current = compare.controls[index]
      return current.part === control.part && current.height >= Math.min(control.height, 24) - .01
    })
  })
}

function reportRepair(theme, strategy, steps, before, after) {
  const commands = steps.map(step => {
    const { setting, value, options } = step
    const command = themeEditorCommand(['set', theme.id, setting, value, '--on', options.on, ...(options.state ? ['--state', options.state] : [])])
    return { ...step, command }
  })
  return { kind: 'navigation-fit', strategy, part: commands[0].options.on,
    steps: commands, line: commands.map(step => step.command).join(' && '), verifiedSamples: after.length,
    verifiedModes: [...new Set(after.map(sample => sample.mode))], beforeShortfall: Math.max(...before.flatMap(sample => sample.issues.map(issueGap))),
  }
}

async function navigationRepairs(ui, theme, registered, effective, read, before) {
  const repairs = []
  const rules = Object.values(ui.resolveBrandThemeRules(theme).rules ?? {})
  const compact = compactSteps(rules, before)
  if (compact.length) {
    const preview = await patchedTheme(ui, registered, compact, effective)
    const after = await read(preview)
    if (verifyLayout(before, after)) repairs.push(reportRepair(theme, 'keep-height', compact, before, after))
  }

  const plan = new Map()
  let samples = before
  let preview = theme
  // A taller shared row can require a second increase in another host.
  // Keep the largest required size per edited scope until the plan fits.
  for (let pass = 0; pass < 3; pass++) {
    const resolved = ui.resolveBrandThemeRules(preview).rules
    const reach = ui.brandNavigationReach(resolved)
    const row = resolved?.['top-nav-both-base']?.declarations
    const increments = largerSteps(reach, row, rules, samples)
    let amended = false
    for (const step of increments) {
      const key = [step.options.on, step.options.state].join('/')
      if (parseFloat(step.value) <= parseFloat(plan.get(key)?.value ?? '0')) continue
      plan.set(key, step)
      amended = true
    }
    if (!amended) break
    const steps = [...plan.values()]
    preview = await patchedTheme(ui, registered, steps, effective)
    samples = await read(preview)
    if (verifyLayout(before, samples)) {
      repairs.push(reportRepair(theme, 'grow', steps, before, samples))
      break
    }
  }
  return repairs
}

export async function themeNavigationReport(directory, ui, report, fonts, {
  registered = report.theme, effective = async theme => theme, writable = true,
} = {}) {
  const { theme } = report
  const resolved = Object.values(ui.resolveBrandThemeRules(theme).rules ?? {})
  const authored = resolved.filter(rule => navigationParts.has(rule.target) && Object.keys(rule.declarations).some(name => geometry.test(name)))
  if (!authored.length && !report.navigationReach) return
  const states = ['rest', ...new Set(authored.flatMap(rule => rule.target === 'top-nav-item' && rule.state ? [rule.state] : []))]
  const cache = new Map()
  try {
    const [style, markup] = await Promise.all([
      readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8'), navigationSamples(ui, states),
    ])
    return await withThemeBrowser(directory, {
      timeout: 45000, timeoutMessage: 'Navigation size inspection exceeded 45 seconds.',
      missingBrowser: 'Install Playwright Chromium or Google Chrome to measure navigation sizes.',
    }, async renderer => {
      const read = async candidate => {
        const palette = ui.exportBrandTheme(candidate)['theme.css']
        const samples = []
        for (const mode of themeEditorModes(theme)) {
          const html = await documentFor({ style, palette, markup, mode, theme: candidate.id, fonts, cached: cache })
          await renderer.load({ mode, html })
          const supportsScopes = await renderer.evaluate(async () => {
            await document.fonts.ready
            return typeof CSSScopeRule === 'function'
          })
          if (!supportsScopes) throw new Error('Navigation inspection requires a browser with CSS @scope support.')
          if (states.length > 1) await renderer.evaluate(projectThemeInteractions)
          await renderer.evaluate(projectNavigationCases)
          const measured = await renderer.evaluate(measureNavigationFit)
          samples.push(...measured.map(sample => ({ ...sample, mode })))
        }
        return samples
      }
      const samples = await read(theme)
      if (!samples.length) throw new Error('Navigation inspection did not render any navigation rows.')
      let repairs = []
      let verificationError
      if (writable && needsRoom(samples)) {
        try { repairs = await navigationRepairs(ui, theme, registered, effective, read, samples) }
        catch (error) { verificationError = error.message.split('\n')[0] }
      }
      const preferred = repairs[0]
      const layoutIssues = samples.flatMap(({ bar, placement, density, state, mode, viewport, issues }) =>
        issues.map(({ cssHeight, boxHeight, padding, ...issue }) => ({
          ...issue, bar, placement, density, state, mode, ...(viewport === 'narrow' && { viewport }),
          ...(preferred && { fix: preferred.line, ...(preferred.steps.length > 1 && { fixes: preferred.steps.map(step => step.command) }) }),
        })))
      return { layoutIssues, layoutRepairs: repairs, layoutCheck: {
        status: 'measured', inspected: samples.length, viewport: { width: 1200, height: 960 }, compactWidth: 390,
        ...(verificationError && { verificationError }),
      } }
    })
  } catch (error) {
    return { layoutCheck: { status: error.code === 'ERR_THEME_BROWSER_REQUIRED' ? 'browser-unavailable' : 'render-failed', message: error.message } }
  }
}
