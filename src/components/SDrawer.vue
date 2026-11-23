<script setup lang="ts">
import { panelDefaults, type PanelOptions } from '../internal/panel'
import SPanel from '../internal/SPanel.vue'

withDefaults(defineProps<PanelOptions>(), { ...panelDefaults, side: 'end', size: 'md' })
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <SPanel v-bind="$props" v-model:open="open">
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots['header-start']" #header-start="actions"><slot name="header-start" v-bind="actions" /></template>
    <template v-if="$slots['header-end']" #header-end="actions"><slot name="header-end" v-bind="actions" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template #default="actions"><slot v-bind="actions" /></template>
    <template v-if="$slots.footer" #footer="actions"><slot name="footer" v-bind="actions" /></template>
  </SPanel>
</template>
