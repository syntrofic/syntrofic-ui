<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import { loadEmojiCategories, type EmojiCategory, type EmojiChoice, type EmojiLocale, type EmojiTone } from '../internal/emoji-data'
import SMotionText from './SMotionText.vue'

const props = defineProps<{
  locale: EmojiLocale
  size: 'sm' | 'md' | 'lg'
  categories?: readonly EmojiCategory[]
  recent: readonly string[]
  tone: EmojiTone
  autofocus?: boolean
  theme?: string
}>()
const emit = defineEmits<{ select: [choice: EmojiChoice]; tone: [tone: EmojiTone] }>()
const copy = computed(() => props.locale === 'zh'
  ? { search: '搜索表情', category: '表情类别', results: '表情结果', browse: '选择类别', all: '全部', recent: '最近使用', tone: '肤色', tones: ['默认', '较浅', '中浅', '中等', '中深', '较深'], empty: '没有匹配的表情', loading: '正在载入表情', failed: '无法载入表情', retry: '重试', prompt: '选择一个表情' }
  : { search: 'Search emoji', category: 'Emoji category', results: 'Emoji results', browse: 'Browse categories', all: 'All', recent: 'Recent', tone: 'Skin tone', tones: ['Default', 'Light', 'Medium light', 'Medium', 'Medium dark', 'Dark'], empty: 'No matching emoji', loading: 'Loading emoji', failed: 'Could not load emoji', retry: 'Retry', prompt: 'Choose an emoji' })
const base = ref<readonly EmojiCategory[]>([])
const loadState = ref<'loading' | 'ready' | 'failed'>('loading')
const retryKey = ref(0)
const customOrLoaded = computed(() => props.categories ?? base.value)
const all = computed(() => customOrLoaded.value.flatMap(category => category.items))
const recentItems = computed(() => {
  const lookup = new Map<string, EmojiChoice>()
  for (const item of all.value) {
    lookup.set(item.glyph, item)
    for (const choice of Object.values(item.tones ?? {})) lookup.set(choice.glyph, choice)
  }
  return props.recent.flatMap(glyph => lookup.get(glyph) ?? [])
})

onMounted(() => {
  watch(() => [props.locale, props.categories, retryKey.value] as const, async ([locale, categories], _, onCleanup) => {
    if (categories) {
      loadState.value = 'ready'
      return
    }
    let current = true
    onCleanup(() => { current = false })
    loadState.value = 'loading'
    base.value = []
    try {
      const groups = await loadEmojiCategories(locale)
      if (current) {
        base.value = groups
        loadState.value = 'ready'
      }
    } catch {
      if (current) loadState.value = 'failed'
    }
  }, { immediate: true })
  if (props.autofocus) search.value?.focus({ preventScroll: true })
})

const allCategories = Symbol('all')
const recentCategory = Symbol('recent')
const group = ref<string | typeof allCategories | typeof recentCategory>(allCategories)
const query = ref('')
const categoryIndex = computed(() => query.value.trim() ? -1 : customOrLoaded.value.findIndex(category => category.id === group.value))
const normalized = (value: string) => value.toLowerCase().normalize('NFKD').replace(/\p{Mark}/gu, '')
const words = computed(() => normalized(query.value).trim().split(/\s+/u).filter(Boolean))
const entries = computed<readonly EmojiChoice[]>(() => {
  if (words.value.length === 0 && group.value === recentCategory) return recentItems.value
  const source = words.value.length || group.value === allCategories
    ? all.value
    : customOrLoaded.value.find(category => category.id === group.value)?.items ?? []
  return source.flatMap(item => {
    const toned = item.tones?.[props.tone] ?? item
    if (!words.value.length) return toned
    const explicit = Object.values(item.tones ?? {}).find(choice => choice.glyph === query.value.trim())
    if (explicit) return explicit
    const haystack = normalized([item.glyph, item.label, toned.glyph, toned.label, ...(item.keywords ?? [])].join(' '))
    return words.value.every(word => haystack.includes(word)) ? toned : []
  })
})

const search = useTemplateRef<HTMLInputElement>('search')
const grid = useTemplateRef<HTMLDivElement>('grid')
const id = useId()
const active = ref(0)
const hover = ref<EmojiChoice>()
const columns = computed(() => ({ sm: 6, md: 7, lg: 8 })[props.size])
const rowHeight = computed(() => ({ sm: 34, md: 38, lg: 42 })[props.size])
const rowCount = computed(() => Math.ceil(entries.value.length / columns.value))
const windowing = useVirtualizer<HTMLDivElement, Element>(computed(() => ({
  count: rowCount.value,
  getScrollElement: () => grid.value,
  estimateSize: () => rowHeight.value,
  overscan: 2,
  initialRect: { width: 0, height: rowHeight.value * 5 },
  rangeExtractor(range) {
    const indices = defaultRangeExtractor(range)
    const activeRow = Math.floor(active.value / columns.value)
    return activeRow < rowCount.value && !indices.includes(activeRow)
      ? [...indices, activeRow].sort((a, b) => a - b)
      : indices
  },
})))
const rows = computed(() => windowing.value.getVirtualItems())
const cellId = (index: number) => `${id}-emoji-${index}`
const activeId = computed(() => entries.value[active.value] ? cellId(active.value) : undefined)
const status = computed(() => {
  if (loadState.value === 'loading') return copy.value.loading
  if (loadState.value === 'failed') return copy.value.failed
  if (!entries.value.length) return copy.value.empty
  return (hover.value ?? entries.value[active.value])?.label ?? copy.value.prompt
})

