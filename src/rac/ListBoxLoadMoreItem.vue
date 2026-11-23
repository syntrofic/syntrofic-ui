<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watchPostEffect } from 'vue'
import SButton from '../components/SButton.vue'

const props = withDefaults(defineProps<{
  loadMore: (signal: AbortSignal) => Promise<unknown> | unknown
  hasMore?: boolean
  disabled?: boolean
  auto?: boolean
  scrollContainer?: HTMLElement | null
  label?: string
}>(), { hasMore: true, label: 'Load more' })
const emit = defineEmits<{ error: [error: unknown]; loaded: [] }>()
const sentinel = useTemplateRef<HTMLDivElement>('sentinel')
const pending = ref(false)
let current: AbortController | undefined

async function load() {
  if (!props.hasMore || props.disabled || pending.value) return
  const controller = new AbortController()
  current = controller
  pending.value = true
  try {
    await props.loadMore(controller.signal)
    if (!controller.signal.aborted) emit('loaded')
  } catch (error) {
    if (!controller.signal.aborted) emit('error', error)
  } finally {
    if (current === controller) {
      current = undefined
      pending.value = false
    }
  }
}

watchPostEffect(cleanup => {
  const node = sentinel.value
  if (!props.auto || !props.hasMore || props.disabled || !node || typeof IntersectionObserver !== 'function') return
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) void load()
  }, { root: props.scrollContainer, rootMargin: '0px 0px 48px 0px' })
  observer.observe(node)
  cleanup(() => observer.disconnect())
})
onBeforeUnmount(() => { current?.abort(); current = undefined })
</script>

<template>
  <div v-if="hasMore" ref="sentinel">
    <slot :pending="pending" :load="load">
      <SButton type="button" size="sm" variant="secondary" :disabled="disabled" :loading="pending" @click="load">{{ label }}</SButton>
    </slot>
  </div>
</template>
