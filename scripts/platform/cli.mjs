#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { basename, resolve } from 'node:path'
import { astryxCoverage, component, docsBundle, documentEntry, matchRecords } from './catalog.mjs'
import { installPro } from './pro-install.mjs'
import { designKit } from './design-kit.mjs'
import { migrationPlan, updateLegacyImports } from './migration.mjs'
import { emitFiles, scaffold } from './scaffold.mjs'
import { cliCommands, cliManifest, cliOptionsFor, formattedHook, hookCommand } from './cli-reference.mjs'
import { themeCommand } from './theme.mjs'
import { integrationCommand } from './integration.mjs'
import { iconCommand } from './icon.mjs'
import { blogCommand } from './blog.mjs'
import { swizzle } from './swizzle.mjs'
import { templateCommand } from './template.mjs'
import { docsCommand, formattedDocs } from './docs.mjs'
import { projectDoctor } from './doctor.mjs'

const args = process.argv.slice(2)
const themeIndex = args[0] === 'experimental' ? 1 : 0
const editor = args[themeIndex] === 'theme' && args[themeIndex + 1] === 'editor' ? args[themeIndex + 2] : undefined
const editIndex = ['set', 'undo'].includes(editor) ? themeIndex + 4 : -1
if (editIndex >= 0 && /^--sy-[\w-]+$/.test(args[editIndex] ?? '')) args[editIndex] = 'token:' + args[editIndex]
if (editor === 'how') {
  const list = args.findIndex((arg, index) => index > themeIndex + 2 && arg.startsWith('--list=') && !args.slice(0, index).includes('--'))
  if (list >= 0) args.splice(list, 1, '--list', args[list].slice('--list='.length))
  for (let index = themeIndex + 3; index < args.length && args[index] !== '--'; index++) {
    if (/^--sy-[\w-]+$/.test(args[index])) args[index] = 'token:' + args[index]
  }
}
const probe = args.includes('component') && parseArgs({ args, strict: false, allowPositionals: true, options: cliOptionsFor('component') })
const componentMode = probe && probe.positionals[0] === 'component'
const options = cliOptionsFor(componentMode ? 'component' : undefined)
const parsed = parseArgs({ args, allowPositionals: true, options, tokens: true })
const [command = 'help', ...params] = parsed.positionals
const path = command === 'experimental' ? params : parsed.positionals
const partLookup = path[0] === 'theme' && path[1] === 'editor' && path[2] === 'show' && parsed.values.on !== undefined
const values = partLookup ? parseArgs({ args, allowPositionals: true, options: { ...options,
  on: { ...options.on, multiple: true } } }).values : parsed.values