watch([group, words, customOrLoaded], () => {
  active.value = 0
  hover.value = undefined
  if (grid.value) grid.value.scrollTop = 0
})

function chooseCategory(category: typeof group.value) {
  query.value = ''
  group.value = category
}

function browse(event: Event) {
  const index = Number((event.target as HTMLSelectElement).value)
  const category = customOrLoaded.value[index]
  if (category) chooseCategory(category.id)
}

function select(index: number) {
  const entry = entries.value[index]
  if (!entry) return
  active.value = index
  emit('select', { glyph: entry.glyph, label: entry.label })
}

function move(next: number) {
  active.value = Math.min(entries.value.length - 1, Math.max(0, next))
  hover.value = undefined
  windowing.value.scrollToIndex(Math.floor(active.value / columns.value), { align: 'auto' })
}

function fromSearch(event: KeyboardEvent) {
  if (event.isComposing || !entries.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    grid.value?.focus({ preventScroll: true })
    move(0)
  } else if (event.key === 'Enter' && words.value.length) {
    event.preventDefault()
    select(0)
  }
}

function fromGrid(event: KeyboardEvent) {
  if (event.altKey || event.metaKey || !entries.value.length) return
  const rtl = grid.value && getComputedStyle(grid.value).direction === 'rtl'
  const index = active.value
  const width = columns.value
  const start = index - index % width
  let next: number
  switch (event.key) {
    case 'ArrowLeft': next = index + (rtl ? 1 : -1); break
    case 'ArrowRight': next = index + (rtl ? -1 : 1); break
    case 'ArrowUp': next = index - width; break
    case 'ArrowDown': next = index + width; break
    case 'Home': next = event.ctrlKey ? 0 : start; break
    case 'End': next = event.ctrlKey ? entries.value.length - 1 : start + width - 1; break
    case 'PageUp': next = index - width * 5; break
    case 'PageDown': next = index + width * 5; break
    case 'Enter':
    case ' ': event.preventDefault(); select(index); return
    default: return
  }
  event.preventDefault()
  move(next)
}
</script>

<template>
  <div class="sy-emoji-picker" :data-size="size" :data-sy-theme="theme"
    :style="{ '--sy-emoji-columns': columns, '--sy-emoji-row': rowHeight + 'px' }">
    <div class="sy-emoji-picker__tools">
      <input ref="search" v-model="query" class="sy-field__control sy-emoji-picker__search" type="search"
        :aria-label="copy.search" :placeholder="copy.search" spellcheck="false" @keydown="fromSearch">
      <select class="sy-field__control sy-emoji-picker__tone" :aria-label="copy.tone" :value="tone"
        @change="emit('tone', Number(($event.target as HTMLSelectElement).value) as EmojiTone)">
        <option v-for="(label, index) in copy.tones" :key="label" :value="index">{{ label }}</option>
      </select>
    </div>
    <div class="sy-emoji-picker__categories" role="group" :aria-label="copy.category">
      <button type="button" :aria-pressed="group === allCategories || words.length > 0" @click="chooseCategory(allCategories)">{{ copy.all }}</button>
      <button type="button" :disabled="!recent.length" :aria-pressed="group === recentCategory && !words.length" @click="chooseCategory(recentCategory)">{{ copy.recent }}</button>
      <select class="sy-field__control sy-emoji-picker__browse" :aria-label="copy.category" :value="categoryIndex"
        :disabled="!customOrLoaded.length" @change="browse">
        <option :value="-1" disabled>{{ copy.browse }}</option>
        <option v-for="(category, index) in customOrLoaded" :key="category.id" :value="index">{{ category.label }}</option>
      </select>
    </div>
    <div ref="grid" class="sy-emoji-picker__grid" role="grid" tabindex="0" :aria-label="copy.results"
      :aria-colcount="columns" :aria-rowcount="rowCount" :aria-activedescendant="activeId"
      :aria-busy="loadState === 'loading' || undefined" @keydown="fromGrid" @pointerleave="hover = undefined">
      <div role="presentation" class="sy-emoji-picker__spacer" :style="{ blockSize: windowing.getTotalSize() + 'px' }">
        <div v-for="row in rows" :key="row.index" class="sy-emoji-picker__row" role="row" :aria-rowindex="row.index + 1"
          :style="{ transform: 'translateY(' + row.start + 'px)' }">
          <div v-for="(entry, column) in entries.slice(row.index * columns, (row.index + 1) * columns)" :key="entry.glyph"
            :id="cellId(row.index * columns + column)" role="gridcell" :aria-label="entry.label" :aria-colindex="column + 1"
            :data-active="active === row.index * columns + column || undefined"
            @pointerenter="hover = entry" @click="select(row.index * columns + column)">{{ entry.glyph }}</div>
        </div>
      </div>
    </div>
    <div class="sy-emoji-picker__status">
      <SMotionText :value="status" />
      <button v-if="loadState === 'failed'" type="button" @click="retryKey++">{{ copy.retry }}</button>
    </div>
  </div>
</template>
