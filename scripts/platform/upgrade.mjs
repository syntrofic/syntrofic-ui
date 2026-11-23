import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { link, lstat, mkdir, open, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, matchesGlob, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { upgradeLegacyImports } from './migration.mjs'
import { installedAt, readJSON, readProjectSettings } from './project-discovery.mjs'

const migrations = [{ name: 'legacy-component-imports', version: '0.1.0',
  summary: 'Update legacy named imports while preserving local aliases.', transform: upgradeLegacyImports }]
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', '.cjs', '.cts', '.vue'])
const excludedDirectories = new Set(['node_modules', '.git', '.hg', '.sl', '.yarn', '.nuxt', '.cache', 'dist'])
const portable = filename => filename.split(sep).join('/')
const run = promisify(execFile)

function version(value) {
  const found = /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-z-]+(?:\.[\da-z-]+)*))?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/i.exec(value ?? '')
  if (!found) throw new Error('Invalid version: ' + (value ?? '(missing)'))
  return { numbers: found.slice(1, 4).map(Number), prerelease: found[4]?.split('.') ?? [] }
}

function compare(left, right) {
  for (const [index, number] of left.numbers.entries()) if (number !== right.numbers[index]) return number - right.numbers[index]
  if (!left.prerelease.length || !right.prerelease.length) return Number(right.prerelease.length > 0) - Number(left.prerelease.length > 0)
  for (const [index, identifier] of left.prerelease.entries()) {
    const other = right.prerelease[index]
    if (other === undefined) return 1
    if (identifier === other) continue
    const numeric = /^\d+$/.test(identifier)
    if (numeric && /^\d+$/.test(other)) return Number(identifier) - Number(other)
    if (numeric !== /^\d+$/.test(other)) return numeric ? -1 : 1
    return identifier < other ? -1 : 1
  }
  return left.prerelease.length - right.prerelease.length
}

async function readOptional(path) {
  try { return await readFile(path, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function findProject(start, packageName) {
  let nearest
  for (let path = start; ; path = dirname(path)) {
    const text = await readOptional(join(path, 'package.json'))
    if (text !== undefined) {
      const manifest = JSON.parse(text)
      nearest ??= { path, manifest }
      if (manifest.name === packageName || ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
        .some(key => manifest[key]?.[packageName])) return { path, manifest }
    }
    if (dirname(path) === path) break
  }
  if (!nearest) throw new Error('ERR_VERSION_DETECT: no project package.json was found')
  return nearest
}

async function installedVersion(project, packageName) {
  if (project.manifest.name === packageName) return project.manifest.version
  for (let parent = project.path; ; parent = dirname(parent)) {
    const text = await readOptional(join(parent, 'node_modules', packageName, 'package.json'))
    if (text !== undefined) return JSON.parse(text).version
    if (dirname(parent) === parent) break
  }
  throw new Error('ERR_VERSION_DETECT: cannot find the installed ' + packageName + ' package')
}

function subpath(root, path) {
  const name = relative(root, path)
  if (isAbsolute(name) || name === '..' || name.startsWith('..' + sep) || name.split(sep).some(part => excludedDirectories.has(part))) {
    throw new Error('The upgrade path must stay inside the project source')
  }
  return name
}

async function sourceRoot(project, start, path) {
  let target = path ? resolve(start, path) : join(project, 'src')
  if (!path && await lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error }) === undefined) target = join(project, 'app')
  const name = subpath(project, target)
  let current = project
  for (const segment of name.split(sep).filter(Boolean)) {
    current = join(current, segment)
    if ((await lstat(current)).isSymbolicLink()) throw new Error('The upgrade path must not use symbolic links')
  }
  if (!(await lstat(target)).isDirectory()) throw new Error('The upgrade path must be a folder')
  return target
}

function parseProtection(ignoreText, attributesText, prefix) {
  const ignored = (ignoreText ?? '').split(/\r?\n/).flatMap(text => {
    const line = text.trim()
    if (!line || line.startsWith('#')) return []
    const negate = line.startsWith('!')
    const value = negate ? line.slice(1) : line
    return [{ pattern: value.replace(/^\/|\/$/g, ''), anchored: value.startsWith('/') || value.slice(0, -1).includes('/'),
      directory: value.endsWith('/'), negate, prefix, type: 'ignored' }]
  })
  const generated = (attributesText ?? '').split(/\r?\n/).flatMap(line => {
    const parts = line.trim().match(/"(?:[^"\\]|\\.)*"|\S+/g)
    if (!parts || parts[0].startsWith('#')) return []
    const [path, ...flags] = parts
    const value = path.replace(/^"|"$/g, '')
    return flags.filter(flag => /^-?linguist-(?:generated|vendored)(?:=(?:true|false))?$/.test(flag)).map(flag => ({
      pattern: value.replace(/^\//, ''), anchored: value.includes('/'), directory: false, negate: flag.startsWith('-') || flag.endsWith('=false'),
      prefix, type: flag.includes('generated') ? 'generated' : 'vendored',
    }))
  })
  return [...ignored, ...generated]
}

function protection(rules, path) {
  const matches = new Map()
  for (const rule of rules) {
    if (rule.prefix && !path.startsWith(rule.prefix + '/')) continue
    const local = rule.prefix ? path.slice(rule.prefix.length + 1) : path
    const parts = local.split('/')
    const candidates = rule.type === 'ignored' ? parts.map((_, index) => parts.slice(0, index + 1).join('/'))
      .slice(0, rule.directory ? -1 : undefined) : [local]
    if (candidates.some(name => matchesGlob(rule.anchored ? name : name.split('/').at(-1), rule.pattern))) {
      matches.set(rule.type, !rule.negate)
    }
  }
  return [...matches].find(([, match]) => match)?.[0]
}

async function localProtection(project, directory) {
  const [ignore, attributes] = await Promise.all([
    readOptional(join(directory, '.gitignore')), readOptional(join(directory, '.gitattributes')),
  ])
  return parseProtection(ignore, attributes, portable(relative(project, directory)))
}

async function mercurialProtection(project) {
  const lines = ((await readOptional(join(project, '.hgignore'))) ?? '').split(/\r?\n/)
  const rules = []
  const patterns = []
  let syntax = 'regexp'
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('syntax:')) {
      syntax = line.slice(7).trim()
      if (!['regexp', 'glob'].includes(syntax)) throw new Error('Invalid ignore syntax in .hgignore: ' + syntax)
    } else if (syntax === 'glob') rules.push(...parseProtection(line, undefined, ''))
    else patterns.push(new RegExp(line))
  }
  return { rules, patterns }
}

