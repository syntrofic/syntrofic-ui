import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import * as library from '@syntrofic/ui'
import { themeEditorChange, themeEditorEntry, themeEditorGroups, themeEditorUndo } from '../../scripts/platform/theme-editor.mjs'
import { writeEditorPreview } from '../../scripts/platform/theme-sheet.mjs'

function edit(theme, setting, value, options) {
  const changes = themeEditorChange(library, theme, setting, value, options)
  const result = library.applyBrandPatch(theme, { revision: theme.revision, changes })
  return { result, entry: { ...themeEditorEntry(setting, options, theme, result, changes, value), theme } }
}

test('common heights are shared by size while local, variant and content-sized settings retain their scope', () => {
  const original = library.createBrandTheme('studio', 'Studio')
  const { result: local } = edit(original, 'height', '54px', { on: 'select', only: true })
  assert.deepEqual(local.rules['select-both-base-size-md'].declarations, { '--sy-select-control-height': '54px' })
  const { result: described } = edit(local, 'height', '64px', { on: 'select', when: ['size:lg'], state: 'open' })
  assert.deepEqual(described.rules['select-both-open-size-lg'].declarations, { height: '64px' })
  const { result: area } = edit(described, 'height', '96px', { on: 'textarea' })
  assert.deepEqual(area.rules['textarea-both-base'].declarations, { height: '96px' })
  const { result: shared, entry } = edit(area, 'height', '56px', { on: 'controls' })
  for (const mode of ['light', 'dark']) assert.equal(library.brandThemeStyle(shared, mode)['--sy-control-height-md'], '56px')
  assert.equal(shared.rules['select-both-base-size-md'], undefined)
  assert.deepEqual(shared.rules['select-both-open-size-lg'], area.rules['select-both-open-size-lg'])
  assert.deepEqual(shared.rules['textarea-both-base'], area.rules['textarea-both-base'])
  const undone = themeEditorUndo(library, shared, [entry], 'height', { on: 'controls' })
  assert.equal(undone.theme.design.tokens['--sy-control-height-md'], undefined)
  assert.deepEqual(undone.theme.rules['select-both-base-size-md'], area.rules['select-both-base-size-md'])
  assert.ok(themeEditorGroups(library).controls.includes('input-group'))
})

test('editing a shared size preserves legacy height declarations on the other sizes and preserves unrelated rules', () => {
  const classic = library.defineBrandTheme({
    id: 'classic', name: 'Classic', rules: {
      'input-both-base': { target: 'input', declarations: { height: '48px', color: '#fff' } },
      'input-both-base-size-sm': { target: 'input', when: { size: 'sm' }, declarations: { height: '44px' } },
      'input-both-base-type-email': { target: 'input', when: { type: 'email' }, declarations: { height: '49px' } },
    },
  })
  const { result, entry } = edit(classic, '--sy-control-height-md', '58px', {})
  assert.deepEqual(result.rules['input-both-base'].declarations, { color: '#fff' })
  assert.deepEqual(result.rules['input-both-base-size-sm'].declarations, { height: '44px' })
  assert.deepEqual(result.rules['input-both-base-size-lg'].declarations, { height: '48px' })
  assert.deepEqual(result.rules['input-both-base-type-email'].declarations, { height: '49px' })
  const restored = themeEditorUndo(library, result, [entry], '--sy-control-height-md', {}).theme
  assert.deepEqual(restored.rules['input-both-base'].declarations, classic.rules['input-both-base'].declarations)
  assert.equal(restored.rules['input-both-base-size-lg']?.declarations.height, undefined)
  assert.throws(() => edit(classic, 'height', 'auto', { on: 'button' }), /Invalid value/)
  assert.throws(() => edit(classic, 'height', '52px', { on: 'inputs', mode: 'dark' }), /both color modes/)
  assert.throws(() => edit(classic, 'height', '52px', { on: 'date-input', when: ['size:lg'] }), /Cannot select size/)
})

test('a shared control token includes actions and inputs in both color modes of the picture plan', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-height-pictures-'))
  try {
    const { result: theme } = edit(library.createBrandTheme('studio', 'Studio'), 'height', '54px', { on: 'controls' })
    const result = await writeEditorPreview(project, library, { theme }, { png: true, 'dry-run': true })
    for (const file of ['sheet-actions.png', 'sheet-actions-dark.png', 'sheet-inputs.png', 'sheet-inputs-dark.png']) {
      assert.ok(result.files.includes(file), file)
    }
    assert.deepEqual(await readdir(project), [])
  } finally { await rm(project, { recursive: true, force: true }) }
})
