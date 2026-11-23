<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, shallowRef, toRaw, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeWheelGroup } from '../wheel'
import { nativeWheelMetrics, nativeWheelSettlement, type NativeWheelColumn, type NativeWheelMotion, type NativeWheelOption, type NativeWheelValue, type NativeWheelValues } from '../wheel-state'
import SNativeWheelMask from './SNativeWheelMask.vue'
import SNativeWheelPicker from './SNativeWheelPicker.vue'

const props = withDefaults(defineProps<{
  label?: string
  columns?: readonly NativeWheelColumn[]
  defaultValues?: NativeWheelValues
  itemHeight?: number
  visibleCount?: number
  disabled?: boolean
  motion?: NativeWheelMotion
  showIndicator?: boolean
  indicatorColor?: string
  mask?: boolean
  maskColor?: string
  maskHeight?: number
}>(), { showIndicator: true })
const model = defineModel<NativeWheelValues>()
const emit = defineEmits<{ change: [values: NativeWheelValues]; commit: [values: NativeWheelValues] }>()
defineSlots<{
  default(props: { values: NativeWheelValues }): unknown
  item(props: { column: NativeWheelColumn; item: NativeWheelOption; index: number; selected: boolean; distance: number }): unknown
  indicator(props: { height: number }): unknown
  mask(props: { height: number }): unknown
}>()
const { direction, theme } = useNativeUI()
const metrics = computed(() => nativeWheelMetrics(props.itemHeight, props.visibleCount))
const maskHeight = computed(() => Math.min(metrics.value.padding, Math.max(0, props.maskHeight ?? metrics.value.row * .72)))
const rtl = computed(() => direction.value === 'rtl')
const widths = computed(() => {
  const tracks = (props.columns ?? []).map(column => column.width ?? '*')
  return (rtl.value ? tracks.reverse() : tracks).join(',')
})
const state = shallowRef<NativeWheelValues>({ ...props.defaultValues, ...model.value })
const settlement = nativeWheelSettlement()
let scheduled = false
let mounted = true

watch(model, values => {
  if (values && toRaw(values) === state.value) return
  state.value = { ...props.defaultValues, ...values }
  settlement.discard()
})

function get(name: string) {
  return Object.hasOwn(state.value, name) ? state.value[name] : undefined
}

function set(name: string, value: NativeWheelValue, user = true) {
  if (Object.is(get(name), value)) return
  state.value = { ...state.value, [name]: value }
  if (!user) return
  settlement.mark()
  model.value = state.value
  emit('change', state.value)
}

function activity(wheel: symbol, active: boolean) {
  settlement.activity(wheel, active)
  if (active || scheduled) return
  scheduled = true
  void nextTick(() => {
    scheduled = false
    if (mounted && settlement.take()) emit('commit', state.value)
  })
}

provide(nativeWheelGroup, {
  itemHeight: () => metrics.value.row,
  visibleCount: () => metrics.value.count,
  disabled: () => Boolean(props.disabled),
  animate: () => props.motion !== 'none',
  get, set, activity,
})

onBeforeUnmount(() => { mounted = false })
</script>

<template>
  <GridLayout :height="metrics.viewport" :clipToBounds="true" :accessibilityLabel="label">
    <GridLayout v-if="showIndicator" :height="metrics.row" verticalAlignment="middle"
      :isUserInteractionEnabled="false" :accessibilityHidden="true">
      <slot name="indicator" :height="metrics.row">
        <ContentView :backgroundColor="indicatorColor ?? theme.colors.accentSoft" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" />
      </slot>
    </GridLayout>
    <GridLayout v-if="columns?.length && !$slots.default" :columns="widths" direction="ltr">
      <SNativeWheelPicker v-for="(column, index) in columns" :key="column.name" :col="rtl ? columns.length - 1 - index : index"
        :name="column.name" :label="column.label" :items="column.items" :disabled="column.disabled" :defaultValue="column.defaultValue">
        <template v-if="$slots.item" #item="item">
          <slot name="item" :column="column" v-bind="item" />
        </template>
      </SNativeWheelPicker>
    </GridLayout>
    <FlexboxLayout v-else :flexDirection="rtl ? 'row-reverse' : 'row'" direction="ltr">
      <slot :values="state" />
    </FlexboxLayout>
    <GridLayout v-if="mask || $slots.mask" :isUserInteractionEnabled="false" :accessibilityHidden="true">
      <slot name="mask" :height="maskHeight">
        <SNativeWheelMask :size="maskHeight" :color="maskColor ?? theme.colors.canvas" />
      </slot>
    </GridLayout>
  </GridLayout>
</template>
