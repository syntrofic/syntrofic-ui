<script setup lang="ts">
import { AccessibilityLiveRegion, GestureStateTypes, type GridLayout, type PanGestureEventData, type TouchGestureEventData } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import type { NativeToastControls, NativeToastEntryControls, NativeToastPlacement, NativeToastView } from '../toast-queue'
import SNativeButton from './SNativeButton.vue'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeText from './SNativeText.vue'

const props = defineProps<{
  item: NativeToastView
  controls: NativeToastControls
  placement: NativeToastPlacement
  closeLabel: string
}>()
const emit = defineEmits<{ entered: []; exited: []; pause: [key: string, paused: boolean]; error: [error: unknown] }>()
const { theme, direction, reducedMotion } = useNativeUI()
const runMotion = useNativeMotion()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const card = useTemplateRef<{ nativeView: GridLayout }>('card')
const loaded = ref(false)
const active = ref(false)
const running = ref(false)
const options = computed(() => props.item.options)
const rtl = computed(() => direction.value === 'rtl')
const sign = computed(() => props.placement === 'top' ? -1 : 1)
const constrained = computed(() => reducedMotion.value || options.value.animation === false)
const fill = computed(() => {
  const tone = options.value.tone ?? 'neutral'
  return tone === 'neutral' ? theme.value.colors.surfaceMuted : theme.value.colors[`${tone}Soft`]
})
const controls: NativeToastEntryControls = { ...props.controls, id: props.item.id, dismiss: () => props.controls.hide(props.item.id) }
const Custom = () => options.value.render?.(controls)
let offset = 0

watch([loaded, () => props.item.phase], ([mounted, phase]) => {
  if (!mounted) return
  const root = host.value?.nativeView
  const content = card.value?.nativeView
  if (!root || !content) return
  if (phase === 'visible') {
    if (constrained.value) {
      content.opacity = 1
      content.translateY = 0
      active.value = true
      emit('entered')
      return
    }
    content.translateY = sign.value * 14
    runMotion(() => [{ target: content, opacity: 1, translate: { x: 0, y: 0 } }], 'enter', () => {
      active.value = true
      emit('entered')
    })
    return
  }
  active.value = false
  if (constrained.value) {
    emit('exited')
    return
  }
  root.height = root.getActualSize()?.height ?? 0
  runMotion(() => [
    { target: root, height: 0 },
    { target: content, opacity: 0, translate: { x: 0, y: offset + sign.value * 18 } },
  ], 'exit', () => emit('exited'))
}, { flush: 'post' })

function touch(event: TouchGestureEventData) {
  if (event.action === 'down') emit('pause', 'touch', true)
  else if (event.action === 'up' || event.action === 'cancel') emit('pause', 'touch', false)
}

function pan(event: PanGestureEventData) {
  const content = card.value?.nativeView
  if (!active.value || options.value.swipeable === false || !content) return
  if (event.state === GestureStateTypes.began) emit('pause', 'swipe', true)
  if (event.state === GestureStateTypes.changed) {
    const outward = sign.value * event.deltaY
    offset = sign.value * (outward < 0 ? outward * 0.2 : outward)
    if (!constrained.value) content.translateY = offset
  }
  if (event.state !== GestureStateTypes.ended && event.state !== GestureStateTypes.cancelled) return
  emit('pause', 'swipe', false)
  if (event.state === GestureStateTypes.ended && sign.value * offset > 36) {
    controls.dismiss()
    return
  }
  offset = 0
  runMotion(() => [{ target: content, translate: { x: 0, y: 0 } }], 'state')
}

async function action() {
  if (running.value || props.item.phase !== 'visible') return
  if (!options.value.onAction) {
    controls.dismiss()
    return
  }
  running.value = true
  emit('pause', 'action', true)
  try {
    await options.value.onAction(controls)
  } catch (error) {
    emit('error', error)
  } finally {
    running.value = false
    emit('pause', 'action', false)
  }
}

onBeforeUnmount(() => {
  for (const key of ['touch', 'swipe', 'message-focus', 'description-focus', 'action-focus', 'close-focus'])
    emit('pause', key, false)
})
</script>

<template>
  <GridLayout ref="host" :clipToBounds="true" :paddingTop="theme.geometry.space1" @loaded="loaded = true" @unloaded="loaded = false">
    <GridLayout
      ref="card"
      :columns="options.render ? '*' : rtl ? 'auto,auto,*' : '*,auto,auto'"
      :borderRadius="theme.geometry.radiusMd" cornerShape="squircle"
      :backgroundColor="fill"
      :opacity="0"
      :padding="theme.geometry.space2"
      :isUserInteractionEnabled="active"
      :accessibilityHidden="!active"
      direction="ltr"
    >
      <component :is="Custom" v-if="options.render" />
      <template v-else>
        <StackLayout :col="rtl ? 2 : 0" verticalAlignment="middle" @touch="touch" @pan="pan">
          <SNativeText
            v-if="options.label"
            :text="options.label"
            :accessibilityLiveRegion="options.tone === 'danger' ? AccessibilityLiveRegion.Assertive : AccessibilityLiveRegion.Polite"
            emphasized
            @accessibilityFocusChanged="emit('pause', 'message-focus', $event.value === true)"
          />
          <SNativeDescription v-if="options.description" :text="options.description" marginTop="2"
            @accessibilityFocusChanged="emit('pause', 'description-focus', $event.value === true)" />
        </StackLayout>
        <SNativeButton
          v-if="options.actionLabel"
          col="1"
          :label="options.actionLabel"
          size="sm"
          variant="ghost"
          :loading="running"
          verticalAlignment="middle"
          @tap="action"
          @accessibility-focus-change="emit('pause', 'action-focus', $event)"
        />
        <SNativeCloseButton
          v-if="options.dismissible !== false"
          :col="rtl ? 0 : 2"
          :label="closeLabel"
          verticalAlignment="middle"
          @tap="controls.dismiss"
          @accessibility-focus-change="emit('pause', 'close-focus', $event)"
        />
      </template>
    </GridLayout>
  </GridLayout>
</template>
