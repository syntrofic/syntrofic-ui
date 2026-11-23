import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import * as library from '@syntrofic/ui'
import { measureThemeAppearances } from '../../scripts/platform/theme-part-report.mjs'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
const modes = ['light', 'dark']

async function fixture(run, { borderWidth } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-theme-exceptions-'))
  const base = library.createBrandTheme('studio', 'Studio')
  const theme = borderWidth === undefined ? base : { ...base, borderWidth }
  const path = join(directory, 'syntrofic.themes.json')
  const original = JSON.stringify({ version: 1, active: theme.id, themes: [theme] })
  const options = { cwd: directory, encoding: 'utf8', timeout: 65000 }
  const argsFor = args => [cli, 'theme', 'editor', ...args, '--json']
  const editor = (...args) => JSON.parse(execFileSync(process.execPath, argsFor(args), options))
  const fail = (...args) => spawnSync(process.execPath, argsFor(args), options)
  try {
    await writeFile(path, original)
    await writeFile(join(directory, 'package.json'), '{"name":"theme-exceptions"}')
    await run({ directory, theme, path, original, editor, fail })
  } finally { await rm(directory, { recursive: true, force: true }) }
}

test('rounding the theme preserves excluded components on white and saves a single reversible revision', browser, async () => {
  await fixture(async ({ directory, theme, path, original, editor, fail }) => {
    for (const question of ['让整体圆角更大，除了卡片和按钮', 'make everything rounder but keep cards as they are']) {
      const advice = editor('how', question)
      assert.match(advice.commands[0], /^syntrofic theme editor set studio corners more --except card/)
      assert.deepEqual(advice.steps[0].preservation.targets[0].restored, ['border-radius'])
    }
    const args = ['set', 'studio', 'corners', 'more', '--except', 'card', '--except', 'button']
    const preview = editor(...args, '--dry-run')
    assert.equal(await readFile(path, 'utf8'), original)
    assert.deepEqual(preview.changes.preservation.targets.map(target => target.part), ['card', 'button'])
    const invalid = fail('set', 'studio', 'corners', 'more', '--except', 'nonexistent')
    assert.equal(invalid.status, 1)
    assert.match(invalid.stdout + invalid.stderr, /Unknown theme part/)
    assert.equal(await readFile(path, 'utf8'), original)

    const changed = editor(...args).theme
    const registry = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(changed.revision, theme.revision + 1)
    assert.equal(registry.history.studio.length, 1)
    assert.equal(library.resolveThemeTokens(changed, { mode: 'light' })['--sy-canvas'], '#ffffff')

    const measure = (theme, part) => measureThemeAppearances(directory, library, theme, part, [{}], modes, ['border-radius'])
    for (const part of ['card', 'button', 'dialog']) {
      const [before, after] = await Promise.all([measure(theme, part), measure(changed, part)])
      if (part === 'dialog') assert.notDeepEqual(after, before)
      else assert.deepEqual(after, before)
    }
    const undo = editor('undo', 'studio', 'corners', '--except', 'button', '--except', 'card').theme
    assert.equal(undo.revision, changed.revision + 1)
    assert.deepEqual(await measure(undo, 'card'), await measure(theme, 'card'))
    assert.deepEqual(await measure(undo, 'dialog'), await measure(theme, 'dialog'))
  })
})

test('spacing exceptions distinguish button sizes, variants, and rendered states', browser, async () => {
  await fixture(async ({ directory, editor, theme }) => {
    const advice = editor('how', 'make everything more compact except small primary buttons and hovered buttons')
    assert.equal(advice.commands[0], "syntrofic theme editor set studio spacing less --except 'button/size:sm+variant:primary' --except button/state:hover")
    const changed = editor('set', 'studio', 'spacing', 'less', '--except', 'button/size:sm+variant:primary', '--except', 'button/state:hover')
    const measure = theme => measureThemeAppearances(directory, library, theme, 'button', [{}], modes, ['padding'])
    const [[before], [after]] = await Promise.all([measure(theme), measure(changed.theme)])
    assert.equal(after.length, before.length)
    let preserved = 0
    let updated = 0
    for (const [index, sample] of before.entries()) {
      const protectedState = sample.state === 'hover' || sample.when.variant === 'primary' && sample.when.size === 'sm'
      if (protectedState) {
        assert.equal(after[index].values.padding, sample.values.padding)
        preserved++
      } else if (sample.values.padding !== after[index].values.padding) updated++
    }
    assert.equal(changed.changes.preservation.targets[0].samples, preserved)
    assert.ok(updated > 0)
  })
})

test('a prohibition keeps the whole input group when placed before or after the global edit', browser, async () => {
  await fixture(async ({ directory, editor, theme, path, original }) => {
    const parts = ['input', 'textarea', 'select', 'date-input', 'number-input']
    const questions = ['never round the inputs; make everything rounder', 'make everything rounder; never round the inputs']
    for (const question of questions) {
      const advice = editor('how', question)
      assert.deepEqual(advice.commands, ['syntrofic theme editor set studio corners more --except inputs'])
      assert.equal(advice.constraints[0].status, 'applied-to-request')
      assert.deepEqual(advice.steps[0].preservation.targets.map(target => target.part), parts)
    }
    const standalone = editor('how', 'never round the inputs')
    assert.equal(standalone.constraints[0].status, 'preserved')
    assert.equal(standalone.commands, undefined)
    assert.equal(await readFile(path, 'utf8'), original)

    const painted = editor('set', 'studio', 'corners', 'more', '--except', 'inputs').theme
    const measure = (theme, part) => measureThemeAppearances(directory, library, theme, part, [{}], modes, ['border-radius'])
    for (const part of [...parts, 'card']) {
      const [before, after] = await Promise.all([measure(theme, part), measure(painted, part)])
      if (part === 'card') assert.notDeepEqual(after, before)
      else assert.deepEqual(after, before)
    }
  })
})

