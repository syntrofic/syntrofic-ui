import { Extension } from '@tiptap/core'
import { isHistoryTransaction } from '@tiptap/pm/history'
import type { Mark, Node } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { linkifyMatches, type LinkifyOptions } from './markdown-content'

export interface RichTextAutoLinkOptions extends LinkifyOptions {
  newTab?: boolean
  onChange?: (url: string | null, previous: string | null) => void
}

interface Span { from: number; to: number; href: string; mark?: Mark }
const autoAttr = 'syntroficAutoLink'

function touchedSpans(doc: Node, from: number, to: number, collect: (node: Node, position: number) => void) {
  const limit = doc.content.size
  doc.nodesBetween(Math.max(0, Math.min(from, limit)), Math.min(to + 1, limit), (node, pos) => {
    if (!node.isTextblock) return true
    if (!node.type.spec.code) collect(node, pos + 1)
    return false
  })
}
function automaticMarks(block: Node, base: number): Span[] {
  const spans: Span[] = []
  block.forEach((node, offset) => {
    const mark = node.marks.find(mark => mark.type.name === 'link' && mark.attrs[autoAttr] === true)
    if (!node.isText || !mark || typeof mark.attrs.href !== 'string') return
    const from = base + offset
    const to = from + node.nodeSize
    const previous = spans.at(-1)
    if (previous?.to === from && previous.mark?.eq(mark)) previous.to = to
    else spans.push({ from, to, href: mark.attrs.href, mark })
  })
  return spans
}

export function createRichTextAutoLink(options: RichTextAutoLinkOptions | (() => RichTextAutoLinkOptions | false) = {}) {
  return Extension.create({
    name: 'syntroficAutoLink',
    addGlobalAttributes() {
      return [{ types: ['link'], attributes: { [autoAttr]: { default: false, rendered: false } } }]
    },
    addProseMirrorPlugins() {
      return [new Plugin({
        appendTransaction(transactions, previous, state) {
          const config = typeof options === 'function' ? options() : options
          const type = state.schema.marks.link
          if (!config || !type || !transactions.some(item => item.docChanged) || transactions.some(item => (
            item.getMeta(autoAttr) || item.getMeta('preventAutolink') || item.getMeta('syntrofic-replace') || isHistoryTransaction(item)
          ))) return
          const start = previous.doc.content.findDiffStart(state.doc.content)
          if (start === null) return
          const end = previous.doc.content.findDiffEnd(state.doc.content)
          const from = Math.max(0, start - 1)
          const through = Math.max(start, end?.b ?? start)
          const tr = state.tr.setMeta(autoAttr, true)
          touchedSpans(state.doc, from, through, (block, base) => {
            const existing = automaticMarks(block, base)
            const valid: Span[] = []
            const source = block.textBetween(0, block.content.size, '\n', node => '\n'.repeat(node.nodeSize))
            for (const match of linkifyMatches(source, config)) {
              const href = match.part.href
              const start = base + match.start
              const end = base + match.end
              if (!href || !(start <= through && end >= from) && !existing.some(item => item.from < end && item.to > start)) continue
              let blocked = false
              block.nodesBetween(match.start, match.end, node => {
                if (!node.isText || node.marks.some(mark => mark.type.spec.code || mark.type === type && !mark.attrs[autoAttr])) blocked = true
              })
              if (!blocked && block.type.allowsMarkType(type)) valid.push({ from: start, to: end, href })
            }
            const same = (a: Span, b: Span) => a.from === b.from && a.to === b.to && a.href === b.href
            for (const item of existing) if (!valid.some(next => same(item, next))) tr.removeMark(item.from, item.to, item.mark)
            for (const item of valid) if (!existing.some(previous => same(item, previous))) tr.addMark(item.from, item.to, type.create({
              href: item.href, target: config.newTab === false ? null : '_blank', rel: 'noopener noreferrer', [autoAttr]: true,
            }))
          })
          if (config.onChange) {
            const before: Span[] = []
            const after: Span[] = []
            touchedSpans(previous.doc, from, Math.max(start, end?.a ?? start), (node, base) => before.push(...automaticMarks(node, base)))
            touchedSpans(tr.doc, from, through, (node, base) => after.push(...automaticMarks(node, base)))
            for (const item of [...before]) {
              const index = after.findIndex(match => match.href === item.href)
              if (index === -1) continue
              after.splice(index, 1)
              before.splice(before.indexOf(item), 1)
            }
            const change = config.onChange
            const updates = Array.from({ length: Math.max(before.length, after.length) }, (_, index) => [after[index]?.href ?? null, before[index]?.href ?? null] as const)
            if (updates.length) queueMicrotask(() => { for (const [href, previous] of updates) change(href, previous) })
          }
          return tr.docChanged ? tr : undefined
        },
      })]
    },
  })
}
