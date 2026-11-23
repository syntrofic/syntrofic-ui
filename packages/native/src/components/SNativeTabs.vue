<script setup lang="ts">
import { AccessibilityState, type GridLayout, type ScrollView, type View } from '@nativescript/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { activeCollectionItem, type NativeCollectionItem, type NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeCollectionItem[]
  label: string
  orientation?: 'horizontal' | 'vertical'
  variant?: 'filled' | 'line'
  scrollable?: boolean
  railSize?: number
  lazy?: boolean
  keepAlive?: boolean
  disabled?: boolean
}>(), { orientation: 'horizontal', variant: 'filled', railSize: 160, lazy: true, keepAlive: true })
const value = defineModel<NativeCollectionKey>()
const emit = defineEmits<{ change: [key: NativeCollectionKey] }>()
const { theme, direction, reducedMotion } = useNativeUI()
const runMotion = useNativeMotion()
const rail = useTemplateRef<{ nativeView: GridLayout }>('rail')
const scroll = useTemplateRef<{ nativeView: ScrollView }>('scroll')
const indicator = useTemplateRef<{ nativeView: View }>('indicator')
const buttons = new Map<NativeCollectionKey, View>()
const selected = computed(() => activeCollectionItem(props.items, value.value)?.id)
const visited = shallowRef(new Set<NativeCollectionKey>())
const horizontal = computed(() => props.orientation === 'horizontal')
const rtl = computed(() => direction.value === 'rtl')
const line = computed(() => props.variant === 'line')
let last = ''
let placed = false

function record(id: NativeCollectionKey, element: unknown) {
  if (element && typeof element === 'object' && 'nativeView' in element)
    buttons.set(id, element.nativeView as View)
  else buttons.delete(id)
}

function measure() {
  const host = rail.value?.nativeView
  const marker = indicator.value?.nativeView
  const item = selected.value === undefined ? undefined : buttons.get(selected.value)
  if (!marker || !host) return
  if (!item) {
    if (last) runMotion(() => [{ target: marker, opacity: 0, scale: { x: 0.96, y: 0.96 } }], 'exit')
    last = ''
    placed = false
    return
  }
  const point = item.getLocationRelativeTo(host)
  const size = item.getActualSize()
  if (!point || !size?.height || !size.width) return
  const lineWidth = line.value && !horizontal.value
  const lineHeight = line.value && horizontal.value
  const width = lineWidth ? 3 : Math.max(0, size.width - 4)
  const height = lineHeight ? 3 : Math.max(0, size.height - 4)
  const x = lineWidth && !rtl.value ? point.x + size.width - 3 : point.x + 2
  const y = lineHeight ? point.y + size.height - 3 : point.y + 2
  const position = `${x}/${y}/${width}/${height}`
  if (last === position) return
  last = position
  runMotion(() => {
    if (!placed) {
      marker.width = width
      marker.height = height
      marker.translateX = x
      marker.translateY = y
      marker.scaleX = marker.scaleY = 1.045
      placed = true
    }
    return [{ target: marker, width, height, translate: { x, y }, scale: { x: 1, y: 1 }, opacity: 1 }]
  }, placed ? 'state' : 'enter')
  if (!props.scrollable) return
  const surface = scroll.value?.nativeView
  const viewport = surface?.getActualSize()
  if (!surface || !viewport) return
  const animate = !reducedMotion.value
  if (horizontal.value) surface.scrollToHorizontalOffset(
    Math.min(surface.scrollableWidth, Math.max(0, point.x + size.width / 2 - viewport.width / 2)), animate,
  )
  else surface.scrollToVerticalOffset(
    Math.min(surface.scrollableHeight, Math.max(0, point.y + size.height / 2 - viewport.height / 2)), animate,
  )
}

