<script setup lang="ts">
import { Utils, type GridLayout, type ShownModallyData, type StackLayout } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { morphOrigin, placeMorph, type NativeMorphDirection } from '../action-state'
import { useNativeUI } from '../context'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import { useNativeMotion } from '../motion'
import { placePopover, popoverWidth, type NativePopoverAlign, type NativePopoverSide, type NativePopoverWidth, type OverlayRect } from '../popover-state'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeGlassView from './SNativeGlassView.vue'
import SNativeText from './SNativeText.vue'
import SNativeToastViewport from './SNativeToastViewport.vue'

const props = defineProps<{
  visible: boolean
  anchor: () => OverlayRect | undefined
  placement: NativePopoverSide
  align: NativePopoverAlign
  width: NativePopoverWidth
  offset: number
  alignOffset: number
  inset: number
  maxHeight: number
  avoidCollisions: boolean
  dismissOnOutside: boolean
  dismissOnBack: boolean
  scrollable: boolean
  title?: string
  description?: string
  showClose: boolean
  closeLabel: string
  initialFocus?: NativeRestoreFocus
  backdrop?: 'transparent' | 'dim' | 'blur'
  morphDirection?: NativeMorphDirection
}>()
const emit = defineEmits<{
  ready: [view: GridLayout]
  entered: []
  left: []
  request: [reason: NativeDialogCloseReason]
}>()
const { theme, direction } = useNativeUI()
const runMotion = useNativeMotion()
const root = useTemplateRef<{ nativeView: GridLayout }>('root')
const panel = useTemplateRef<{ nativeView: GridLayout }>('panel')
const body = useTemplateRef<{ nativeView: StackLayout }>('body')
const close = useTemplateRef<InstanceType<typeof SNativeCloseButton>>('close')
const ready = ref(false)
const entered = ref(false)
const bounds = shallowRef<ReturnType<typeof placePopover>>()
const triggerSize = shallowRef<Pick<OverlayRect, 'width' | 'height'>>()
const rtl = computed(() => direction.value === 'rtl')
const origin = computed(() => props.morphDirection ? morphOrigin(props.morphDirection, rtl.value) : {
  x: bounds.value?.side === 'right' ? 0 : bounds.value?.side === 'left' ? 1 : .5,
  y: bounds.value?.side === 'bottom' ? 0 : bounds.value?.side === 'top' ? 1 : .5,
})
let measureJob: ReturnType<typeof setTimeout> | undefined

function update() {
  const host = root.value?.nativeView
  const view = body.value?.nativeView
  const screen = host?.getLocationOnScreen()
  const size = host?.getActualSize()
  if (!screen || !size?.width || !size.height || !view?.isLoaded) return
  const anchor = props.anchor()
  const relative: OverlayRect = anchor ? { ...anchor, x: anchor.x - screen.x, y: anchor.y - screen.y }
    : { x: size.width / 2, y: size.height / 2, width: 0, height: 0 }
  const margin = Math.max(0, Number.isFinite(props.inset) ? props.inset : 12)
  const limit = Math.max(64, size.width - margin * 2)
  const pad = theme.value.geometry.space2 * 2
  const layout = Utils.layout
  const natural = (width: number, mode: number) => {
    view.measure(layout.makeMeasureSpec(layout.toDevicePixels(Math.max(1, width - pad)), mode), layout.makeMeasureSpec(0, layout.UNSPECIFIED))
    return {
      width: layout.toDeviceIndependentPixels(view.getMeasuredWidth()) + pad,
      height: layout.toDeviceIndependentPixels(view.getMeasuredHeight()) + pad,
    }
  }
  const width = popoverWidth(props.width, relative.width, natural(limit, layout.AT_MOST).width, limit)
  const dimensions = natural(width, layout.EXACTLY)
  const options = {
    side: props.placement, align: props.align, inset: margin, avoidCollisions: props.avoidCollisions,
    offset: Number.isFinite(props.offset) ? props.offset : 8,
    alignOffset: Number.isFinite(props.alignOffset) ? props.alignOffset : 0,
    rtl: rtl.value,
  }
  const limitHeight = Number.isFinite(props.maxHeight) ? Math.max(40, props.maxHeight) : 420
  const viewport = { x: 0, y: 0, ...size }
  if (props.morphDirection && anchor) triggerSize.value = { width: relative.width, height: relative.height }
  const at = placePopover(viewport, relative, { width, height: Math.min(dimensions.height, limitHeight) }, options)
  const fitted = props.morphDirection
    ? { ...placeMorph(viewport, relative, { width, height: Math.min(dimensions.height, limitHeight) }, origin.value, margin), side: props.placement }
    : at.width === width ? at : placePopover(viewport, relative, {
    width: at.width, height: Math.min(natural(at.width, layout.EXACTLY).height, limitHeight),
  }, options)
  const previous = bounds.value
  if (previous && Object.keys(fitted).every(key => fitted[key as keyof typeof fitted] === previous[key as keyof typeof fitted])) return
  bounds.value = fitted
}

