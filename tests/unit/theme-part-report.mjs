import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { brandPaginationFrames, brandRuleKey, defineBrandTheme, resolveBrandThemeRules } from '@syntrofic/ui'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }

function editor(project, action, ...args) {
  const result = spawnSync(process.execPath, [cli, 'experimental', 'theme', 'editor', action, ...args], {
    cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  })
  if (result.error) throw result.error
  return result
}
const show = (project, ...args) => editor(project, 'show', ...args)

test('theme rules compose rendered states and normalize aliases before saving', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-compound-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const toggle = ['--on', 'toggle-button', '--when', 'tone:accent', '--mode', 'light']
  const advice = run('how', 'make the hovered and pressed accent toggle button background #eae1f0 in light mode', '--theme', 'studio')
  assert.deepEqual(advice.commands, ["syntrofic theme editor set studio background-color '#eae1f0' --on toggle-button --when tone:accent --state 'hover+pressed' --mode light"])
  assert.equal(advice.steps[0].validation, 'rendered')
  run('set', 'studio', 'background-color', '#e2ece3', ...toggle, '--state', 'aria-pressed')
  run('set', 'studio', 'background-color', '#edf2f5', ...toggle, '--state', 'hover')
  const changed = run('set', 'studio', 'background-color', '#eae1f0', ...toggle, '--state', 'isPressed+hover')
  assert.ok(changed.changes.rules.some(rule => rule.state === 'hover+pressed'))
  const reached = ['active+focus-visible+hover+pressed', 'active+hover+pressed', 'focus-visible+hover+pressed', 'hover+pressed']
  assert.deepEqual([...new Set(changed.changes.paint.reaches.map(sample => sample.state))].sort(),
    [...reached, ...reached.map(state => [...state.split('+'), 'grouped'].sort().join('+'))].sort())
  const color = state => run('show', 'studio', ...toggle, '--state', state).modes.light[0].styles['background-color'].value
  assert.equal(color('aria-pressed'), 'rgb(226, 236, 227)')
  assert.equal(color('pressed+hover'), 'rgb(234, 225, 240)')
  assert.equal(color('unpressed+hover'), 'rgb(237, 242, 245)')
  const grouped = run('how', 'make the grouped pressed accent toggle buttons #e6ede7 in light mode', '--theme', 'studio')
  assert.deepEqual(grouped.commands, ["syntrofic theme editor set studio background-color '#e6ede7' --on toggle-button --when tone:accent --state 'grouped+pressed' --mode light"])
  run('set', 'studio', 'background-color', '#e6ede7', ...toggle, '--state', 'grouped+pressed')
  assert.equal(color('pressed+grouped'), 'rgb(230, 237, 231)')
  assert.equal(color('pressed'), 'rgb(226, 236, 227)')
  const vertical = ['--on', 'toggle-button-group', '--when', 'orientation:vertical+size:sm']
  run('set', 'studio', 'gap', '8px', ...vertical)
  assert.equal(run('show', 'studio', ...vertical, '--mode', 'light', '--state', 'rest').modes.light[0].styles.gap.value, '8px')
  const invalid = editor(project, 'set', 'studio', 'background-color', '#ffffff', ...toggle, '--state', 'pressed+unpressed')
  assert.notEqual(invalid.status, 0)
  assert.match(invalid.stderr, /Unknown state pressed\+unpressed/)

  const mark = run('how', 'make the checked and disabled checkbox #e8d7f6 in light mode', '--theme', 'studio')
  assert.deepEqual(mark.commands, ["syntrofic theme editor set studio background-color '#e8d7f6' --on checkbox-indicator --state 'checked+disabled' --mode light"])
  const checkbox = ['--on', 'checkbox-indicator', '--mode', 'light']
  run('set', 'studio', 'color', '#fff0c0', ...checkbox, '--state', 'checked')
  run('set', 'studio', 'color', '#e8d7f6', ...checkbox, '--state', 'disabled+checked')
  const glyph = state => run('show', 'studio', ...checkbox, '--state', state).modes.light[0].parts.checkmark['border-right-color'].value
  assert.equal(glyph('checked'), 'rgb(255, 240, 192)')
  assert.equal(glyph('checked+disabled'), 'rgb(232, 215, 246)')

  const thumb = run('how', 'make the switch thumb #624d73 while selected and dragging in light mode', '--theme', 'studio')
  assert.deepEqual(thumb.commands, ["syntrofic theme editor set studio background-color '#624d73' --on switch-thumb --state 'dragging+selected' --mode light"])
  const switchRule = ['--on', 'switch-thumb', '--mode', 'light']
  run('set', 'studio', 'background-color', '#624d73', ...switchRule, '--state', 'dragging+selected')
  const drag = run('show', 'studio', ...switchRule, '--state', 'selected+dragging').modes.light
  assert.ok(drag.length && drag.every(sample => sample.placement === 'dragging-on' && sample.styles['background-color'].value === 'rgb(98, 77, 115)'))
})

test('button icon colors and dialog title typography have independent rendered styles', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-ink-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const icons = run('how', "make the secondary buttons' icons #365975 in light mode", '--theme', 'studio')
  assert.deepEqual(icons.commands, ["syntrofic theme editor set studio --sy-button-icon-color '#365975' --on button --when variant:secondary --mode light"])
  assert.equal(icons.steps[0].validation, 'rendered')

  const button = ['--on', 'button', '--when', 'variant:secondary+size:md+elevation:none', '--mode', 'light']
  const before = run('show', 'studio', ...button, '--state', 'rest').modes.light[0]
  const worst = run('set', 'studio', '--sy-button-icon-color', before.contrast.startIcon.background, ...button)
  const issue = worst.changes.paint.contrast.find(item => item.text === 'startIcon' && item.state === 'rest')
  assert.ok(issue.ratio < 3 && issue.previousRatio >= 3)
  assert.match(issue.fix, /--sy-button-icon-color .* --on button .*--mode light/)
  run('set', 'studio', '--sy-button-icon-color', '#365975', ...button)
  const after = run('show', 'studio', ...button, '--state', 'rest').modes.light[0]
  assert.equal(after.styles.color.value, before.styles.color.value)
  assert.equal(after.parts.startIcon.color.value, 'rgb(54, 89, 117)')
  assert.equal(after.parts.endIcon.color.value, 'rgb(54, 89, 117)')
  assert.equal(after.parts.endIcon.color.source, 'theme')
  assert.ok(after.contrast.endIcon.ratio >= 3)
  const busy = run('show', 'studio', ...button, '--state', 'loading').modes.light[0]
  assert.equal(busy.contrast.startIcon.status, 'inactive')

  const title = ['--on', 'dialog-header-title-block']
  const bold = run('how', '对话框页头标题字重改为 800', '--theme', 'studio')
  assert.deepEqual(bold.commands, ['syntrofic theme editor set studio font-weight 800 --on dialog-header-title-block --when variant:header'])
  assert.equal(bold.steps[0].validation, 'rendered')
  const hero = run('show', 'studio', ...title, '--when', 'variant:hero', '--mode', 'light').modes.light[0]
  run('set', 'studio', 'font-weight', '800', ...title, '--when', 'variant:header')
  run('set', 'studio', 'font-size', '22px', ...title, '--when', 'variant:header')
  const titles = run('show', 'studio', ...title, '--mode', 'light').modes.light
  const standard = titles.find(sample => sample.when.variant === 'header')
  const media = titles.find(sample => sample.when.variant === 'hero')
  assert.equal(standard.styles['font-weight'].value, '800')
  assert.equal(standard.styles['font-size'].value, '22px')
  assert.equal(media.styles['font-weight'].value, hero.styles['font-weight'].value)
  assert.equal(media.styles['font-size'].value, hero.styles['font-size'].value)
})

test('component icon edits reach the painted arrow, dialog glyph and toast action', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-icons-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const arrow = run('how', '下拉框箭头展开时改为 #624d73 浅色模式', '--theme', 'studio')
  assert.deepEqual(arrow.commands, ["syntrofic theme editor set studio color '#624d73' --on selector-indicator-icon --state expanded --mode light"])
  const dialog = run('how', 'make the close button in the dialog #775149', '--theme', 'studio')
  assert.deepEqual(dialog.commands, ["syntrofic theme editor set studio color '#775149' --on dialog-header-close-icon"])
  const toast = run('how', 'make the close button of toasts #365975', '--theme', 'studio')
  assert.deepEqual(toast.commands, ["syntrofic theme editor set studio color '#365975' --on toast-close"])
  assert.ok([arrow, dialog, toast].every(result => result.steps[0].validation === 'rendered'))

  const select = ['--on', 'selector-indicator-icon', '--when', 'variant:input+size:md', '--mode', 'light']
  const closed = [...select, '--state', 'collapsed']
  const before = run('show', 'studio', ...closed).modes.light[0]
  const lowered = run('set', 'studio', 'color', before.contrast.icon.background, ...closed)
  const warning = lowered.changes.paint.contrast.find(issue => issue.text === 'icon' && issue.state === 'rest')
  assert.ok(warning.ratio < 3 && warning.previousRatio >= 3)
  assert.match(warning.fix, / color .* --on selector-indicator-icon .*--state collapsed/)
  run('set', 'studio', 'color', '#365975', ...closed)
  run('set', 'studio', 'color', '#624d73', ...select, '--state', 'expanded')
  const expanded = run('show', 'studio', ...select, '--state', 'expanded').modes.light[0]
  assert.equal(expanded.parts.icon['border-bottom-color'].value, 'rgb(98, 77, 115)')
  assert.equal(run('show', 'studio', ...closed).modes.light[0].styles.color.value, 'rgb(54, 89, 117)')

  const close = ['--on', 'dialog-header-close-icon', '--mode', 'light']
  const hero = run('show', 'studio', ...close, '--when', 'variant:hero', '--state', 'rest').modes.light[0]
  run('set', 'studio', 'color', '#775149', ...close, '--when', 'variant:header')
  const headers = run('show', 'studio', ...close, '--state', 'rest').modes.light
  assert.equal(headers.find(sample => sample.when.variant === 'header').styles.color.value, 'rgb(119, 81, 73)')
  assert.equal(headers.find(sample => sample.when.variant === 'hero').styles.color.value, hero.styles.color.value)

  const notification = ['--on', 'toast-close', '--mode', 'light']
  run('set', 'studio', 'color', '#365975', ...notification, '--when', 'tone:success', '--state', 'hover')
  const buttons = run('show', 'studio', ...notification, '--state', 'hover').modes.light
  assert.equal(buttons.find(sample => sample.when.tone === 'success').parts.icon.color.value, 'rgb(54, 89, 117)')
  assert.notEqual(buttons.find(sample => sample.when.tone === 'neutral').parts.icon.color.value, 'rgb(54, 89, 117)')
})

