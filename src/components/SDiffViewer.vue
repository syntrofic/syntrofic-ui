<script setup lang="ts">
import { computed, defineComponent, h, ref, useId, useTemplateRef, watch, type PropType } from 'vue'
import { renderCode } from '../internal/code-highlight'
import { createDiffFile, inlineDiff, type DiffFile, type DiffFragment, type DiffLine, type DiffLineReference } from '../internal/diff-lines'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'
import { syntaxStyle, type SyntaxThemeDefinition } from '../internal/syntax-theme'
import SButton from './SButton.vue'
import SScrollableArea from './SScrollableArea.vue'
import SToggleButton from './SToggleButton.vue'

const props = withDefaults(defineProps<{
  before?: string
  after?: string
  file?: DiffFile
  label?: string
  viewMode?: 'unified' | 'split'
  beforeLabel?: string
  afterLabel?: string
  changedLabel?: string
  lineLabel?: string
  addLabel?: string
  removeLabel?: string
  binaryLabel?: string
  showFullLabel?: string
  largeChangeLabel?: (count: number) => string
  statusLabels?: Partial<Record<NonNullable<DiffFile['status']>, string>>
  context?: number
  language?: string
  syntaxTheme?: SyntaxThemeDefinition
  lineNumbers?: boolean
  wrapped?: boolean
  changeIndicator?: 'classic' | 'bars' | 'none'
  inlineHighlight?: 'word' | 'char' | 'none'
  changeBackground?: boolean
  collapsible?: boolean
  lineInteractive?: boolean
  annotationLines?: readonly DiffLineReference[]
  maxHeight?: LayoutSize
  scrollLabel?: string
}>(), { before: '', after: '', viewMode: 'unified', beforeLabel: 'Before', afterLabel: 'After', changedLabel: 'Changes only',
  lineLabel: 'Line', addLabel: 'Added', removeLabel: 'Removed', binaryLabel: 'Binary file', showFullLabel: 'Show full diff',
  context: 3, lineNumbers: true, changeIndicator: 'classic', inlineHighlight: 'word', changeBackground: true, collapsible: true, scrollLabel: 'Scroll diff horizontally' })
defineSlots<{ headerEnd?(): unknown; annotation?(reference: DiffLineReference): unknown }>()
const emit = defineEmits<{ lineClick: [reference: DiffLineReference, event: MouseEvent] }>()
const changesOnly = defineModel<boolean>('changesOnly', { default: false })
const collapsed = defineModel<boolean>('collapsed', { default: false })
const full = defineModel<boolean>('full', { default: false })
const id = useId()
const file = computed(() => props.file ?? createDiffFile({ oldValue: props.before, newValue: props.after }))
const path = computed(() => file.value.status === 'renamed' ? [file.value.oldPath, file.value.newPath].filter(Boolean).join(' → ')
  : file.value.newPath ?? file.value.oldPath)
const title = computed(() => props.label ?? path.value ?? 'Changes')
const language = computed(() => props.language ?? (file.value.newPath ?? file.value.oldPath)?.split('.').at(-1))
const palette = computed(() => props.syntaxTheme && syntaxStyle(props.syntaxTheme.tokens))
const split = computed(() => props.viewMode === 'split')
const sharedScroll = computed(() => split.value && !props.wrapped)
const table = useTemplateRef<HTMLTableElement>('table')
const track = useTemplateRef<HTMLDivElement>('track')
const overflow = ref(0)
const offset = ref(0)
const counts = computed(() => {
  let added = 0
  let removed = 0
  for (const { lines } of file.value.hunks) for (const line of lines) {
    if (line.type === 'add') added++
    else if (line.type === 'remove') removed++
  }
  return { added, removed, changed: added + removed }
})
const status = computed(() => file.value.status && file.value.status !== 'modified'
  ? props.statusLabels?.[file.value.status] ?? { added: 'Added', deleted: 'Deleted', renamed: 'Renamed' }[file.value.status] : undefined)
const annotations = computed(() => new Set(props.annotationLines?.map(referenceKey)))
const folded = computed(() => !full.value && !annotations.value.size && (counts.value.changed > 2000 || file.value.hunks.some(hunk => hunk.replaced)))
watch(file, () => { full.value = false })

function referenceKey({ side, lineNumber }: DiffLineReference) { return side + ':' + lineNumber }
function reference(line: DiffLine, side: DiffLineReference['side']): DiffLineReference | undefined {
  const lineNumber = side === 'old' ? line.oldLine : line.newLine
  return lineNumber === undefined ? undefined : { side, lineNumber }
}
interface Cell {
  line?: DiffLine
  numbers: readonly (DiffLineReference | undefined)[]
  fragments?: readonly DiffFragment[]
}
type Row = Cell[] | null
const columns = computed(() => props.lineNumbers ? split.value ? 4 : 3 : split.value ? 2 : 1)

