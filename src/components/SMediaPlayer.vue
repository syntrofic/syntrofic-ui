<script lang="ts">
export interface MediaPlayerTrack {
  src: string
  language: string
  label: string
  kind?: 'captions' | 'subtitles' | 'descriptions'
  default?: boolean
}
export interface MediaPlayerMarker { id: string; time: number; label: string }
export interface MediaPlayerChapter { start: number; title: string }
</script>

<script setup lang="ts">
import { computed, provide, reactive, readonly, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SMediaControl from './SMediaControl.vue'
import SMotionText from './SMotionText.vue'
import SSelect from './SSelect.vue'
import SSlider from './SSlider.vue'
import SSpinner from './SSpinner.vue'
import { mediaPlaybackTime, mediaPlayerContext, type MediaPlayerContext } from '../internal/media-player'

const props = withDefaults(defineProps<{
  label?: string; src: string; type?: 'video' | 'audio'; poster?: string; preload?: 'none' | 'metadata' | 'auto'
  title?: string; subtitle?: string; artworkSrc?: string; artworkAspectRatio?: number; aspectRatio?: number
  crossOrigin?: 'anonymous' | 'use-credentials'
  size?: 'sm' | 'md' | 'lg'
  skipBackSeconds?: number; skipForwardSeconds?: number; previousTrack?: () => void; nextTrack?: () => void
  autoplay?: boolean; muted?: boolean; loop?: boolean; tracks?: readonly MediaPlayerTrack[]; markers?: readonly MediaPlayerMarker[]
  chapters?: readonly MediaPlayerChapter[]
  playbackRates?: readonly number[]; fullscreen?: boolean
  labels?: Partial<Record<'play' | 'pause' | 'mute' | 'unmute' | 'timeline' | 'volume' | 'captions' | 'off' | 'speed' | 'fullscreen' |
    'exitFullscreen' | 'markers' | 'chapters' | 'error' | 'waiting' | 'retry' | 'previousTrack' | 'nextTrack' | 'skipBack' | 'skipForward' | 'live', string>>
}>(), { type: 'video', preload: 'metadata', size: 'md', tracks: () => [], markers: () => [], chapters: () => [],
  playbackRates: () => [.75, 1, 1.25, 1.5, 2], fullscreen: true })
const emit = defineEmits<{ play: []; pause: []; ended: []; time: [seconds: number]; error: [error: unknown] }>()
const root = useTemplateRef<HTMLElement>('root')
const media = useTemplateRef<HTMLMediaElement>('media')
const position = ref(0)
const duration = ref(0)
const buffered = ref(0)
const volume = ref(100)
const silent = ref(false)
const playing = ref(false)
const ended = ref(false)
const hasPlayed = ref(false)
const waiting = ref(false)
const live = ref(false)
const error = shallowRef<unknown>(null)
const expanded = ref(false)
const canFullscreen = ref(false)
const playbackRate = ref('1')
const captions = ref('off')
const lastCaptions = ref('0')
const announcement = ref('')
const i18n = computed(() => ({ play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute', timeline: 'Playback position', volume: 'Volume',
  captions: 'Captions', off: 'Off', speed: 'Playback speed', fullscreen: 'Fullscreen', markers: 'Markers', chapters: 'Chapters',
  exitFullscreen: 'Exit fullscreen', error: 'Unable to play this media.', waiting: 'Loading media', retry: 'Retry', live: 'Live',
  previousTrack: 'Previous track', nextTrack: 'Next track', skipBack: 'Back', skipForward: 'Forward', ...props.labels }))
const validAspect = (value: number | undefined, fallback: number) => value && Number.isFinite(value) && value > 0 ? value : fallback
const skipBack = computed(() => props.skipBackSeconds ?? (props.title ? 15 : 0))
const skipForward = computed(() => props.skipForwardSeconds ?? (props.title ? 30 : 0))
const rates = computed(() => [...new Set([1, ...props.playbackRates])].filter(rate => Number.isFinite(rate) && rate >= .25 && rate <= 4)
  .sort((left, right) => left - right).map(rate => ({ value: String(rate), label: rate + '×' })))
const tracks = computed(() => [{ value: 'off', label: i18n.value.off }, ...props.tracks.map((track, index) => ({ value: String(index), label: track.label }))])
const markers = computed(() => props.markers.filter(marker => Number.isFinite(marker.time) && marker.time >= 0 && marker.time <= duration.value)
  .sort((a, b) => a.time - b.time))
const chapters = computed(() => props.chapters.filter(chapter => Number.isFinite(chapter.start) && chapter.start >= 0 && chapter.start <= duration.value)
  .sort((a, b) => a.start - b.start))
const currentChapter = computed(() => chapters.value.filter(chapter => chapter.start <= position.value).at(-1))

function reset() {
  position.value = duration.value = buffered.value = 0
  live.value = ended.value = waiting.value = hasPlayed.value = false
  error.value = null
  playing.value = false
  announcement.value = ''
}
watch([() => props.src, () => props.type], reset)
watch([() => props.muted, media], ([muted, node]) => {
  if (node) { node.muted = Boolean(muted); silent.value = node.muted }
})
watch([() => props.tracks, media], () => {
  const at = props.tracks.findIndex(track => track.default)
  lastCaptions.value = String(Math.max(0, at))
  track(at < 0 ? 'off' : String(at))
}, { immediate: true, flush: 'post' })
watch([root, media, () => props.fullscreen, () => props.type], ([element, node, enabled, type], _, dispose) => {
  if (!element || !node || !enabled || type !== 'video') {
    expanded.value = canFullscreen.value = false
    return
  }
  const doc = element.ownerDocument
  const video = node as NativeFullscreenVideo
  function readFullscreen() {
    canFullscreen.value = Boolean(doc.fullscreenEnabled && element?.requestFullscreen || video.webkitSupportsFullscreen)
    expanded.value = doc.fullscreenElement === element || Boolean(video.webkitDisplayingFullscreen)
  }
  const events = ['webkitbeginfullscreen', 'webkitendfullscreen', 'loadedmetadata']
  events.forEach(event => node.addEventListener(event, readFullscreen))
  doc.addEventListener('fullscreenchange', readFullscreen)
  readFullscreen()
  dispose(() => {
    doc.removeEventListener('fullscreenchange', readFullscreen)
    events.forEach(event => node.removeEventListener(event, readFullscreen))
  })
}, { flush: 'post' })

function time(seconds: number) {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hour = Math.floor(whole / 3600)
  const minute = Math.floor(whole % 3600 / 60)
  return (hour ? hour + ':' + String(minute).padStart(2, '0') : String(minute)) + ':' + String(whole % 60).padStart(2, '0')
}
function read() {
  const node = media.value
  if (!node) return
  const previous = position.value
  duration.value = Number.isFinite(node.duration) ? Math.max(0, node.duration) : 0
  live.value = node.duration === Infinity
  position.value = Math.max(0, node.currentTime)
  silent.value = node.muted
  volume.value = Math.round(node.volume * 100)
  buffered.value = position.value
  const ranges = node.buffered
  for (let index = 0; index < ranges.length; index++) {
    if (ranges.start(index) <= position.value && ranges.end(index) >= position.value) {
      buffered.value = ranges.end(index)
      break
    }
  }
  playbackRate.value = String(node.playbackRate)
  if (previous !== position.value) emit('time', position.value)
}
function fail(cause: unknown) { error.value = cause ?? new Error(i18n.value.error); waiting.value = false; emit('error', error.value) }
async function play() {
  const node = media.value
  if (!node) return
  const source = props.src
  error.value = null
  try { await node.play() } catch (cause) {
    if (media.value === node && props.src === source && !(cause instanceof DOMException && cause.name === 'AbortError')) fail(cause)
  }
}
function pause() { media.value?.pause() }
async function toggle() { if (media.value?.paused) await play(); else pause() }
function reload() { reset(); media.value?.load() }
function seek(value: number | number[] | undefined) {
  if (media.value && duration.value > 0 && typeof value === 'number' && Number.isFinite(value)) {
    media.value.currentTime = Math.max(0, Math.min(duration.value, value))
    read()
  }
}
function setVolume(value: number | number[] | undefined) {
  if (media.value && typeof value === 'number' && Number.isFinite(value)) {
    media.value.volume = Math.max(0, Math.min(100, value)) / 100
    media.value.muted = value === 0
    read()
  }
}
function setMuted(muted: boolean) { if (media.value) { media.value.muted = muted; read() } }
function mute() { setMuted(!silent.value) }
function setPlaybackRate(rate: number) {
  if (!media.value || !Number.isFinite(rate) || rate < .25 || rate > 4) return
  media.value.playbackRate = rate
  playbackRate.value = String(rate)
}
function speed(value?: string) {
  if (rates.value.some(item => item.value === value)) setPlaybackRate(Number(value))
}
function track(value?: string) {
  captions.value = tracks.value.some(option => option.value === value) ? value! : 'off'
  if (captions.value !== 'off') lastCaptions.value = captions.value
  const node = media.value
  if (!node) return
  Array.from(node.textTracks).forEach((item, index) => { item.mode = String(index) === captions.value ? 'showing' : 'disabled' })
}
function toggleCaptions() { track(captions.value === 'off' ? lastCaptions.value : 'off') }
interface NativeFullscreenVideo extends HTMLVideoElement {
  webkitSupportsFullscreen?: boolean
  webkitDisplayingFullscreen?: boolean
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
}
async function expand() {
  const node = root.value
  if (!node || !canFullscreen.value) return
  const doc = node.ownerDocument
  const video = media.value as NativeFullscreenVideo | null
  try {
    if (doc.fullscreenElement === node) await doc.exitFullscreen?.()
    else if (video?.webkitDisplayingFullscreen) video.webkitExitFullscreen?.()
    else if (doc.fullscreenEnabled && node.requestFullscreen) await node.requestFullscreen()
    else video?.webkitEnterFullscreen?.()
  } catch { /* Fullscreen availability is browser-dependent. */ }
}
function keyboard(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
  const key = event.key.toLowerCase()
  const isRoot = event.target === root.value
  if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable], [role="combobox"], [role="listbox"]')) return
  if (!isRoot && (key === ' ' || key.startsWith('arrow'))) return
  switch (key) {
    case ' ': case 'k':
      void toggle()
      break
    case 'm':
      mute()
      announcement.value = silent.value ? i18n.value.mute : i18n.value.unmute
      break
    case 'f':
      if (!canFullscreen.value) return
      void expand()
      break
    case 'c':
      if (!props.tracks.length) return
      toggleCaptions()
      announcement.value = i18n.value.captions + ' · ' + (tracks.value.find(option => option.value === captions.value)?.label ?? '')
      break
    case 'arrowleft': case 'arrowright': case 'j': case 'l': {
      const offset = { arrowleft: -5, arrowright: 5, j: -10, l: 10 }[key]
      seek(position.value + offset)
      announcement.value = time(position.value)
      break
    }
    case 'arrowup': case 'arrowdown':
      setVolume(volume.value + (key === 'arrowup' ? 10 : -10))
      announcement.value = i18n.value.volume + ' · ' + volume.value + '%'
      break
    case '<': case '>': {
      const at = rates.value.findIndex(rate => rate.value === playbackRate.value)
      speed(rates.value[at + (key === '>' ? 1 : -1)]?.value)
      announcement.value = i18n.value.speed + ' · ' + playbackRate.value + '×'
      break
    }
    default:
      if (!/^[0-9]$/.test(key)) return
      seek(Number(key) / 10 * duration.value)
      announcement.value = time(position.value)
  }
  event.preventDefault()
}

