<script lang="ts">
export interface LightboxMedia {
  id: string
  src: string
  type?: 'image' | 'video'
  alt: string
  caption?: string
  poster?: string
  tracks?: readonly { src: string; language: string; label: string; kind?: 'captions' | 'subtitles' }[]
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch, watchPostEffect } from 'vue'
import { decodeLoadedImage } from '../internal/image-decoding'
import { createPanGesture } from '../internal/pan-gesture'
import { decayRestDistance, rubberBand } from '../internal/motion-physics'
import { gestureMotion } from '../internal/motion-defaults'
import SLightboxCaption from '../internal/SLightboxCaption.vue'
import SButton from './SButton.vue'
import SDialog from './SDialog.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  media: LightboxMedia | readonly LightboxMedia[]
  label?: string
  closeLabel?: string
  previousLabel?: string
  nextLabel?: string
  zoomInLabel?: string
  zoomOutLabel?: string
  loadingLabel?: string
  bufferingLabel?: string
  errorLabel?: string
  retryLabel?: string
  captionLabel?: string
  expandCaptionLabel?: string
  collapseCaptionLabel?: string
  zoom?: boolean
  maximumZoom?: number
  dragDismiss?: boolean
  autoplayVideo?: boolean
  loop?: boolean
  fullscreen?: boolean
}>(), { label: 'Media viewer', closeLabel: 'Close', previousLabel: 'Previous', nextLabel: 'Next', zoomInLabel: 'Zoom in', zoomOutLabel: 'Zoom out',
  loadingLabel: 'Loading media', bufferingLabel: 'Buffering video', errorLabel: 'Unable to load this media.', retryLabel: 'Retry',
  captionLabel: 'Media caption', expandCaptionLabel: 'More', collapseCaptionLabel: 'Close caption', zoom: true, dragDismiss: true })
const open = defineModel<boolean>('open', { default: false })
const index = defineModel<number>('index', { default: 0 })
const emit = defineEmits<{ close: [] }>()
const items = computed((): readonly LightboxMedia[] => Array.isArray(props.media) ? props.media : [props.media as LightboxMedia])
const current = computed(() => Math.min(items.value.length - 1, Math.max(0, Math.trunc(index.value) || 0)))
const active = computed(() => items.value[current.value])
const hasCaptions = computed(() => items.value.some(item => Boolean(item.caption)))
const captionOpen = ref(false)
const stage = useTemplateRef<HTMLDivElement>('stage')
type MediaNode = HTMLImageElement | HTMLVideoElement
type MediaState = 'pending' | 'ready' | 'failed'
type Point = { x: number; y: number }
type View = Point & { scale: number }
type Frame = { key: string; asset: LightboxMedia; pose?: View }
const identity: View = { scale: 1, x: 0, y: 0 }
const view = ref<View>(identity)
const mediaNodes = useTemplateRef<MediaNode[]>('media')
const attempt = ref(0)
const mediaKey = computed(() => JSON.stringify([active.value?.id, active.value?.src, active.value?.type, attempt.value]))
const request = computed<Frame | undefined>(() => active.value && { key: mediaKey.value, asset: active.value })
const painted = shallowRef<Frame>()
const frames = computed(() => {
  const current = request.value
  if (!current) return []
  return painted.value && painted.value.key !== current.key ? [painted.value, current] : [current]
})
const settled = shallowRef<{ key: string; state: MediaState }>()
const buffering = ref(false)
const waitLabel = computed(() => buffering.value ? props.bufferingLabel : props.loadingLabel)
const mediaState = computed<MediaState>(() => settled.value?.key === mediaKey.value
  ? settled.value.state : painted.value?.key === mediaKey.value ? 'ready' : 'pending')
