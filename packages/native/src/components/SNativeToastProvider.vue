<script setup lang="ts">
import { Application } from '@nativescript/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'nativescript-vue'
import { createNativeToastQueue, type NativeToastPlacement, type NativeToastView } from '../toast-queue'
import { provideNativeToast } from '../toast'
import SNativeToastViewport from './SNativeToastViewport.vue'

const props = withDefaults(defineProps<{
  maxVisible?: number
  duration?: number
  placement?: NativeToastPlacement
  closeLabel?: string
  inset?: number
}>(), { maxVisible: 3, duration: 4000, placement: 'bottom', closeLabel: 'Dismiss notification', inset: 12 })
const emit = defineEmits<{ error: [error: unknown] }>()
const items = shallowRef<NativeToastView[]>([])
const queue = createNativeToastQueue(value => { items.value = value }, () => ({
  maxVisible: props.maxVisible, duration: props.duration,
}))
const toast = { show: queue.show, hide: queue.hide }
const isToastVisible = computed(() => items.value.some(item => item.phase === 'visible'))
const groups = computed(() => ({
  top: items.value.filter(item => (item.options.placement ?? props.placement) === 'top'),
  bottom: items.value.filter(item => (item.options.placement ?? props.placement) === 'bottom'),
}))
const layers = shallowRef<symbol[]>([])
const overlay = computed(() => layers.value.at(-1))
provideNativeToast({
  toast, isToastVisible, groups, overlay, settings: props,
  activate(key) {
    layers.value = [...layers.value, key]
    return () => { layers.value = layers.value.filter(layer => layer !== key) }
  },
  entered: queue.entered,
  exited: queue.exited,
  pause: queue.pause,
  error: error => emit('error', error),
})

function suspend() { queue.pauseAll('application', true) }
function resume() { queue.pauseAll('application', false) }

watch(() => props.maxVisible, queue.update)
onMounted(() => {
  Application.on('suspend', suspend)
  Application.on('resume', resume)
})
onBeforeUnmount(() => {
  Application.off('suspend', suspend)
  Application.off('resume', resume)
  queue.dispose()
})
defineExpose({ toast, isToastVisible })
</script>

<template>
  <GridLayout>
    <slot :toast="toast" :isToastVisible="isToastVisible" />
    <SNativeToastViewport root />
  </GridLayout>
</template>
