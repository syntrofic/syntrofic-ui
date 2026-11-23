<script setup lang="ts">
import { Utils, type GridLayout, type StackLayout } from '@nativescript/core'
import { nextTick, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeMotion } from '../motion'

const props = withDefaults(defineProps<{
  open?: boolean
  transitionKey?: string | number
}>(), { open: true })
const root = useTemplateRef<{ nativeView: GridLayout }>('root')
const body = useTemplateRef<{ nativeView: StackLayout }>('body')
const runMotion = useNativeMotion()
const initialHeight = props.open ? 'auto' : 0
const layout = Utils.layout

function loaded() {
  const host = root.value?.nativeView
  if (host) host.height = props.open ? 'auto' : 0
}

function sync() {
  const host = root.value?.nativeView
  if (!host?.isLoaded) return
  const current = host.getActualSize()
  if (!current?.width) {
    loaded()
    return
  }
  host.height = Math.max(0, current.height)
  void nextTick(() => {
    const panel = body.value?.nativeView
    const open = props.open
    runMotion(() => {
      if (!host.isLoaded || !panel?.isLoaded) return []
      if (!open) return [{ target: host, height: 0 }]
      panel.measure(
        layout.makeMeasureSpec(layout.toDevicePixels(current.width), layout.EXACTLY),
        layout.makeMeasureSpec(0, layout.UNSPECIFIED),
      )
      const height = Math.max(0, layout.toDeviceIndependentPixels(panel.getMeasuredHeight()))
      panel.translateY = -4
      return [
        { target: host, height },
        { target: panel, translate: { x: 0, y: 0 } },
      ]
    }, open ? 'enter' : 'exit', () => {
      host.height = props.open ? 'auto' : 0
      if (panel) panel.translateY = 0
    })
  })
}
watch([() => props.open, () => props.transitionKey], sync, { flush: 'pre' })
</script>

<template>
  <GridLayout
    ref="root"
    :height="initialHeight"
    :clipToBounds="true"
    :isUserInteractionEnabled="open"
    :accessibilityHidden="!open"
    @loaded="loaded"
  >
    <StackLayout ref="body" verticalAlignment="top">
      <slot />
    </StackLayout>
  </GridLayout>
</template>
