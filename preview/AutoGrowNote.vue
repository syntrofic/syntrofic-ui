<script setup lang="ts">
import { onMounted, shallowRef, watchPostEffect } from 'vue'
import { createAnimator, useMergedRefs } from '../src'

const props = defineProps<{ forward: (element: HTMLTextAreaElement | null) => void }>()
const value = defineModel<string>({ default: '' })
const own = shallowRef<HTMLTextAreaElement | null>(null)
const attach = useMergedRefs(own, element => props.forward(element))
let animator: ReturnType<typeof createAnimator> | undefined
function fit(element: HTMLTextAreaElement, transition: boolean) {
  const from = element.getBoundingClientRect().height
  animator?.cancel('height')
  element.style.height = '0px'
  const style = getComputedStyle(element)
  const borders = parseFloat(style.borderBlockStartWidth) + parseFloat(style.borderBlockEndWidth)
  const height = Math.max(56, element.scrollHeight + borders)
  element.style.height = height + 'px'
  if (transition && Math.abs(from - height) > 1) {
    animator?.animate('height', [{ height: from + 'px' }, { height: height + 'px' }], { role: 'move' })
  }
}
onMounted(() => { if (own.value) fit(own.value, false) })
watchPostEffect(cleanup => {
  const element = own.value
  if (!element) return
  const current = createAnimator(element)
  animator = current
  const view = element.ownerDocument.defaultView
  let width = element.clientWidth
  const observer = view?.ResizeObserver && new view.ResizeObserver(() => {
    if (element.clientWidth === width) return
    width = element.clientWidth
    fit(element, false)
  })
  observer?.observe(element)
  cleanup(() => { observer?.disconnect(); current.dispose(); animator = undefined })
})
watchPostEffect(() => { if (own.value && own.value.value === value.value) fit(own.value, true) })
</script>

<template>
  <label class="hook-note">
    交付记录便笺
    <textarea :ref="node => attach(node as HTMLTextAreaElement | null)" v-model="value" class="sy-field__control" rows="2" />
  </label>
</template>

<style scoped>
.hook-note { display: grid; gap: var(--sy-space-1); min-inline-size: 0; max-inline-size: 28rem; }
.hook-note textarea { box-sizing: border-box; inline-size: 100%; min-block-size: 0; resize: none; overflow: hidden; }
</style>
