<script setup lang="ts">
import { onBeforeUnmount, onMounted, useSlots, watch } from 'nativescript-vue'
import { injectNativePortal } from '../portal'
const props = withDefaults(defineProps<{ disabled?: boolean; open?: boolean }>(), { open: true })
const host = injectNativePortal()
const slots = useSlots()
const id = Symbol('portal')
const render = () => slots.default?.()
function sync() {
  if (props.open && !props.disabled) host?.add({ id, render })
  else host?.remove(id)
}
onMounted(sync)
watch([() => props.open, () => props.disabled], sync)
onBeforeUnmount(() => host?.remove(id))
</script>
<template>
  <slot v-if="open && (!host || disabled)" />
</template>