const currentMedia = () => mediaNodes.value?.find(node => node.dataset.sourceKey === mediaKey.value)
const decoding = new WeakSet<HTMLImageElement>()
const presented = ref(open.value)
watch(open, visible => { if (visible) presented.value = true }, { flush: 'sync' })
function closed() {
  if (!open.value) {
    presented.value = false
    settled.value = undefined
    painted.value = undefined
    buffering.value = false
    emit('close')
  }
}
function mark(node: MediaNode, state: MediaState) {
  const frame = request.value
  if (!presented.value || !frame || node !== currentMedia() || mediaState.value === state) return
  settled.value = { key: frame.key, state }
  if (state === 'failed') buffering.value = false
  if (state === 'ready') painted.value = frame.asset.type === 'video' ? undefined : frame
}
function decodeImage(image: HTMLImageElement) {
  if (image !== currentMedia() || mediaState.value !== 'pending' || decoding.has(image)) return
  decoding.add(image)
  void decodeLoadedImage(image).then(success => mark(image, success ? 'ready' : 'failed'))
}
function markEvent(event: Event, state: MediaState) { mark(event.currentTarget as MediaNode, state) }
function videoBuffering(event: Event) {
  const node = event.currentTarget as HTMLVideoElement
  if (node === currentMedia()) buffering.value = event.type === 'waiting' && !node.paused
}
function videoAvailable(event: Event) {
  markEvent(event, 'ready')
  videoBuffering(event)
}
function retry() {
  stage.value?.focus({ preventScroll: true })
  attempt.value++
}
watchPostEffect(() => {
  const node = currentMedia()
  if (!node) return
  if (node.tagName === 'IMG') {
    const image = node as HTMLImageElement
    if (image.complete) decodeImage(image)
  } else {
    const video = node as HTMLVideoElement
    if (video.error) mark(video, 'failed')
    else if (video.readyState >= video.HAVE_METADATA) mark(video, 'ready')
  }
})
const zoomed = computed(() => view.value.scale > 1.01)
const imageMode = computed(() => active.value?.type !== 'video')
const zoomAllowed = computed(() => props.zoom && imageMode.value && mediaState.value === 'ready')
const delta = ref(0)
const pull = ref(0)
const moving = ref(false)
const scrim = computed(() => Math.max(.14, 1 - .0000135 * pull.value ** 2))
const chrome = computed(() => Math.max(.24, 1 - .005 * Math.max(0, pull.value - 18)))
const pullScale = computed(() => Math.max(.66, 1 - .0000049 * pull.value ** 2))

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
function geometry() {
  const element = stage.value
  if (!element) return
  const box = element.getBoundingClientRect()
  const node = currentMedia()
  const image = node?.tagName === 'IMG' ? node as HTMLImageElement : undefined
  if (!box.width || !box.height) return
  const sourceWidth = image?.naturalWidth || box.width
  const sourceHeight = image?.naturalHeight || box.height
  const fit = Math.min(box.width / sourceWidth, box.height / sourceHeight)
  const dpr = element.ownerDocument.defaultView?.devicePixelRatio ?? 1
  const maximum = props.maximumZoom !== undefined && Number.isFinite(props.maximumZoom)
    ? clamp(props.maximumZoom, 1, 40) : clamp(6 / (fit * dpr), 2, 24)
  return { box, width: sourceWidth * fit, height: sourceHeight * fit, maximum }
}
function constrained(next: View, elastic = false): View {
  const size = geometry()
  if (!size || next.scale <= 1) return { scale: Math.max(.5, next.scale), x: 0, y: 0 }
  function limit(offset: number, content: number, viewport: number) {
    const range = Math.max(0, (content * next.scale - viewport) / 2)
    const edge = clamp(offset, -range, range)
    return elastic ? edge + rubberBand(offset - edge, viewport * .4) : edge
  }
  return { scale: next.scale, x: limit(next.x, size.width, size.box.width), y: limit(next.y, size.height, size.box.height) }
}
function position(client: Point) {
  const box = stage.value?.getBoundingClientRect()
  return box ? { x: client.x - box.left - box.width / 2, y: client.y - box.top - box.height / 2 } : { x: 0, y: 0 }
}
function zoomAround(original: View, scale: number, anchor: Point, target = anchor, elastic = false) {
  const ratio = scale / original.scale
  view.value = constrained({ scale, x: target.x - (anchor.x - original.x) * ratio, y: target.y - (anchor.y - original.y) * ratio }, elastic)
}

