<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { AgendaEvent } from './agenda'
import SMotionText from '../components/SMotionText.vue'

defineProps<{
  event: AgendaEvent
  time?: string
  selected: boolean
  past?: boolean
  compact?: boolean
  resizable?: boolean
  placement?: CSSProperties
}>()
</script>

<template>
  <button
    type="button" class="sy-agenda__event" :style="placement"
    :data-color="event.color ?? 'sage'" :data-status="event.status"
    :data-past="past || undefined" :data-compact="compact || undefined" :data-readonly="event.isReadOnly || undefined"
    :aria-pressed="selected" :aria-label="time ? `${event.title} · ${time}` : event.title"
  >
    <slot :event="event">
      <span class="sy-agenda__event-title">{{ event.title }}</span>
      <span v-if="time" class="sy-agenda__event-time" aria-hidden="true"><SMotionText :value="time" /></span>
    </slot>
    <span v-if="resizable" class="sy-agenda__event-resize" data-agenda-resize aria-hidden="true" />
  </button>
</template>
