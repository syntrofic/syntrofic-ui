<script setup lang="ts">
import SIcon from './SIcon.vue'

defineProps<{ label?: string; value?: string | number; icon?: string }>()
</script>

<template>
  <div class="sy-metadata__entry">
    <dt><SIcon v-if="icon" :name="icon" size="sm" /><slot name="label">{{ label }}</slot></dt>
    <dd><slot>{{ value }}</slot></dd>
  </div>
</template>