async function scan(project, start, scanRoot, selected) {
  const changes = []
  const protectedFiles = []
  const parseErrors = []
  const hg = await mercurialProtection(project)
  async function inspect(directory, inherited) {
    const rules = [...inherited, ...await localProtection(project, directory)]
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name)
      if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
        await inspect(path, rules)
      } else if (entry.isFile() && sourceExtensions.has(extname(path))) {
        const name = portable(relative(start, path))
        const contained = portable(relative(project, path))
        const text = await readFile(path, 'utf8')
        const reason = protection(rules, contained) || (hg.patterns.some(pattern => pattern.test(contained)) ? 'ignored' : undefined)
          || (/^\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)\s*)+/.exec(text)?.[0]
            .match(/@(?:partially-)?generated\b|Code generated[^\n]*DO NOT EDIT\.?/i) ? 'generated' : undefined)
        let updated = text
        const codemods = []
        try {
          for (const migration of selected) {
            const next = await migration.transform(updated, path)
            if (typeof next !== 'string') throw new Error('Codemod must return a source string: ' + migration.name)
            if (next !== updated) codemods.push(migration.name)
            updated = next
          }
        } catch (error) {
          if (!reason) parseErrors.push({ file: name, error: error.message })
          continue
        }
        if (updated === text) continue
        if (reason) protectedFiles.push({ file: name, reason, codemods })
        else changes.push({ path, name, text, updated, codemods })
      }
    }
  }
  const parents = []
  for (let folder = scanRoot; folder !== project;) {
    folder = dirname(folder)
    parents.unshift(folder)
  }
  const inherited = await Promise.all(parents.map(folder => localProtection(project, folder)))
  await inspect(scanRoot, [...hg.rules, ...inherited.flat()])
  return { changes, protectedFiles, parseErrors }
}

export async function applyChanges(project, changes) {
  const pending = []
  const lock = join(project, '.syntrofic-upgrade.lock')
  const handle = await open(lock, 'wx')
  try {
    for (const change of changes) {
      let stats
      try { stats = await lstat(change.path) } catch (error) { if (error.code !== 'ENOENT') throw error }
      const invalid = () => new Error('Source changed during upgrade: ' + change.name)
      if (stats) {
        if (change.text === undefined || !stats.isFile() || await realpath(change.path) !== change.path) throw invalid()
        if (Buffer.isBuffer(change.text)) {
          if (!change.text.equals(await readFile(change.path))) throw invalid()
        } else if (await readFile(change.path, 'utf8') !== change.text) throw invalid()
      } else if (change.text !== undefined) {
        throw invalid()
      }
      if (!stats) {
        const parent = dirname(change.path)
        await mkdir(parent, { recursive: true })
        if (await realpath(parent) !== parent) throw new Error('The source path uses a symbolic link: ' + change.name)
      }
      const temp = change.path + '.syntrofic-' + randomUUID()
      pending.push({ ...change, temp })
      await writeFile(temp, change.updated, { mode: stats ? stats.mode & 0o777 : 0o666, flag: 'wx' })
    }
    for (const change of pending) {
      if (change.text === undefined) await link(change.temp, change.path)
      else await rename(change.temp, change.path)
    }
  } finally {
    await handle.close()
    await Promise.all(pending.map(change => rm(change.temp, { force: true })))
    await rm(lock, { force: true })
  }
}

