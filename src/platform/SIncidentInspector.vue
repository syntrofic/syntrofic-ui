<script setup lang="ts">
import SBadge from '../components/SBadge.vue'
import SMetadataList from '../components/SMetadataList.vue'
import STimestamp from '../components/STimestamp.vue'
import type { IncidentItem, IncidentStatus } from './SIncidentConsole.vue'

defineProps<{ incident: IncidentItem; status?: IncidentStatus; locale?: string; detailsLabel: string }>()
</script>

<template>
  <article class="sy-incident-console__inspector">
    <div class="sy-incident-console__summary">
      <SBadge :tone="incident.tone">{{ incident.severity }}</SBadge>
      <SBadge :tone="status?.tone">{{ status?.label ?? incident.status }}</SBadge>
      <STimestamp v-if="incident.time" :value="incident.time" :locale="locale" :tooltip="false" format="date_time" />
    </div>
    <h3>{{ incident.title }}</h3>
    <p v-if="incident.description">{{ incident.description }}</p>
    <SMetadataList v-if="incident.details?.length" :title="detailsLabel" :items="incident.details" />
    <slot />
  </article>
</template>
