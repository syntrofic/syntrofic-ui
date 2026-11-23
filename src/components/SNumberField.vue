<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldRoot } from 'reka-ui'
import { useTextControl, type TextControlProps } from '../internal/field'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import { onFormReset } from '../internal/form-reset'
import { useKeyboardReveal } from '../internal/keyboard-reveal'
import { editableFieldAttrs, useFieldPresentation, type FieldAppearance, type FieldSize } from '../internal/field-presentation'
import { useAnnounce } from '../internal/interaction'
import { useTranslator } from '../rac/locale'
import SFieldLabel from './SFieldLabel.vue'
import SNumericDraft, { type NumberEntryError } from '../internal/SNumericDraft.vue'
import SIcon from './SIcon.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & FieldAppearance & {
  name?: string
  size?: FieldSize
  min?: number
  max?: number
  step?: number
  startingValue?: number
  stepSnapping?: boolean
  allowInvalid?: boolean
  readonly?: boolean
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  formatValue?: (value: number) => string
  allowWheel?: boolean
  focusOnChange?: boolean
  decreaseLabel?: string
  increaseLabel?: string
  hideControls?: boolean
  hideControlsOnTouch?: boolean
  units?: string
  integerOnly?: boolean
  clearable?: boolean
  clearLabel?: string
  entryErrorBehavior?: 'complete' | 'blur-or-enter'
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
}>(), { decreaseLabel: 'Decrease', increaseLabel: 'Increase', stepSnapping: true, focusOnChange: true })
const emit = defineEmits<{ clear: []; enter: [event: KeyboardEvent]; entryErrorChange: [error: NumberEntryError | null] }>()

const value = defineModel<number>()
const initial = value.value
const number = computed({ get: () => value.value ?? null, set: next => { value.value = next ?? undefined } })
const root = useTemplateRef<HTMLDivElement>('field')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-number')
const control = () => root.value?.querySelector<HTMLInputElement>('[role="spinbutton"]') ?? null
useKeyboardReveal(control)
const { nativeDisabled, disabledReason, noteId, inlineSize, DisabledTip } = useFieldPresentation(props, control, disabled)
const entryError = shallowRef<NumberEntryError | null>(null)
const draft = ref('')
const resetRevision = ref(0)
const minimum = computed(() => props.integerOnly && props.min !== undefined ? Math.ceil(props.min) : props.min)
const maximum = computed(() => props.integerOnly && props.max !== undefined ? Math.floor(props.max) : props.max)
const stepSize = computed(() => props.integerOnly ? Math.max(1, Math.round(props.step ?? 1)) : props.step)
const format = computed(() => props.integerOnly ? { ...props.formatOptions, minimumFractionDigits: 0, maximumFractionDigits: 0 } : props.formatOptions)
const translate = useTranslator({ 'field.clear': 'Clear input', 'number.unreadable': 'Enter a number.', 'number.fractional': 'Enter a whole number.',
  'number.outOfRange': 'No numbers are available in this range.' })
const effectiveStatus = computed<FieldStatus | undefined>(() => {
  const status = props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }
  if (!entryError.value || status?.type === 'error' && status.message) return status
  return { type: 'error', message: translate(`number.${entryError.value.kind}`), variant: props.statusVariant ?? status?.variant }
})
const { id: statusId, status: fieldStatus, variant, statusIcon, isInvalid: statusInvalid, attrs: inputAttrs } = useControlStatus(() => effectiveStatus.value, controlAttrs)
const clearVisible = computed(() => Boolean(draft.value || value.value != null) && !disabled.value && !props.readonly)
const announce = useAnnounce(control)
function rejected(error: NumberEntryError | null) {
  entryError.value = error
  emit('entryErrorChange', error)
  if (error && effectiveStatus.value?.variant === 'tooltip' && effectiveStatus.value.message) announce(effectiveStatus.value.message, 'assertive')
}
watch([entryError, effectiveStatus], ([error, status]) => {
  control()?.setCustomValidity(error ? status?.message ?? translate(`number.${error.kind}`) : '')
}, { flush: 'post' })
function clear() {
  if (!clearVisible.value) return
  value.value = undefined
  resetRevision.value++
  control()?.focus({ preventScroll: true })
  emit('clear')
}
onFormReset(control, () => { value.value = initial; resetRevision.value++ })
onBeforeUnmount(() => { if (entryError.value) emit('entryErrorChange', null) })
</script>

