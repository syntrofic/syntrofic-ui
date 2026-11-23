<script setup lang="ts">
import { AccessibilityLiveRegion, type GridLayout } from '@nativescript/core'
import { ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeMotion } from '../motion'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{ text?: string; announce?: boolean }>(), { announce: true })
const visibleText = ref(props.text ?? '')
const initialOpacity = props.text ? 1 : 0
const error = useTemplateRef<{ nativeView: GridLayout }>('error')
const runMotion = useNativeMotion()

watch(() => props.text, text => {
  runMotion(() => {
    const view = error.value?.nativeView
    if (!text) return view ? [{ target: view, opacity: 0, translate: { x: 0, y: -4 } }] : []
    const appearing = !visibleText.value
    visibleText.value = text
    if (!view) return []
    if (appearing) {
      view.translateY = -4
      view.opacity = 0
    }
    return [{ target: view, opacity: 1, translate: { x: 0, y: 0 } }]
  }, text ? 'enter' : 'exit', () => {
    if (!text) visibleText.value = ''
  })
}, { flush: 'post' })
</script>

<template>
  <GridLayout ref="error" :opacity="initialOpacity" :accessibilityHidden="!text">
    <SNativeText
      :text="visibleText"
      size="caption"
      tone="danger"
      :accessibilityLiveRegion="announce && text ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
    />
  </GridLayout>
</template>
