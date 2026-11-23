import MarkdownIt, { type Token } from 'markdown-it'
import { computed, defineAsyncComponent, h, toValue, type MaybeRefOrGetter, type VNodeChild } from 'vue'
import { contentUrl } from './content-url'
import type { ChatSourceInfo } from '../chat/types'
import SLink from '../components/SLink.vue'

const SCodeBlock = defineAsyncComponent(() => import('../components/SCodeBlock.vue'))
const SChatSource = defineAsyncComponent(() => import('../components/SChatSource.vue'))
const parser = new MarkdownIt({ html: false, linkify: true })
parser.validateLink = url => contentUrl(url) !== undefined
parser.inline.ruler.after('link', 'sy_citation', (state, silent) => {
  const { sources, citationOrder } = state.env as { sources?: MarkdownDisplayOptions['sources']; citationOrder?: Map<string, number> }
  if (!sources || !citationOrder || state.linkLevel || state.src[state.pos] !== '[') return false
  const match = /^\[([\w-]+)\]/.exec(state.src.slice(state.pos, state.posMax))
  if (!match || !Object.hasOwn(sources, match[1]) || !sources[match[1]]) return false
  if (!silent) {
    const token = state.push('sy_citation', '', 0)
    token.content = match[1]
    if (!citationOrder.has(token.content)) citationOrder.set(token.content, citationOrder.size + 1)
    token.meta = { number: citationOrder.get(token.content), marker: match[0] }
  }
  state.pos += match[0].length
  return true
})
const allowed = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'em', 'strong', 's',
  'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
])

export type MarkdownTransform = (tokens: Token[], context: { source: string; final: boolean }) => Token[] | void
export interface MarkdownOutlineOptions {
  headingPrefix?: string
  headingLevelStart?: 1 | 2 | 3 | 4 | 5 | 6
  plugins?: readonly MarkdownTransform[]
  isFinal?: boolean
}

export interface MarkdownDisplayOptions {
  externalLinks?: boolean
  copyCode?: boolean
  copyLabel?: string
  copiedLabel?: string
  failureLabel?: string
  scrollLabel?: string
  tableLabel?: string
  headingIds?: boolean
  headingPrefix?: string
  headingLevelStart?: MarkdownOutlineOptions['headingLevelStart']
  density?: 'default' | 'compact'
  sources?: Readonly<Record<string, (ChatSourceInfo & { icon?: string }) | undefined>>
  citationStyle?: 'label' | 'number'
  citationNumberLabel?: (number: number, title: string) => string
  plugins?: readonly MarkdownTransform[]
}

export interface MarkdownHeading { id: string; label: string; depth: number; level: number }

function markdownTokens(source: string, plugins: readonly MarkdownTransform[] = [], final = true, sources?: MarkdownDisplayOptions['sources']) {
  let tokens = parser.parse(source, sources ? { sources, citationOrder: new Map<string, number>() } : {})
  for (const transform of plugins) tokens = transform(tokens, { source, final }) ?? tokens
  return tokens
}

function assignHeadingIds(tokens: Token[], prefix = '', rootOnly = false) {
  const used = new Set<string>()
  return tokens.flatMap((token, index): MarkdownHeading[] => {
    if (token.type !== 'heading_open') return []
    const inline = tokens[index + 1]
    const label = inline?.children?.filter(item => ['text', 'code_inline', 'image'].includes(item.type))
      .map(item => item.content).join('').trim() || inline?.content || ''
    const slug = label.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, '-').replace(/^-|-$/g, '') || 'section'
    const custom = token.attrGet('id')
    const base = typeof custom === 'string' && custom ? custom : prefix + slug
    let id = base
    let occurrence = 2
    while (used.has(id)) id = base + '-' + occurrence++
    used.add(id)
    token.attrSet('id', id)
    const level = Number(token.tag.slice(1))
    return rootOnly && token.level !== 0 ? [] : [{ id, label, depth: level, level }]
  })
}

function headingLevel(level: number, start = 1) { return Math.min(6, level + start - 1) }

export function parseOutlineFromMarkdown(source: string, options: MarkdownOutlineOptions = {}) {
  return assignHeadingIds(markdownTokens(source, options.plugins, options.isFinal), options.headingPrefix, true)
    .map(heading => ({ ...heading, level: headingLevel(heading.level, options.headingLevelStart), depth: headingLevel(heading.depth, options.headingLevelStart) }))
}

export function useOutlineFromMarkdown(source: MaybeRefOrGetter<string>, options?: MaybeRefOrGetter<string | MarkdownOutlineOptions | undefined>) {
  return computed(() => {
    const settings = toValue(options)
    return parseOutlineFromMarkdown(toValue(source), typeof settings === 'string' ? { headingPrefix: settings } : settings)
  })
}

export interface LinkifyPattern {
  pattern: RegExp
  href: (match: RegExpExecArray) => string
  label?: (match: RegExpExecArray) => string
  external?: boolean
}
export interface LinkifyPart { text: string; href?: string; external?: boolean }
export interface LinkifyOptions { hasBuiltins?: boolean; patterns?: readonly LinkifyPattern[] }

export function linkifyMatches(text: string, options: LinkifyOptions = {}) {
  const candidates: { start: number; end: number; part: LinkifyPart }[] = []
  for (const item of options.patterns ?? []) {
    const pattern = new RegExp(item.pattern.source, item.pattern.flags.includes('g') ? item.pattern.flags : item.pattern.flags + 'g')
    for (const match of text.matchAll(pattern)) {
      const href = contentUrl(item.href(match))
      if (!href || !match[0]) continue
      candidates.push({ start: match.index, end: match.index + match[0].length, part: { text: item.label?.(match) ?? match[0], href, external: item.external } })
    }
  }
  if (options.hasBuiltins !== false) for (const match of parser.linkify.match(text) ?? []) {
    const href = contentUrl(match.url)
    if (href) candidates.push({ start: match.index, end: match.lastIndex, part: { text: match.raw, href, external: /^https?:/i.test(href) } })
  }
  const matches: typeof candidates = []
  let position = 0
  for (const { start, end, part } of candidates.sort((a, b) => a.start - b.start)) {
    if (start < position) continue
    matches.push({ start, end, part })
    position = end
  }
  return matches
}

