<script setup lang="ts">
import { computed, useTemplateRef } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import type { NativeMenuItem } from '../menu-state'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import type { NativePopoverOptions } from '../popover-state'
import SNativeMenu from './SNativeMenu.vue'

const props = defineProps<{
  label: string
  items: readonly NativeMenuItem[]
  overlay?: NativePopoverOptions
}>()
const open = defineModel<boolean>('open', { default: false })
const selected = defineModel<NativeCollectionKey[]>('selected', { default: () => [] })
const menu = useTemplateRef<InstanceType<typeof SNativeMenu>>('menu')
const { direction } = useNativeUI()
const options = computed<NativePopoverOptions>(() => ({
  placement: direction.value === 'rtl' ? 'left' : 'right',
  align: 'start',
  offset: 6,
  ...props.overlay,
}))
defineExpose({
  show: (focus?: NativeRestoreFocus) => menu.value?.show(focus),
  close: (reason?: NativeDialogCloseReason) => menu.value?.close(reason),
})
</script>

<template>
  <SNativeMenu ref="menu" v-model:open="open" v-model:selected="selected" :label="label" :items="items" :overlay="options">
    <template v-if="$slots.trigger" #trigger="state"><slot name="trigger" v-bind="state" /></template>
    <template v-if="$slots.item" #item="state"><slot name="item" v-bind="state" /></template>
    <template v-if="$slots.footer" #footer="state"><slot name="footer" v-bind="state" /></template>
  </SNativeMenu>
</template>
