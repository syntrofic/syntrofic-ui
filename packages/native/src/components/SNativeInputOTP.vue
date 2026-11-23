<script setup lang="ts">
import { isAndroid, type EventData, type GridLayout, type TapGestureEventData, type TextField } from '@nativescript/core'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { normalizeOTP, otpSize, type NativeOTPMode } from '../control-state'
import { useNativeUI } from '../context'
import { nativeCaret } from '../native-selection'
import SNativeFocusGroup from './SNativeFocusGroup.vue'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'

const props = withDefaults(defineProps<{
  label: string
  hint?: string
  length?: number
  splitAt?: number
  mode?: NativeOTPMode
  mask?: boolean
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
}>(), { length: 6, mode: 'numeric' })
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ complete: [code: string]; focus: []; blur: [] }>()
const input = useTemplateRef<{ nativeView: TextField }>('input')
const focusGroup = useTemplateRef<InstanceType<typeof SNativeFocusGroup>>('focusGroup')
const cells = new Map<number, GridLayout>()
const { theme } = useNativeUI()
const length = computed(() => otpSize(props.length))
const code = computed(() => normalizeOTP(value.value, props.mode, length.value))
const keyboard = computed(() => props.mode === 'numeric' ? isAndroid && props.mask ? 'number' : 'integer' : undefined)
const split = computed(() => {
  const index = props.splitAt
  return index !== undefined && Number.isInteger(index) && index > 0 && index < length.value ? index : undefined
})
const parts = computed(() => Array.from({ length: length.value }, (_, index) => ({
  value: code.value[index] ?? '',
  index,
  column: index + Number(split.value !== undefined && index >= split.value),
})))
const columns = computed(() => {
  const widths = parts.value.map(() => '*')
  if (split.value !== undefined) widths.splice(split.value, 0, '8')
  return widths.join(',')
})
const position = ref(0)
const active = computed(() => Math.min(position.value, length.value - 1))
const focused = ref(false)
let observed: GridLayout | undefined
let selectionTimer: ReturnType<typeof setInterval> | undefined
let writing = false

function record(index: number, element: unknown) {
  if (element && typeof element === 'object' && 'nativeView' in element) cells.set(index, element.nativeView as GridLayout)
  else cells.delete(index)
}

function syncSelection() {
  const field = input.value?.nativeView
  if (field) position.value = Math.max(0, Math.min(code.value.length, nativeCaret(field, code.value.length)))
}

function showRing() {
  const cell = cells.get(active.value)
  if (focused.value && cell && observed !== cell) {
    observed = cell
    focusGroup.value?.focus(cell)
  }
}
watch([active, focused, length, () => props.splitAt], showRing, { flush: 'post' })

function stopTracking() {
  if (selectionTimer !== undefined) clearInterval(selectionTimer)
  selectionTimer = undefined
  if (observed) focusGroup.value?.blur(observed)
  observed = undefined
}

function begin() {
  if (focused.value) return
  focused.value = true
  syncSelection()
  selectionTimer = setInterval(syncSelection, 90)
  emit('focus')
}

function end() {
  if (!focused.value) return
  focused.value = false
  stopTracking()
  emit('blur')
}

function edit(event: EventData) {
  if (writing || props.readonly || props.disabled) return
  const field = event.object as TextField
  const raw = field.text
  const next = normalizeOTP(raw, props.mode, length.value)
  const caret = nativeCaret(field, raw.length)
  if (raw !== next) {
    const offset = normalizeOTP(raw.slice(0, caret), props.mode, length.value).length
    writing = true
    try {
      field.text = next
      if (focused.value) field.setSelection(offset)
    } finally { writing = false }
    position.value = offset
  } else {
    position.value = Math.max(0, Math.min(next.length, caret))
  }
  if (next !== code.value) value.value = next
}

function tap(event: TapGestureEventData) {
  if (props.disabled || props.readonly || event.getPointerCount() > 1) return
  const field = input.value?.nativeView
  if (!field) return
  const x = event.getX()
  for (const [index, cell] of cells) {
    const left = cell.getLocationRelativeTo(field)?.x
    const width = cell.getActualSize()?.width
    if (left === undefined || !width || x < left || x >= left + width) continue
    void nextTick(() => {
      if (!focused.value) return
      const offset = Math.min(index, code.value.length)
      field.setSelection(offset)
      position.value = offset
    })
    break
  }
}

watch(code, (next, previous) => {
  if (next !== previous && next.length === length.value) emit('complete', next)
})
watch(() => props.disabled || props.readonly, blocked => {
  if (blocked) {
    input.value?.nativeView.dismissSoftInput()
    end()
  }
})
onBeforeUnmount(stopTracking)
defineExpose({ focus: () => !props.disabled && (input.value?.nativeView.focus() ?? false) })
</script>

<template>
  <SNativeFocusGroup ref="focusGroup" :inset="0" :radius="theme.geometry.radiusSm" :opacity="disabled ? 0.55 : 1">
    <GridLayout :minHeight="44">
      <GridLayout :columns="columns" direction="ltr" :accessibilityHidden="true" :isUserInteractionEnabled="false">
        <GridLayout
          v-for="part in parts"
          :key="part.index"
          :ref="(view: unknown) => record(part.index, view)"
          :col="part.column"
          :margin="2"
          :minHeight="40"
          :borderRadius="theme.geometry.radiusSm" cornerShape="squircle"
          :borderColor="invalid ? theme.colors.danger : theme.colors.border"
          :borderWidth="1"
          :backgroundColor="theme.colors.surface"
        >
          <slot name="cell" :index="part.index" :filled="Boolean(part.value)" :active="focused && active === part.index">
            <SNativeMotionGlyph
              :text="part.value ? mask ? '•' : part.value : ' '"
              :size="17"
              :numeric="mode === 'numeric'"
              :color="theme.colors.text"
              horizontalAlignment="center"
              verticalAlignment="middle"
            />
          </slot>
        </GridLayout>
      </GridLayout>
      <TextField
        ref="input"
        :text="code"
        :accessibilityLabel="label"
        :accessibilityHint="hint"
        :editable="!readonly"
        :isEnabled="!disabled"
        :secure="mask"
        :keyboardType="keyboard"
        :autocorrect="false"
        autocapitalizationType="none"
        autofillType="oneTimeCode"
        textAlignment="left"
        direction="ltr"
        color="transparent"
        backgroundColor="transparent"
        borderWidth="0"
        androidElevation="0"
        @focus="begin"
        @blur="end"
        @unloaded="end"
        @textChange="edit"
        @tap="tap"
      />
    </GridLayout>
  </SNativeFocusGroup>
</template>