const controller: MediaPlayerContext = {
  state: readonly(reactive({
    playing, ended, waiting, currentTime: position, duration: computed(() => live.value ? Infinity : duration.value),
    bufferedEnd: buffered, volume: computed(() => volume.value / 100), muted: silent,
    playbackRate: computed(() => Number(playbackRate.value)), fullscreen: expanded, canFullscreen,
    activeTrack: computed(() => captions.value === 'off' ? null : captions.value), hasTextTracks: computed(() => props.tracks.length > 0), error,
  })),
  play, pause, togglePaused: toggle, seek, seekBy: offset => seek(position.value + offset),
  setVolume: value => setVolume(value * 100), setMuted, toggleMuted: mute, setPlaybackRate,
  toggleFullscreen: expand, setTextTrack: value => track(value ?? undefined), toggleCaptions, reload, formatTime: time,
}
provide(mediaPlayerContext, controller)
provide(mediaPlaybackTime, readonly(position))
defineExpose({ media, position, duration, playing, toggle, seek, mute, setVolume, speed, track, expand, controller })
</script>

<template>
  <section ref="root" class="sy-media-player" :data-type="type" :data-size="size" role="group" :aria-label="label || title || 'Media player'"
    :aria-busy="waiting || undefined" tabindex="0" @keydown="keyboard">
    <header v-if="title || subtitle || artworkSrc || $slots.artwork" class="sy-media-player__header">
      <div v-if="artworkSrc || $slots.artwork" class="sy-media-player__artwork" :style="{ aspectRatio: validAspect(artworkAspectRatio, 1) }">
        <slot name="artwork"><img :src="artworkSrc" alt=""></slot>
      </div>
      <div v-if="title || subtitle" class="sy-media-player__metadata">
        <strong v-if="title">{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
    </header>
    <component :is="type" ref="media" class="sy-media-player__element" :src="src" :poster="type === 'video' ? poster : undefined"
      :style="type === 'video' ? { aspectRatio: validAspect(aspectRatio, 16 / 9) } : undefined"
      :crossorigin="crossOrigin" :preload="preload" :autoplay="autoplay" :loop="loop" :muted="muted" playsinline
      @loadedmetadata="read" @durationchange="read" @progress="read" @timeupdate="read" @volumechange="read" @ratechange="read"
      @click="type === 'video' && toggle()" @dblclick="type === 'video' && expand()"
      @waiting="waiting = playing" @canplay="waiting = false" @playing="waiting = false; hasPlayed = true"
      @play="playing = true; ended = false; emit('play')"
      @pause="playing = false; waiting = false; emit('pause')" @ended="playing = false; waiting = false; ended = true; emit('ended')"
      @error="fail(media?.error)">
      <track v-for="(item, index) in props.tracks" :key="`${index}:${item.src}`" :src="item.src" :srclang="item.language" :kind="item.kind ?? 'captions'"
        :label="item.label" :default="item.default">
    </component>
    <slot name="controls" :playing="playing" :position="position" :duration="duration" :toggle="toggle" :seek="seek" :mute="mute" :set-volume="setVolume"
      :speed="speed" :track="track" :expand="expand" :controller="controller">
    <div class="sy-media-player__bar">
      <div class="sy-media-player__transport">
        <SButton v-if="previousTrack" :size="size" variant="ghost" @click="previousTrack()">{{ i18n.previousTrack }}</SButton>
        <SButton v-if="skipBack > 0" :size="size" variant="ghost" :disabled="duration <= 0" @click="controller.seekBy(-skipBack)">{{ i18n.skipBack }} {{ skipBack }}s</SButton>
        <SMediaControl kind="play" :size="size" variant="secondary" :label="i18n.play" :alternate-label="i18n.pause" />
        <SButton v-if="skipForward > 0" :size="size" variant="ghost" :disabled="duration <= 0" @click="controller.seekBy(skipForward)">{{ i18n.skipForward }} {{ skipForward }}s</SButton>
        <SButton v-if="nextTrack" :size="size" variant="ghost" @click="nextTrack()">{{ i18n.nextTrack }}</SButton>
      </div>
      <SMediaControl kind="timeline" :label="i18n.timeline" :marks="markers.map(marker => ({ value: marker.time, label: marker.label }))" />
      <SMediaControl kind="time" :label="i18n.live" />
      <SButton :size="size" variant="ghost" :aria-pressed="silent" @click="mute">
        <SMotionText :value="silent ? i18n.unmute : i18n.mute" />
      </SButton>
      <SSlider class="sy-media-player__volume" :model-value="silent ? 0 : volume" :label="i18n.volume" :min="0" :max="100"
        :show-value="false" :format-value="value => value + '%'" @update:model-value="setVolume" />
      <SSelect v-if="tracks.length > 1" :model-value="captions" :options="tracks" :label="i18n.captions" @update:model-value="track" />
      <SSelect v-if="rates.length > 1" :model-value="playbackRate" :options="rates" :label="i18n.speed" @update:model-value="speed" />
      <SMediaControl kind="fullscreen" :size="size" :label="i18n.fullscreen" :alternate-label="i18n.exitFullscreen" />
    </div>
    </slot>
    <nav v-if="chapters.length" class="sy-media-player__chapters" :aria-label="i18n.chapters">
      <SButton v-for="item in chapters" :key="item.start" size="sm" variant="secondary"
        :aria-current="item === currentChapter ? 'true' : undefined" @click="seek(item.start)">{{ time(item.start) }} · {{ item.title }}</SButton>
    </nav>
    <nav v-if="markers.length" class="sy-media-player__chapters" :aria-label="i18n.markers">
      <SButton v-for="marker in markers" :key="marker.id" size="sm" variant="secondary"
        @click="seek(marker.time)"><slot name="marker" :marker="marker" :formatted-time="time(marker.time)">{{ time(marker.time) }} · {{ marker.label }}</slot></SButton>
    </nav>
    <span class="sy-visually-hidden" aria-live="polite">{{ announcement }}</span>
    <slot name="status" :error="error" :waiting="waiting" :has-played="hasPlayed" :reload="reload">
      <Transition name="sy-standard-expand">
        <div v-if="error || waiting" class="sy-media-player__feedback">
          <div>
            <div v-if="error" class="sy-media-player__error">
              <span role="alert">{{ i18n.error }}</span>
              <SButton size="sm" variant="secondary" @click="reload">{{ i18n.retry }}</SButton>
            </div>
            <span v-else class="sy-media-player__waiting" role="status"><SSpinner size="sm" decorative /> {{ i18n.waiting }}</span>
          </div>
        </div>
      </Transition>
    </slot>
  </section>
</template>