function linkify(text: string, options: LinkifyOptions) {
  const result: LinkifyPart[] = []
  let position = 0
  for (const { start, end, part } of linkifyMatches(text, options)) {
    if (start > position) result.push({ text: text.slice(position, start) })
    result.push(part)
    position = end
  }
  if (position < text.length || !result.length) result.push({ text: text.slice(position) })
  return result
}

export function useLinkify(text: MaybeRefOrGetter<string>, options: MaybeRefOrGetter<LinkifyOptions> = {}) {
  return computed(() => linkify(toValue(text), toValue(options)))
}

export function markdownBlocks(source: string, options: MarkdownDisplayOptions = {}, final = true) {
  const blocks: Token[][] = []
  let pending: Token[] = []
  let depth = 0
  const tokens = markdownTokens(source, options.plugins, final, options.sources)
  if (options.headingIds) assignHeadingIds(tokens, options.headingPrefix)
  for (const token of tokens) {
    pending.push(token)
    depth += token.nesting
    if (depth === 0) {
      blocks.push(pending)
      pending = []
    }
  }
  return blocks
}

function attributes(token: Token, options: MarkdownDisplayOptions): Record<string, unknown> {
  const title = token.attrGet('title')
  if (token.type === 'heading_open') return { id: token.attrGet('id') ?? undefined }
  if (token.tag === 'a') {
    const href = contentUrl(token.attrGet('href'))
    const blank = options.externalLinks && href && /^(https?:)?\/\//i.test(href)
    return { href, title, target: blank ? '_blank' : undefined, rel: blank ? 'noopener noreferrer' : undefined }
  }
  if (token.tag === 'ol') return { start: token.attrGet('start') }
  if (token.tag === 'th' || token.tag === 'td') {
    const align = /^text-align:(left|center|right)$/.exec(String(token.attrGet('style') ?? ''))
    if (align) return { style: { textAlign: align[1] } }
  }
  return {}
}

export function markdownNodes(tokens: readonly Token[], options: MarkdownDisplayOptions): VNodeChild[] {
  const root: VNodeChild[] = []
  const parents: { token: Token; children: VNodeChild[]; task: boolean }[] = []
  const add = (child: VNodeChild) => (parents.at(-1)?.children ?? root).push(child)
  for (const token of tokens) {
    if (token.nesting === 1 && allowed.has(token.tag)) {
      parents.push({ token, children: [], task: false })
    } else if (token.nesting === -1 && parents.at(-1)?.token.tag === token.tag) {
      const parent = parents.pop()!
      const attrs = attributes(parent.token, options)
      if (parent.task) attrs.class = 'sy-markdown__task'
      const tag = parent.token.type === 'heading_open' ? 'h' + headingLevel(Number(token.tag.slice(1)), options.headingLevelStart) : token.tag
      const node = parent.token.hidden ? parent.children : tag === 'a' && attrs.href
        ? h(SLink, attrs, () => parent.children) : h(tag, attrs, parent.children)
      add(token.tag === 'table' ? h('div', { class: 'sy-markdown__table', tabindex: 0, role: 'region', 'aria-label': options.tableLabel }, [node]) : node)
    } else if (token.type === 'inline') {
      const inline = token.children ?? []
      const current = parents.at(-1)
      const item = parents.at(-2)
      const first = inline[0]
      const task = item?.token.tag === 'li' && current?.token.hidden && first?.type === 'text'
        ? /^\[([xX ])\]\s+/.exec(first.content) : null
      if (task && item && first) {
        item.task = true
        add(h('input', { type: 'checkbox', disabled: true, tabindex: -1, checked: task[1] !== ' ' }))
        add(first.content.slice(task[0].length))
        add(markdownNodes(inline.slice(1), options))
      } else add(markdownNodes(inline, options))
    } else if (token.type === 'fence' || token.type === 'code_block') {
      add(h(SCodeBlock, {
        code: token.content.replace(/\n$/, ''),
        language: /^[\w+.-]{1,40}/.exec(token.info.trim())?.[0],
        copyable: options.copyCode,
        copyLabel: options.copyLabel, copiedLabel: options.copiedLabel, failureLabel: options.failureLabel,
        scrollLabel: options.scrollLabel,
      }))
    } else if (token.type === 'image') {
      const src = contentUrl(token.attrGet('src'), true)
      add(src ? h('img', { src, alt: token.content, title: token.attrGet('title'), loading: 'lazy' }) : token.content)
    } else if (token.type === 'sy_citation') {
      const source = options.sources?.[token.content]
      const citation = token.meta as { number?: number; marker?: string } | null
      add(source ? h(SChatSource, { source, icon: source.icon, variant: options.citationStyle,
        number: citation?.number, numberLabel: options.citationNumberLabel })
        : citation?.marker ?? '[' + token.content + ']')
    } else if (token.type === 'code_inline') {
      add(h('code', token.content))
    } else if (token.type === 'hardbreak') {
      add(h('br'))
    } else if (token.type === 'hr') {
      add(h('hr'))
    } else if (token.type === 'softbreak') {
      add('\n')
    } else if (token.content) {
      add(token.content)
    }
  }
  return root
}