function surrounding(lines: readonly DiffLine[]) {
  if (!changesOnly.value) return lines
  const margin = Math.max(0, Math.trunc(props.context))
  const changes = lines.flatMap((line, index) => line.type !== 'context'
    || [reference(line, 'old'), reference(line, 'new')].some(item => item && annotations.value.has(referenceKey(item))) ? [index] : [])
  const selected: (DiffLine | null)[] = []
  let change = 0
  let omitted = false
  lines.forEach((line, index) => {
    while (changes[change] !== undefined && changes[change] < index - margin) change++
    if (changes[change] !== undefined && changes[change] <= index + margin) {
      selected.push(line)
      omitted = false
    } else if (!omitted) {
      selected.push(null)
      omitted = true
    }
  })
  return selected
}
function cell(line: DiffLine | undefined, side?: DiffLineReference['side'], fragments?: readonly DiffFragment[]): Cell {
  const numbers: Cell['numbers'] = side ? [line && reference(line, side)] : [line && reference(line, 'old'), line && reference(line, 'new')]
  return { line, numbers, fragments }
}
function rowsFor(lines: readonly (DiffLine | null)[]) {
  const rows: Row[] = []
  let pending: DiffLine[] = []
  function flush() {
    const before = pending.filter(line => line.type === 'remove')
    const after = pending.filter(line => line.type === 'add')
    const fragments = new Map<DiffLine, DiffFragment[]>()
    for (let index = 0; index < Math.max(before.length, after.length); index++) {
      const old = before[index]
      const next = after[index]
      if (old && next && props.inlineHighlight !== 'none') {
        const [a, b] = inlineDiff(old.text, next.text, props.inlineHighlight)
        fragments.set(old, a)
        fragments.set(next, b)
      }
      if (split.value) rows.push([cell(old, 'old', fragments.get(old)), cell(next, 'new', fragments.get(next))])
    }
    if (!split.value) rows.push(...pending.map(line => [cell(line, undefined, fragments.get(line))]))
    pending = []
  }
  for (const line of lines) {
    if (line && line.type !== 'context') {
      pending.push(line)
      continue
    }
    flush()
    rows.push(!line ? null : split.value ? [cell(line, 'old'), cell(line, 'new')] : [cell(line)])
  }
  flush()
  return rows
}
const sections = computed(() => folded.value || file.value.binary ? [] : file.value.hunks.map(hunk => ({
  label: hunk.header, rows: rowsFor(surrounding(hunk.lines)),
})))
watch([table, sections, sharedScroll, collapsed], ([node, _sections, active, hidden], _, cleanup) => {
  if (!node || !active || hidden) {
    if (!hidden) { overflow.value = 0; offset.value = 0 }
    return
  }
  const view = node.ownerDocument.defaultView
  if (!view) return
  const viewport = view
  const body = node
  let frame = 0
  let disposed = false
  function measure() {
    frame = 0
    let width = 0
    for (const line of body.querySelectorAll<HTMLElement>('.sy-diff-viewer__line-content')) {
      width = Math.max(width, line.scrollWidth - (line.parentElement?.clientWidth ?? line.clientWidth))
    }
    overflow.value = Math.ceil(width)
    offset.value = Math.min(offset.value, overflow.value)
    if (track.value) track.value.scrollLeft = offset.value
  }
  function schedule() {
    if (!frame && !disposed) frame = viewport.requestAnimationFrame(measure)
  }
  const observer = new view.ResizeObserver(schedule)
  observer.observe(node)
  void node.ownerDocument.fonts?.ready.then(schedule)
  measure()
  cleanup(() => {
    disposed = true
    observer.disconnect()
    if (frame) view.cancelAnimationFrame(frame)
  })
}, { flush: 'post' })
function horizontalWheel(event: WheelEvent) {
  if (!sharedScroll.value || !track.value || !overflow.value || event.ctrlKey) return
  const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX
  if (!delta || !event.shiftKey && Math.abs(delta) <= Math.abs(event.deltaY)) return
  event.preventDefault()
  track.value.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.value.clientWidth : 1)
}
function trackScroll(event: Event) { offset.value = (event.currentTarget as HTMLElement).scrollLeft }
function notes(cells: readonly Cell[]) {
  if (!annotations.value.size) return []
  return cells.flatMap(entry => entry.numbers).filter((item): item is DiffLineReference =>
    Boolean(item && annotations.value.has(referenceKey(item))))
}
function numberLabel(item: DiffLineReference) {
  return (item.side === 'old' ? props.beforeLabel : props.afterLabel) + ' ' + item.lineNumber
}
function canClick(entry: Cell, item: DiffLineReference) {
  return props.lineInteractive && (entry.line?.type !== 'context' || item.side === 'new')
}
const DiffCode = defineComponent({
  props: { text: { type: String, required: true }, fragments: Array as PropType<readonly DiffFragment[]>, language: String },
  setup: code => () => h('code', code.fragments?.some(segment => segment.changed)
    ? code.fragments.map(segment => segment.changed ? h('mark', renderCode(segment.text, code.language)) : renderCode(segment.text, code.language))
    : renderCode(code.text, code.language)),
})
</script>

