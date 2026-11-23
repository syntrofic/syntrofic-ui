<script setup lang="ts">
import { computed } from 'vue'
import { useMediaPlayer } from '../internal/media-player'
import type { ButtonSize, ButtonVariant } from '../types'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SSelect from './SSelect.vue'
import SSlider from './SSlider.vue'
import type { SliderMark } from './SSlider.vue'

const props = withDefaults(defineProps<{
  kind: 'play' | 'seek' | 'volume' | 'timeline' | 'time' | 'captions' | 'fullscreen' | 'rate'
  label?: string
  alternateLabel?: string
  size?: ButtonSize
  variant?: ButtonVariant
  offset?: number
  display?: 'current' | 'duration' | 'remaining' | 'current-duration'
  hasSlider?: boolean
  sliderPlacement?: 'start' | 'end'
  rateVariant?: 'menu' | 'slider'
  rates?: readonly number[]
  marks?: readonly SliderMark[]
}>(), { size: 'sm', offset: 10, display: 'current-duration', hasSlider: true, sliderPlacement: 'end', rateVariant: 'slider',
  rates: () => [.5, .75, 1, 1.25, 1.5, 1.75, 2] })

const control = useMediaPlayer()
const state = control.state
const time = control.formatTime
const duration = computed(() => Number.isFinite(state.duration) ? state.duration : 0)
const buffer = computed(() => duration.value > 0 ? Math.min(1, state.bufferedEnd / duration.value) * 100 : 0)
const availableRates = computed(() => [...new Set([1, ...props.rates])].filter(rate => Number.isFinite(rate) && rate >= .25 && rate <= 4)
  .sort((first, second) => first - second))
const options = computed(() => availableRates.value.map(value => ({ value: String(value), label: value + '×' })))
const ratePosition = computed(() => availableRates.value.reduce((nearest, item, index, rates) =>
  Math.abs(item - state.playbackRate) < Math.abs(rates[nearest] - state.playbackRate) ? index : nearest, 0))
const timeDisplay = computed(() => {
  if (!Number.isFinite(state.duration)) return props.label ?? 'Live'
  if (props.display === 'current') return time(state.currentTime)
  if (props.display === 'duration') return time(state.duration)
  if (props.display === 'remaining') return '−' + time(state.duration - state.currentTime)
  return time(state.currentTime) + ' / ' + time(state.duration)
})
const volume = computed(() => state.muted ? 0 : Math.round(state.volume * 100))

function seek(value: number | number[] | undefined) { if (typeof value === 'number') control.seek(value) }
function setVolume(value: number | number[] | undefined) { if (typeof value === 'number') control.setVolume(value / 100) }
function setRateAt(index: number | number[] | undefined) {
  if (typeof index === 'number') control.setPlaybackRate(availableRates.value[index])
}
</script>

<template>
  <SButton v-if="kind === 'play'" :size="size" :variant="variant ?? 'ghost'" @click="control.togglePaused()">
    <slot><SMotionText :value="state.playing ? alternateLabel ?? 'Pause' : label ?? 'Play'" /></slot>
  </SButton>
  <SButton v-else-if="kind === 'seek'" :size="size" :variant="variant ?? 'ghost'" :disabled="duration <= 0" @click="control.seekBy(offset)">
    <slot>{{ label ?? (offset < 0 ? 'Back ' : 'Forward ') + Math.abs(offset) + 's' }}</slot>
  </SButton>
  <div v-else-if="kind === 'volume'" class="sy-media-player__volume-group" :data-slider-placement="sliderPlacement">
    <SButton :size="size" :variant="variant ?? 'ghost'" :aria-pressed="state.muted" @click="control.toggleMuted()">
      <slot><SMotionText :value="state.muted ? alternateLabel ?? 'Unmute' : label ?? 'Mute'" /></slot>
    </SButton>
    <SSlider v-if="hasSlider" class="sy-media-player__volume" :model-value="volume" label="Volume" :min="0" :max="100"
      :show-value="false" :format-value="value => value + '%'" @update:model-value="setVolume" />
  </div>
  <div v-else-if="kind === 'timeline'" class="sy-media-player__timeline" :style="{ '--sy-media-buffer': buffer + '%' }">
    <SSlider :model-value="state.currentTime" :label="label ?? 'Playback position'" :min="0" :max="duration || 1" :step=".1"
      :disabled="duration <= 0" :show-value="false" :marks="marks" :format-value="value => time(value) + ' / ' + time(duration)"
      @update:model-value="seek" />
  </div>
  <span v-else-if="kind === 'time'" class="sy-media-player__time"><SMotionText :value="timeDisplay" motion="roll" /></span>
  <SButton v-else-if="kind === 'captions'" :size="size" :variant="variant ?? 'ghost'" :aria-pressed="state.activeTrack !== null"
    :disabled="!state.hasTextTracks" @click="control.toggleCaptions()"><slot>{{ label ?? 'Captions' }}</slot></SButton>
  <SButton v-else-if="kind === 'fullscreen' && state.canFullscreen" :size="size" :variant="variant ?? 'ghost'"
    :aria-pressed="state.fullscreen" @click="control.toggleFullscreen()">
    <slot><SMotionText :value="state.fullscreen ? alternateLabel ?? 'Exit fullscreen' : label ?? 'Fullscreen'" /></slot>
  </SButton>
  <SSelect v-else-if="kind === 'rate' && rateVariant === 'menu'" :model-value="String(state.playbackRate)" :options="options"
    :label="label ?? 'Playback speed'" @update:model-value="control.setPlaybackRate(Number($event))" />
  <SSlider v-else-if="kind === 'rate'" :model-value="ratePosition" :label="label ?? 'Playback speed'" :min="0"
    :max="availableRates.length - 1" :disabled="availableRates.length < 2" :format-value="value => (availableRates[value] ?? state.playbackRate) + '×'"
    @update:model-value="setRateAt" />
</template>
