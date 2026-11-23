import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import * as library from '@syntrofic/ui'
import { parseThemeQuestion } from '../../scripts/platform/theme-question.mjs'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-shadows-'))
  const file = join(directory, 'syntrofic.themes.json')
  const high = '0 12px 28px rgba(39, 44, 40, .2), 0 4px 10px 2px rgba(20, 24, 21, .08)'
  const theme = library.defineBrandTheme({ id: 'studio', name: 'Studio', design: {
    shadows: { dark: { '--sy-shadow-high': high } },
  } })
  const original = JSON.stringify({ version: 1, active: theme.id, themes: [theme] })
  const editor = (...args) => JSON.parse(execFileSync(process.execPath, [cli, 'theme', 'editor', ...args, '--json'],
    { cwd: directory, encoding: 'utf8', timeout: 60000 }))
  try {
    await writeFile(join(directory, 'package.json'), '{"name":"shadow-roles"}')
    await writeFile(file, original)
    await run({ theme, editor, file, original })
  } finally { await rm(directory, { recursive: true, force: true }) }
}

test('shadow questions recognize independent appearances and component scopes', () => {
  const action = input => parseThemeQuestion(library, input, {}).actions[0]
  assert.equal(action('the shadows are too strong').value, '75%')
  assert.equal(action('make the dialog shadow 50% darker').scope.on, 'dialog')
  assert.equal(action('make the dialog shadow 50% darker').value, '150%')
  assert.equal(action('把深色模式的阴影加深 50%').scope.mode, 'dark')
  assert.equal(action('把深色模式的阴影加深 50%').value, '150%')
  assert.equal(action('make card shadows with 30% alpha').property, 'shadow-alpha')
  assert.equal(action('把对话框阴影透明度设为 30%').value, '70%')
  assert.equal(action('sunken bevel on inputs').property, 'box-shadow')
  assert.equal(action('softer shadow on inputs when hovered').scope.state, 'hover')
})

test('shadow alpha keeps every authored layer and changes only the selected appearance', browser, async () => {
  await fixture(async ({ editor }) => {
    const request = editor('how', 'make dialog shadows 70% transparent in dark mode')
    assert.deepEqual(request.commands, ["syntrofic theme editor set studio shadow-alpha '30%' --on dialog --mode dark"])
    const result = editor('set', 'studio', 'shadow-alpha', '30%', '--on', 'dialog', '--mode', 'dark')
    const dialog = Object.values(result.theme.rules).find(rule => rule.target === 'dialog' && !rule.state)
    assert.equal(dialog.mode, 'dark')
    assert.equal(dialog.declarations['box-shadow'], 'rgba(39, 44, 40, 0.3) 0px 12px 28px 0px, rgba(20, 24, 21, 0.3) 0px 4px 10px 2px')
    assert.equal(result.resolved.light['--sy-canvas'], '#ffffff')
  })
})

test('a resting input bevel keeps the hover ring and an authored focus shadow', browser, async () => {
  await fixture(async ({ editor }) => {
    const focus = '0 0 0 3px #ff0000'
    editor('set', 'studio', 'box-shadow', focus, '--on', 'input', '--state', 'focus-visible', '--only')
    const request = editor('how', 'sunken bevel on inputs')
    assert.match(request.commands[0], /^syntrofic theme editor set studio box-shadow 'inset .+' --on inputs$/)
    const bevel = 'inset 2px 2px 0 #808080, inset -2px -2px 0 #ffffff'
    editor('set', 'studio', 'box-shadow', bevel, '--on', 'inputs')
    const read = (part, state) => editor('show', 'studio', '--on', part, '--state', state, '--mode', 'light')
      .modes.light[0].styles['box-shadow'].value
    const rest = read('input', 'rest')
    assert.match(rest, /rgb\(128, 128, 128\) 2px 2px 0px 0px inset/)
    const bevelLayers = rest.split(' inset, ').slice(1).join(' inset, ')
    assert.equal(read('input', 'focus-visible'), 'rgb(255, 0, 0) 0px 0px 0px 3px')
    const hover = read('input', 'hover')
    assert.ok(hover.endsWith(bevelLayers))
    const softer = editor('how', 'softer shadow on inputs when hovered in light mode')
    assert.deepEqual(softer.commands, ["syntrofic theme editor set studio shadow-strength '75%' --on field --state hover --mode light"])
    const adjusted = editor('set', 'studio', 'shadow-strength', '75%', '--on', 'field', '--state', 'hover', '--mode', 'light')
    const ring = adjusted.theme.rules['field-light-hover'].declarations[library.brandFieldHoverRingToken]
    assert.match(ring, /\/ 0\.33\)/)
    assert.notEqual(read('input', 'hover'), hover)
    assert.ok(read('input', 'hover').endsWith(bevelLayers))
    assert.equal(read('input', 'rest'), rest)
    const file = read('file-input', 'rest')
    assert.ok(read('file-input', 'hover').endsWith(file.split(' inset, ').slice(1).join(' inset, ')))
    assert.match(file, /2px 2px/)
  })
})

test('a rendered dark shadow edit preserves the light mode, geometry and white canvas', browser, async () => {
  await fixture(async ({ theme, editor, file, original }) => {
    const result = editor('how', 'make shadows 50% darker in dark mode')
    assert.deepEqual(result.commands, ["syntrofic theme editor set studio shadow-strength '150%' --mode dark"])
    assert.equal(result.steps[0].validation, 'rendered')
    assert.equal(await readFile(file, 'utf8'), original)
    const dark = editor('set', 'studio', 'shadow-strength', '150%', '--mode', 'dark')
    const shadows = dark.theme.design.shadows.dark
    assert.deepEqual(Object.keys(shadows).sort(), [...library.brandShadowTokens].sort())
    assert.equal(shadows['--sy-shadow-high'], 'rgba(39, 44, 40, 0.3) 0px 12px 28px 0px, rgba(20, 24, 21, 0.12) 0px 4px 10px 2px')
    assert.deepEqual(library.brandThemeStyle(dark.theme, 'light'), library.brandThemeStyle(theme, 'light'))
    assert.equal(dark.resolved.light['--sy-canvas'], '#ffffff')
    const undone = editor('undo', 'studio', 'shadow-strength', '--mode', 'dark')
    assert.deepEqual(undone.theme.design.shadows, theme.design.shadows)
  })
})

test('a relative dialog shadow edit and a shared edit with an exception are rendered and saved', browser, async () => {
  await fixture(async ({ editor }) => {
    const details = editor('how', 'make the dialog shadow 50% darker in dark mode')
    assert.deepEqual(details.commands, ["syntrofic theme editor set studio shadow-strength '150%' --on dialog --mode dark"])
    const read = mode => editor('show', 'studio', '--on', 'dialog', '--mode', mode)
      .modes[mode][0].styles['box-shadow'].value
    const light = read('light')
    assert.match(light, /0px 12px 28px 0px/)
    const original = read('dark')
    editor('set', 'studio', 'shadow-strength', '150%', '--on', 'dialog', '--mode', 'dark')
    const local = read('dark')
    assert.notEqual(local, original)
    assert.match(local, /rgba\(39, 44, 40, 0\.3\) 0px 12px 28px 0px/)
    assert.equal(read('light'), light)
    const preserved = editor('set', 'studio', 'shadow-strength', '75%', '--except', 'dialog')
    assert.ok(preserved.changes.preservation.targets[0].restored.includes('box-shadow'))
    assert.equal(read('light'), light)
    assert.equal(read('dark'), local)
  })
})
