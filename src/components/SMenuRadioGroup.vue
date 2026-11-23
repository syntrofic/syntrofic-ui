<script setup lang="ts">
import { DropdownMenuRadioGroup } from 'reka-ui'

defineProps<{ label?: string }>()
const value = defineModel<string>()
</script>

<template>
  <DropdownMenuRadioGroup v-model="value" :aria-label="label"><slot /></DropdownMenuRadioGroup>
</template>
