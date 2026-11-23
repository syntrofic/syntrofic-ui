<script setup lang="ts">
import { Utils, type GridLayout, type StackLayout } from '@nativescript/core'
import { useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import type { SheetSize } from '../sheet-platform'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeText from './SNativeText.vue'
import SNativeToastViewport from './SNativeToastViewport.vue'

const props = defineProps<{
  title?: string
  description?: string
  showClose: boolean
  closeLabel: string
  inset: number
  shown: boolean
  height?: number
  scrollable: boolean
  initialFocus?: () => unknown
}>()
const emit = defineEmits<{ ready: []; close: []; measure: [size: SheetSize] }>()
const { theme, direction } = useNativeUI()
const root = useTemplateRef<{ nativeView: GridLayout }>('root')
const header = useTemplateRef<{ nativeView: StackLayout }>('header')
const body = useTemplateRef<{ nativeView: StackLayout }>('body')
const footer = useTemplateRef<{ nativeView: StackLayout }>('footer')
const close = useTemplateRef<InstanceType<typeof SNativeCloseButton>>('close')
let lastWidth = 0

function measure() {
  const rootSize = root.value?.nativeView.getActualSize()
  if (!rootSize?.width) return
  const width = Math.max(1, rootSize.width - theme.value.geometry.space3 * 2)
  const head = header.value?.nativeView.getActualSize()?.height ?? 0
  const tail = footer.value?.nativeView.getActualSize()?.height ?? 0
  const content = body.value?.nativeView
  let bodyHeight = content?.getActualSize()?.height ?? 0
  if (content && (!bodyHeight || lastWidth !== width)) {
    const layout = Utils.layout
    content.measure(
      layout.makeMeasureSpec(layout.toDevicePixels(width), layout.EXACTLY),
      layout.makeMeasureSpec(0, layout.UNSPECIFIED),
    )
    bodyHeight = layout.toDeviceIndependentPixels(content.getMeasuredHeight())
  }
  lastWidth = width
  emit('measure', { chrome: Math.ceil(head + tail + props.inset + theme.value.geometry.space3), body: Math.ceil(bodyHeight) })
}

function handleShown() {
  measure()
  emit('ready')
}

watch(() => props.shown, shown => {
  if (!shown) return
  if (props.initialFocus) props.initialFocus()
  else if (close.value) close.value.focus()
  else if (props.title) root.value?.nativeView.accessibilityAnnouncement(props.title)
}, { flush: 'post' })
</script>

<template>
  <GridLayout ref="root" @shownInBottomSheet="handleShown" @layoutChanged="measure">
    <GridLayout
      rows="auto,*,auto"
      :height="height"
      :verticalAlignment="height === undefined ? 'stretch' : 'top'"
      :paddingLeft="theme.geometry.space3"
      :paddingRight="theme.geometry.space3"
      :paddingTop="theme.geometry.space3"
      :paddingBottom="inset"
    >
      <StackLayout ref="header" :paddingBottom="theme.geometry.space2" @layoutChanged="measure">
        <GridLayout :columns="showClose ? direction === 'rtl' ? 'auto,*' : '*,auto' : '*'" direction="ltr">
          <StackLayout :col="showClose && direction === 'rtl' ? 1 : 0" verticalAlignment="middle">
            <slot name="header">
              <SNativeText v-if="title" :text="title" size="title" heading />
              <SNativeDescription v-if="description" :text="description" marginTop="2" />
            </slot>
          </StackLayout>
          <SNativeCloseButton
            v-if="showClose"
            ref="close"
            :label="closeLabel"
            :col="direction === 'rtl' ? 0 : 1"
            @tap="emit('close')"
          />
        </GridLayout>
      </StackLayout>
      <component :is="scrollable ? 'ScrollView' : 'ContentView'" id="syntrofic-sheet-body" row="1">
        <StackLayout ref="body" @layoutChanged="measure"><slot /></StackLayout>
      </component>
      <StackLayout v-if="$slots.footer" ref="footer" row="2" :paddingTop="theme.geometry.space2" @layoutChanged="measure">
        <slot name="footer" />
      </StackLayout>
    </GridLayout>
    <SNativeToastViewport :overlay="shown" />
  </GridLayout>
</template>