function navigate(step: number) {
  const length = items.value.length
  if (length < 2) return
  const next = current.value + step
  index.value = props.loop ? (next + length) % length : Math.max(0, Math.min(length - 1, next))
}
function direction() { return stage.value?.matches(':dir(rtl)') ? -1 : 1 }
function onKey(event: KeyboardEvent) {
  if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('video'))) return
  if (captionOpen.value && event.key === 'Escape') {
    event.preventDefault()
    captionOpen.value = false
    return
  }
  if (captionOpen.value && event.target instanceof Element && event.target.closest('.sy-lightbox__caption-panel')) return
  if (event.target === stage.value && zoomAllowed.value) {
    const moves: Record<string, Point> = { ArrowLeft: { x: 60, y: 0 }, ArrowRight: { x: -60, y: 0 },
      ArrowUp: { x: 0, y: 60 }, ArrowDown: { x: 0, y: -60 } }
    const move = moves[event.key]
    if (move && zoomed.value) {
      view.value = constrained({ ...view.value, x: view.value.x + move.x, y: view.value.y + move.y })
      event.preventDefault()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      toggleZoom()
      event.preventDefault()
      return
    }
    if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0') {
      const maximum = geometry()?.maximum ?? 4
      const next = event.key === '0' ? 1 : clamp(view.value.scale * (event.key === '-' ? .7 : 1.4), 1, maximum)
      zoomAround(view.value, next, { x: 0, y: 0 })
      event.preventDefault()
      return
    }
  }
  const step = event.key === 'ArrowRight' ? direction() : event.key === 'ArrowLeft' ? -direction() : 0
  if (step) { event.preventDefault(); navigate(step) }
}
function toggleZoom(client?: Point) {
  if (!zoomAllowed.value) return
  const size = geometry()
  if (!size || zoomed.value) { view.value = identity; return }
  const scale = Math.min(size.maximum, Math.max(1.5, size.box.width / size.width, size.box.height / size.height))
  zoomAround(view.value, scale, client ? position(client) : { x: 0, y: 0 })
}
watch([open, active, mediaKey], ([visible, asset, key], [, previousAsset, previousKey]) => {
  if (painted.value?.key === previousKey && key !== previousKey) {
    painted.value = { ...painted.value, pose: view.value }
  }
  view.value = identity
  delta.value = pull.value = 0
  moving.value = false
  buffering.value = false
  if (!visible || asset !== previousAsset) captionOpen.value = false
  stage.value?.querySelector('video')?.pause()
  if (visible && props.autoplayVideo && active.value?.type === 'video') void nextTick(() => {
    const node = currentMedia()
    if (open.value && node?.tagName === 'VIDEO') void (node as HTMLVideoElement).play().catch(() => {})
  })
})
function frameTransform(frame: Frame) {
  const pose = frame.key === mediaKey.value ? view.value : frame.pose ?? identity
  return `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})`
}
watch(() => props.zoom, enabled => { if (!enabled) view.value = identity })
watch([stage, open], ([element, visible], _, cleanup) => {
  if (!element || !visible) return
  const win = element.ownerDocument.defaultView
  const touches = new Map<number, Point & { startX: number; startY: number; time: number }>()
  let pinch: { initial: View; center: Point; distance: number } | undefined
  let pinched = false
  let doubleTap: Point & { time: number } | undefined
  let suppressDoubleClick = 0
  let gesture: 'image' | 'page' | 'dismiss' | 'ignored' | undefined
  let initial = identity
  let wheelIdle: ReturnType<typeof setTimeout> | undefined
  let lastDrag = -Infinity
  const two = () => {
    const [a, b] = touches.values()
    return a && b ? { center: position({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), distance: Math.hypot(a.x - b.x, a.y - b.y) } : undefined
  }
  function touchStart(event: PointerEvent) {
    if (event.pointerType !== 'touch' || !zoomAllowed.value || touches.size >= 2) return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: event.timeStamp })
    const contact = two()
    if (contact && contact.distance > 0) {
      pinch = { ...contact, initial: view.value }
      pinched = true
      gesture = doubleTap = undefined
      delta.value = pull.value = 0
      moving.value = true
    }
  }
  function touchMove(event: PointerEvent) {
    const touch = touches.get(event.pointerId)
    if (!touch) return
    touch.x = event.clientX
    touch.y = event.clientY
    const contact = two()
    const size = geometry()
    if (!contact || !pinch || !size) return
    const raw = pinch.initial.scale * contact.distance / pinch.distance
    const scale = raw < 1 ? 1 / (2 - raw) : raw > size.maximum ? size.maximum * (2 - size.maximum / raw) : raw
    zoomAround(pinch.initial, scale, pinch.center, contact.center, true)
  }
  function touchEnd(event: PointerEvent) {
    const touch = touches.get(event.pointerId)
    if (!touch) return
    touches.delete(event.pointerId)
    if (pinched) {
      if (pinch) {
        const scale = clamp(view.value.scale, 1, geometry()?.maximum ?? 4)
        zoomAround(view.value, scale, pinch.center)
        moving.value = false
        pinch = undefined
      }
      if (!touches.size) pinched = false
      return
    }
    if (event.type !== 'pointerup' || gesture || event.timeStamp - touch.time > gestureMotion.tap.holdMs
      || Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) > gestureMotion.tap.travel) return
    const next = { x: event.clientX, y: event.clientY, time: event.timeStamp }
    if (doubleTap && next.time - doubleTap.time <= gestureMotion.tap.doubleTapMs
      && Math.hypot(next.x - doubleTap.x, next.y - doubleTap.y) <= gestureMotion.tap.doubleTapTravel) {
      toggleZoom(next)
      suppressDoubleClick = next.time + 350
      doubleTap = undefined
    } else doubleTap = next
  }
  function doubleClick(event: MouseEvent) {
    if (event.timeStamp >= suppressDoubleClick && !(event.target instanceof Element && event.target.closest('video'))) {
      toggleZoom({ x: event.clientX, y: event.clientY })
    }
  }
  function backgroundClick(event: MouseEvent) {
    if (!props.fullscreen || !imageMode.value || mediaState.value !== 'ready'
      || zoomed.value || moving.value || event.detail !== 1 || event.timeStamp - lastDrag < 80) return
    const image = geometry()
    if (!image) return
    const point = position({ x: event.clientX, y: event.clientY })
    if (Math.abs(point.x) > image.width / 2 || Math.abs(point.y) > image.height / 2) open.value = false
  }
  function wheel(event: WheelEvent) {
    if (!zoomAllowed.value || !event.ctrlKey && !zoomed.value) return
    const size = geometry()
    if (!size) return
    event.preventDefault()
    moving.value = true
    clearTimeout(wheelIdle)
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.box.height : 1
    if (event.ctrlKey) {
      const scale = clamp(view.value.scale * Math.exp(-event.deltaY * unit * .003), 1, size.maximum)
      zoomAround(view.value, scale, position({ x: event.clientX, y: event.clientY }))
    } else {
      view.value = constrained({ ...view.value, x: view.value.x - event.deltaX * unit, y: view.value.y - event.deltaY * unit })
    }
    wheelIdle = setTimeout(() => { moving.value = false }, 120)
  }
  element.addEventListener('pointerdown', touchStart)
  element.addEventListener('dblclick', doubleClick)
  element.addEventListener('click', backgroundClick)
  element.addEventListener('wheel', wheel, { passive: false })
  win?.addEventListener('pointermove', touchMove, { passive: true })
  win?.addEventListener('pointerup', touchEnd)
  win?.addEventListener('pointercancel', touchEnd)
  const pan = createPanGesture(element, {
    axis: 'both',
    shouldStart: event => imageMode.value && !(event.target instanceof Element && event.target.closest('button')),
    onStart: () => {
      clearTimeout(wheelIdle)
      initial = view.value
      if (!pinched && zoomed.value) gesture = 'image'
    },
    onMove: ({ x, y }) => {
      if (pinched) return
      gesture ??= Math.abs(x) >= Math.abs(y) && items.value.length > 1 ? 'page' : y > 0 && props.dragDismiss ? 'dismiss' : 'ignored'
      moving.value = gesture !== 'ignored'
      if (gesture === 'image') view.value = constrained({ scale: initial.scale, x: initial.x + x, y: initial.y + y }, true)
      if (gesture === 'dismiss') pull.value = Math.max(0, y)
      if (gesture === 'page') {
        const step = (x < 0 ? 1 : -1) * direction()
        const edge = !props.loop && (current.value + step < 0 || current.value + step >= items.value.length)
        delta.value = edge ? rubberBand(x, element.clientWidth) : x
      }
    },
    onEnd: ({ x, y, velocityX, velocityY }, event, cancelled) => {
      const finished = gesture
      gesture = undefined
      if (pinched) return
      if (finished && finished !== 'ignored') lastDrag = event.timeStamp
      moving.value = false
      delta.value = pull.value = 0
      if (finished === 'image') {
        const coast = !cancelled && event.pointerType === 'touch'
        view.value = constrained({ ...view.value,
          x: view.value.x + (coast ? decayRestDistance(velocityX * 1000) : 0),
          y: view.value.y + (coast ? decayRestDistance(velocityY * 1000) : 0),
        })
      }
      if (!cancelled && finished === 'page' && (Math.abs(x) > 55 || Math.abs(x) > 18 && Math.abs(velocityX) > .45)) {
        navigate((x < 0 ? 1 : -1) * direction())
      }
      if (!cancelled && finished === 'dismiss' && y >= 18 && y + Math.max(0, decayRestDistance(velocityY * 1000)) >= 80) open.value = false
    },
  })
  const resize = typeof win?.ResizeObserver === 'function' ? new win.ResizeObserver(() => { if (!moving.value) view.value = constrained(view.value) }) : undefined
  resize?.observe(element)
  cleanup(() => {
    pan()
    resize?.disconnect()
    element.removeEventListener('pointerdown', touchStart)
    element.removeEventListener('dblclick', doubleClick)
    element.removeEventListener('click', backgroundClick)
    element.removeEventListener('wheel', wheel)
    clearTimeout(wheelIdle)
    win?.removeEventListener('pointermove', touchMove)
    win?.removeEventListener('pointerup', touchEnd)
    win?.removeEventListener('pointercancel', touchEnd)
  })
}, { flush: 'post' })

