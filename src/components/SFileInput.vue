<script setup lang="ts">
import { computed } from 'vue'
import SDropZone from './SDropZone.vue'
import type { DropZoneFileState, DropZoneRejection } from './SDropZone.vue'
import type { FieldStatus } from '../internal/status-icon'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  browseLabel?: string
  removeLabel?: (file: File) => string
  retryLabel?: (file: File) => string
  retryText?: string
  removeText?: string
  formatRejections?: (entries: readonly DropZoneRejection[]) => string
  formatFileState?: (state: DropZoneFileState) => string
  getFileState?: (file: File) => DropZoneFileState | undefined
  locale?: string
  name?: string
  form?: string
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  required?: boolean
  disabled?: boolean
  mode?: 'field' | 'dropzone'
  status?: FieldStatus
}>(), { mode: 'field' })
const zoneProps = computed(() => {
  const { mode, ...zone } = props
  return zone
})
const files = defineModel<File[]>({ default: () => [] })
const emit = defineEmits<{
  accept: [files: File[]]
  reject: [entries: DropZoneRejection[]]
  remove: [file: File]
  retry: [file: File]
}>()
</script>

<template>
  <SDropZone v-bind="zoneProps" v-model="files" class="sy-file-input" :data-mode="mode" :compact="mode === 'field'"
    @accept="emit('accept', $event)" @reject="emit('reject', $event)" @remove="emit('remove', $event)" @retry="emit('retry', $event)">
    <template v-for="(_, slot) in $slots" #[slot]="scope"><slot :name="slot" v-bind="scope ?? {}" /></template>
  </SDropZone>
</template>
