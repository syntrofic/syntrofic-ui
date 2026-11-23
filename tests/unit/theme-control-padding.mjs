import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as library from '@syntrofic/ui'
import { themeEditorChange, themeEditorEntry, themeEditorReport, themeEditorUndo } from '../../scripts/platform/theme-editor.mjs'

function edit(theme, property, value, options) {
  const padding = []
  const changes = themeEditorChange(library, theme, property, value, { ...options, reportPadding: item => padding.push(item) })
  const result = library.applyBrandPatch(theme, { revision: theme.revision, changes })
  return { result, padding, entry: { ...themeEditorEntry(property, options, theme, result, changes, value), theme } }
}

test('content-growing controls keep authored padding values but apply only the inline sides', () => {
  const theme = library.createBrandTheme('studio', 'Studio')
  for (const part of ['select', 'typeahead', 'combobox', 'tokenizer']) {
    for (const [value, inline] of [
      ['20px', [{ property: 'padding-inline', value: '20px' }]],
      ['20px 12px', [{ property: 'padding-inline', value: '12px' }]],
      ['20px 12px 30px', [{ property: 'padding-inline', value: '12px' }]],
      ['20px 12px 30px 6px', [{ property: 'padding-left', value: '6px' }, { property: 'padding-right', value: '12px' }]],
    ]) {
      const { result, padding } = edit(theme, 'padding', value, { on: part, only: true })
      assert.deepEqual(result.rules[part + '-both-base'].declarations, { padding: value })
      assert.deepEqual(padding, [{ part, policy: 'inline', adjustments: [{ property: 'padding', value, inline }], skipped: false }])
      const css = library.exportBrandTheme(result)['theme.css']
      for (const side of inline) assert.ok(css.includes(`${side.property}: ${side.value};`))
      assert.ok(!css.includes(`padding: ${value};`))
    }
  }
})

test('a block-only edit skips protected members of a group and can be written on the drop zone', () => {
  const theme = library.createBrandTheme('studio', 'Studio')
  for (const part of ['select', 'typeahead', 'combobox', 'tokenizer', 'file-input']) {
    assert.throws(() => edit(theme, 'padding-top', '19px', { on: part, only: true,
      ...(part === 'file-input' && { when: ['mode:field'] }) }), { code: 'ERR_THEME_NO_EFFECT' })
  }
  assert.throws(() => edit(theme, 'padding-top', '-1px', { on: 'select', only: true }), /Invalid size/)
  assert.throws(() => edit(theme, 'padding-inline', '20px', { on: 'select', only: true, mode: 'dark' }), /Mode-specific/)
  const { result: inputs, padding } = edit(theme, 'padding-block', '18px 12px', { on: 'inputs', when: ['size:sm'] })
  assert.deepEqual(inputs.rules['input-both-base-size-sm'].declarations, { 'padding-block': '18px 12px' })
  assert.equal(inputs.rules['select-both-base-size-sm'], undefined)
  assert.ok(padding.find(item => item.part === 'select').skipped)
  const { result: files } = edit(theme, 'padding-top', '20px', { on: 'file-input', when: ['mode:dropzone'] })
  assert.match(library.exportBrandTheme(files)['theme.css'], /data-mode="dropzone"[^{}]+\{ padding-top: 20px; \}/)
  const { result: complex } = edit(theme, 'padding-top', '18px', { on: 'complex-selector' })
  assert.deepEqual(complex.rules['complex-selector-both-base'].declarations, { 'padding-top': '18px' })
})

test('legacy rules still open, and a new shorthand replaces and restores the previous padding at its own scope', () => {
  const theme = library.defineBrandTheme({ id: 'studio', name: 'Studio', rules: {
    'select-both-base': { target: 'select', declarations: { 'padding-left': '7px', 'padding-top': '19px', color: 'red' } },
    'select-both-hover': { target: 'select', state: 'hover', declarations: { 'padding-inline': '4px' } },
  } })
  assert.match(library.exportBrandTheme(theme)['theme.css'], /padding-left: 7px;/)
  assert.doesNotMatch(library.exportBrandTheme(theme)['theme.css'], /padding-top: 19px;/)
  const report = themeEditorReport(library, theme)
  assert.ok(report.settings.some(setting => setting.setting === 'padding-top' && setting.value === '19px'))
  assert.deepEqual(report.paddingAdjustments[0].adjustments, [{ property: 'padding-top', value: '19px', inline: [] }])
  const options = { on: 'select', only: true }
  const { result, entry } = edit(theme, 'padding', '24px 12px', options)
  assert.deepEqual(result.rules['select-both-base'].declarations, { color: 'red', padding: '24px 12px' })
  assert.equal(result.rules['select-both-hover'].declarations['padding-inline'], '4px')
  const { theme: restored } = themeEditorUndo(library, result, [entry], 'padding', options)
  assert.deepEqual(restored.rules, theme.rules)
})
