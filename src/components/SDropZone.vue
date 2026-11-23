<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watchPostEffect } from 'vue'
import { onFormReset } from '../internal/form-reset'
import { addAcceptedFiles, fileKey as key, filesFromTransfer, type FileRejection } from '../internal/file-acceptance'
import { useControlStatus, type FieldStatus } from '../internal/status-icon'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SFieldStatus from './SFieldStatus.vue'

export type DropZoneRejection = FileRejection

export interface DropZoneFileState {
  status: 'uploading' | 'complete' | 'failed'
  progress?: number
  message?: string
}

const props = withDefaults(defineProps<{
  label?: string
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
  compact?: boolean
  status?: FieldStatus
}>(), { label: 'Drop files here', browseLabel: 'Choose files', locale: 'en', retryText: 'Retry', removeText: 'Remove' })
defineSlots<{
  icon(): unknown
  trigger(props: { browse: () => void; disabled: boolean; labelId: string; descriptionId: string | undefined }): unknown
  file(props: { file: File; size: string; state: DropZoneFileState | undefined }): unknown
}>()
const emit = defineEmits<{
  accept: [files: File[]]
  reject: [entries: DropZoneRejection[]]
  remove: [file: File]
  retry: [file: File]
}>()
const files = defineModel<File[]>({ default: () => [] })
const initial = [...files.value]
const uid = useId()
const area = useTemplateRef<HTMLDivElement>('area')
const input = useTemplateRef<HTMLInputElement>('input')
const list = useTemplateRef<HTMLDivElement>('list')
const depth = ref(0)
const rejectionText = ref('')
const numberFormat = computed(() => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 1 }))
const labelId = `${uid}-label`
const descriptionId = computed(() => props.description ? `${uid}-description` : undefined)
const { id: statusId, status: fieldStatus, variant, statusIcon, attrs: inputAttrs } =
  useControlStatus(() => props.status, () => ({ 'aria-describedby': descriptionId.value }))

const percent = (state: DropZoneFileState) => state.status === 'complete' ? 100 : Math.min(100, Math.max(0, Number.isFinite(state.progress) ? state.progress! : 0))
const fileSize = (file: File) => file.size < 1000 ? `${numberFormat.value.format(file.size)} B`
  : file.size < 1_000_000 ? `${numberFormat.value.format(file.size / 1000)} kB` : `${numberFormat.value.format(file.size / 1_000_000)} MB`
const rows = computed(() => files.value.map(file => ({ file, id: key(file), size: fileSize(file), state: props.getFileState?.(file) })))

function status(state: DropZoneFileState) {
  return props.formatFileState?.(state) ?? state.message ?? ({
    uploading: `Uploading ${Math.round(percent(state))}%`, complete: 'Complete', failed: 'Upload failed',
  })[state.status]
}

function syncInput(next: readonly File[]) {
  const element = input.value
  if (!element) return
  if (!next.length) {
    element.value = ''
    return
  }
  const transfer = new DataTransfer()
  for (const file of next) transfer.items.add(file)
  element.files = transfer.files
}

watchPostEffect(() => syncInput(files.value))
onFormReset(() => input.value, () => {
  files.value = [...initial]
  rejectionText.value = ''
  setTimeout(() => syncInput(files.value), 0)
})

function browse() {
  if (!props.disabled) input.value?.click()
}

function receive(incoming: readonly File[], invalid: DropZoneRejection[] = []) {
  if (props.disabled) return
  const limit = props.multiple ? props.maxFiles : Number.isFinite(props.maxFiles) ? Math.min(props.maxFiles!, 1) : 1
  const { files: current, added, rejected: disallowed } = addAcceptedFiles(incoming, props.multiple ? files.value : [], {
    accept: props.accept, maxFiles: limit, maxSize: props.maxSize,
  })
  const rejected = [...invalid, ...disallowed]
  if (added.length) {
    files.value = current
    syncInput(current)
    emit('accept', added)
    nextTick(() => syncInput(files.value))
  } else {
    syncInput(files.value)
  }
  const reasons = { type: 'unsupported type', size: 'file too large', limit: 'file limit reached', directory: 'folders are unsupported' }
  rejectionText.value = rejected.length
    ? props.formatRejections?.(rejected) ?? rejected.map(entry => `${entry.name} · ${reasons[entry.reason]}`).join(' / ')
    : ''
  if (rejected.length) emit('reject', rejected)
}

function picked(event: Event) {
  receive(Array.from((event.target as HTMLInputElement).files ?? []))
}

function fileDrag(event: DragEvent) {
  return event.dataTransfer?.types.includes('Files') || depth.value > 0
}

function entered(event: DragEvent) {
  if (!fileDrag(event)) return
  event.preventDefault()
  depth.value++
}