<template>
  <figure class="sy-diff-viewer" :data-view="viewMode" :data-wrapped="wrapped || undefined" :data-line-numbers="lineNumbers || undefined"
    :data-syntax-theme="syntaxTheme?.name"
    :data-shared-scroll="sharedScroll || undefined" :style="[palette, { '--sy-diff-scroll-x': -offset + 'px' }]"
    :data-indicator="changeIndicator" :data-change-background="changeBackground || undefined">
    <figcaption>
      <div class="sy-diff-viewer__title">
        <SButton v-if="path && collapsible" size="sm" variant="ghost" :aria-expanded="!collapsed" :aria-controls="id" @click="collapsed = !collapsed">{{ path }}</SButton>
        <strong v-else>{{ path ?? title }}</strong>
        <small v-if="status">{{ status }}</small>
        <span v-if="path && !file.binary" class="sy-diff-viewer__counts"><span>+{{ counts.added }}</span> <span>−{{ counts.removed }}</span></span>
      </div>
      <div class="sy-diff-viewer__controls">
        <slot name="headerEnd" />
        <SToggleButton v-if="!file.binary && !collapsed" v-model="changesOnly">{{ changedLabel }}</SToggleButton>
      </div>
    </figcaption>
    <div :id="id" v-show="!collapsed">
      <p v-if="file.binary" class="sy-diff-viewer__notice">{{ binaryLabel }}</p>
      <div v-else-if="folded" class="sy-diff-viewer__notice">
        <p>{{ largeChangeLabel?.(counts.changed) ?? `Large change (${counts.changed} lines)` }}</p>
        <SButton size="sm" variant="secondary" @click="full = true">{{ showFullLabel }}</SButton>
      </div>
      <SScrollableArea v-else :label="title" :axis="split ? 'block' : 'both'" class="sy-diff-viewer__scroll"
        :style="{ maxBlockSize: layoutSize(maxHeight) }" @wheel="horizontalWheel">
        <table ref="table" :aria-label="title" dir="ltr">
          <thead><tr>
            <th v-if="lineNumbers" scope="col" class="sy-diff-viewer__number">{{ beforeLabel }}</th>
            <th v-if="split || lineNumbers" scope="col" :class="{ 'sy-diff-viewer__number': !split }">{{ split ? lineLabel : afterLabel }}</th>
            <th v-if="split && lineNumbers" scope="col" class="sy-diff-viewer__number">{{ afterLabel }}</th>
            <th scope="col">{{ lineLabel }}</th>
          </tr></thead>
          <tbody v-for="(section, part) in sections" :key="part">
            <tr v-if="section.label" class="sy-diff-viewer__hunk"><th :colspan="columns" scope="rowgroup">{{ section.label }}</th></tr>
            <template v-for="(row, index) in section.rows" :key="index">
              <tr v-if="row">
                <template v-for="(entry, side) in row" :key="side">
                  <template v-if="lineNumbers">
                    <td v-for="(item, slot) in entry.numbers" :key="slot" class="sy-diff-viewer__number" :data-change="entry.line?.type" :data-column="side">
                      <button v-if="item && canClick(entry, item)" type="button" :aria-label="numberLabel(item)" @click="emit('lineClick', item, $event)">{{ item.lineNumber }}</button>
                      <span v-else>{{ item?.lineNumber }}</span>
                    </td>
                  </template>
                  <td class="sy-diff-viewer__line" :data-change="entry.line?.type" :data-column="side">
                    <div v-if="entry.line" class="sy-diff-viewer__line-clip">
                      <span class="sy-diff-viewer__line-content">
                        <span v-if="entry.line.type !== 'context'" class="sy-visually-hidden">{{ entry.line.type === 'add' ? addLabel : removeLabel }}</span>
                        <span v-if="changeIndicator !== 'none'" class="sy-diff-viewer__change" aria-hidden="true">
                          {{ changeIndicator === 'classic' ? entry.line.type === 'add' ? '+' : entry.line.type === 'remove' ? '−' : ' ' : '' }}
                        </span>
                        <DiffCode :text="entry.line.text" :fragments="entry.fragments" :language="language" />
                      </span>
                    </div>
                  </td>
                </template>
              </tr>
              <tr v-else class="sy-diff-viewer__hunk"><td :colspan="columns">…</td></tr>
              <tr v-for="note in row ? notes(row) : []" :key="referenceKey(note)" class="sy-diff-viewer__annotation">
                <td v-if="split && note.side === 'new'" :colspan="columns / 2" />
                <td :colspan="split ? columns / 2 : columns"><div dir="auto"><slot name="annotation" v-bind="note" /></div></td>
                <td v-if="split && note.side === 'old'" :colspan="columns / 2" />
              </tr>
            </template>
          </tbody>
        </table>
      </SScrollableArea>
      <div v-if="sharedScroll && overflow > 0" ref="track" class="sy-diff-viewer__scroll-track" role="region" tabindex="0"
        :aria-label="scrollLabel" dir="ltr" @scroll.passive="trackScroll">
        <span aria-hidden="true" :style="{ '--sy-diff-scroll-overflow': overflow + 'px' }" />
      </div>
    </div>
  </figure>
</template>
