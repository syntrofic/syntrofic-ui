<script setup lang="ts">
import { AccessibilityState } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { activeCollectionItem, type NativeCollectionKey } from '../collection-state'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import type { NativeStepItem } from '../navigation'
import SNativeDescription from './SNativeDescription.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeStepItem[]
  label: string
  defaultSelected?: NativeCollectionKey
  orientation?: 'horizontal' | 'vertical'
  linear?: boolean
  disabled?: boolean
  animated?: boolean
  currentLabel?: string
  completeLabel?: string
  pendingLabel?: string
  unavailableLabel?: string
}>(), {
  orientation: 'vertical', animated: true, currentLabel: 'Current step', completeLabel: 'Completed',
  pendingLabel: 'Upcoming', unavailableLabel: 'Unavailable',
})
const model = defineModel<NativeCollectionKey>()
const completed = defineModel<readonly NativeCollectionKey[]>('completed')
const emit = defineEmits<{ change: [key: NativeCollectionKey]; complete: [key: NativeCollectionKey] }>()
defineSlots<{
  indicator(props: { item: NativeStepItem; index: number; status: string }): unknown
  step(props: { item: NativeStepItem; index: number; status: string; reachable: boolean }): unknown
}>()
const { direction, theme } = useNativeUI()
const vertical = computed(() => props.orientation === 'vertical')
const rtl = computed(() => direction.value === 'rtl')
const selected = computed(() => activeCollectionItem(props.items, model.value ?? props.defaultSelected)?.id)
const current = computed(() => props.items.findIndex(item => Object.is(item.id, selected.value)))
const moving = useActionMeter(current, computed(() => !props.animated))
const done = computed(() => {
  const keys = completed.value ?? props.items.slice(0, Math.max(0, current.value)).filter(item => !item.disabled).map(item => item.id)
  return new Set([...keys, ...props.items.filter(item => item.complete || item.status === 'complete').map(item => item.id)])
})
function reachable(item: NativeStepItem, index: number) {
  return !props.disabled && !item.disabled &&
    (!props.linear || index <= current.value || props.items.slice(0, index).every(previous => previous.disabled || done.value.has(previous.id)))
}
function status(item: NativeStepItem, index: number) {
  if (index === current.value || item.status === 'current') return 'current'
  if (done.value.has(item.id)) return 'complete'
  return reachable(item, index) ? 'pending' : 'unavailable'
}
const labels = computed(() => ({
  current: props.currentLabel, complete: props.completeLabel, pending: props.pendingLabel, unavailable: props.unavailableLabel,
}))
function change(key: NativeCollectionKey) {
  const index = props.items.findIndex(item => Object.is(item.id, key))
  if (index < 0 || index === current.value || !reachable(props.items[index], index)) return false
  model.value = key
  emit('change', key)
  return true
}
function mark(key = selected.value) {
  if (props.disabled || key === undefined || done.value.has(key) || !props.items.some(item => Object.is(item.id, key) && !item.disabled)) return
  completed.value = [...done.value, key]
  emit('complete', key)
}
function next() {
  const index = props.items.findIndex((entry, index) => index > current.value && !entry.disabled)
  if (index < 0 || props.disabled) return false
  if (props.linear && !props.items.slice(0, index).every((entry, index) =>
    entry.disabled || index === current.value || done.value.has(entry.id))) return false
  mark()
  const key = props.items[index].id
  model.value = key
  emit('change', key)
  return true
}
function previous() {
  const item = props.items.slice(0, current.value).reverse().find(entry => !entry.disabled)
  return item ? change(item.id) : false
}
function keyboard(key: NativeCollectionNavigation) {
  const candidates = props.items.filter(reachable)
  const currentIndex = candidates.findIndex(item => Object.is(item.id, selected.value))
  let item: NativeStepItem | undefined
  if (key === 'first') item = candidates[0]
  else if (key === 'last') item = candidates.at(-1)
  else if (vertical.value && (key === 'next' || key === 'previous')) item = candidates[currentIndex + (key === 'next' ? 1 : -1)]
  else if (!vertical.value && (key === 'left' || key === 'right')) item = candidates[currentIndex + ((key === 'right') !== rtl.value ? 1 : -1)]
  return item ? change(item.id) : false
}
function fraction(index: number) { return Math.min(1, Math.max(0, moving.value - index)) }
function fill(index: number) { return `${fraction(index) * 100}%` }
function segment(index: number, leading: boolean) {
  const progress = fraction(leading ? index - 1 : index)
  return `${(leading ? Math.min(1, Math.max(0, progress * 2 - 1)) : Math.min(1, progress * 2)) * 100}%`
}
defineExpose({ goTo: change, next, previous, complete: mark })
</script>

