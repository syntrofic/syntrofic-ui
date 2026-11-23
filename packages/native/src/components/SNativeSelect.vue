<script setup lang="ts">
import type { View } from '@nativescript/core'
import { computed, nextTick, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import type { NativeMenuItem, NativeMenuSection, NativeSelectValue } from '../menu-state'
import type { NativeDialogCloseReason } from '../modal'
import { useNativeMotion } from '../motion'
import type { NativePopoverOptions, NativePopoverPresentation } from '../popover-state'
import type { NativeSheetDetent } from '../sheet-state'
import SNativeButton from './SNativeButton.vue'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeMenu from './SNativeMenu.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = withDefaults(defineProps<{
  label: string
  placeholder?: string
  description?: string
  items?: readonly NativeMenuItem[]
  sections?: readonly NativeMenuSection[]
  multiple?: boolean
  clearable?: boolean
  clearLabel?: string
  doneLabel?: string
  emptyText?: string
  required?: boolean
  requiredLabel?: string
  disabled?: boolean
  presentation?: NativePopoverPresentation
  detents?: readonly NativeSheetDetent[]
  overlay?: NativePopoverOptions
  formatValue?: (items: readonly NativeMenuItem[]) => string
}>(), { placeholder: 'Select an option', clearLabel: 'Clear selection', presentation: 'popover' })
const emit = defineEmits<{
  change: [value: NativeSelectValue]
  clear: []
  opened: []
  closed: [reason: NativeDialogCloseReason]
  error: [error: unknown]
}>()
const value = defineModel<NativeSelectValue>({ default: null })
const open = defineModel<boolean>('open', { default: false })
const menu = useTemplateRef<InstanceType<typeof SNativeMenu>>('menu')
const trigger = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('trigger')
const clearView = useTemplateRef<{ nativeView: View }>('clearView')
const { theme, direction } = useNativeUI()
const motion = useNativeMotion()
const rtl = computed(() => direction.value === 'rtl')
const selected = computed<NativeCollectionKey[]>({
  get: () => Array.isArray(value.value) ? value.value : value.value === null ? [] : [value.value],
  set: next => {
    const selection = props.multiple ? next : next[0] ?? null
    value.value = selection
    emit('change', selection)
  },
})
const options = computed(() => props.sections?.length ? props.sections.flatMap(group => group.items) : props.items ?? [])
const picked = computed(() => selected.value.flatMap(key => {
  const option = options.value.find(item => Object.is(item.id, key))
  return option ? [option] : []
}))
const formatted = computed(() => {
  if (!picked.value.length) return props.placeholder
  if (props.formatValue) return props.formatValue(picked.value)
  const [first, ...more] = picked.value
  return more.length ? `${first.label} +${more.length}` : first.label
})
const showClear = computed(() => props.clearable && !props.disabled && selected.value.length > 0)
const initialOpacity = showClear.value ? 1 : 0
const initialScale = showClear.value ? 1 : 0.86

watch(showClear, visible => {
  motion(() => {
    const target = clearView.value?.nativeView
    const scale = visible ? 1 : 0.86
    return target ? [{ target, opacity: visible ? 1 : 0, scale: { x: scale, y: scale } }] : []
  }, visible ? 'enter' : 'exit')
})

function clear() {
  if (!showClear.value) return
  selected.value = []
  emit('clear')
  void nextTick(() => trigger.value?.focus())
}

defineExpose({ focus: () => trigger.value?.focus(), show: () => menu.value?.show(() => trigger.value?.focus()), clear })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" :required="required" :requiredLabel="requiredLabel" marginBottom="4" />
    <SNativeMenu
      ref="menu"
      v-model:open="open"
      v-model:selected="selected"
      :label="label"
      :title="label"
      :items="items"
      :sections="sections"
      :selectionMode="multiple ? 'multiple' : 'single'"
      :disallowEmptySelection="required"
      :closeOnSelect="!multiple"
      :emptyText="emptyText"
      :disabled="disabled"
      :presentation="presentation"
      :detents="detents"
      :overlay="overlay"
      width="trigger"
      stretchTrigger
      @opened="emit('opened')"
      @closed="emit('closed', $event)"
      @error="emit('error', $event)"
    >
      <template #trigger="{ open: show, visible, navigate }">
        <GridLayout :columns="clearable ? rtl ? 'auto,*' : '*,auto' : '*'" direction="ltr" :backgroundColor="theme.colors.surfaceMuted" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle">
          <SNativePressableFeedback
            ref="trigger"
            :col="clearable && rtl ? 1 : 0"
            :label="label"
            :accessibilityHint="description"
            :accessibilityValue="formatted"
            :pressed="visible"
            :disabled="disabled"
            :navigate="key => ['first', 'last', 'previous', 'next'].includes(key) ? (show(() => trigger?.focus()), true) : navigate(key)"
            :fill="theme.colors.surfaceMuted"
            :pressFill="theme.colors.accentSoft"
            @tap="show(() => trigger?.focus())"
          >
            <GridLayout :clipToBounds="true" verticalAlignment="middle">
              <slot name="value" :items="picked" :text="formatted">
                <SNativeMotionText :value="formatted" :color="picked.length ? theme.colors.text : theme.colors.textMuted" />
              </slot>
            </GridLayout>
          </SNativePressableFeedback>
          <GridLayout
            v-if="clearable"
            ref="clearView"
            :col="rtl ? 0 : 1"
            :opacity="initialOpacity"
            :scaleX="initialScale"
            :scaleY="initialScale"
            :accessibilityHidden="!showClear"
            :isUserInteractionEnabled="showClear"
          >
            <SNativeCloseButton :label="clearLabel" :disabled="!showClear" @tap="clear" />
          </GridLayout>
        </GridLayout>
      </template>
      <template v-if="$slots.item" #item="state"><slot name="item" v-bind="state" /></template>
      <template v-if="multiple && doneLabel" #footer="{ close }">
        <SNativeButton :label="doneLabel" size="sm" marginTop="4" @tap="close('confirm')" />
      </template>
    </SNativeMenu>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
  </StackLayout>
</template>
