import assert from 'node:assert/strict'
import { execFile, spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))

function upgrade(directory, ...flags) {
  return invoke(directory, 'upgrade', ...flags)
}

function invoke(directory, name, ...flags) {
  const command = spawnSync(process.execPath, [cli, name, ...flags], { cwd: directory, encoding: 'utf8' })
  if (command.error) throw command.error
  return { status: command.status, result: command.stdout ? JSON.parse(command.stdout) : undefined, error: command.stderr }
}

test('the blog command lists the published feed and reads a post from it', async () => {
  const post = { id: 'studio-update', title: 'Studio update', date: '2026-11-21', description: 'Release summary', body: 'Full release note' }
  const server = createServer((request, response) => {
    if (request.url !== '/blog/feed.json') { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([post]))
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = 'http://127.0.0.1:' + server.address().port
  const run = promisify(execFile)
  const blog = (path, ...params) => run(process.execPath, [cli, 'blog', ...params, '--source', base + path, '--json'])
  try {
    const listed = JSON.parse((await blog('/blog/feed.json')).stdout)
    const { body, ...summary } = post
    assert.deepEqual(listed, [summary])
    assert.equal(JSON.parse((await blog('/blog/feed.json', post.id)).stdout).body, body)
    await assert.rejects(blog('/blog/feed.json', 'missing'), /Unknown release note/)
    await assert.rejects(blog('/missing'), /HTTP 404/)
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

test('project init manages guidance and theme features while preserving authored files', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-project-init-'))
  const agents = join(project, 'AGENTS.md')
  const claude = join(project, 'CLAUDE.md')
  const authored = '# Review project\n\n- Keep the local approval checklist.\n'
  try {
    await Promise.all([writeFile(join(project, 'package.json'), '{"name":"review"}'), writeFile(agents, authored), writeFile(claude, '# Local instructions\n')])
    const init = (...args) => invoke(project, 'init', ...args, '--json')
    assert.equal(init('--features', 'missing').status, 1)
    const dry = init('--all', '--dry-run')
    assert.equal(dry.status, 0, dry.error)
    assert.deepEqual(dry.result.features, ['agents', 'theme', 'template'])
    assert.equal(await readFile(agents, 'utf8'), authored)
    const ready = init('--all')
    assert.equal(ready.status, 0, ready.error)
    assert.ok(ready.result.commands.includes('syntrofic template list'))
    assert.match(await readFile(join(project, 'theme.template.ts'), 'utf8'), /#ffffff/)
    assert.match(await readFile(agents, 'utf8'), /<!-- syntrofic:start -->/)
    assert.match(await readFile(claude, 'utf8'), /@AGENTS\.md/)
    assert.equal(init('--all').result.written, false)
    assert.equal(init('--remove').status, 0)
    assert.equal(await readFile(agents, 'utf8'), authored)
    assert.equal(await readFile(claude, 'utf8'), '# Local instructions\n')
    assert.match(await readFile(join(project, 'theme.template.ts'), 'utf8'), /satisfies BrandTheme/)
    const nested = join(project, 'src')
    await mkdir(nested)
    const custom = invoke(nested, 'init', '--agent-docs-path', 'docs/components.md', '--json')
    assert.equal(custom.status, 0, custom.error)
    assert.equal(custom.result.directory, await realpath(project))
    assert.match(await readFile(join(project, 'docs/components.md'), 'utf8'), /syntrofic:start/)
    assert.equal(init('--agent-docs-path', '../not-in-project.md').status, 1)
    assert.equal(init('--remove-agents').status, 0)
    assert.equal(await readFile(join(project, 'docs/components.md'), 'utf8'), '')
    assert.equal(init('--to', 'skills').status, 0)
    const skill = join(project, '.agents/skills/syntrofic/SKILL.md')
    assert.match(await readFile(skill, 'utf8'), /name: syntrofic/)
    assert.equal(init('--to', './bundle', '--once').status, 0)
    const oneOff = await readFile(join(project, 'bundle/SKILL.md'), 'utf8')
    assert.match(oneOff, /name: syntrofic/)
    await writeFile(skill, '# Updated by hand\n')
    const removed = init('--remove', '--to', 'skills')
    assert.equal(removed.status, 0, removed.error)
    assert.deepEqual(removed.result.protected, ['.agents/skills/syntrofic/SKILL.md'])
    assert.equal(await readFile(skill, 'utf8'), '# Updated by hand\n')
    await assert.rejects(readFile(join(project, '.claude/skills/syntrofic/SKILL.md')), { code: 'ENOENT' })
    assert.equal(await readFile(join(project, 'bundle/SKILL.md'), 'utf8'), oneOff)
    const user = join(project, 'user-fixture')
    await mkdir(user)
    const userInit = (...args) => spawnSync(process.execPath, [cli, 'init', '--user', ...args, '--json'],
      { cwd: project, env: { ...process.env, SYNTROFIC_USER_DIR: user }, encoding: 'utf8' })
    assert.equal(userInit().status, 0)
    const userSkill = join(user, 'skills/syntrofic/SKILL.md')
    assert.match(await readFile(userSkill, 'utf8'), /name: syntrofic/)
    assert.equal(userInit('--remove').status, 0)
    await assert.rejects(readFile(userSkill), { code: 'ENOENT' })
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('doctor resolves the app from a subdirectory and checks registries, guidance and built controls', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-project-doctor-'))
  const source = join(project, 'src')
  try {
    await mkdir(source)
    await mkdir(join(project, 'dist'))
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"doctor-test","dependencies":{"@syntrofic/ui":"0.1.0","vue":"3.5.45"}}'),
      writeFile(join(project, 'AGENTS.md'), '<!-- syntrofic:start -->\n# Local UI\n<!-- syntrofic:end -->\n'),
      writeFile(join(project, 'syntrofic.themes.json'), '{"version":1,"active":"studio","themes":[{"id":"studio"}]}'),
      writeFile(join(source, 'App.vue'), `<script setup>
import { SButton as Action } from '@syntrofic/ui'
const save = () => true
</script><template><Action>Idle</Action><Action varient="secondary" @click="save">Save</Action><SButton type="submit">Submit</SButton></template>`),
      writeFile(join(project, 'dist', 'index.html'), '<button class="sy-button">Save</button><input aria-label="Name">'),
    ])
    const doctor = (...args) => invoke(source, 'doctor', '--built', '../dist', ...args, '--json')
    const report = doctor()
    assert.equal(report.status, 0, report.error)
    assert.equal(report.result.directory, await realpath(project))
    assert.equal(report.result.themes.active, 'studio')
    assert.equal(report.result.guidance.managed, true)
    assert.equal(report.result.built.pages, 1)
    assert.equal(report.result.warnings.filter(issue => issue.includes('without a visible action binding')).length, 1)
    assert.match(report.result.warnings.join('\n'), /Action uses varient\. Did you mean variant\?/)
    assert.match(report.result.warnings.join('\n'), /Raw control in build: index.html <input>/)
    assert.equal(doctor('--strict').status, 1)
    await writeFile(join(project, 'syntrofic.themes.json'), '{"version":1,"active":"missing","themes":[]}')
    const invalid = doctor()
    assert.equal(invalid.status, 1)
    assert.match(invalid.result.errors[0], /active entry is unavailable/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('MCP advertises typed CLI tools and preserves command output and errors', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-cli-mcp-'))
  const nested = join(project, 'nested')
  const request = (name, args) => ['tools/call', { name, arguments: args }]
  function exchange(commands, flags = []) {
    const input = commands.map(([method, params], id) => JSON.stringify({ jsonrpc: '2.0', id, method, params })).join('\n') + '\n'
    const processResult = spawnSync(process.execPath, [cli, 'mcp', ...flags], { cwd: project, input, encoding: 'utf8' })
    assert.equal(processResult.status, 0, processResult.stderr)
    return processResult.stdout.trim().split('\n').map(line => JSON.parse(line))
  }
  try {
    await mkdir(nested)
    await symlink(tmpdir(), join(project, 'outside'))
    const [initialize, list, hook, skeleton, scoped, escaped, linked, invalid, wrongType, deniedGap, commandError] = exchange([
      ['initialize', { protocolVersion: '2025-06-18' }], ['tools/list'],
      request('hook', { name: 'useResizable', params: true }),
      request('template', { name: 'dashboard-progress', skeleton: true }),
      request('init', { framework: 'nuxt', cwd: 'nested', 'dry-run': true }),
      request('template_list', { cwd: '..' }), request('template_list', { cwd: 'outside' }),
      request('template', { json: true }), request('search', { query: 'dashboard' }),
      request('theme_build', { path: 'theme.css' }), request('hook', { name: 'doesNotExist' }),
    ])
    assert.equal(initialize.result.protocolVersion, '2025-06-18')
    const tools = new Map(list.result.tools.map(tool => [tool.name, tool]))
    assert.equal(tools.size, list.result.tools.length)
    assert.equal(tools.get('theme_build').inputSchema.properties.id.type, 'string')
    assert.equal(tools.get('theme_build').inputSchema.additionalProperties, false)
    assert.equal(tools.get('hook').inputSchema.properties.json, undefined)
    const direct = spawnSync(process.execPath, [cli, 'hook', 'useResizable', '--params', '--json'], { cwd: project, encoding: 'utf8' })
    assert.equal(hook.result.content[0].text, direct.stdout)
    assert.equal(JSON.parse(skeleton.result.content[0].text).template, 'dashboard-progress')
    assert.equal(JSON.parse(scoped.result.content[0].text).directory, await realpath(nested))
    assert.ok([escaped, linked, invalid, wrongType, deniedGap, commandError].every(response => response.result.isError))
    assert.match(commandError.result.content[0].text, /doesNotExist/)

    const [publicList, noInit, noCwd, noExport, preview] = exchange([
      ['tools/list'], request('init', {}), request('template', { cwd: 'nested' }), request('docs', { topic: 'export' }),
      request('build', { description: ['dashboard', 'progress'] }),
    ], ['--docs-only'])
    assert.equal(publicList.result.tools.some(tool => tool.name === 'init'), false)
    const template = publicList.result.tools.find(tool => tool.name === 'template')
    assert.equal(template.annotations.readOnlyHint, true)
    assert.ok(!template.inputSchema.properties.cwd && !template.inputSchema.properties.path && !template.inputSchema.properties.package)
    assert.equal(noInit.error.code, -32601)
    assert.ok(noCwd.result.isError && noExport.result.isError)
    assert.equal(JSON.parse(preview.result.content[0].text).template, 'dashboard-progress')
    await assert.rejects(readFile(join(project, 'dashboard-progress', 'package.json')), { code: 'ENOENT' })

    const json = spawnSync(process.execPath, [cli, 'mcp', '--json'], { cwd: project, encoding: 'utf8', input: '' })
    assert.equal(json.status, 1)
    assert.equal(json.stdout, '')
    assert.match(json.stderr, /protocol/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('upgrade previews scoped syntax changes and applies them without rewriting aliases, comments or symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'syntrofic-source-upgrade-'))
  try {
    const installed = join(root, 'node_modules', '@syntrofic/ui')
    const src = join(root, 'src')
    const nested = join(src, 'views')
    await Promise.all([mkdir(installed, { recursive: true }), mkdir(nested, { recursive: true })])
    const original = `<script setup lang="ts">
// import { Code } from '@syntrofic/ui'
import { /* preserve */ Code, Image as Preview } from '@syntrofic/ui'
const literal = "import { User } from '@syntrofic/ui'"
</script>
<template><Code /><Preview /></template>
`
    const file = join(nested, 'Demo.vue')
    const protectedFile = join(src, 'generated.ts')
    const ignoredFile = join(src, 'draft.ts')
    const unchanged = "import { User } from '@syntrofic/ui'\n"
    const outsideSource = join(root, 'outside.ts')
    await Promise.all([
      writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture', dependencies: { '@syntrofic/ui': '^0.1.0' } })),
      writeFile(join(installed, 'package.json'), '{"name":"@syntrofic/ui","version":"0.1.0"}'),
      writeFile(file, original),
      writeFile(join(root, '.gitignore'), '/src/draft.ts\n'),
      writeFile(protectedFile, '// @generated\n' + unchanged),
      writeFile(ignoredFile, unchanged),
      writeFile(outsideSource, unchanged),
    ])
    await symlink(outsideSource, join(nested, 'linked.ts'))
    const listed = upgrade(root, '--list', '--json')
    assert.equal(listed.status, 0)
    assert.equal(listed.result.codemods[0].name, 'legacy-component-imports')

    const blocked = upgrade(root, '--from', '0.0.9', '--apply')
    assert.equal(blocked.status, 1, blocked.error)
    assert.deepEqual(blocked.result.protectedFiles.map(({ reason }) => reason), ['ignored', 'generated'])
    assert.equal(await readFile(file, 'utf8'), original)

    const preview = upgrade(nested, '--from', '0.0.9', '--path', '.')
    assert.equal(preview.status, 0, preview.error)
    assert.deepEqual(preview.result.files, [{ file: 'Demo.vue', codemods: ['legacy-component-imports'] }])
    assert.equal(preview.result.dryRun, true)
    assert.equal(await readFile(file, 'utf8'), original)

    const escaped = upgrade(root, '--from', '0.0.9', '--path', 'node_modules')
    assert.equal(escaped.status, 1)
    assert.match(escaped.error, /inside the project/)

    const applied = upgrade(root, '--from', '0.0.9', '--path', 'src/views', '--apply')
    assert.equal(applied.status, 0, applied.error)
    assert.equal(applied.result.written, true)
    assert.equal(await readFile(file, 'utf8'), original.replace('Code, Image as Preview', 'SCode as Code, SImage as Preview'))
    assert.equal(await readFile(outsideSource, 'utf8'), unchanged)
    assert.deepEqual(upgrade(root, '--from', '0.0.9', '--path', 'src/views', '--apply').result.files, [])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('copied components accept non-overlapping upstream updates and leave overlapping edits on disk', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-component-upgrade-'))
  try {
    await writeFile(join(project, 'package.json'), '{"name":"fixture"}')
    const available = invoke(project, 'swizzle', '--list')
    assert.equal(available.status, 0, available.error)
    const button = available.result.find(entry => entry.component === 'SButton')
    assert.ok(button)
    const result = invoke(project, 'swizzle', button.id, '--output', 'ui')
    assert.equal(result.status, 0, result.error)
    assert.ok(result.result.files.includes('src/styles/tokens.css'))
    const path = join(project, 'ui', result.result.entry)
    const receiptPath = join(project, 'ui', `syntrofic-swizzle-${button.id}.json`)
    const upstream = await readFile(path, 'utf8')
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
    const base = upstream.replace('<script setup lang="ts">', '<script setup lang="ts">\n// This line was removed upstream.')
    receipt.bases[result.result.entry] = base
    await writeFile(receiptPath, JSON.stringify(receipt))
    const local = base + '<!-- Local styling guidance. -->\n'
    await writeFile(path, local)
    const dryRun = upgrade(project, '--registry')
    assert.equal(dryRun.status, 0, dryRun.error)
    assert.equal(dryRun.result.upgrades[0].files.find(file => file.file.endsWith('/SButton.vue')).status, 'merged')
    assert.equal(await readFile(path, 'utf8'), local)
    const applied = upgrade(project, '--registry', '--apply')
    assert.equal(applied.status, 0, applied.error)
    assert.equal(await readFile(path, 'utf8'), upstream + '<!-- Local styling guidance. -->\n')

    receipt.bases[result.result.entry] = base
    const conflicting = base.replace('This line was removed upstream.', 'This line was updated locally.')
    await writeFile(receiptPath, JSON.stringify(receipt))
    await writeFile(path, conflicting)
    const conflict = upgrade(project, '--registry', '--apply')
    assert.equal(conflict.status, 1)
    assert.equal(conflict.result.upgrades[0].files.find(file => file.file.endsWith('/SButton.vue')).status, 'conflict')
    assert.equal(await readFile(path, 'utf8'), conflicting)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('swizzle finds a replacement package and refreshes its binary asset without overwriting local edits', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-swizzle-integration-'))
  const integration = join(project, 'node_modules', '@review', 'actions')
  const relativeAsset = 'integrations/review--actions/icon.png'
  const localAsset = join(project, 'custom', relativeAsset)
  const source = '<script setup lang="ts">\nimport icon from "./icon.png"\n</script><template><button><img :src="icon" alt="">Review</button></template>'
  try {
    await mkdir(integration, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"swizzle-test","dependencies":{"@review/actions":"1.0.0"}}'),
      writeFile(join(integration, 'package.json'), '{"name":"@review/actions","version":"1.0.0"}'),
      writeFile(join(integration, 'syntrofic.integration.json'), JSON.stringify({ version: 1, package: '@review/actions', contributions: [
        { id: 'ReviewAction', kind: 'component', file: 'ReviewAction.vue', replaces: 'SButton' },
      ] })),
      writeFile(join(integration, 'ReviewAction.vue'), source),
      writeFile(join(integration, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 1])),
    ])
    const options = invoke(project, 'swizzle', '--list', '--json')
    assert.deepEqual(options.result.find(item => item.component === 'SButton').replacements, ['@review/actions/ReviewAction'])
    const copied = invoke(project, 'swizzle', 'SButton', '--output', 'custom', '--json')
    assert.equal(copied.status, 0, copied.error)
    assert.equal(copied.result.package, '@review/actions')
    assert.equal(await readFile(join(project, 'custom', copied.result.entry), 'utf8'), source)
    const core = invoke(project, 'swizzle', 'SButton', '--package', '@syntrofic/ui', '--dry-run', '--json')
    assert.equal(core.result.entry, 'src/components/SButton.vue')

    const next = Buffer.from([0x89, 0x50, 0x4e, 0x47, 2])
    await writeFile(join(integration, 'icon.png'), next)
    const updated = upgrade(project, '--registry', '--apply')
    assert.equal(updated.status, 0, updated.error)
    assert.deepEqual(await readFile(localAsset), next)
    const local = Buffer.from([0x89, 0x50, 0x4e, 0x47, 3])
    await writeFile(localAsset, local)
    await writeFile(join(integration, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 4]))
    const conflict = upgrade(project, '--registry', '--apply')
    assert.equal(conflict.status, 1)
    assert.equal(conflict.result.upgrades[0].files.find(item => item.file.endsWith('/icon.png')).status, 'conflict')
    assert.deepEqual(await readFile(localAsset), local)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('CLI search ranks and filters several content domains and advertises their response schema', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-cli-search-'))
  try {
    await writeFile(join(project, 'package.json'), '{"name":"fixture"}')
    const ranked = invoke(project, 'search', 'dashboard', 'progress', '--type', 'template', '--limit', '1', '--json')
    assert.equal(ranked.status, 0, ranked.error)
    assert.equal(ranked.result[0].id, 'dashboard-progress')
    assert.equal(ranked.result[0].command, 'syntrofic template info dashboard-progress')
    assert.equal(ranked.result[0].name, '排期与进度')
    assert.equal(invoke(project, 'search', 'focus trap', '--type', 'hook', '--json').result[0].id, 'useFocusTrap')
    assert.equal(invoke(project, 'search', 'motion', '--type', 'doc', '--limit', '1', '--json').result[0].type, 'doc')
    assert.equal(invoke(project, 'search', 'neutral', '--type', 'theme', '--json').result[0].id, 'neutral')
    assert.equal(invoke(project, 'search', 'button', '--limit', '0', '--json').status, 1)
    const manifest = invoke(project, 'manifest', '--json').result
    const search = manifest.commands.find(entry => entry.name === 'search')
    assert.ok(search.flags.some(flag => flag.name === '--limit'))
    assert.ok(search.response.items.required.includes('command'))
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('component reference inspects Vue props and resolves ordered and versioned integration requests', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-cli-component-'))
  try {
    const extension = join(project, 'node_modules', '@review/ui')
    await mkdir(extension, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"fixture","dependencies":{"@review/ui":"1.2.0"}}'),
      writeFile(join(extension, 'package.json'), '{"name":"@review/ui","version":"1.2.0"}'),
      writeFile(join(extension, 'syntrofic.integration.json'), JSON.stringify({ version: 1, contributions: [
        { id: 'ReviewButton', kind: 'component', file: 'ReviewButton.vue', replaces: 'Button', description: 'Start a review' },
        { id: 'LinkedButton', kind: 'component', file: 'LinkedButton.vue' },
      ] })),
      writeFile(join(extension, 'ReviewButton.vue'), '<script setup lang="ts">defineProps<{ label: string }>()</script>\n<template><button>{{ label }}<slot name="end" /></button></template>'),
      writeFile(join(project, 'private.vue'), 'outside'),
    ])
    await symlink(join(project, 'private.vue'), join(extension, 'LinkedButton.vue'))

    const batch = invoke(project, 'component', 'Button', 'SBadge', '--json')
    assert.equal(batch.status, 0, batch.error)
    assert.deepEqual(batch.result.map(({ component }) => component), ['ReviewButton', 'SBadge'])
    assert.deepEqual(batch.result[0].props, [{ name: 'label', type: 'String', required: true }])
    assert.deepEqual(batch.result[0].blocks.slots, ['end'])
    assert.ok(batch.result[0].usage.includes('import { ReviewButton } from "@review/ui"'))
    const original = invoke(project, 'component', '@syntrofic/ui/Button', '--props', '--json')
    assert.equal(original.status, 0, original.error)
    assert.equal(original.result.props.find(prop => prop.name === 'type').default, "'button'")
    assert.equal(original.result.props.find(prop => prop.name === 'loading').type, 'Boolean')

    const source = invoke(project, 'component', '@review/ui@1.2.0/ReviewButton', '--source', '--json')
    assert.match(source.result.source, /defineProps/)
    assert.equal(invoke(project, 'component', '@review/ui@1.3.0/ReviewButton', '--json').status, 1)
    const linked = invoke(project, 'component', 'LinkedButton', '--source', '--json')
    assert.equal(linked.status, 1)
    assert.match(linked.error, /outside its package/)
    const category = invoke(project, 'component', '--category', 'Buttons', '--json')
    assert.ok(category.result.length && category.result.every(entry => entry.category === 'Buttons' && entry.id !== 'W.button'))
    assert.ok(category.result.some(entry => entry.id === 'ReviewButton'))
    const list = invoke(project, 'component', '--list', '--json')
    assert.ok(list.result.some(entry => entry.id === 'ReviewButton'))
    const manifest = invoke(project, 'manifest', '--json').result
    assert.equal(manifest.commands.find(command => command.name === 'component').flags.find(flag => flag.name === '--source').type, 'boolean')
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('the capability manifest documents positional arguments and hooks have readable and machine forms', () => {
  const manifest = invoke(tmpdir(), 'manifest', '--json')
  assert.equal(manifest.status, 0, manifest.error)
  const commands = new Map(manifest.result.commands.map(command => [command.name, command]))
  assert.deepEqual(commands.get('install-pro').arguments.map(item => [item.name, item.required]), [['registry', true], ['version', true]])
  assert.deepEqual(commands.get('integration').subcommandDetails.find(item => item.name === 'add').arguments.map(item => item.name), ['kind', 'name'])
  assert.equal(invoke(tmpdir(), '--json').result.type, 'help')
  assert.deepEqual(invoke(tmpdir(), '--json').result.data.manifest, manifest.result)

  const hooks = invoke(tmpdir(), 'hook', '--list', '--category', 'calendar', '--json')
  assert.equal(hooks.status, 0, hooks.error)
  assert.deepEqual(hooks.result.map(item => item.name), ['useCalendarConstraints', 'useCalendarDays', 'useCalendarNavigation'])
  const params = invoke(tmpdir(), 'hook', 'useResizable', '--params', '--json')
  assert.equal(params.status, 0, params.error)
  assert.deepEqual(params.result.parameters, ['options'])
  assert.match(params.result.parameterDetails[0].description, /collapse/)
  assert.equal(invoke(tmpdir(), 'hook', '--category', 'missing', '--json').status, 1)
  const formatted = spawnSync(process.execPath, [cli, 'hook', '--list', '--category', 'calendar'], { cwd: tmpdir(), encoding: 'utf8' })
  assert.equal(formatted.status, 0, formatted.stderr)
  assert.match(formatted.stdout, /^calendar\n  useCalendarConstraints\n/m)
})

test('docs resolve sections below a namespace and find project, user and installed integration guides', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-docs-tree-'))
  const user = join(project, 'user-settings')
  const nested = join(project, 'src')
  const integration = join(project, 'node_modules', '@review/ui')
  try {
    await Promise.all([mkdir(nested), mkdir(user), mkdir(integration, { recursive: true })])
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"fixture","dependencies":{"@review/ui":"1.2.0"}}'),
      writeFile(join(project, 'AGENTS.md'), '# Project guidance\n\n## Review checks\n\nProject commands.'),
      writeFile(join(user, 'AGENTS.md'), '# Personal conventions\n\nUser commands.'),
      writeFile(join(integration, 'package.json'), '{"name":"@review/ui","version":"1.2.0"}'),
      writeFile(join(integration, 'syntrofic.integration.json'), JSON.stringify({ version: 1, contributions: [
        { id: 'ReviewNotes', kind: 'agent-doc', file: 'ReviewNotes.md' },
        { id: 'Setup', kind: 'doc', file: 'Setup.md' },
        { id: 'Linked', kind: 'doc', file: 'Linked.md' },
      ] })),
      writeFile(join(integration, 'ReviewNotes.md'), '# Review notes\n\nIntegration instructions.'),
      writeFile(join(integration, 'Setup.md'), '# Setup\n\n## Suggested commands\n\nRun the review script.'),
    ])
    await symlink(join(user, 'AGENTS.md'), join(integration, 'Linked.md'))
    function docs(...flags) {
      const result = spawnSync(process.execPath, [cli, 'docs', ...flags, '--json'], { cwd: nested, encoding: 'utf8',
        env: { ...process.env, SYNTROFIC_USER_DIR: user } })
      return { status: result.status, data: result.stdout && JSON.parse(result.stdout), error: result.stderr }
    }
    assert.match(docs('skills/user').data.markdown, /Personal conventions/)
    assert.match(docs('skills/syntrofic').data.markdown, /Project guidance/)
    assert.match(docs('skills/reviewnotes').data.markdown, /Integration instructions/)
    assert.equal(docs('skills', 'Review checks').data.route, 'skills/project')
    const section = docs('authoring', '校验集成包')
    assert.equal(section.data.route, 'authoring/quick-start')
    assert.match(section.data.markdown, /syntrofic integration/)
    const guide = docs('integrations/@review/ui/Setup', 'suggested-commands')
    assert.match(guide.data.markdown, /Run the review script/)
    assert.match(docs('integrations/@review/ui/Linked').error, /outside its package/)
    assert.equal(docs('--depth', 'all').data.find(entry => entry.route === 'skills/@review/ui/ReviewNotes').title, 'ReviewNotes')
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('palette generation preserves stops and exact anchors and writes review files without overwriting by default', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-palette-'))
  try {
    const input = {
      recipe: 'syntrofic-oklch-v2', modeStrategy: 'light-and-dark', stops: [12.5, 50, 75, 100], vibrancy: 30,
      families: [{ id: 'studio', name: '<Studio>', seed: '#365c4a', anchors: [
        { mode: 'light', stop: 75, policy: 'exact', color: '#AACDB9' },
        { mode: 'dark', stop: 12.5, policy: 'bounded', color: '#26342f', maxDeltaE: 0 },
      ] }],
    }
    await writeFile(join(project, 'palette.json'), JSON.stringify(input))
    const run = (...extra) => invoke(project, 'theme', 'palette', 'generate', 'palette.json', ...extra, '--json')
    const preview = run()
    assert.equal(preview.status, 0, preview.error)
    const { palette } = preview.result.data
    assert.deepEqual(palette.stops, [12.5, 50, 75, 100])
    assert.deepEqual(palette.families[0].modes.light.slice(1), [
      { stop: 50, color: '#365c4a' }, { stop: 75, color: '#aacdb9' }, { stop: 100, color: '#ffffff' },
    ])
    assert.deepEqual(palette.families[0].modes.dark[0], { stop: 12.5, color: '#26342f' })
    assert.equal(preview.result.data.written, false)
    const create = run('--out', 'studio.ts', '--preview', 'review.html')
    assert.equal(create.result.data.written, true)
    assert.match(await readFile(join(project, 'studio.ts'), 'utf8'), /^export const palette = /)
    assert.match(await readFile(join(project, 'review.html'), 'utf8'), /&lt;Studio&gt;/)
    const receipt = JSON.parse(await readFile(join(project, 'studio.receipt.json'), 'utf8'))
    assert.match(receipt.sha256, /^[a-f0-9]{64}$/)

    await writeFile(join(project, 'studio.ts'), 'editor content')
    const protectedFile = run('--out', 'studio.ts', '--preview', 'extra.html')
    assert.equal(protectedFile.result.data.written, false)
    assert.equal(await readFile(join(project, 'studio.ts'), 'utf8'), 'editor content')
    await assert.rejects(readFile(join(project, 'extra.html')), { code: 'ENOENT' })
    assert.equal(run('--out', 'studio.ts', '--overwrite').result.data.written, true)
    assert.equal(run('--out', 'palette.json').status, 1)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme compilation emits scoped CSS and ESM, reports drift, and preserves edited files', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-build-'))
  try {
    const args = ['build', 'neutral', '--out', 'branding/neutral.css']
    const built = invoke(project, 'theme', ...args, '--json')
    assert.equal(built.status, 0, built.error)
    assert.equal(built.result.written, true)
    const cssPath = join(project, 'branding', 'neutral.css')
    const css = await readFile(cssPath, 'utf8')
    assert.match(css, /\[data-sy-brand="neutral"\]/)
    assert.match(css, /--sy-canvas: #ffffff/)
    const mod = await import(pathToFileURL(join(project, 'branding', 'neutral.mjs')).href)
    assert.equal(mod.default.id, 'neutral')
    assert.deepEqual(mod.colorModes, ['light', 'dark'])
    assert.match(await readFile(join(project, 'branding', 'neutral.d.mts'), 'utf8'), /BrandTheme/)
    assert.equal(invoke(project, 'theme', ...args, '--check', '--json').result.upToDate, true)
    await writeFile(cssPath, '/* local changes */\n')
    const stale = invoke(project, 'theme', ...args, '--check', '--json')
    assert.equal(stale.status, 1)
    assert.deepEqual(stale.result.stale, ['neutral.css'])
    assert.equal(invoke(project, 'theme', ...args, '--json').status, 1)
    assert.match(await readFile(cssPath, 'utf8'), /local changes/)
    assert.equal(invoke(project, 'theme', ...args, '--overwrite', '--json').status, 0)

    const family = invoke(project, 'experimental', 'theme', 'compile', 'neutral,stone', 'brand', '--family', '--family-key', 'day-family', '--json')
    assert.equal(family.status, 0, family.error)
    const combined = await import(pathToFileURL(join(project, 'brand', 'day-family.mjs')).href)
    assert.deepEqual(Object.keys(combined.themes), ['neutral', 'stone'])
    const shared = await readFile(join(project, 'brand', 'day-family.css'), 'utf8')
    assert.match(shared, /\[data-sy-brand="neutral"\]/)
    assert.match(shared, /\[data-sy-brand="stone"\]/)

    await mkdir(join(project, 'themes', 'variants'), { recursive: true })
    await writeFile(join(project, 'themes', 'primary.ts'), 'export default { version: 1, id: "primary", name: "Primary", modes: { light: { canvas: "#ffffff", accent: "#3f5861" } } }\n')
    await writeFile(join(project, 'themes', 'variants', 'print.ts'), 'export default { extends: "../primary.ts", id: "print", name: "Print", modes: { light: { "text-muted": "#30434c" } } }\n')
    const files = ['theme', 'build', 'themes/variants/print.ts', 'themes/primary.ts', '--family', '--family-key', 'office']
    const extended = invoke(project, ...files, '--json')
    assert.equal(extended.status, 0, extended.error)
    const office = (await import(pathToFileURL(join(project, 'themes', 'office.mjs')).href)).themes
    assert.equal(office.print.modes.light.accent, '#3f5861')
    assert.equal(office.print.modes.light['text-muted'], '#30434c')
    assert.equal(invoke(project, ...files, '--check', '--json').result.upToDate, true)
    await writeFile(join(project, 'themes', 'primary.ts'), 'export default { extends: "./variants/print.ts", id: "primary", name: "Primary" }\n')
    assert.match(invoke(project, ...files, '--json').error, /Circular theme extension/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme lifecycle resolves package owners, switches defaults and exposes the same registry through Vite', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-catalog-'))
  try {
    const integration = join(project, 'node_modules', '@review/brand')
    await mkdir(integration, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"fixture","dependencies":{"@review/brand":"1.0.0"}}'),
      writeFile(join(integration, 'package.json'), '{"name":"@review/brand","version":"1.0.0"}'),
      writeFile(join(integration, 'syntrofic.integration.json'), '{"version":1,"contributions":[{"id":"Review","kind":"theme","file":"review.json"}]}'),
      writeFile(join(integration, 'review.json'), '{"version":1,"id":"review","name":"Review","modes":{"light":{"canvas":"#fff","accent":"#315349"}}}'),
    ])
    const theme = (...args) => invoke(project, 'theme', ...args, '--json')
    assert.equal(theme('use', 'neutral').status, 1)
    const list = theme('add', '--list', '--package', '@review/brand')
    assert.deepEqual(list.result.themes.map(({ id, added }) => [id, added]), [['review', false]])
    const added = theme('add', 'review', '--package', '@review/brand')
    assert.equal(added.status, 0, added.error)
    assert.equal(added.result.module, 'virtual:syntrofic-theme')
    assert.equal(added.result.owner, '@review/brand')
    assert.equal(theme('add', 'neutral').result.owner, '@syntrofic/ui')
    assert.equal(theme('use', 'review').result.active, 'review')
    assert.equal(theme('remove', 'review').status, 1)
    assert.equal(theme('list').result.themes.find(theme => theme.id === 'review').default, true)

    const { syntroficThemePlugin } = await import('../../scripts/platform/vite.mjs')
    const plugin = syntroficThemePlugin()
    plugin.configResolved({ root: project })
    const watched = new Set()
    const context = { addWatchFile(file) { watched.add(file) } }
    const jsId = plugin.resolveId('virtual:syntrofic-theme')
    const cssId = plugin.resolveId('virtual:syntrofic-theme.css')
    const js = await plugin.load.call(context, jsId)
    assert.match(js, /export const activeTheme = "review"/)
    const css = await plugin.load.call(context, cssId)
    assert.match(css, /\[data-sy-brand="review"\]/)
    assert.match(css, /--sy-accent: #315349/)
    assert.deepEqual([...watched], [join(project, 'syntrofic.themes.json')])

    const localRequire = createRequire(import.meta.url)
    const postcss = createRequire(localRequire.resolve('vite/package.json'))('postcss')
    const { syntroficThemePostcss } = await import('../../scripts/platform/postcss.mjs')
    const processor = postcss([syntroficThemePostcss({ cwd: project })])
    const stylesheet = await processor.process('@layer branding { @syntrofic-theme; }', { from: join(project, 'design.css') })
    assert.match(stylesheet.css, /@layer branding \{\s*\[data-sy-brand="review"\]/)
    assert.match(stylesheet.css, /--sy-canvas: #ffffff/)
    assert.deepEqual(stylesheet.messages.filter(item => item.type === 'dependency').map(item => item.file), [join(project, 'syntrofic.themes.json')])
    await assert.rejects(async () => processor.process('@syntrofic-theme other;', { from: join(project, 'design.css') }), /without parameters/)

    const forked = theme('eject', 'review', 'branding/review', '--package', '@review/brand')
    assert.equal(forked.status, 0, forked.error)
    assert.equal(JSON.parse(await readFile(join(project, 'branding', 'review', 'manifest.json'), 'utf8')).id, 'review')
    assert.equal(theme('eject', 'neutral', 'branding/review', '--overwrite').status, 1)

    await rm(integration, { force: true, recursive: true })
    assert.equal(theme('use', 'neutral').result.active, 'neutral')
    assert.equal(theme('remove', 'review').result.removed, 'review')
    assert.equal(theme('remove', 'neutral').result.active, null)
    assert.doesNotMatch(await plugin.load.call(context, cssId), /data-sy-brand/)

    const archive = join(project, 'review-theme.tgz')
    const tar = spawnSync('tar', ['-czf', archive, '-C', join(project, 'branding'), 'review'], { encoding: 'utf8' })
    assert.equal(tar.status, 0, tar.stderr)
    assert.equal(theme('add', 'review-theme.tgz', '--dry-run').result.active, 'review')
    const copied = theme('add', 'review-theme.tgz')
    assert.equal(copied.status, 0, copied.error)
    assert.equal(copied.result.theme.modes.light.accent, '#315349')
    assert.match(await plugin.load.call(context, cssId), /data-sy-brand="review"/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('typed theme templates compile as static data from a nested project directory', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-descriptor-'))
  try {
    const folder = join(project, 'src')
    await mkdir(folder)
    await writeFile(join(project, 'package.json'), '{"name":"theme-example"}')
    const created = invoke(folder, 'theme', 'template', '--json')
    assert.equal(created.status, 0, created.error)
    const file = join(project, 'theme.template.ts')
    const text = await readFile(file, 'utf8')
    assert.match(text, /satisfies BrandTheme/)
    assert.match(text, /#ffffff/)
    await writeFile(file, 'throw new Error("Descriptor imports must not run")\n' + text)
    const result = invoke(project, 'theme', 'build', 'theme.template.ts', '--out', 'theme.css', '--json')
    assert.equal(result.status, 0, result.error)
    assert.match(await readFile(join(project, 'theme.css'), 'utf8'), /\[data-sy-brand="studio"\]/)
    await writeFile(join(project, 'authored.ts'), `import { defineBrandTheme as theme } from '@syntrofic/ui'
import base from './theme.template.ts'
throw new Error('App code must not run')
export default theme({ id: 'authored', base, modes: { light: { accent: '#386452' } } })
`)
    const authored = invoke(project, 'experimental', 'theme', 'compile', 'authored.ts', '--json')
    assert.equal(authored.status, 0, authored.error)
    assert.match(await readFile(join(project, 'authored.css'), 'utf8'), /--sy-accent: #386452;/)
    assert.equal(invoke(folder, 'theme', 'template', '../../outside.template.ts', '--json').status, 1)
    assert.equal(invoke(project, 'theme', 'template', '--json').status, 1)
    assert.equal(invoke(project, 'theme', 'template', '--overwrite', '--json').status, 0)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme builds watch static imports, keep valid outputs across edits, and emit icon references', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-watch-'))
  const child = spawn(process.execPath, [cli, 'theme', 'build', 'theme.ts', '--watch', '--icons-specifier', './icons.mjs'], { cwd: project })
  const stopped = once(child, 'exit')
  const output = join(project, 'studio.css')
  let log = ''
  child.stdout.on('data', chunk => { log += String(chunk) })
  child.stderr.on('data', chunk => { log += String(chunk) })
  async function updated(predicate) {
    for (let attempts = 0; attempts < 80; attempts++) {
      if (await predicate()) return
      await delay(40)
    }
    assert.fail('The theme watcher did not update: ' + log)
  }
  async function cssIncludes(value) {
    try { return (await readFile(output, 'utf8')).includes(value) }
    catch (error) { if (error.code !== 'ENOENT') throw error; return false }
  }
  const descriptor = 'export default { version: 1, id: "studio", name: "Studio", modes: { light: { ...day, canvas: "#ffffff" } } }\n'
  try {
    await writeFile(join(project, 'package.json'), '{"name":"theme-watch","type":"module"}')
    await writeFile(join(project, 'theme.ts'), 'import { colors as day } from "./tones.ts"\n' + descriptor)
    await writeFile(join(project, 'tones.ts'), 'throw new Error("Never run authored code")\nconst green = "#3a5844"\nexport const colors = { accent: green }\n')
    await writeFile(join(project, 'icons.mjs'), 'export default { search: "M2 2L10 12" }\n')
    await updated(() => cssIncludes('#3a5844'))
    const moduleFile = join(project, 'studio.mjs')
    assert.equal((await import(pathToFileURL(moduleFile).href)).icons.search, 'M2 2L10 12')
    assert.match(await readFile(join(project, 'studio.d.mts'), 'utf8'), /icons: import\("@syntrofic\/ui"\).IconSet/)

    await writeFile(join(project, 'tones.ts'), 'export const colors = trip()\n')
    await updated(() => log.includes('Theme descriptors must export static data'))
    assert.equal(await cssIncludes('#3a5844'), true)
    await writeFile(join(project, 'replacement.ts'), 'export const colors = { accent: "#526882" }\n')
    await rename(join(project, 'replacement.ts'), join(project, 'tones.ts'))
    await updated(() => cssIncludes('#526882'))

    const rejected = invoke(project, 'theme', 'build', 'theme.ts', '--watch', '--check', '--json')
    assert.equal(rejected.status, 1)
    const { syntroficThemePlugin } = await import('../../scripts/platform/vite.mjs')
    const plugin = syntroficThemePlugin({ manifests: ['theme.ts'], registry: false })
    plugin.configResolved({ root: project })
    const watched = []
    const compiled = await plugin.load.call({ addWatchFile(file) { watched.push(file) } }, plugin.resolveId('virtual:syntrofic-theme.css'))
    assert.match(compiled, /#526882/)
    assert.equal(watched.length, 2)
    assert.ok(watched.some(file => file.endsWith('/tones.ts')))

    await writeFile(join(project, 'second.json'), '{"version":1,"id":"night","name":"Night"}')
    const batch = invoke(project, 'theme', 'build', 'theme.ts', 'second.json', '--icons-specifier', './icons.mjs', '--json')
    assert.equal(batch.status, 0, batch.error)
    assert.deepEqual(batch.result.themes, ['studio', 'night'])
    assert.match(await readFile(join(project, 'night.css'), 'utf8'), /data-sy-brand="night"/)
    const added = invoke(project, 'theme', 'add', './studio.mjs', '--json')
    assert.equal(added.status, 0, added.error)
    assert.equal(added.result.active, 'studio')
    assert.equal(added.result.theme.modes.light.accent, '#526882')
  } finally {
    child.kill('SIGTERM')
    await stopped
    await rm(project, { force: true, recursive: true })
  }
})

test('theme preview apps prebundle Vue pages and use a project registry for additions and removals', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-preview-app-'))
  const app = join(project, 'theme-review')
  const preview = (directory, ...args) => invoke(directory, 'experimental', 'theme', 'preview', ...args, '--json')
  try {
    const generated = preview(project, 'app', 'theme-review')
    assert.equal(generated.status, 0, generated.error)
    assert.equal(generated.result.path, '/')
    const catalog = JSON.parse(await readFile(join(app, 'src/preview-templates.json'), 'utf8'))
    assert.ok(catalog.some(page => page.id === 'dashboard-progress' && page.example))
    assert.ok(!catalog.some(page => page.id.startsWith('shell-')))
    const components = JSON.parse(await readFile(join(app, 'src/preview-components.json'), 'utf8'))
    assert.ok(components.some(component => component.symbol === 'SButton'))
    assert.ok(components.some(component => component.symbol === 'SCodeBlock'))
    assert.deepEqual(preview(app, 'list').result.pages.map(page => page.id), ['overview', 'components', 'colors'])

    const exact = preview(join(app, 'src'), 'add', '--template', 'dashboard-progress')
    assert.equal(exact.status, 0, exact.error)
    assert.equal(exact.result.pages.at(-1).id, 'dashboard-progress')
    const ranked = preview(app, 'add', 'checkout', '--top', '2')
    assert.equal(ranked.status, 0, ranked.error)
    assert.equal(ranked.result.matched.length, 2)
    assert.ok(ranked.result.matched.every(page => page.score > 0))
    const rejected = preview(app, 'add', '--template', 'missing')
    assert.equal(rejected.status, 1)
    const route = preview(app, 'add', '--template', 'dashboard-progress', '--route', 'src/theme-review.vue')
    assert.equal(route.status, 0, route.error)
    assert.equal(route.result.route, 'src/theme-review.vue')
    assert.match(await readFile(join(app, 'src/theme-review.vue'), 'utf8'), /preview-routes\/src\/theme-review\/App\.vue/)
    const embedded = join(app, '.syntrofic/preview-routes/src/theme-review/App.vue')
    assert.doesNotMatch(await readFile(embedded, 'utf8'), /:global\(body\)|virtual:syntrofic-theme/)
    assert.deepEqual(preview(app, 'add', '--template', 'dashboard-progress').result.files, [])
    assert.equal(preview(app, 'remove', 'dashboard-progress').result.pages.some(page => page.id === 'dashboard-progress'), false)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme editor creates an initial theme and applies per-mode color to one button variant', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-editor-dials-'))
  const editor = (...args) => invoke(project, 'experimental', 'theme', 'editor', ...args, '--json')
  try {
    assert.ok(editor().result.actions.some(action => action.startsWith('editor set')))
    assert.equal(invoke(project, 'theme', 'palette', '--json').result.actions[0], 'generate <config>')
    const created = editor('new', 'studio', '--like', 'stone', '--corners', 'small', '--spacing', 'compact', '--accent', '#3f5861')
    assert.equal(created.status, 0, created.error)
    assert.equal(created.result.theme.radius, 8)
    assert.equal(created.result.theme.spacing, 3)
    assert.equal(created.result.theme.modes.light.canvas, '#ffffff')
    assert.equal(created.result.theme.modes.dark.accent, '#3f5861')
    const targets = invoke(project, 'theme', 'targets', 'SButton', 'secondary', '--json')
    assert.equal(targets.result[0].part, 'button-secondary')
    assert.deepEqual(targets.result[0].modes.dark, ['background', 'foreground'])
    assert.deepEqual(targets.result[0].states, ['hover', 'active', 'focus-visible', 'disabled'])
    assert.equal(invoke(project, 'theme', 'targets', 'SSelect', '--json').result[0].part, 'field')
    const capabilities = editor('how', '--list', 'tokens', '--theme', 'studio')
    assert.equal(capabilities.result.tokens['--sy-canvas'].light, '#ffffff')
    assert.equal(capabilities.result.tokens['--sy-space-2'].light, '6px')
    assert.ok(editor('how', '--list', 'groups').result.groups.buttons.includes('button-danger'))
    assert.ok(editor('how', '--list', 'groups').result.groups.overlays.includes('popover'))
    const grouped = editor('set', 'studio', 'corners', '11px', '--on', 'buttons')
    assert.equal(grouped.status, 0, grouped.error)
    const selected = editor('set', 'studio', 'background', '#253d60', '--on', 'button', '--when', 'variant:secondary', '--mode', 'dark')
    assert.equal(selected.status, 0, selected.error)
    assert.equal(selected.result.tokens.light['--sy-brand-button-secondary-background'], undefined)
    assert.equal(selected.result.tokens.dark['--sy-brand-button-secondary-background'], '#253d60')
    assert.equal(selected.result.tokens.dark['--sy-brand-button-secondary-radius'], '11px')
    assert.equal(selected.result.tokens.dark['--sy-brand-button-primary-background'], undefined)
    assert.equal(editor('set', 'studio', 'corners', '7px', '--on', 'button', '--mode', 'dark').status, 1)
    const reverted = editor('undo', 'studio')
    assert.equal(reverted.result.tokens.dark['--sy-brand-button-secondary-background'], undefined)
    assert.equal(reverted.result.tokens.dark['--sy-brand-button-secondary-radius'], '11px')
    const scope = ['--on', 'button', '--when', 'variant:secondary', '--mode', 'dark']
    assert.equal(editor('set', 'studio', 'background', '#253d60', ...scope).status, 0)
    assert.equal(editor('set', 'studio', 'spacing', '8px').status, 0)
    const scoped = editor('undo', 'studio', 'background', ...scope)
    assert.equal(scoped.status, 0, scoped.error)
    assert.equal(scoped.result.theme.spacing, 8)
    assert.equal(scoped.result.tokens.dark['--sy-brand-button-secondary-background'], undefined)
    assert.equal(editor('undo', 'studio').result.tokens.dark['--sy-brand-button-secondary-background'], '#253d60')
    const button = ['--on', 'button', '--when', 'variant:secondary']
    const hover = [...button, '--state', 'hover']
    assert.equal(editor('set', 'studio', 'background-color', '#ffffcc', ...hover, '--mode', 'light').status, 0)
    assert.equal(editor('set', 'studio', 'foreground', '#222222', ...hover).status, 0)
    assert.equal(editor('set', 'studio', 'foreground', '#222333', ...hover).status, 0)
    const pressed = editor('set', 'studio', 'background', '#bdbdeb', ...button, '--state', 'active', '--mode', 'light')
    assert.equal(pressed.status, 0, pressed.error)
    assert.equal(pressed.result.tokens.light['--sy-brand-button-secondary-hover-foreground'], '#222333')
    assert.equal(pressed.result.tokens.light['--sy-brand-button-secondary-hover-background'], '#ffffcc')
    assert.equal(pressed.result.tokens.dark['--sy-brand-button-secondary-hover-background'], undefined)
    assert.equal(editor('set', 'studio', 'background', '#ffffff', '--on', 'field', '--state', 'busy').status, 1)
    assert.equal(editor('undo', 'studio', 'foreground', '#222222', ...hover).status, 1)
    const hoverUndo = editor('undo', 'studio', 'foreground', '#222333', ...hover)
    assert.equal(hoverUndo.status, 0, hoverUndo.error)
    assert.equal(hoverUndo.result.tokens.light['--sy-brand-button-secondary-hover-foreground'], undefined)
    assert.equal(hoverUndo.result.tokens.light['--sy-brand-button-secondary-hover-background'], '#ffffcc')
    assert.equal(hoverUndo.result.tokens.light['--sy-brand-button-secondary-active-background'], '#bdbdeb')
    assert.deepEqual(hoverUndo.result.undone.restored, [{ path: 'parts.button-secondary.states.hover.foreground', value: null }])
    const build = invoke(project, 'theme', 'build', 'studio', 'state.css', '--json')
    assert.equal(build.status, 0, build.error)
    assert.match(await readFile(join(project, 'state.css'), 'utf8'), /prefers-color-scheme: dark[\s\S]+--sy-brand-button-secondary-hover-background: initial;/)
    const textChange = editor('set', 'studio', 'text', '#ffffff', '--mode', 'light')
    assert.equal(textChange.status, 0, textChange.error)
    assert.ok(textChange.result.changes.tokens.light.some(entry => entry.token === '--sy-text' && entry.after === '#ffffff'))
    assert.ok(textChange.result.build.appCopy.files.includes('theme.css'))
    const preview = join(project, 'themes/studio/preview.html')
    const existingPreview = await readFile(preview, 'utf8')
    const planned = editor('show', 'studio', '--section', 'inputs', '--dry-run')
    assert.equal(planned.status, 0, planned.error)
    assert.deepEqual(planned.result.preview.files, ['preview.html', 'sheet-inputs.html'])
    assert.equal(await readFile(preview, 'utf8'), existingPreview)
    const plannedPictures = editor('show', 'studio', '--section', 'inputs', '--png', '--dry-run')
    assert.equal(plannedPictures.status, 0, plannedPictures.error)
    assert.ok(plannedPictures.result.preview.files.includes('sheet.html'))
    assert.ok(plannedPictures.result.preview.files.includes('sheet-inputs-dark.png'))
    assert.ok(plannedPictures.result.preview.files.includes('sheet-overlays.png'))
    assert.ok(!plannedPictures.result.preview.files.includes('sheet.png'))
    const review = editor('show', 'studio', '--section', 'inputs')
    assert.equal(review.status, 0, review.error)
    assert.ok(review.result.settings.some(entry => entry.setting === 'base' && entry.value === 'stone' && entry.source === 'dial'))
    assert.ok(review.result.settings.some(entry => entry.setting === '--sy-text' && entry.mode === 'light' && entry.source === 'token'))
    assert.deepEqual(review.result.wiring, { provider: 'SBrandTheme', module: 'src/themes/studio/theme.mjs', mode: 'system',
      build: 'syntrofic experimental theme compile studio' })
    assert.ok(review.result.contrast.some(item => item.mode === 'light' && item.target === '正文' && item.ratio === 1))
    assert.ok(review.result.introducedContrast.some(item => item.mode === 'light' && item.target === '正文' && item.ratio === 1))
    assert.deepEqual(review.result.preview.written, ['sheet-inputs.html'])
    const inputSheet = await readFile(join(project, 'themes/studio/sheet-inputs.html'), 'utf8')
    assert.match(inputSheet, /id="inputs"/)
    assert.doesNotMatch(inputSheet, /id="actions"/)
    assert.match(inputSheet, /data:font\/woff2;base64,/)
    assert.doesNotMatch(inputSheet, /url\(\.\//)
    await writeFile(preview, 'My authored preview')
    assert.deepEqual(editor('show', 'studio', '--section', 'inputs').result.preview.protected, ['preview.html'])
    assert.equal(await readFile(preview, 'utf8'), 'My authored preview')
    const copy = invoke(project, 'experimental', 'theme', 'compile', 'studio', '--json')
    assert.equal(copy.status, 0, copy.error)
    assert.ok(copy.result.appCopy.files.includes('theme.mjs'))
    const appCopy = join(project, 'src/themes/studio/theme.css')
    assert.match(await readFile(appCopy, 'utf8'), /data-sy-brand="studio"/)
    assert.equal(invoke(project, 'experimental', 'theme', 'compile', 'studio', '--check', '--json').status, 0)
    await writeFile(appCopy, '/* edited app file */\n')
    assert.equal(invoke(project, 'experimental', 'theme', 'compile', 'studio', '--check', '--json').status, 1)
    assert.equal(await readFile(appCopy, 'utf8'), '/* edited app file */\n')
    const fork = editor('new', 'studio-alternate', '--like', 'studio', '--spacing', 'roomy', '--badges', 'outline')
    assert.equal(fork.status, 0, fork.error)
    assert.equal(fork.result.theme.spacing, 6)
    assert.equal(fork.result.theme.modes.light.text, '#ffffff')
    assert.equal(fork.result.tokens.light['--sy-design-badge-fill'], 'transparent')
    const filledBadges = editor('set', 'studio-alternate', 'badges', 'solid')
    assert.equal(filledBadges.status, 0, filledBadges.error)
    assert.equal(filledBadges.result.tokens.light['--sy-design-badge-accent-fill'], 'var(--sy-accent)')
    assert.ok(filledBadges.result.settings.some(entry => entry.setting === 'badges' && entry.value === 'solid'))
    assert.equal(editor('undo', 'studio-alternate', 'badges').result.theme.design.badges, 'outline')
    const palette = editor('new', 'color-study', '--headings', 'semibold', '--buttons', 'outline', '--surfaces', 'outlined',
      '--mode', 'dark-only', '--text-size', '20', '--neutral', '#808080', '--info', '#436280', '--vibrancy', '70')
    assert.equal(palette.status, 0, palette.error)
    assert.equal(palette.result.theme.design.appearance, 'dark-only')
    assert.equal(palette.result.theme.design.headingWeight, 600)
    assert.equal(palette.result.theme.design.palette.vibrancy, 70)
    assert.equal(palette.result.theme.modes.light.canvas, '#ffffff')
    assert.equal(palette.result.palette.families.find(family => family.id === 'info').modes.dark.length, 15)
    assert.ok(palette.result.build.files.includes('palette.json'))
    const registry = join(project, 'syntrofic.themes.json')
    const beforeWrongMode = await readFile(registry, 'utf8')
    const wrongMode = editor('set', 'color-study', '--sy-info', '#315473', '--mode', 'light')
    assert.equal(wrongMode.status, 1)
    assert.match(wrongMode.error, /^ERR_THEME_SETTING: color-study has no light appearance/)
    assert.equal(await readFile(registry, 'utf8'), beforeWrongMode)
    const exact = editor('set', 'color-study', 'token:--sy-info', '#315473', '--mode', 'dark')
    assert.equal(exact.status, 0, exact.error)
    const regenerated = editor('set', 'color-study', 'info', '#6b4b8e')
    assert.equal(regenerated.status, 0, regenerated.error)
    assert.equal(regenerated.result.resolved.dark['--sy-info'], '#315473')
    assert.notEqual(regenerated.result.generatedColors.dark.info, '#315473')
    const assignment = regenerated.result.palette.assignments.dark['--sy-info']
    assert.equal(assignment.source, 'token')
    assert.equal(assignment.resolved, '#315473')
    assert.equal(assignment.value, regenerated.result.generatedColors.dark.info)
    const appPalette = JSON.parse(await readFile(join(project, 'src/themes/color-study/palette.json'), 'utf8'))
    assert.deepEqual(appPalette.assignments.dark['--sy-info'], assignment)
    const colorsSheet = editor('show', 'color-study', '--section', 'colors')
    assert.equal(colorsSheet.status, 0, colorsSheet.error)
    const colorsHtml = await readFile(join(project, 'themes/color-study/sheet-colors.html'), 'utf8')
    assert.match(colorsHtml, /Token 覆盖/)
    assert.match(colorsHtml, /data-palette-mode="dark"/)
    assert.doesNotMatch(colorsHtml, /data-theme-example-panel=/)
    assert.equal(editor('set', 'color-study', 'vibrancy', '90').status, 0)
    const restoredColor = editor('undo', 'color-study', 'info', '#6b4b8e')
    assert.equal(restoredColor.status, 0, restoredColor.error)
    assert.equal(restoredColor.result.theme.design.palette.vibrancy, 90)
    assert.equal(restoredColor.result.theme.design.palette.seeds.info, '#436280')
    assert.equal(restoredColor.result.resolved.dark['--sy-info'], '#315473')
    const newBase = editor('set', 'studio-alternate', 'base', 'matcha')
    assert.equal(newBase.status, 0, newBase.error)
    assert.equal(newBase.result.theme.design.base, 'matcha')
    assert.equal(newBase.result.theme.spacing, 6)
    assert.equal(newBase.result.theme.modes.light.text, '#ffffff')
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('shared HTML paints the Vue page immediately and restores its exact local sources', async context => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-share-page-'))
  const library = fileURLToPath(new URL('../../', import.meta.url))
  const page = `<script setup lang="ts">
import { ref } from 'vue'
import { SButton } from '@syntrofic/ui'
import { initial } from './initial'
const count = ref(initial)
if (import.meta.env.SSR) console.log('from the server render')
</script>
<template><main><h1>Studio & preview</h1><SButton @click="count++">Count {{ count }}</SButton></main></template>
`
  const initial = 'export const initial = 2\n'
  try {
    await Promise.all([mkdir(join(project, 'src')), mkdir(join(project, 'node_modules', '@syntrofic'), { recursive: true })])
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"share-fixture","type":"module"}'),
      writeFile(join(project, 'src', 'App.vue'), page),
      writeFile(join(project, 'src', 'initial.ts'), initial),
      symlink(library, join(project, 'node_modules', '@syntrofic', 'ui')),
      ...['vue', 'vite', '@vitejs'].map(name => symlink(join(library, 'node_modules', name), join(project, 'node_modules', name))),
    ])
    const share = (...args) => invoke(project, 'experimental', ...args, '--json')
    const exported = share('export', 'src/App.vue', '--out', 'preview.html')
    assert.equal(exported.status, 0, exported.error)
    assert.equal(exported.result.prerendered, true)
    assert.deepEqual(exported.result.warnings, [])
    const path = join(project, 'preview.html')
    const html = await readFile(path, 'utf8')
    assert.match(html, /<title>Studio &amp; preview<\/title>/)
    assert.match(html, /<div id="app" data-prerendered><main><h1>Studio &amp; preview<\/h1>/)
    await writeFile(path, html.replace('<h1>Studio &amp; preview</h1>', '<h1>Edited preview</h1>'))
    const restored = share('import', 'preview.html')
    assert.equal(restored.status, 0, restored.error)
    assert.equal(restored.result.warnings.length, 1)
    assert.equal(await readFile(restored.result.page, 'utf8'), page)
    assert.equal(await readFile(join(restored.result.output, 'src', 'initial.ts'), 'utf8'), initial)
    const explicit = share('import', 'preview.html', '--out', 'Studio.vue')
    assert.equal(explicit.status, 0, explicit.error)
    assert.equal(await readFile(explicit.result.sourcePage, 'utf8'), page)
    assert.match(await readFile(explicit.result.page, 'utf8'), /Studio-sources\/src\/App\.vue/)
    const rebuilt = share('export', 'Studio.vue', '--out', 'rebuilt.html')
    assert.equal(rebuilt.status, 0, rebuilt.error)
    assert.equal(rebuilt.result.prerendered, true)

    await writeFile(join(project, 'markup.html'), '<main><h1>Release layout</h1><button class="sy-button" data-variant="secondary" onclick="alert(1)">Open</button><script>dangerous()</script></main>')
    const recovered = share('import', 'markup.html')
    assert.equal(recovered.status, 0, recovered.error)
    const layout = await readFile(recovered.result.page, 'utf8')
    assert.match(layout, /<SButton variant="secondary">Open<\/SButton>/)
    assert.doesNotMatch(layout, /onclick|dangerous/)

    const url = 'https://assets.example.test/status.svg'
    await writeFile(join(project, 'src', 'WithImage.vue'), page.replace('<main>', `<main><img src="${url}" alt="Status">`))
    const fetch = context.mock.method(globalThis, 'fetch', input => {
      assert.equal(String(input), url)
      return Promise.resolve(new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" /></svg>',
        { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } }))
    })
    const { exportPage } = await import('../../scripts/platform/share-page.mjs')
    const result = await exportPage(await realpath(project), 'src/WithImage.vue', { out: 'with-image.html' })
    assert.deepEqual(result.images.embedded, [url])
    assert.deepEqual(result.images.unavailable, [])
    assert.equal(fetch.mock.callCount(), 1)
    const delivery = await readFile(result.output, 'utf8')
    assert.doesNotMatch(delivery, /https:\/\/assets\.example\.test\/status\.svg/)
    assert.equal((delivery.match(/data:image\/svg\+xml;base64,/g) ?? []).length >= 2, true)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('icon workflows inspect installed-style exports without running them and resolve variants and backups', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-icon-catalog-'))
  const external = join(project, 'node_modules', '@review', 'icons')
  try {
    await mkdir(external, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"icons-fixture","type":"module"}'),
      writeFile(join(project, 'library.mjs'), [
        "import { writeFileSync } from 'node:fs'",
        "writeFileSync(new URL('./loaded', import.meta.url), 'loaded')",
        "export function Search() { return 'outline-search' }",
        "export function ArchiveBox() { return 'outline-archive' }",
        'export const ignored = 42',
      ].join('\n')),
      writeFile(join(project, 'solid.mjs'), "export function Search() { return 'filled-search' }\n"),
      writeFile(join(project, 'adapter.mjs'), "export const wrap = component => () => 'adapted ' + component()\n"),
      writeFile(join(external, 'package.json'), '{"name":"@review/icons","type":"module","version":"1.0.0","exports":{".":{"import":"./index.mjs"},"./mail.mjs":"./mail.mjs"}}'),
      writeFile(join(external, 'index.mjs'), "export { default as Mail, ignored } from './mail.mjs'\nexport * from './archive.mjs'\n"),
      writeFile(join(external, 'mail.mjs'), "export default function Icon() { return 'mail' }\nexport const ignored = 42\n"),
      writeFile(join(external, 'archive.mjs'), "export function Archive() { return 'archive' }\n"),
    ])
    const icon = (...args) => invoke(project, 'experimental', 'icon', ...args, '--json')
    assert.ok(icon('arrow', 'up').result.icons.some(item => item.id === 'arrow-up'))
    const built = icon('new-set', 'office', '--from', './library.mjs', '--variants', 'outline,filled')
    assert.equal(built.status, 0, built.error)
    assert.deepEqual(Object.keys(built.result.icons), ['search', 'archive-box'])
    await assert.rejects(readFile(join(project, 'loaded')), { code: 'ENOENT' })
    const definition = icon('new-definition', 'ShipmentArchive', '--description', 'Parcel storage', '--words', 'shipment,storage', '--icon', 'ArchiveBox')
    assert.equal(definition.status, 0, definition.error)
    assert.equal(definition.result.mappings['shipment-archive'], 'archive-box')
    assert.equal(icon('parcel', 'storage').result.icons[0].id, 'archive-box')
    assert.equal(icon('--definitions', '--set', 'office').result.definitions.find(row => row.id === 'shipment-archive').mapped, 'archive-box')
    assert.equal(icon('--all-icons', '--set', 'office').result.icons.length, 2)
    assert.equal(icon('archive', '--limit', '0').status, 1)
    assert.equal(icon('office/missing').status, 1)
    const filled = icon('add', '--all', '--from', './solid.mjs', '--variant', 'filled')
    assert.deepEqual(filled.result.copied, ['search'])
    assert.equal(icon('office/search').result.icons[0].variants.filled.module, './solid.mjs')

    assert.equal(icon('new-set', 'backup').status, 0)
    assert.equal(icon('add', 'sample', '--set', 'backup', '--path-data', 'M2 2L10 12').status, 0)
    assert.equal(icon('map', '--set', 'backup', '--pairs', 'info=sample,close=missing').status, 1)
    const afterBadMap = JSON.parse(await readFile(join(project, 'syntrofic.icons.json'), 'utf8'))
    assert.deepEqual(afterBadMap.sets.find(set => set.id === 'backup').mappings, {})
    assert.equal(icon('map', '--set', 'backup', '--pairs', 'info=sample,close=sample').status, 0)
    const used = icon('use', 'office', '--backup', 'backup', '--variant', 'filled')
    assert.equal(used.status, 0, used.error)
    assert.equal(used.result.icons.search.module, './solid.mjs')
    assert.equal(used.result.icons.info.path, 'M2 2L10 12')
    const moduleFile = join(project, 'registered.mjs')
    await writeFile(moduleFile, used.result.module)
    const resolved = (await import(pathToFileURL(moduleFile).href)).default
    assert.equal(resolved.search({ variant: 'filled' }).component(), 'filled-search')
    assert.equal(resolved.search({ variant: 'outline' }).component(), 'outline-search')
    assert.equal(resolved.info.path, 'M2 2L10 12')
    assert.equal(await readFile(join(project, 'loaded'), 'utf8'), 'loaded')

    const installed = icon('new-set', 'vendor', '--from', '@review/icons')
    assert.equal(installed.status, 0, installed.error)
    assert.deepEqual(Object.keys(installed.result.icons), ['mail', 'archive'])
    const adapted = icon('add', 'Mail', '--from', '@review/icons', '--set', 'vendor', '--variant', 'filled', '--adapter', './adapter.mjs#wrap')
    assert.equal(adapted.status, 0, adapted.error)
    const selected = icon('use', 'vendor', '--variant', 'filled')
    assert.equal(selected.status, 0, selected.error)
    const vendor = join(project, 'vendor.mjs')
    await writeFile(vendor, selected.result.module)
    assert.equal((await import(pathToFileURL(vendor).href)).default.mail({ variant: 'filled' }).component(), 'adapted mail')
    const { syntroficThemePlugin } = await import('../../scripts/platform/vite.mjs')
    const plugin = syntroficThemePlugin()
    plugin.configResolved({ root: project })
    const watched = []
    const source = await plugin.load.call({ addWatchFile(path) { watched.push(path) } }, plugin.resolveId('virtual:syntrofic-icons'))
    assert.match(source, /import \{ wrap as icon\d+Adapter \} from "\/adapter\.mjs"/)
    assert.equal(watched[0], join(project, 'syntrofic.icons.json'))
    assert.ok(watched.some(file => file.endsWith('/package.json')))

    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"icons-fixture","type":"module","dependencies":{"@review/icons":"1.0.0"}}'),
      writeFile(join(external, 'syntrofic.icons.json'), JSON.stringify({ version: 1, sets: [{ id: 'studio', variants: ['outline'], defaultVariant: 'outline',
        definitions: {}, icons: { mail: { module: './mail.mjs', exportName: 'default' } }, mappings: {} }] })),
    ])
    assert.ok(icon('--list').result.sets.some(set => set.id === 'studio' && set.owner === '@review/icons'))
    assert.equal(icon('@review/icons/studio/mail').result.icons[0].module, '@review/icons/mail.mjs')
    const activePackage = icon('use', '@review/icons/studio', '--backup', 'office')
    assert.equal(activePackage.status, 0, activePackage.error)
    assert.equal(activePackage.result.active, '@review/icons/studio')
    const packageModule = join(project, 'package-preview.mjs')
    await writeFile(packageModule, activePackage.result.module)
    const packageIcons = (await import(pathToFileURL(packageModule).href)).default
    assert.equal(packageIcons.mail.component(), 'mail')
    assert.ok(packageIcons.search)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('package discovery separates installed integrations and available versions and ranks their contributions', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-cli-discovery-'))
  try {
    const integration = join(project, 'node_modules', '@review/ui')
    await mkdir(integration, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"fixture","dependencies":{"@review/ui":"^1.2.0"}}'),
      writeFile(join(integration, 'package.json'), '{"name":"@review/ui","version":"1.2.0"}'),
      writeFile(join(integration, 'syntrofic.integration.json'), JSON.stringify({ version: 1,
        contributions: [{ id: 'TeamReview', kind: 'component', description: 'Review teams and their ownership' }] })),
      writeFile(join(project, 'syntrofic.discover.json'), JSON.stringify({ version: 1, packages: [
        { name: '@review/templates', versions: ['2.1.0'], contributions: [{ id: 'RiskReport', kind: 'template', title: 'Risk report' }] },
      ] })),
    ])
    const installed = invoke(project, 'discover', '--installed', '--type', 'component', '--json')
    assert.equal(installed.status, 0, installed.error)
    assert.deepEqual(installed.result.packages.map(item => item.name), ['@review/ui'])
    const match = invoke(project, 'discover', 'team', 'review', '--installed', '--limit', '1', '--json')
    assert.equal(match.result.entries[0].id, 'TeamReview')
    assert.equal(match.result.entries[0].command, 'syntrofic discover @review/ui/TeamReview')
    const direct = invoke(project, 'discover', '@review/ui/TeamReview', '--json')
    assert.equal(direct.result.entry.type, 'component')
    const versioned = invoke(project, 'discover', '@review/templates@2.1.0', '--available', '--json')
    assert.equal(versioned.status, 0, versioned.error)
    assert.equal(versioned.result.package.install, 'pnpm add @review/templates@2.1.0')
    assert.equal(versioned.result.entries[0].id, 'RiskReport')
    assert.equal(invoke(project, 'discover', '--installed', '--available', '--json').status, 1)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('checkout templates include the nested address, promotion and payment components when generated', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-checkout-templates-'))
  try {
    for (const [template, entry] of [['checkout-wizard', 'CheckoutWizardTemplate'], ['payment-form', 'PaymentFormTemplate']]) {
      const generated = invoke(project, 'template', 'add', template, '--json')
      assert.equal(generated.status, 0, generated.error)
      const files = generated.result.files
      for (const name of [entry, 'DemoOrderDiscount', 'DemoPaymentFields']) assert.ok(files.includes(`src/components/${name}.vue`))
      if (template === 'checkout-wizard') assert.ok(files.includes('src/components/DemoOrderAddress.vue'))
      const component = await readFile(join(project, template, 'src', 'components', entry + '.vue'), 'utf8')
      assert.match(component, /from '@syntrofic\/ui'/)
      assert.match(component, /from '\.\.\/assets\/delivery-area\.png'/)
    }
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('build recommends a starting page and reusable blocks while explicit scaffold preview keeps its file list', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-build-plan-'))
  try {
    const guide = invoke(project, 'build', '--json')
    assert.equal(guide.status, 0, guide.error)
    assert.match(guide.result.playbook, /交互与动效/)
    const plan = invoke(project, 'build', 'dashboard', 'progress', '--verbose', '--json')
    assert.equal(plan.result.start.id, 'dashboard-progress')
    assert.equal(plan.result.alternatives.length, 2)
    assert.ok(plan.result.hooks.some(hook => hook.id === 'useScrollableArea'))
    assert.ok(plan.result.components.some(entry => entry.component === 'SLineChart'))
    const checkout = invoke(project, 'build', 'checkout', '--type', 'template', '--json')
    assert.deepEqual(checkout.result.blocks.map(({ id }) => id), ['checkout-address', 'checkout-discount', 'checkout-payment'])
    assert.equal(checkout.result.components.length, 0)
    assert.equal(invoke(project, 'build', 'qz91unmatched', '--json').result.start.id, 'shell-nav')
    assert.equal(invoke(project, 'build', 'dashboard', '--limit', '0', '--json').status, 1)
    const draft = invoke(project, 'build', 'checkout', '--dry-run', '--json')
    assert.equal(draft.result.template, 'payment-form')
    assert.ok(draft.result.files.includes('src/App.vue'))
    await assert.rejects(readFile(join(project, draft.result.template, 'package.json')), { code: 'ENOENT' })
    const block = invoke(project, 'template', 'checkout-address', 'Shipping.vue', '--type', 'block', '--json')
    assert.equal(block.status, 0, block.error)
    assert.deepEqual(block.result.files, ['Shipping.vue'])
    assert.match(await readFile(join(project, 'Shipping.vue'), 'utf8'), /from '@syntrofic\/ui'/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('template commands inspect Vue source and save a page with its support files inside the project', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-template-page-'))
  const external = await mkdtemp(join(tmpdir(), 'syntrofic-template-external-'))
  try {
    const listing = invoke(project, 'template', '--list', '--type', 'page', '--package', '@syntrofic/ui', '--json')
    assert.equal(listing.status, 0, listing.error)
    assert.ok(listing.result.some(item => item.id === 'dashboard-progress'))
    assert.ok(listing.result.every(item => item.type === 'page'))
    const source = invoke(project, 'template', 'dashboard-progress', '--json')
    assert.equal(source.status, 0, source.error)
    assert.match(source.result.source, /from '@syntrofic\/ui'/)
    assert.match(source.result.source, /<SDashboard/)
    const skeleton = invoke(project, 'template', 'dashboard-progress', '--skeleton', '--json')
    assert.equal(skeleton.status, 0, skeleton.error)
    assert.match(skeleton.result.skeleton, /^SDashboard\n {2}\w+/)
    assert.equal(invoke(project, 'template', 'dashboard-progress', './dashboard.vue', '--skeleton').status, 1)

    const page = invoke(project, 'template', 'payment-form', './src/Payment.vue', '--json')
    assert.equal(page.status, 0, page.error)
    assert.equal(page.result.page, 'Payment.vue')
    assert.ok(page.result.files.includes('assets/delivery-area.png'))
    assert.match(await readFile(join(project, 'src', 'Payment.vue'), 'utf8'), /import TemplateDemo from '\.\/components\/OfferingTemplateDemo.vue'/)
    assert.equal(invoke(project, 'template', 'payment-form', './src/Payment.vue').status, 1)
    assert.equal(invoke(project, 'template', 'payment-form', './src/Payment.vue', '-f', '--json').status, 0)
    await symlink(external, join(project, 'elsewhere'))
    const refusal = invoke(project, 'template', 'table', 'elsewhere/page.vue')
    assert.equal(refusal.status, 1)
    assert.match(refusal.error, /outside the destination/)
    assert.equal(invoke(project, 'template', 'table', '../outside.vue').status, 1)
  } finally {
    await rm(project, { force: true, recursive: true })
    await rm(external, { force: true, recursive: true })
  }
})

test('installed integrations supply template blocks and choose explicit replacements for core templates', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-template-integration-'))
  try {
    const installed = join(project, 'node_modules', '@review/templates')
    const views = join(installed, 'views')
    await mkdir(views, { recursive: true })
    await Promise.all([
      writeFile(join(project, 'package.json'), JSON.stringify({ name: 'review', dependencies: { '@review/templates': '1.0.0' } })),
      writeFile(join(installed, 'package.json'), JSON.stringify({ name: '@review/templates', version: '1.0.0', peerDependencies: { '@syntrofic/ui': '^0.1.0' } })),
      writeFile(join(installed, 'syntrofic.integration.json'), JSON.stringify({ version: 1, package: '@review/templates', contributions: [
        { kind: 'template', id: 'ScorePanel', file: 'views/ScorePanel.vue', templateType: 'block' },
        { kind: 'template', id: 'ProgressReview', file: 'views/ProgressReview.vue', replaces: 'dashboard-progress' },
      ] })),
      writeFile(join(views, 'ScorePanel.vue'), '<template><aside><slot>进度记录</slot></aside></template>'),
      writeFile(join(views, 'ProgressReview.vue'), `<script setup>import ScorePanel from './ScorePanel.vue'</script>
<template><main><ScorePanel /></main></template>`),
    ])
    const blocks = invoke(project, 'template', '--list', '--type', 'block', '--package', '@review/templates', '--json')
    assert.equal(blocks.status, 0, blocks.error)
    assert.deepEqual(blocks.result.map(({ id, package: owner }) => [id, owner]), [['ScorePanel', '@review/templates']])
    const replacement = invoke(project, 'template', 'dashboard-progress', '--json')
    assert.equal(replacement.status, 0, replacement.error)
    assert.equal(replacement.result.template, 'ProgressReview')
    assert.match(replacement.result.source, /<ScorePanel/)
    const original = invoke(project, 'template', 'dashboard-progress', '--package', '@syntrofic/ui', '--json')
    assert.match(original.result.source, /<SDashboard/)
    const written = invoke(project, 'template', 'dashboard-progress', './pages', '--json')
    assert.equal(written.status, 0, written.error)
    assert.deepEqual(written.result.files, ['integrations/review--templates/views/ProgressReview.vue', 'integrations/review--templates/views/ScorePanel.vue', 'page.vue'])
    assert.match(await readFile(join(project, 'pages', 'page.vue'), 'utf8'), /ProgressReview\.vue/)
    const block = invoke(project, 'template', 'ScorePanel', './blocks', '--type', 'block', '--json')
    assert.equal(block.status, 0, block.error)
    assert.equal(block.result.page, 'ScorePanel.vue')
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme rules combine variants and states, compile the validated CSS and undo individual declarations', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-rules-'))
  const editor = (...args) => invoke(project, 'experimental', 'theme', 'editor', ...args, '--json')
  try {
    assert.equal(editor('new', 'studio').status, 0)
    const hover = ['--on', 'button', '--state', 'hover', '--mode', 'light']
    const select = ['--when', 'variant:ghost+size:sm']
    const button = editor('set', 'studio', 'background-color', '#e2dfee', ...hover, ...select)
    assert.equal(button.status, 0, button.error)
    const key = 'button-light-hover-size-sm-variant-ghost'
    assert.equal(button.result.theme.rules[key].declarations['background-color'], '#e2dfee')
    const allButtons = editor('set', 'studio', 'background-color', '#aab4a5', '--on', 'button')
    assert.equal(allButtons.status, 0, allButtons.error)
    assert.equal(allButtons.result.theme.rules['button-both-base'].declarations['background-color'], '#aab4a5')
    assert.equal(editor('set', 'studio', 'color', '#243b2e', ...hover, '--when', 'size:sm', '--when', 'variant:ghost').status, 0)
    assert.equal(editor('set', 'studio', 'border', '1px solid #aab4a5', '--on', 'inputs').status, 0)
    const selectOnly = editor('set', 'studio', 'background-color', '#c5e4d5', '--on', 'select', '--only', '--state', 'focus-visible')
    assert.equal(selectOnly.status, 0, selectOnly.error)
    assert.equal(selectOnly.result.theme.rules['select-both-focus-visible'].target, 'select')
    assert.equal(editor('set', 'studio', 'background-color', '#eee7ff', '--on', 'table-row', '--when', 'parity:odd').status, 0)
    assert.equal(editor('set', 'studio', 'background', 'linear-gradient(45deg, #dce9e4, #f4f0e8)', '--on', 'app-shell-header').status, 0)
    const customToken = editor('set', 'studio', '--sy-font-size', '19px')
    assert.equal(customToken.status, 0, customToken.error)
    assert.equal(customToken.result.resolved.light['--sy-font-size'], '19px')
    const localToken = editor('set', 'studio', '--sy-control', '#efe4ee', '--on', 'input', '--only', '--mode', 'dark')
    assert.equal(localToken.status, 0, localToken.error)
    assert.equal(localToken.result.theme.rules['input-dark-base'].declarations['--sy-control'], '#efe4ee')
    const invalid = await readFile(join(project, 'syntrofic.themes.json'), 'utf8')
    for (const args of [
      ['padding', '2px', ...hover, ...select], ['background-color', '#fff;position:fixed', ...hover, ...select],
      ['height', '-1px', '--on', 'button'], ['color', '#fff', ...hover, '--when', 'size:medium'],
      ['--sy-accent', '#fff', '--on', 'button', '--when', 'variant:ghost'], ['--sy-font-size', 'red'],
    ]) assert.equal(editor('set', 'studio', ...args).status, 1)
    assert.equal(await readFile(join(project, 'syntrofic.themes.json'), 'utf8'), invalid)
    const built = invoke(project, 'theme', 'build', 'studio', 'theme.css', '--json')
    assert.equal(built.status, 0, built.error)
    const css = await readFile(join(project, 'theme.css'), 'utf8')
    assert.match(css, /\[data-size="sm"\]\[data-variant="ghost"\]:hover[^{}]+\{ background-color: #e2dfee; color: #243b2e;/)
    assert.match(css, /tr\[data-sy-row-parity\]\[data-sy-row-parity="odd"\]/)
    assert.match(css, /linear-gradient\(45deg, #dce9e4, #f4f0e8\)/)
    const undone = editor('undo', 'studio', 'background-color', ...hover, '--when', 'size:sm+variant:ghost')
    assert.equal(undone.status, 0, undone.error)
    assert.deepEqual(undone.result.theme.rules[key].declarations, { color: '#243b2e' })
    const usual = editor('undo', 'studio', '--sy-font-size')
    assert.equal(usual.status, 0, usual.error)
    assert.equal(usual.result.resolved.light['--sy-font-size'], '15px')

    const source = join(project, 'themes/studio/studio.theme.ts')
    const registryPath = join(project, 'syntrofic.themes.json')
    const original = await readFile(registryPath, 'utf8')
    await writeFile(source, 'export default { modes: { dark: { accent: "#8f63b5" } } }\n')
    const authored = editor('show', 'studio')
    assert.equal(authored.status, 0, authored.error)
    assert.equal(authored.result.source, await realpath(source))
    assert.equal(authored.result.resolved.dark['--sy-accent'], '#8f63b5')
    assert.ok(authored.result.settings.some(entry => entry.setting === '--sy-accent' && entry.mode === 'dark' && entry.authored))
    assert.ok(authored.result.settings.some(entry => entry.setting === 'color' && entry.part === 'button' && entry.state === 'hover'
      && entry.when.variant === 'ghost' && entry.when.size === 'sm'))
    assert.equal(await readFile(registryPath, 'utf8'), original)
    const appManifest = join(project, 'src/themes/studio/manifest.json')
    assert.equal(JSON.parse(await readFile(appManifest, 'utf8')).modes.dark.accent, '#8f63b5')
    const fullSheet = await readFile(join(project, 'themes/studio/sheet.html'), 'utf8')
    assert.match(fullSheet, /<body data-sy-brand="studio" data-sy-theme="light">/)
    const catalog = JSON.parse(await readFile(new URL('../../catalog/parity.json', import.meta.url), 'utf8'))
    const implementation = JSON.parse(await readFile(new URL('../../catalog/implementation.json', import.meta.url), 'utf8'))
    const componentIds = catalog.components.filter(entry => entry.track.startsWith('web') && implementation[entry.id]?.component).map(entry => entry.id)
    assert.deepEqual([...fullSheet.matchAll(/<details[^>]*data-theme-example-panel="([^"]+)"/g)].map(([, id]) => id).sort(), componentIds.sort())
    const { coreTemplates } = await import('../../scripts/platform/template.mjs')
    const pages = coreTemplates().filter(entry => entry.type === 'page').map(entry => entry.id)
    assert.deepEqual([...fullSheet.matchAll(/<details[^>]*data-theme-template-panel="([^"]+)"/g)].map(([, id]) => id), pages)
    const { loadProjectThemes } = await import('../../scripts/platform/vite.mjs')
    const observed = []
    const loaded = await loadProjectThemes(await realpath(project), {}, file => observed.push(file))
    assert.equal(loaded.themes.studio.modes.dark.accent, '#8f63b5')
    assert.ok(observed.includes(await realpath(source)))

    const preview = join(project, 'themes/studio/preview.html')
    const previousPreview = await readFile(preview, 'utf8')
    const shadowed = editor('set', 'studio', '--sy-accent', '#123456', '--mode', 'dark')
    assert.equal(shadowed.status, 1)
    assert.match(shadowed.error, /^ERR_THEME_NO_EFFECT:/)
    assert.equal(await readFile(registryPath, 'utf8'), original)
    assert.equal(await readFile(preview, 'utf8'), previousPreview)
    await writeFile(source, 'export default { modes: { dark: { accent: 7 } } }\n')
    const invalidSource = editor('show', 'studio')
    assert.equal(invalidSource.status, 1)
    assert.match(invalidSource.error, /^ERR_THEME_INVALID:/)
    assert.equal(editor('set', 'studio', 'spacing', 'roomy').status, 1)
    assert.equal(await readFile(registryPath, 'utf8'), original)
    assert.equal(await readFile(preview, 'utf8'), previousPreview)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme editor embeds installed fonts and refreshes generated previews without changing authored routes', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-editor-preview-'))
  const editor = (...args) => invoke(project, 'experimental', 'theme', 'editor', ...args, '--json')
  const appCopy = join(project, 'src/themes/atelier')
  const route = 'src/theme-preview.vue'
  const work = '.syntrofic/preview-routes/src/theme-preview/'
  const component = work + 'App.vue'
  const receipt = join(project, work, '.preview-build.json')
  try {
    await writeFile(join(project, 'package.json'), '{"packageManager":"npm@10.0.0"}')
    await mkdir(join(project, 'node_modules/@fontsource-variable'), { recursive: true })
    await symlink(fileURLToPath(new URL('../../node_modules/@fontsource-variable/arimo', import.meta.url)),
      join(project, 'node_modules/@fontsource-variable/arimo'))
    assert.equal(editor('new', 'atelier').status, 0)
    const missing = editor('set', 'atelier', 'font', 'poppins', '--on', 'heading')
    assert.equal(missing.status, 0, missing.error)
    assert.deepEqual(missing.result.fontNotes, [{ family: 'Poppins', package: '@fontsource/poppins', status: 'missing', install: 'npm install @fontsource/poppins' }])

    const embedded = editor('set', 'atelier', 'font', 'Arimo, sans-serif')
    assert.equal(embedded.status, 0, embedded.error)
    assert.ok(embedded.result.fontNotes.some(note => note.family === 'Arimo' && note.status === 'embedded'))
    assert.equal(embedded.result.wiring.stylesheet, 'src/themes/atelier/theme.css')
    const font = /@font-face\{font-family:"Arimo";[^}]*url\(data:font\/woff2;base64,/
    assert.match(await readFile(join(appCopy, 'theme.css'), 'utf8'), font)
    assert.match(await readFile(join(project, 'themes/atelier/preview.html'), 'utf8'), font)
    const { loadProjectThemes } = await import('../../scripts/platform/vite.mjs')
    assert.match((await loadProjectThemes(project, {})).css(), font)
    const registry = join(project, 'syntrofic.themes.json')
    const saved = await readFile(registry, 'utf8')
    const rejected = editor('set', 'atelier', 'accent', '#734865', '--section', 'missing')
    assert.equal(rejected.status, 1, rejected.error)
    assert.match(rejected.error, /^ERR_INVALID_ARGUMENT:/)
    assert.equal(await readFile(registry, 'utf8'), saved)

    const installed = invoke(project, 'experimental', 'theme', 'preview', 'add', 'colors', '--route', route, '--theme', 'atelier', '--json')
    assert.equal(installed.status, 0, installed.error)
    const previousComponent = '<template><p>Earlier generated component</p></template>\n'
    const owned = JSON.parse(await readFile(receipt, 'utf8'))
    owned[component] = createHash('sha256').update(previousComponent).digest('hex')
    await writeFile(join(project, component), previousComponent)
    await writeFile(receipt, JSON.stringify(owned))
    const palette = editor('set', 'atelier', 'accent', '#734865')
    assert.equal(palette.status, 0, palette.error)
    assert.ok(palette.result.inAppPreview.files.includes(component))
    assert.ok(JSON.parse(await readFile(join(appCopy, 'palette.json'), 'utf8')).assignments.light['--sy-accent'])
    const current = await readFile(join(project, component), 'utf8')
    assert.match(current, /import\.meta\.glob[^\n]+palette\.json/)
    assert.match(current, /import\.meta\.glob[^\n]+manifest\.json/)
    assert.match(current, /SMotionText/)

    const authored = '<template><p>Studio preview page</p></template>\n'
    await writeFile(join(project, route), authored)
    const review = editor('show', 'atelier', '--section', 'colors')
    assert.equal(review.status, 0, review.error)
    assert.match(review.result.inAppPreview.error, /Preview route already has a file/)
    assert.equal(await readFile(join(project, route), 'utf8'), authored)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme editor reports contrast and header space for the precise rules that change them', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-theme-editor-diagnostics-'))
  const editor = (...args) => invoke(project, 'experimental', 'theme', 'editor', ...args, '--json')
  try {
    assert.equal(editor('new', 'atelier').status, 0)
    const scope = ['--on', 'button', '--when', 'variant:ghost+size:sm', '--state', 'hover']
    assert.equal(editor('set', 'atelier', 'background-color', '#ffffff', ...scope).status, 0)
    const foreground = editor('set', 'atelier', 'foreground', '#eeeeee', ...scope)
    assert.equal(foreground.status, 0, foreground.error)
    assert.ok(foreground.result.introducedContrast.some(problem =>
      problem.mode === 'light' && problem.target === 'button / size:sm / variant:ghost / hover' && problem.ratio < 4.5))

    const checks = editor('set', 'atelier', 'border-radius', '4px', '--on', 'checkbox', '--when', 'size:sm')
    assert.equal(checks.status, 0, checks.error)
    for (const target of ['checkbox', 'radio', 'switch']) {
      assert.ok(Object.values(checks.result.theme.rules).some(rule => rule.target === target && rule.declarations['border-radius'] === '4px'))
    }
    assert.equal(editor('set', 'atelier', 'height', '52px', '--on', 'app-shell-header').status, 0)
    assert.equal(editor('set', 'atelier', 'padding-block', '8px', '--on', 'app-shell-header').status, 0)
    const navigation = editor('set', 'atelier', 'min-height', '50px', '--on', 'top-nav')
    assert.equal(navigation.status, 0, navigation.error)
    assert.match(navigation.result.layoutIssues[0].fix, /height 66px --on app-shell-header/)
    assert.deepEqual(navigation.result.navigationReach.reaches, ['app-shell-header', 'layout-header'])
    assert.match(await readFile(join(project, 'themes/atelier/preview.html'), 'utf8'), /<section id="navigation"[\s\S]+aria-label="布局头部导航"/)
    const conflictingHeight = editor('set', 'atelier', 'height', '60px', '--on', 'layout-header')
    assert.equal(conflictingHeight.status, 0, conflictingHeight.error)
    assert.equal(conflictingHeight.result.navigationReach.conflict, 'height')
    const conflictingPadding = editor('set', 'atelier', 'height', '52.0px', '--on', 'layout-header')
    assert.equal(conflictingPadding.result.navigationReach.conflict, 'padding')
    const same = editor('set', 'atelier', 'padding-block', '8px', '--on', 'layout-header')
    assert.deepEqual(same.result.navigationReach.reaches, ['app-shell-header', 'layout-header'])
    assert.equal(editor('set', 'atelier', 'line-height', '19px', '--on', 'top-nav-item').status, 0)
    const tallItem = editor('set', 'atelier', 'padding', '16px 10px', '--on', 'top-nav-item')
    assert.ok(tallItem.result.layoutIssues.some(issue => issue.part === 'top-nav-item' && issue.height === 51 && issue.available === 36))
    const heading = editor('set', 'atelier', 'font-weight', '800', '--on', 'heading', '--when', 'level:2')
    assert.equal(heading.result.theme.rules['heading-both-base-level-2'].declarations['font-weight'], '800')
    assert.equal(editor('set', 'atelier', 'font-weight', '800', '--on', 'heading', '--when', 'level:7').status, 1)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('theme editor reports invalid projects, concurrent edits and blocked build outputs without writing changes', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-editor-build-'))
  const editor = (...args) => invoke(project, 'experimental', 'theme', 'editor', ...args, '--json')
  const registry = join(project, 'syntrofic.themes.json')
  const build = join(project, 'themes/atelier/theme.css')
  try {
    assert.match(editor('show', 'atelier').error, /^ERR_PROJECT_REQUIRED:/)
    await writeFile(join(project, 'package.json'), '{}')
    assert.match(editor('show', 'atelier').error, /^ERR_UNKNOWN_THEME:/)
    assert.equal(editor('new', 'atelier').status, 0)
    const previous = await readFile(registry, 'utf8')
    const css = await readFile(build, 'utf8')
    const app = join(project, 'src/themes/atelier/theme.css')
    const previousApp = await readFile(app, 'utf8')
    const lock = registry + '.lock'
    await writeFile(lock, 'working')
    assert.match(editor('set', 'atelier', 'spacing', '8px').error, /^ERR_THEME_BUSY:/)
    await rm(lock)
    await writeFile(build, '/* Studio-authored build */')
    assert.match(editor('set', 'atelier', 'spacing', '8px').error, /^ERR_FILE_EXISTS:/)
    assert.match(editor('show', 'atelier').error, /^ERR_FILE_EXISTS:/)
    assert.equal(await readFile(registry, 'utf8'), previous)
    assert.equal(await readFile(build, 'utf8'), '/* Studio-authored build */')
    assert.equal(await readFile(app, 'utf8'), previousApp)
    await writeFile(build, css)
    const preview = join(project, 'themes/atelier/preview.html')
    const previewReceipt = join(project, 'themes/atelier/.syntrofic-preview.json')
    const beforePreview = await readFile(preview, 'utf8')
    const validReceipt = await readFile(previewReceipt, 'utf8')
    const invalidReceipt = '{ incomplete preview receipt'
    await writeFile(previewReceipt, invalidReceipt)
    assert.match(editor('set', 'atelier', 'spacing', '8px').error, /^ERR_RENDER_FAILED:/)
    const source = join(project, 'themes/atelier/atelier.theme.ts')
    await writeFile(source, 'export default { spacing: 7 }\n')
    assert.match(editor('show', 'atelier', '--section', 'colors').error, /^ERR_RENDER_FAILED:/)
    for (const [file, contents] of [[registry, previous], [build, css], [app, previousApp], [preview, beforePreview], [previewReceipt, invalidReceipt]]) {
      assert.equal(await readFile(file, 'utf8'), contents)
    }
    await writeFile(previewReceipt, validReceipt)
    const shown = editor('show', 'atelier', '--section', 'colors')
    assert.equal(shown.status, 0, shown.error)
    assert.equal(shown.result.theme.spacing, 7)
    assert.equal(await readFile(registry, 'utf8'), previous)
    assert.equal(await readFile(app, 'utf8'), await readFile(build, 'utf8'))
    assert.notEqual(await readFile(preview, 'utf8'), beforePreview)
    await rm(source)
    const updated = editor('set', 'atelier', 'spacing', '8px')
    assert.equal(updated.status, 0, updated.error)
    assert.equal(updated.result.theme.spacing, 8)
    assert.equal(await readFile(app, 'utf8'), await readFile(build, 'utf8'))
    assert.notEqual(await readFile(build, 'utf8'), css)
    const unchecked = spawnSync(process.execPath, [cli, 'theme', 'editor', 'set', 'atelier', 'padding', '14px', '--on', 'card'], {
      cwd: project, encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_CHROMIUM_EXECUTABLE: process.execPath },
    })
    assert.equal(unchecked.status, 0, unchecked.stderr)
    assert.match(unchecked.stderr, /Saved, not checked \(ERR_THEME_NOT_CHECKED\)/)
    assert.deepEqual(JSON.parse(unchecked.stdout).verificationWarning.parts, ['card'])
    assert.match(await readFile(build, 'utf8'), /\.sy-card[^{}]*\{ padding: 14px;/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('authored integration exports, documentation relations, themes and versioned codemods activate from an installed package', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-integration-author-'))
  const author = join(project, 'integration')
  const modules = join(project, 'node_modules')
  const source = join(project, 'src', 'example.ts')
  const integration = '@review/examples'
  try {
    await Promise.all([mkdir(author), mkdir(join(modules, '@review'), { recursive: true }), mkdir(join(modules, '@syntrofic'), { recursive: true }), mkdir(join(project, 'src'))])
    await Promise.all([
      writeFile(join(author, 'package.json'), JSON.stringify({ name: integration, version: '1.0.0', exports: {}, files: ['syntrofic', 'syntrofic.integration.json'] })),
      writeFile(join(project, 'package.json'), JSON.stringify({ name: 'app', dependencies: { '@syntrofic/ui': '0.1.0' } })),
      writeFile(join(project, 'syntrofic.config.json'), JSON.stringify({ integrations: [integration], issuesUrl: 'https://example.com/issues', debug: 'commands.ndjson',
        hooks: { postCodemod: [{ name: 'record-review', command: process.execPath, args: ['./record.mjs', '{files}'] }] } })),
      writeFile(join(project, 'record.mjs'), 'import { writeFileSync } from "node:fs"; writeFileSync("upgraded-files.txt", process.argv.slice(2).join("\\n"))\n'),
      writeFile(source, 'export const status = "pending"\n'),
      symlink(author, join(modules, '@review', 'examples')),
      symlink(fileURLToPath(new URL('../../', import.meta.url)), join(modules, '@syntrofic', 'ui')),
    ])
    const add = (...args) => invoke(author, 'integration', 'add', ...args, '--json')
    assert.equal(add('component', 'ReviewPanel', '--dry-run').result.import, integration + '/review-panel')
    const component = add('component', 'ReviewPanel')
    assert.equal(component.status, 0, component.error)
    const pkg = JSON.parse(await readFile(join(author, 'package.json'), 'utf8'))
    assert.equal(pkg.exports['./review-panel'], './syntrofic/component/review-panel.vue')
    assert.equal(add('doc', 'review_steps', '--extends', 'standard-design').status, 0)
    assert.equal(add('doc', 'theme-review', '--parent', 'design/notes').status, 0)
    assert.equal(add('agent-doc', 'Check a white canvas before publishing.').status, 0)
    const theme = add('theme', 'studio-design', '--from', 'stone')
    assert.equal(theme.status, 0, theme.error)
    assert.equal(JSON.parse(await readFile(join(author, theme.result.contribution.file), 'utf8')).modes.light.canvas, '#ffffff')
    assert.equal(add('codemod', 'review-status').status, 1)
    const change = add('codemod', 'review-status', '--to', '0.1.0')
    assert.equal(change.status, 0, change.error)
    await writeFile(join(author, change.result.contribution.file),
      'export default function transform(text, { relativePath }) { return relativePath === "src/example.ts" ? text.replace("pending", "ready") : text }\n')
    const guide = invoke(project, 'docs', 'standard-design', '--json')
    assert.equal(guide.status, 0, guide.error)
    assert.match(JSON.stringify(guide.result), /review_steps/)
    assert.equal(invoke(project, 'docs', 'integrations/' + integration + '/design/notes/theme-review', '--json').status, 0)
    const doctor = invoke(project, 'doctor', '--json')
    assert.equal(doctor.status, 0, doctor.error)
    assert.equal(doctor.result.settings.integrations[0].name, integration)
    const draft = invoke(project, 'gap-report', 'Unknown', '--package', '@syntrofic/ui', '--category', 'other', '--reason', 'Layout option', '--dry-run', '--json')
    assert.equal(draft.status, 0, draft.error)
    assert.equal(draft.result.url, 'https://example.com/issues')
    assert.equal(upgrade(project, '--integration', integration, '--list').result.codemods[0].name, 'review-status')
    const preview = upgrade(project, '--from', '0.0.9', '--integration', integration)
    assert.equal(preview.status, 0, preview.error)
    assert.equal(preview.result.dryRun, true)
    assert.deepEqual(preview.result.hooks, [{ name: 'record-review', status: 'pending' }])
    await assert.rejects(readFile(join(project, 'upgraded-files.txt')), { code: 'ENOENT' })
    assert.match(await readFile(source, 'utf8'), /pending/)
    const apply = upgrade(project, '--from', '0.0.9', '--integration', integration, '--apply')
    assert.equal(apply.status, 0, apply.error)
    assert.equal(apply.result.written, true)
    assert.deepEqual(apply.result.hooks, [{ name: 'record-review', status: 'complete' }])
    assert.equal(await readFile(join(project, 'upgraded-files.txt'), 'utf8'), 'src/example.ts')
    assert.equal(await readFile(source, 'utf8'), 'export const status = "ready"\n')
    const packed = invoke(author, 'integration', 'verify', '--json')
    assert.equal(packed.status, 0, JSON.stringify(packed.result ?? packed.error))
    const log = (await readFile(join(project, 'commands.ndjson'), 'utf8')).trim().split('\n').map(line => JSON.parse(line))
    assert.ok(log.some(entry => entry.command === 'upgrade' && entry.status === 0))
    assert.ok(log.every(entry => !Object.hasOwn(entry, 'args')))
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('integration diagnostics explain replacements, catch invalid overlaps and check the packed artifact', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-integration-health-'))
  const integration = join(project, 'node_modules', '@review/design')
  const manifest = join(integration, 'syntrofic.integration.json')
  try {
    await mkdir(integration, { recursive: true })
    const valid = [
      { id: 'ProgressReview', kind: 'template', file: 'ProgressReview.vue', replaces: 'dashboard-progress' },
      { id: 'ReviewButton', kind: 'component', file: 'ReviewButton.vue', replaces: 'Button' },
      { id: 'ReviewGuide', kind: 'doc', file: 'ReviewGuide.md', extends: 'standard-design' },
    ]
    const save = entries => writeFile(manifest, JSON.stringify({ version: 1, package: '@review/design', contributions: entries }))
    const packageRecord = files => JSON.stringify({ name: '@review/design', version: '1.0.0', files })
    await Promise.all([
      writeFile(join(project, 'package.json'), '{"name":"test-project","dependencies":{"@review/design":"1.0.0"}}'),
      writeFile(join(integration, 'package.json'), packageRecord(['*.vue', '*.md', 'syntrofic.integration.json'])),
      writeFile(join(integration, 'ProgressReview.vue'), '<template><main /></template>'),
      writeFile(join(integration, 'ReviewButton.vue'), '<template><button>Review</button></template>'),
      writeFile(join(integration, 'ReviewGuide.md'), '# Review\n\nRead the {@link standard-design}.'),
      save(valid),
    ])
    const check = mode => invoke(project, 'doctor', 'integration', mode, '@review/design', '--json')
    assert.deepEqual(invoke(project, 'doctor', 'integration', '--json').result.actions, ['validate', 'components', 'templates', 'docs'])
    assert.deepEqual(invoke(project, 'integration', '--json').result.actions, ['add <kind> <name>', 'check', 'verify', 'pack'])
    assert.equal(check('validate').status, 0)
    assert.equal(check('templates').result.information[0].replaces, 'dashboard-progress')
    assert.match(check('components').result.information[0].command, /component SButton/)
    assert.equal(check('docs').result.information[0].extends, 'standard-design')

    const reviewed = [valid[0], { ...valid[1], props: [
      { name: 'label', type: 'number', required: true, description: 'See {@link missing-topic}.' },
      { name: 'colors', type: 'ColorToken[]' }, { name: 'extra', type: 'string' },
    ] }, valid[2]]
    await save(reviewed)
    await writeFile(join(integration, 'ReviewButton.vue'), `<script setup lang="ts">
defineProps<{ label?: string; colors: string[]; disabled?: boolean }>()
</script><template><button>Review</button></template>`)
    const props = check('components')
    assert.equal(props.status, 0, props.error)
    assert.deepEqual(props.result.skipped.map(item => item.id), ['ReviewButton.colors'])
    assert.match(props.result.warnings.join('\n'), /Prop type differs: ReviewButton.label is string/)
    assert.match(props.result.warnings.join('\n'), /Undocumented prop: ReviewButton.disabled/)
    assert.match(props.result.warnings.join('\n'), /Documented prop is absent: ReviewButton.extra/)
    assert.match(props.result.warnings.join('\n'), /Unknown document link in ReviewButton.label: missing-topic/)
    assert.match(props.result.warnings.join('\n'), /Prop required flag differs: ReviewButton.label/)
    const strict = invoke(integration, 'integration', 'check', '--strict', '--json')
    assert.equal(strict.status, 1)
    assert.deepEqual(strict.result.checks.map(item => item.mode), ['validate', 'components', 'templates', 'docs'])
    assert.equal(invoke(integration, 'integration', 'check', '--json').status, 0)

    const repeated = 'Use this view to compare active templates with the current brand settings.'
    await writeFile(join(integration, 'ReviewGuide.md'), '# Review\n\n' + repeated)
    await writeFile(join(integration, 'AuditGuide.md'), '# Audit\n\n' + repeated + '\n\nSee {@command docs standard-design}.')
    await save([...valid, { id: 'AuditGuide', kind: 'doc', file: 'AuditGuide.md' }])
    const docs = check('docs')
    assert.match(docs.result.warnings.join('\n'), /Repeated prose in AuditGuide and reviewguide/)
    assert.match(docs.result.warnings.join('\n'), /Use a documentation link in AuditGuide: standard-design/)
    await writeFile(join(integration, 'ReviewGuide.md'), '# Review\n\nRead the {@link standard-design}.')

    await save([...valid, { id: 'SecondProgress', kind: 'template', file: 'SecondProgress.vue', replaces: 'dashboard-progress' }])
    await writeFile(join(integration, 'SecondProgress.vue'), '<template><main /></template>')
    const overlap = check('templates')
    assert.equal(overlap.status, 1)
    assert.match(overlap.result.errors.join('\n'), /Multiple contributions replace/)
    await save(valid)
    assert.equal(invoke(integration, 'integration', 'pack', '--json').status, 1)
    const packed = invoke(integration, 'integration', 'pack', '--check', '--json')
    assert.equal(packed.status, 0, packed.error || packed.result?.errors.join('\n'))
    await writeFile(join(integration, 'package.json'), packageRecord(['*.vue', 'syntrofic.integration.json']))
    const omitted = invoke(integration, 'integration', 'verify', '--json')
    assert.equal(omitted.status, 1)
    assert.match(omitted.result.errors.join('\n'), /Missing from package output: ReviewGuide.md/)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('the CDN starter is generated at the selected path and preserves an existing file by default', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-template-cdn-'))
  try {
    const generated = invoke(project, 'template', '--cdn', 'demo.html', '--json')
    assert.equal(generated.status, 0, generated.error)
    assert.equal(generated.result.written, true)
    const path = join(project, 'demo.html')
    const html = await readFile(path, 'utf8')
    assert.match(html, /data-sy-theme="light"/)
    assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/vue@\d/)
    assert.match(html, /'aria-valuenow': progress\.value/)
    await writeFile(path, '<p>已有页面</p>')
    const preserved = invoke(project, 'template', '--cdn', 'demo.html', '--json')
    assert.equal(preserved.result.written, false)
    assert.equal(await readFile(path, 'utf8'), '<p>已有页面</p>')
    const overwrite = invoke(project, 'template', '--cdn', 'demo.html', '-f', '--json')
    assert.equal(overwrite.result.written, true)
    assert.equal(await readFile(path, 'utf8'), html)
    assert.equal(invoke(project, 'template', '--cdn', '--type', 'page').status, 1)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})

test('gap reports route to the replacement owner, run local handlers in order and wait for public confirmation', async () => {
  const project = await mkdtemp(join(tmpdir(), 'syntrofic-gap-report-'))
  try {
    const installed = join(project, 'node_modules', '@review/ui')
    const log = join(project, 'deliveries.ndjson')
    await mkdir(installed, { recursive: true })
    const handler = label => `import { appendFile } from 'node:fs/promises'
export default async (report) => appendFile(${JSON.stringify(log)}, JSON.stringify({ label: ${JSON.stringify(label)}, ...report }) + '\\n')`
    await Promise.all([
      writeFile(join(project, 'package.json'), JSON.stringify({ name: 'review', dependencies: { '@review/ui': '1.0.0' } })),
      writeFile(join(project, 'syntrofic.gap-report.json'), JSON.stringify({ handlers: [
        { module: './report.mjs', visibility: 'internal' },
        { module: './failed.mjs', visibility: 'internal' },
        { module: './public.mjs', visibility: 'public' },
      ] })),
      writeFile(join(project, 'report.mjs'), handler('project')),
      writeFile(join(project, 'failed.mjs'), 'export default () => { throw new Error("Fixture failure") }'),
      writeFile(join(project, 'public.mjs'), handler('public')),
      writeFile(join(installed, 'package.json'), JSON.stringify({ name: '@review/ui', version: '1.0.0' })),
      writeFile(join(installed, 'syntrofic.integration.json'), JSON.stringify({ version: 1, package: '@review/ui',
        issues: 'https://gitlab.example.test/review/ui/-/issues',
        contributions: [{ kind: 'component', id: 'ReviewButton', replaces: 'SButton', file: 'ReviewButton.vue' }],
        gapReportHandlers: [{ module: './report.mjs', visibility: 'internal' }],
      })),
      writeFile(join(installed, 'report.mjs'), handler('integration')),
    ])
    const listing = invoke(project, 'gap-report', '--list-categories', '--json')
    assert.deepEqual(listing.result.destinations.map(item => item.package), ['@syntrofic/ui', '@review/ui'])
    assert.ok(listing.result.categories.some(item => item.value === 'missing_variant'))
    const args = ['SButton', '--category', 'missing_variant', '--reason', 'Need compact spacing', '--agent']
    const draft = invoke(project, 'gap-report', ...args, '--dry-run', '--json')
    assert.equal(draft.result.status, 'draft')
    assert.equal(draft.result.report.package, '@review/ui')
    assert.equal(draft.result.report.source, 'agent')
    await assert.rejects(readFile(log), { code: 'ENOENT' })
    const delivered = invoke(project, 'gap-report', ...args, '--json')
    assert.equal(delivered.status, 1)
    assert.deepEqual(delivered.result.deliveries.map(item => item.status), ['delivered', 'failed', 'confirmation-required', 'delivered'])
    const entries = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
    assert.deepEqual(entries.map(entry => entry.label), ['project', 'integration'])
    const routed = invoke(project, 'gap-report', ...args, '--to', '@review/ui', '--json')
    assert.equal(routed.result.status, 'routed')
    assert.equal(routed.result.url, 'https://gitlab.example.test/review/ui/-/issues')
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 2)
  } finally {
    await rm(project, { force: true, recursive: true })
  }
})
