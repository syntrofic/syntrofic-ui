<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { joinIds, useTextControl, type TextControlProps } from '../internal/field'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import { editableFieldAttrs, useFieldPresentation, useTextWork, type FieldSize, type TextWorkOptions } from '../internal/field-presentation'
import { characterCount } from '../internal/character-count'
import { createAnimator } from '../internal/motion'
import { onFormReset } from '../internal/form-reset'
import { useKeyboardReveal } from '../internal/keyboard-reveal'
import { useTranslator } from '../rac/locale'
import SFieldLabel from './SFieldLabel.vue'
import STextSurface from '../internal/STextSurface.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & TextWorkOptions & {
  rows?: number
  maxRows?: number
  maxLength?: number
  htmlMaxLength?: number
  size?: FieldSize
  readonly?: boolean
  autoGrow?: boolean
  resize?: 'none' | 'vertical' | 'both'
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
}>(), { rows: 3, resize: 'vertical' })
const emit = defineEmits<{ actionError: [error: unknown] }>()
const model = defineModel<string>()
const initialValue = model.value
const attrs = useAttrs()
const input = useTemplateRef<HTMLTextAreaElement>('input')
useKeyboardReveal(input)
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-textarea')
const { id: statusId, status: fieldStatus, variant, statusIcon, isInvalid: statusInvalid, attrs: inputAttrs } = useControlStatus(
  () => props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }, controlAttrs)
const { nativeDisabled, disabledReason, noteId, inlineSize, DisabledTip } = useFieldPresentation(props, () => input.value, disabled)
const { busy, edit } = useTextWork(props, () => input.value, error => emit('actionError', error))
const countId = 'sy-text-count-' + useId()
const limit = computed(() => typeof props.maxLength === 'number' && Number.isSafeInteger(props.maxLength) && props.maxLength >= 0 ? props.maxLength : undefined)
const count = computed(() => characterCount(model.value ?? ''))
const translate = useTranslator({ 'field.countRemaining': '{count} characters remaining', 'field.countExceeded': '{count} characters over the limit' })
const remaining = computed(() => limit.value === undefined ? 0 : limit.value - count.value)
const countText = computed(() => translate(remaining.value < 0 ? 'field.countExceeded' : 'field.countRemaining', { count: Math.abs(remaining.value) }))
let observer: ResizeObserver | undefined
let resizeFrame = 0
let lastWidth = 0
let animator: ReturnType<typeof createAnimator> | undefined

function fit(animate = true) {
  const area = input.value
  if (!area) return
  const previous = area.getBoundingClientRect().height
  animator?.cancel('auto-grow')
  area.style.removeProperty('height')
  if (!props.autoGrow || !area.clientWidth) return
  const style = getComputedStyle(area)
  const naturalHeight = area.offsetHeight
  const border = area.offsetHeight - area.clientHeight
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
  const lineHeight = parseFloat(style.lineHeight)
  const limit = props.maxRows && Number.isFinite(lineHeight)
    ? Math.max(props.maxRows, props.rows) * lineHeight + padding + border
    : Infinity
  const height = Math.max(naturalHeight, Math.min(area.scrollHeight + border, limit))
  area.style.height = `${height}px`
  if (animate && Math.abs(previous - height) > 1) animator?.animate('auto-grow', [{ height: `${previous}px` }, { height: `${height}px` }], { role: 'move' })
}

watch([model, () => props.rows, () => props.maxRows, () => props.autoGrow], () => fit(), { flush: 'post' })
onMounted(() => {
  const area = input.value
  if (area && typeof area.animate === 'function') animator = createAnimator(area)
  if (area && typeof ResizeObserver === 'function') {
    lastWidth = area.clientWidth
    observer = new ResizeObserver(() => {
      if (area.clientWidth === lastWidth || resizeFrame) return
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        lastWidth = area.clientWidth
        fit()
      })
    })
    observer.observe(area)
  }
  fit(false)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
  animator?.dispose()
})
onFormReset(() => input.value, () => { model.value = initialValue })
defineExpose({ input, focus: () => input.value?.focus() })
</script>

<template>
  <div class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="fieldStatus?.type" :style="{ inlineSize }">
    <SFieldLabel v-if="label" :for="id" :label="label" :hidden="hideLabel" :optional="optional" :required="required"
      :tooltip="labelTooltip" :tooltip-label="labelTooltipLabel" :icon="labelIcon" />
    <STextSurface :start-icon="startIcon" :reserve-loading="Boolean(changeAction) || loading || busy" :busy="busy" :status-icon="statusIcon">
      <textarea ref="input" v-bind="editableFieldAttrs(inputAttrs(), disabledReason, noteId, busy)" :id="id" v-model="model" :defaultValue.prop="initialValue ?? ''"
        class="sy-field__control sy-textarea" data-sy-focus-target :data-resize="autoGrow ? 'none' : resize" :data-size="size ?? 'md'"
        :aria-describedby="joinIds(inputAttrs()['aria-describedby'], disabledReason && noteId, limit !== undefined && countId)"
        :maxlength="htmlMaxLength ?? (attrs.maxlength as number | string | undefined)" :rows="rows" :disabled="nativeDisabled"
        :readonly="readonly || Boolean(disabledReason)" :required="!disabledReason && required || undefined" @input="edit"></textarea>
      <template v-if="$slots.start" #start><slot name="start" /></template>
      <template v-if="$slots.end" #end><slot name="end" /></template>
      <template v-if="limit !== undefined" #footer>
        <div class="sy-textarea__counter" :data-over-limit="remaining < 0 || undefined">
          <SIcon v-if="remaining < 0" name="warning" size="sm" />
          <span aria-hidden="true"><SMotionText :value="String(count)" motion="roll" /> / {{ limit }}</span>
          <span :id="countId" class="sy-visually-hidden" aria-live="polite" aria-atomic="true">{{ countText }}</span>
        </div>
      </template>
    </STextSurface>
    <SFieldStatus v-if="fieldStatus?.message && variant !== 'tooltip'" v-bind="fieldStatus" :id="statusId" />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
    <span v-if="disabledReason" :id="noteId" class="sy-visually-hidden">{{ disabledReason }}</span>
    <DisabledTip />
  </div>
</template>
