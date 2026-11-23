import { lstat, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { emitFiles } from './scaffold.mjs'
import { projectConfig } from './project-config.mjs'
import { previewCapabilities, refreshThemePreviewRoute, themePreviewApp, themePreviewCommand } from './theme-preview.mjs'
import { editorDials, editorInitialDials, editorMotionSettings, shadowSettings, themeConditions, themeEditorChange, themeEditorCommand, themeEditorEntry, themeEditorGroups, themeEditorGroupScopes, themeEditorModes, themeEditorProperty, themeEditorReport, themeEditorTokenNames, themeEditorUndo, themePaginationFrames, themeTargets, themeTokenDetails, validateThemeEditorMode } from './theme-editor.mjs'
import { themeEditorPalette } from './theme-editor-palette.mjs'
import { installedThemes } from './theme-sources.mjs'
import { projectAt, readJSON } from './project-discovery.mjs'
import { resolveThemeFonts } from './theme-fonts.mjs'
import { statusColorAdjustments, statusVisionAudit, statusVisionRequest } from './theme-status-vision.mjs'

const registryName = 'syntrofic.themes.json'
const ownPackage = '@syntrofic/ui'
const slug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value)
const themeNames = { morandi: 'Syntrofic', slate: 'Slate', mist: 'Mist', clay: 'Clay', neutral: 'Neutral', stone: 'Stone',
  matcha: 'Matcha', chocolate: 'Chocolate', butter: 'Butter', gothic: 'Gothic', y2k: 'Y2K' }
const editorCommands = [
  'editor how [filter] [count]', 'editor new <id>',
  'editor show [id] [--on <part-or-group> [--when <condition>] [--state <state>] [--mode <mode>]]',
  'editor set <id> <setting> <value> [--except <part>]', 'editor undo [id] [setting] [--except <part>]',
]
export const themeCapabilities = [
  'list', 'add <id>', 'eject [id] [path]', 'template [id] [path]', 'use <id>', 'build [id] [path]', 'compile [id] [path]',
  'remove <id>', 'targets [filter]', 'palette generate <config>', ...editorCommands,
  ...previewCapabilities,
]

const { read: readRegistry, update: updateRegistry } = projectConfig(registryName,
  () => ({ version: 1, active: null, themes: [] }), state => state?.version === 1 && Array.isArray(state.themes))

const editorError = (code, message, cause) => Object.assign(new Error(message, { cause }), { code })

export function validatedTheme(input, library) {
  if (!input || input.version !== 1 || !slug(input.id) || typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('Expected a Syntrofic theme manifest with version, id and name')
  }
  return library.defineBrandTheme(input)
}

export async function editorSource(directory, theme, library, observe) {
  const path = resolve(directory, 'themes', theme.id, theme.id + '.theme.ts')
  observe?.(path)
  try {
    if (!(await lstat(path)).isFile()) throw new Error('Theme source must be a regular file: ' + path)
  } catch (error) {
    if (error.code === 'ENOENT') return { theme }
    throw editorError('ERR_THEME_INVALID', error.message, error)
  }
  try {
    const { readThemeDescriptor } = await import('./theme-descriptor.mjs')
    const source = await readThemeDescriptor(path, { root: directory, observe })
    if (!source || typeof source !== 'object' || Array.isArray(source) || source.id && source.id !== theme.id) {
      throw new Error('Choose a theme definition with the same identifier: ' + theme.id)
    }
    const rules = theme.inheritedRules && source.rules ? Object.fromEntries(Object.entries(source.rules).map(([key, rule]) => [key, {
      ...rule, authored: Object.fromEntries(Object.keys(rule.declarations ?? {}).map(property => [property, true])),
    }])) : source.rules
    const overrides = { ...source, rules, id: theme.id, name: source.name ?? theme.name, base: theme, revision: theme.revision }
    return { theme: library.defineBrandTheme(overrides), source: path }
  } catch (error) {
    throw editorError('ERR_THEME_INVALID', error.message, error)
  }
}

function palette(value) {
  if (!/^#[\da-f]{6}$/i.test(value ?? '')) throw new Error('Specify a hexadecimal color, for example #425849')
  const base = value.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16))
  const weights = { 50: -.95, 100: -.86, 200: -.72, 300: -.54, 400: -.29, 500: 0, 600: .13, 700: .27, 800: .43, 900: .58, 950: .73 }
  return Object.fromEntries(Object.entries(weights).map(([step, weight]) => {
    const boundary = weight < 0 ? 255 : 0
    const channels = base.map(channel => Math.round(channel + (boundary - channel) * Math.abs(weight)).toString(16).padStart(2, '0'))
    return [step, '#' + channels.join('')]
  }))
}

