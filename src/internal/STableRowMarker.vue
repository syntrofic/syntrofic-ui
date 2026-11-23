<script setup lang="ts">
import SIcon from '../components/SIcon.vue'
import type { TableRowMarker } from './table-features'

defineProps<{ marker: TableRowMarker | null }>()
</script>

<template>
  <span v-if="marker" role="img" :aria-label="marker.label" :title="marker.label" :style="{ color: marker.color }">
    <SIcon v-if="marker.icon" :name="marker.icon" />
    <span v-else class="sy-table__status-dot" aria-hidden="true" />
  </span>
</template>
