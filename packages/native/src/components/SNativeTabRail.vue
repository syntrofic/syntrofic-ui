<script setup lang="ts">
import { AccessibilityState, type GridLayout, type ScrollView, type View } from '@nativescript/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { nativeMorphWidths, nativePagerIndicator } from '../navigation-state'
import type { NativePagedTabsOptions, NativeTabItem } from '../navigation'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeTabItem[]
  label: string
  selected?: NativeCollectionKey
  position: number
  variant?: 'filled' | 'line' | 'morph'
  scrollable?: boolean
  scrollAlign?: NativePagedTabsOptions['scrollAlign']
  equalWidth?: boolean
  disabled?: boolean
  separators?: boolean
  tracking?: boolean
  size?: NativePagedTabsOptions['size']
  compactWidth?: number
}>(), { variant: 'filled', scrollAlign: 'center', size: 'md', compactWidth: 54 })
const emit = defineEmits<{ select: [key: NativeCollectionKey] }>()
defineSlots<{ trigger(props: { item: NativeTabItem; selected: boolean; progress: number }): unknown }>()
const { direction, theme, reducedMotion } = useNativeUI()
const motion = useNativeMotion()
const wrapper = useTemplateRef<{ nativeView: View }>('wrapper')
const scroll = useTemplateRef<{ nativeView: ScrollView }>('scroll')
const rail = useTemplateRef<{ nativeView: GridLayout }>('rail')
const marker = useTemplateRef<{ nativeView: View }>('marker')
const cells = new Map<NativeCollectionKey, View>()
const buttons = new Map<NativeCollectionKey, InstanceType<typeof SNativePressableFeedback>>()
const width = ref(0)
const rtl = computed(() => direction.value === 'rtl')
const morph = computed(() => props.variant === 'morph')
const line = computed(() => props.variant === 'line')
const tall = computed(() => props.size === 'lg' ? 52 : props.size === 'sm' ? 44 : 46)
const dims = computed(() => props.items.length
  ? morph.value ? nativeMorphWidths(props.items.length, width.value, props.compactWidth, props.position)
    : props.equalWidth && !props.scrollable && width.value ? props.items.map(() => width.value / props.items.length) : []
  : [])
let prior = ''
let present = false

function record(id: NativeCollectionKey, element: unknown) {
  if (element && typeof element === 'object' && 'nativeView' in element)
    cells.set(id, element.nativeView as View)
  else cells.delete(id)
}
function recordButton(id: NativeCollectionKey, element: unknown) {
  if (element) buttons.set(id, element as InstanceType<typeof SNativePressableFeedback>)
  else buttons.delete(id)
}
function indicator() {
  const host = rail.value?.nativeView
  const target = marker.value?.nativeView
  if (!host || !target) return
  if (props.selected === undefined || !props.items.length || props.position < 0) {
    if (present) motion(() => [{ target, opacity: 0, scale: { x: .88, y: .88 } }], 'exit')
    prior = ''
    present = false
    return
  }
  const bounds = props.items.map(item => {
    const cell = cells.get(item.id)
    const location = cell?.getLocationRelativeTo(host)
    const area = cell?.getActualSize()
    return location && area?.width ? { x: location.x + 2, width: Math.max(1, area.width - 4) } : undefined
  })
  if (bounds.some(item => !item)) return
  const position = nativePagerIndicator(bounds as { x: number; width: number }[], props.position)
  if (!position) return
  const y = line.value ? tall.value - 3 : 2
  const height = line.value ? 3 : tall.value - 4
  const signature = `${position.x}/${position.width}/${y}/${height}`
  if (signature === prior) return
  prior = signature
  if (props.tracking) {
    target.width = position.width
    target.height = height
    target.translateX = position.x
    target.translateY = y
    target.scaleX = target.scaleY = 1
    target.opacity = 1
    present = true
    return
  }
  const phase = present ? 'state' : 'enter'
  if (!present) {
    target.width = position.width
    target.height = height
    target.translateX = position.x
    target.translateY = y
    target.scaleX = target.scaleY = .88
    present = true
  }
  motion(() => [{ target, width: position.width, height, translate: { x: position.x, y },
    scale: { x: 1, y: 1 }, opacity: 1 }], phase)
}
function layout() {
  const actual = wrapper.value?.nativeView?.getActualSize().width
  if (actual && Math.abs(actual - width.value) > .5) width.value = actual
  indicator()
}
function reveal() {
  indicator()
  const surface = scroll.value?.nativeView
  const selected = props.selected !== undefined && cells.get(props.selected)
  const host = rail.value?.nativeView
  if (!surface || !selected || !host || !props.scrollable) return
  const x = selected.getLocationRelativeTo(host)?.x
  if (x === undefined) return
  const viewport = surface.getActualSize().width
  const cell = selected.getActualSize().width
  const old = surface.horizontalOffset
  const strategy = rtl.value && props.scrollAlign === 'start' ? 'end' : rtl.value && props.scrollAlign === 'end' ? 'start' : props.scrollAlign
  const next = strategy === 'center' ? x + (cell - viewport) / 2
    : strategy === 'end' ? x + cell - viewport
      : strategy === 'start' ? x
        : x < old ? x : x + cell > old + viewport ? x + cell - viewport : old
  surface.scrollToHorizontalOffset(Math.max(0, Math.min(surface.scrollableWidth, next)), !reducedMotion.value)
}
function chosen(item: NativeTabItem) { return Object.is(item.id, props.selected) }
function weight(index: number) { return Math.max(0, 1 - Math.abs(props.position - index)) }
function choose(item: NativeTabItem) {
  if (!props.disabled && !item.disabled) emit('select', item.id)
}
function navigate(item: NativeTabItem, key: NativeCollectionNavigation) {
  const available = props.items.filter(entry => !entry.disabled)
  const current = available.indexOf(item)
  if (props.disabled || current < 0) return false
  let next: number
  if (key === 'first') next = 0
  else if (key === 'last') next = available.length - 1
  else if (key === 'left' || key === 'right') next = current + ((key === 'right') !== rtl.value ? 1 : -1)
  else return false
  const entry = available[(next + available.length) % available.length]
  choose(entry)
  buttons.get(entry.id)?.focus()
  return true
}
watch([() => props.position, () => props.variant], () => { void nextTick(indicator) })
watch([() => props.selected, () => props.items, rtl], () => { void nextTick(reveal) })
watch(marker, () => { prior = ''; present = false; void nextTick(indicator) })
</script>

