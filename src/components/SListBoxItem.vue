<script setup lang="ts">
import { useId } from 'vue'
import { ListboxItem } from 'reka-ui'
import SSelectorOption from './SSelectorOption.vue'

defineProps<{ value: string; disabled?: boolean; label?: string; description?: string }>()
const descriptionId = useId()
</script>

<template>
  <ListboxItem :value="value" :disabled="disabled" class="sy-collection__option" :aria-label="label"
    :aria-disabled="disabled || undefined" :aria-describedby="description ? descriptionId : undefined">
    <SSelectorOption v-if="description" :label="label ?? ''" :description="description">
      <template v-if="$slots.default" #default><slot /></template>
    </SSelectorOption>
    <span v-else><slot>{{ label }}</slot></span>
    <span v-if="description" :id="descriptionId" hidden>{{ description }}</span>
    <span class="sy-collection__mark" aria-hidden="true"></span>
  </ListboxItem>
</template>