test('a color exception can preserve one appearance within a variant', browser, async () => {
  await fixture(async ({ directory, editor, theme, path, original }) => {
    const danger = editor('how', 'all buttons blue except the danger one')
    assert.match(danger.commands[0], /--on button --except button\/variant:danger$/)
    const advice = editor('how', 'all buttons blue except primary buttons in dark mode')
    const except = 'button/variant:primary+appearance:dark'
    assert.equal(advice.commands[0], `syntrofic theme editor set studio background-color '#0000ff' --on button --except '${except}'`)
    assert.deepEqual(advice.steps[0].preservation.targets[0].exceptions, [{ when: { variant: 'primary' }, mode: 'dark' }])
    assert.equal(await readFile(path, 'utf8'), original)

    const args = ['set', 'studio', 'background-color', '#0000ff', '--on', 'button']
    const ordinary = editor(...args, '--dry-run').theme
    const changed = editor(...args, '--except', except).theme
    const measure = theme => measureThemeAppearances(directory, library, theme, 'button', [{}], modes, ['background-color'])
    const [[before], [candidate], [after]] = await Promise.all([measure(theme), measure(ordinary), measure(changed)])
    const preserve = sample => sample.mode === 'dark' && sample.when.variant === 'primary'
    assert.ok(candidate.some((sample, index) => preserve(sample) && sample.values['background-color'] !== before[index].values['background-color']))
    assert.ok(after.some((sample, index) => !preserve(sample) && sample.values['background-color'] !== before[index].values['background-color']))
    assert.deepEqual(after, candidate.map((sample, index) => preserve(sample) ? before[index] : sample))
  })
})

test('global border thickness preserves the token and geometry of the input family', browser, async () => {
  await fixture(async ({ editor, directory, path, original, theme }) => {
    const token = '--sy-border-width'
    const inputParts = ['input', 'textarea', 'select', 'date-input', 'number-input', 'input-group', 'complex-selector', 'combobox', 'file-input']
    const command = `syntrofic theme editor set studio ${token} more --except inputs`
    assert.equal(editor('how', 'what is the border width').lookups[0].values.light, '1px')
    for (const question of ['all borders thicker except on inputs', '让整体边框更粗，除了输入控件']) {
      const result = editor('how', question)
      assert.deepEqual(result.commands, [command])
      assert.deepEqual(result.steps[0].preservation.targets.map(target => target.part), inputParts)
    }
    assert.deepEqual(editor('how', 'make borders thicker by 2px except cards').commands,
      [`syntrofic theme editor set studio ${token} 3px --except card`])
    assert.equal(await readFile(path, 'utf8'), original)

    const changed = editor('set', 'studio', token, 'more', '--except', 'inputs')
    assert.equal(changed.theme.revision, theme.revision + 1)
    assert.equal(changed.resolved.light[token], '2px')
    assert.equal(changed.resolved.dark[token], '2px')
    assert.equal(changed.resolved.light['--sy-canvas'], '#ffffff')
    assert.deepEqual(changed.changes.rules.map(rule => rule.target), inputParts)
    assert.ok(changed.changes.rules.every(rule => rule.declarations[token] === '1px'))
    const geometry = (theme, part, properties) => measureThemeAppearances(directory, library, theme, part, [{}], modes, properties)
    for (const part of inputParts) {
      const properties = ['border-width', token, 'padding', 'height']
      const [before, after] = await Promise.all([geometry(theme, part, properties), geometry(changed.theme, part, properties)])
      assert.deepEqual(after, before, part)
    }
    for (const part of ['card', 'button']) {
      const after = await geometry(changed.theme, part, ['border-width'])
      assert.ok(after[0].every(sample => sample.values['border-width'] === '2px'), part)
    }
    const undo = editor('undo', 'studio', token, '--except', 'inputs')
    assert.equal(undo.resolved.light[token], '1px')
    assert.deepEqual(undo.theme.rules ?? {}, theme.rules ?? {})
  }, { borderWidth: 1 })
})

test('outlined surfaces use the shared width and honor a scoped exception', browser, async () => {
  await fixture(async ({ editor, directory }) => {
    editor('set', 'studio', 'surfaces', 'outlined')
    editor('set', 'studio', 'badges', 'outline')
    const changed = editor('set', 'studio', 'border-width', 'thick', '--except', 'card').theme
    const [[surface], [badge]] = await Promise.all([
      measureThemeAppearances(directory, library, changed, 'card', [{}], modes, ['outline-width']),
      measureThemeAppearances(directory, library, changed, 'badge', [{}], modes, ['box-shadow']),
    ])
    assert.ok(surface.every(sample => sample.values['outline-width'] === '1px'))
    assert.ok(badge.every(sample => /0px 0px 0px 3px inset/.test(sample.values['box-shadow'])))
  })
})
