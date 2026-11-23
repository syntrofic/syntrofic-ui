<script lang="ts">
export type TransferCommitBehavior = 'immediate' | 'staged'
</script>

<script setup lang="ts" generic="Item extends TransferItem">
import { computed, ref, watch } from 'vue'
import type { LayoutSize } from '../internal/layout-spacing'
import type { FieldStatus } from '../internal/status-icon'
import SButton from './SButton.vue'
import SComplexSelector from './SComplexSelector.vue'
import SMotionText from './SMotionText.vue'
import STransferList, { type TransferItem, type TransferListProps } from './STransferList.vue'

const props = withDefaults(defineProps<Omit<TransferListProps<Item>, 'label' | 'selectionMode' | 'searchMode' | 'pending'> & {
  label: string
  commitBehavior?: TransferCommitBehavior
  triggerLabel?: string
  applyLabel?: string
  cancelLabel?: string
  required?: boolean
  optional?: boolean
  optionalLabel?: string
  labelTooltip?: string
  disabledMessage?: string
  status?: FieldStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  width?: LayoutSize
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  size?: 'sm' | 'md' | 'lg'
  changeAction?: (next: readonly string[]) => void | Promise<void>
  failureMessage?: string
}>(), {
  commitBehavior: 'immediate', applyLabel: 'Apply', cancelLabel: 'Cancel', searchable: true, animate: true,
  selectedCountLabel: (count: number) => `${count} selected`, failureMessage: 'Could not save the selection.',
})
defineSlots<{ item?(props: { item: Item; selected: boolean }): unknown; value?(props: { value: readonly string[] }): unknown }>()
const emit = defineEmits<{ change: [value: string[]]; changeError: [error: unknown, attempted: string[]] }>()
const model = defineModel<string[]>({ default: () => [] })
const open = defineModel<boolean>('open', { default: false })
const draft = ref([...model.value])
const applying = ref(false)
const staged = computed(() => props.commitBehavior === 'staged')
const equal = (first: readonly string[], second: readonly string[]) => first.length === second.length && first.every((value, index) => value === second[index])
const dirty = computed(() => !equal(draft.value, model.value))
const summary = computed(() => props.triggerLabel ?? props.selectedCountLabel(model.value.length))
const popupWidth = computed(() => props.width ?? 'min(39rem, calc(100vw - 24px))')
const listProps = computed(() => {
  const { label, description, labelHidden, commitBehavior, triggerLabel, applyLabel, cancelLabel, required, optional,
    optionalLabel, labelTooltip, disabledMessage, status, statusVariant, width, side, align, size, changeAction, failureMessage, ...list } = props
  return list
})

type Commit = (next: string[]) => Promise<boolean>
type Close = (focus?: boolean) => void

watch([open, staged], () => { draft.value = [...model.value] })
watch(() => [...model.value], (next, previous) => {
  if (staged.value && !applying.value && !equal(next, previous)) draft.value = next
})

function edit(next: string[], commit: Commit, busy: boolean) {
  if (busy || props.disabled) return
  if (staged.value) draft.value = next
  else void commit(next)
}

async function apply(commit: Commit, close: Close, busy: boolean) {
  if (busy || applying.value || props.disabled || !dirty.value) return
  applying.value = true
  try {
    if (await commit([...draft.value])) close()
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <SComplexSelector v-model="model" v-model:open="open" class="sy-transfer-select" :label="label" :trigger-label="summary"
    :description="description" :label-hidden="labelHidden" :label-tooltip="labelTooltip" :required="required" :optional="optional"
    :optional-label="optionalLabel" :disabled="disabled" :disabled-message="disabledMessage" :loading="loading" :status="status"
    :status-variant="statusVariant" :width="width ?? '100%'" :popup-width="popupWidth" :side="side" :align="align" :size="size"
    :change-action="changeAction" :failure-message="failureMessage"
    @change="emit('change', $event)" @change-error="(error, attempted) => emit('changeError', error, attempted)">
    <template #value>
      <slot name="value" :value="model"><SMotionText v-if="animate" :value="summary" /><template v-else>{{ summary }}</template></slot>
    </template>
    <template #default="{ commit, close, busy, error: failed }">
      <div class="sy-transfer-select__surface">
        <STransferList v-bind="listProps" selection-mode="direct" search-mode="shared" :model-value="staged ? draft : model"
          :pending="busy && !loading" @update:model-value="edit($event, commit, busy)">
          <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
        </STransferList>
        <Transition name="sy-transfer-row" :css="animate">
          <p v-if="failed" class="sy-transfer-select__error" role="alert">{{ failureMessage }}</p>
        </Transition>
        <footer v-if="staged" class="sy-transfer-select__footer">
          <SButton size="sm" variant="ghost" :aria-disabled="busy || undefined" @click="!busy && close()">{{ cancelLabel }}</SButton>
          <SButton size="sm" :loading="applying && busy" :aria-disabled="busy || !dirty || undefined"
            @click="apply(commit, close, busy)">{{ applyLabel }}</SButton>
        </footer>
      </div>
    </template>
  </SComplexSelector>
</template>
