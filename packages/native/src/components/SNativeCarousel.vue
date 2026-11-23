<script setup lang="ts">
import { AccessibilityState, Application } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { nearestNativePage } from '../navigation-state'
import type { NativeTabItem } from '../navigation'
import SNativeButton from './SNativeButton.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePager from './SNativePager.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

export interface NativeCarouselItem extends NativeTabItem {
  thumbnail?: string
}

const props = withDefaults(defineProps<{
  items: readonly NativeCarouselItem[]
  defaultSelected?: NativeCollectionKey
  height?: number
  itemsPerView?: number
  gap?: number
  sidePadding?: number
  align?: 'start' | 'center' | 'end'
  controls?: boolean
  indicators?: 'dots' | 'thumbnails' | 'none'
  loop?: boolean
  autoPlay?: boolean
  interval?: number
  stopOnInteraction?: boolean
  swipeEnabled?: boolean
  animated?: boolean
  disabled?: boolean
  previousLabel?: string
  nextLabel?: string
  startLabel?: string
  stopLabel?: string
  itemLabel?: (item: NativeCarouselItem, position: number, total: number) => string
}>(), {
  height: 168, itemsPerView: 1, align: 'start', indicators: 'dots', controls: true, stopOnInteraction: true,
  interval: 4500, swipeEnabled: true, animated: true, previousLabel: 'Previous', nextLabel: 'Next',
  startLabel: 'Play', stopLabel: 'Pause',
})
const model = defineModel<NativeCollectionKey>()
const playing = defineModel<boolean | undefined>('playing', { default: undefined })
const local = ref<NativeCollectionKey | undefined>(props.defaultSelected)
const emit = defineEmits<{ change: [key: NativeCollectionKey]; progress: [position: number]; settled: [] }>()
defineSlots<{
  default(props: { item: NativeCarouselItem; selected: boolean }): unknown
  thumbnail(props: { item: NativeCarouselItem; selected: boolean; position: number }): unknown
  dot(props: { item: NativeCarouselItem; weight: number; active: boolean }): unknown
}>()
const { reducedMotion, direction, theme } = useNativeUI()
const pager = useTemplateRef<InstanceType<typeof SNativePager>>('pager')
const layoutOptions = computed(() => ({ perView: props.itemsPerView, gap: props.gap, padding: props.sidePadding, align: props.align }))
const index = computed(() => {
  const id = model.value ?? local.value
  const found = props.items.findIndex(item => Object.is(item.id, id) && !item.disabled)
  return found >= 0 ? found : nearestNativePage(props.items, 0)
})
const selected = computed(() => props.items[index.value]?.id)
const position = ref(Math.max(0, index.value))
const rtl = computed(() => direction.value === 'rtl')
const entries = computed(() => {
  const list = props.items.map((item, key) => ({ item, key }))
  return rtl.value ? list.reverse() : list
})
const indicatorWidth = computed(() => props.indicators === 'thumbnails' ? 64 : 40)
const enabled = computed(() => props.items.filter(item => !item.disabled).length)
const live = ref(false)
const foreground = ref(true)
const dragging = ref(false)
const hasPlayback = computed(() => props.autoPlay || playing.value !== undefined)
const playingValue = computed(() => (playing.value ?? props.autoPlay) && !reducedMotion.value)
let timer: ReturnType<typeof setTimeout> | undefined

function dest(delta: number, wrap: boolean) {
  for (let next = index.value + delta; next >= 0 && next < props.items.length; next += delta) {
    if (!props.items[next].disabled) return next
  }
  if (wrap && enabled.value > 1) return nearestNativePage(props.items, delta > 0 ? 0 : props.items.length - 1, delta)
  return -1
}
const canPrevious = computed(() => dest(-1, props.loop) >= 0)
const canNext = computed(() => dest(1, props.loop) >= 0)

