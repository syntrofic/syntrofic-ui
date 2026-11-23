<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import { onBeforeUnmount, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'

const props = defineProps<{ delay: number }>()
const { reducedMotion } = useNativeUI()
const item = useTemplateRef<{ nativeView: GridLayout }>('item')
const run = useNativeMotion()
const animated = props.delay > 0 && !reducedMotion.value
let task: ReturnType<typeof setTimeout> | undefined

function loaded() {
  if (!animated) return
  clearTimeout(task)
  task = setTimeout(() => run(() => {
    const target = item.value?.nativeView
    return target ? [{ target, opacity: 1, translate: { x: 0, y: 0 } }] : []
  }, 'enter'), props.delay)
}
onBeforeUnmount(() => clearTimeout(task))
</script>

<template>
  <GridLayout ref="item" :opacity="animated ? 0 : 1" :translateY="animated ? 4 : 0" @loaded="loaded">
    <slot />
  </GridLayout>
</template>