function schedule() {
  if (!ready.value || !props.visible || measureJob !== undefined) return
  measureJob = setTimeout(() => {
    measureJob = undefined
    update()
  }, 0)
}

function handleShown(event: ShownModallyData) {
  emit('ready', event.object as GridLayout)
  ready.value = true
  schedule()
}

watch(() => [props.placement, props.align, props.width, props.offset, props.alignOffset, props.inset, props.maxHeight, props.avoidCollisions, props.morphDirection, rtl.value], schedule)
watch(() => props.visible, schedule)
watch([ready, () => props.visible, () => Boolean(bounds.value)], ([active, visible, positioned]) => {
  if (!active || visible && !positioned) return
  entered.value = false
  const fitted = bounds.value
  const anchor = triggerSize.value
  const morph = props.morphDirection && fitted && anchor
  const collapsed = morph ? { x: Math.min(1, anchor.width / fitted.width), y: Math.min(1, anchor.height / fitted.height) }
    : { x: .965, y: .965 }
  const view = panel.value?.nativeView
  if (morph && view && visible) {
    view.scaleX = collapsed.x
    view.scaleY = collapsed.y
  }
  runMotion(() => {
    const target = panel.value?.nativeView
    return target ? [{ target, opacity: visible ? 1 : 0, scale: visible ? { x: 1, y: 1 } : collapsed }] : []
  }, visible ? 'enter' : 'exit', () => {
    if (!visible) return emit('left')
    entered.value = true
    if (props.initialFocus) props.initialFocus()
    else if (close.value) close.value.focus()
    else if (props.title) root.value?.nativeView.accessibilityAnnouncement(props.title)
    emit('entered')
  })
}, { flush: 'post' })

function back(event: { cancel: boolean }) {
  event.cancel = true
  if (props.dismissOnBack && props.visible) emit('request', 'back')
}

onBeforeUnmount(() => { if (measureJob !== undefined) clearTimeout(measureJob) })
</script>

<template>
  <GridLayout ref="root" backgroundColor="transparent" @shownModally="handleShown" @layoutChanged="schedule" @activityBackPressed="back">
    <SNativeGlassView v-if="backdrop === 'blur'" effect="blur" :active="ready && visible" :radius="0"
      fallbackColor="transparent" :isUserInteractionEnabled="false" :accessibilityHidden="true" iosOverflowSafeArea />
    <GridLayout :accessibilityHidden="true" :backgroundColor="backdrop && backdrop !== 'transparent' ? '#4024251f' : 'transparent'"
      :iosOverflowSafeArea="Boolean(backdrop && backdrop !== 'transparent')" @tap="dismissOnOutside && visible && emit('request', 'outside')" />
    <AbsoluteLayout :isPassThroughParentEnabled="true" direction="ltr">
      <GridLayout
        ref="panel"
        :width="bounds?.width"
        :height="bounds?.height"
        :translateX="bounds?.x ?? 0"
        :translateY="bounds?.y ?? 0"
        :originX="origin.x"
        :originY="origin.y"
        :borderRadius="theme.geometry.radiusMd" cornerShape="squircle"
        :backgroundColor="theme.colors.surface"
        :padding="theme.geometry.space2"
        :opacity="0"
        :scaleX="0.965"
        :scaleY="0.965"
        :isUserInteractionEnabled="visible && entered"
        :accessibilityHidden="!visible || !entered"
        :clipToBounds="true"
      >
        <component :is="scrollable ? 'ScrollView' : 'ContentView'">
          <StackLayout ref="body" @loaded="schedule" @layoutChanged="schedule">
            <GridLayout
              v-if="title || description || showClose || $slots.header"
              :columns="showClose ? rtl ? 'auto,*' : '*,auto' : '*'"
              :marginBottom="theme.geometry.space1"
              direction="ltr"
            >
              <StackLayout :col="showClose && rtl ? 1 : 0" :padding="theme.geometry.space1" verticalAlignment="middle">
                <slot name="header">
                  <SNativeText v-if="title" :text="title" heading />
                  <SNativeDescription v-if="description" :text="description" marginTop="2" />
                </slot>
              </StackLayout>
              <SNativeCloseButton v-if="showClose" ref="close" :col="rtl ? 0 : 1" :label="closeLabel" @tap="emit('request', 'close-button')" />
            </GridLayout>
            <slot />
            <slot name="footer" />
          </StackLayout>
        </component>
      </GridLayout>
    </AbsoluteLayout>
    <SNativeToastViewport :overlay="ready" />
  </GridLayout>
</template>
