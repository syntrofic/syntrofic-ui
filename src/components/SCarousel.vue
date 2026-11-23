<script setup lang="ts">
import { useReducedMotion } from '../internal/reduced-motion'
import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType, type EmblaPluginType } from 'embla-carousel'
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, useId, watch, type CSSProperties } from 'vue'
import { carouselContext, type CarouselControls, type CarouselSlide } from '../internal/carousel'
import { createCarouselScroll, type NativeCarouselPosition, type NativeCarouselScroll } from '../internal/carousel-scroll'
import type { SnapPaging } from '../internal/snap-paging'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  label: string
  slides: readonly CarouselSlide[]
  defaultIndex?: number
  type?: 'in-place' | 'modal' | 'miniatures'
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  loop?: boolean
  slidesPerView?: number
  gap?: string
  height?: string
  navigation?: 'dots' | 'thumbnails' | 'none'
  showControls?: boolean
  fadeEdges?: boolean
  autoplay?: boolean
  delay?: number
  pauseOnHover?: boolean
  stopOnInteraction?: boolean
  previousLabel?: string
  nextLabel?: string
  playLabel?: string
  pauseLabel?: string
  navigationLabel?: string
  carouselDescription?: string
  slideDescription?: string
  slideLabel?: (slide: CarouselSlide, index: number, count: number) => string
  pageLabel?: (index: number, count: number) => string
  options?: EmblaOptionsType
  plugins?: readonly EmblaPluginType[]
  hasSnap?: boolean | SnapPaging
}>(), {
  defaultIndex: 0, type: 'in-place', orientation: 'horizontal', loop: false,
  slidesPerView: 1, gap: '8px', navigation: 'dots', showControls: true,
  fadeEdges: undefined,
  autoplay: false, delay: 4500, pauseOnHover: true, stopOnInteraction: true,
  previousLabel: 'Previous', nextLabel: 'Next', playLabel: 'Play', pauseLabel: 'Pause',
  navigationLabel: 'Choose a slide', carouselDescription: 'carousel', slideDescription: 'slide',
})
const emit = defineEmits<{ ready: [api: EmblaCarouselType]; change: [index: number] }>()
const model = defineModel<number>()
const root = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const rotationButton = ref<HTMLElement | null>(null)
const viewportId = `sy-carousel-${useId()}`
const api = shallowRef<EmblaCarouselType>()
const snap = props.hasSnap
const nativeSnap = Boolean(snap)
const nativeReady = ref(false)
const pagingAttached = ref(false)
let scroll: NativeCarouselScroll | undefined
let pager: ReturnType<typeof import('../internal/carousel-pager').attachCarouselPager> | undefined
const visible = ref<number[]>([])
const selectedIndex = ref(0)
const scrollSnapCount = ref(0)
const canScrollPrevious = ref(false)
const canScrollNext = ref(false)
const prefersReduce = useReducedMotion(viewport)
const explicitPlay = ref(false)
const paused = ref(false)
const hovering = ref(false)
const focusedInside = ref(false)
const pageVisible = ref(false)
const intersecting = ref(false)
const resolvedDirection = ref<'ltr' | 'rtl'>('ltr')
const orientation = computed(() => props.options?.axis === 'y' || (props.options?.axis === undefined && props.orientation === 'vertical') ? 'vertical' : 'horizontal')
const perView = computed(() => Number.isFinite(props.slidesPerView) ? Math.max(1, props.slidesPerView) : 1)
const fades = computed(() => props.fadeEdges ?? (nativeSnap || perView.value > 1))
const trackStyle = computed<CSSProperties>(() => ({
  '--sy-carousel-height': props.height,
  '--sy-carousel-gap': props.gap,
  '--sy-carousel-per-view': perView.value,
}))
const initial = computed(() => indexInRange(model.value ?? props.options?.startIndex ?? props.defaultIndex, Math.max(1, props.slides.length - Math.ceil(perView.value) + 1)))
const current = computed(() => api.value || nativeReady.value ? selectedIndex.value : initial.value)
const total = computed(() => api.value || nativeReady.value ? scrollSnapCount.value : Math.max(0, props.slides.length - Math.ceil(perView.value) + 1))
const requestedPlay = computed(() => props.autoplay && !paused.value && (!prefersReduce.value || explicitPlay.value) && total.value > 1)
const playing = computed(() => requestedPlay.value && pageVisible.value && intersecting.value &&
  (!props.pauseOnHover || !hovering.value) && !focusedInside.value)

