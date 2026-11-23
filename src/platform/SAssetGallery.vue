<script lang="ts">
import type { LightboxMedia } from '../components/SLightbox.vue'

export interface GalleryAsset extends LightboxMedia {
  title: string
  category?: string
  thumbnail?: string
  thumbnailFit?: 'cover' | 'contain'
  ratio?: number
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { documentFocus } from '../internal/focus-order'
import { holdLayoutSwap } from '../internal/layout-content'
import SButton from '../components/SButton.vue'
import SLightbox from '../components/SLightbox.vue'
import SMotionText from '../components/SMotionText.vue'
import SSearchField from '../components/SSearchField.vue'
import SSegment from '../components/SSegment.vue'
import SSkeleton from '../components/SSkeleton.vue'
import SSpinner from '../components/SSpinner.vue'
import SThumbnail from '../components/SThumbnail.vue'

const props = withDefaults(defineProps<{
  assets: readonly GalleryAsset[]
  label: string
  description?: string
  layout?: 'classic' | 'mixed' | 'side' | 'hero'
  searchLabel?: string
  categoriesLabel?: string
  allLabel?: string
  emptyLabel?: string
  categories?: readonly string[]
  loading?: boolean
  loadingLabel?: string
  error?: string
  retryLabel?: string
  viewLabel?: string
  closeLabel?: string
  nextLabel?: string
  previousLabel?: string
}>(), { layout: 'classic', searchLabel: 'Filter gallery', categoriesLabel: 'Media categories', allLabel: 'All', emptyLabel: 'No results', viewLabel: 'View asset',
  closeLabel: 'Close', nextLabel: 'Next', previousLabel: 'Previous', loadingLabel: 'Loading assets', retryLabel: 'Retry' })
const emit = defineEmits<{ retry: [] }>()
const query = defineModel<string>('query', { default: '' })
const category = defineModel<string>('category', { default: '' })
const frame = useTemplateRef<HTMLElement>('frame')
const search = useTemplateRef('search')
const open = ref(false)
const viewerAssets = shallowRef<readonly GalleryAsset[]>([])
const activeId = ref<string>()
let removedFromViewer = false
const at = computed({
  get: () => Math.max(0, viewerAssets.value.findIndex(asset => asset.id === activeId.value)),
  set: value => { activeId.value = viewerAssets.value[value]?.id },
})
const categories = computed(() => [...new Set(props.categories ?? props.assets.flatMap(asset => asset.category ? [asset.category] : []))])
const categoryOptions = computed(() => [{ value: 'all', label: props.allLabel }, ...categories.value.map(label => ({ value: 'category:' + label, label }))])
const chosen = computed(() => categories.value.includes(category.value) ? 'category:' + category.value : 'all')
const items = computed(() => props.assets.filter(asset => (chosen.value === 'all' || asset.category === category.value) &&
  [asset.title, asset.category].join(' ').toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const keys = computed(() => items.value.map(asset => asset.id))
const placeholderTiles = [1.7, .86, 1.2]
const columnCount = computed(() => props.assets.length || placeholderTiles.length)
const state = computed(() => props.loading && !props.assets.length ? 'loading'
  : !props.assets.length && props.error ? 'error' : items.value.length ? 'results' : 'empty')
const refreshError = computed(() => Boolean(props.error && props.assets.length && !props.loading))
const refresh = computed(() => props.loading && props.assets.length > 0)

function openAsset(asset: GalleryAsset, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
  removedFromViewer = false
  viewerAssets.value = items.value
  activeId.value = asset.id
  open.value = true
}
function closeViewer() {
  if (open.value) return
  viewerAssets.value = []
  activeId.value = undefined
  if (removedFromViewer) moveFocusToSearch()
  removedFromViewer = false
}
watch(items, next => {
  if (!open.value) return
  if (next.some(asset => asset.id === activeId.value)) viewerAssets.value = next
  else {
    removedFromViewer = true
    open.value = false
  }
})

function ratio(defaultRatio: number) {
  if (props.layout === 'hero') return .8
  return props.layout === 'classic' ? 1.5 : defaultRatio
}
function assetRatio(asset: GalleryAsset) {
  const fallback = placeholderTiles[[...asset.id].reduce((sum, mark) => sum + mark.codePointAt(0)!, 0) % placeholderTiles.length]
  return ratio(asset.ratio && Number.isFinite(asset.ratio) && asset.ratio > 0 ? asset.ratio : fallback)
}

function moveFocusToSearch() {
  search.value?.input?.focus({ preventScroll: true })
}
function retry() {
  moveFocusToSearch()
  emit('retry')
}
watch(keys, next => {
  const viewport = frame.value
  const focused = viewport && documentFocus(viewport.ownerDocument)
  const tile = viewport?.contains(focused ?? null) ? focused?.closest<HTMLElement>('[data-gallery-asset]') : undefined
  if (tile?.dataset.galleryAsset && !next.includes(tile.dataset.galleryAsset)) moveFocusToSearch()
})

const tiles = (content: HTMLElement) => Array.from(content.querySelectorAll<HTMLElement>('[data-gallery-asset]'))
function captureVisible(content: HTMLElement, viewport: HTMLElement) {
  const bounds = viewport.getBoundingClientRect()
  if (bounds.bottom <= 0 || bounds.top >= (viewport.ownerDocument.defaultView?.innerHeight ?? Infinity)) return
  return holdLayoutSwap(content, viewport)
}
useCollectionContentMotion(frame, () => `${props.layout}:${state.value}:${refreshError.value}`, {
  items: () => keys.value,
  itemRows: tiles,
  capture: captureVisible,
  captureLeaving(content, viewport, indices) {
    const rows = tiles(content)
    const limit = viewport.ownerDocument.defaultView?.innerHeight ?? Infinity
    const visible = new Set(indices.filter(index => {
      const box = rows[index]?.getBoundingClientRect()
      return box && box.bottom > 0 && box.top < limit
    }))
    if (!visible.size) return
    const snapshot = captureVisible(content, viewport)
    if (!snapshot) return
    for (const [index, copy] of tiles(snapshot.copy).entries()) {
      if (!visible.has(index)) copy.style.visibility = 'hidden'
      else copy.style.translate = getComputedStyle(rows[index]).translate
    }
    return snapshot
  },
})
</script>

<template>
  <section class="sy-asset-gallery" :data-layout="layout" :aria-label="label">
    <div class="sy-asset-gallery__layout">
      <header class="sy-asset-gallery__header">
        <div><h2>{{ label }}</h2><p v-if="description">{{ description }}</p></div>
        <div v-if="$slots.actions" class="sy-asset-gallery__actions"><slot name="actions" /></div>
        <div class="sy-asset-gallery__filters">
          <SSearchField ref="search" v-model="query" :label="searchLabel" />
          <SSegment v-if="categories.length > 1" :model-value="chosen" :items="categoryOptions" :label="categoriesLabel"
            @update:model-value="value => category = value?.startsWith('category:') ? value.slice(9) : ''" />
        </div>
      </header>
      <div ref="frame" class="sy-asset-gallery__results" :data-state="state">
        <div class="sy-collection-content__body sy-asset-gallery__body" :data-layout="layout" :style="{ '--sy-gallery-column-count': columnCount }">
          <ul v-if="state === 'results'" class="sy-asset-gallery__tiles" role="list" :aria-busy="refresh || undefined">
            <li v-for="asset in items" :key="asset.id" class="sy-asset-gallery__tile" :data-gallery-asset="asset.id">
              <SThumbnail :src="asset.thumbnail ?? (asset.type === 'video' ? asset.poster : asset.src)" :alt="asset.alt"
                :label="viewLabel + ' · ' + asset.title" actionable :ratio="assetRatio(asset)" :fit="asset.thumbnailFit" @activate="openAsset(asset, $event)" />
              <span class="sy-asset-gallery__caption"><strong>{{ asset.title }}</strong><small v-if="asset.category">{{ asset.category }}</small></span>
            </li>
          </ul>
          <ul v-else-if="state === 'loading'" class="sy-asset-gallery__tiles" aria-hidden="true">
            <li v-for="(aspect, index) in placeholderTiles" :key="index" class="sy-asset-gallery__tile">
              <SSkeleton class="sy-asset-gallery__placeholder" :style="{ aspectRatio: ratio(aspect) }" :index="index" />
              <span class="sy-asset-gallery__caption">
                <SSkeleton shape="line" width="7rem" :index="index" />
                <SSkeleton shape="line" width="3.5rem" :index="index" />
              </span>
            </li>
          </ul>
          <p v-else-if="state === 'empty'" class="sy-asset-gallery__notice" role="status">{{ emptyLabel }}</p>
          <div v-if="state === 'error' || refreshError" class="sy-asset-gallery__notice" :data-inline="refreshError || undefined">
            <span role="alert"><SMotionText :value="error ?? ''" /></span>
            <SButton size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
          </div>
        </div>
        <Transition name="sy-asset-gallery-progress">
          <span v-if="loading" class="sy-asset-gallery__progress" :data-active="refresh || undefined" role="status">
            <SSpinner v-if="refresh" size="sm" decorative />
            <span class="sy-visually-hidden">{{ loadingLabel }}</span>
          </span>
        </Transition>
      </div>
    </div>
    <SLightbox v-model:open="open" v-model:index="at" :media="viewerAssets" :label="label"
      :close-label="closeLabel" :next-label="nextLabel" :previous-label="previousLabel" @close="closeViewer" />
  </section>
</template>
