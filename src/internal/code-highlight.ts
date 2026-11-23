import { h, type VNodeChild } from 'vue'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)
const aliases: Record<string, string> = {
  vue: 'xml', jsx: 'javascript', tsx: 'typescript', shell: 'bash', sh: 'bash', text: 'plaintext', txt: 'plaintext',
}
type HighlightNode = ReturnType<typeof lowlight.highlight>['children'][number]

function displayNode(node: HighlightNode): VNodeChild {
  if (node.type === 'text') return node.value
  if (node.type === 'element') {
    return h('span', { class: node.properties.className }, node.children.map(displayNode))
  }
  return null
}

function highlightCode(code: string, language?: string) {
  const name = language?.trim().toLowerCase()
  if (!name || code.length > 150_000) return
  const syntax = aliases[name] ?? name
  if (!lowlight.registered(syntax)) return
  try {
    return lowlight.highlight(syntax, code).children
  } catch {
    return
  }
}

export function renderCode(code: string, language?: string): VNodeChild[] {
  return highlightCode(code, language)?.map(displayNode) ?? [code]
}

export function renderCodeLines(code: string, language?: string): VNodeChild[][] {
  const nodes = highlightCode(code, language)
  if (!nodes) return code.split('\n').map(line => [line])
  const lines: VNodeChild[][] = [[]]
  function add(node: HighlightNode, wrappers: readonly ((child: VNodeChild) => VNodeChild)[]) {
    if (node.type === 'element') {
      const wrap = (child: VNodeChild) => h('span', { class: node.properties.className }, [child])
      for (const inner of node.children) add(inner, [...wrappers, wrap])
    } else if (node.type === 'text') {
      for (const [index, piece] of node.value.split('\n').entries()) {
        if (index) lines.push([])
        if (piece) lines.at(-1)?.push(wrappers.reduceRight<VNodeChild>((child, wrap) => wrap(child), piece))
      }
    }
  }
  for (const node of nodes) add(node, [])
  return lines
}
