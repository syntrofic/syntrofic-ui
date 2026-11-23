<script setup lang="ts">
import { AccessibilityState, Color, type GridLayout } from '@nativescript/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  selectable?: boolean
  selected?: boolean
  removable?: boolean
  disabled?: boolean
  removeLabel?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'soft' | 'outline'
}>(), { size: 'md', variant: 'soft' })
const emit = defineEmits<{ select: []; 'remove-start': []; remove: [] }>()
const { theme, direction } = useNativeUI()
const runMotion = useNativeMotion()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const pressable = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('pressable')
const button = useTemplateRef<InstanceType<typeof SNativeCloseButton>>('button')
const removing = ref(false)
const rtl = computed(() => direction.value === 'rtl')
const fill = computed(() => props.selected ? theme.value.colors.accentSoft
  : props.variant === 'soft' ? theme.value.colors.surfaceMuted : 'transparent')
const initialFill = fill.value
const horizontalPadding = computed(() => props.size === 'sm' ? 7 : props.size === 'lg' ? 13 : 9)

watch(fill, color => {
  if (removing.value) return
  runMotion(() => host.value ? [{ target: host.value.nativeView, backgroundColor: new Color(color) }] : [], 'state')
})

function remove() {
  if (props.disabled || removing.value) return
  removing.value = true
  emit('remove-start')
  const root = host.value?.nativeView
  const width = root?.getActualSize()?.width
  function finish() {
    emit('remove')
    void nextTick(() => {
      if (root && host.value?.nativeView === root) {
        root.width = 'auto'
        root.opacity = 1
        root.translateX = 0
      }
      removing.value = false
    })
  }
  if (!root || !width) return finish()
  root.width = width
  runMotion(() => [{ target: root, width: 0, translate: { x: rtl.value ? 8 : -8, y: 0 }, opacity: 0 }], 'exit', finish)
}

defineExpose({ focus: () => pressable.value?.focus() || button.value?.focus() || false })
</script>

<template>
  <GridLayout
    ref="host"
    :columns="removable ? 'auto,auto' : 'auto'"
    direction="ltr"
    :clipToBounds="true"
    :accessibilityHidden="removing"
    :isUserInteractionEnabled="!removing"
    :backgroundColor="initialFill"
    :borderRadius="99"
    :borderWidth="variant === 'outline' ? 1 : 0"
    :borderColor="selected ? theme.colors.accent : theme.colors.border"
  >
    <SNativePressableFeedback
      v-if="selectable"
      ref="pressable"
      :col="removable && rtl ? 1 : 0"
      :label="label"
      :accessibilityState="selected ? AccessibilityState.Selected : undefined"
      :disabled="disabled || removing"
      :paddingInline="horizontalPadding"
      :radius="99"
      fill="transparent"
      @tap="emit('select')"
    >
      <slot :selected="selected">
        <SNativeText :text="label" :size="size === 'sm' ? 'caption' : 'body'" :tone="selected ? 'accent' : 'default'" verticalAlignment="middle" />
      </slot>
    </SNativePressableFeedback>
    <StackLayout
      v-else
      :col="removable && rtl ? 1 : 0"
      :paddingLeft="horizontalPadding"
      :paddingRight="horizontalPadding"
      verticalAlignment="middle"
    >
      <slot :selected="selected"><SNativeText :text="label" :size="size === 'sm' ? 'caption' : 'body'" /></slot>
    </StackLayout>
    <SNativeCloseButton
      v-if="removable"
      ref="button"
      :col="rtl ? 0 : 1"
      :label="removeLabel ?? `Remove ${label}`"
      :disabled="disabled || removing"
      @tap="remove"
    />
  </GridLayout>
</template>