watch([selected, () => props.items], ([active, items]) => {
  const live = new Set(items.map(item => item.id))
  const next = new Set([...visited.value].filter(id => live.has(id)))
  if (active !== undefined) next.add(active)
  visited.value = next
  void nextTick(measure)
}, { immediate: true })
watch([horizontal, line, rtl], () => { void nextTick(measure) })
watch(indicator, () => {
  last = ''
  placed = false
  void nextTick(measure)
})

function select(item: NativeCollectionItem) {
  if (props.disabled || item.disabled || Object.is(item.id, selected.value)) return
  value.value = item.id
  emit('change', item.id)
}

function shown(id: NativeCollectionKey) {
  return Object.is(id, selected.value)
}
</script>

<template>
  <GridLayout :rows="horizontal ? 'auto,auto' : 'auto'" :columns="horizontal ? '*' : rtl ? '*,auto' : 'auto,*'" direction="ltr">
    <component
      :is="scrollable ? 'ScrollView' : 'ContentView'"
      ref="scroll"
      direction="ltr"
      :col="horizontal || !rtl ? 0 : 1"
      :width="horizontal ? undefined : railSize"
      :height="!horizontal && scrollable ? railSize : undefined"
      v-bind="scrollable ? { orientation } : {}"
      :accessibilityLabel="label"
      @layoutChanged="measure"
    >
      <GridLayout
        ref="rail"
        :borderRadius="theme.geometry.radiusMd" cornerShape="squircle"
        :backgroundColor="line ? 'transparent' : theme.colors.surfaceMuted"
        @layoutChanged="measure"
      >
        <AbsoluteLayout :isUserInteractionEnabled="false" :accessibilityHidden="true">
          <ContentView
            ref="indicator"
            :width="0"
            :height="0"
            :opacity="0"
            :borderRadius="line ? 3 : theme.geometry.radiusSm"
            :backgroundColor="line ? theme.colors.accent : theme.colors.accentSoft"
          />
        </AbsoluteLayout>
        <FlexboxLayout
          direction="ltr"
          :flexDirection="horizontal ? rtl ? 'row-reverse' : 'row' : 'column'"
          :flexWrap="horizontal && !scrollable ? 'wrap' : 'nowrap'"
        >
          <GridLayout
            v-for="item in items"
            :key="item.id"
            :ref="(element: unknown) => record(item.id, element)"
            @layoutChanged="measure"
          >
            <SNativePressableFeedback
              :label="item.label"
              :accessibilityHint="item.description"
              :accessibilityState="shown(item.id) ? AccessibilityState.Selected : undefined"
              :disabled="disabled || item.disabled"
              :paddingInline="theme.geometry.space3"
              fill="transparent"
              :pressFill="theme.colors.surfaceSage"
              @tap="select(item)"
            >
              <slot name="trigger" :item="item" :selected="shown(item.id)">
                <SNativeText :text="item.label" :tone="shown(item.id) ? 'accent' : 'muted'" emphasized />
              </slot>
            </SNativePressableFeedback>
          </GridLayout>
        </FlexboxLayout>
      </GridLayout>
    </component>
    <SNativeReveal
      :row="horizontal ? 1 : 0"
      :col="horizontal || rtl ? 0 : 1"
      :transitionKey="selected"
      :marginTop="horizontal ? theme.geometry.space2 : 0"
      :marginLeft="!horizontal && !rtl ? theme.geometry.space2 : 0"
      :marginRight="!horizontal && rtl ? theme.geometry.space2 : 0"
    >
      <StackLayout
        v-for="item in items"
        :key="item.id"
        :visibility="shown(item.id) ? 'visible' : 'collapse'"
        :isUserInteractionEnabled="shown(item.id)"
        :accessibilityHidden="!shown(item.id)"
      >
        <slot v-if="shown(item.id) || !lazy || keepAlive && visited.has(item.id)" :item="item" :selected="shown(item.id)" />
      </StackLayout>
    </SNativeReveal>
  </GridLayout>
</template>