export async function upgradeSources(directory, packageName, options) {
  const start = await realpath(directory)
  const project = options.integration || !options.list ? await findProject(start, packageName) : undefined
  const available = options.integration ? await integrationMigrations(project.path, options.integration)
    : packageName === '@syntrofic/ui' ? migrations : []
  if (options.list) {
    if (options.from || options.apply || options.path || options.force || options.codemod || options['skip-codemod']?.length) {
      throw new Error('--list cannot be combined with migration flags')
    }
    return { codemods: available.map(({ name, version, summary }) => ({ name, version, summary })) }
  }
  if (!options.from) throw new Error('Specify the previous version with --from')
  const from = version(options.from)
  const targetVersion = await installedVersion(project, packageName)
  const target = version(targetVersion)
  if (!options.force && compare(from, target) > 0) throw new Error('The previous version exceeds the installed version. Use --force to run the known migrations.')
  const known = new Set(available.map(migration => migration.name))
  for (const name of [options.codemod, ...(options['skip-codemod'] ?? [])].filter(Boolean)) {
    if (!known.has(name)) throw new Error('ERR_UNKNOWN_CODEMOD: ' + name)
  }
  const selected = available.filter(migration => {
    const at = version(migration.version)
    return (!options.codemod || migration.name === options.codemod) && !options['skip-codemod']?.includes(migration.name)
      && (options.force || compare(from, at) < 0) && compare(at, target) <= 0
  })
  const root = selected.length ? await sourceRoot(project.path, start, options.path) : null
  const { changes, protectedFiles, parseErrors } = root ? await scan(project.path, start, root, selected)
    : { changes: [], protectedFiles: [], parseErrors: [] }
  const valid = !protectedFiles.length && !parseErrors.length
  const dryRun = !options.apply || Boolean(options['dry-run'])
  const settings = await readProjectSettings(project.path)
  const postCodemod = hooks(settings.hooks?.postCodemod)
  const cli = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')).version
  const written = valid && !dryRun && changes.length > 0
  if (written) await applyChanges(project.path, changes)
  const hookResults = written ? await runHooks(project.path, changes, postCodemod) : []
  return {
    from: options.from, to: targetVersion, dryRun, valid: valid && hookResults.every(result => result.status === 'complete'), written,
    ...(compare(version(cli), target) < 0 && { cliBehindPackage: { version: cli, installed: targetVersion } }),
    source: root ? portable(relative(start, root)) || '.' : null, codemods: selected.map(migration => migration.name),
    files: changes.map(({ name, codemods }) => ({ file: name, codemods })), protectedFiles, parseErrors,
    ...(options.integration && { integration: options.integration }),
    ...(postCodemod.length && { hooks: written ? hookResults : postCodemod.map(({ name }) => ({ name, status: 'pending' })) }),
  }
}

function hooks(input = []) {
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4096 && !value.includes('\0')
  if (!Array.isArray(input) || input.some(hook => !hook || !text(hook.command)
    || hook.name !== undefined && !text(hook.name)
    || hook.args !== undefined && (!Array.isArray(hook.args) || !hook.args.every(text)))) {
    throw new Error('Set hooks.postCodemod to objects with a command and an optional args array')
  }
  return input.map(({ name, command, args = [] }) => ({ name: name ?? command, command, args }))
}

async function runHooks(directory, changes, hooks) {
  const files = changes.map(({ path }) => portable(relative(directory, path)))
  const results = []
  for (const { name, command, args } of hooks) {
    try {
      await run(command, args.flatMap(value => value === '{files}' ? files : [value]), { cwd: directory, timeout: 30000, maxBuffer: 1024 * 1024 })
      results.push({ name, status: 'complete' })
    } catch (error) {
      results.push({ name, status: 'failed', code: error.code ?? error.signal ?? 'unknown' })
      break
    }
  }
  return results
}

async function integrationMigrations(directory, name) {
  const owner = await installedAt(directory, name)
  if (!owner) throw new Error('Integration package is not installed: ' + name)
  const packageRoot = await realpath(owner.path)
  const manifest = await readJSON(join(packageRoot, 'syntrofic.integration.json'))
  if (manifest?.version !== 1 || manifest.package !== name || !Array.isArray(manifest.contributions)) throw new Error('Invalid integration manifest: ' + name)
  const resolved = []
  const names = new Set()
  for (const item of manifest.contributions) {
    if (item?.kind !== 'codemod') continue
    version(item.to)
    if (!/^[a-z][\w-]*$/i.test(item.id ?? '') || names.has(item.id) || typeof item.file !== 'string'
      || isAbsolute(item.file) || !item.file.endsWith('.mjs')) throw new Error('Invalid codemod in integration: ' + name)
    names.add(item.id)
    const file = await realpath(resolve(packageRoot, item.file))
    if (!subpath(packageRoot, file) || !(await lstat(file)).isFile()) throw new Error('Codemod must be a module inside its package: ' + item.id)
    let transform
    resolved.push({
      name: item.id, version: item.to, summary: item.description ?? item.id,
      async transform(source, path) {
        transform ??= (await import(pathToFileURL(file).href)).default
        if (typeof transform !== 'function') throw new Error('Codemod must export a transform: ' + item.id)
        return transform(source, { path, relativePath: portable(relative(directory, path)) })
      },
    })
  }
  return resolved.sort((a, b) => compare(version(a.version), version(b.version)))
}