test('choice indicators measure each glyph and the visual switch state independently', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-choice-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const advice = run('how', 'make the checked indicator in checkboxes #fff0c0 in light mode', '--theme', 'studio')
  assert.deepEqual(advice.commands, ["syntrofic theme editor set studio background-color '#fff0c0' --on checkbox-indicator --state checked --mode light"])
  assert.equal(advice.steps[0].validation, 'rendered')
  const mixed = run('how', 'make indeterminate checkboxes #f1e0ff in light mode', '--theme', 'studio')
  assert.deepEqual(mixed.commands, ["syntrofic theme editor set studio background-color '#f1e0ff' --on checkbox-indicator --when checked:indeterminate --mode light"])
  const scope = ['--on', 'checkbox-indicator', '--state', 'checked', '--mode', 'light']
  const base = run('show', 'studio', ...scope).modes.light[0].contrast.checkmark
  const changed = run('set', 'studio', 'color', base.background, ...scope)
  const warning = changed.changes.paint.contrast.find(item => item.text === 'checkmark')
  assert.ok(warning.ratio < 3 && warning.previousRatio >= 3)
  assert.match(warning.fix, /--on checkbox-indicator.* --mode light/)
  run('set', 'studio', 'background-color', '#fff0c0', ...scope)
  const painted = run('show', 'studio', ...scope).modes.light[0]
  assert.equal(painted.styles.color.value, 'rgb(255, 240, 192)')
  assert.equal(painted.parts.checkmark['border-right-color'].value, 'rgb(255, 240, 192)')
  assert.ok(painted.contrast.checkmark.ratio >= 3)
  const originalMixed = run('show', 'studio', '--on', 'checkbox-indicator', '--when', 'checked:indeterminate', '--state', 'rest', '--mode', 'light')
  assert.notEqual(originalMixed.modes.light[0].styles.color.value, 'rgb(255, 240, 192)')
  const radio = run('how', '单选框圆点颜色改为 #365975 浅色模式', '--theme', 'studio')
  assert.deepEqual(radio.commands, ["syntrofic theme editor set studio background-color '#365975' --on radio-indicator-dot --mode light"])
  run('set', 'studio', 'background-color', '#365975', '--on', 'radio-indicator-dot', '--mode', 'light')
  assert.equal(run('show', 'studio', '--on', 'radio-indicator-dot', '--state', 'rest', '--mode', 'light').modes.light[0].styles['background-color'].value, 'rgb(54, 89, 117)')
  run('set', 'studio', 'background-color', '#ffeecc', '--on', 'switch-thumb', '--state', 'selected', '--mode', 'light')
  run('set', 'studio', 'background-color', '#624d73', '--on', 'switch-thumb', '--state', 'unchecked', '--mode', 'light')
  run('set', 'studio', 'background-color', '#ffffff', '--on', 'switch-thumb', '--state', 'loading', '--mode', 'light')
  const fill = sample => sample.styles['background-color'].value
  const drag = run('show', 'studio', '--on', 'switch-thumb', '--when', 'size:md', '--state', 'dragging', '--mode', 'light').modes.light
  assert.equal(fill(drag.find(item => item.placement === 'dragging-on')), 'rgb(255, 238, 204)')
  assert.equal(fill(drag.find(item => item.placement === 'dragging-off')), 'rgb(98, 77, 115)')
  const busy = run('show', 'studio', '--on', 'switch-thumb', '--when', 'size:md', '--state', 'loading', '--mode', 'light').modes.light
  assert.ok(busy.every(sample => fill(sample) === 'rgb(255, 255, 255)'))
})

test('divider edits reach their rendered lines in menus and around labels', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-dividers-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const red = run('how', 'make the menu separators red', '--theme', 'studio')
  assert.deepEqual(red.commands, ["syntrofic theme editor set studio --sy-border '#ff0000' --on dropdown-menu-divider"])
  assert.equal(red.steps[0].validation, 'rendered')
  const hide = run('how', '隐藏下拉菜单分隔线', '--theme', 'studio')
  assert.deepEqual(hide.commands, ['syntrofic theme editor set studio height 0px --on dropdown-menu-divider --when context:dropdown'])
  const changed = run('set', 'studio', 'height', '0px', '--on', 'dropdown-menu-divider', '--when', 'context:dropdown')
  assert.ok(changed.changes.styles.reaches.length && changed.changes.styles.reaches.every(sample => sample.values.height.after === '0px'))
  const menu = run('show', 'studio', '--on', 'dropdown-menu-divider', '--when', 'presentation:sheet', '--mode', 'light').modes.light
  assert.ok(menu.some(sample => sample.when.context === 'dropdown' && sample.styles.height.value === '0px'))
  assert.ok(menu.some(sample => sample.when.context === 'context' && sample.styles.height.value === '1px'))

  const thinner = run('how', 'make dividers thinner', '--theme', 'studio')
  assert.deepEqual(thinner.commands, ['syntrofic theme editor set studio --sy-border-width 0.5px --on divider'])
  const softer = run('how', 'make strong dividers less visible', '--theme', 'studio')
  assert.equal(softer.commands.length, 2)
  assert.ok(softer.steps.every(step => step.validation === 'rendered' && step.scope.when.includes('variant:strong')))
  run('set', 'studio', '--sy-border-strong', '#909090', '--on', 'divider', '--when', 'variant:strong', '--mode', 'light')
  const report = run('show', 'studio', '--on', 'divider', '--when', 'variant:strong+orientation:horizontal', '--mode', 'light')
  const labelled = report.modes.light.find(sample => sample.placement === 'labelled')
  assert.equal(labelled.styles['background-color'].value, 'rgba(0, 0, 0, 0)')
  assert.equal(labelled.parts.start['background-color'].value, 'rgb(144, 144, 144)')
  assert.equal(labelled.parts.end['background-color'].value, 'rgb(144, 144, 144)')
  const unused = editor(project, 'set', 'studio', '--sy-border', '#a9a9a9', '--on', 'divider', '--when', 'variant:strong')
  assert.notEqual(unused.status, 0)
  assert.match(unused.stderr, /does not read --sy-border.*--sy-border-strong/)
})

test('calendar day editing distinguishes picker dates, range interiors, today, and focus', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-calendar-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  const picker = ['--on', 'calendar-day', '--when', 'context:picker', '--state', 'selected']
  for (const question of ['make the date picker selected day #365975 in light mode', '日期选择器选中日期底色改为 #365975 浅色模式']) {
    const advice = run('how', question, '--theme', 'studio')
    assert.deepEqual(advice.commands, ["syntrofic theme editor set studio background-color '#365975' --on calendar-day --when context:picker --state selected --mode light"])
    assert.equal(advice.steps[0].validation, 'rendered')
  }
  const edit = run('set', 'studio', 'background-color', '#365975', ...picker, '--mode', 'light')
  assert.ok(edit.changes.paint.reaches.length && edit.changes.paint.reaches.every(({ when, mode }) => when.context === 'picker' && mode === 'light'))
  const selected = run('show', 'studio', '--on', 'calendar-day', '--when', 'variant:single', '--state', 'selected')
  const fill = sample => sample.styles['background-color'].value
  assert.deepEqual([...new Set(selected.modes.light.filter(sample => sample.when.context === 'picker').map(fill))], ['rgb(54, 89, 117)'])
  assert.ok(selected.modes.light.filter(sample => sample.when.context === 'inline').every(sample => fill(sample) !== 'rgb(54, 89, 117)'))
  assert.deepEqual(new Set(selected.modes.light.map(sample => sample.placement)), new Set(['month', 'period']))

  const range = ['--on', 'calendar-day', '--when', 'variant:range+context:inline']
  run('set', 'studio', 'background-color', '#eceff2', ...range, '--state', 'in-range', '--mode', 'light')
  const dates = run('show', 'studio', ...range, '--mode', 'light').modes.light
  assert.ok(dates.filter(sample => sample.state === 'in-range').every(sample => fill(sample) === 'rgb(236, 239, 242)'))
  assert.ok(dates.filter(sample => sample.state === 'range-start' || sample.state === 'range-end').every(sample => fill(sample) !== 'rgb(236, 239, 242)'))
  const today = run('how', "make today's date in the calendar bold", '--theme', 'studio')
  assert.deepEqual(today.commands, ['syntrofic theme editor set studio font-weight 700 --on calendar-day --state today'])
  const focus = run('how', 'make the calendar day focus ring blue in dark mode', '--theme', 'studio')
  assert.deepEqual(focus.commands, ["syntrofic theme editor set studio outline-color '#0000ff' --on calendar-day --state focus-visible --mode dark"])
  const invalid = editor(project, 'set', 'studio', 'background-color', '#aaaaaa', '--on', 'calendar-day', '--when', 'variant:single', '--state', 'in-range')
  assert.notEqual(invalid.status, 0)
  assert.match(invalid.stderr, /in-range requires the range calendar variant/)
})

test('progress bars expose track geometry and independent fill and loading paint', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-progress-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  await writeFile(join(project, 'package.json'), '{}')
  run('new', 'studio', '--like', 'neutral')
  for (const question of ['make the progress bar 4px tall', '进度条轨道厚度设为 4px']) {
    const advice = run('how', question, '--theme', 'studio')
    assert.deepEqual(advice.commands, ['syntrofic theme editor set studio height 4px --on progress-bar-track'])
    assert.equal(advice.steps[0].validation, 'rendered')
  }
  const changed = run('set', 'studio', 'height', '4px', '--on', 'progress-bar-track')
  assert.equal(changed.changes.styles.status, 'measured')
  assert.ok(changed.changes.styles.reaches.some(({ state, values }) => state === 'indeterminate' && values.height.after === '4px'))
  const track = run('show', 'studio', '--on', 'progress-bar-track', '--when', 'tone:accent+size:md')
  for (const mode of ['light', 'dark']) {
    assert.equal(track.modes[mode].length, 2)
    assert.ok(track.modes[mode].every(sample => sample.styles.height.value === '4px' && sample.contrast.indicator.minimum === 3))
  }
  const refused = editor(project, 'set', 'studio', 'height', '4px', '--on', 'progress-bar-fill', '--json')
  assert.notEqual(refused.status, 0)
  assert.match(refused.stderr, /progress-bar-fill does not support height/)
  const noIndeterminate = run('how', 'make the progress indicator red when indeterminate', '--theme', 'studio')
  assert.deepEqual(noIndeterminate.commands ?? [], [])
  assert.match(JSON.stringify(noIndeterminate), /indeterminate on progress-bar-fill/)
  const applied = run('set', 'studio', 'background-color', '#eeeef0', '--on', 'progress-bar-fill', '--when', 'tone:accent', '--mode', 'light')
  const warning = applied.changes.paint.contrast.find(issue => issue.text === 'indicator')
  assert.ok(warning.ratio < 3 && warning.previousRatio >= 3)
  const [, color] = warning.fix.match(/background-color '(#[\da-f]{6})' --on progress-bar-fill --when tone:accent --mode light/)
  run('set', 'studio', 'background-color', color, '--on', 'progress-bar-fill', '--when', 'tone:accent', '--mode', 'light')
  const result = run('show', 'studio', '--on', 'progress-bar-fill', '--when', 'tone:accent+size:md')
  assert.ok(result.modes.light[0].contrast.indicator.ratio >= 3)
  const loading = run('set', 'studio', 'background-color', '#d8bfeb', '--on', 'progress-bar-sweep', '--when', 'tone:accent', '--mode', 'dark')
  assert.ok(loading.changes.paint.reaches.every(change => change.mode === 'dark' && change.when.tone === 'accent'))
  const swept = run('show', 'studio', '--on', 'progress-bar-sweep', '--when', 'tone:accent+size:md')
  assert.equal(swept.modes.dark[0].styles['background-color'].value, 'rgb(216, 191, 235)')
})

