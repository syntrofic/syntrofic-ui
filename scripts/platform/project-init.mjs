import { createHash } from 'node:crypto'
import { lstat, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { projectAt, readJSON, readProjectSettings } from './project-discovery.mjs'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'

const features = ['agents', 'theme', 'template']
const begin = '<!-- syntrofic:start -->'
const finish = '<!-- syntrofic:end -->'
const templateCommands = ['syntrofic template list', 'syntrofic build "Describe the page"', 'syntrofic template add <id>']
const roots = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md', 'GEMINI.md', '.cursorrules', '.hermes.md', 'HERMES.md']
const agentNames = ['claude', 'codex', 'cursor', 'hermes', 'muse', 'all']
const skillsFile = 'syntrofic/SKILL.md'
const defaultSkills = ['.agents/skills/', '.claude/skills/']
const receiptName = 'syntrofic.init.json'
const hash = text => createHash('sha256').update(text).digest('hex')

function managedText(previous = '', text) {
  const start = previous.indexOf(begin)
  const end = previous.indexOf(finish)
  if ((start < 0) !== (end < 0) || end >= 0 && end < start) throw new Error('The Syntrofic guidance markers are incomplete')
  const block = text ? [begin, text, finish].join('\n') : ''
  const separator = !previous || previous.endsWith('\n\n') ? '' : previous.endsWith('\n') ? '\n' : '\n\n'
  if (start < 0) return block ? previous + separator + block + '\n' : previous
  const before = previous.slice(0, start)
  const after = previous.slice(end + finish.length)
  return block ? before + block + after : before.replace(/\n{2}$/, '\n') + after.replace(/^\r?\n/, '')
}

async function agentGuidance(directory) {
  const { searchableDocuments } = await import('./docs.mjs')
  const contributions = directory ? (await searchableDocuments(directory)).filter(item => item.route.startsWith('skills/') && item.route.split('/').length >= 3) : []
  return [
    '## Syntrofic UI',
    '',
    '- Follow `syntrofic docs design-rules/en` or `syntrofic docs design-rules` for the canvas, radius, density, and motion rules.',
    '- Use a white light-mode canvas, subtle local surfaces, and the library’s role-specific radius defaults. Leave page and template shells unframed.',
    '- Use one tinted layout surface for most sections and a second to distinguish a meaningful child area. Limit nested layout fills to two levels above the page canvas.',
    '- Render large shells in their final positions on the first visible frame. Ease state changes only within affected content.',
    '- Run `syntrofic component <name> --props` to inspect components and `syntrofic template list` for runnable layouts.',
    '- Keep keyboard focus visible inside each control. Use a single inset outline for composite fields. Preserve readable state announcements and reduced-motion behavior.',
    ...contributions.map(item => '- Read integration guidance with `syntrofic docs ' + item.route + '`.'),
  ].join('\n')
}

function skillText(guidance) {
  return '---\nname: syntrofic\ndescription: Build and review Vue and Native interfaces with Syntrofic UI.\n---\n\n'
    + managedText('', guidance)
}

async function safeFile(directory, name) {
  const path = relative(directory, resolve(directory, name))
  const allowed = local => local && !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep)
  if (!allowed(path) || path.split(sep).some(part => part === '.git' || part === 'node_modules')) throw new Error('Choose a file inside the project: ' + name)
  for (let cursor = dirname(resolve(directory, path)); ; cursor = dirname(cursor)) {
    try {
      const actual = relative(directory, await realpath(cursor))
      if (actual && !allowed(actual)) throw new Error('Choose a file inside the project: ' + name)
      break
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return path
}

async function existing(directory, file) {
  try { return (await lstat(resolve(directory, file))).isFile() }
  catch (error) { if (error.code !== 'ENOENT') throw error; return false }
}

async function agentFiles(directory, options) {
  if (options['agent-docs-path']?.length) return options['agent-docs-path']
  const enabled = new Set((await Promise.all(roots.map(async file => await existing(directory, file) && file))).filter(Boolean))
  const claude = !enabled.has('CLAUDE.md') && enabled.has('.claude/CLAUDE.md') ? '.claude/CLAUDE.md' : 'CLAUDE.md'
  const tool = options.agent
  if (!tool) return ['AGENTS.md', claude, 'GEMINI.md']
  if (tool === 'all') return [...new Set(['AGENTS.md', claude, 'GEMINI.md', ...enabled])]
  if (tool === 'cursor' && enabled.has('.cursorrules')) return ['.cursorrules']
  if (tool === 'hermes') return [enabled.has('.hermes.md') ? '.hermes.md' : enabled.has('HERMES.md') ? 'HERMES.md' : 'AGENTS.md']
  return [tool === 'claude' ? claude : 'AGENTS.md']
}

async function initializeUser(options) {
  if (options.features || options.all || options.agent || options['agent-docs-path'] || options.once) {
    throw new Error('Computer-level setup takes only --user, --remove and --dry-run')
  }
  const override = process.env.SYNTROFIC_USER_DIR
  const directory = await realpath(override ?? homedir())
  const file = await safeFile(directory, (override ? 'skills/' : '.agents/skills/') + skillsFile)
  const previous = await readThemeOutput(resolve(directory, file))
  const stamp = /<!-- syntrofic:sha256 ([0-9a-f]{64}) -->\n$/
  const contents = options.remove ? undefined : skillText(await agentGuidance())
  const expected = contents && contents + '<!-- syntrofic:sha256 ' + hash(contents) + ' -->\n'
  const previousIsManaged = previous && stamp.exec(previous)?.[1] === hash(previous.replace(stamp, ''))
  const readOnly = previous !== undefined && !previousIsManaged
  const updates = previous === expected || readOnly ? [] : [{ file, previous, expected }]
  if (!options['dry-run'] && updates.length) await writeThemeOutputs(directory, updates)
  return { directory, mode: 'user', files: updates.map(update => update.file), protected: readOnly ? [file] : [],
    written: !options['dry-run'] && updates.length > 0 }
}

export async function initializeProject(directory, options) {
  options = { ...options, remove: options.remove || options['remove-agents'] }
  const chosen = options.to === undefined ? undefined : [...new Set(options.to.split(',').map(part => part.trim()))]
  if (chosen?.some(place => !place)) throw new Error('Choose one or more skill destinations')
  if (options.user || chosen?.includes('user')) {
    if (chosen?.some(place => place !== 'user')) throw new Error('Choose the computer-level skill separately')
    return initializeUser(options)
  }
  if (options.agent && !agentNames.includes(options.agent) && !options['agent-docs-path']?.length) throw new Error('Unknown agent: ' + options.agent)
  const explicit = options.features || options.all || options.remove || chosen || options.agent || options['agent-docs-path'] || options.once
  const start = await realpath(directory).catch(error => { if (error.code !== 'ENOENT') throw error })
  const project = start && await projectAt(start)
  const manifest = project && await readJSON(resolve(project.directory, 'package.json'))
  if (!manifest && !explicit) return
  if (!manifest) throw new Error('Choose a project containing package.json, or specify a starter framework')
  directory = project.directory
  const settings = await readProjectSettings(directory)
  const savedDestination = settings.skills?.to
  const configured = typeof savedDestination === 'string' ? [savedDestination] : savedDestination
  if (configured !== undefined && (!Array.isArray(configured) || configured.some(place => typeof place !== 'string' || !place || place === 'user'))) {
    throw new Error('Set skills.to to project destinations, and use --user for computer-level setup')
  }
  if (options.features && options.all || options.remove && (options.features || options.all)) throw new Error('Choose --features, --all or --remove')
  if (options.once && (!chosen || chosen.includes('agents-md') || options.remove)) throw new Error('Choose a new skill folder with --to and --once')
  const selected = options.all ? features : options.features ? [...new Set(options.features.split(',').map(value => value.trim()))] : ['agents']
  if (selected.some(feature => !features.includes(feature))) throw new Error('Choose features from agents, theme and template')
  const updates = []
  const retained = []
  async function plan(file, update) {
    file = await safeFile(directory, file)
    const previous = await readThemeOutput(resolve(directory, file))
    const expected = update(previous)
    if (expected !== previous && (expected || previous !== undefined)) updates.push({ file, expected, previous })
  }
  if (selected.includes('agents')) {
    const receipt = await readJSON(resolve(directory, receiptName)) ?? { version: 1, places: ['agents-md'], skills: {} }
    if (receipt.version !== 1 || !Array.isArray(receipt.places) || !receipt.skills || typeof receipt.skills !== 'object'
      || receipt.documents !== undefined && !Array.isArray(receipt.documents)) throw new Error('Invalid skill destinations')
    const old = receipt.places
    const places = options.remove ? old.filter(place => chosen && !chosen.includes(place))
      : options.once ? old : chosen ?? configured ?? (old.length ? old : ['agents-md'])
    const active = options.once ? chosen : places
    if (options.once && active.some(place => old.includes(place))) throw new Error('A saved skill destination already uses that folder')
    const guidance = options.remove ? undefined : await agentGuidance(directory)
    const before = old.includes('agents-md')
    const after = active.includes('agents-md')
    let documents = receipt.documents ?? []
    if (options.remove && (!chosen || chosen.includes('agents-md')) || before && !after && !options.once && !options.remove) {
      for (const file of new Set([...roots, ...documents])) await plan(file, previous => managedText(previous))
      documents = []
    } else if (after && !options.remove) {
      const files = await agentFiles(directory, options)
      const normalized = await Promise.all(files.map(file => safeFile(directory, file)))
      for (const file of new Set(normalized)) {
        const reference = (file === 'GEMINI.md' || file === 'CLAUDE.md') && normalized.includes('AGENTS.md')
        await plan(file, previous => reference && !previous?.includes(begin) && /^@AGENTS\.md\s*$/m.test(previous ?? '')
          ? previous : managedText(previous, reference ? '@AGENTS.md' : guidance))
      }
      documents = [...new Set([...documents, ...normalized.filter(file => !roots.includes(file))])]
    }
    const allSkillFiles = places => places.filter(place => place !== 'agents-md').flatMap(place => place === 'skills'
      ? defaultSkills.map(folder => folder + skillsFile) : [resolve(directory, place, 'SKILL.md')])
    const desired = new Set(await Promise.all(allSkillFiles(active).map(file => safeFile(directory, file))))
    const next = { version: 1, places, skills: { ...receipt.skills }, ...(documents.length && { documents }) }
    if (!options.once) for (const [file, digest] of Object.entries(receipt.skills)) {
      if (desired.has(file)) continue
      await plan(file, previous => {
        if (previous === undefined || hash(previous) === digest) return undefined
        retained.push(file)
        return previous
      })
      delete next.skills[file]
    }
    if (!options.remove) for (const file of desired) {
      await plan(file, previous => {
        const output = skillText(guidance)
        if (previous !== undefined && receipt.skills[file] !== hash(previous) && previous !== output) {
          retained.push(file)
          return previous
        }
        if (!options.once) next.skills[file] = hash(output)
        return output
      })
    }
    if (!options.once && (chosen || configured || receipt.documents || documents.length || Object.keys(receipt.skills).length || old.some(place => place !== 'agents-md'))) {
      await plan(receiptName, () => JSON.stringify(next, null, 2) + '\n')
    }
  }
  if (selected.includes('theme')) {
    const { createBrandTheme } = await import('@syntrofic/ui')
    const { themeTemplateSource } = await import('./theme-descriptor.mjs')
    await plan('theme.template.ts', previous => previous ?? themeTemplateSource(createBrandTheme('studio', 'Studio')))
  }
  if (!options['dry-run'] && updates.length) await writeThemeOutputs(directory, updates)
  return { directory, mode: 'project', features: selected, files: updates.map(update => update.file), written: !options['dry-run'] && updates.length > 0,
    ...(retained.length && { protected: retained }),
    ...(selected.includes('template') && { commands: templateCommands }) }
}
