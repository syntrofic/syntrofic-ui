<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SDialog from './SDialog.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  cancelLabel?: string
  confirmLabel?: string
  pending?: boolean
  closeOnConfirm?: boolean
}>(), { cancelLabel: 'Cancel', confirmLabel: 'Confirm', closeOnConfirm: true })

const open = defineModel<boolean>('open')
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const actions = useTemplateRef<HTMLDivElement>('actions')
const pressed = ref<string>()
let press: { id: number; action: HTMLElement } | undefined
let blocked: { action: HTMLElement; until: number } | undefined

function cancel() {
  open.value = false
  emit('cancel')
}
function confirm() {
  if (props.pending) return
  emit('confirm')
  if (props.closeOnConfirm) open.value = false
}
function dialogOpen(visible: boolean | undefined) {
  if (!visible && open.value) cancel()
  else if (visible) open.value = true
}
function candidate(event: PointerEvent, checkPosition = false) {
  const target = checkPosition ? actions.value?.ownerDocument.elementFromPoint(event.clientX, event.clientY) : event.target
  const action = target instanceof Element ? target.closest<HTMLElement>('[data-alert-action]') : null
  return action && actions.value?.contains(action) && action.getAttribute('aria-disabled') !== 'true' ? action : undefined
}
function start(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return
  const action = candidate(event)
  if (!action) return
  blocked = undefined
  press = { id: event.pointerId, action }
  pressed.value = action.dataset.alertAction
}
function guardClick(event: MouseEvent) {
  if (!blocked || !event.detail || blocked.until < event.timeStamp || !blocked.action.contains(event.target as Node | null)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  blocked = undefined
}
watch([actions, open], ([root, visible], _, cleanup) => {
  if (!visible) return
  const view = root?.ownerDocument.defaultView
  if (!view) return
  const move = (event: PointerEvent) => {
    if (press && press.id === event.pointerId) pressed.value = candidate(event, true) === press.action ? press.action.dataset.alertAction : undefined
  }
  const finish = (event: PointerEvent) => {
    if (!press || press.id !== event.pointerId) return
    if (event.type === 'pointercancel' || candidate(event, true) !== press.action) blocked = { action: press.action, until: event.timeStamp + 800 }
    press = undefined
    pressed.value = undefined
  }
  view.addEventListener('pointermove', move, { passive: true })
  view.addEventListener('pointerup', finish)
  view.addEventListener('pointercancel', finish)
  cleanup(() => {
    view.removeEventListener('pointermove', move)
    view.removeEventListener('pointerup', finish)
    view.removeEventListener('pointercancel', finish)
    press = blocked = undefined
    pressed.value = undefined
  })
}, { flush: 'post' })
</script>

<template>
  <SDialog :open="open" role="alertdialog" class="sy-alert-dialog" :title="title" :description="description" :close-on-backdrop="false"
    @update:open="dialogOpen">
    <template v-if="$slots.default" #default><slot /></template>
    <template #footer>
      <div ref="actions" class="sy-alert-dialog__actions" @pointerdown="start" @click.capture="guardClick">
        <SButton size="sm" variant="secondary" autofocus data-alert-action="cancel" :data-alert-pressed="pressed === 'cancel' || undefined"
          @click="cancel">{{ cancelLabel }}</SButton>
        <SButton size="sm" variant="danger" :loading="pending" data-alert-action="confirm" :data-alert-pressed="pressed === 'confirm' || undefined"
          @click="confirm">{{ confirmLabel }}</SButton>
      </div>
    </template>
  </SDialog>
</template>