function hideOutgoing(node: Element) {
  const element = node as HTMLElement
  element.setAttribute('aria-hidden', 'true')
  element.inert = true
}
</script>

<template>
  <slot name="trigger" :open="(at = 0) => { index = at; open = true }" />
  <SDialog v-model:open="open" class="sy-lightbox" size="lg" :title="label" :variant="fullscreen ? 'fullscreen' : 'standard'" :data-fullscreen="fullscreen || undefined"
    :style="{ '--sy-lightbox-scrim': scrim, '--sy-lightbox-chrome': chrome }"
    :dismiss-label="closeLabel" show-close-button @keydown="onKey" @close="closed">
    <figure v-if="active && presented" class="sy-lightbox__figure">
      <div ref="stage" class="sy-lightbox__stage" :data-media-state="mediaState" :data-moving="moving || undefined"
        :data-image-gesture="imageMode && (zoom || dragDismiss) || undefined"
        :tabindex="imageMode && zoom ? 0 : -1" role="group" :aria-label="active.alt || label"
        :style="{ '--sy-lightbox-offset': delta + 'px', '--sy-lightbox-pull': pull + 'px', '--sy-lightbox-pull-scale': pullScale }">
        <TransitionGroup name="sy-lightbox-frame" @before-leave="hideOutgoing">
          <div v-for="frame in frames" :key="frame.key" class="sy-lightbox__media"
            :data-previous="frame.key !== mediaKey || undefined" :aria-hidden="frame.key !== mediaKey || undefined"
            :inert="frame.key !== mediaKey || undefined">
            <video v-if="frame.asset.type === 'video'" ref="media" :data-source-key="frame.key" :src="frame.asset.src" :poster="frame.asset.poster"
              :aria-label="frame.asset.alt" :inert="mediaState !== 'ready' || undefined" :data-visible="mediaState === 'ready' || undefined"
              :aria-busy="buffering || undefined" :autoplay="autoplayVideo && open" controls playsinline preload="metadata"
              @loadedmetadata="markEvent($event, 'ready')" @canplay="videoAvailable" @playing="videoAvailable"
              @waiting="videoBuffering" @pause="videoBuffering" @ended="videoBuffering"
              @error="markEvent($event, 'failed')">
              <track v-for="track in frame.asset.tracks" :key="track.src" :src="track.src" :srclang="track.language" :label="track.label" :kind="track.kind || 'captions'">
            </video>
            <img v-else ref="media" :data-source-key="frame.key" :src="frame.asset.src" :alt="frame.key === mediaKey ? frame.asset.alt : ''"
              draggable="false" :aria-busy="frame.key === mediaKey && mediaState === 'pending' || undefined"
              :data-visible="frame.key !== mediaKey || mediaState === 'ready' || undefined"
              :data-zoomed="frame.key === mediaKey && zoomed || undefined" :style="{ transform: frameTransform(frame) }"
              @load="decodeImage($event.currentTarget as HTMLImageElement)" @error="markEvent($event, 'failed')">
          </div>
        </TransitionGroup>
        <Transition name="sy-standard-fade" @before-leave="hideOutgoing">
          <div v-if="mediaState === 'pending' || buffering" class="sy-lightbox__feedback">
            <div class="sy-lightbox__notice"><SSpinner :label="waitLabel"><SMotionText :value="waitLabel" wrap /></SSpinner></div>
          </div>
          <div v-else-if="mediaState === 'failed'" class="sy-lightbox__feedback sy-lightbox__feedback--error">
            <div class="sy-lightbox__notice">
              <SIcon name="image" size="lg" /><span role="alert">{{ errorLabel }}</span>
              <SButton size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
            </div>
          </div>
        </Transition>
      </div>
      <SLightboxCaption v-if="hasCaptions" v-model="captionOpen" :text="active.caption ?? ''" :label="captionLabel"
        :more-label="expandCaptionLabel" :close-label="collapseCaptionLabel" @return-focus="stage?.focus({ preventScroll: true })" />
    </figure>
    <template #footer>
      <div v-if="active" class="sy-lightbox__actions">
        <template v-if="items.length > 1">
          <SButton size="sm" variant="secondary" :aria-disabled="!loop && current === 0" @click="navigate(-1)">{{ previousLabel }}</SButton>
          <SMotionText :value="`${current + 1} / ${items.length}`" motion="roll" announce />
          <SButton size="sm" variant="secondary" :aria-disabled="!loop && current === items.length - 1" @click="navigate(1)">{{ nextLabel }}</SButton>
        </template>
        <SButton v-if="zoom && active.type !== 'video'" size="sm" variant="ghost" :aria-disabled="!zoomAllowed" :aria-pressed="zoomed" @click="toggleZoom()">
          <SMotionText :value="zoomed ? zoomOutLabel : zoomInLabel" />
        </SButton>
      </div>
    </template>
  </SDialog>
</template>