function indexInRange(value: number, count: number) {
  return Math.max(0, Math.min(count - 1, Number.isFinite(value) ? Math.floor(value) : 0))
}

function readOptions(): EmblaOptionsType {
  return {
    align: 'start', axis: orientation.value === 'vertical' ? 'y' : 'x',
    direction: props.direction ?? resolvedDirection.value, loop: props.loop,
    inViewThreshold: 0.12,
    ...props.options,
    startIndex: model.value ?? current.value,
  }
}

function slideName(slide: CarouselSlide, index: number) {
  return props.slideLabel?.(slide, index, props.slides.length) ??
    [slide.label, `${index + 1} / ${props.slides.length}`].filter(Boolean).join(' · ')
}

function pageName(index: number) {
  return props.pageLabel?.(index, total.value) ?? `Slide ${index + 1} of ${total.value}`
}

function isVisible(index: number) {
  if (visible.value.length) return visible.value.includes(index)
  return index >= current.value && index < current.value + Math.ceil(perView.value)
}

function measureVisible(instance: EmblaCarouselType) {
  const indices = instance.slidesInView()
  const element = viewport.value?.ownerDocument.activeElement
  if (element) {
    const focused = instance.slideNodes().findIndex(node => node.contains(element))
    if (focused >= 0 && !indices.includes(focused) && indices.length) viewport.value?.focus({ preventScroll: true })
  }
  visible.value = indices
}

function sync(instance: EmblaCarouselType) {
  selectedIndex.value = instance.selectedScrollSnap()
  scrollSnapCount.value = instance.scrollSnapList().length
  canScrollPrevious.value = instance.canScrollPrev()
  canScrollNext.value = instance.canScrollNext()
  measureVisible(instance)
}

let syncingFromModel = false

function selectionChanged(instance: EmblaCarouselType) {
  const previous = selectedIndex.value
  sync(instance)
  if (selectedIndex.value !== previous) {
    if (!syncingFromModel) model.value = selectedIndex.value
    emit('change', selectedIndex.value)
  }
}

function interacted() {
  if (props.autoplay && props.stopOnInteraction) paused.value = true
}

function syncNative(position: NativeCarouselPosition, settled: boolean) {
  const indices = position.visible
  if (indices.length !== visible.value.length || indices.some((index, place) => index !== visible.value[place])) {
    const focused = viewport.value?.ownerDocument.activeElement
    const slides = viewport.value?.firstElementChild?.children
    if (focused && slides && indices.length && Array.from(slides).some((slide, index) => slide.contains(focused) && !indices.includes(index))) {
      viewport.value?.focus({ preventScroll: true })
    }
    visible.value = [...indices]
  }
  if (!settled) return
  const previous = selectedIndex.value
  scrollSnapCount.value = position.count
  selectedIndex.value = position.selected
  const wrap = props.loop && position.count > 1
  canScrollPrevious.value = wrap || position.selected > 0
  canScrollNext.value = wrap || position.selected + 1 < position.count
  if (nativeReady.value && previous !== position.selected) {
    if (!syncingFromModel) model.value = position.selected
    emit('change', position.selected)
  }
}

function jumpNative(index: number, animate = true) {
  pager?.cancel()
  scroll?.go(index, animate)
}

function previous() {
  if (!canScrollPrevious.value) return
  interacted()
  if (scroll) jumpNative(current.value ? current.value - 1 : total.value - 1)
  else api.value?.scrollPrev(prefersReduce.value)
}

function next() {
  if (!canScrollNext.value) return
  interacted()
  if (scroll) jumpNative((current.value + 1) % total.value)
  else api.value?.scrollNext(prefersReduce.value)
}

function goTo(index: number) {
  interacted()
  const target = indexInRange(index, total.value)
  if (scroll) jumpNative(target)
  else api.value?.scrollTo(target, prefersReduce.value)
}

function play() {
  explicitPlay.value = true
  paused.value = false
}

function pause() {
  paused.value = true
}