function dragged(event: DragEvent) {
  if (!fileDrag(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = props.disabled ? 'none' : 'copy'
}

function left(event: DragEvent) {
  if (fileDrag(event)) depth.value = Math.max(0, depth.value - 1)
}

function dropped(event: DragEvent) {
  if (!fileDrag(event)) return
  event.preventDefault()
  depth.value = 0
  if (props.disabled || !event.dataTransfer) return
  const { files, rejected } = filesFromTransfer(event.dataTransfer)
  receive(files, rejected)
}

function retry(file: File, event: MouseEvent) {
  const button = event.currentTarget as HTMLElement
  emit('retry', file)
  if (button.ownerDocument.activeElement === button) {
    nextTick(() => {
      if (button.matches(':disabled')) button.closest('li')?.querySelector<HTMLElement>('[data-sy-remove]')?.focus({ preventScroll: true })
    })
  }
}

function focusTrigger() {
  area.value?.querySelector<HTMLElement>('button:not(:disabled), [data-sy-browse]')?.focus({ preventScroll: true })
}

async function remove(file: File, event: MouseEvent) {
  if (props.disabled) return
  const index = files.value.findIndex(item => key(item) === key(file))
  if (index < 0) return
  const button = event.currentTarget as HTMLElement
  const restore = button === button.ownerDocument.activeElement
  const remaining = files.value.filter((_, position) => index !== position)
  files.value = remaining
  syncInput(remaining)
  emit('remove', file)
  await nextTick()
  syncInput(files.value)
  if (!restore) return
  const buttons = list.value?.querySelectorAll<HTMLElement>('[data-sy-remove]')
  const next = Array.from(buttons ?? []).filter(item => !item.closest('.sy-file-row-leave-active'))[Math.min(index, remaining.length - 1)]
  if (next) next.focus({ preventScroll: true })
  else focusTrigger()
}
</script>

<template>
  <div class="sy-drop-zone" :data-compact="compact || undefined">
    <div ref="area" class="sy-drop-zone__area" role="group" :aria-labelledby="labelId"
      v-bind="inputAttrs()" :aria-disabled="disabled || undefined"
      :data-dragging="depth > 0 && !disabled || undefined" :data-disabled="disabled || undefined"
      @dragenter="entered" @dragover="dragged" @dragleave="left" @drop="dropped">
      <span v-if="$slots.icon" class="sy-drop-zone__icon" aria-hidden="true"><slot name="icon" /></span>
      <span class="sy-drop-zone__copy">
        <span :id="labelId" class="sy-drop-zone__label">{{ label }}</span>
        <span v-if="description" :id="descriptionId" class="sy-drop-zone__description">{{ description }}</span>
      </span>
      <slot name="trigger" :browse="browse" :disabled="Boolean(disabled)" :label-id="labelId" :description-id="inputAttrs()['aria-describedby']">
        <SButton size="sm" variant="secondary" :disabled="disabled" v-bind="inputAttrs()" @click="browse">{{ browseLabel }}</SButton>
      </slot>
      <component :is="statusIcon" v-if="statusIcon" />
      <input ref="input" type="file" class="sy-visually-hidden" tabindex="-1" aria-hidden="true"
        :name="name" :form="form" :accept="accept" :multiple="multiple" :disabled="disabled" :required="required"
        @change="picked" @invalid="focusTrigger">
    </div>
    <SFieldStatus v-if="fieldStatus && variant !== 'tooltip'" v-bind="fieldStatus" :id="statusId" />
    <div class="sy-drop-zone__validation" :data-show="Boolean(rejectionText) || undefined">
      <div><SMotionText :value="rejectionText" announce /></div>
    </div>
    <div ref="list">
      <TransitionGroup name="sy-file-row" tag="ul" role="list" class="sy-drop-zone__files" :aria-label="label">
        <li v-for="entry in rows" :key="entry.id" class="sy-drop-zone__file" :data-status="entry.state?.status">
          <div class="sy-drop-zone__file-info">
            <slot name="file" :file="entry.file" :size="entry.size" :state="entry.state">
              <span class="sy-drop-zone__file-name" :title="entry.file.name">{{ entry.file.name }}</span>
              <span class="sy-drop-zone__file-size">{{ entry.size }}</span>
            </slot>
            <span v-if="getFileState" class="sy-drop-zone__status"><SMotionText :value="entry.state ? status(entry.state) : ''" motion="roll" /></span>
          </div>
          <div class="sy-drop-zone__actions">
            <SButton v-if="getFileState" size="sm" variant="ghost" class="sy-drop-zone__retry"
              :data-visible="entry.state?.status === 'failed' || undefined" :aria-hidden="entry.state?.status !== 'failed' || undefined"
              :disabled="disabled || entry.state?.status !== 'failed'" :aria-label="retryLabel?.(entry.file) ?? `Retry ${entry.file.name}`"
              @click="retry(entry.file, $event)">{{ retryText }}</SButton>
            <SButton data-sy-remove size="sm" variant="ghost"
              :aria-label="removeLabel?.(entry.file) ?? `Remove ${entry.file.name}`" :disabled="disabled"
              @click="remove(entry.file, $event)">{{ removeText }}</SButton>
          </div>
          <div v-if="getFileState" class="sy-drop-zone__progress" :role="entry.state ? 'progressbar' : undefined"
            :aria-label="entry.state ? entry.file.name : undefined" :aria-valuemin="entry.state ? 0 : undefined"
            :aria-valuemax="entry.state ? 100 : undefined" :aria-valuenow="entry.state ? Math.round(percent(entry.state)) : undefined"
            :style="{ '--sy-file-progress': entry.state ? percent(entry.state) / 100 : 0 }">
            <span />
          </div>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>