const directory = resolve(values.out ?? process.cwd())
const packageName = values.native ? '@syntrofic/ui-native' : '@syntrofic/ui'
const source = values.source ?? '^0.1.0'
const summary = value => console.log(JSON.stringify(value, null, 2))
const started = Date.now()
try {
  if (path[0] === 'theme' && path[1] === 'editor' && path[2] === 'how') {
    const repeated = ['list', 'theme'].find(name => parsed.tokens.filter(token => token.kind === 'option' && token.name === name).length > 1)
    if (repeated) throw Object.assign(new Error(`Use --${repeated} once`), { code: 'ERR_INVALID_ARGUMENT' })
  }
  if (command === 'init') {
    let result
    if (!params[0] && !values.native) {
      const { initializeProject } = await import('./project-init.mjs')
      result = await initializeProject(directory, values)
    }
    if (result) summary(result)
    else {
      if (values.features || values.all || values.remove || values['remove-agents'] || values.to || values.once
        || values.user || values.agent || values['agent-docs-path']) throw new Error('Choose project setup or a starter framework')
      const type = values.native ? 'native' : params[0] ?? 'vue'
      if (!['vue', 'nuxt', 'native'].includes(type)) throw new Error('Unknown starter: ' + type)
      const name = basename(directory).toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'syntrofic-app'
      const files = scaffold(type, name, source)
      if (!values['dry-run']) await emitFiles(directory, files)
      summary({ type, directory, files: Object.keys(files) })
    }
  } else if (command === 'list') {
    const matches = matchRecords(params.join(' '))
    if (values.json) summary(matches)
    else console.log(matches.map(entry => `${entry.id}\t${entry.name}`).join('\n'))
  } else if (command === 'search') {
    const { searchCommand } = await import('./search.mjs')
    const matches = await searchCommand(directory, params.join(' '), values)
    if (values.json) summary(matches)
    else console.log(matches.map(entry => [entry.type, entry.id, entry.name, entry.command,
      ...(values.verbose ? [entry.score, entry.match, entry.summary?.replace(/\s+/g, ' ')] : [])].join('\t')).join('\n'))
  } else if (command === 'manifest') {
    summary(cliManifest())
  } else if (command === 'help' && values.json) {
    const manifest = cliManifest()
    summary({ ...manifest, type: 'help', data: { manifest } })
  } else if (command === 'discover') {
    const { discover, formattedDiscovery } = await import('./discover.mjs')
    const entries = await discover(directory, params.join(' '), values)
    if (values.json) summary(entries)
    else console.log(formattedDiscovery(entries, values.components))
  } else if (command === 'blog') {
    const notes = await blogCommand(directory, params[0], values.source)
    if (values.json) summary(notes)
    else if (Array.isArray(notes)) console.log(notes.map(note => `${note.id}\t${note.title}`).join('\n'))
    else console.log([notes.title, notes.date, notes.body].join('\n\n'))
  } else if (command === 'swizzle') {
    summary(await swizzle(process.cwd(), resolve(values.output ?? values.out ?? 'components/syntrofic'), params.join(' '), values))
  } else if (command === 'build' && !values.list && !values.out && !values.source && !values['dry-run']) {
    const { buildPlan, formattedBuildPlan } = await import('./build-plan.mjs')
    const plan = await buildPlan(directory, params.join(' '), values)
    if (values.json) summary(plan)
    else console.log(formattedBuildPlan(plan))
  } else if (command === 'template' || command === 'build') {
    const args = command === 'template' ? params : [values.list ? 'list' : 'add', ...params]
    const result = await templateCommand(directory, args, values, source, command === 'build')
    if (command === 'template' && !values.json && typeof result.source === 'string') process.stdout.write(result.source)
    else if (command === 'template' && !values.json && typeof result.skeleton === 'string') console.log(result.skeleton)
    else summary(result)
  } else if (command === 'mcp') {
    if (values.json) throw new Error('MCP already sends JSON protocol messages over standard output')
    const { serveMcp } = await import('./mcp.mjs')
    await serveMcp(directory, values['docs-only'])
  } else if (command === 'hook') {
    const result = await hookCommand(params[0], values)
    if (values.json) summary(result)
    else console.log(formattedHook(result))
  } else if (command === 'experimental' && !params.length) {
    summary(cliManifest().commands.find(entry => entry.name === 'experimental'))
  } else if (command === 'experimental' && params[0] === 'icon') {
    summary(await iconCommand(directory, params.slice(1), values))
  } else if (command === 'experimental' && ['export', 'import'].includes(params[0])) {
    if (params.length !== 2) throw new Error('Specify one page file')
    const { exportPage, importPage } = await import('./share-page.mjs')
    const action = params[0] === 'import' || values.reverse ? importPage : exportPage
    summary(await action(process.cwd(), params[1], values))
  } else if (command === 'theme' || command === 'experimental' && params[0] === 'theme') {
    const themeArgs = command === 'theme' ? params : params.slice(1)
    const building = ['build', 'compile'].includes(themeArgs[0])
    const editorReport = themeArgs[0] === 'editor' && ['show', 'set', 'undo'].includes(themeArgs[1])
    const projectDir = building || editorReport || themeArgs[0] === 'palette' && themeArgs[1] === 'generate' ? process.cwd() : directory
    if (values.watch) {
      if (!building || values.check || values.family || values.json || values['dry-run']) throw new Error('Use --watch for a writing theme build without --check, --family or --json')
      const { watchThemeBuild } = await import('./theme-watch.mjs')
      await watchThemeBuild(observe => themeCommand(projectDir, themeArgs, { ...values, observe }), summary)
    } else {
      const result = await themeCommand(projectDir, themeArgs, values)
      if (!values.json && result.verificationWarning) {
        const { code, message } = result.verificationWarning
        console.error(`[warn] ${values['dry-run'] ? 'Previewed' : 'Saved'}, not checked (${code}). ${message}`)
      }
      if (partLookup && !values.json) {
        const { formattedThemePart } = await import('./theme-part-report.mjs')
        console.log(result.group ? result.group + '\n\n' + result.parts.map(formattedThemePart).join('\n\n') : formattedThemePart(result))
      } else summary(result)
      if (result.upToDate === false) process.exitCode = 1
    }
  } else if (command === 'integration' || command === 'doctor' && params[0] === 'integration') {
    const result = await integrationCommand(directory, command === 'integration' ? params : ['diagnostic', params[1], params[2]], values)
    summary(result)
    if (result.valid === false) process.exitCode = 1
  } else if (command === 'gap-report' && ['category', 'reason', 'additional-context', 'package', 'to', 'confirm-public', 'list-categories', 'agent', 'dry-run']
    .some(option => values[option] !== undefined)) {
    const { gapReport } = await import('./gap-report.mjs')
    const result = await gapReport(directory, params.join(' '), values)
    summary(result)
    if (result.status === 'failed') process.exitCode = 1
  } else if (command === 'coverage' || command === 'gap-report') {
    const report = await astryxCoverage(params.join(' '))
    if (values.json) summary(report)
    else {
      console.log('Astryx ' + report.revision.slice(0, 12))
      for (const { group, name, status, symbol } of report.entries) {
        console.log([group, name, status, symbol ?? '—'].join('\t'))
      }
    }
  } else if (command === 'docs') {
    if (params[0] === 'export') {
      const files = docsBundle()
      if (!values['dry-run']) await emitFiles(directory, files)
      summary(Object.keys(files))
    } else {
      const result = await docsCommand(directory, params, values)
      if (values.json) summary(result)
      else console.log(formattedDocs(result))
    }
  } else if (command === 'component') {
    const { componentReference, formattedComponentReference } = await import('./component.mjs')
    const result = await componentReference(directory, params, values)
    if (values.json) summary(result)
    else console.log(formattedComponentReference(result, values))
  } else if (command === 'info') {
    const entry = component(params.join(' '))
    if (!entry) throw new Error('Unknown catalog entry')
    if (values.json) summary(entry)
    else console.log(documentEntry(entry))
  } else if (command === 'install-pro') {
    summary(await installPro(directory, params[0] ?? '', params[1] ?? '', {
      manager:values.manager, channel:values.ci?'ci':'personal', dryRun:values['dry-run'],
    }))
  } else if (command === 'upgrade' && (values.from || values.apply || values.list || values.path || values.force || values.codemod || values.integration
    || values.registry || values['skip-codemod']?.length)) {
    if (params.length) throw new Error('Specify upgrade flags without positional arguments')
    const { upgradeSwizzle } = await import('./swizzle-registry.mjs')
    let result
    if (values.registry) {
      if (values.from || values.list || values.path || values.force || values.codemod || values.integration || values['skip-codemod']?.length) {
        throw new Error('--registry cannot be combined with source migration flags')
      }
      result = await upgradeSwizzle(directory, values)
    } else {
      const { upgradeSources } = await import('./upgrade.mjs')
      result = await upgradeSources(directory, packageName, values)
      if (result.valid && !values.native && !values.codemod && !values.integration) {
        const registry = await upgradeSwizzle(directory, values)
        result = { ...result, valid: registry.valid, written: result.written || registry.written, registry }
      }
    }
    summary(result)
    if (result.valid === false) process.exitCode = 1
  } else if (['install', 'upgrade', 'remove'].includes(command)) {
    const manager = values.manager ?? 'pnpm'
    if (!['pnpm', 'npm', 'yarn', 'bun'].includes(manager)) throw new Error('Unsupported package manager')
    const verb = command === 'remove' ? (manager === 'npm' ? 'uninstall' : 'remove') : manager === 'npm' ? 'install' : 'add'
    const args = [verb, command === 'remove' ? packageName : `${packageName}@${source}`]
    if (values['dry-run']) summary({ manager, args, directory })
    else {
      const run = spawnSync(manager, args, { cwd: directory, stdio: 'inherit' })
      if (run.error || run.status) throw run.error ?? new Error(`Package manager exited with status ${run.status}`)
    }
  } else if (command === 'figma') {
    if (!/^\d{6,24}$/.test(values.id ?? '')) throw new Error('Specify the ID of the local Figma development plugin using --id')
    const config = { name: 'Syntrofic Theme Sync', id: values.id, api: '1.0.0', main: 'code.js', ui: 'ui.html',
      editorType: ['figma'], documentAccess: 'dynamic-page', networkAccess: { allowedDomains: ['none'] } }
    const files = { 'manifest.json': JSON.stringify(config, null, 2) + '\n',
      'code.js': await readFile(new URL('./figma/code.js', import.meta.url),'utf8'),
      'ui.html': await readFile(new URL('./figma/ui.html', import.meta.url),'utf8'),
      'design-kit.json': JSON.stringify(designKit(), null, 2) + '\n' }
    if (!values['dry-run']) await emitFiles(directory, files)
    summary({ directory, files: Object.keys(files) })
  } else if (command === 'migrate') {
    if (!params[0]) throw new Error('Specify a source file')
    const path = resolve(directory, params[0])
    const input = await readFile(path, 'utf8')
    const updated = updateLegacyImports(input)
    if (values.write && !values['dry-run'] && updated !== input) await writeFile(path, updated)
    summary({ entries: migrationPlan(input), changed: updated !== input && Boolean(values.write && !values['dry-run']) })
  } else if (command === 'doctor') {
    const result = await projectDoctor(directory, packageName, values)
    summary(result)
    if (!result.valid) process.exitCode = 1
  } else if (command === 'design' || command === 'agents') {
    const name = command === 'design' ? 'DESIGN.md' : 'AGENTS.md'
    const content = command === 'design' ? '# Syntrofic UI\n\n标准主题默认采用白色底色，配合低饱和色、圆角与紧凑的平面布局。动效支持系统减少动态效果设置。\n'
      : '# Syntrofic UI\n\n优先查组件目录和可运行示例。重用控件语义，支持键盘、读屏和减少动效。\n'
    if (!values['dry-run']) await emitFiles(directory, { [name]: content })
    console.log(name)
  } else if (command === 'postinstall') {
    console.log('Syntrofic UI\n  syntrofic init vue\n  syntrofic search button\n  syntrofic theme list')
  } else if (command === 'help') console.log(`syntrofic <${cliCommands.join('|')}> [entry] [--out path] [--json] [--dry-run]`)
  else throw new Error('Unknown command: ' + command)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const editorCode = typeof error?.code === 'string' && /^(?:ERR_THEME_|ERR_(?:PROJECT_REQUIRED|UNKNOWN_THEME|AMBIGUOUS_THEME|INVALID_ARGUMENT|FILE_EXISTS|WRITE_FAILED|RENDER_FAILED)$)/.test(error.code)
  console.error(editorCode ? error.code + ': ' + message : message)
  process.exitCode = 1
} finally {
  if (!partLookup) {
    const { logCommand } = await import('./command-log.mjs')
    try { await logCommand(process.cwd(), { command, date: new Date(started).toISOString(), duration: Date.now() - started, status: process.exitCode ?? 0 }) }
    catch (error) {
      if (error.code !== 'ENOENT') console.error('Command log: ' + error.message)
    }
  }
}