function focusUpdated(event: FocusEvent) {
  const target = (event.type === 'focusin' ? event.target : event.relatedTarget) as Node | null
  focusedInside.value = Boolean(target && root.value?.contains(target) && !rotationButton.value?.contains(target))
}

function keyboard(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
    target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
    target?.closest('.sy-carousel__slide') && target !== viewport.value) return
  const axis = orientation.value === 'vertical'
  const rtl = !axis && (props.options?.direction ?? props.direction ?? resolvedDirection.value) === 'rtl'
  const prev = axis ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
  const nextKey = axis ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
  if (event.key === prev) previous()
  else if (event.key === nextKey) next()
  else if (event.key === 'Home') goTo(0)
  else if (event.key === 'End') goTo(total.value - 1)
  else return
  event.preventDefault()
  if (target?.closest('.sy-carousel__navigation')) {
    root.value?.querySelector<HTMLElement>(`[data-sy-carousel-page="${current.value}"]`)?.focus({ preventScroll: true })
  }
}

const controls: CarouselControls = {
  api, selectedIndex: current, scrollSnapCount: total, canScrollPrevious, canScrollNext,
  playing, previous, next, goTo, play, pause,
}
provide(carouselContext, controls)
defineExpose(controls)

let cleanup: (() => void) | undefined
onMounted(() => {
  const node = viewport.value
  const document = node?.ownerDocument
  const view = document?.defaultView
  if (!node || !view || !document) return
  resolvedDirection.value = view.getComputedStyle(node).direction === 'rtl' ? 'rtl' : 'ltr'
  const syncVisibility = () => { pageVisible.value = !document.hidden }
  const observer = new IntersectionObserver(entries => { intersecting.value = entries[0]?.isIntersecting ?? false })
  syncVisibility()
  document.addEventListener('visibilitychange', syncVisibility)
  if (root.value) observer.observe(root.value)

  let instance: EmblaCarouselType | undefined
  let detachPaging: (() => void) | undefined
  let active = true
  if (nativeSnap) {
    scroll = createCarouselScroll(node, { initial: () => initial.value, axis: () => orientation.value === 'vertical' ? 'y' : 'x',
      update: syncNative, interact: interacted })
    nativeReady.value = true
    if (snap && typeof snap === 'object') {
      void import('../internal/carousel-pager').then(({ attachCarouselPager }) => {
        if (!active || !scroll) return
        detachPaging = watch(orientation, (_, __, release) => {
          pager = attachCarouselPager(scroll!, snap)
          pagingAttached.value = true
          release(() => { pager?.destroy(); pager = undefined; pagingAttached.value = false })
        }, { immediate: true, flush: 'post' })
      }).catch(() => { pagingAttached.value = false })
    }
  } else {
    instance = EmblaCarousel(node, readOptions(), [...(props.plugins ?? [])])
    api.value = instance
    instance.on('select', selectionChanged).on('slidesInView', measureVisible).on('reInit', sync).on('pointerDown', interacted)
    sync(instance)
    emit('ready', instance)
  }
  cleanup = () => {
    active = false
    detachPaging?.()
    scroll?.destroy()
    instance?.destroy()
    observer.disconnect()
    document.removeEventListener('visibilitychange', syncVisibility)
  }
})
onBeforeUnmount(() => cleanup?.())
watch(() => [props.options, props.plugins, props.direction, props.loop, props.slides, perView.value, orientation.value], () => {
  if (scroll) scroll.measure()
  else api.value?.reInit(readOptions(), [...(props.plugins ?? [])])
}, { flush: 'post' })
watch(model, value => {
  if (value === undefined || !scroll && !api.value) return
  const index = indexInRange(value, scrollSnapCount.value)
  if (selectedIndex.value === index) return
  syncingFromModel = true
  try {
    if (scroll) jumpNative(index)
    else api.value?.scrollTo(index, prefersReduce.value)
  } finally {
    syncingFromModel = false
  }
})
watch(() => props.autoplay, enabled => {
  if (enabled) {
    paused.value = false
    explicitPlay.value = false
  }
})
watch([playing, current, () => props.delay], ([active], _, onCleanup) => {
  if (!active) return
  const duration = Number.isFinite(props.delay) ? Math.max(250, props.delay) : 4500
  const timer = setTimeout(() => {
    if (scroll) jumpNative((current.value + 1) % total.value)
    else if (api.value?.canScrollNext()) api.value.scrollNext(prefersReduce.value)
    else api.value?.scrollTo(0, prefersReduce.value)
  }, duration)
  onCleanup(() => clearTimeout(timer))
})
</script>