export async function themeCommand(directory, [action = 'list', id, output, ...extra], options) {
  if (options.except?.length && (action !== 'editor' || !['set', 'undo'].includes(id))) {
    throw editorError('ERR_INVALID_ARGUMENT', 'Use --except with theme editor set or undo.')
  }
  let picture
  if (action === 'editor' && id === 'how') {
    if (options.theme !== undefined && !options.theme.trim()) {
      throw editorError('ERR_INVALID_ARGUMENT', 'Choose a nonempty theme name with --theme.')
    }
    const { inspectThemePicture } = await import('./theme-picture-analysis.mjs')
    picture = await inspectThemePicture(directory, output, extra, options)
    if (picture && options.theme === undefined) return picture
  }
  if (action === 'editor') {
    const project = await projectAt(directory)
    directory = project.directory
    if (['set', 'show'].includes(id) && !Object.keys(project.manifest).length &&
        !await readJSON(resolve(directory, 'package.json')) && !await readJSON(resolve(directory, registryName))) {
      throw editorError('ERR_PROJECT_REQUIRED', 'Run the editor in an app project or create a local theme with theme editor new.')
    }
  }
  if (action === 'preview' && id !== 'app') return themePreviewCommand(directory, [id, output, ...extra], options)
  if (action === 'palette') {
    if (!id) return { actions: ['generate <config>'], example: 'syntrofic theme palette generate palette.config.json' }
    if (id === 'generate') {
      const input = output ?? options.seed
      if (!input || input.startsWith('#')) return palette(input)
      const { generateThemePalette } = await import('./theme-palette.mjs')
      return generateThemePalette(directory, input, options)
    }
    throw new Error('Unknown palette action: ' + id)
  }
  if (action === 'help') {
    return { actions: themeCapabilities,
      preview: 'Import the generated theme.css and set data-sy-brand and data-sy-theme on the preview container.' }
  }
  if (action === 'editor' && !id) return { actions: editorCommands, dials: editorDials }
  if (action === 'add' && ((!id && !options.source) || options.list)) return themeCommand(directory, ['list'], options)
  if (action === 'list') {
    const { active, themes, owners = {} } = await readRegistry(directory)
    const added = new Set(themes.map(theme => theme.id))
    const builtIns = Object.entries(themeNames).map(([id, name]) => ({ id, name, source: 'built-in', owner: ownPackage,
      installed: true, added: owners[id] === ownPackage && added.has(id), default: active === id && (!owners[id] || owners[id] === ownPackage) }))
    const external = options.package === ownPackage ? [] : await installedThemes(directory, options.package)
    const extensions = external.map(({ id, name, source, owner, version }) => ({ id, name, source, owner, version, installed: true,
      added: added.has(id) && owners[id] === owner, default: active === id && owners[id] === owner }))
    const local = themes.filter(theme => !owners[theme.id]).map(({ id, name }) => ({
      id, name, source: 'local', installed: true, added: true, default: active === id,
    }))
    const entries = [...builtIns, ...extensions, ...local].filter(theme => !options.package || theme.owner === options.package)
    return { active, themes: entries }
  }
  const library = await import('@syntrofic/ui')
  const builtIns = new Set(['morandi', 'slate', 'mist', 'clay', ...library.standardBrandPresets])
  const read = (state, key) => {
    const theme = state.themes.find(item => item.id === key)
    if (theme) return validatedTheme(theme, library)
    if (builtIns.has(key)) return library.createBrandTheme(key, themeNames[key], key)
    throw editorError('ERR_UNKNOWN_THEME', 'Unknown theme: ' + (key ?? '(choose one with theme use)'))
  }
  const editorBase = (state, theme, reference = theme.id) => {
    if (Object.hasOwn(state.themeBases ?? {}, reference)) return validatedTheme(state.themeBases[reference], library)
    const preset = theme.design?.base
    const base = builtIns.has(preset) ? preset : 'morandi'
    return { ...library.createBrandTheme(base, themeNames[base], base), rules: theme.inheritedRules }
  }
  const repairOptions = (registered, editable) => ({ registered, writable: !builtIns.has(registered.id),
    effective: async trial => editable ? (await editorSource(directory, trial, library)).theme : trial })
  async function inspectStatusVision(theme, registered, editable, mode) {
    validateThemeEditorMode(theme, mode)
    const modes = mode ? [mode] : themeEditorModes(theme)
    const tokens = Object.fromEntries(modes.map(mode => [mode, library.resolveThemeTokens(theme, { mode })]))
    const report = statusVisionAudit(tokens, modes)
    const { writable, effective } = repairOptions(registered, editable)
    if (!writable) return report
    for (const [mode, sample] of Object.entries(report.modes)) {
      const observed = [...Object.keys(sample.colors).flatMap(tone => [`--sy-${tone}`, `--sy-${tone}-soft`]), '--sy-canvas', '--sy-danger-on']
      const overridden = new Set()
      for (const issue of sample.issues) {
        for (const edit of statusColorAdjustments(library, tokens[mode], issue, sample.issues)) {
          if (overridden.has(edit.token)) continue
          const changes = themeEditorChange(library, registered, edit.token, edit.value, { mode })
          const trial = await effective(library.applyBrandPatch(registered, { revision: registered.revision, changes }))
          const resolved = library.resolveThemeTokens(trial, { mode })
          if (resolved[edit.token] !== edit.value) { overridden.add(edit.token); continue }
          if (observed.some(token => token !== edit.token && tokens[mode][token] !== resolved[token])) continue
          issue.repair = { ...edit, validation: 'resolved-tokens', command: themeEditorCommand(['set', registered.id, edit.token, edit.value, '--mode', mode]) }
          break
        }
      }
    }
    return report
  }
  const inspectReach = async (report, base, registered, editable, scope = {}) => {
    const { themePaintCoverage } = await import('./theme-paint-coverage.mjs')
    return themePaintCoverage(directory, library, report, base, { ...scope, ...repairOptions(registered, editable) })
  }
  const inspectNavigation = async (report, fonts, registered, editable) => {
    const { themeNavigationReport } = await import('./theme-navigation-report.mjs')
    return themeNavigationReport(directory, library, report, fonts, repairOptions(registered, editable))
  }
  async function resolveReference(state, key) {
    const { isThemeSource, readThemeDescriptor } = await import('./theme-descriptor.mjs')
    if (isThemeSource(key)) {
      try {
        const actual = await realpath(resolve(directory, key))
        let parent
        const theme = validatedTheme(await readThemeDescriptor(actual, { root: directory,
          inherit: (child, source) => { if (child === actual) parent = source } }), library)
        return { theme, ...(parent && { base: validatedTheme(await readThemeDescriptor(parent, { root: directory }), library) }) }
      } catch (error) {
        throw editorError(error.code === 'ENOENT' ? 'ERR_UNKNOWN_THEME' : 'ERR_THEME_INVALID', error.message, error)
      }
    }
    const registered = state.themes.find(item => item.id === key)
    const owner = state.owners?.[key]
    if (registered && (!options.package || options.package === owner)) return { theme: validatedTheme(registered, library), owner }
    const candidates = options.package === ownPackage ? [] : (await installedThemes(directory, options.package)).filter(item => item.id === key)
    const preset = builtIns.has(key) && (!options.package || options.package === ownPackage)
    if (candidates.length + Number(preset) > 1) throw editorError('ERR_AMBIGUOUS_THEME', 'Multiple packages provide ' + key + '. Choose one with --package.')
    if (candidates[0]) return { theme: validatedTheme(candidates[0].theme, library), owner: candidates[0].owner }
    if (preset) return { theme: read({ themes: [] }, key), owner: ownPackage }
    throw editorError('ERR_UNKNOWN_THEME', 'Unknown theme: ' + key)
  }
  if (action === 'preview' && id === 'app') {
    if (extra.length) throw new Error('The preview app takes one directory')
    const theme = options.theme ? read(await readRegistry(directory), options.theme) : library.createStandardBrandTheme('neutral')
    return themePreviewApp(directory, output, options, theme)
  }
  if (action === 'targets') return themeTargets(library, [id, output, ...extra].filter(Boolean).join(' '))
  if (action === 'editor' && id === 'how') {
    if (picture) {
      const state = await readRegistry(directory)
      const theme = read(state, options.theme)
      picture.theme = theme.id
      if (!picture.measurements) return picture
      if (builtIns.has(theme.id)) return { ...picture, themeStatus: 'built-in' }
      const editable = state.editable?.includes(theme.id)
      const prior = editable ? (await editorSource(directory, theme, library)).theme : theme
      for (const trait of picture.measurements.traits) {
        if (!trait.setting) continue
        const { property, value, on, only } = trait.setting
        const scope = { on, only }
        try {
          const edits = themeEditorChange(library, theme, property, value, scope)
          const result = library.applyBrandPatch(theme, { revision: theme.revision, changes: edits })
          const next = editable ? (await editorSource(directory, result, library)).theme : result
          if (!themeEditorEntry(property, scope, prior, next, edits).fields.length) {
            trait.setting = { ...trait.setting, status: 'already-applied-or-overridden' }
            continue
          }
          const words = ['set', theme.id, property, value, '--on', on, ...(only ? ['--only'] : [])]
          trait.setting = { ...trait.setting, validation: 'theme-configuration', command: themeEditorCommand(words) }
        } catch (error) {
          trait.setting = { ...trait.setting, status: 'unsupported', reason: error.message }
        }
      }
      return picture
    }
    const subject = [output, ...extra].filter(Boolean).join(' ').trim()
    if (!options.list && /^(?:repairs|missed)$/i.test(subject)) {
      const state = await readRegistry(directory)
      const registered = read(state, options.theme ?? state.active ?? 'morandi')
      const editable = state.editable?.includes(registered.id)
      const source = editable ? await editorSource(directory, registered, library) : { theme: registered }
      const base = editorBase(state, source.theme)
      const report = themeEditorReport(library, source.theme, state.history?.[registered.id], source.source ? registered : undefined, base)
      const [reach, layout] = await Promise.all([
        inspectReach(report, base, registered, editable),
        resolveThemeFonts(directory, [source.theme]).then(fonts => inspectNavigation(report, fonts, registered, editable)),
      ])
      return { theme: registered.id, base: base.id, status: reach.missedError ? 'verification-failed' : reach.paintCoverage.status,
        ...(layout && { layoutIssues: report.layoutIssues, ...layout }),
        ...(reach.missed && { missed: reach.missed }), ...(reach.renderedContrast && { renderedContrast: reach.renderedContrast,
          contrastRepairs: reach.contrastRepairs }), ...((reach.missedError ?? reach.paintCoverage.message) && {
          message: reach.missedError ?? reach.paintCoverage.message,
        }) }
    }
    if (subject && !options.list) {
      const { parseThemeQuestion, answerThemeQuestion } = await import('./theme-question.mjs')
      const vision = statusVisionRequest(subject)
      const name = subject.toLowerCase()
      const token = '--sy-' + name.replace(/^sy-/, '')
      const exact = /^[a-z][\w-]*$/.test(name) && Object.hasOwn(library.resolveThemeTokens(), token)
      const query = Object.hasOwn(editorMotionSettings(), name) ? 'what is the ' + name.replaceAll('-', ' ') : subject
      const plan = vision && !vision.edits ? undefined : parseThemeQuestion(library, vision?.edits ?? (exact ? token : query), options)
      if (plan || vision) {
        const state = await readRegistry(directory)
        const edits = plan?.actions.some(action => action.kind !== 'lookup' && action.kind !== 'restore') || plan?.constraints.some(guard => guard.kind === 'text-color')
        const local = state.themes.filter(theme => !builtIns.has(theme.id))
        const lastEdited = local.find(theme => theme.id === state.lastEdited)
        const active = local.find(theme => theme.id === state.active)
        const picked = options.theme ?? (local.length === 1 ? local[0].id : lastEdited?.id ?? active?.id)
        if (picked === undefined && local.length > 1) {
          throw editorError('ERR_AMBIGUOUS_THEME', 'Choose the local theme with --theme. Available: ' + local.map(theme => theme.id).join(', '))
        }
        const createFrom = picked === undefined && edits ? 'morandi' : undefined
        const theme = createFrom ? library.createBrandTheme('my-theme', 'My Theme', createFrom)
          : read(state, picked ?? state.active ?? 'morandi')
        const editable = state.editable?.includes(theme.id)
        const themeChosenBy = options.theme !== undefined ? 'named' : local.length === 1 ? 'only' : lastEdited ? 'last-changed' : active ? 'active' : 'default'
        const { effective } = repairOptions(theme, editable)
        const answer = plan ? await answerThemeQuestion(library, directory, theme, plan, {
          effective,
          themeChosenBy, createFrom, builtIn: builtIns.has(theme.id), history: state.history?.[theme.id],
        }) : undefined
        if (!vision) return answer
        const saved = createFrom ? read(state, state.active ?? 'morandi') : theme
        const savedEditable = state.editable?.includes(saved.id)
        const source = savedEditable ? (await editorSource(directory, saved, library)).theme : saved
        return { theme: theme.id, themeChosenBy, ...answer, request: subject,
          ...(vision.edits && !answer && { refused: [{ clause: vision.edits, reason: 'Name a supported theme setting and the requested change.' }] }),
          statusVision: { theme: saved.id, ...await inspectStatusVision(source, saved, savedEditable, options.mode) } }
      }
    }
    const filter = subject.toLowerCase()
    const registry = options.theme !== undefined ? await readRegistry(directory) : undefined
    const registered = registry && read(registry, options.theme)
    const theme = registered && registry.editable?.includes(registered.id) ? (await editorSource(directory, registered, library)).theme : registered
    const light = library.resolveThemeTokens(theme, { mode: 'light' })
    const dark = library.resolveThemeTokens(theme, { mode: 'dark' })
    const groups = themeEditorGroups(library)
    const keys = [...new Set([...Object.keys(light), ...Object.keys(dark)])]
    const entries = names => theme ? Object.fromEntries(names.map(token => [token, { light: light[token], dark: dark[token] }])) : names
    if (!options.list && /^(?:colors?|palette)$/.test(filter)) return {
      ...(theme && { theme: theme.id, ...themeEditorPalette(library, theme) }),
      families: library.brandPaletteFamilies,
      vibrancy: { value: theme?.design?.palette?.vibrancy ?? 50, range: [0, 100] },
      tokens: Object.fromEntries(library.brandColors.map(color => {
        const token = '--sy-' + color
        return [token, { light: light[token], dark: dark[token] }]
      })),
      recipe: 'One seed per family generates light and dark shades using the theme palette generator.',
      contrast: 'Text is moved to a readable shade when necessary.',
      exact: 'An exact color token takes precedence over a generated shade in the selected mode.',
      preview: theme ? themeEditorCommand(['show', theme.id, '--section', 'colors']) : 'syntrofic theme editor show --section colors',
    }
    if (options.list) {
      const synonyms = { kinds: 'kinds', kind: 'kinds', parts: 'parts', part: 'parts', groups: 'groups', group: 'groups',
        types: 'kinds', dials: 'dials', dial: 'dials', tokens: 'tokens', token: 'tokens', properties: 'properties', property: 'properties' }
      const kinds = ['parts', 'groups', 'dials', 'tokens', 'properties']
      const terms = filter.split(/\s+/).filter(Boolean)
      const index = terms.findIndex(term => Object.hasOwn(synonyms, term))
      const type = index === -1 ? (terms.length ? undefined : 'kinds') : synonyms[terms.splice(index, 1)[0]]
      const matches = value => terms.every(term => value.includes(term.replace(/^(?:token:)?--/, '')))
      if (type === 'kinds') return { kinds }
      if (type === 'parts') return { targets: themeTargets(library, terms.join(' ')) }
      if (type === 'groups') return { groups: Object.fromEntries(Object.entries(groups).filter(([name, parts]) => matches([name, ...parts].join(' ')))) }
      if (type === 'dials') return { dials: Object.fromEntries(Object.entries(editorDials).filter(([name]) => matches(name))) }
      if (type === 'tokens') {
        const names = [...new Set([...keys, ...themeEditorTokenNames(library)])].filter(matches)
        const tokenDetails = await themeTokenDetails(library, names, theme)
        const tokens = theme ? Object.fromEntries(names.map(name => [name, tokenDetails[name].values])) : names
        return { tokens, tokenDetails }
      }
      if (type === 'properties') {
        const index = new Map()
        for (const [part, target] of Object.entries(library.brandRuleTargets)) for (const property of Object.keys(target.properties)) {
          if (!matches(property)) continue
          const parts = index.get(property) ?? []
          parts.push(part)
          index.set(property, parts)
        }
        return { properties: [...index].sort(([a], [b]) => a.localeCompare(b)).map(([property, parts]) => ({ property, parts })) }
      }
      throw editorError('ERR_INVALID_ARGUMENT', 'List parts, groups, dials, tokens or properties.')
    }
    const examples = [
      'syntrofic theme editor how card', 'syntrofic theme editor how border-radius', 'syntrofic theme editor how spacing',
      'syntrofic theme editor how repairs --theme studio',
      'syntrofic theme editor how "are the status colors color-blind safe?" --theme studio',
      'syntrofic theme editor how --list parts', 'syntrofic theme editor how screenshot.png --at "40,20;300,180"',
      'syntrofic theme editor how "make everything more compact"',
      'syntrofic theme editor how "card padding 2 steps more"',
      'syntrofic theme editor how "make primary buttons as round as cards"',
      'syntrofic theme editor how "make everything rounder except inputs"',
      'syntrofic theme editor how "remove shadows from cards; buttons: 8px radius" --theme studio',
      'syntrofic theme editor how "ghost buttons look like primary buttons" --theme studio',
      'syntrofic theme editor how "what is the padding of buttons" --theme studio',
    ]
    if (!filter) return { usage: 'syntrofic theme editor how [part, property, setting, question or PNG]', examples }
    const targets = themeTargets(library, filter)
    const tokens = keys.filter(token => token.includes(filter))
    return { targets, tokens: entries(tokens), dials: editorDials, groups,
      ...(theme && { theme: theme.id }), ...(!targets.length && !tokens.length
        && { hint: 'No matching part or token. Try --list parts or name a property and a component.',
          run: ['syntrofic theme editor how', 'syntrofic theme editor how --list parts'], examples }) }
  }
  const buildEditor = async (theme, fonts, stage) => {
    const { compileThemeArtifacts } = await import('./theme-artifacts.mjs')
    const buildOptions = { 'dry-run': options['dry-run'], fonts, stage }
    const main = await compileThemeArtifacts(directory, library, [theme], 'themes/' + theme.id, buildOptions)
    try { return { ...main, appCopy: await compileThemeArtifacts(directory, library, [theme], 'src/themes/' + theme.id, buildOptions) } }
    catch (error) {
      if (error.code !== 'ERR_FILE_EXISTS') throw error
      return { ...main, appCopyError: error.message }
    }
  }
  const stageFor = outputs => (folder, changes) => {
    for (const item of changes) outputs.push({ ...item, file: relative(directory, resolve(folder, item.file)) })
  }
  const editorArtifacts = async (report, { editable, sheet = false, invalidate = false, active, stage, registered = report.theme } = {}) => {
    const { writeEditorPreview } = await import('./theme-sheet.mjs')
    const fonts = await resolveThemeFonts(directory, [report.theme])
    let build
    let buildError
    if (editable) {
      try { build = await buildEditor(report.theme, fonts, stage) }
      catch (error) {
        if (sheet || stage) throw error
        buildError = error.message
      }
    }
    const artifacts = { ...(build && { build }), ...(buildError && { buildError }) }
    const appearance = report.theme.design?.appearance
    const directoryName = build?.appCopy ? 'src/themes/' + report.theme.id : 'themes/' + report.theme.id
    const wiring = editable && build ? {
      provider: 'SBrandTheme', module: directoryName + '/theme.mjs',
      ...(fonts.css && { stylesheet: directoryName + '/theme.css' }),
      mode: appearance === 'dark-only' ? 'dark' : appearance === 'light-only' ? 'light' : 'system',
      build: 'syntrofic experimental theme compile ' + report.theme.id,
    } : undefined
    try {
      const output = report.contrast ? report : { ...report, ...themeEditorReport(library, report.theme) }
      output.statusVision = await inspectStatusVision(report.theme, registered, editable)
      const layout = await inspectNavigation(output, fonts, registered, editable)
      let inAppPreview
      if (build?.appCopy) {
        try { inAppPreview = await refreshThemePreviewRoute(directory, report.theme.id, active ?? report.active, options['dry-run'], stage) }
        catch (error) { inAppPreview = { error: error.message } }
      }
      const preview = await writeEditorPreview(directory, library, { ...output, ...layout },
        { ...options, fontCss: fonts.css, previewOnly: !sheet && !options.png && !options.section, invalidatePictures: invalidate, stage })
      return { ...output, ...layout, ...artifacts, ...(fonts.notes.length && { fontNotes: fonts.notes }), ...(inAppPreview && { inAppPreview }),
        preview, ...(wiring && { wiring }) }
    } catch (error) { return { ...report, ...artifacts, previewError: error.message } }
  }
  const editorUpdate = async change => {
    try { return await updateRegistry(directory, options['dry-run'], change) }
    catch (error) {
      if (error.code === 'EEXIST' && error.path === resolve(directory, registryName + '.lock')) {
        throw editorError('ERR_THEME_BUSY', 'Another command is changing the project themes.', error)
      }
      throw error
    }
  }
  if (action === 'editor' && id === 'new') {
    if (builtIns.has(output)) throw new Error('Choose a unique name for an editable theme')
    const from = options.like
    const settings = [...(from === 'none' ? [['base', 'none']] : []),
      ...editorInitialDials.flatMap(key => options[key] === undefined ? [] : [[key, options[key]]])]
    let local
    if (from && from !== 'none' && (!builtIns.has(from) || options.package && options.package !== ownPackage)) {
      const state = await readRegistry(directory)
      const resolved = await resolveReference(state, from)
      const editingLocal = state.editable?.includes(from) && resolved.owner === state.owners?.[from]
      local = editingLocal ? (await editorSource(directory, resolved.theme, library)).theme : resolved.theme
    }
    const preset = from === 'none' || local ? 'morandi' : from ?? options.preset
    const copied = local && Object.fromEntries(Object.entries(library.resolveBrandThemeRules(local).rules ?? {})
      .map(([key, { authored, ...rule }]) => [key, rule]))
    const created = await themeCommand(directory, ['add', output], { ...options, ...(from && { package: undefined }), preset, settings, editable: true,
      afterCreate: report => editorArtifacts(report, { editable: true }),
      ...(local && { themeBase: local, themeInput: { ...local, id: output, name: options.name ?? output, revision: 0,
        rules: copied, inheritedRules: copied } }) })
    return options['dry-run'] ? editorArtifacts(created, { editable: true }) : created
  }
  if (action === 'editor' && id === 'show') {
    if (options.on !== undefined) {
      const parts = new Set(Array.isArray(options.on) ? options.on : [options.on])
      const [on] = parts
      if (parts.size !== 1 || options.png || options.section !== undefined || extra.length) {
        throw editorError('ERR_INVALID_ARGUMENT', 'Choose one part or group with --on and omit --png and --section. Use theme editor how --list parts.')
      }
      let scopes, group
      try {
        const { state, mode } = options
        const when = themeConditions(options.when)
        group = themeEditorGroupScopes(library, on, { when, state, mode })
        scopes = group ?? [{ ...library.normalizeBrandRule({ target: on, when, state: state === 'rest' ? undefined : state, mode, declarations: {} }),
          ...(state === 'rest' && { state }) }]
        if (!scopes.length) throw new Error('No part in ' + on + ' supports that scope')
      } catch (error) { throw editorError('ERR_INVALID_ARGUMENT', error.message, error) }
      const state = await readRegistry(directory)
      const key = output ?? state.active ?? 'morandi'
      const { theme, base: parent, owner } = await resolveReference(state, key)
      try { for (const scope of scopes) validateThemeEditorMode(theme, scope.mode, scope.target) }
      catch (error) { throw editorError('ERR_INVALID_ARGUMENT', error.message, error) }
      const base = parent ?? editorBase(state, theme, key)
      try {
        const { themePartReport } = await import('./theme-part-report.mjs')
        const reports = []
        for (const scope of scopes) {
          const part = scope.target
          const paginationFrames = part.startsWith('pagination') ? themePaginationFrames(library, theme).filter(frame =>
            (frame.requested === part || frame.part === part) && (!scope.mode || !frame.mode || frame.mode === scope.mode)
            && Object.entries(scope.when ?? {}).every(([key, value]) => !frame.when?.[key] || frame.when[key] === value)
            && (!scope.state || !frame.state || frame.state === scope.state)) : []
          reports.push({ ...await themePartReport(directory, library, theme, base, part, scope),
            ...(paginationFrames.length && { paginationFrames }) })
        }
        return { ...(group ? { theme: theme.id, name: theme.name, group: on, parts: reports } : reports[0]), ...(owner && { owner }) }
      } catch (error) {
        if (error.code === 'ERR_THEME_BROWSER_REQUIRED') throw error
        throw editorError('ERR_RENDER_FAILED', error.message, error)
      }
    }
    if (options.when || options.state || options.mode) throw editorError('ERR_INVALID_ARGUMENT', '--when, --state and --mode require --on when inspecting a theme.')
    const { validateThemeSection } = await import('./theme-sheet.mjs')
    validateThemeSection(options.section)
    return editorUpdate(async state => {
      const registered = read(state, output ?? state.active ?? 'morandi')
      const editable = state.editable?.includes(registered.id)
      const source = editable ? await editorSource(directory, registered, library) : { theme: registered }
      const base = editorBase(state, source.theme)
      const report = { ...themeEditorReport(library, source.theme, state.history?.[registered.id], source.source ? registered : undefined, base),
        ...(source.source && { source: source.source }) }
      if (!options['dry-run']) Object.assign(report, await inspectReach(report, base, registered, editable))
      const outputs = []
      const result = await editorArtifacts(report, { registered, editable, sheet: true, invalidate: true, active: state.active,
        stage: stageFor(outputs) })
      if (result.previewError) throw editorError('ERR_RENDER_FAILED', result.previewError)
      return { result, outputs }
    })
  }
  if (action === 'editor' && (id === 'set' || id === 'undo')) {
    const { validateThemeSection } = await import('./theme-sheet.mjs')
    validateThemeSection(options.section)
    return editorUpdate(async state => {
      const theme = read(state, output ?? state.active ?? 'morandi')
      if (builtIns.has(theme.id)) throw new Error('Create a local theme before editing the preset')
      const notes = [...(state.history?.[theme.id] ?? [])]
      const editable = state.editable?.includes(theme.id)
      const [thing, ...words] = extra
      let result
      let undone
      let rules
      let edits
      let appearanceCopy
      let preservation
      const padding = []
      if (id === 'undo') {
        if (thing) {
          const heading = thing === 'headings' && words.length === 1
            ? { weight: 'headingWeight', tracking: 'headingTracking' }[words[0]] : undefined
          const reverted = themeEditorUndo(library, theme, notes, thing, { ...options, heading, expected: words.length && !heading ? words.join(' ') : undefined })
          result = { ...validatedTheme(reverted.theme, library), revision: theme.revision + 1 }
          notes.push({ label: 'Undo ' + thing, revision: result.revision, theme, fields: reverted.fields })
          undone = { setting: thing, restored: reverted.applied }
        } else {
          const previous = notes.pop()
          if (!previous) throw new Error('No earlier changes for ' + theme.id)
          result = { ...validatedTheme(previous.theme, library), revision: theme.revision + 1 }
          undone = { setting: previous.label }
        }
      } else {
        const value = words.join(' ')
        try {
          if (options.mode) {
            const current = editable ? (await editorSource(directory, theme, library)).theme : theme
            validateThemeEditorMode(current, options.mode, options.on)
          }
          if (thing === 'copy-style') {
            if (options.except?.length) throw new Error('Use --when to select the destination of a whole variant copy.')
            const { planThemeVariantCopy } = await import('./theme-variant-copy.mjs')
            const copy = await planThemeVariantCopy(library, directory, theme, value, options,
              async theme => editable ? (await editorSource(directory, theme, library)).theme : theme)
            edits = copy.edits
            result = copy.result
            appearanceCopy = copy.match
          } else if (options.except?.length) {
            const { planThemeExceptions } = await import('./theme-exceptions.mjs')
            const planned = await planThemeExceptions(library, directory, theme, thing, value, options,
              async theme => editable ? (await editorSource(directory, theme, library)).theme : theme)
            edits = planned.edits
            result = planned.result
            preservation = planned.preservation
          } else if (shadowSettings.includes(thing)) {
            const { themeShadowEdits } = await import('./theme-shadows.mjs')
            const planned = await themeShadowEdits(library, directory, theme, thing, value, options,
              async theme => editable ? (await editorSource(directory, theme, library)).theme : theme)
            edits = planned.edits
            result = planned.result
          } else {
            const current = editable && Object.hasOwn(editorMotionSettings(theme), thing)
              ? (await editorSource(directory, theme, library)).theme : theme
            edits = themeEditorChange(library, current, thing, value, { ...options, reportPadding: adjustment => padding.push(adjustment) })
            result = library.applyBrandPatch(theme, { revision: theme.revision, changes: edits })
          }
          rules = edits.flatMap(change => change.type === 'rule' ? [change.value] : [])
        } catch (error) {
          if (['ERR_THEME_NO_EFFECT', 'ERR_THEME_INVALID', 'ERR_THEME_BROWSER_REQUIRED', 'ERR_THEME_COPY_DIFF', 'ERR_THEME_PRESERVATION_DIFF'].includes(error.code)) throw error
          throw editorError('ERR_THEME_SETTING', error.message, error)
        }
        notes.push({ label: [thing, value, options.on, ...(options.when ?? []), options.state, options.mode].filter(Boolean).join(' · '), revision: result.revision, theme,
          ...themeEditorEntry(thing, options, theme, result, edits, value) })
      }
      const next = { ...state, lastEdited: result.id, themes: state.themes.map(item => item.id === result.id ? result : item),
        history: { ...state.history, [result.id]: notes.slice(-80) } }
      const source = editable ? await editorSource(directory, result, library) : { theme: result }
      const prior = source.source ? (await editorSource(directory, theme, library)).theme : theme
      let inspection
      let verificationWarning
      const beforeFrames = new Map(themePaginationFrames(library, prior).map(frame => [frame.rule + '/' + frame.property, frame]))
      const frames = themePaginationFrames(library, source.theme)
      const frameChanges = frames.flatMap(frame => {
        const before = beforeFrames.get(frame.rule + '/' + frame.property)
        return !before || before.part !== frame.part || before.hasEdge !== frame.hasEdge || before.value !== frame.value
          ? [{ ...frame, ...(before && { previousPart: before.part, previousEdge: before.hasEdge }) }] : []
      })
      if (edits && !appearanceCopy && !preservation) {
        const effective = themeEditorEntry(thing, options, prior, source.theme, edits).fields.some(([root, area, kind, mode, key]) =>
          root !== 'design' || area !== 'palette' || kind !== 'exact' || source.theme.modes[mode][key] === result.modes[mode][key])
        if (!effective) throw editorError('ERR_THEME_NO_EFFECT', 'This setting is unchanged or overridden by the theme source. Edit the overriding value or set a different scope.')
        const token = themeEditorProperty(thing)
        if (token.endsWith('-radius') && rules.some(rule => frames.some(frame =>
          frame.rule === library.brandRuleKey(rule) && frame.property === token && frame.part === 'pagination-list' && !frame.hasEdge))) {
          const conditions = (options.when ?? []).flatMap(condition => ['--when', condition])
          const item = token === 'border-radius' && options.on === 'pagination' ? 'corners' : token
          const command = ['syntrofic theme editor set', result.id, item, words.join(' '), '--on', item === 'corners' ? 'pagination' : 'pagination-item', ...conditions].join(' ')
          throw editorError('ERR_THEME_NO_EFFECT', 'The pagination row has no visible border, fill or shadow throughout this scope. '
            + `Add an edge first, or round each control with ${command}.`)
        }
        const localToken = token.startsWith('--sy-')
        const paintProperty = ['background', 'background-color', 'color', 'border-color', 'button-style'].includes(token)
        const scopes = rules.length ? rules : edits.flatMap(edit => edit.type === 'part'
          ? [{ target: edit.key, mode: edit.mode, state: options.state }] : [])
        const textSize = scopes.some(scope => {
          const projection = library.brandRuleTargets[scope.target].textSize
          return projection && (projection.token === token || token === 'font-size' || token === 'text-size')
        })
        const directProperty = options.on && !localToken && scopes.some(scope =>
          Object.hasOwn(library.brandRuleTargets[scope.target].properties, token))
        // Shared heights also edit the global control token, beyond rules removed from one component.
        const sharedHeight = token === 'height' && edits.some(edit => edit.type === 'settings')
        if (scopes.length && (localToken || directProperty) && !sharedHeight) {
          const [rule] = scopes
          const controlSize = /^--sy-control-height-(?:sm|md|lg)$/.test(token)
            || scopes.some(scope => library.brandControlHeightParts[scope.target]?.property === token)
          const styleProperties = directProperty && !paintProperty ? [token]
            : [...new Set(scopes.flatMap(scope => library.brandRuleTargets[scope.target].tokenProperties?.[token] ?? []))]
          const comparison = textSize ? 'font-size' : controlSize ? 'height' : styleProperties.length ? 'styles' : 'paint'
          const { themePartChanges } = await import('./theme-part-report.mjs')
          let checks
          try { checks = await themePartChanges(directory, library, prior, source.theme, scopes, token, comparison) }
          catch (error) {
            checks = scopes.map(scope => ({ part: scope.target, token, status: 'render-failed', error: error.message }))
          }
          const unchecked = checks.filter(check => check.status !== 'measured')
          if (unchecked.length) {
            verificationWarning = { code: 'ERR_THEME_NOT_CHECKED', parts: [...new Set(unchecked.map(check => check.part))],
              message: unchecked[0].error ?? 'Install Playwright Chromium or Google Chrome to verify the computed styles.' }
          }
          const pinsInherited = directProperty && rules.some(rule => {
            const key = library.brandRuleKey(rule)
            return theme.inheritedRules?.[key]?.declarations[token] !== undefined
              && source.theme.rules?.[key]?.authored?.[token] && !theme.rules?.[key]?.authored?.[token]
          })
          if (!pinsInherited && checks.length === scopes.length && checks.every(check =>
            check.status === 'measured' && !check.reaches.length && !check.mediaReaches?.length)) {
            const part = options.on ?? rule.target
            const scope = ['--on', part, ...(options.when ?? []).flatMap(condition => ['--when', condition]),
              ...(rule.state ? ['--state', rule.state] : []), ...(rule.mode ? ['--mode', rule.mode] : []), ...(options.only ? ['--only'] : [])].join(' ')
            const properties = comparison === 'paint' ? 'background-color, color, or border-color'
              : comparison === 'height' ? 'min-height or height' : comparison === 'styles' ? styleProperties.join(', ') : 'font-size'
            const subject = comparison === 'paint' ? 'colors' : comparison === 'height' ? 'heights' : comparison === 'styles' ? 'styles' : 'font sizes'
            const suggestion = localToken ? `Set ${properties} ${scope}, or use`
              : textSize ? 'Choose another size, or use' : 'Check the matching variants and states with'
            const conditions = part === rule.target ? options.when ?? [] : Object.entries(rule.when ?? {}).map(pair => pair.join(':'))
            const inspectionScope = ['--on', rule.target, ...conditions.flatMap(condition => ['--when', condition]),
              ...(rule.state ? ['--state', rule.state] : []), ...(rule.mode ? ['--mode', rule.mode] : [])].join(' ')
            throw editorError('ERR_THEME_NO_EFFECT', `${token} does not change the computed ${subject} of ${part} in this scope. `
              + `${suggestion} syntrofic theme editor show ${result.id} ${inspectionScope} to inspect the active styles.`)
          }
          const contrastChecks = checks.filter(check => check.contrast?.length)
          if (contrastChecks.length) {
            const { contrastRepairCovers } = await import('./theme-contrast-repair.mjs')
            const partOf = part => part.startsWith('button-') && part !== 'button-group' ? 'button' : part
            const parts = new Set(contrastChecks.flatMap(({ part }) => part === 'field'
              ? ['input', 'textarea', 'select', 'date-input', 'number-input'] : [partOf(part)]))
            const audit = await inspectReach({ theme: source.theme }, prior, result, editable, { parts, contrastOnly: true })
            for (const check of contrastChecks) {
              check.contrast = check.contrast.map(warning => {
                const repair = audit.contrastRepairs?.find(repair => contrastRepairCovers(repair,
                  { ...warning, part: warning.field ?? partOf(check.part) }))
                return repair ? { ...warning, fix: repair.line } : warning
              })
            }
          }
          if (checks.length) inspection = {
            [comparison === 'paint' ? 'paint' : comparison === 'styles' ? 'styles' : 'dimensions']: checks.length === 1 && scopes.length === 1
              ? checks[0] : { token, status: checks[0].status, parts: checks },
          }
        }
      }
      const compared = themeEditorReport(library, source.theme, notes.slice(-80), source.source ? result : undefined)
      const tokens = Object.fromEntries(Object.entries(compared.resolved).map(([mode, values]) => {
        const before = library.resolveThemeTokens(prior, { mode })
        return [mode, [...new Set([...Object.keys(before), ...Object.keys(values)])].flatMap(key =>
          before[key] !== values[key] ? [{ token: key, before: before[key] ?? null, after: values[key] ?? null }] : [])]
      }))
      const outputs = []
      const report = { ...compared, ...(source.source && { source: source.source }), ...(verificationWarning && { verificationWarning }),
        changes: { tokens, ...(rules?.length && { rules }), ...(padding.length && { padding }),
          ...(frameChanges.length && { paginationFrames: frameChanges }), ...(appearanceCopy && { appearanceCopy }),
          ...(preservation && { preservation }), ...inspection }, ...(undone && { undone }) }
      const previewed = await editorArtifacts(report, { registered: result, editable, invalidate: true, active: state.active,
        stage: stageFor(outputs) })
      if (previewed.previewError) throw editorError('ERR_RENDER_FAILED', previewed.previewError)
      return { state: next, outputs, result: previewed }
    })
  }
  if (action === 'add') {
    const { isThemeSource, readThemeDescriptor } = await import('./theme-descriptor.mjs')
    const { isThemeArchive, readThemeArchive } = await import('./theme-archive.mjs')
    const source = id && (isThemeSource(id) || isThemeArchive(id) || /[\\/]/.test(id)) && !options.source ? id : undefined
    const local = options.source ?? source
    let input = options.themeInput
    if (local) {
      if (isThemeArchive(local)) input = await readThemeArchive(directory, local)
      else {
        const path = resolve(directory, local)
        const file = (await lstat(path)).isDirectory() ? resolve(path, 'manifest.json') : path
        if (!isThemeSource(file)) throw new Error('Choose a theme descriptor, bundle folder or .tgz archive')
        input = await readThemeDescriptor(file)
      }
    }
    let owner
    const key = source ? input?.id : id ?? input?.id
    if (!slug(key)) throw new Error('Choose a theme identifier')
    if (!input && !options.preset && options.package !== ownPackage) {
      const candidates = (await installedThemes(directory, options.package)).filter(item => item.id === key)
      if (candidates.length > 1 || candidates.length && builtIns.has(key) && !options.package) throw new Error('Choose the theme owner with --package')
      if (candidates.length) { input = candidates[0].theme; owner = candidates[0].owner }
      else if (options.package) throw new Error('Package does not provide theme: ' + key)
    }
    if (!input && !options.preset && builtIns.has(key)) owner = ownPackage
    if (builtIns.has(key) && !owner) throw new Error('Choose a unique name for a custom theme')
    if (!owner && options.package) throw new Error('Package does not provide theme: ' + key)
    const preset = options.preset ?? 'morandi'
    if (!builtIns.has(preset)) throw new Error('Unknown theme preset: ' + preset)
    let theme = input ? validatedTheme({ ...input, id: key }, library)
      : owner ? library.createBrandTheme(key, themeNames[key], key) : library.createBrandTheme(key, options.name ?? key, preset)
    for (const [key, value] of options.settings ?? []) {
      const changes = themeEditorChange(library, theme, key, value, {})
      theme = library.applyBrandPatch(theme, { revision: theme.revision, changes })
    }
    return updateRegistry(directory, options['dry-run'], state => {
      if (state.themes.some(item => item.id === key)) throw new Error('Theme already exists: ' + key)
      const owners = { ...state.owners, ...(owner && { [key]: owner }) }
      return { state: { ...state, active: key, themes: [...state.themes, theme], owners,
        ...(options.themeBase && { themeBases: { ...state.themeBases, [key]: options.themeBase } }),
        ...(options.editable && { editable: [...(state.editable ?? []), key], lastEdited: key }) },
        result: { active: key, theme, owner, module: 'virtual:syntrofic-theme', provider: 'SBrandTheme' }, afterCommit: options.afterCreate }
    })
  }
  if (action === 'use' || action === 'remove') return updateRegistry(directory, options['dry-run'], state => {
    const theme = state.themes.find(item => item.id === id)
    if (!theme) throw new Error('Add the theme before selecting or removing it: ' + id)
    if (action === 'use') return { state: { ...state, active: theme.id }, result: { active: theme.id, theme } }
    if (state.active === theme.id && state.themes.length > 1) throw new Error('Select another default theme before removing ' + id)
    const active = state.active === theme.id ? null : state.active
    const history = { ...state.history }
    const owners = { ...state.owners }
    const themeBases = { ...state.themeBases }
    delete history[theme.id]
    delete owners[theme.id]
    delete themeBases[theme.id]
    return { state: { ...state, active, themes: state.themes.filter(item => item.id !== theme.id), history, owners,
      ...(state.themeBases && { themeBases }),
      ...(state.editable && { editable: state.editable.filter(key => key !== theme.id) }) }, result: { active, removed: theme.id } }
  })
  if (action === 'build' || action === 'compile') {
    const { compileThemeArtifacts } = await import('./theme-artifacts.mjs')
    const { isThemeSource, readThemeDescriptor } = await import('./theme-descriptor.mjs')
    options.observe?.(resolve(directory, registryName))
    const state = await readRegistry(directory)
    const legacyDestination = !options.out && output && !isThemeSource(output) && !extra.length ? output : undefined
    const destination = options.out ?? legacyDestination
    const names = [id ?? state.active ?? 'morandi', ...(!output || legacyDestination ? [] : [output, ...extra])].flatMap(name => name.split(','))
    if (!options.family && destination && names.length > 1) throw new Error('Use --out with one theme, or build a named family')
    const sourceFiles = new Set()
    const observe = path => { sourceFiles.add(path); options.observe?.(path) }
    const parents = new Map()
    const sources = await Promise.all(names.map(async name => {
      const file = isThemeSource(name) ? resolve(directory, name) : undefined
      if (file) {
        const path = relative(directory, file)
        const root = path === '..' || path.startsWith('..' + sep) || isAbsolute(path) ? undefined : directory
        const raw = await readThemeDescriptor(file, { root, observe, inherit: (child, parent) => parents.set(child, parent) })
        return { file, canonical: await realpath(file), theme: validatedTheme(raw, library) }
      }
      const theme = read(state, name)
      return state.editable?.includes(theme.id) ? editorSource(directory, theme, library, observe) : { theme }
    }))
    if (new Set(sources.map(source => source.theme.id)).size !== sources.length) throw new Error('Choose unique theme IDs')
    const settings = { ...options, sourceFiles: [...sourceFiles] }
    if (options.family) {
      const selected = new Set(sources.map(source => source.canonical))
      const roots = sources.filter(source => !selected.has(parents.get(source.canonical)) || !parents.has(source.canonical))
      if (sources.some(source => parents.has(source.canonical)) && roots.length !== 1) {
        throw new Error('Select one theme family and include its local base themes')
      }
      const file = (roots[0] ?? sources[0]).file
      return compileThemeArtifacts(directory, library, sources.map(source => source.theme), destination ?? (file && dirname(file)), settings)
    }
    const results = []
    for (const { file, theme } of sources) {
      const editable = action === 'compile' && !file && state.editable?.includes(theme.id)
      const copy = 'src/themes/' + theme.id
      if (editable && destination) {
        const local = relative(resolve(directory, copy), resolve(directory, destination))
        if (!isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep)) throw new Error('Compile the editable theme to refresh its app copy')
      }
      const target = destination ?? (file ? resolve(dirname(file), theme.id + '.css')
        : editable ? 'themes/' + theme.id : sources.length > 1 ? 'theme-dist/' + theme.id + '.css' : undefined)
      const result = await compileThemeArtifacts(directory, library, [theme], target, settings)
      if (editable && !destination) {
        try {
          result.appCopy = await compileThemeArtifacts(directory, library, [theme], copy, { ...settings, overwrite: false, write: false })
          result.written ||= result.appCopy.written
          if (options.check) result.upToDate &&= result.appCopy.upToDate
        } catch (error) {
          result.appCopyError = error.message
          if (options.check) result.upToDate = false
        }
      } else if (editable) result.appCopySkipped = true
      results.push(result)
    }
    if (results.length === 1) return results[0]
    return { themes: results.map(result => result.theme), results, written: results.some(result => result.written),
      ...(options.check && { upToDate: results.every(result => result.upToDate) }) }
  }
  if (action === 'template' && (!id || id.endsWith('.ts') || output?.endsWith('.ts'))) {
    const state = await readRegistry(directory)
    const key = id && !id.endsWith('.ts') ? id : state.active
    const theme = key ? read(state, key) : library.createBrandTheme('studio', 'Studio')
    const { writeThemeTemplate } = await import('./theme-descriptor.mjs')
    return writeThemeTemplate(directory, theme, output ?? id, options)
  }
  if (action === 'eject' || action === 'template') {
    const state = await readRegistry(directory)
    const key = id ?? state.active ?? 'morandi'
    const external = options.package === ownPackage ? [] : (await installedThemes(directory, options.package)).filter(theme => theme.id === key)
    if (external.length > 1 || external.length && builtIns.has(key) && !options.package && !state.owners?.[key]) {
      throw new Error('Choose the theme owner with --package')
    }
    if (!external.length && options.package && options.package !== ownPackage) throw new Error('Package does not provide theme: ' + key)
    const theme = external.length ? validatedTheme(external[0].theme, library) : options.package === ownPackage && builtIns.has(key)
      ? library.createBrandTheme(key, themeNames[key], key) : read(state, key)
    const files = library.exportBrandTheme(theme)
    const outputDir = resolve(directory, output ?? 'themes/' + theme.id)
    const { validateThemeDestination } = await import('./theme-descriptor.mjs')
    await validateThemeDestination(directory, resolve(outputDir, 'manifest.json'))
    for (const name of Object.keys(files)) {
      const target = resolve(outputDir, name)
      try {
        if (!(await lstat(target)).isFile()) throw new Error('Expected a regular theme file: ' + name)
        if (name === 'manifest.json' && JSON.parse(await readFile(target, 'utf8')).id !== theme.id) throw new Error('Folder already holds a different theme')
      } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    if (!options['dry-run']) await emitFiles(outputDir, files, options.overwrite || options.write)
    return { directory: outputDir, theme: theme.id, files: Object.keys(files), owner: external[0]?.owner ?? state.owners?.[key] ?? ownPackage }
  }
  throw new Error('Unknown theme action: ' + action)
}
