<script setup lang="ts">
import { DropdownMenuCheckboxItem } from 'reka-ui'
withDefaults(defineProps<{ label?: string; disabled?: boolean; closeOnSelect?: boolean }>(), { closeOnSelect: false })
const checked = defineModel<boolean | 'indeterminate'>({ default: false })
const emit = defineEmits<{ select: [event: Event] }>()
</script>

<template>
  <DropdownMenuCheckboxItem v-model="checked" class="sy-menu__item" :text-value="label" :disabled="disabled"
    @select="event => { if (!closeOnSelect) event.preventDefault(); emit('select', event) }">
    <slot>{{ label }}</slot><span class="sy-menu__indicator" aria-hidden="true" />
  </DropdownMenuCheckboxItem>
</template>
