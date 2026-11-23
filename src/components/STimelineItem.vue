<script lang="ts">
export type TimelineStatus = 'default' | 'current' | 'success' | 'warning' | 'danger' | 'muted'
</script>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  datetime?: string
  timeLabel?: string
  status?: TimelineStatus
  statusLabel?: string
  side?: 'start' | 'end'
  align?: 'start' | 'center'
  connector?: 'solid' | 'dashed' | 'none'
}>(), { status: 'default', connector: 'solid' })
defineSlots<{
  title(): unknown
  default(): unknown
  meta(): unknown
  marker(props: { status: TimelineStatus }): unknown
}>()
</script>

<template>
  <li class="sy-timeline__item" :data-status="status" :data-side="side" :data-align="align" :data-connector="connector"
    :aria-current="status === 'current' ? 'true' : undefined">
    <span class="sy-timeline__rail" aria-hidden="true">
      <span class="sy-timeline__marker"><slot name="marker" :status="status" /></span>
      <span class="sy-timeline__connector" />
    </span>
    <div class="sy-timeline__content">
      <span v-if="statusLabel" class="sy-visually-hidden">{{ statusLabel }}</span>
      <slot>
        <div class="sy-timeline__heading">
          <strong v-if="title || $slots.title" class="sy-timeline__title"><slot name="title">{{ title }}</slot></strong>
          <time v-if="datetime || timeLabel" class="sy-timeline__time" :datetime="datetime">{{ timeLabel ?? datetime }}</time>
        </div>
        <p v-if="description" class="sy-timeline__description">{{ description }}</p>
      </slot>
    </div>
    <div v-if="$slots.meta" class="sy-timeline__meta"><slot name="meta" /></div>
  </li>
</template>
