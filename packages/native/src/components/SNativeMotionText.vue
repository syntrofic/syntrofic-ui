<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeDecimalValue } from '../control-state'
import { isNativeJoiningLetter, nativeGraphemeWidth, nativeSegmenter } from '../text-platform'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'

const props = withDefaults(defineProps<{
  value: string
  reserve?: number
  size?: number
  color?: string
  announce?: boolean
  animated?: boolean
}>(), { reserve: 0, size: 15, animated: true })
const { theme, direction } = useNativeUI()
const segmenter = nativeSegmenter()
const ink = computed(() => props.color ?? theme.value.colors.text)

const runs = computed(() => {
  const graphemes = segmenter ? Array.from(segmenter.segment(props.value), part => part.segment) : Array.from(props.value)
  const result: { id: number; parts: string[]; numeric: boolean }[] = []
  const count = Number.isSafeInteger(props.reserve) ? Math.max(0, props.reserve - graphemes.length) : 0
  const placeholders = Array.from({ length: count }, () => ' ')
  let previousJoins = false
  for (const [id, part] of [...placeholders, ...graphemes].entries()) {
    const numeric = part.length === (part.codePointAt(0)! > 0xffff ? 2 : 1) && nativeDecimalValue(part) !== undefined || id < placeholders.length
    const previous = result.at(-1)
    const joins = isNativeJoiningLetter(part)
    if (numeric && previous?.numeric) previous.parts.push(part)
    else if (joins && previousJoins && previous) previous.parts[0] += part
    else result.push({ id, parts: [part], numeric })
    previousJoins = joins
  }
  return direction.value === 'rtl' ? result.reverse() : result
})
const widthOf = (parts: string[], numeric: boolean) => parts.reduce((width, part) => width + nativeGraphemeWidth(part, props.size, numeric), 0)
const totalWidth = computed(() => runs.value.reduce((width, run) => width + widthOf(run.parts, run.numeric), 0))
</script>

<template>
  <StackLayout
    orientation="horizontal"
    :width="Math.max(1, totalWidth)"
    :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'"
    :accessible="true"
    :accessibilityLabel="value"
    :accessibilityRole="AccessibilityRole.StaticText"
    :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
  >
    <StackLayout v-for="run in runs" :key="run.id" orientation="horizontal" :width="widthOf(run.parts, run.numeric)" :accessibilityHidden="true">
      <SNativeMotionGlyph
        v-for="(character, index) in run.parts"
        :key="index"
        :text="character"
        :numeric="run.numeric"
        :animated="animated"
        :size="size"
        :color="ink"
      />
    </StackLayout>
  </StackLayout>
</template>
