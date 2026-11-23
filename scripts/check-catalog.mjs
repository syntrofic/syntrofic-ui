import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { cliManifest } from './platform/cli-reference.mjs'

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const catalog = await readJson('../catalog/parity.json')
const implementation = await readJson('../catalog/implementation.json')
const manifest = await readJson('../package.json')
const nativeManifest = await readJson('../packages/native/package.json')
const nativeExports = await readFile(new URL('../packages/native/src/index.ts', import.meta.url), 'utf8')
const nativeNumbers = await readFile(new URL('../apps/native-demo/src/review-items.ts', import.meta.url), 'utf8')
const isNative = id => /^NP?\./.test(id)
const nativeReview = new Map([...nativeNumbers.matchAll(/id: '(NP?\.[^']+)', number: '(\d+)'/g)].map(([, id, number]) => [id, number]))
const counts = { web: 73, 'web-pro': 65, native: 39, 'native-pro': 53 }
for (const [track, count] of Object.entries(counts)) {
  assert.equal(catalog.components.filter(entry => entry.track === track && entry.milestone !== 'Astryx').length, count, track)
}
assert.equal(catalog.packageExports.length, 18)
assert.equal(catalog.platform.filter(entry => entry.id.startsWith('T-')).length, 7)
assert.equal(catalog.agentUI.length, 57)
assert.equal(catalog.legacyBlocks.length, 34)

const entries = [
  ...catalog.components, ...catalog.packageExports, ...catalog.platform, ...catalog.agentUI, ...catalog.legacyBlocks,
]
const ids = new Set(entries.map(entry => entry.id))
assert.equal(ids.size, entries.length, 'Duplicate catalog IDs')
const reviewNumbers = new Set()
for (const [id, entry] of Object.entries(implementation)) {
  assert(ids.has(id), `Unknown coverage ID ${id}`)
  assert(entry.component, `Missing component reference for ${id}`)
  const componentSource = entry.componentSource ?? `src/components/${entry.component}.vue`
  await access(new URL(`../${componentSource}`, import.meta.url))
  if (entry.moduleSource) await access(new URL(`../${entry.moduleSource}`, import.meta.url))
  const subpath = catalog.packageExports.find(item => item.track === 'web' && item.id === id)?.name
  if (subpath) {
    const declaration = (entry.moduleSource ?? componentSource).replace(/^src\//, './dist/').replace(/\.ts$/, '') + '.d.ts'
    assert.equal(manifest.exports[subpath]?.types, declaration, subpath)
  }
  if (entry.review) {
    assert(/^\d{3,}$/.test(entry.reviewNumber), `Missing review number for ${id}`)
    assert(!reviewNumbers.has(entry.reviewNumber), `Duplicate review number ${entry.reviewNumber}`)
    reviewNumbers.add(entry.reviewNumber)
  }
  if (isNative(id)) {
    assert(nativeExports.includes(`default as ${entry.component} }`), `Missing Native public export for ${id}`)
    assert.equal(nativeReview.get(id), entry.reviewNumber, `Native review number for ${id}`)
    assert.equal(entry.verification, 'native-bundle', `Missing Native build evidence for ${id}`)
    const scene = await readFile(new URL(`../${entry.review}`, import.meta.url), 'utf8')
    assert(scene.includes(`id === '${id}'`), `Missing Native review scene for ${id}`)
    const nativeSubpath = catalog.packageExports.find(item => item.track === 'native' && item.id === id)?.name
    if (nativeSubpath) {
      const declaration = (entry.moduleSource ?? componentSource).replace(/^packages\/native\/src\//, './dist/').replace(/\.ts$/, '') + '.d.ts'
      assert.equal(nativeManifest.exports[nativeSubpath]?.types, declaration, nativeSubpath)
    }
  }
}
assert.equal(nativeReview.size, Object.keys(implementation).filter(isNative).length)
console.log(`${ids.size} tracked items, ${Object.keys(implementation).length} with implementation evidence`)

const astryx = await readJson('../catalog/astryx.json')
assert.match(astryx.revision, /^[\da-f]{40}$/)
assert.equal(catalog.sources.astryx, astryx.repository + '/tree/' + astryx.revision)
const webExports = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
const helpers = await readFile(new URL('../src/rac/index.ts', import.meta.url), 'utf8')
const toolingExports = await readFile(new URL(manifest.exports['./vite'].import, new URL('../', import.meta.url)), 'utf8')
const toolManifest = new Map(cliManifest().commands.map(entry => [entry.name, entry]))
toolManifest.set('postinstall', { name: 'postinstall' })
for (const [group, rows] of Object.entries(astryx.groups)) {
  assert.equal(new Set(rows.map(([name]) => name)).size, rows.length, 'Duplicate Astryx name in ' + group)
  for (const [name, source, status, symbol, id] of rows) {
    assert.match(source, /^packages\/[\w./-]+$/)
    assert(['mapped', 'partial', 'gap'].includes(status), name)
    assert.equal(Boolean(symbol), status !== 'gap', name)
    if (group === 'tool' && symbol?.startsWith('syntrofic ')) {
      const [, command, ...args] = symbol.split(' ')
      const entry = toolManifest.get(command)
      assert(entry && (!args.length || entry.subcommands?.some(item => (item + ' ').startsWith(args.join(' ') + ' '))), name)
      continue
    }
    if (id) {
      const entry = implementation[id]
      assert(entry && (entry.component === symbol || entry.related?.includes(symbol)), name)
      if (entry.component !== symbol) assert(new RegExp('\\b' + symbol + '\\b').test(webExports), name)
    }
    if (symbol && !id) assert(new RegExp('\\b' + symbol + '\\b').test(webExports + helpers + nativeExports + toolingExports), name)
  }
}
const standardScenes = await readFile(new URL('../preview/StandardReview.vue', import.meta.url), 'utf8')
for (const { id } of catalog.components.filter(entry => entry.milestone === 'Astryx' && entry.track === 'web')) {
  assert(implementation[id] && standardScenes.includes("id === '" + id + "'"), 'Missing standard preview ' + id)
  assert(webExports.includes(implementation[id].component), 'Missing Vue public export ' + id)
}
console.log(Object.values(astryx.groups).flat().length + ' Astryx reference entries')

const astryxExamples = await readJson('../catalog/astryx-examples.json')
assert.equal(astryxExamples.revision, astryx.revision)
const exampleReferences = new Set()
for (const [component, examples] of Object.entries(astryxExamples.groups)) {
  assert.match(component, /^[\w-]+$/)
  assert(examples.length, component)
  assert.equal(new Set(examples).size, examples.length, component)
  for (const example of examples) {
    assert.match(example, /^[\w-]+$/)
    exampleReferences.add(component + '/' + example)
  }
}
for (const [example, id] of Object.entries(astryxExamples.verified)) {
  assert(exampleReferences.has(example), 'Unknown Astryx example ' + example)
  assert(id.startsWith('W') && implementation[id]?.review, 'Missing Web preview for ' + example)
}
console.log(`${exampleReferences.size} Astryx standalone examples, ${Object.keys(astryxExamples.verified).length} with reviewed examples`)

const { standardTemplates } = await import('../site/template-catalog.mjs')
const templateReferences = new Map(astryx.groups.template.map(row => [row[0], row]))
assert.equal(new Set(standardTemplates.map(template => template.id)).size, standardTemplates.length)
for (const { id, component, island } of standardTemplates) {
  assert.equal(templateReferences.get(id)?.[3], component, 'Missing Astryx template reference for ' + id)
  assert.match(webExports, new RegExp('\\b' + component + '\\b'))
  assert.match(island, /^[a-z]+-template$/)
}
const { components, templates } = await import('../site/content.mjs')
const sitePreviews = new Set(components.filter(component => component.preview).map(component => component.id))
for (const [example, id] of Object.entries(astryxExamples.verified)) {
  assert(sitePreviews.has(id), 'Missing official site preview for ' + example)
}
const siteTemplates = new Set(templates.map(template => template.id))
for (const id of templateReferences.keys()) assert(siteTemplates.has(id), 'Missing Astryx template preview ' + id)