<template>
  <div ref="field" class="sy-field" :data-invalid="invalid || statusInvalid || Boolean(entryError)" :data-field-status="fieldStatus?.type" :style="{ inlineSize }">
    <SFieldLabel v-if="label" :for="id" :label="label" :hidden="hideLabel" :optional="optional" :required="required"
      :tooltip="labelTooltip" :tooltip-label="labelTooltipLabel" :icon="labelIcon" />
    <NumberFieldRoot
      :id="id"
      v-model="number"
      class="sy-stepped-field"
      :data-size="size ?? 'md'"
      :data-hide-touch-controls="hideControlsOnTouch || undefined"
      :data-semantic-disabled="Boolean(disabledReason) || undefined"
      :name="disabledReason ? undefined : name"
      :min="minimum"
      :max="maximum"
      :step="stepSize"
      :starting-value="startingValue"
      :step-snapping="stepSnapping"
      :allow-invalid="allowInvalid"
      :disabled="nativeDisabled"
      :readonly="readonly || Boolean(disabledReason)"
      :required="!disabledReason && required || undefined"
      :locale="locale"
      :format-options="format"
      :disable-wheel-change="!allowWheel"
      :focus-on-change="focusOnChange"
      v-slot="{ textValue }"
    >
      <NumberFieldDecrement v-if="!hideControls" class="sy-field-action" :aria-label="decreaseLabel">
        <slot name="decrement">−</slot>
      </NumberFieldDecrement>
      <span v-if="startIcon || $slots.start" class="sy-stepped-field__leading" aria-hidden="true">
        <slot name="start"><SIcon :name="startIcon" size="sm" /></slot>
      </span>
      <SNumericDraft
        v-bind="editableFieldAttrs(inputAttrs(), disabledReason, noteId)" :aria-required="!disabledReason && required || undefined"
        :aria-invalid="entryError ? true : inputAttrs()['aria-invalid']"
        :locale="locale" :format-options="format" :format-value="formatValue" :min="minimum" :max="maximum" :units="units"
        :integer-only="integerOnly" :reset-revision="resetRevision" @draft="draft = $event" @entry-error="rejected" @enter="emit('enter', $event)"
      />
      <span v-if="$slots.display" class="sy-stepped-field__display" aria-hidden="true">
        <slot name="display" :text="textValue" :value="value" />
      </span>
      <span v-if="units" class="sy-stepped-field__units" aria-hidden="true">{{ units }}</span>
      <button v-if="clearable" type="button" class="sy-field__affix sy-field__clear" :data-visible="clearVisible || undefined"
        :aria-label="clearLabel ?? translate('field.clear')" :aria-hidden="!clearVisible || undefined" :tabindex="clearVisible ? undefined : -1"
        @pointerdown.prevent @click="clear"><SIcon name="close" size="sm" /></button>
      <component :is="statusIcon" v-if="statusIcon" />
      <NumberFieldIncrement v-if="!hideControls" class="sy-field-action" :aria-label="increaseLabel">
        <slot name="increment">+</slot>
      </NumberFieldIncrement>
    </NumberFieldRoot>
    <input
      v-if="required && !name && !disabledReason"
      class="sy-visually-hidden"
      type="text"
      tabindex="-1"
      aria-hidden="true"
      :value="value ?? ''"
      :disabled="disabled"
      :readonly="readonly"
      required
      @focus="control()?.focus()"
    />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldStatus v-if="fieldStatus?.message && variant !== 'tooltip'" v-bind="fieldStatus" :id="statusId" />
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
    <span v-if="disabledReason" :id="noteId" class="sy-visually-hidden">{{ disabledReason }}</span>
    <DisabledTip />
  </div>
</template>
