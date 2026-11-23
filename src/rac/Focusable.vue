<script setup lang="ts">
import { onMounted, onUpdated, shallowRef, useTemplateRef, type ComponentPublicInstance } from 'vue'
import { Primitive } from 'reka-ui'

const props = withDefaults(defineProps<{
  as?: 'span' | 'div' | 'button' | 'a'
  asChild?: boolean
  disabled?: boolean
  autoFocus?: boolean
  tabindex?: number
}>(), { as: 'span' })
const host = useTemplateRef<ComponentPublicInstance>('host')
const element = shallowRef<HTMLElement | null>(null)
function sync() {
  const root = host.value?.$el
  element.value = root?.nodeType === 1 && typeof root.focus === 'function' ? root : null
}
defineExpose({ element })
onMounted(() => {
  sync()
  if (props.autoFocus && !props.disabled) element.value?.focus({ preventScroll: true })
})
onUpdated(sync)
</script>

<template>
  <Primitive
    ref="host"
    :as="as"
    :as-child="asChild"
    :type="as === 'button' && !asChild ? 'button' : undefined"
    :disabled="as === 'button' && !asChild ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : (tabindex ?? (asChild ? undefined : 0))"
  ><slot /></Primitive>
</template>
