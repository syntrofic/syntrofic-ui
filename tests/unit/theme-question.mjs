import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { applyBrandPatch, createBrandTheme } from '@syntrofic/ui'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))
const withBrowser = { skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }

async function project(run, state = { version: 1, themes: [createBrandTheme('studio', 'Studio')], active: 'studio' }) {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-theme-question-'))
  const registry = join(directory, 'syntrofic.themes.json')
  const original = JSON.stringify(state)
  try {
    await writeFile(registry, original)
    await writeFile(join(directory, 'package.json'), '{"name":"theme-question"}')
    const ask = (...args) => JSON.parse(execFileSync(process.execPath, [cli, 'theme', 'editor', 'how', ...args, '--json'], {
      cwd: directory, encoding: 'utf8', timeout: 60000,
    }))
    await run(ask, directory)
    assert.equal(await readFile(registry, 'utf8'), original)
    assert.deepEqual((await readdir(directory)).sort(), ['package.json', 'syntrofic.themes.json'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('how resolves queries by token, filtered kinds and the most recently edited theme', async () => {
  const studio = createBrandTheme('studio', 'Studio')
  const review = createBrandTheme('review', 'Review', 'slate')
  await project(async (ask, directory) => {
    const token = ask('--sy-accent')
    assert.equal(token.theme, 'review')
    assert.equal(token.themeChosenBy, 'last-changed')
    assert.match(token.themeNote, /changed most recently.*review/)
    assert.equal(token.lookups[0].values.light, review.modes.light.accent)
    assert.ok(token.lookups[0].readBy.includes('button'))
    assert.equal(token.lookups[0].type, 'color')
    assert.equal(token.lookups[0].usedInStylesheet, true)
    assert.equal(ask('Accent', '--theme', 'studio').lookups[0].values.light, studio.modes.light.accent)
    assert.equal(ask('what does --sy-canvas do', '--theme', 'studio').lookups[0].values.light, '#ffffff')
    const border = ask('make all borders thicker than 2px', '--theme', 'studio')
    assert.deepEqual(border.commands, ['syntrofic theme editor set studio --sy-border-width 3px'])
    assert.deepEqual(ask('--list').kinds, ['parts', 'groups', 'dials', 'tokens', 'properties'])
    assert.ok(ask('border', '--list=properties').properties.some(entry => entry.property === 'border-radius' && entry.parts.includes('card')))
    const { tokens, tokenDetails } = ask('--list=tokens', '--sy-accent')
    assert.ok(tokens.length > 0 && tokens.every(token => token.includes('accent')))
    assert.ok(tokenDetails['--sy-accent'].partCount > 0)
    assert.equal(tokenDetails['--sy-accent'].default.light, studio.modes.light.accent)
    const buttonParts = ask('--list', 'Part', 'button').targets
    assert.ok(buttonParts.some(target => target.part === 'button'))
    assert.ok(buttonParts.some(target => target.part === 'dialog-header-close-icon'))
    assert.ok(buttonParts.every(target => [target.part, target.selector, ...target.components]
      .some(value => value.toLowerCase().includes('button'))))
    assert.ok(ask().usage.includes('[part, property'))
    const card = ask('CARDS').lookups[0]
    assert.equal(card.part, 'card')
    assert.ok(card.components.includes('SCard'))
    assert.ok(card.aspects.corners.tokens.includes('--sy-radius-lg'))
    assert.ok(card.scope.includes('--when variant:muted'))
    assert.ok(card.scope.includes('--state hover'))
    assert.deepEqual(ask('卡片').lookups[0].aspects, card.aspects)
    const inputs = ask('Inputs').lookups[0]
    assert.equal(inputs.group, 'inputs')
    assert.ok(inputs.shared.includes('select'))
    assert.equal(inputs.separate, '--only')
    const borderRadius = ask('border-radius').lookups[0]
    assert.ok(borderRadius.parts.includes('card'))
    assert.ok(ask('what does background-color do').lookups[0].parts.includes('button'))
    assert.ok(ask('spacing').lookups[0].tokens.includes('--sy-space-2'))
    const duplicate = spawnSync(process.execPath, [cli, 'theme', 'editor', 'how', 'what does --sy-accent do', '--theme', 'studio', '--theme', 'review'],
      { cwd: directory, encoding: 'utf8' })
    assert.equal(duplicate.status, 1)
    assert.match(duplicate.stderr, /Use --theme once/)
    const empty = spawnSync(process.execPath, [cli, 'theme', 'editor', 'how', 'colors', '--theme='],
      { cwd: directory, encoding: 'utf8' })
    assert.equal(empty.status, 1)
    assert.match(empty.stderr, /^ERR_INVALID_ARGUMENT:/)
  }, { version: 1, themes: [studio, review], active: 'studio', lastEdited: 'review' })
})

test('how reads motion settings and proposes edits with the theme scope', async () => {
  await project(ask => {
    assert.equal(ask('motion-tempo').lookups[0].value, 1)
    assert.equal(ask('--sy-motion-tempo').lookups[0].values.light, '1')
    assert.equal(ask('motion-tempo', '--list=tokens').tokenDetails['--sy-motion-tempo'].type, 'number')
    assert.equal(ask('reduced-motion').lookups[0].value, 'system')
    assert.deepEqual(ask('让动画更快').commands, ['syntrofic theme editor set studio motion-tempo less'])
    assert.deepEqual(ask('set motion tempo to 1.15').commands, ['syntrofic theme editor set studio motion-tempo 1.15'])
    assert.deepEqual(ask('把减少动效设为始终').commands, ['syntrofic theme editor set studio reduced-motion always'])
    assert.deepEqual(ask('set motion character to crisp').commands, ['syntrofic theme editor set studio motion-character crisp'])
    const palette = ask('colors', '--theme', 'studio')
    assert.equal(palette.tokens['--sy-canvas'].light, '#ffffff')
    assert.ok(palette.families.includes('accent'))
  })
})

test('how analyzes status color separation and keeps requested edits distinct from suggested repairs', async () => {
  const studio = createBrandTheme('studio', 'Studio')
  const theme = applyBrandPatch(studio, { revision: studio.revision, changes: [
    { type: 'color', mode: 'light', key: 'success', value: '#596534' },
    { type: 'color', mode: 'light', key: 'warning', value: '#596534' },
  ] })
  await project(async (ask, directory) => {
    const english = ask('are the statuses color-blind safe?', '--mode', 'light')
    const chinese = ask('检查红绿色觉差异下的状态色', '--mode', 'light')
    assert.deepEqual(chinese.statusVision, english.statusVision)
    assert.deepEqual(Object.keys(english.statusVision.modes), ['light'])
    const { colors, simulated, issues } = english.statusVision.modes.light
    const similar = issues.find(issue => issue.pair.join() === 'success,warning')
    assert.equal(colors.warning, colors.success)
    assert.notEqual(simulated.protanopia.warning, colors.warning)
    assert.equal(simulated.protanopia.warning, simulated.protanopia.success)
    assert.equal(similar.matches.length, 4)
    assert.ok(similar.matches.every(match => match.distance === 0))
    assert.ok(similar.repair.canvasContrast >= 3 && similar.repair.textContrast >= 4.5)
    assert.match(similar.repair.command, /theme editor set studio --sy-(success|warning) '#[\da-f]{6}' --mode light/)
    assert.equal(english.commands, undefined)
    const combined = ask('set warning to #806f2f for color-blind users', '--mode', 'light')
    assert.deepEqual(combined.commands, ["syntrofic theme editor set studio --sy-warning '#806f2f' --mode light"])
    assert.deepEqual(combined.statusVision, english.statusVision)
    const relative = ask('warnings darker for color-blind users', '--mode', 'light')
    assert.deepEqual(relative.commands, ["syntrofic theme editor set studio --sy-warning '#4e592e' --mode light"])
    assert.equal(ask('make it protanopia friendly').statusVision.theme, 'studio')
    const themes = join(directory, 'themes')
    await mkdir(join(themes, 'studio'), { recursive: true })
    try {
      await writeFile(join(themes, 'studio', 'studio.theme.ts'), "export default { modes: { light: { success: '#296d20', warning: '#775e00' } } }")
      const authored = ask('status colors', '--mode', 'light').statusVision.modes.light
      const clash = authored.issues.find(issue => issue.pair.join() === 'success,warning')
      assert.notEqual(authored.colors.success, authored.colors.warning)
      assert.ok(clash.matches.some(match => match.vision === 'deuteranopia' && match.distance > 0 && match.distance < .06))
      assert.equal(clash.repair, undefined)
    } finally { await rm(themes, { recursive: true, force: true }) }
  }, { version: 1, themes: [theme], active: 'studio', editable: ['studio'] })
})

test('how validates a bilingual editing sequence with explicit values, variants and modes', withBrowser, async () => {
  await project(ask => {
    const result = ask('深色模式，次要按钮悬停时的底色设为 rgba(20, 30, 40, 0.6)，卡片底色设为 #1c1c1e')
    assert.ok(result.sequence)
    assert.deepEqual(result.commands, [
      "syntrofic theme editor set studio background-color 'rgba(20, 30, 40, 0.6)' --on button --when variant:secondary --state hover --mode dark",
      "syntrofic theme editor set studio background-color '#1c1c1e' --on card --mode dark",
    ])
    assert.ok(result.steps.every(step => step.validation === 'rendered'))
    const read = ask('what is the padding of primary medium buttons in light mode', '--theme', 'studio')
    assert.equal(read.lookups[0].readings[0].values[0].value, '0px 16px')
    assert.equal(read.lookups[0].readings[0].values[0].when.variant, 'primary')
    assert.equal(read.lookups[0].readings[0].mode, 'light')
    const exact = ask('set input placeholder color to #234567')
    assert.deepEqual(exact.commands, ["syntrofic theme editor set studio --sy-field-placeholder-color '#234567' --on input --only"])
    assert.equal(exact.steps[0].validation, 'rendered')
    const prefix = ask('把输入框前缀文字颜色设为 #6b3045')
    assert.deepEqual(prefix.commands, ["syntrofic theme editor set studio --sy-input-group-prefix-color '#6b3045' --on input-group"])
    assert.equal(prefix.steps[0].validation, 'rendered')
    const gradient = ask('set card background to linear-gradient(#ffffff, #eeeeee), linear-gradient(#ffffff, #dddddd)')
    assert.deepEqual(gradient.commands, ["syntrofic theme editor set studio background 'linear-gradient(#ffffff, #eeeeee), linear-gradient(#ffffff, #dddddd)' --on card"])
  })
})

test('how uses computed comparisons, preserves the white canvas and distinguishes conflicts from sequences', withBrowser, async () => {
  await project(ask => {
    const compared = ask('make primary buttons as round as cards; card padding 2 steps more')
    assert.equal(compared.refused.length, 0)
    assert.match(compared.commands[0], /border-radius '[\d.]+px \/ [\d.]+px' --on button --when variant:primary/)
    assert.equal(compared.commands[1], 'syntrofic theme editor set studio padding 4px --on card')
    const brighter = ask('make card background lighter')
    assert.equal(brighter.steps[0].value, '#f9f9f9')
    assert.equal(brighter.steps[0].validation, 'rendered')
    assert.ok(brighter.commands[0].endsWith('--on card --mode light'))
    const canvas = ask('把官网默认底色改成白色')
    assert.equal(canvas.steps[0].scope.mode, 'light')
    assert.equal(canvas.steps[0].status, 'already-applied-or-overridden')
    assert.equal(canvas.commands, undefined)
    const conflict = ask('card radius 8px; card radius 10px')
    assert.equal(conflict.commands, undefined)
    assert.deepEqual(conflict.alternatives[0].choices.map(choice => choice.value), ['8px', '10px'])
    const ordered = ask('card radius 8px, then card radius 10px')
    assert.deepEqual(ordered.commands, ['syntrofic theme editor set studio border-radius 10px --on card'])
    const invalid = ask('card background #ggg blue; card radius 8px')
    assert.equal(invalid.commands, undefined)
    assert.match(invalid.refused[0].reason, /Invalid hexadecimal color #ggg/)
    assert.equal(invalid.steps[0].property, 'border-radius')
    const mode = ask('in dark mode, set card radius to 8px')
    assert.equal(mode.commands, undefined)
    assert.match(mode.refused[0].reason, /mode-specific|Mode-specific|Use --mode/)
  })
})

test('how proposes a local theme before edits when the registry is empty', withBrowser, async () => {
  await project(ask => {
    const result = ask('cards: 8px radius; buttons: 4px')
    assert.deepEqual(result.commands, ['syntrofic theme editor new my-theme', 'syntrofic theme editor set my-theme border-radius 8px --on card',
      'syntrofic theme editor set my-theme border-radius 4px --on button'])
  }, { version: 1, themes: [], active: null })
})

test('a text color restriction follows the text token and changes only the affected appearance', async () => {
  const base = createBrandTheme('studio', 'Studio')
  const theme = applyBrandPatch(base, { revision: base.revision, changes: [
    { type: 'color', key: 'text', mode: 'light', value: '#000' },
    { type: 'color', key: 'text-muted', mode: 'dark', value: '#fff' },
  ] })
  await project(ask => {
    const combined = ask('white page, never use pure black for text')
    assert.deepEqual(combined.commands, ["syntrofic theme editor set studio --sy-text '#252525' --mode light"])
    assert.equal(combined.steps[0].property, '--sy-canvas')
    assert.equal(combined.steps[0].status, 'already-applied-or-overridden')
    assert.equal(combined.constraints[0].status, 'adjusted')
    assert.deepEqual(ask('不要用纯黑作为文字颜色').commands, combined.commands)

    const darkOnly = ask('never use pure black for text in dark mode.')
    assert.equal(darkOnly.constraints[0].status, 'satisfied')
    assert.equal(darkOnly.commands, undefined)
    const muted = ask('never use #fff for muted text in dark mode')
    assert.match(muted.commands[0], /--sy-text-muted '#[0-9a-f]{6}' --mode dark$/)
    assert.notEqual(muted.steps[0].value, '#ffffff')

    const requested = ask('text #172b4d, never use pure black for text')
    assert.deepEqual(requested.commands, ["syntrofic theme editor set studio --sy-text '#172b4d'"])
    assert.equal(requested.constraints[0].status, 'satisfied')
    const conflict = ask('set text to #000; never use pure black for text')
    assert.equal(conflict.commands, undefined)
    assert.match(conflict.refused[0].reason, /conflicts with a text color restriction/)
  }, { version: 1, themes: [theme], active: theme.id })
})
