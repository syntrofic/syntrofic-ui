import { execFile } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { cliManifest } from './cli-reference.mjs'

const run = promisify(execFile)
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url))
const docsCommands = new Set(['search', 'build', 'component', 'hook', 'docs', 'template', 'discover', 'theme_list', 'theme_targets'])
const docsFlags = new Set(['type', 'limit', 'verbose', 'list', 'components', 'installed', 'available', 'skeleton', 'index', 'full', 'depth', 'detail', 'category', 'params', 'on', 'mode', 'props', 'blocks', 'showcase'])
const writeArguments = new Set(['path', 'file', 'directory', 'output'])

function inputSchema(item, flag = false) {
  const type = flag ? item.type : 'string'
  const value = { type, ...(item.values && { enum: item.values }) }
  return item.variadic || item.multiple ? { type: 'array', items: value } : value
}

function matches(schema, value) {
  if (schema.type === 'array') return Array.isArray(value) && value.every(item => matches(schema.items, item))
  return typeof value === schema.type && (!schema.enum || schema.enum.includes(value))
}

function plans(docsOnly) {
  return cliManifest().commands.filter(command => command.name !== 'mcp').flatMap(command => [
    { words: [command.name], arguments: command.arguments, summary: command.summary, flags: command.flags },
    ...command.subcommandDetails?.map(action => ({
      words: [command.name, ...action.name.split(' ')], arguments: action.arguments, summary: command.summary, flags: command.flags,
    })) ?? [],
  ]).flatMap(plan => {
    const name = plan.words.join('_').replaceAll('-', '_')
    if (docsOnly && !docsCommands.has(name)) return []
    const args = plan.arguments.filter(item => !docsOnly || !writeArguments.has(item.name))
    const positionalNames = new Set(args.map(arg => arg.name))
    const flags = plan.flags.map(flag => ({ ...flag, key: flag.name.slice(2) }))
      .filter(flag => !['json', 'watch'].includes(flag.key) && !positionalNames.has(flag.key) && (!docsOnly || docsFlags.has(flag.key)))
    const properties = Object.fromEntries([
      ...args.map(arg => [arg.name, inputSchema(arg)]),
      ...flags.map(flag => [flag.key, inputSchema(flag, true)]),
      ...!docsOnly ? [['cwd', { type: 'string' }]] : [],
    ])
    const required = args.filter(arg => arg.required).map(arg => arg.name)
    return [{
      name, args, flags, words: plan.words,
      tool: { name, description: plan.summary, inputSchema: { type: 'object', properties, required, additionalProperties: false },
        ...(docsOnly && { annotations: { readOnlyHint: true } }) },
    }]
  })
}

async function workingDirectory(root, path) {
  if (path === undefined) return root
  const directory = await realpath(resolve(root, path))
  const scoped = relative(root, directory)
  if (isAbsolute(scoped) || scoped === '..' || scoped.startsWith('..' + sep) || !(await stat(directory)).isDirectory()) {
    throw new Error('Choose a working folder inside the server directory')
  }
  return directory
}

export async function cliMcpCommands(directory, docsOnly = false) {
  const root = await realpath(directory)
  const entries = plans(docsOnly)
  const available = new Map(entries.map(entry => [entry.name, entry]))
  async function invoke(name, input) {
    const command = available.get(name)
    if (!command) return
    const schema = command.tool.inputSchema
    const bad = !input || typeof input !== 'object' || Array.isArray(input)
      || Object.entries(input).some(([key, value]) => !Object.hasOwn(schema.properties, key) || !matches(schema.properties[key], value))
      || schema.required.some(key => !Object.hasOwn(input, key))
    if (bad) return { text: 'Arguments do not match the tool schema.', error: true }
    if (docsOnly && (name === 'docs' && input.topic === 'export' || name === 'template' && input.name === 'add')) {
      return { text: 'Choose a documentation read command.', error: true }
    }
    const lastArgument = command.args.findLastIndex(arg => input[arg.name] !== undefined)
    if (command.args.slice(0, lastArgument).some(arg => input[arg.name] === undefined)) {
      return { text: 'Supply the preceding positional arguments first.', error: true }
    }
    try {
      const cwd = await workingDirectory(root, input.cwd)
      const flags = ['--json']
      if (docsOnly && name !== 'build') flags.push('--dry-run')
      for (const { key, name: long, type } of command.flags) {
        if (input[key] === undefined) continue
        if (type === 'boolean') { if (input[key]) flags.push(long); continue }
        const values = Array.isArray(input[key]) ? input[key] : [input[key]]
        flags.push(...values.map(value => long + '=' + value))
      }
      const positionals = command.args.flatMap(arg => input[arg.name] ?? [])
      const { stdout } = await run(process.execPath, [cli, ...flags, '--', ...command.words, ...positionals], { cwd, maxBuffer: 8 * 1024 * 1024 })
      return { text: stdout }
    } catch (error) {
      return { text: error.stdout || error.stderr || error.message, error: true }
    }
  }
  return { tools: entries.map(entry => entry.tool), invoke }
}
