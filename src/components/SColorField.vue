<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef, watch } from 'vue'
import { getChannelRange, useLocale, type Color, type ColorChannel, type ColorFormat, type ColorSpace } from 'reka-ui'
import { channelSpace, colorInSpace, formatColor, readChannel, readColor, useColorState, writeChannel, type ColorValue } from '../internal/color'
import { joinIds, useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import SColorInputGroup from './SColorInputGroup.vue'
import SColorSwatch from './SColorSwatch.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SLabel from './SLabel.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  name?: string
  defaultValue?: ColorValue
  format?: ColorFormat
  channel?: ColorChannel
  colorSpace?: ColorSpace
  placeholder?: string
  invalidLabel?: string
  locale?: string
  readonly?: boolean
  showSwatch?: boolean
  step?: number
}>(), { format: 'hex', invalidLabel: 'Enter a valid color.', showSwatch: true })
const emit = defineEmits<{ commit: [value: Color | null] }>()
const model = defineModel<ColorValue | null>()
const initial = model.value
const input = useTemplateRef<HTMLInputElement>('field')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-color')
const state = useColorState(model, {
  get defaultValue() { return props.defaultValue },
  get disabled() { return disabled.value },
})
const localError = ref('')
const editing = ref(false)
const composing = ref(false)
const resolvedLocale = useLocale(toRef(props, 'locale'))
const channelColor = computed(() => props.channel ? colorInSpace(state.color.value, props.colorSpace ?? channelSpace(props.channel)) : state.color.value)
const channelRange = computed(() => props.channel ? getChannelRange(props.channel) : undefined)
const channelValue = computed(() => props.channel ? readChannel(channelColor.value, props.channel) : undefined)
const formatter = computed(() => new Intl.NumberFormat(resolvedLocale.value, { maximumFractionDigits: 2, useGrouping: false }))
const formatted = computed(() => channelValue.value === undefined
  ? state.empty.value ? '' : formatColor(state.color.value, props.format)
  : formatter.value.format(channelValue.value))
const draft = ref(formatted.value)
const message = computed(() => props.error || localError.value)
const isInvalid = computed(() => invalid.value || Boolean(localError.value))

function parseChannel(source: string) {
  const text = source.normalize('NFKC').trim().replace(/[%°]$/, '').trim()
  let normalized = text
  const decimal = formatter.value.formatToParts(1.2).find(part => part.type === 'decimal')?.value ?? '.'
  if (decimal !== '.') normalized = normalized.replace(decimal, '.')
  for (let digit = 0; digit < 10; digit++) normalized = normalized.replaceAll(formatter.value.format(digit), String(digit))
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined
  const number = Number(normalized)
  return Number.isFinite(number) ? number : undefined
}

function candidate(source: string): Color | null | undefined {
  if (props.channel && channelRange.value) {
    const number = parseChannel(source)
    if (number === undefined) return undefined
    const value = Math.max(channelRange.value.min, Math.min(channelRange.value.max, number))
    return writeChannel(channelColor.value, props.channel, value)
  }
  if (!source.trim()) return required.value ? undefined : null
  return readColor(source)
}

function syncError(error: string, reveal: boolean) {
  if (reveal || !error) localError.value = error
  input.value?.setCustomValidity(error)
}

function update(reveal: boolean): boolean {
  if (props.readonly || state.disabled.value || composing.value) return true
  if (draft.value === formatted.value && (draft.value || !required.value)) {
    syncError('', true)
    if (reveal) emit('commit', state.empty.value ? null : state.color.value)
    return true
  }
  const next = candidate(draft.value)
  if (next === undefined) {
    syncError(props.invalidLabel, reveal)
    return false
  }
  syncError('', true)
  state.set(next)
  if (reveal) emit('commit', next)
  return true
}

function handleInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
  if (!(event as InputEvent).isComposing) update(false)
}

function finishEditing() {
  editing.value = false
  if (update(true)) draft.value = formatted.value
}

function keydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value || event.keyCode === 229 || props.readonly || state.disabled.value) return
  if (event.key === 'Enter') {
    if (update(true)) draft.value = formatted.value
    else event.preventDefault()
    return
  }
  if (!props.channel || !channelRange.value || channelValue.value === undefined) return
  const moves = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
  const direction = moves[event.key as keyof typeof moves]
  if (!direction && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  const step = typeof props.step === 'number' && Number.isFinite(props.step) && props.step > 0 ? props.step : channelRange.value.step
  const next = direction ? channelValue.value + direction * step : event.key === 'Home' ? channelRange.value.min : channelRange.value.max
  draft.value = formatter.value.format(next)
  if (update(true)) draft.value = formatted.value
}

watch(formatted, value => {
  if (editing.value) return
  draft.value = value
  syncError('', true)
})
watch(() => [props.channel, props.format], () => {
  draft.value = formatted.value
  syncError('', true)
})
onFormReset(() => input.value, () => {
  model.value = initial
  draft.value = formatted.value
  syncError('', true)
})
</script>

<template>
  <div class="sy-field sy-color-field" :data-invalid="isInvalid || undefined">
    <SLabel v-if="label || $slots.label" :for="id"><slot name="label">{{ label }}</slot></SLabel>
    <SColorInputGroup :invalid="isInvalid" :disabled="state.disabled.value">
      <template v-if="showSwatch || $slots.start" #start>
        <slot name="start" :color="state.color.value">
          <SColorSwatch :color="state.empty.value ? null : state.color.value" size="xs" aria-hidden="true" />
        </slot>
      </template>
      <input
        ref="field"
        v-bind="controlAttrs()"
        :id="id"
        :class="['sy-field__control', 'sy-color-field__text']"
        :role="channel ? 'spinbutton' : undefined"
        :aria-valuenow="channelValue"
        :aria-valuemin="channelRange?.min"
        :aria-valuemax="channelRange?.max"
        :aria-invalid="isInvalid || undefined"
        :aria-describedby="joinIds(controlAttrs()['aria-describedby'], message && errorId)"
        :value="draft"
        :placeholder="placeholder"
        data-sy-focus-target
        type="text"
        :inputmode="channel ? 'decimal' : 'text'"
        autocomplete="off"
        spellcheck="false"
        :disabled="state.disabled.value"
        :readonly="readonly"
        :required="required"
        @input="handleInput"
        @focus="editing = true"
        @blur="finishEditing"
        @keydown="keydown"
        @invalid="update(true)"
        @compositionstart="composing = true"
        @compositionend="composing = false; handleInput($event)"
      />
      <template v-if="$slots.end" #end><slot name="end" :color="state.color.value" /></template>
    </SColorInputGroup>
    <input v-if="name" type="hidden" :name="name" :disabled="state.disabled.value" :value="state.empty.value ? '' : formatColor(state.color.value)" />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <div class="sy-color-field__validation" :data-show="Boolean(message) || undefined">
      <div><SFieldError v-if="message" :id="errorId">{{ message }}</SFieldError></div>
    </div>
  </div>
</template>
