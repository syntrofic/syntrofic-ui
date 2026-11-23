import { records } from './catalog.mjs'
const migrations = new Map(records.filter(entry => entry.track === 'web' && entry.implementation).map(entry => [
  entry.name, entry.implementation.component,
]))
const legacy = new Map([
  ['Code', 'SCode'], ['Image', 'SImage'], ['Snippet', 'SSnippet'], ['Spacer', 'SSpacer'], ['User', 'SUser'],
])
const importDeclaration = /import\s*\{([^{}]+)\}\s*from\s*(['"])([^'"]+)\2/g
const supported = /^(?:@heroui|@nextui-org)\//
function specifiers(value) {
  return value.split(',').map(spec => spec.trim()).filter(Boolean).map(spec => {
    const [symbol, alias] = spec.split(/\s+as\s+/)
    return { symbol, alias: alias ?? symbol }
  })
}
export function migrationPlan(source) {
  const result = []
  for (const [match, specs, , name] of source.matchAll(importDeclaration)) {
    if (name !== '@syntrofic/ui' && !supported.test(name)) continue
    for (const { symbol, alias } of specifiers(specs)) {
      const target = name === '@syntrofic/ui' ? legacy.get(symbol) : migrations.get(symbol) ?? legacy.get(symbol)
      result.push({ from: name, symbol, alias, target: target ?? null,
        action: name === '@syntrofic/ui' && target ? 'update-import' : target ? 'convert-jsx-to-vue' : 'review' })
    }
  }
  return result
}
export function updateLegacyImports(source) {
  return source.replace(importDeclaration, (match, specs, quote, name) => {
    if (name !== '@syntrofic/ui' || !specifiers(specs).some(spec => legacy.has(spec.symbol))) return match
    const names = specifiers(specs).map(({ symbol, alias }) => {
      const target = legacy.get(symbol) ?? symbol
      return target === alias ? target : target + ' as ' + alias
    })
    return 'import { ' + names.join(', ') + ' } from ' + quote + name + quote
  })
}

const formatPlugins = ['typescript', 'jsx', 'decorators-legacy', 'importAttributes']

export async function upgradeLegacyImports(source, filename) {
  if (!source.includes('@syntrofic/ui')) return source
  const { babelParse, parse } = await import('vue/compiler-sfc')
  let blocks = [{ content: source, start: 0, lang: filename.split('.').at(-1) }]
  if (filename.endsWith('.vue')) {
    const { descriptor, errors } = parse(source, { filename })
    if (errors.length) throw new Error(String(errors[0]))
    blocks = [descriptor.script, descriptor.scriptSetup].filter(Boolean).map(block => ({
      content: block.content, start: block.loc.start.offset, lang: block.lang,
    }))
  }
  const changes = []
  for (const { content, start, lang } of blocks) {
    if (!content.includes('@syntrofic/ui')) continue
    const plugins = formatPlugins.filter(plugin => plugin !== 'jsx' || lang !== 'ts')
    const { program } = babelParse(content, { sourceType: 'unambiguous', plugins, allowUndeclaredExports: true })
    for (const node of program.body) {
      if (node.type !== 'ImportDeclaration' || node.source.value !== '@syntrofic/ui') continue
      for (const specifier of node.specifiers) {
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier') continue
        const original = specifier.imported.name
        const target = legacy.get(original)
        if (!target) continue
        const aliases = specifier.local.start !== specifier.imported.start
        changes.push({ start: start + specifier.imported.start, end: start + specifier.imported.end,
          text: aliases || original === target ? target : target + ' as ' + original })
      }
    }
  }
  for (const change of changes.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, change.start) + change.text + source.slice(change.end)
  }
  return source
}