function choose(key: NativeCollectionKey, animated = true, scroll = true) {
  if (props.disabled || !props.items.some(item => Object.is(item.id, key) && !item.disabled)) return
  const changed = !Object.is(key, selected.value)
  local.value = key
  model.value = key
  if (scroll) pager.value?.goTo(key, animated)
  if (changed) emit('change', key)
}
function step(delta: number, wrap = props.loop) {
  const item = props.items[dest(delta, wrap)]
  if (item) choose(item.id)
}
function interact() {
  dragging.value = true
  if (props.stopOnInteraction && playingValue.value) playing.value = false
}
function userStep(delta: number) {
  if (props.stopOnInteraction && playingValue.value) playing.value = false
  step(delta)
}
function userChoose(key: NativeCollectionKey) {
  if (props.stopOnInteraction && playingValue.value) playing.value = false
  choose(key)
}
function navigate(key: NativeCollectionNavigation) {
  if (key === 'left' || key === 'right') {
    userStep((key === 'right') !== rtl.value ? 1 : -1)
    return true
  }
  if (key === 'first' || key === 'last') {
    const next = nearestNativePage(props.items, key === 'first' ? 0 : props.items.length - 1)
    if (props.items[next]) userChoose(props.items[next].id)
    return true
  }
  return false
}
function progress(point: number) {
  position.value = point
  emit('progress', point)
}
function settle() {
  dragging.value = false
  emit('settled')
}
function label(item: NativeCarouselItem, offset: number) {
  return props.itemLabel?.(item, offset + 1, props.items.length) ?? item.label
}
function weight(offset: number) {
  return Math.max(0, 1 - Math.abs(position.value - offset))
}
function stop() {
  clearTimeout(timer)
  timer = undefined
}
function schedule() {
  stop()
  if (!playingValue.value || dragging.value || !live.value || !foreground.value || props.disabled || enabled.value < 2) return
  const time = Number.isFinite(props.interval) ? Math.max(600, props.interval) : 4500
  timer = setTimeout(() => { step(1, true); schedule() }, time)
}
function suspend() { foreground.value = false }
function resume() { foreground.value = true }
function loaded() {
  if (live.value) return
  live.value = true
  Application.on('suspend', suspend)
  Application.on('resume', resume)
}
function unloaded() {
  if (live.value) {
    Application.off('suspend', suspend)
    Application.off('resume', resume)
  }
  live.value = false
  dragging.value = false
  stop()
}
watch([playingValue, foreground, live, dragging, enabled, index, () => props.interval, () => props.disabled], schedule)
onBeforeUnmount(unloaded)
defineExpose({ goTo: choose, previous: () => step(-1), next: () => step(1), pause: () => { playing.value = false } })
</script>

<template>
  <StackLayout @loaded="loaded" @unloaded="unloaded">
    <SNativePager
      ref="pager" :items="items" :selected="selected" :layoutOptions="layoutOptions" :height="height"
      :animated="animated" :disabled="disabled" :swipeEnabled="swipeEnabled"
      @change="choose($event, true, false)" @progress="progress" @settled="settle" @interaction="interact">
      <template #default="{ item, selected: active }">
        <slot :item="item as NativeCarouselItem" :selected="active">
          <SNativeSurface tone="base" :padding="12">
            <SNativeText :text="item.label" heading />
          </SNativeSurface>
        </slot>
      </template>
    </SNativePager>
    <ScrollView v-if="indicators !== 'none'" height="44" horizontalAlignment="center" direction="ltr" orientation="horizontal" :scrollBarIndicatorVisible="false">
      <StackLayout orientation="horizontal" direction="ltr" :width="entries.length * indicatorWidth">
        <SNativePressableFeedback v-for="{ item, key } in entries" :key="item.id" :label="label(item, key)"
          :minWidth="indicatorWidth" :width="indicatorWidth" :height="44" :paddingInline="3" :pressed="indicators === 'thumbnails' && index === key"
          :accessibilityState="index === key ? AccessibilityState.Selected : undefined"
          :disabled="item.disabled || disabled" :navigate="navigate" fill="transparent" pressFill="transparent"
          @tap="userChoose(item.id)">
          <GridLayout v-if="indicators === 'thumbnails'">
            <slot name="thumbnail" :item="item" :selected="index === key" :position="key + 1">
              <Image v-if="item.thumbnail" :src="item.thumbnail" width="54" height="32" stretch="aspectFill"
                :borderRadius="theme.geometry.radiusSm" cornerShape="squircle" />
              <SNativeText v-else :text="item.shortLabel ?? item.label" :tone="index === key ? 'accent' : 'muted'"
                size="caption" :emphasized="index === key" verticalAlignment="middle" horizontalAlignment="center" />
            </slot>
          </GridLayout>
          <GridLayout v-else horizontalAlignment="center" verticalAlignment="middle">
            <slot name="dot" :item="item" :weight="weight(key)" :active="index === key">
              <GridLayout :width="7 + weight(key) * 9" height="7" borderRadius="4"
                :backgroundColor="index === key ? theme.colors.accent : theme.colors.borderStrong" />
            </slot>
          </GridLayout>
        </SNativePressableFeedback>
      </StackLayout>
    </ScrollView>
    <GridLayout v-if="controls || hasPlayback" columns="auto,*,auto" marginTop="4">
      <SNativeButton v-if="controls" :col="rtl ? 2 : 0" :label="previousLabel" variant="secondary" size="sm" :disabled="disabled || !canPrevious" @tap="userStep(-1)" />
      <SNativeButton v-if="hasPlayback" col="1" :label="startLabel" :accessibilityLabel="playingValue ? stopLabel : startLabel"
        :pressed="playingValue" :disabled="disabled || reducedMotion || enabled < 2" variant="ghost" size="sm" horizontalAlignment="center"
        @tap="playing = !playingValue">
        <template #label="{ color, size }">
          <SNativeMotionText :value="playingValue ? stopLabel : startLabel"
            :reserve="Math.max(startLabel.length, stopLabel.length)" :color="color" :size="size" />
        </template>
      </SNativeButton>
      <SNativeButton v-if="controls" :col="rtl ? 0 : 2" :label="nextLabel" variant="secondary" size="sm" :disabled="disabled || !canNext" @tap="userStep(1)" />
    </GridLayout>
  </StackLayout>
</template>
