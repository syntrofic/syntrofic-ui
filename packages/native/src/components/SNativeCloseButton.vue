<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from '../context'
import { centerNativeText } from '../text-alignment'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), { label: 'Close' })
const emit = defineEmits<{ tap: []; 'accessibility-focus-change': [focused: boolean] }>()
const { theme, fontFamily } = useNativeUI()
const control = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('control')
defineExpose({ focus: () => control.value?.focus() ?? false })
</script>

<template>
  <SNativePressableFeedback
    ref="control"
    :label="label"
    :disabled="disabled"
    fill="transparent"
    :paddingInline="5"
    horizontalAlignment="left"
    @tap="emit('tap')"
    @accessibility-focus-change="emit('accessibility-focus-change', $event)"
  >
    <Label text="×" fontSize="24" :style="nativeTextStyle('×', fontFamily)" :color="theme.colors.text"
      textAlignment="center" verticalAlignment="middle" @loaded="centerNativeText" />
  </SNativePressableFeedback>
</template>
