<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole } from '@nativescript/core'
import { computed, ref, useSlots, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { useNativeUI } from '../context'
import { nativeBadgePosition, nativeBadgeText, type NativeBadgePlacement } from '../display-state'
import { nativeFeedbackFormatter, type NativeFeedbackTone, type NativeProgressSize } from '../feedback'
import SNativeChip from './SNativeChip.vue'
import SNativeMotionText from './SNativeMotionText.vue'

const props = withDefaults(defineProps<{
  count?: number
  max?: number
  label?: string
  accessibilityLabel?: string
  showZero?: boolean
  dot?: boolean
  visible?: boolean
  tone?: NativeFeedbackTone
  variant?: 'soft' | 'solid' | 'outline'
  size?: NativeProgressSize
  placement?: NativeBadgePlacement
  inset?: number
  locale?: string
  announce?: boolean
  animated?: boolean
}>(), {
  max: 99, visible: true, tone: 'accent', variant: 'soft', size: 'sm',
  placement: 'top-end', inset: 2, animated: true,
})
defineSlots<{
  anchor(): unknown
  default(props: { text: string; color: string }): unknown
}>()
const slots = useSlots()
const { direction, theme } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
const formatter = computed(() => nativeFeedbackFormatter(props.locale))
const count = computed(() => nativeBadgeText(props.count, props.max, props.showZero, formatter.value.format))
const isDot = computed(() => props.dot || (props.count === undefined && !props.label && !slots.default))
const shown = computed(() => props.visible && (isDot.value || Boolean(count.value) || Boolean(props.label) || Boolean(slots.default)))
const amount = computed(() => props.label ?? count.value ?? '')
const last = ref(amount.value)
watch(amount, text => { if (text) last.value = text })
const displayed = computed(() => amount.value || last.value)
const position = computed(() => nativeBadgePosition(props.placement, rtl.value, props.inset))
function margins(distance: number) {
  const value = Math.max(0, distance)
  const { horizontal, vertical } = position.value
  return `${vertical === 'top' ? value : 0} ${horizontal === 'right' ? value : 0} ${vertical === 'bottom' ? value : 0} ${horizontal === 'left' ? value : 0}`
}
const anchorMargin = computed(() => margins(Number.isFinite(props.inset) ? props.inset : 0))
const badgeMargin = computed(() => margins(Number.isFinite(props.inset) ? -props.inset : 0))
const fontSize = computed(() => ({ sm: 11, md: 13, lg: 15 })[props.size])
const dotSize = computed(() => ({ sm: 7, md: 9, lg: 11 })[props.size])
const dotColor = computed(() => props.tone === 'neutral' ? theme.value.colors.textMuted : theme.value.colors[props.tone])
const visibility = useActionMeter(computed(() => Number(shown.value)), computed(() => !props.animated))
const targetLabel = computed(() => {
  if (props.accessibilityLabel && props.count !== undefined && count.value) {
    return `${props.accessibilityLabel} ${formatter.value.format(Math.max(0, Math.floor(props.count)))}`
  }
  return props.accessibilityLabel ?? amount.value
})
</script>

<template>
  <GridLayout :horizontalAlignment="rtl ? 'right' : 'left'" :clipToBounds="false">
    <GridLayout v-if="$slots.anchor" :margin="anchorMargin"><slot name="anchor" /></GridLayout>
    <GridLayout
      :horizontalAlignment="$slots.anchor ? position.horizontal : rtl ? 'right' : 'left'"
      :verticalAlignment="$slots.anchor ? position.vertical : 'middle'"
      :margin="$slots.anchor ? badgeMargin : 0"
      :opacity="visibility" :scaleX=".82 + visibility * .18" :scaleY=".82 + visibility * .18"
      :accessible="shown && Boolean(targetLabel)" :accessibilityHidden="!shown || !targetLabel"
      :accessibilityLabel="targetLabel" :accessibilityRole="AccessibilityRole.StaticText"
      :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
      :isUserInteractionEnabled="false">
      <GridLayout v-if="isDot" :width="dotSize" :height="dotSize" :borderRadius="dotSize / 2" :backgroundColor="dotColor" />
      <SNativeChip v-else :accessibilityHidden="true" :size="size" :tone="tone" :variant="variant">
        <template #default="{ color }">
          <slot :text="displayed" :color="color">
            <SNativeMotionText :value="displayed" :size="fontSize" :color="color" :animated="animated"
              :reserve="count === undefined || label ? 0 : formatter.format(Math.max(1, max)).length + 1" />
          </slot>
        </template>
      </SNativeChip>
    </GridLayout>
  </GridLayout>
</template>
