<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'
import { useTextControl, type TextControlProps } from '../internal/field'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import { editableFieldAttrs, useFieldPresentation, useTextWork, type FieldSize, type TextWorkOptions } from '../internal/field-presentation'
import { onFormReset } from '../internal/form-reset'
import { useKeyboardReveal } from '../internal/keyboard-reveal'
import SFieldLabel from './SFieldLabel.vue'
import STextSurface from '../internal/STextSurface.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'
import { toolbarContext } from '../internal/toolbar-context'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & TextWorkOptions & {
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  size?: FieldSize | number
  readonly?: boolean
  clearable?: boolean
  clearLabel?: string
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
}>(), { type: 'text' })
const emit = defineEmits<{ clear: []; enter: [event: KeyboardEvent]; actionError: [error: unknown] }>()

const model = defineModel<string>()
const initialValue = model.value
const input = useTemplateRef<HTMLInputElement>('input')
useKeyboardReveal(input)
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-input')
const { id: statusId, status: fieldStatus, variant, statusIcon, isInvalid: statusInvalid, attrs: inputAttrs } = useControlStatus(
  () => props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }, controlAttrs)
const { nativeDisabled, disabledReason, noteId, inlineSize, DisabledTip } = useFieldPresentation(props, () => input.value, disabled)
const { busy, run, edit } = useTextWork(props, () => input.value, error => emit('actionError', error))
const toolbar = inject(toolbarContext, null)
const sizeName = computed(() => typeof props.size === 'string' ? props.size : toolbar?.size.value ?? 'md')

function clear(event: MouseEvent) {
  if (!model.value || disabled.value || props.readonly) return
  model.value = ''
  input.value?.focus({ preventScroll: true })
  emit('clear')
  void run('', event)
}
function enter(event: KeyboardEvent) {
  if (!event.defaultPrevented && !event.isComposing && event.keyCode !== 229 && !(input.value as (HTMLInputElement & { composing?: boolean }) | null)?.composing) emit('enter', event)
}
onFormReset(() => input.value, () => { model.value = initialValue })
defineExpose({ input, focus: () => input.value?.focus() })
</script>

<template>
  <div class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="fieldStatus?.type" :style="{ inlineSize }">
    <SFieldLabel v-if="label" :for="id" :label="label" :hidden="hideLabel" :optional="optional" :required="required"
      :tooltip="labelTooltip" :tooltip-label="labelTooltipLabel" :icon="labelIcon" />
    <STextSurface :start-icon="startIcon" :clearable="clearable" :clear-visible="Boolean(model) && !disabled && !readonly"
      :clear-label="clearLabel" :reserve-loading="Boolean(changeAction) || loading || busy" :busy="busy" :status-icon="statusIcon" @clear="clear">
      <input ref="input" v-bind="editableFieldAttrs(inputAttrs(), disabledReason, noteId, busy)" :id="id" v-model="model"
        :defaultValue.prop="initialValue ?? ''" class="sy-field__control" data-sy-focus-target :data-size="sizeName" :data-custom-clear="clearable || undefined"
        :size="typeof size === 'number' ? size : undefined" :type="type" :disabled="nativeDisabled" :readonly="readonly || Boolean(disabledReason)"
        :required="!disabledReason && required || undefined" @input="edit" @keydown.enter="enter" />
      <template v-if="$slots.start" #start><slot name="start" /></template>
      <template v-if="$slots.end" #end><slot name="end" /></template>
    </STextSurface>
    <SFieldStatus v-if="fieldStatus?.message && variant !== 'tooltip'" v-bind="fieldStatus" :id="statusId" />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
    <span v-if="disabledReason" :id="noteId" class="sy-visually-hidden">{{ disabledReason }}</span>
    <DisabledTip />
  </div>
</template>