<template>
  <GridLayout ref="wrapper" @layoutChanged="layout">
    <component :is="scrollable ? 'ScrollView' : 'ContentView'" ref="scroll" direction="ltr"
      v-bind="scrollable ? { orientation: 'horizontal', scrollBarIndicatorVisible: false } : {}" :accessibilityLabel="label" @layoutChanged="layout">
      <GridLayout ref="rail" :height="tall" :backgroundColor="line || morph ? 'transparent' : theme.colors.surfaceMuted"
        :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" @layoutChanged="layout">
        <AbsoluteLayout :isUserInteractionEnabled="false" :accessibilityHidden="true">
          <ContentView ref="marker" :width="0" :height="0" :opacity="0" :borderRadius="line ? 3 : theme.geometry.radiusMd"
            :backgroundColor="line ? theme.colors.accent : theme.colors.accentSoft" />
        </AbsoluteLayout>
        <FlexboxLayout direction="ltr" :flexDirection="rtl ? 'row-reverse' : 'row'" flexWrap="nowrap">
          <GridLayout v-for="(item, index) in items" :key="item.id" :ref="(element: unknown) => record(item.id, element)"
            :width="dims[index]" :height="tall" :flexShrink="0" :clipToBounds="true" @layoutChanged="indicator">
            <SNativePressableFeedback :ref="element => recordButton(item.id, element)" :label="item.label" :accessibilityHint="item.description"
              :accessibilityState="chosen(item) ? AccessibilityState.Selected : undefined" :disabled="disabled || item.disabled"
              :minHeight="tall" :paddingInline="morph ? 5 : 12" fill="transparent" :pressFill="theme.colors.surfaceSage"
              :navigate="key => navigate(item, key)" @tap="choose(item)">
              <GridLayout :clipToBounds="true">
                <slot name="trigger" :item="item" :selected="chosen(item)" :progress="weight(index)">
                  <SNativeMotionText v-if="morph" :value="weight(index) > .58 ? item.label : item.shortLabel ?? item.label"
                    :size="14" :color="chosen(item) ? theme.colors.accentText : theme.colors.text" horizontalAlignment="center" verticalAlignment="middle" />
                  <SNativeText v-else :text="item.label" :tone="chosen(item) ? 'accent' : 'default'" :size="size === 'sm' ? 'caption' : 'body'"
                    textAlignment="center" verticalAlignment="middle" :wrap="false" emphasized />
                </slot>
              </GridLayout>
            </SNativePressableFeedback>
            <ContentView v-if="separators && index + 1 < items.length" :horizontalAlignment="rtl ? 'left' : 'right'" verticalAlignment="middle"
              :height="Math.round(tall * .4)" width="1" :backgroundColor="theme.colors.borderStrong"
              :opacity="1 - Math.max(weight(index), weight(index + 1))" :isUserInteractionEnabled="false" :accessibilityHidden="true" />
          </GridLayout>
        </FlexboxLayout>
      </GridLayout>
    </component>
  </GridLayout>
</template>
