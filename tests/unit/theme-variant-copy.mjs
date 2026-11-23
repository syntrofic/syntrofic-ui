import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import * as library from '@syntrofic/ui'
import { measureThemeAppearances } from '../../scripts/platform/theme-part-report.mjs'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
const button = { target: 'button' }
const appearance = ['background-color', 'background-image', 'color', 'border-style', 'border-width', 'border-radius', 'padding', 'font-weight', 'min-height']

async function fixture(run, theme = library.createBrandTheme('studio', 'Studio')) {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-variant-copy-'))
  const registry = join(directory, 'syntrofic.themes.json')
  const original = JSON.stringify({ version: 1, active: 'studio', themes: [theme] })
  try {
    await writeFile(registry, original)
    await writeFile(join(directory, 'package.json'), '{"name":"variant-copy"}')
    const runEditor = (...args) => JSON.parse(execFileSync(process.execPath, [cli, 'theme', 'editor', ...args, '--json'], {
      cwd: directory, encoding: 'utf8', timeout: 65000,
    }))
    await run({ runEditor, directory, registry, original, theme })
  } finally { await rm(directory, { force: true, recursive: true }) }
}

test('how proposes a measured variant copy in English and Chinese, leaving the theme intact', browser, async () => {
  await fixture(async ({ runEditor, directory, registry, original }) => {
    const primary = runEditor('how', 'ghost buttons look like the default button')
    assert.deepEqual(primary.commands, ['syntrofic theme editor set studio copy-style variant:default --on button --when variant:ghost'])
    const copy = primary.steps[0].appearanceCopy
    assert.deepEqual(copy.from, { variant: 'primary' })
    assert.deepEqual(copy.to, { variant: 'ghost' })
    assert.deepEqual(copy.modes, ['light', 'dark'])
    assert.ok(copy.samples >= 140)
    assert.ok(copy.states.includes('hover') && copy.states.includes('disabled'))
    assert.ok(copy.changed.includes('background-color'))
    const secondary = runEditor('how', '让幽灵按钮看起来像次要按钮')
    assert.deepEqual(secondary.commands, ['syntrofic theme editor set studio copy-style variant:secondary --on button --when variant:ghost'])
    for (const phrase of ['ghost buttons should not look like primary buttons', 'ghost buttons look like primary buttons on hover',
      'ghost buttons look like primary buttons in dark mode', 'ghost buttons look like cards']) {
      const reply = runEditor('how', phrase)
      assert.equal(reply.commands, undefined, phrase)
      assert.ok(reply.refused.length, phrase)
    }
    assert.equal(await readFile(registry, 'utf8'), original)
    assert.deepEqual((await readdir(directory)).sort(), ['package.json', 'syntrofic.themes.json'])
  })
})

test('copy-style commits and undoes one revision while matching the requested size across real states', browser, async () => {
  const base = library.createBrandTheme('studio', 'Studio')
  const rules = [
    { ...button, when: { variant: 'primary', size: 'sm' }, declarations: {
      padding: '3px 22px', 'font-weight': '800', 'border-width': '2px', 'border-style': 'dashed', 'border-radius': '13px / 9px',
      '--sy-button-height': '38px',
    } },
    { ...button, when: { variant: 'primary', size: 'sm' }, mode: 'dark', state: 'hover', declarations: {
      'background-image': 'linear-gradient(#425849, #314437), linear-gradient(#777777, #444444)',
    } },
    { ...button, when: { variant: 'ghost', size: 'sm' }, state: 'focus-visible', declarations: { padding: '2px 7px' } },
  ].map(rule => ({ type: 'rule', key: library.brandRuleKey(rule), value: rule }))
  const theme = library.applyBrandPatch(base, { revision: base.revision, changes: rules })
  await fixture(async ({ runEditor, directory, registry, original }) => {
    const conditions = [{ variant: 'primary', size: 'sm' }, { variant: 'ghost', size: 'sm' }, { variant: 'ghost', size: 'md' }]
    const modes = ['light', 'dark']
    const measure = value => measureThemeAppearances(directory, library, value, 'button', conditions, modes, appearance)
    const before = await measure(theme)
    const flags = ['--on', 'button', '--when', 'size:sm+variant:ghost']
    const argumentsForCopy = ['set', 'studio', 'copy-style', 'variant:primary', ...flags]

    const preview = runEditor(...argumentsForCopy, '--dry-run')
    assert.equal(await readFile(registry, 'utf8'), original)
    assert.equal(preview.changes.appearanceCopy.samples, before[1].length)
    assert.ok(preview.changes.appearanceCopy.changed.includes('background-image'))

    const answer = runEditor(...argumentsForCopy)
    assert.equal(answer.theme.revision, theme.revision + 1)
    const saved = JSON.parse(await readFile(registry, 'utf8'))
    assert.equal(saved.history.studio.length, 1)
    assert.equal(saved.themes[0].revision, theme.revision + 1)
    assert.ok(answer.changes.rules.every(rule => rule.target === 'button' && rule.when.variant === 'ghost' && rule.when.size === 'sm'))
    assert.ok(answer.changes.rules.some(rule => rule.declarations['--sy-button-height'] === '38px'))
    const after = await measure(saved.themes[0])
    const styles = samples => samples.map(({ mode, state, when, values }) => ({ mode, state, elevation: when.elevation, values }))
    assert.deepEqual(styles(after[1]), styles(before[0]))
    assert.deepEqual(after[0], before[0])
    assert.deepEqual(after[2], before[2])
    assert.equal(library.resolveThemeTokens(saved.themes[0], { mode: 'light' })['--sy-canvas'], '#ffffff')

    const unchanged = await readFile(registry, 'utf8')
    const repeated = spawnSync(process.execPath, [cli, 'theme', 'editor', ...argumentsForCopy], { cwd: directory, encoding: 'utf8', timeout: 65000 })
    assert.equal(repeated.status, 1)
    assert.match(repeated.stderr, /ERR_THEME_NO_EFFECT/)
    assert.equal(await readFile(registry, 'utf8'), unchanged)

    const undo = runEditor('undo', 'studio', 'copy-style', ...flags)
    assert.equal(undo.theme.revision, theme.revision + 2)
    assert.deepEqual(await measure(undo.theme), before)
  }, theme)
})
