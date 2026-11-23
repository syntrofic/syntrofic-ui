import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as library from '@syntrofic/ui'
import { resolveThemeFonts } from '../../scripts/platform/theme-fonts.mjs'
import { documentFor } from '../../scripts/platform/theme-part-report.mjs'
import { withThemeBrowser } from '../../scripts/platform/theme-pictures.mjs'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const browser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-font-roles-'))
  const path = join(directory, 'syntrofic.themes.json')
  const theme = library.createBrandTheme('studio', 'Studio')
  const original = JSON.stringify({ version: 1, active: theme.id, themes: [theme] })
  const options = { cwd: directory, encoding: 'utf8', timeout: 60000 }
  const args = values => [cli, 'theme', 'editor', ...values, '--json']
  const editor = (...values) => JSON.parse(execFileSync(process.execPath, args(values), options))
  const fail = (...values) => spawnSync(process.execPath, args(values), options)
  try {
    await writeFile(join(directory, 'package.json'), '{"name":"font-roles"}')
    await writeFile(path, original)
    await run({ directory, path, original, theme, editor, fail })
  } finally { await rm(directory, { recursive: true, force: true }) }
}

test('how understands and reads independent fonts in a bilingual request', async () => {
  await fixture(async ({ editor, original, path }) => {
    const advice = editor('how', 'Georgia body text and Inter headings; set code font to JetBrains Mono')
    assert.deepEqual(advice.commands, [
      'syntrofic theme editor set studio font georgia --on body',
      'syntrofic theme editor set studio font inter --on heading',
      "syntrofic theme editor set studio font 'jetbrains mono' --on code",
    ])
    const chinese = editor('how', '把标题字体改成 Georgia')
    assert.deepEqual(chinese.commands, ['syntrofic theme editor set studio font georgia --on heading'])
    const query = editor('how', 'what is the code font')
    assert.equal(query.lookups[0].token, '--sy-font-code')
    assert.match(query.lookups[0].values.light, /monospace/)
    assert.equal(editor('how', 'set font size to 18px').steps[0].property, 'text-size')
    assert.equal(await readFile(path, 'utf8'), original)
  })
})

test('role changes, exact tokens and undo preserve independent font settings', async () => {
  await fixture(async ({ editor, fail, path, original, directory }) => {
    const dryRun = editor('set', 'studio', 'font', 'Georgia', '--on', 'heading', '--dry-run')
    assert.equal(dryRun.fontRoles.heading.source, 'role')
    assert.equal(await readFile(path, 'utf8'), original)
    for (const flags of [['--mode', 'dark'], ['--when', 'level:2'], ['--state', 'hover']]) {
      const invalid = fail('set', 'studio', 'font', 'Georgia', '--on', 'heading', ...flags)
      assert.equal(invalid.status, 1)
      assert.match(invalid.stdout + invalid.stderr, /Use font for the entire/)
    }
    const bad = fail('set', 'studio', '--sy-font-code', '42')
    assert.equal(bad.status, 1)
    assert.equal(await readFile(path, 'utf8'), original)

    editor('set', 'studio', 'font', 'Georgia', '--on', 'heading')
    editor('set', 'studio', 'font', 'tahoma', '--on', 'body')
    const code = editor('set', 'studio', 'font', 'JetBrains Mono', '--on', 'code')
    const { notes } = await resolveThemeFonts(directory, [code.theme])
    assert.ok(notes.some(note => note.family === 'JetBrains Mono' && note.package === '@fontsource/jetbrains-mono'))
    const all = editor('set', 'studio', 'font', 'helvetica')
    assert.deepEqual(all.fontRoles, code.fontRoles)
    const exact = editor('set', 'studio', '--sy-font-heading', 'Verdana, sans-serif')
    assert.equal(exact.fontRoles.heading.family, 'Verdana, sans-serif')
    assert.equal(exact.fontRoles.heading.source, 'token')
    const underneath = editor('set', 'studio', 'font', 'segoe', '--on', 'Heading')
    assert.equal(underneath.fontRoles.heading.family, 'Verdana, sans-serif')
    assert.match(underneath.fontRoles.heading.roleFamily, /Segoe UI/)
    const revealed = editor('undo', 'studio', '--sy-font-heading')
    assert.match(revealed.fontRoles.heading.family, /Segoe UI/)
    const reverted = editor('undo', 'studio', 'font', '--on', 'heading')
    assert.match(reverted.fontRoles.heading.family, /^Helvetica/)
    assert.deepEqual(reverted.fontRoles.body, all.fontRoles.body)
    assert.deepEqual(reverted.fontRoles.code, all.fontRoles.code)
    assert.equal(reverted.resolved.light['--sy-canvas'], '#ffffff')
  })
})

test('exported and inline themes deliver the three fonts to rendered components in both appearances', browser, async () => {
  await fixture(async ({ editor, directory }) => {
    editor('set', 'studio', 'font', 'tahoma', '--on', 'body')
    editor('set', 'studio', 'font', 'georgia', '--on', 'heading')
    const { theme } = editor('set', 'studio', 'font', 'courier', '--on', 'code')
    const { SBrandTheme, SButton, SCode, SCodeBlock, SCodeEditor, SKbd, STypography } = library
    const examples = () => [
      h('p', 'Body text'), h(SButton, {}, { default: () => 'Button' }),
      h(STypography, { variant: 'h2' }, { default: () => 'Heading' }),
      h(STypography, { as: 'span', type: 'display-1' }, { default: () => 'Display title' }),
      h(SCode, {}, { default: () => 'const n = 1' }),
      h(SCodeBlock, { code: 'const n = 1' }),
      h(SCodeEditor, { label: 'Editor', modelValue: 'const n = 1' }),
      h(SKbd, { keys: 'Enter' }),
    ]
    const style = await readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8')
    const palette = library.exportBrandTheme(theme)['theme.css']
    await withThemeBrowser(directory, { timeout: 60000 }, async renderer => {
      for (const mode of ['light', 'dark']) {
        const markup = await renderToString(h('main', [
          h('section', { id: 'exported' }, examples()),
          h(SBrandTheme, { theme, mode, id: 'inline' }, { default: examples }),
        ]))
        const html = await documentFor({ style, palette, markup, mode, theme: theme.id, fonts: { css: '' }, cached: new Map() })
        await renderer.load({ mode, html })
        const result = await renderer.evaluate(() => {
          const selectors = ['p', '.sy-button', 'h2.sy-type', 'span.sy-type', '.sy-inline-code',
            '.sy-code-block code', '.sy-code-editor textarea', '.sy-kbd']
          return {
            scopes: ['#exported', '#inline'].map(scope => selectors.map(selector => {
              const element = document.querySelector(scope + ' ' + selector)
              return element && getComputedStyle(element).fontFamily
            })),
            canvas: getComputedStyle(document.body).backgroundColor,
          }
        })
        for (const families of result.scopes) {
          assert.deepEqual(families.map(value => value?.split(',')[0].replaceAll('"', '')),
            ['Tahoma', 'Tahoma', 'Georgia', 'Georgia', 'Courier New', 'Courier New', 'Courier New', 'Courier New'])
        }
        if (mode === 'light') assert.equal(result.canvas, 'rgb(255, 255, 255)')
      }
    })
  })
})
