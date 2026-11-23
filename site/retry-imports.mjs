import { isAbsolute, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePath, parseAst } from 'vite'

function importsIn(code) {
  if (!/\bimport\s*\(/.test(code)) return []
  const imports = []
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (node.type === 'ImportExpression' && typeof node.source.value === 'string'
      && /^(?:\.{1,2}\/|\/[^/])/.test(node.source.value)) imports.push(node)
    for (const value of Object.values(node)) visit(value)
  }
  visit(parseAst(code).body)
  return imports
}

async function wrapImports(code, specifier) {
  const changes = await Promise.all(importsIn(code).map(async node => {
    const path = await specifier(node.source.value)
    if (!path) return
    const { start, end } = node
    const load = '() => ' + code.slice(start, end)
    return { start, end, expression: '(globalThis[Symbol.for("syntrofic.site.import")] ?? ((_path, _base, load) => load()))('
      + JSON.stringify(path) + ', import.meta.url, ' + load + ')' }
  }))
  const edits = changes.filter(Boolean).sort((a, b) => b.start - a.start)
  if (!edits.length) return null
  for (const { start, end, expression } of edits) code = code.slice(0, start) + expression + code.slice(end)
  return { code, map: null }
}

export function retryImports(root) {
  const project = normalizePath(fileURLToPath(new URL('../', import.meta.url)))
  const sourceRoot = normalizePath(root)
  return {
    name: 'syntrofic-site-retry-imports',
    enforce: 'post',
    transform(code, id) {
      if (this.environment.mode !== 'dev' || !id.startsWith(project) || id.includes('/node_modules/')
        || !/\.(?:ts|vue)(?:\?|$)/.test(id)) return null
      return wrapImports(code, async path => {
        const target = await this.resolve(path, id)
        if (!target || target.external || !isAbsolute(target.id)) return
        const local = normalizePath(relative(sourceRoot, target.id))
        return local.startsWith('../') ? '/@fs/' + normalizePath(target.id).replace(/^\//, '') : '/' + local
      })
    },
    renderChunk(code, _, { format }) {
      if (format !== 'es') return null
      return wrapImports(code, path => path)
    },
  }
}
