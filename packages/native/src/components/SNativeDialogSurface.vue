<script setup lang="ts">
import { Application, GestureStateTypes, isIOS, type GridLayout, type PanGestureEventData, type ShownModallyData } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeGlassView from './SNativeGlassView.vue'
import SNativeText from './SNativeText.vue'
import SNativeToastViewport from './SNativeToastViewport.vue'

const props = defineProps<{
  visible: boolean
  title?: string
  description?: string
  showClose: boolean
  closeLabel: string
  backdropColor?: string
  backdrop?: 'dim' | 'blur'
  maxWidth: number
  dismissOnOutside: boolean
  dismissOnBack: boolean
  swipeToDismiss: boolean
  initialFocus?: NativeRestoreFocus
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
const veil = useTemplateRef<{ nativeView: GridLayout }>('veil')
const panel = useTemplateRef<{ nativeView: GridLayout }>('panel')
const heading = useTemplateRef<{ nativeView: GridLayout }>('heading')
const footer = useTemplateRef<{ nativeView: GridLayout }>('footer')
const close = useTemplateRef<InstanceType<typeof SNativeCloseButton>>('close')
const ready = ref(false)
const entered = ref(false)
const available = ref<number>()
const keyboardTop = ref<number>()
const rtl = computed(() => direction.value === 'rtl')
const windowPadding = computed(() => theme.value.geometry.space4)
const padding = computed(() => theme.value.geometry.space3)
const opacity = computed(() => theme.value.appearance === 'dark' ? 0.52 : 0.36)
let translation = 0
let dragging = false

const platform = globalThis as typeof globalThis & {
  UIKeyboardWillChangeFrameNotification?: string
  UIKeyboardFrameEndUserInfoKey?: string
}
const keyboardEvent = platform.UIKeyboardWillChangeFrameNotification
let observer: unknown

function measure() {
  const view = root.value?.nativeView
  const height = view?.getActualSize()?.height
  if (!view || !height) return
  const offset = view.getLocationInWindow()?.y ?? 0
  available.value = Math.max(0, Math.min(height, (keyboardTop.value ?? Infinity) - offset))
}

function shown(event: ShownModallyData) {
  emit('ready', event.object as GridLayout)
  if (isIOS && keyboardEvent && observer === undefined) {
    observer = Application.ios.addNotificationObserver(keyboardEvent, event => {
      const key = platform.UIKeyboardFrameEndUserInfoKey
      const end = key && event.userInfo?.objectForKey(key)?.CGRectValue
      keyboardTop.value = end ? end.origin.y : undefined
      measure()
    })
  }
  measure()
  ready.value = true
}

const bodyWidth = computed(() => Number.isFinite(props.maxWidth) ? Math.max(160, props.maxWidth) : 360)
const bodyHeight = ref(360)
function measureBody() {
  const window = available.value
  if (!window) return
  const headerSize = heading.value?.nativeView.getActualSize()?.height ?? 0
  const footerSize = footer.value?.nativeView.getActualSize()?.height ?? 0
  const next = Math.max(36, window - headerSize - footerSize
    - (windowPadding.value + padding.value) * 2 - theme.value.geometry.space2)
  if (next !== bodyHeight.value) bodyHeight.value = next
}
watch([available, windowPadding, padding], measureBody)

watch([ready, () => props.visible], ([mounted, visible]) => {
  if (!mounted) return
  entered.value = false
  dragging = false
  const offset = visible ? 0 : Math.max(10, translation + 10)
  runMotion(() => {
    const frames = []
    const background = veil.value?.nativeView
    const content = panel.value?.nativeView
    if (background) frames.push({ target: background, opacity: visible ? opacity.value : 0 })
    if (content) {
      const scale = visible ? 1 : 0.97
      frames.push({
        target: content,
        opacity: visible ? 1 : 0,
        translate: { x: 0, y: offset },
        scale: { x: scale, y: scale },
      })
    }
    return frames
  }, visible ? 'enter' : 'exit', () => {
    if (!visible) {
      emit('left')
      return
    }
    translation = 0
    entered.value = true
    if (props.initialFocus) props.initialFocus()
    else if (close.value) close.value.focus()
    else if (props.title) root.value?.nativeView.accessibilityAnnouncement(props.title)
    emit('entered')
  })
}, { flush: 'post' })

function request(reason: NativeDialogCloseReason) {
  if (props.visible) emit('request', reason)
}

function back(event: { cancel: boolean }) {
  event.cancel = true
  if (props.dismissOnBack) request('back')
}

function pan(event: PanGestureEventData) {
  if (!props.swipeToDismiss || !entered.value || !props.visible) return
  const content = panel.value?.nativeView
  const background = veil.value?.nativeView
  if (!content || !background) return
  if (event.state === GestureStateTypes.began) dragging = true
  if (!dragging) return
  if (event.state === GestureStateTypes.changed) {
    translation = Math.max(0, event.deltaY)
    content.translateY = translation
    background.opacity = opacity.value * (1 - Math.min(0.76, translation / 190))
  }
  if (event.state !== GestureStateTypes.ended && event.state !== GestureStateTypes.cancelled) return
  dragging = false
  if (event.state === GestureStateTypes.ended && translation >= Math.min(88, Math.max(44, content.getActualSize().height * 0.3))) {
    request('swipe')
    return
  }
  translation = 0
  runMotion(() => [
    { target: content, translate: { x: 0, y: 0 } },
    { target: background, opacity: opacity.value },
  ], 'state')
}

onBeforeUnmount(() => {
  if (observer && keyboardEvent) Application.ios.removeNotificationObserver(observer, keyboardEvent)
})
</script>

<template>
  <GridLayout
    ref="root"
    backgroundColor="transparent"
    @shownModally="shown"
    @layoutChanged="measure"
    @activityBackPressed="back"
  >
    <SNativeGlassView
      v-if="backdrop === 'blur'"
      effect="blur"
      :active="ready && visible"
      :radius="0"
      fallbackColor="transparent"
      :isUserInteractionEnabled="false"
      :accessibilityHidden="true"
      iosOverflowSafeArea
    />
    <GridLayout
      ref="veil"
      :backgroundColor="backdropColor ?? '#24251f'"
      :opacity="0"
      :accessibilityHidden="true"
      iosOverflowSafeArea
      @tap="dismissOnOutside && request('outside')"
    />
    <GridLayout :height="available" verticalAlignment="top" :padding="windowPadding" :isPassThroughParentEnabled="true">
      <GridLayout
        ref="panel"
        rows="auto,auto,auto"
        :maxWidth="bodyWidth"
        :padding="padding"
        :borderRadius="theme.geometry.radiusLg" cornerShape="squircle"
        :backgroundColor="theme.colors.surface"
        :opacity="0"
        :scaleX="1.035"
        :scaleY="1.035"
        :translateY="10"
        :isUserInteractionEnabled="visible"
        :accessibilityHidden="!visible"
        horizontalAlignment="stretch"
        verticalAlignment="middle"
      >
        <GridLayout
          v-if="title || showClose || $slots.header"
          ref="heading"
          :columns="showClose ? rtl ? 'auto,*' : '*,auto' : '*'"
          direction="ltr"
          @layoutChanged="measureBody"
        >
          <GridLayout :col="showClose && rtl ? 1 : 0" @pan="pan">
            <slot name="header"><SNativeText v-if="title" :text="title" size="title" heading verticalAlignment="middle" /></slot>
          </GridLayout>
          <SNativeCloseButton
            v-if="showClose"
            ref="close"
            :col="rtl ? 0 : 1"
            :label="closeLabel"
            @tap="request('close-button')"
          />
        </GridLayout>
        <ScrollView
          v-if="description || $slots.default"
          row="1"
          :marginTop="title || showClose || $slots.header ? theme.geometry.space1 : 0"
          :maxHeight="bodyHeight"
        >
          <StackLayout>
            <SNativeDescription v-if="description" :text="description" :marginBottom="$slots.default ? theme.geometry.space2 : 0" />
            <slot />
          </StackLayout>
        </ScrollView>
        <FlexboxLayout
          v-if="$slots.footer"
          ref="footer"
          row="2"
          :marginTop="theme.geometry.space3"
          :flexDirection="rtl ? 'row-reverse' : 'row'"
          :justifyContent="'flex-end'"
          flexWrap="wrap"
          direction="ltr"
          @layoutChanged="measureBody"
        ><slot name="footer" /></FlexboxLayout>
      </GridLayout>
    </GridLayout>
    <SNativeToastViewport :overlay="ready" />
  </GridLayout>
</template>