<template>
  <GridLayout :columns="vertical ? '*' : items.map(() => '*').join(',')" :rows="vertical ? items.map(() => 'auto').join(',') : '*'"
    :accessibilityLabel="label" direction="ltr">
    <GridLayout v-for="(item, index) in items" :key="item.id" :row="vertical ? index : 0"
      :col="vertical ? 0 : rtl ? items.length - 1 - index : index">
      <GridLayout v-if="vertical && index + 1 < items.length" :columns="rtl ? '*,36' : '36,*'" rows="32,*" :isUserInteractionEnabled="false" :accessibilityHidden="true">
        <GridLayout row="1" :col="rtl ? 1 : 0" width="2" horizontalAlignment="center" :backgroundColor="theme.colors.border">
          <ContentView :height="fill(index)" verticalAlignment="top" :backgroundColor="theme.colors.accent" />
        </GridLayout>
      </GridLayout>
      <GridLayout v-if="!vertical" columns="*,*" height="32" verticalAlignment="top" :isUserInteractionEnabled="false" :accessibilityHidden="true">
        <GridLayout v-if="index" :col="rtl ? 1 : 0" height="2" verticalAlignment="middle" :backgroundColor="theme.colors.border">
          <ContentView :width="segment(index, true)" :horizontalAlignment="rtl ? 'right' : 'left'" :backgroundColor="theme.colors.accent" />
        </GridLayout>
        <GridLayout v-if="index + 1 < items.length" :col="rtl ? 0 : 1" height="2" verticalAlignment="middle" :backgroundColor="theme.colors.border">
          <ContentView :width="segment(index, false)" :horizontalAlignment="rtl ? 'right' : 'left'" :backgroundColor="theme.colors.accent" />
        </GridLayout>
      </GridLayout>
      <SNativePressableFeedback :label="item.label" :accessibilityHint="item.description" :accessibilityValue="labels[status(item, index)]"
        :accessibilityState="current === index ? AccessibilityState.Selected : undefined" :disabled="!reachable(item, index)"
        :paddingInline="0" fill="transparent" pressFill="transparent" :navigate="keyboard" @tap="change(item.id)">
        <GridLayout :columns="vertical ? (rtl ? '*,36' : '36,*') : '*'" :rows="vertical ? '*' : '32,*'" :minHeight="vertical ? 49 : 50">
          <GridLayout :col="vertical && rtl ? 1 : 0" horizontalAlignment="center"
            verticalAlignment="top" width="29" height="29" :borderRadius="theme.geometry.radiusSm" cornerShape="squircle"
            :backgroundColor="current === index ? theme.colors.accentSoft : done.has(item.id) ? theme.colors.surfaceSage : theme.colors.surfaceMuted">
            <slot name="indicator" :item="item" :index="index" :status="status(item, index)">
              <SNativeMotionText :value="String(index + 1)" :size="13" :color="current === index ? theme.colors.accentText : theme.colors.text"
                horizontalAlignment="center" verticalAlignment="middle" />
            </slot>
          </GridLayout>
          <StackLayout :row="vertical ? 0 : 1" :col="vertical && !rtl ? 1 : 0" :verticalAlignment="vertical ? 'top' : 'middle'"
            :paddingLeft="vertical && !rtl ? 5 : 2" :paddingRight="vertical && rtl ? 5 : 2" :paddingTop="vertical ? 2 : 1">
            <slot name="step" :item="item" :index="index" :status="status(item, index)" :reachable="reachable(item, index)">
              <SNativeText :text="item.label" :textAlignment="vertical ? rtl ? 'right' : 'left' : 'center'" emphasized />
              <SNativeDescription v-if="item.description" :text="item.description"
                :textAlignment="vertical ? rtl ? 'right' : 'left' : 'center'" marginTop="1" />
            </slot>
          </StackLayout>
        </GridLayout>
      </SNativePressableFeedback>
    </GridLayout>
  </GridLayout>
</template>
