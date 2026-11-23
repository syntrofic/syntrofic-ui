<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import type { NativeSelectValue } from '../menu-state'
import type { NativeOptionFieldEvents, NativeOptionFieldOptions, NativeOptionItem } from '../option-field'
import SNativeOptionField from './SNativeOptionField.vue'

const props = withDefaults(defineProps<NativeOptionFieldOptions>(), { clearable: true, openOnFocus: true })
const emit = defineEmits<NativeOptionFieldEvents>()
const selected = defineModel<NativeSelectValue>({ default: null })
const query = defineModel<string>('query', { default: '' })
const open = defineModel<boolean>('open', { default: false })
const field = useTemplateRef<InstanceType<typeof SNativeOptionField>>('field')
defineSlots<{ option(props: { item: NativeOptionItem; selected: boolean; active: boolean }): unknown }>()
defineExpose({
  focus: () => field.value?.focus() ?? false, show: () => field.value?.show(),
  hide: () => field.value?.hide(), clear: () => field.value?.clear(),
})
</script>

<template>
  <SNativeOptionField ref="field" v-bind="props" kind="autocomplete" v-model="selected" v-model:query="query" v-model:open="open"
    @change="emit('change', $event)" @select="(item, picked) => emit('select', item, picked)"
    @submit="emit('submit', $event)" @clear="emit('clear')" @load-error="emit('loadError', $event)">
    <template v-if="$slots.option" #option="state"><slot name="option" v-bind="state" /></template>
  </SNativeOptionField>
</template>
