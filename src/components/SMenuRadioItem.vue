<script setup lang="ts">
import { DropdownMenuRadioItem } from 'reka-ui'
withDefaults(defineProps<{ value: string; label?: string; disabled?: boolean; closeOnSelect?: boolean }>(), { closeOnSelect: false })
const emit = defineEmits<{ select: [event: Event] }>()
</script>

<template>
  <DropdownMenuRadioItem class="sy-menu__item" :value="value" :text-value="label" :disabled="disabled"
    @select="event => { if (!closeOnSelect) event.preventDefault(); emit('select', event) }">
    <slot>{{ label }}</slot><span class="sy-menu__indicator" aria-hidden="true" />
  </DropdownMenuRadioItem>
</template>
