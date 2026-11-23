<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, shallowRef, useTemplateRef, watch, watchPostEffect } from 'vue'
import { decodeLoadedImage } from '../internal/image-decoding'
import { createAnimator, prefersReducedMotion } from '../internal/motion'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'

const props = withDefaults(defineProps<{
  src: string; alt: string; width?: number; height?: number; ratio?: number
  fit?: 'contain' | 'cover' | 'fill'; loading?: 'lazy' | 'eager'; caption?: string
  placeholder?: boolean
}>(), { fit: 'cover', loading: 'lazy' })
const emit = defineEmits<{ load: []; error: [] }>()
interface Frame { key: number; src: string }

const root = useTemplateRef<HTMLElement>('root')
const images = useTemplateRef<HTMLImageElement[]>('images')
const requested = shallowRef<Frame>({ key: 0, src: props.src })
const previous = shallowRef<Frame>()
const state = ref<'pending' | 'ready' | 'failed'>('pending')
const frames = computed(() => state.value === 'failed' ? [] :
  previous.value ? [previous.value, requested.value] : [requested.value])
const cover = computed(() => props.placeholder && state.value === 'pending' && !previous.value)
const decoding = new WeakSet<HTMLImageElement>()
let sizeMotion: ReturnType<typeof createAnimator> | undefined
onScopeDispose(() => sizeMotion?.dispose())

const proportion = computed(() => {
  if (props.ratio && Number.isFinite(props.ratio) && props.ratio > 0) return props.ratio
  if (props.width && props.height && props.width > 0 && props.height > 0) return props.width / props.height
})
function settle(frame: Frame, success: boolean) {
  if (frame !== requested.value || state.value !== 'pending') return
  const element = root.value
  const view = element?.ownerDocument.defaultView
  const animate = element && view && typeof element.animate === 'function' && !prefersReducedMotion(element)
  const from = animate ? Number.parseFloat(view.getComputedStyle(element).blockSize) : 0
  sizeMotion?.cancel('size')
  state.value = success ? 'ready' : 'failed'
  previous.value = undefined
  if (success) emit('load')
  else emit('error')
  if (!animate) return
  void nextTick(() => {
    if (root.value !== element || frame !== requested.value || prefersReducedMotion(element)) return
    const to = Number.parseFloat(view.getComputedStyle(element).blockSize)
    if (!(Math.abs(from - to) > 1)) return
    sizeMotion ??= createAnimator(element)
    sizeMotion.animate('size', [
      { blockSize: from + 'px', overflow: 'clip' },
      { blockSize: to + 'px', overflow: 'clip' },
    ], { role: 'move', fill: 'backwards' })
  })
}

function hideFrame(element: Element) {
  const view = element.ownerDocument.defaultView
  if (view && element instanceof view.HTMLElement && !element.hasAttribute('data-image-waiting')) {
    const size = view.getComputedStyle(element)
    element.style.setProperty('--sy-image-leaving-width', size.inlineSize)
    element.style.setProperty('--sy-image-leaving-height', size.blockSize)
  }
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('inert', '')
}

function reveal(frame: Frame, image: HTMLImageElement) {
  if (decoding.has(image) || frame !== requested.value || state.value !== 'pending') return
  decoding.add(image)
  void decodeLoadedImage(image).then(success => {
    if (root.value?.contains(image)) settle(frame, success)
  })
}

watch(() => props.src, src => {
  if (state.value === 'ready') previous.value = requested.value
  requested.value = { key: requested.value.key + 1, src }
  state.value = 'pending'
}, { flush: 'sync' })
watchPostEffect(() => {
  const frame = requested.value
  const node = images.value?.find(image => image.dataset.imageKey === String(frame.key))
  if (node?.complete) reveal(frame, node)
})
</script>

<template>
  <figure ref="root" class="sy-image" :data-image-state="state" :data-placeholder="placeholder || undefined" :data-proportioned="proportion !== undefined || undefined"
    :style="{ maxInlineSize: width ? width + 'px' : undefined }">
    <TransitionGroup name="sy-image-frame" @before-leave="hideFrame">
      <img v-for="frame in frames" :key="frame.key" ref="images" :src="frame.src" :alt="frame === requested ? alt : ''"
        :width="width" :height="height" :loading="frame === requested ? loading : 'eager'"
        :data-image-key="frame.key" :data-image-layer="frame === requested ? 'current' : 'previous'"
        :data-image-waiting="frame === requested && state === 'pending' && (placeholder || previous) ? '' : undefined"
        :role="frame === requested && alt ? undefined : 'presentation'" :aria-hidden="frame !== requested || !alt || undefined"
        :aria-busy="frame === requested && state === 'pending' || undefined" :style="{ aspectRatio: proportion, '--sy-image-fit': fit }"
        @load="reveal(frame, $event.currentTarget as HTMLImageElement)" @error="settle(frame, false)">
      <div v-if="state === 'failed'" key="fallback" class="sy-image__fallback" :style="{ aspectRatio: proportion }"
        :role="alt ? 'img' : 'presentation'" :aria-label="alt || undefined" :aria-hidden="!alt || undefined">
        <slot name="fallback"><SIcon name="image" /><span v-if="alt">{{ alt }}</span></slot>
      </div>
    </TransitionGroup>
    <Transition name="sy-standard-fade">
      <SSkeleton v-if="cover" class="sy-image__placeholder" :style="{ aspectRatio: proportion }" aria-hidden="true" />
    </Transition>
    <figcaption v-if="caption || $slots.caption"><slot name="caption"><SMotionText :value="caption ?? ''" wrap /></slot></figcaption>
  </figure>
</template>