test('outline button style can change a single variant and mode through the rendered editor', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-button-outline-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio', '--like', 'neutral')
    assert.deepEqual(run('how', 'make buttons outlined', '--theme', 'studio').commands, ['syntrofic theme editor set studio buttons outline'])
    const advice = run('how', 'make the danger buttons outline only', '--theme', 'studio')
    assert.equal(advice.steps[0].validation, 'rendered')
    assert.deepEqual(advice.commands, ['syntrofic theme editor set studio button-style outline --on button --when variant:danger'])
    const selected = ['--on', 'button', '--when', 'variant:danger+size:md+elevation:none']
    const baseline = run('show', 'studio', ...selected)
    const changed = run('set', 'studio', 'button-style', 'outline', '--on', 'button', '--when', 'variant:danger', '--mode', 'dark')
    assert.ok(changed.changes.paint.reaches.some(row => row.state === 'rest' && row.properties.includes('background-color')))
    const after = run('show', 'studio', ...selected)
    const resting = after.modes.dark.find(item => item.state === 'rest').styles
    const hover = after.modes.dark.find(item => item.state === 'hover').styles
    assert.equal(resting['button-style'].value, 'outline')
    assert.equal(resting['background-color'].value, 'rgba(0, 0, 0, 0)')
    assert.equal(resting['border-color'].value, resting.color.value)
    assert.notEqual(hover['background-color'].value, resting['background-color'].value)
    assert.deepEqual(after.modes.light, baseline.modes.light)
    const media = after.media.dark.find(item => item.state === 'rest')
    assert.equal(media.styles['button-style'].value, 'outline')
    run('undo', 'studio', 'button-style', '--on', 'button', '--when', 'variant:danger', '--mode', 'dark')
    assert.equal(run('show', 'studio', ...selected, '--mode', 'dark', '--state', 'rest').modes.dark[0].styles['button-style'].value, 'default')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('input focus rings are measured by mode and validation status', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-input-focus-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const scope = ['--on', 'input-focus-ring', '--state', 'focus-visible']
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio', '--like', 'neutral')
    const pair = run('how', 'make the input focus ring blue in light mode and red in dark mode', '--theme', 'studio')
    assert.deepEqual(pair.commands, [
      "syntrofic theme editor set studio outline-color '#0000ff' --on input-focus-ring --state focus-visible --mode light",
      "syntrofic theme editor set studio outline-color '#ff0000' --on input-focus-ring --state focus-visible --mode dark",
    ])
    assert.ok(pair.steps.every(step => step.validation === 'rendered'))
    run('set', 'studio', 'outline-color', '#0000ff', ...scope, '--mode', 'light')
    run('set', 'studio', 'outline-color', '#ff0000', ...scope, '--mode', 'dark')
    const thinner = run('how', 'make the input focus ring thinner in dark mode', '--theme', 'studio')
    assert.equal(thinner.commands[0], 'syntrofic theme editor set studio outline-width 1px --on input-focus-ring --state focus-visible --mode dark')
    run('set', 'studio', 'outline-width', '1px', ...scope, '--mode', 'dark')
    const error = run('how', "make error inputs' focus ring green", '--theme', 'studio')
    assert.match(error.commands[0], /outline-color '#008000' --on input-focus-ring --when status:error --state focus-visible$/)
    run('set', 'studio', 'outline-color', '#008000', ...scope, '--when', 'status:error')
    const results = run('show', 'studio', ...scope, '--when', 'kind:input')
    const light = results.modes.light.find(cell => cell.when.status === 'default').styles
    const dark = results.modes.dark.find(cell => cell.when.status === 'default').styles
    assert.equal(light['outline-width'].value, '2px')
    assert.equal(dark['outline-width'].value, '1px')
    assert.equal(light['outline-color'].value, 'rgb(0, 0, 255)')
    assert.equal(dark['outline-color'].value, 'rgb(255, 0, 0)')
    for (const mode of ['light', 'dark']) {
      assert.equal(results.modes[mode].find(cell => cell.when.status === 'error').styles['outline-color'].value, 'rgb(0, 128, 0)')
    }
    const read = run('how', 'what is the focus ring width of dark mode error inputs', '--theme', 'studio')
    assert.equal(read.lookups[0].readings[0].values[0].value, '1px')
    const fade = run('how', 'make the focus ring on inputs 50% more transparent', '--theme', 'studio')
    assert.deepEqual(fade.steps.map(step => step.value), [
      'color-mix(in srgb, rgb(0, 0, 255) 50%, transparent)', 'color-mix(in srgb, rgb(255, 0, 0) 50%, transparent)',
    ])
    const hidden = run('how', 'remove the focus ring from error inputs', '--theme', 'studio')
    assert.equal(hidden.steps[0].value, '0px')
    assert.deepEqual(hidden.steps[0].scope.when, ['status:error'])
    const rest = run('show', 'studio', '--on', 'input-focus-ring', '--state', 'rest', '--when', 'kind:input+status:error')
    assert.equal(rest.modes.dark[0].styles['outline-width'].value, '0px')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('menus group the rendered popup surfaces and keep per-corner edits scoped', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-menu-surfaces-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio', '--like', 'neutral', '--mode', 'light-only')
    const ask = run('how', 'make the menus red', '--theme', 'studio')
    assert.equal(ask.commands[0], "syntrofic theme editor set studio background-color '#ff0000' --on menus")
    assert.equal(ask.steps[0].validation, 'rendered')
    const set = run('set', 'studio', 'background-color', '#f5f5f5', '--on', 'menus')
    const parts = ['dropdown-menu', 'selector-popup', 'multi-selector-popup', 'typeahead-dropdown', 'context-menu']
    assert.deepEqual(new Set(set.changes.rules.map(rule => rule.target)), new Set(parts))
    for (const part of parts) {
      const samples = run('show', 'studio', '--on', part, '--state', 'open').modes.light
      assert.ok(samples.length >= 2, part)
      assert.ok(samples.every(sample => sample.styles['background-color'].value === 'rgb(245, 245, 245)'), part)
    }
    const request = run('how', 'dropdown menu corners 0 0 6px 6px', '--theme', 'studio')
    assert.equal(request.commands[0], "syntrofic theme editor set studio border-radius '0 0 6px 6px' --on dropdown-menu")
    run('set', 'studio', 'border-radius', '0 0 6px 6px', '--on', 'dropdown-menu', '--when', 'variant:submenu')
    const dropdown = run('show', 'studio', '--on', 'dropdown-menu', '--state', 'open').modes.light
    const submenu = dropdown.find(item => item.when.variant === 'submenu')
    assert.equal(submenu.styles['border-radius'].value, '0px 0px 6px 6px')
    assert.notEqual(dropdown.find(item => item.when.variant === 'root').styles['border-radius'].value, submenu.styles['border-radius'].value)
    const invalid = editor(project, 'set', 'studio', 'border-radius', '1px 2px 3px 4px 5px', '--on', 'dropdown-menu')
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /Invalid size for border-radius/)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('optional pieces can be hidden, inspected and restored without changing their owners', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-pieces-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  await writeFile(join(project, 'package.json'), '{}')
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  run('new', 'studio', '--like', 'neutral')
  const how = query => run('how', query, '--theme', 'studio')
  assert.deepEqual(how('隐藏代码块复制按钮').commands, ['syntrofic theme editor set studio display none --on code-block-copy-button'])
  assert.deepEqual(how('no copy button on code blocks').commands, ['syntrofic theme editor set studio display none --on code-block-copy-button'])
  assert.deepEqual(how('alerts without icons').commands, ['syntrofic theme editor set studio display none --on banner-icon'])
  assert.deepEqual(how('hide the tab underline').commands, ['syntrofic theme editor set studio display none --on tab-indicator --when variant:line'])
  const close = how('hide the dialog close button')
  assert.equal(close.commands, undefined)
  assert.match(close.refused[0].reason, /needs its visible icon/)
  assert.equal(how('no banners').commands, undefined)
  assert.equal(how("don't hide the code block copy button").steps[0].status, 'already-visible')

  const copy = ['--on', 'code-block-copy-button']
  const display = (...scope) => run('show', 'studio', ...scope, '--state', 'rest', '--mode', 'light').modes.light.map(sample => sample.styles.display.value)
  const initial = display(...copy)
  assert.deepEqual(initial, ['flex'])
  const hidden = run('set', 'studio', 'display', 'none', ...copy)
  assert.ok(hidden.changes.styles.reaches.some(sample => sample.values.display?.after === 'none'))
  assert.deepEqual(display(...copy), ['none'])
  assert.deepEqual(how('恢复显示代码块复制按钮').commands, ['syntrofic theme editor undo studio display --on code-block-copy-button'])
  run('undo', 'studio', 'display', ...copy)
  assert.deepEqual(display(...copy), initial)

  run('set', 'studio', 'display', 'none', '--on', 'banner-icon', '--when', 'tone:success')
  assert.ok(display('--on', 'banner-icon', '--when', 'tone:success').every(value => value === 'none'))
  assert.ok(display('--on', 'banner-icon', '--when', 'tone:warning').every(value => value === 'grid'))
  run('set', 'studio', 'display', 'none', '--on', 'tab-indicator', '--when', 'variant:line')
  assert.ok(display('--on', 'tab-indicator', '--when', 'variant:line').every(value => value === 'none'))
  assert.ok(display('--on', 'tab-indicator', '--when', 'variant:surface').every(value => value !== 'none'))
  for (const part of ['banner', 'dialog-header-close-icon']) {
    const invalid = editor(project, 'set', 'studio', 'display', 'none', '--on', part)
    assert.notEqual(invalid.status, 0)
    assert.match(invalid.stderr, /does not support display/)
  }
})

test('tab underlines edit the moving indicator and respect direction and variant', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-tab-indicator-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio', '--like', 'neutral', '--mode', 'light-only')
    const how = run('how', 'tabs with a 2px black underline when selected', '--theme', 'studio')
    assert.deepEqual(how.commands, [
      'syntrofic theme editor set studio height 2px --on tab-indicator --when orientation:horizontal',
      "syntrofic theme editor set studio background-color '#000000' --on tab-indicator --when orientation:horizontal",
    ])
    assert.ok(how.steps.every(step => step.validation === 'rendered'))
    const horizontal = ['--on', 'tab-indicator', '--when', 'orientation:horizontal']
    run('set', 'studio', 'height', '2px', ...horizontal)
    run('set', 'studio', 'background-color', '#000000', ...horizontal)
    const rows = run('show', 'studio', '--on', 'tab-indicator').modes.light
    const marker = rows.find(item => item.when.orientation === 'horizontal' && item.when.variant === 'surface')
    assert.equal(marker.styles.height.value, '2px')
    assert.equal(marker.styles['background-color'].value, 'rgb(0, 0, 0)')
    const line = ['--on', 'tab-indicator', '--when', 'orientation:vertical+variant:line']
    const surface = ['--on', 'tab-indicator', '--when', 'orientation:vertical+variant:surface']
    const original = run('show', 'studio', ...line).modes.light[0]
    const filledWidth = run('show', 'studio', ...surface).modes.light[0].styles.width.value
    assert.ok(parseFloat(filledWidth) > 4)
    assert.equal(original.styles.width.value, '2px')
    assert.notEqual(original.styles['background-color'].value, 'rgb(0, 0, 0)')
    run('set', 'studio', 'width', '4px', ...line)
    const answer = run('how', 'what is the thickness of the vertical line tab indicator', '--theme', 'studio')
    assert.equal(answer.lookups[0].readings[0].values[0].value, '4px')
    assert.equal(run('show', 'studio', ...surface).modes.light[0].styles.width.value, filledWidth)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('the table editor reaches sortable headers, scoped cells and opted-in dividers', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-table-parts-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio', '--like', 'neutral', '--mode', 'light-only')
    const casing = run('how', 'table headers uppercase', '--theme', 'studio')
    assert.deepEqual(casing.commands, ['syntrofic theme editor set studio text-transform uppercase --on table-header-cell'])
    run('set', 'studio', 'text-transform', 'uppercase', '--on', 'table-header-cell')
    run('set', 'studio', 'color', '#26364a', '--on', 'table-header-cell', '--state', 'sorted')
    const headings = run('show', 'studio', '--on', 'table-header-cell').modes.light
    const sorted = headings.find(item => item.state === 'sorted')
    assert.equal(sorted.parts.label['text-transform'].value, 'uppercase')
    assert.equal(sorted.parts.label.color.value, 'rgb(38, 54, 74)')
    assert.notEqual(headings.find(item => item.state === 'rest').parts.label.color.value, sorted.parts.label.color.value)

    const spacing = run('how', 'make table cells more compact', '--theme', 'studio')
    assert.match(spacing.commands[0], /padding-block 5px --on table-cell$/)
    run('set', 'studio', 'padding-block', '2px', '--on', 'table-cell', '--when', 'parity:even', '--state', 'selected')
    const cells = run('show', 'studio', '--on', 'table-cell', '--state', 'selected').modes.light
    assert.equal(cells.find(item => item.when.parity === 'even').styles['padding-block'].value, '2px')
    assert.equal(cells.find(item => item.when.parity === 'odd').styles['padding-block'].value, '7px')

    const dividers = run('how', 'make the table row dividers red', '--theme', 'studio')
    assert.deepEqual(dividers.commands, ["syntrofic theme editor set studio --sy-border '#ff0000' --on table-row"])
    const change = run('set', 'studio', '--sy-border', '#ff0000', '--on', 'table-row')
    assert.ok(change.changes.styles.reaches.length)
    assert.ok(change.changes.styles.reaches.every(item => item.placement === 'rows' && item.properties.includes('cell.box-shadow')))
    const rows = run('show', 'studio', '--on', 'table-row', '--state', 'rest').modes.light
    assert.equal(rows.find(item => item.placement === 'none').parts.cell['box-shadow'].value, 'none')
    assert.match(rows.find(item => item.placement === 'rows').parts.cell['box-shadow'].value, /rgb\(255, 0, 0\).*inset/)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('theme editor checks actual button and badge colors before replacing theme outputs', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-paint-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const button = run('set', 'studio', '--sy-accent-hover', '#344d64', '--on', 'button', '--mode', 'light')
    const paint = button.changes.paint
    assert.equal(paint.status, 'measured')
    assert.deepEqual([...new Set(paint.reaches.map(entry => entry.when.variant))], ['primary'])
    assert.deepEqual([...new Set(paint.reaches.map(entry => entry.state))], ['hover', 'active'])
    assert.ok(paint.reaches.every(entry => entry.mode === 'light' && entry.properties.includes('background-color')))

    const focus = run('set', 'studio', '--sy-focus', '#493168', '--on', 'button-secondary', '--state', 'focus-visible', '--mode', 'dark')
    assert.deepEqual(focus.changes.paint.reaches[0], {
      when: { variant: 'secondary' }, state: 'focus-visible', mode: 'dark', properties: ['outline-color'],
    })
    const info = run('set', 'studio', '--sy-info-soft', '#ced9e2', '--on', 'badge', '--when', 'tone:info', '--mode', 'light')
    assert.ok(info.changes.paint.reaches.some(entry => entry.when.tone === 'info' && entry.properties.includes('background-color')))
    run('set', 'studio', 'badges', 'outline')
    run('set', 'studio', 'buttons', 'soft')

    const paths = ['syntrofic.themes.json', 'themes/studio/preview.html', 'src/themes/studio/theme.css', 'src/themes/studio/manifest.json']
    const snapshot = () => Promise.all(paths.map(file => readFile(join(project, file), 'utf8')))
    const before = await snapshot()
    for (const [token, ...scope] of [
      ['--sy-border', '--on', 'button-secondary', '--state', 'disabled'],
      ['--sy-accent-text', '--on', 'button', '--when', 'variant:primary'],
      ['--sy-success-soft', '--on', 'badge', '--when', 'tone:success', '--mode', 'light', '--dry-run'],
    ]) {
      const result = editor(project, 'set', 'studio', token, '#dbcff1', ...scope, '--json')
      assert.equal(result.status, 1, result.stdout)
      assert.match(result.stderr, /ERR_THEME_NO_EFFECT:.*does not change the computed colors/)
      assert.match(result.stderr, /Set background-color, color, or border-color --on/)
    }
    assert.deepEqual(await snapshot(), before)
    const direct = run('set', 'studio', 'background-color', '#dbcff1', '--on', 'badge', '--when', 'tone:success', '--mode', 'light')
    assert.equal(direct.theme.rules['badge-light-base-tone-success'].declarations['background-color'], '#dbcff1')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('form color edits report nested paint and option groups refuse unused colors atomically', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-nested-paint-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const group = run('set', 'studio', '--sy-text-muted', '#624d73', '--on', 'input-group', '--mode', 'light')
    const rest = group.changes.paint.reaches.find(entry => entry.state === 'rest')
    assert.deepEqual(rest.properties, ['placeholder.color', 'prefix.color'])
    const inputGroup = run('show', 'studio', '--on', 'input-group').modes.light[0]
    for (const name of ['prefix', 'placeholder']) {
      const color = inputGroup.parts[name].color
      assert.equal(color.value, 'rgb(98, 77, 115)')
      assert.ok(color.tokens.some(token => token.name === '--sy-text-muted' && token.source === 'theme'))
    }
    const focus = run('set', 'studio', '--sy-focus', '#493168', '--on', 'input-group', '--state', 'focus-visible', '--mode', 'light')
    assert.ok(focus.changes.paint.reaches.some(entry => entry.state === 'focus-visible' && entry.properties.includes('outline-color')))

    const select = run('set', 'studio', '--sy-text-muted', '#66437d', '--on', 'select', '--only', '--when', 'variant:ghost', '--mode', 'light')
    const selectRest = select.changes.paint.reaches.filter(entry => entry.state === 'rest')
    assert.ok(selectRest.some(entry => entry.placement === 'description' && entry.properties.includes('description.color')))
    assert.ok(selectRest.some(entry => entry.placement === 'placeholder' && entry.properties.includes('placeholder.color')))
    assert.ok(select.changes.paint.reaches.every(entry => entry.when.variant === 'ghost' && entry.mode === 'light'))

    const combo = run('set', 'studio', '--sy-text-muted', '#654875', '--on', 'combobox', '--mode', 'light')
    const trigger = combo.changes.paint.reaches.find(entry => entry.state === 'rest')
    assert.deepEqual(trigger.properties, ['placeholder.color', 'trigger.color'])

    const options = run('set', 'studio', '--sy-option-description-color', '#765786', '--on', 'option-rows', '--state', 'highlighted', '--mode', 'light')
    assert.equal(options.changes.paint.status, 'measured')
    assert.equal(options.changes.paint.parts.length, 5)
    assert.ok(options.changes.paint.parts.every(check => check.reaches.length && check.reaches.every(entry =>
      entry.properties.length === 1 && entry.properties.includes('description.color'))))
    const selector = run('set', 'studio', '--sy-accent-soft', '#e7dff1', '--on', 'selector-option-row', '--state', 'highlighted', '--mode', 'light')
    assert.deepEqual([...new Set(selector.changes.paint.reaches.map(entry => entry.placement))], ['choices'])
    const menu = run('set', 'studio', '--sy-accent-soft', '#e7dff1', '--on', 'menu-item', '--when', 'tone:neutral', '--state', 'highlighted', '--mode', 'light')
    assert.deepEqual(menu.changes.paint.reaches, [{ when: { tone: 'neutral' }, state: 'highlighted', mode: 'light', properties: ['background-color'] }])

    const paths = ['syntrofic.themes.json', 'themes/studio/preview.html', 'src/themes/studio/theme.css', 'src/themes/studio/manifest.json']
    const snapshot = () => Promise.all(paths.map(file => readFile(join(project, file), 'utf8')))
    const before = await snapshot()
    for (const args of [
      ['--sy-control', '--on', 'select', '--only', '--when', 'variant:ghost', '--state', 'disabled'],
      ['--sy-accent-soft', '--on', 'menu-item', '--when', 'tone:danger', '--state', 'highlighted'],
      ['--sy-accent-soft', '--on', 'option-rows', '--state', 'disabled'],
    ]) {
      const [token, ...scope] = args
      const rejected = editor(project, 'set', 'studio', token, '#ebdfeb', ...scope, '--json')
      assert.equal(rejected.status, 1, rejected.stdout)
      assert.match(rejected.stderr, /ERR_THEME_NO_EFFECT:.*does not change the computed colors/)
    }
    assert.deepEqual(await snapshot(), before)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('theme paint reports compare text with the composited surface and identify non-uniform backgrounds', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-contrast-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const scope = ['--on', 'input-group', '--mode', 'light']
    const reading = report => report.modes.light.find(sample => sample.state === 'rest').contrast
    const initial = reading(run('show', 'studio', '--on', 'input-group'))
    const translucent = run('set', 'studio', 'background-color', 'rgba(0, 0, 0, 0.5)', ...scope)
    const paint = translucent.changes.paint
    assert.equal(paint.status, 'measured')
    const warning = paint.contrast.find(entry => entry.state === 'rest' && entry.text === 'prefix')
    assert.equal(warning.minimum, 4.5)
    assert.equal(warning.background, 'rgb(127.5, 127.5, 127.5)')
    assert.equal(warning.previousRatio, initial.prefix.ratio)
    assert.ok(warning.ratio < warning.minimum && warning.ratio < warning.previousRatio)
    assert.match(warning.fix, /set studio --sy-text-muted '#000000' --on input-group --mode light --only$/)

    const report = run('show', 'studio', '--on', 'input-group')
    assert.equal(reading(report).placeholder.background, warning.background)
    assert.equal(report.modes.light.find(sample => sample.state === 'disabled').contrast.prefix.status, 'inactive')
    const plain = editor(project, 'show', 'studio', '--on', 'input-group')
    assert.equal(plain.status, 0, plain.stderr)
    assert.match(plain.stdout, /prefix contrast +[\d.]+:1 \(minimum 4.5:1\)/)
    run('set', 'studio', '--sy-text-muted', '#000000', ...scope, '--only')
    const corrected = reading(run('show', 'studio', '--on', 'input-group'))
    assert.ok(corrected.prefix.ratio >= corrected.prefix.minimum)
    assert.ok(corrected.placeholder.ratio >= corrected.placeholder.minimum)

    const gradient = run('set', 'studio', 'background', 'linear-gradient(in oklab, #647068, #ffffff)', ...scope)
    assert.ok(gradient.changes.paint.unmeasured > 0)
    assert.deepEqual(reading(run('show', 'studio', '--on', 'input-group')).placeholder,
      { status: 'unmeasured', reason: 'background-image' })
    const heading = run('show', 'studio', '--on', 'heading').modes.light.find(sample => sample.when.level === '1')
    assert.equal(heading.contrast.text.minimum, 3)

    const options = run('show', 'studio', '--on', 'selector-option-row')
    for (const mode of ['light', 'dark']) {
      const read = (placement, state) => options.modes[mode].find(sample => sample.placement === placement && sample.state === state).contrast
      const popup = read('popup', 'highlighted')
      const choices = read('choices', 'highlighted')
      assert.equal(popup.description.status, 'measured')
      assert.equal(popup.description.background, popup.label.background)
      assert.equal(popup.description.background, choices.description.background)
      assert.notEqual(popup.description.background, read('popup', 'rest').description.background)
      assert.notEqual(read('popup', 'rest').description.background, read('choices', 'rest').description.background)
    }
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('scoped sizes report computed component measurements and refuse ineffective changes before writing', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-dimensions-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const button = ['--on', 'button', '--when', 'variant:primary+size:md']
    const tabs = ['--on', 'tab-list', '--when', 'orientation:vertical+size:sm']
    const sizes = run('set', 'studio', '--sy-button-height', '56px', ...button).changes.dimensions
    assert.equal(sizes.status, 'measured')
    for (const sample of sizes.reaches) {
      assert.deepEqual(sample.when, { variant: 'primary', size: 'md' })
      assert.deepEqual(sample.values['min-height'], { before: '40px', after: '56px' })
    }
    assert.deepEqual([...new Set(sizes.reaches.map(sample => sample.mode))], ['light', 'dark'])
    const hover = run('set', 'studio', '--sy-button-height', '52px', '--on', 'button', '--when', 'variant:secondary+size:sm',
      '--state', 'hover').changes.dimensions
    assert.deepEqual([...new Set(hover.reaches.map(sample => sample.state))], ['hover', 'active', 'focus-visible+hover'])
    assert.ok(hover.reaches.every(sample => sample.values['min-height']?.after === '52px'))

    const combo = run('set', 'studio', '--sy-combo-height', '50px', '--on', 'combobox').changes.dimensions
    const first = combo.reaches.find(sample => sample.mode === 'light' && sample.state === 'rest')
    assert.deepEqual(first.values.height, { before: '42px', after: '50px' })
    assert.deepEqual(first.values['input.min-height'], { before: '40px', after: '48px' })

    const type = run('set', 'studio', 'font-size', '21px', ...tabs).changes.dimensions
    assert.deepEqual(type.reaches.map(sample => [sample.when, sample.values['font-size'].after]), [
      [{ size: 'sm', orientation: 'vertical' }, '21px'], [{ size: 'sm', orientation: 'vertical' }, '21px'],
    ])

    const files = ['syntrofic.themes.json', 'themes/studio/preview.html', 'src/themes/studio/theme.css', 'src/themes/studio/manifest.json']
    const snapshot = () => Promise.all(files.map(file => readFile(join(project, file))))
    const before = await snapshot()
    for (const [token, value, scope, expected] of [
      ['--sy-control-height-md', '48px', button, /computed heights.*min-height or height/],
      ['--sy-tab-label-size', '1.3125rem', tabs, /computed font sizes.*Set font-size/],
      ['font-size', '1.3125rem', [...tabs, '--dry-run'], /computed font sizes.*Choose another size/],
    ]) {
      const rejected = editor(project, 'set', 'studio', token, value, ...scope, '--json')
      assert.equal(rejected.status, 1, rejected.stdout)
      assert.match(rejected.stderr, /^ERR_THEME_NO_EFFECT:/)
      assert.match(rejected.stderr, expected)
    }
    assert.deepEqual(await snapshot(), before)

    const report = run('show', 'studio', '--on', 'combobox')
    for (const mode of ['light', 'dark']) {
      const height = report.modes[mode][0].parts.input['min-height']
      assert.equal(height.value, '48px')
      assert.ok(height.tokens.some(token => token.name === '--sy-combo-height' && token.source === 'theme'))
    }
    assert.deepEqual(await snapshot(), before)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('scoped typography, spacing, corners and shadow tokens are measured and traceable', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-style-tokens-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const rest = (report, mode = 'light') => report.changes.styles.reaches.find(item => item.mode === mode && item.state === 'rest')
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const button = run('how', '--list', 'parts').targets.find(target => target.part === 'button')
    assert.ok(button.tokens.includes('--sy-radius-pill'))
    assert.deepEqual(button.tokenProperties['--sy-font'], ['font-family'])

    const smallSecondary = ['--on', 'button', '--when', 'variant:secondary+size:sm']
    const space = run('set', 'studio', '--sy-space-3', '21px', ...smallSecondary)
    assert.deepEqual(rest(space).values['padding-inline'], { before: '12px', after: '21px' })
    assert.deepEqual(rest(space, 'dark').when, { variant: 'secondary', size: 'sm' })
    const secondary = run('show', 'studio', '--on', 'button-secondary')
    const smallRest = secondary.modes.light.find(sample => sample.when.size === 'sm' && sample.state === 'rest')
    assert.equal(smallRest.styles['padding-inline'].value, '21px')
    assert.ok(smallRest.styles['padding-inline'].tokens.some(token => token.name === '--sy-space-3' && token.source === 'theme'))

    const pill = run('set', 'studio', '--sy-radius-pill', '16px', '--on', 'button-primary', '--when', 'size:sm')
    assert.equal(rest(pill).values['border-radius'].after, '16px')
    const font = run('set', 'studio', '--sy-font', 'Georgia, serif', '--on', 'card')
    assert.equal(rest(font).values['font-family'].after, 'Georgia, serif')
    const dialog = run('set', 'studio', '--sy-space-2', '18px', '--on', 'dialog')
    assert.ok(dialog.changes.styles.reaches.some(sample => sample.state === 'open' && sample.values.gap.after === '18px'))
    const shadow = run('set', 'studio', '--sy-shadow', '0 6px 15px rgb(0 0 0 / .2)', '--on', 'containers')
    assert.deepEqual(shadow.changes.rules.map(rule => rule.target), ['card'])
    assert.match(rest(shadow, 'dark').values['box-shadow'].after, /0px 6px 15px/)
    const card = run('show', 'studio', '--on', 'card').modes.light[0].styles
    for (const [property, token] of [['box-shadow', '--sy-shadow'], ['font-family', '--sy-font']]) {
      assert.ok(card[property].tokens.some(item => item.name === token && item.source === 'theme'))
    }

    run('set', 'studio', 'radius', '14px', '--on', 'card')
    const direct = run('set', 'studio', 'padding-inline', '24px', ...smallSecondary, '--only')
    assert.deepEqual(rest(direct).values['padding-inline'], { before: '21px', after: '24px' })
    const current = run('show', 'studio', ...smallSecondary, '--mode', 'light', '--state', 'rest').modes.light[0]
    assert.equal(current.styles['padding-inline'].value, '24px')
    assert.equal(current.styles['padding-inline'].source, 'theme')
    const paintScope = ['--on', 'card', '--only', '--when', 'variant:default', '--mode', 'light']
    assert.ok(run('set', 'studio', 'background-color', '#e9e3ee', ...paintScope).changes.paint.reaches.length)
    const files = ['syntrofic.themes.json', 'themes/studio/preview.html', 'src/themes/studio/theme.css', 'src/themes/studio/manifest.json']
    const snapshot = () => Promise.all(files.map(file => readFile(join(project, file))))
    const before = await snapshot()
    for (const [args, expected] of [
      [['--sy-space-3', '26px', '--on', 'button', '--when', 'variant:secondary+size:md'], /ERR_THEME_NO_EFFECT.*padding-inline/],
      [['--sy-radius-lg', '24px', '--on', 'card'], /ERR_THEME_NO_EFFECT.*border-radius/],
      [['padding-inline', '1.5rem', ...smallSecondary, '--only'], /ERR_THEME_NO_EFFECT.*theme editor show studio --on button --when variant:secondary\+size:sm/],
      [['background-color', 'rgb(233 227 238)', ...paintScope], /ERR_THEME_NO_EFFECT.*computed colors/],
      [['--sy-shadow', '0 6px 15px #000', '--on', 'card', '--mode', 'dark'], /Mode-specific changes must be colors/],
      [['--sy-font', '#fff', '--on', 'card'], /Invalid font/],
    ]) {
      const rejected = editor(project, 'set', 'studio', ...args, '--json')
      assert.equal(rejected.status, 1, rejected.stdout)
      assert.match(rejected.stderr, expected)
    }
    assert.deepEqual(await snapshot(), before)
    const undo = run('undo', 'studio', '--sy-shadow', '--on', 'containers')
    assert.equal(undo.theme.rules['card-both-base'].declarations['--sy-shadow'], undefined)
    assert.equal(undo.theme.rules['card-both-base'].declarations['--sy-font'], 'Georgia, serif')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('pagination counts only painted fills and edges when routing corners', () => {
  for (const value of ['transparent', '#12345600', 'rgba(0, 0, 0, 0)', 'color-mix(in srgb, transparent 100%, #fff 0%)']) {
    const rule = { target: 'pagination', declarations: { background: value, border: '0 solid #aaa', 'border-radius': '8px' } }
    const [frame] = brandPaginationFrames({ [brandRuleKey(rule)]: rule })
    assert.equal(frame.part, 'pagination-list', value)
    assert.equal(frame.hasEdge, false, value)
  }
  for (const value of ['#f8f9f0', 'light-dark(#fff, #222)', 'linear-gradient(90deg, transparent, #fff)']) {
    const rule = { target: 'pagination', declarations: { background: value, 'border-radius': '8px' } }
    const [frame] = brandPaginationFrames({ [brandRuleKey(rule)]: rule })
    assert.equal(frame.part, 'pagination', value)
    assert.equal(frame.hasEdge, true, value)
  }
})

test('pagination routes a frame as a unit, traces it in show, and restores the row on undo', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-pagination-frame-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const scope = ['--on', 'pagination']
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const registry = join(project, 'syntrofic.themes.json')
    const before = await readFile(registry, 'utf8')
    const early = editor(project, 'set', 'studio', 'border-radius', '16px', ...scope, '--json')
    assert.equal(early.status, 1)
    assert.match(early.stderr, /ERR_THEME_NO_EFFECT:.*corners 16px --on pagination/)
    assert.equal(await readFile(registry, 'utf8'), before)

    const border = run('set', 'studio', 'border', '1px solid #dedede', ...scope)
    assert.equal(border.changes.paginationFrames[0].part, 'pagination-list')
    assert.ok(border.changes.styles.reaches.some(sample => sample.values['controls.border'].after === '1px solid rgb(222, 222, 222)'))
    run('set', 'studio', 'border-radius', '16px', ...scope)
    const shadow = run('set', 'studio', 'box-shadow', '0 1px 2px rgba(0, 0, 0, .2)', ...scope)
    assert.equal(shadow.changes.paginationFrames[0].part, 'pagination-list')
    const side = run('set', 'studio', 'border-top', '2px solid #b3b3b3', ...scope, '--when', 'variant:pages')
    assert.equal(side.changes.paginationFrames, undefined)
    assert.ok(side.changes.styles.reaches.every(sample => sample.values['border-top'].after === '2px solid rgb(179, 179, 179)'))
    const dots = [...scope, '--when', 'variant:dots', '--mode', 'dark']
    run('set', 'studio', 'background-color', '#202020', ...dots)
    const accent = run('set', 'studio', 'border-color', '#a4a4a4', ...dots)
    assert.equal(accent.changes.paginationFrames[0].part, 'pagination-list')
    const selected = run('show', 'studio', ...dots, '--state', 'rest').modes.dark[0]
    assert.equal(selected.styles['border-width'].value, '0px')
    assert.equal(selected.parts.controls['border-color'].value, 'rgb(164, 164, 164)')
    assert.equal(selected.parts.controls['border-radius'].source, 'theme')

    const filled = run('set', 'studio', 'background-color', '#f5f5f5', ...scope)
    assert.ok(filled.changes.paginationFrames.every(frame => frame.part === 'pagination' && frame.previousPart === 'pagination-list'))
    const restored = run('undo', 'studio', 'background-color', ...scope)
    assert.ok(restored.changes.paginationFrames.every(frame => frame.part === 'pagination-list' && frame.previousPart === 'pagination'))
    run('set', 'studio', 'corners', '8px', ...scope)
    const item = run('show', 'studio', '--on', 'pagination-item', '--when', 'variant:pages', '--state', 'selected', '--mode', 'light')
    assert.equal(item.modes.light[0].styles['border-radius'].value, '8px')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('surface and choice colors are verified in the selected variant, state and mode', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-surfaces-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const cardScope = ['--on', 'card', '--when', 'variant:muted+elevation:low', '--mode', 'light']
    const card = run('set', 'studio', '--sy-surface-muted', '#ededed', ...cardScope)
    assert.ok(card.changes.paint.reaches.length)
    assert.ok(card.changes.paint.reaches.every(sample => sample.mode === 'light' && sample.when.variant === 'muted'
      && sample.when.elevation === 'low' && sample.properties.includes('background-color')))
    const scoped = run('show', 'studio', ...cardScope, '--state', 'rest')
    assert.deepEqual(Object.keys(scoped.modes), ['light'])
    assert.equal(scoped.modes.light.length, 1)
    const [muted] = scoped.modes.light
    assert.deepEqual(muted.when, { variant: 'muted', elevation: 'low' })
    assert.equal(muted.styles['background-color'].value, 'rgb(237, 237, 237)')
    assert.ok(muted.styles['background-color'].tokens.some(token => token.name === '--sy-surface-muted' && token.source === 'theme'))
    const [base] = run('show', 'studio', '--on', 'card', '--when', 'variant:default+elevation:none', '--mode', 'light', '--state', 'rest').modes.light
    assert.equal(base.styles['background-color'].value, 'rgb(248, 248, 248)')

    const containers = run('set', 'studio', '--sy-surface', '#f5f5f5', '--on', 'containers', '--mode', 'dark')
    assert.deepEqual(containers.changes.paint.parts.map(item => item.part), ['card', 'dialog'])
    const [cardSurface, dialogSurface] = containers.changes.paint.parts
    assert.equal(cardSurface.status, 'measured')
    assert.deepEqual(cardSurface.reaches, [])
    assert.equal(dialogSurface.status, 'measured')
    assert.ok(dialogSurface.reaches.length > 0)

    const dialog = run('set', 'studio', '--sy-text-muted', '#9e9e9e', '--on', 'dialog', '--state', 'open', '--mode', 'light')
    assert.deepEqual(dialog.changes.paint.reaches, [{ when: {}, state: 'open', mode: 'light', properties: ['description.color'] }])
    assert.ok(dialog.changes.paint.contrast.some(sample => sample.text === 'description' && sample.ratio < sample.minimum))
    const [open] = run('show', 'studio', '--on', 'dialog', '--state', 'open', '--mode', 'light').modes.light
    assert.ok(open.parts.description.color.tokens.some(token => token.name === '--sy-text-muted' && token.source === 'theme'))

    const checks = run('set', 'studio', '--sy-accent-on', '#e7f1ff', '--on', 'checks', '--state', 'selected', '--mode', 'light')
    assert.ok(checks.changes.paint.parts.find(item => item.part === 'checkbox').reaches.some(sample => sample.properties.includes('checkmark.border-right-color')))
    assert.ok(checks.changes.paint.parts.find(item => item.part === 'switch').reaches.some(sample => sample.properties.includes('thumb.background-color')))
    const [selected] = run('show', 'studio', '--on', 'checkbox', '--when', 'size:md', '--state', 'selected', '--mode', 'light').modes.light
    assert.equal(selected.parts.checkmark['border-right-color'].value, 'rgb(231, 241, 255)')
    const disabled = run('set', 'studio', '--sy-accent-on', '#ececec', '--on', 'checkbox', '--only', '--state', 'disabled', '--mode', 'light')
    assert.ok(disabled.changes.paint.reaches.some(sample => sample.placement === 'checked' && sample.state === 'disabled'
      && sample.properties.includes('checkmark.border-right-color')))
    const disabledStyles = run('show', 'studio', '--on', 'checkbox', '--when', 'size:md', '--state', 'disabled', '--mode', 'light').modes.light
    assert.equal(disabledStyles.find(sample => sample.placement === 'checked').parts.checkmark['border-right-color'].value, 'rgb(236, 236, 236)')

    const files = ['syntrofic.themes.json', 'themes/studio/preview.html', 'src/themes/studio/theme.css', 'src/themes/studio/manifest.json']
    const snapshot = () => Promise.all(files.map(file => readFile(join(project, file))))
    const before = await snapshot()
    for (const [part, token, qualifiers] of [
      ['card', '--sy-surface', ['--when', 'variant:transparent']],
      ['card', '--sy-shadow', ['--when', 'elevation:high']],
      ['checkbox', '--sy-text', ['--only', '--state', 'selected']],
    ]) {
      const result = editor(project, 'set', 'studio', token, token === '--sy-shadow' ? '0 4px 9px #0003' : '#c5c5c5', '--on', part, ...qualifiers, '--json')
      assert.equal(result.status, 1, result.stdout)
      assert.match(result.stderr, /^ERR_THEME_NO_EFFECT:/)
    }
    for (const filters of [['--when', 'size:sm'], ['--state', 'disabled'], ['--mode', 'sepia']]) {
      const invalid = editor(project, 'show', 'studio', '--on', 'card', ...filters, '--json')
      assert.equal(invalid.status, 1, invalid.stdout)
      assert.match(invalid.stderr, /^ERR_INVALID_ARGUMENT:/)
    }
    assert.deepEqual(await snapshot(), before)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('navigation diagnostics measure relative lengths and distinguish bar and row constraints', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-navigation-fit-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const linkIssue = (report, placement, density) => report.layoutIssues.find(issue =>
    issue.part === 'top-nav-item' && issue.mode === 'light' && issue.placement === placement && issue.density === density)
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    const naturallySized = run('set', 'studio', 'padding-block', '0.375rem', '--on', 'app-shell-header')
    assert.equal(naturallySized.layoutCheck.status, 'measured')
    assert.deepEqual(naturallySized.layoutIssues, [])
    const padded = run('set', 'studio', 'height', '2.5rem', '--on', 'app-shell-header')
    assert.equal(padded.layoutCheck.status, 'measured')
    assert.equal(padded.layoutCheck.inspected, 40)
    assert.equal(padded.layoutCheck.compactWidth, 390)
    assert.ok(padded.layoutIssues.some(issue => issue.viewport === 'narrow' && issue.part === 'top-nav-toggle'))
    const compact = linkIssue(padded, 'app-shell-header', 'compact')
    const comfortable = linkIssue(padded, 'layout-header-scrollable', 'comfortable')
    assert.equal(compact.height, 32)
    assert.equal(comfortable.height, 38)
    assert.equal(comfortable.available, 28)
    assert.match(comfortable.fix, /height [\d.]+px --on app-shell-header$/)
    assert.ok(parseFloat(padded.layoutRepairs[0].steps[0].value) >= 50)

    const taller = run('set', 'studio', 'min-height', '3rem', '--on', 'top-nav-item')
    const issue = linkIssue(taller, 'app-shell-header', 'compact')
    assert.equal(issue.height, 48)
    assert.match(issue.fix, /height 60px --on app-shell-header$/)
    const corrected = run('set', 'studio', 'height', '60px', '--on', 'app-shell-header')
    assert.deepEqual(corrected.layoutIssues, [])

    const constrained = run('set', 'studio', 'height', '1.75rem', '--on', 'top-nav')
    const row = linkIssue(constrained, 'layout-region', 'compact')
    assert.equal(row.available, 28)
    assert.match(row.fix, /height 48px --on top-nav$/)
    const shown = run('show', 'studio', '--section', 'navigation')
    assert.equal(shown.layoutCheck.status, 'measured')
    assert.deepEqual(linkIssue(shown, 'layout-region', 'compact'), row)

    run('set', 'studio', 'height', '48px', '--on', 'top-nav')
    const withHover = run('set', 'studio', 'min-height', '3.5rem', '--on', 'top-nav-item', '--state', 'hover')
    const hover = linkIssue(withHover, 'app-shell-header', 'compact')
    assert.deepEqual([hover.state, hover.available, hover.height], ['hover', 48, 56])
    assert.match(hover.fix, /height 68px --on app-shell-header &&/)
    assert.ok(hover.fixes.some(line => line.endsWith('height 56px --on top-nav')))
    assert.ok(withHover.layoutIssues.every(problem => problem.state === 'hover'))
    const preview = await readFile(join(project, 'themes/studio/preview.html'), 'utf8')
    const navigation = /<section id="navigation"[^>]*>([\s\S]+?)<\/section>/.exec(preview)?.[1]
    const desktop = navigation?.split('class="sy-navbar__desktop"').at(1)?.split('</ul>', 1)[0]
    assert.ok(desktop?.includes('class="sy-visually-hidden">评审</span>'))
    assert.ok(preview.includes('min-height calc(var(--sy-motion-replace) * var(--sy-motion-tempo, 1))'))
    run('set', 'studio', 'height', '68px', '--on', 'app-shell-header')
    const fixed = run('set', 'studio', 'height', '56px', '--on', 'top-nav')
    assert.deepEqual(fixed.layoutIssues, [])
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('navigation repairs fit authored padding in the existing header and can be applied from the readonly report', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-navigation-repair-'))
  const run = (...args) => {
    const result = editor(project, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    run('new', 'studio')
    run('set', 'studio', 'height', '40px', '--on', 'app-shell-header')
    run('set', 'studio', 'line-height', '19px', '--on', 'top-nav-item')
    const padded = run('set', 'studio', 'padding', '16px 10px', '--on', 'top-nav-item')
    const issue = padded.layoutIssues.find(issue => issue.part === 'top-nav-item')
    assert.deepEqual([issue.height, issue.available], [51, 40])
    const [compact, expanded] = padded.layoutRepairs
    assert.equal(compact.strategy, 'keep-height')
    assert.match(compact.line, /padding-block 10\.5px --on top-nav-item$/)
    assert.match(expanded.line, /height 51px --on app-shell-header$/)
    assert.deepEqual(compact.verifiedModes, ['light', 'dark'])
    assert.equal(compact.verifiedSamples, 40)
    const registry = join(project, 'syntrofic.themes.json')
    const stored = await readFile(registry, 'utf8')
    const query = run('how', 'repairs', '--theme', 'studio')
    assert.deepEqual(query.layoutRepairs, padded.layoutRepairs)
    assert.equal(await readFile(registry, 'utf8'), stored)
    run('show', 'studio', '--section', 'navigation')
    const sheet = await readFile(join(project, 'themes/studio/sheet-navigation.html'), 'utf8')
    assert.match(sheet, /保留导航高度/)
    assert.match(sheet, /padding-block 10\.5px --on top-nav-item/)
    const fixed = run('set', 'studio', 'padding-block', '10.5px', '--on', 'top-nav-item')
    assert.deepEqual(fixed.layoutIssues, [])
    assert.deepEqual(fixed.layoutRepairs, [])
    assert.equal(fixed.theme.rules['app-shell-header-both-base'].declarations.height, '40px')

    run('set', 'studio', 'padding-block', '0px', '--on', 'top-nav-item')
    run('set', 'studio', 'line-height', '37px', '--on', 'top-nav-item')
    const clipped = run('set', 'studio', 'height', '24px', '--on', 'top-nav-item')
    assert.ok(clipped.layoutIssues.some(issue => issue.part === 'top-nav-item' && issue.clipped))
    assert.ok(clipped.layoutRepairs.some(repair => repair.steps.some(step => step.options.on === 'top-nav-item' && step.setting === 'height')))
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('inherited size and mode rules preserve local button variants where their conditions intersect', () => {
  const asMap = rules => Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule]))
  const inherited = { target: 'button', when: { size: 'sm' }, mode: 'dark', declarations: { 'border-color': '#344b3c' } }
  const authored = { target: 'button', declarations: { 'border-color': '#91aca0' } }
  const secondary = { target: 'button', when: { variant: 'secondary' }, declarations: { 'border-color': '#665387' } }
  const secondaryHover = { ...secondary, state: 'hover', declarations: { 'border-color': '#936958' } }
  const base = asMap([inherited, secondaryHover])
  const theme = defineBrandTheme({ id: 'studio', inheritedRules: base, rules: { ...base, ...asMap([authored, secondary]) } })
  const { rules, lifted } = resolveBrandThemeRules(theme)
  const smallSecondary = brandRuleKey({ ...inherited, when: { ...inherited.when, ...secondary.when } })
  assert.equal(rules[brandRuleKey(inherited)].declarations['border-color'], '#91aca0')
  assert.equal(rules[smallSecondary].declarations['border-color'], '#665387')
  assert.equal(rules[brandRuleKey(secondaryHover)].declarations['border-color'], '#936958')
  assert.equal(lifted.filter(rule => rule.mode === 'dark').length, 2)
  assert.ok(lifted.every(rule => !rule.state))
})

test('display heading edits preserve the visual scale and keep semantic heading levels independently addressable', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-display-headings-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  await writeFile(join(project, 'package.json'), '{}')
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  run('new', 'studio', '--like', 'neutral')
  const inspect = extra => run('show', 'studio', '--on', 'heading', '--state', 'rest', '--mode', 'light', ...extra).modes.light
  const sizes = samples => Object.fromEntries(samples.map(sample => [sample.when.type, sample.styles['font-size'].value]))
  const h2 = () => sizes(inspect(['--when', 'level:2']))
  const before = h2()
  assert.deepEqual([before['display-1'], before['display-2'], before['display-3']], ['48px', '36px', '28px'])
  const how = query => run('how', query, '--theme', 'studio')
  const plan = how('展示标题字号改为 60px')
  const commands = ['60px', '45px', '35px'].map((size, index) => `syntrofic theme editor set studio font-size ${size} --on heading --when type:display-${index + 1}`)
  assert.deepEqual(plan.commands, commands)
  assert.equal(plan.sequence, true)
  assert.equal(plan.steps[0].validation, 'rendered')
  assert.equal(plan.steps[0].preservesScale, true)
  for (const [index, size] of ['60px', '45px', '35px'].entries()) run('set', 'studio', 'font-size', size, '--on', 'heading', '--when', 'type:display-' + (index + 1))
  assert.deepEqual(h2(), { ...before, 'display-1': '60px', 'display-2': '45px', 'display-3': '35px' })
  const scoped = how('display-2 heading in Georgia')
  assert.ok(scoped.commands[0].endsWith('--on heading --when type:display-2'))
  assert.equal(how('display headings centered').commands.length, 3)
  assert.deepEqual(how('display heading 60px').steps.map(step => step.status), ['already-applied-or-overridden'])

  run('set', 'studio', 'font-size', 'clamp(28px, 4vw, 44px)', '--on', 'heading', '--when', 'type:display-2')
  const relative = how('display headings bigger')
  assert.deepEqual(relative.steps[0].skipped, [{ type: 'display-2', reason: 'Responsive size', value: 'clamp(28px, 4vw, 44px)' }])
  assert.equal(relative.commands.length, 2)
  assert.ok(relative.commands.every(line => !line.endsWith('type:display-2')))
  const last = ['--on', 'heading', '--when', 'type:display-3']
  const overridden = editor(project, 'set', 'studio', '--sy-display-3-size', 'clamp(20px, 3vw, 30px)', ...last)
  assert.notEqual(overridden.status, 0)
  assert.match(overridden.stderr, /ERR_THEME_NO_EFFECT/)
  run('undo', 'studio', 'font-size', ...last)
  run('set', 'studio', '--sy-display-3-size', 'clamp(20px, 3vw, 30px)', ...last)
  const token = inspect(['--when', 'type:display-3'])[0].styles['font-size']
  assert.equal(token.value, '30px')
  assert.equal(token.tokens.find(item => item.name === '--sy-display-3-size').source, 'theme')
})

test('an editor fork lifts inherited heading values and retains explicitly authored exceptions through undo', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-inheritance-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    await writeFile(join(project, 'base.json'), JSON.stringify({ version: 1, id: 'design-base', name: 'Design base', rules: {
      'heading-both-base': { target: 'heading', declarations: { 'font-size': '20px' } },
      'heading-both-base-level-2': { target: 'heading', when: { level: '2' }, declarations: { 'font-size': '26px', 'font-weight': '700' } },
      'heading-both-base-level-3': { target: 'heading', when: { level: '3' }, declarations: { 'font-size': '22px' } },
    } }))
    run('new', 'studio', '--like', './base.json')
    const scope = ['--on', 'heading']
    const local = [...scope, '--when', 'level:3']
    run('set', 'studio', 'font-size', '22px', ...local)
    const sizes = () => {
      const byMode = run('show', 'studio', ...scope, '--when', 'type:standard').modes
      return Object.fromEntries(Object.entries(byMode).map(([mode, samples]) => [mode, samples.map(sample => sample.styles['font-size'])]))
    }
    const set = run('set', 'studio', 'font-size', '20px', ...scope)
    assert.deepEqual(set.lifted, [{ part: 'heading', when: { level: '2' }, property: 'font-size', value: '20px' }])
    assert.equal(set.theme.rules['heading-both-base-level-2'].declarations['font-size'], '26px')
    for (const mode of Object.values(sizes())) {
      assert.deepEqual(mode.slice(0, 3).map(item => item.value), ['20px', '20px', '22px'])
      assert.deepEqual(mode.slice(0, 3).map(item => item.source), ['theme', 'theme', 'theme'])
    }
    const css = await readFile(join(project, 'src/themes/studio/theme.css'), 'utf8')
    assert.match(css, /:is\(h2, \[role="heading"\]\[aria-level="2"\]\):where\(:not\(\[data-heading-level\]\), \[data-heading-level="2"\]\)[^{}]*\{ font-weight: 700; font-size: 20px; \}/)
    run('set', 'studio', 'font-size', '23px', ...scope)
    assert.equal(sizes().dark[0].value, '23px')
    run('undo', 'studio', 'font-size', ...scope)
    for (const mode of Object.values(sizes())) {
      assert.equal(mode[0].value, '26px')
      assert.equal(mode[0].source, 'base')
      assert.equal(mode[2].value, '22px')
      assert.equal(mode[2].source, 'theme')
    }
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('navigation text size edits report the token they reach across variants and undo by the setting name', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-nav-type-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    await writeFile(join(project, 'syntrofic.themes.json'), JSON.stringify({
      version: 1, active: 'studio', themes: [{ version: 1, id: 'studio', name: 'Studio' }],
    }))
    const top = run('set', 'studio', 'font-size', '20px', '--on', 'top-nav-heading')
    assert.ok(top.settings.some(setting => setting.setting === 'font-size' && setting.token === '--sy-top-nav-title-size'))
    assert.deepEqual(top.changes.rules[0].declarations, { 'font-size': '20px' })
    const preview = await readFile(join(project, 'themes/studio/preview.html'), 'utf8')
    assert.match(preview, /class="sy-navbar__brand-description"/)
    assert.match(preview, /\.sy-navbar__brand\)[^{}]*\{ --sy-top-nav-title-size: 20px; \}/)
    const side = run('set', 'studio', 'font-size', '21px', '--on', 'side-nav-heading-title')
    assert.ok(side.settings.some(setting => setting.setting === 'font-size' && setting.token === '--sy-side-nav-title-size'))
    run('set', 'studio', 'text-size', '23px', '--on', 'tab-list', '--when', 'size:sm+orientation:vertical')
    const tabs = run('show', '--on', 'tab-list')
    for (const mode of ['light', 'dark']) {
      const samples = tabs.modes[mode]
      const font = (size, orientation) => samples.find(sample =>
        sample.when.size === size && sample.when.orientation === orientation).styles['font-size']
      assert.equal(font('sm', 'vertical').value, '23px')
      assert.equal(font('sm', 'vertical').source, 'theme')
      assert.ok(font('sm', 'vertical').tokens.some(token => token.name === '--sy-tab-label-size' && token.value === '23px'))
      assert.notEqual(font('sm', 'horizontal').value, '23px')
      assert.notEqual(font('md', 'vertical').value, '23px')
    }
    for (const [part, size] of [['top-nav-heading', '20px'], ['top-nav-heading-title', '20px'], ['side-nav-heading', '21px']]) {
      const report = run('show', '--on', part)
      for (const mode of ['light', 'dark']) assert.equal(report.modes[mode][0].styles['font-size'].value, size)
    }
    for (const bad of ['red', 'var(--sy-top-nav-title-size)']) {
      const rejected = editor(project, 'set', 'studio', 'font-size', bad, '--on', 'top-nav-heading')
      assert.match(rejected.stderr, /Invalid size/)
    }
    run('undo', 'studio', 'font-size', '--on', 'top-nav-heading')
    const restored = run('show', '--on', 'top-nav-heading').modes.light[0].styles['font-size']
    assert.notEqual(restored.value, '20px')
    assert.equal(restored.source, 'core')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('the option row group themes labels and descriptions in the requested state and mode', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-option-rows-'))
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  try {
    await writeFile(join(project, 'package.json'), '{}')
    await writeFile(join(project, 'syntrofic.themes.json'), JSON.stringify({
      version: 1, active: 'studio', themes: [{ version: 1, id: 'studio', name: 'Studio' }],
    }))
    const scope = ['--on', 'option-rows', '--state', 'highlighted', '--mode', 'light']
    const parts = ['combobox-option', 'listbox-option', 'menu-item', 'selector-option-row', 'typeahead-option']
    const fill = run('set', 'studio', 'background-color', '#334b3b', ...scope)
    assert.ok(fill.introducedContrast.some(item => item.target === 'selector-option-row / highlighted / description'))
    const ink = run('set', 'studio', 'color', '#ffffff', ...scope)
    assert.deepEqual(ink.changes.rules.map(rule => rule.target).sort(), parts)
    assert.ok(ink.settings.some(setting => setting.part === 'selector-option-row' && setting.setting === 'color'
      && setting.tokens.includes('--sy-option-description-color')))
    assert.ok(!ink.introducedContrast.some(item => parts.some(part => item.target.startsWith(part))))
    for (const part of parts) {
      const modes = run('show', '--on', part).modes
      const highlighted = mode => modes[mode].find(sample => sample.state === 'highlighted')
      const light = highlighted('light')
      assert.equal(light.styles['background-color'].value, 'rgb(51, 75, 59)')
      assert.equal(light.styles.color.value, 'rgb(255, 255, 255)')
      assert.equal(light.description.value, 'rgb(255, 255, 255)')
      assert.equal(light.description.source, 'theme')
      assert.ok(light.description.tokens.some(token => token.name === '--sy-option-description-color' && token.source === 'theme'))
      assert.notEqual(highlighted('dark').styles['background-color'].value, 'rgb(51, 75, 59)')
      assert.notEqual(modes.light.find(sample => sample.state === 'rest').description.source, 'theme')
    }
    const selector = ['--on', 'selector-option-row', '--state', 'highlighted', '--mode', 'light']
    run('set', 'studio', '--sy-option-description-color', '#efd26d', ...selector)
    const highlighted = () => run('show', '--on', 'selector-option-row').modes.light.find(item => item.state === 'highlighted')
    assert.equal(highlighted().description.value, 'rgb(239, 210, 109)')
    run('undo', 'studio', 'color', ...scope)
    const restored = highlighted()
    assert.equal(restored.description.value, 'rgb(239, 210, 109)')
    assert.notEqual(restored.styles.color.value, 'rgb(255, 255, 255)')
    assert.equal(restored.styles['background-color'].value, 'rgb(51, 75, 59)')
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('theme roles share structural scopes for advice, edits and computed lookup', browser, async t => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-roles-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  await writeFile(join(project, 'package.json'), '{}')
  const run = (action, ...args) => {
    const result = editor(project, action, ...args, '--json')
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  run('new', 'studio', '--like', 'neutral')
  const groups = run('how', '--list', 'groups').groups
  assert.deepEqual([...groups['status-surfaces']].sort(), ['banner', 'toast'])
  assert.deepEqual([...groups['button-like']].sort(), ['button', 'toggle-button'])
  assert.ok(groups.overlays.includes('context-menu'))
  const roles = run('how', '--list', 'parts', 'progress-bar-fill').targets[0].roles
  assert.deepEqual(roles['accent-fills'].when, { tone: 'accent' })

  const group = ['--on', 'selected-items', '--when', 'tone:accent', '--mode', 'light']
  const toggle = ['--on', 'toggle-button', '--when', 'tone:accent', '--mode', 'light']
  const untouched = run('show', 'studio', ...toggle, '--state', 'unpressed').modes.light[0].styles['background-color'].value
  const advice = run('how', 'make the selected items background #e6ede7 in light mode', '--theme', 'studio', '--when', 'tone:accent')
  assert.equal(advice.steps[0].validation, 'rendered')
  assert.deepEqual(advice.commands, ["syntrofic theme editor set studio background-color '#e6ede7' --on selected-items --when tone:accent --state selected --mode light"])
  const changed = run('set', 'studio', 'background-color', '#e6ede7', ...group)
  assert.deepEqual(changed.changes.rules.map(({ target, state }) => ({ target, state })), [{ target: 'toggle-button', state: 'pressed' }])
  const shown = run('show', 'studio', ...group)
  assert.equal(shown.group, 'selected-items')
  assert.equal(shown.parts[0].part, 'toggle-button')
  assert.deepEqual(shown.parts[0].modes.light.map(sample => sample.state), ['pressed'])
  assert.equal(shown.parts[0].modes.light[0].styles['background-color'].value, 'rgb(230, 237, 231)')
  const read = run('how', 'what is the background of the selected items in light mode', '--theme', 'studio', '--when', 'tone:accent')
  assert.equal(read.lookups[0].parts[0].readings[0].values[0].value, 'rgb(230, 237, 231)')
  const lighter = run('how', 'make the selected items background lighter in light mode', '--theme', 'studio', '--when', 'tone:accent')
  assert.equal(lighter.steps[0].validation, 'rendered')
  assert.match(lighter.commands[0], /--on selected-items --when tone:accent --state selected --mode light/)
  assert.equal(run('show', 'studio', ...toggle, '--state', 'unpressed').modes.light[0].styles['background-color'].value, untouched)
  const invalid = show(project, 'studio', ...group, '--state', 'rest')
  assert.notEqual(invalid.status, 0)
  assert.match(invalid.stderr, /No part in selected-items supports that scope/)
  const except = run('set', 'studio', 'background-color', '#ededed', ...toggle, '--except', 'selected-items/tone:accent')
  assert.deepEqual(except.changes.preservation.targets[0].exceptions, [{ when: { tone: 'accent' }, state: 'pressed' }])
  assert.equal(run('show', 'studio', ...toggle, '--state', 'pressed').modes.light[0].styles['background-color'].value, 'rgb(230, 237, 231)')
  assert.equal(run('show', 'studio', ...toggle, '--state', 'unpressed').modes.light[0].styles['background-color'].value, 'rgb(237, 237, 237)')

  const status = ['--on', 'status-surfaces', '--when', 'tone:success', '--mode', 'light']
  run('set', 'studio', 'background-color', '#edf1ec', ...status)
  const surfaces = run('show', 'studio', ...status, '--state', 'rest')
  assert.deepEqual(surfaces.parts.map(result => result.part).sort(), ['banner', 'toast'])
  assert.ok(surfaces.parts.every(part => part.modes.light.every(sample => sample.styles['background-color'].value === 'rgb(237, 241, 236)')))
  const text = show(project, 'studio', ...status, '--state', 'rest')
  assert.equal(text.status, 0, text.stderr)
  assert.match(text.stdout, /studio · banner/)
  assert.match(text.stdout, /studio · toast/)
})

test('part lookup measures the saved theme across modes, variants and states without writing project files', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-part-report-'))
  const files = {
    'package.json': '{}',
    'syntrofic.config.json': '{"debug":"commands.ndjson"}',
    'syntrofic.themes.json': JSON.stringify({ version: 1, active: 'studio', editable: ['studio'], themes: [{
      version: 1, id: 'studio', name: 'Studio', modes: { light: { 'accent-text': '#443c52' } }, design: { base: 'stone', buttons: 'soft', tokens: {
        '--sy-control-height-md': '56px', '--sy-control-height-sm': '46px',
      } },
      rules: {
        'button-light-base-variant-primary': {
          target: 'button', mode: 'light', when: { variant: 'primary' }, declarations: { '--sy-accent-text': '#aa4918' },
        },
        'badge-dark-hover-tone-success': {
          target: 'badge', state: 'hover', mode: 'dark', when: { tone: 'success' },
          declarations: { 'background-color': '#813b7b' },
        },
        'button-secondary-dark-hover': {
          target: 'button-secondary', state: 'hover', mode: 'dark', declarations: { 'background-color': '#527461' },
        },
        'button-secondary-dark-active': {
          target: 'button-secondary', state: 'active', mode: 'dark', declarations: { 'background-color': '#5d497f' },
        },
        'resize-handle-pill-both-hover-direction-vertical': {
          target: 'resize-handle-pill', state: 'hover', when: { direction: 'vertical' },
          declarations: { 'background-color': '#527461', height: '7px' },
        },
        'resize-handle-both-hover-direction-vertical': {
          target: 'resize-handle', state: 'hover', when: { direction: 'vertical' },
          declarations: { 'background-color': '#5d497f' },
        },
        'file-input-both-base': {
          target: 'file-input', declarations: { padding: '24px 18px 30px 9px' },
        },
        'app-shell-header-both-base': {
          target: 'app-shell-header', declarations: { height: '68px', 'padding-block': '4px' },
        },
      },
    }] }),
    'syntrofic.themes.json.lock': 'Existing editor lock',
    'themes/studio/studio.theme.ts': 'This edit is incomplete',
    'themes/studio/sheet.html': 'Owner-authored sheet',
  }
  try {
    await mkdir(join(project, 'themes/studio'), { recursive: true })
    await Promise.all(Object.entries(files).map(([file, contents]) => writeFile(join(project, file), contents)))
    const result = show(project, '--on', 'badge', '--json')
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.theme, 'studio')
    assert.deepEqual(Object.keys(report.modes), ['light', 'dark'])
    assert.equal(report.modes.light.length, 48)
    const property = report.modes.dark.find(sample => sample.when.tone === 'success' && sample.state === 'hover').styles['background-color']
    assert.equal(property.value, 'rgb(129, 59, 123)')
    assert.equal(property.source, 'theme')
    assert.ok(property.declarations.some(declaration => declaration.property === 'background-color' && declaration.value === property.value))
    const resting = report.modes.dark.find(sample => sample.when.tone === 'success' && sample.state === 'rest').styles['background-color']
    assert.notEqual(resting.value, property.value)
    assert.ok(resting.tokens.some(token => token.name === '--sy-success-soft' && token.value))
    const text = show(project, '--on', 'badge')
    assert.match(text.stdout, /Studio · badge[\s\S]+light · rest[\s\S]+variants or states differ/)
    const primary = show(project, '--on', 'button-primary', '--json')
    assert.equal(primary.status, 0, primary.stderr)
    const ink = JSON.parse(primary.stdout).modes.light[0].styles.color
    assert.equal(ink.value, 'rgb(68, 60, 82)')
    assert.ok(ink.tokens.some(token => token.name === '--sy-accent-text' && token.value === '#443c52'))
    const buttons = show(project, '--on', 'button-secondary', '--json')
    assert.equal(buttons.status, 0, buttons.stderr)
    const cases = JSON.parse(buttons.stdout).modes.dark
    const colorFor = state => cases.find(sample => sample.state === state).styles['background-color']
    assert.equal(colorFor('hover').value, 'rgb(82, 116, 97)')
    assert.equal(colorFor('active').value, 'rgb(93, 73, 127)')
    assert.match(colorFor('active').declarations[0].selector, /:active/)
    const medium = cases.find(sample => sample.state === 'rest' && sample.when.size === 'md').styles['min-height']
    const small = cases.find(sample => sample.state === 'rest' && sample.when.size === 'sm').styles['min-height']
    assert.equal(medium.value, '56px')
    assert.equal(medium.source, 'theme')
    assert.ok(medium.tokens.some(token => token.name === '--sy-control-height-md' && token.value === '56px'))
    assert.equal(small.value, '46px')
    const nav = show(project, '--on', 'top-nav', '--json')
    assert.equal(nav.status, 0, nav.stderr)
    const placement = Object.fromEntries(JSON.parse(nav.stdout).modes.light.map(sample => [sample.placement, sample.styles.height.value]))
    assert.deepEqual(placement, { standalone: '48px', 'app-shell-header': '60px', 'layout-header': '60px',
      'layout-header-scrollable': '60px', 'layout-region': '60px' })
    const header = show(project, '--on', 'layout-header', '--json')
    assert.equal(header.status, 0, header.stderr)
    assert.deepEqual(JSON.parse(header.stdout).modes.dark.map(sample => [sample.placement, sample.styles.height.value]), [
      ['standalone', '68px'], ['layout-header-scrollable', '68px'], ['layout-region', '68px'],
    ])
    const fields = show(project, '--on', 'input-group', '--json')
    assert.equal(fields.status, 0, fields.stderr)
    const group = JSON.parse(fields.stdout).modes.light.find(sample => sample.state === 'rest' && sample.when.size === 'md')
    assert.equal(group.styles.height.value, '56px')
    const select = show(project, '--on', 'select', '--json')
    assert.equal(select.status, 0, select.stderr)
    const selection = JSON.parse(select.stdout).modes.dark.filter(sample => sample.state === 'rest')
    const height = size => selection.find(sample => sample.when.size === size).styles.height.value
    assert.deepEqual(['sm', 'md', 'lg'].map(height), ['46px', '56px', '50px'])
    const file = show(project, '--on', 'file-input', '--json')
    assert.equal(file.status, 0, file.stderr)
    const samplesByMode = JSON.parse(file.stdout).modes
    for (const mode of ['light', 'dark']) {
      const sides = layout => {
        const sample = samplesByMode[mode].find(sample => sample.state === 'rest' && sample.when.mode === layout)
        return ['top', 'right', 'bottom', 'left'].map(side => sample.styles['padding-' + side].value)
      }
      assert.deepEqual(sides('field'), ['5px', '18px', '5px', '9px'])
      assert.deepEqual(sides('dropzone'), ['24px', '18px', '30px', '9px'])
    }
    for (const [part, color] of [['resize-handle', 'rgb(93, 73, 127)'], ['resize-handle-pill', 'rgb(82, 116, 97)']]) {
      const result = show(project, '--on', part, '--json')
      assert.equal(result.status, 0, result.stderr)
      const samples = JSON.parse(result.stdout).modes.light
      const hover = direction => samples.find(sample => sample.when.direction === direction && sample.state === 'hover').styles
      assert.equal(hover('vertical')['background-color'].value, color)
      assert.equal(hover('vertical')['background-color'].source, 'theme')
      assert.notEqual(hover('horizontal')['background-color'].value, color)
      if (part === 'resize-handle-pill') assert.equal(hover('vertical').height.value, '7px')
    }
    const buttonGroup = show(project, '--on', 'buttons', '--state', 'rest', '--mode', 'light', '--json')
    assert.equal(buttonGroup.status, 0, buttonGroup.stderr)
    assert.deepEqual(JSON.parse(buttonGroup.stdout).parts.map(part => part.part), ['button-primary', 'button-secondary', 'button-ghost', 'button-danger'])
    for (const args of [['--on', 'unknown-group'], ['--on', 'badge', '--on', 'card'], ['--on', 'badge', '--png'], ['--on', 'badge', '--section', 'actions']]) {
      assert.match(show(project, ...args).stderr, /^ERR_INVALID_ARGUMENT:/)
    }
    assert.deepEqual((await readdir(project, { recursive: true })).filter(path => !['themes', 'themes/studio'].includes(path)).sort(), Object.keys(files).sort())
    for (const [file, contents] of Object.entries(files)) assert.equal(await readFile(join(project, file), 'utf8'), contents)
  } finally { await rm(project, { recursive: true, force: true }) }
})

test('part lookup follows local theme inheritance and resolves installed themes by owner', browser, async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-part-source-'))
  const base = {
    version: 1, id: 'shared', name: 'Shared', rules: {
      'card-both-base': { target: 'card', declarations: { 'padding-block': '9px' } },
    },
  }
  try {
    await writeFile(join(project, 'package.json'), JSON.stringify({ dependencies: { '@fixtures/alpha': '1.0.0', '@fixtures/beta': '1.0.0' } }))
    await writeFile(join(project, 'base.json'), JSON.stringify(base))
    await writeFile(join(project, 'local.json'), JSON.stringify({
      version: 1, id: 'local', name: 'Local', extends: './base.json', rules: {
        'card-both-base': { target: 'card', declarations: { color: '#425849' } },
      },
    }))
    const source = show(project, 'local.json', '--on', 'card', '--json')
    assert.equal(source.status, 0, source.stderr)
    const card = JSON.parse(source.stdout).modes.light[0].styles
    assert.equal(card['padding-block'].value, '9px')
    assert.equal(card['padding-block'].source, 'base')
    assert.equal(card.color.value, 'rgb(66, 88, 73)')
    assert.equal(card.color.source, 'theme')

    for (const name of ['alpha', 'beta']) {
      const directory = join(project, 'node_modules/@fixtures', name)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name: '@fixtures/' + name, version: '1.0.0' }))
      await writeFile(join(directory, 'syntrofic.integration.json'), JSON.stringify({ version: 1, contributions: [{ kind: 'theme', file: 'theme.json' }] }))
      await writeFile(join(directory, 'theme.json'), JSON.stringify({ ...base, name }))
    }
    assert.match(show(project, 'shared', '--on', 'card').stderr, /^ERR_AMBIGUOUS_THEME:/)
    const named = show(project, 'shared', '--package', '@fixtures/beta', '--on', 'card', '--json')
    assert.equal(named.status, 0, named.stderr)
    assert.equal(JSON.parse(named.stdout).owner, '@fixtures/beta')
    assert.ok(!(await readdir(project)).includes('syntrofic.themes.json'))
    const fork = editor(project, 'new', 'studio', '--like', 'shared', '--package', '@fixtures/beta', '--json')
    assert.equal(fork.status, 0, fork.stderr)
    assert.equal(JSON.parse(fork.stdout).theme.inheritedRules['card-both-base'].declarations['padding-block'], '9px')
  } finally { await rm(project, { recursive: true, force: true }) }
})
