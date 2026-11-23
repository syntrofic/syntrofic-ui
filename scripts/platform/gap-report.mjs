import { execFile } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { discover, installedAt, projectAt } from './discover.mjs'
import { readProjectSettings } from './project-discovery.mjs'

export const gapCategories = {
  missing_component: 'Missing component',
  missing_variant: 'Missing variant',
  layout_gap: 'Layout',
  styling_gap: 'Styling',
  a11y_gap: 'Accessibility',
  api_friction: 'API',
  docs_gap: 'Documentation',
  other: 'Other',
}
const mainPackage = { name: '@syntrofic/ui', issues: 'https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/issues' }
const run = promisify(execFile)

function issueLink(input) {
  if (!input) return undefined
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS issues URL without credentials')
  return url.href
}

function required(value, max, name) {
  const text = value?.trim()
  if (!text || [...text].length > max) throw new Error(name + ' must contain 1 to ' + max + ' characters')
  return text
}

async function readJSON(file) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function handlerPath(directory, module) {
  const root = await realpath(directory)
  const file = await realpath(resolve(root, module))
  const within = relative(root, file)
  if (!within || isAbsolute(within) || within === '..' || within.startsWith('..' + sep) || !/\.(?:mjs|js)$/.test(within)) {
    throw new Error('A gap handler must be a JS module inside its project or package')
  }
  return file
}

function handlers(input, directory, owner) {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw new Error('Gap report handlers must be an array')
  return input.map(handler => {
    if (typeof handler?.module !== 'string' || !handler.module || !['internal', 'public'].includes(handler.visibility)) {
      throw new Error('Invalid gap report handler for ' + owner)
    }
    return { ...handler, directory, owner }
  })
}

async function postToGithub(url, title, body) {
  const target = new URL(url)
  const repo = /^\/([\w.-]+\/[\w.-]+)\/issues\/?$/.exec(target.pathname)?.[1]
  if (target.hostname !== 'github.com' || !repo) return null
  const scratch = await mkdtemp(join(tmpdir(), 'syntrofic-gap-'))
  try {
    const path = join(scratch, 'issue.md')
    await writeFile(path, body)
    const { stdout } = await run('gh', ['issue', 'create', '--repo', 'github.com/' + repo, '--title', title, '--body-file', path])
    return stdout.trim()
  } finally { await rm(scratch, { recursive: true, force: true }) }
}

export async function gapReport(directory, component, options) {
  const project = await projectAt(directory)
  const settings = await readProjectSettings(project.directory)
  const core = settings.issuesUrl ? { ...mainPackage, issues: issueLink(settings.issuesUrl) } : mainPackage
  const { packages } = await discover(project.directory, '', { installed: true })
  const integrations = packages.filter(pkg => pkg.version && pkg.name !== mainPackage.name)
  const destinations = [core, ...integrations].flatMap(pkg => {
    const url = issueLink(pkg.issues)
    return url ? [{ package: pkg.name, url }] : []
  })
  if (options['list-categories']) {
    if (component || options.category || options.reason || options['additional-context'] || options.package || options.to || options['confirm-public']) {
      throw new Error('--list-categories lists categories and destinations')
    }
    return { categories: Object.entries(gapCategories).map(([value, label]) => ({ value, label })), destinations }
  }
  const name = required(component, 120, 'Component')
  if (!Object.hasOwn(gapCategories, options.category ?? '')) throw new Error('Choose a valid --category')
  const reason = required(options.reason, 2000, 'Reason')
  const context = options['additional-context'] === undefined ? undefined : required(options['additional-context'], 8000, 'Additional context')
  const key = name.toLowerCase()
  const replacements = integrations.filter(pkg => pkg.entries.some(entry => entry.type === 'component' && entry.replaces?.toLowerCase() === key))
  const owners = replacements.length ? replacements : integrations.filter(pkg => pkg.entries.some(entry => entry.type === 'component' && entry.id?.toLowerCase() === key))
  const explicit = options.to ?? options.package
  if (!explicit && owners.length > 1) throw new Error('Choose --package for ' + owners.map(pkg => pkg.name).join(', '))
  const owner = explicit === core.name ? core : explicit ? integrations.find(pkg => pkg.name === explicit) : owners[0] ?? core
  if (!owner) throw new Error('Unknown report package: ' + explicit)
  const report = { component: name, category: options.category, reason, ...(context && { context }),
    package: owner.name, source: options.agent ? 'agent' : 'person' }
  const title = '[' + gapCategories[report.category] + '] ' + name.replace(/\s+/g, ' ')
  const body = reason + (context ? '\n\n## Additional context\n\n' + context : '') + '\n\nReported via Syntrofic CLI (' + report.source + ').\n'
  const url = issueLink(owner.issues)
  if (options['dry-run']) return { status: 'draft', report, title, body, url, destinations }

  const projectConfig = options.to ? undefined : await readJSON(join(project.directory, 'syntrofic.gap-report.json'))
  const local = handlers(options.to ? undefined : settings.gapReport?.handlers ?? projectConfig?.handlers, project.directory, project.manifest.name ?? 'project')
  for (const pkg of options.to ? [] : integrations) {
    const installed = await installedAt(project.directory, pkg.name)
    if (!installed) continue
    const config = await readJSON(join(installed.path, 'syntrofic.integration.json'))
    local.push(...handlers(config?.gapReportHandlers, installed.path, pkg.name))
  }
  const deliveries = []
  for (const handler of local) {
    if (handler.visibility === 'public' && !options['confirm-public']) {
      deliveries.push({ package: handler.owner, status: 'confirmation-required' })
      continue
    }
    try {
      const file = await handlerPath(handler.directory, handler.module)
      const { default: deliver } = await import(pathToFileURL(file).href)
      if (typeof deliver !== 'function') throw new Error('Gap report handlers must export a function')
      await deliver(Object.freeze({ ...report, title, body }))
      deliveries.push({ package: handler.owner, status: 'delivered' })
    } catch (error) {
      deliveries.push({ package: handler.owner, status: 'failed', error: error.message })
    }
  }
  if (deliveries.length) {
    const status = deliveries.some(entry => entry.status === 'failed') ? 'failed'
      : deliveries.some(entry => entry.status === 'delivered') ? 'handled' : 'confirmation-required'
    return { status, report, deliveries, destinations }
  }
  if (url && options['confirm-public']) {
    const issue = await postToGithub(url, title, body)
    if (issue) return { status: 'filed', report, url: issue, destinations }
  }
  return { status: url ? 'routed' : 'draft', report, title, body, url, destinations }
}
