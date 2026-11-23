<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole } from '@nativescript/core'
import { computed, ref, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { nativeDecimalValue } from '../control-state'
import { useNativeUI } from '../context'
import { nativeFeedbackFormatter } from '../feedback'
import { nativeGraphemeWidth, nativeSegmenter } from '../text-platform'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'
import SNativeMotionText from './SNativeMotionText.vue'

const props = withDefaults(defineProps<{
  value: number
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  format?: (value: number) => string
  prefix?: string
  suffix?: string
  label?: string
  placeholder?: string
  reserve?: number
  reserveFor?: number
  size?: number
  color?: string
  animated?: boolean
  announce?: boolean
  decorative?: boolean
}>(), { placeholder: '—', size: 18, animated: true })
defineSlots<{
  default(props: { value: number; formatted: string }): unknown
  prefix(props: { text: string }): unknown
  suffix(props: { text: string }): unknown
}>()
const { direction, theme } = useNativeUI()
const formatter = computed(() => nativeFeedbackFormatter(props.locale, props.formatOptions))
const formatted = computed(() => Number.isFinite(props.value) ? props.format?.(props.value) ?? formatter.value.format(props.value) : props.placeholder)
const color = computed(() => props.color ?? theme.value.colors.text)
const segmenter = nativeSegmenter()
const glyphs = (value: string) => {
  const text = value.replace(/[\u061c\u200e\u200f]/g, '')
  return segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text)
}
function parts(value: string) {
  const text = glyphs(value)
  const left = text.findIndex(point => nativeDecimalValue(point) !== undefined)
  let right = text.length - 1
  while (right > left && nativeDecimalValue(text[right]) === undefined) right--
  return left >= 0 ? {
    lead: text.slice(0, left).join(''), core: text.slice(left, right + 1), trail: text.slice(right + 1).join(''),
  } : { lead: '', core: text, trail: '' }
}
const pieces = computed(() => parts(formatted.value))
const seed = computed(() => Number.isFinite(props.reserveFor) ? parts(props.format?.(props.reserveFor!) ?? formatter.value.format(props.reserveFor!)) : undefined)
const known = ref({ count: 0, lead: 0, trail: 0 })
const pixels = (text: string) => text ? nativeGraphemeWidth(text, props.size, false) : 0
watch([pieces, seed, () => props.size], ([current, previous]) => {
  known.value = {
    count: Math.max(known.value.count, current.core.length, previous?.core.length ?? 0),
    lead: Math.max(known.value.lead, pixels(current.lead), pixels(previous?.lead ?? '')),
    trail: Math.max(known.value.trail, pixels(current.trail), pixels(previous?.trail ?? '')),
  }
}, { immediate: true })
const count = computed(() => Math.max(known.value.count, Number.isFinite(props.reserve) ? Math.min(32, Math.trunc(props.reserve!)) : 0))
const unitWidth = computed(() => Math.ceil(props.size * .64))
const cells = computed(() => Array.from({ length: count.value }, (_, index) => {
  const key = count.value - index - 1
  return { key, text: pieces.value.core[pieces.value.core.length - 1 - key] ?? ' ' }
}))
const leadOffset = useActionMeter(computed(() => (count.value - pieces.value.core.length) * unitWidth.value), computed(() => !props.animated))
const leadWidth = computed(() => known.value.lead + pixels(props.prefix ?? ''))
const tailWidth = computed(() => known.value.trail + pixels(props.suffix ?? ''))
const columns = computed(() => `${leadWidth.value || 'auto'},${count.value * unitWidth.value},${tailWidth.value || 'auto'}`)
const spoken = computed(() => [props.label, `${props.prefix ?? ''}${formatted.value}${props.suffix ?? ''}`].filter(Boolean).join(' '))
const leading = computed(() => `${props.prefix ?? ''}${pieces.value.lead}`)
const trailing = computed(() => `${pieces.value.trail}${props.suffix ?? ''}`)
</script>

<template>
  <GridLayout :accessible="!decorative" :accessibilityHidden="decorative" :accessibilityLabel="spoken" :accessibilityRole="AccessibilityRole.StaticText"
    :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
    :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'">
    <slot :formatted="formatted" :value="value">
      <GridLayout :columns="columns" direction="ltr" :accessibilityHidden="true" :height="Math.ceil(size * 1.55)">
        <StackLayout col="1" orientation="horizontal" :width="count * unitWidth">
          <template v-for="cell in cells" :key="cell.key">
            <SNativeMotionGlyph :text="cell.text" :size="size" :color="color" :animated="animated" :cellWidth="unitWidth" numeric />
          </template>
        </StackLayout>
        <GridLayout col="0" :colSpan="2" :width="leadWidth" horizontalAlignment="left" :translateX="leadOffset">
          <slot name="prefix" :text="leading">
            <SNativeMotionText v-if="leading || leadWidth" horizontalAlignment="right" :value="leading" :size="size" :color="color" :animated="animated" verticalAlignment="middle" />
          </slot>
        </GridLayout>
        <GridLayout col="2">
          <slot name="suffix" :text="trailing">
            <SNativeMotionText v-if="trailing || tailWidth" :value="trailing" :size="size" :color="color" :animated="animated" verticalAlignment="middle" />
          </slot>
        </GridLayout>
      </GridLayout>
    </slot>
  </GridLayout>
</template>