<template>
  <section
    ref="root" class="sy-carousel" :data-type="type" :data-orientation="orientation" :data-native-snap="nativeSnap || undefined"
    :data-snap-paging="pagingAttached || undefined"
    :style="trackStyle" :dir="options?.direction ?? direction" :aria-label="label" :aria-roledescription="carouselDescription"
    @pointerenter="hovering = $event.pointerType === 'mouse'" @pointerleave="hovering = false"
    @focusin="focusUpdated" @focusout="focusUpdated" @keydown="keyboard"
  >
    <div class="sy-carousel__window" :data-fade-start="fades && canScrollPrevious || undefined" :data-fade-end="fades && canScrollNext || undefined">
      <div :id="viewportId" ref="viewport" class="sy-carousel__viewport" tabindex="0">
        <div class="sy-carousel__track">
          <div
            v-for="(slide, index) in slides" :key="slide.id" class="sy-carousel__slide" role="group"
            :aria-roledescription="slideDescription" :aria-label="slideName(slide, index)"
            :inert="!isVisible(index)" :aria-hidden="!isVisible(index) || undefined"
          >
            <slot name="slide" :slide="slide" :index="index" :selected="current === index">
              <img v-if="slide.src" :src="slide.src" :alt="slide.alt ?? ''" draggable="false" />
              <span v-else>{{ slide.label }}</span>
            </slot>
          </div>
        </div>
      </div>
    </div>
    <div v-if="$slots.controls || showControls || autoplay || navigation !== 'none'" class="sy-carousel__controls">
      <slot name="controls" v-bind="controls" :viewport-id="viewportId">
        <SButton
          v-if="showControls" class="sy-carousel__previous" size="sm" variant="secondary" :aria-controls="viewportId"
          :aria-disabled="!canScrollPrevious" @click="previous"
        >{{ previousLabel }}</SButton>
        <div
          v-if="total > 1 && navigation !== 'none'" class="sy-carousel__navigation" :data-navigation="navigation"
          role="group" :aria-label="navigationLabel"
        >
          <button
            v-for="(_, index) in total" :key="index" type="button" :aria-label="pageName(index)" :aria-controls="viewportId"
            :data-sy-carousel-page="index" :aria-current="current === index || undefined" :tabindex="current === index ? 0 : -1"
            @click="goTo(index)"
          >
            <slot name="pagination" :index="index" :slide="slides[index]" :selected="current === index">
              <template v-if="navigation === 'thumbnails'">
                <img v-if="slides[index]?.thumbnail ?? slides[index]?.src" :src="slides[index].thumbnail ?? slides[index].src" alt="" draggable="false" />
                <span v-else>{{ index + 1 }}</span>
              </template>
              <span v-else class="sy-carousel__dot" aria-hidden="true" />
            </slot>
          </button>
        </div>
        <SButton
          v-if="showControls" class="sy-carousel__next" size="sm" variant="secondary" :aria-controls="viewportId"
          :aria-disabled="!canScrollNext" @click="next"
        >{{ nextLabel }}</SButton>
        <span
          ref="rotationButton" class="sy-carousel__rotation" :data-available="autoplay && total > 1 || undefined"
          :inert="!autoplay || total <= 1"
        >
          <span class="sy-carousel__rotation-inner">
            <SButton size="sm" variant="ghost" :aria-label="requestedPlay ? pauseLabel : playLabel"
              :aria-controls="viewportId" @click="requestedPlay ? pause() : play()">
              <span class="sy-carousel__rotation-label">
                <span aria-hidden="true">{{ playLabel }}</span>
                <span aria-hidden="true">{{ pauseLabel }}</span>
                <SMotionText :value="requestedPlay ? pauseLabel : playLabel" />
              </span>
            </SButton>
          </span>
        </span>
      </slot>
    </div>
    <span class="sy-visually-hidden" :aria-live="requestedPlay ? 'off' : 'polite'" aria-atomic="true">
      {{ total ? pageName(current) : '' }}
    </span>
  </section>
</template>
