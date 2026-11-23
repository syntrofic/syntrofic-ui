<script setup lang="ts">
import type { GridLayout, View } from '@nativescript/core'
import { onBeforeUnmount, provide, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeFocusGroup } from '../focus'
import { useNativeMotion } from '../motion'

const root = useTemplateRef<{ nativeView: GridLayout }>('root')
const ring = useTemplateRef<{ nativeView: View }>('ring')
const { theme } = useNativeUI()
const props = withDefaults(defineProps<{ inset?: number; radius?: number }>(), { inset: 2 })
const runMotion = useNativeMotion()
let target: View | undefined
let settle: ReturnType<typeof setTimeout> | undefined
let last = ''
let visible = false

function measure() {
  const outline = ring.value?.nativeView
  const host = root.value?.nativeView
  if (!target || !outline || !host) return
  const point = target.getLocationRelativeTo(host)
  const size = target.getActualSize()
  if (!point || !size?.width || !size.height) return
  const inset = props.inset
  const bounds = { x: point.x - inset, y: point.y - inset, width: size.width + inset * 2, height: size.height + inset * 2 }
  const key = Object.values(bounds).join('/')
  if (key === last) return
  last = key
  const entering = !visible
  runMotion(() => {
    if (entering) {
      outline.width = bounds.width
      outline.height = bounds.height
      outline.translateX = bounds.x
      outline.translateY = bounds.y
      outline.scaleX = outline.scaleY = 1.055
      visible = true
    }
    return [{
      target: outline,
      width: bounds.width,
      height: bounds.height,
      translate: { x: bounds.x, y: bounds.y },
      scale: { x: 1, y: 1 },
      opacity: 1,
    }]
  }, entering ? 'enter' : 'state')
}

function clearTimer() {
  if (settle !== undefined) clearTimeout(settle)
  settle = undefined
}

const focusScope = {
  focus(view: View) {
    if (target === view && settle === undefined) {
      measure()
      return
    }
    clearTimer()
    target?.off('layoutChanged', measure)
    target = view
    view.on('layoutChanged', measure)
    measure()
  },
  blur(view: View) {
    if (target !== view) return
    clearTimer()
    settle = setTimeout(() => {
      settle = undefined
      view.off('layoutChanged', measure)
      target = undefined
      last = ''
      const outline = ring.value?.nativeView
      if (outline) {
        runMotion(() => [{ target: outline, opacity: 0, scale: { x: 1.055, y: 1.055 } }], 'exit', () => {
          visible = false
        })
      }
    }, 0)
  },
}
provide(nativeFocusGroup, focusScope)
defineExpose(focusScope)

onBeforeUnmount(() => {
  clearTimer()
  target?.off('layoutChanged', measure)
  target = undefined
})
</script>

<template>
  <GridLayout ref="root" @layoutChanged="measure">
    <StackLayout><slot /></StackLayout>
    <AbsoluteLayout :isUserInteractionEnabled="false" :accessibilityHidden="true">
      <ContentView
        ref="ring"
        :borderColor="theme.colors.focus"
        :borderRadius="radius ?? theme.geometry.radiusMd + inset"
        :borderWidth="2"
        :opacity="0"
        :width="0"
        :height="0"
      />
    </AbsoluteLayout>
  </GridLayout>
</template>
