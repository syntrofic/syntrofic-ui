<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import SNativeIcon from './SNativeIcon.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), { label: 'Close' })
const emit = defineEmits<{ tap: []; 'accessibility-focus-change': [focused: boolean] }>()
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
    <SNativeIcon name="close" :size="20" verticalAlignment="middle" />
  </SNativePressableFeedback>
</template>
