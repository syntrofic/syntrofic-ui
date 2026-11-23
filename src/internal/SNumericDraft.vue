<script lang="ts">
export interface NumberEntryError {
  kind: 'unreadable' | 'fractional' | 'outOfRange'
  text: string
  value?: number
}
</script>

<script setup lang="ts">
import { NumberParser } from '@internationalized/number'
import { injectNumberFieldRootContext, useLocale } from 'reka-ui'
import { computed, nextTick, onMounted, ref, toRef, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  formatValue?: (value: number) => string
  min?: number
  max?: number
  integerOnly?: boolean
  units?: string
  resetRevision?: number
}>()
const emit = defineEmits<{ draft: [text: string]; entryError: [error: NumberEntryError | null]; enter: [event: KeyboardEvent] }>()
const root = injectNumberFieldRootContext()
const input = useTemplateRef<HTMLInputElement>('input')
const locale = useLocale(toRef(props, 'locale'))
const parser = computed(() => new NumberParser(locale.value, props.formatOptions))
const editor = computed(() => new Intl.NumberFormat(locale.value, { useGrouping: false, maximumFractionDigits: 20 }))
const implicitSubmissionTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number'])
const focused = ref(false)
const dirty = ref(false)
const shown = computed(() => {
  const value = root.modelValue.value
  if (value === undefined || value === null || !Number.isFinite(value)) return ''
  if (!props.formatValue) return root.textValue.value
  return focused.value ? editor.value.format(value) : props.formatValue(value)
})
const text = ref(shown.value)
const valueText = computed(() => {
  const value = root.modelValue.value
  if (value === undefined || value === null) return
  if (props.formatValue) return props.formatValue(value)
  if (props.units) return `${root.textValue.value} ${props.units}`
})
const composing = ref(false)
let rejection: NumberEntryError | null = null

function report(error: NumberEntryError | null) {
  if (error?.kind === rejection?.kind && error?.text === rejection?.text && error?.value === rejection?.value) return
  rejection = error
  emit('entryError', error)
}

function read(text: string) {
  if (!text.trim()) return null
  const parsed = parser.value.parse(text)
  const value = Number.isFinite(parsed) || !props.formatValue ? parsed : new NumberParser(locale.value).parse(text)
  if (!Number.isFinite(value)) return { kind: 'unreadable', text } as const
  if (props.integerOnly && !Number.isInteger(value)) return { kind: 'fractional', text, value } as const
  if (props.min !== undefined && props.max !== undefined && props.min > props.max) return { kind: 'outOfRange', text, value } as const
  return value
}

function display(value: string) {
  text.value = value
  emit('draft', value)
}
function reset() {
  dirty.value = false
  report(null)
  display(shown.value)
}

function edit(event: Event) {
  const target = event.currentTarget as HTMLInputElement
  dirty.value = true
  display(target.value)
  if (rejection) {
    const value = read(target.value)
    if (value === null || typeof value === 'number') report(null)
  }
}

function commit(event: Event) {
  if (root.disabled.value || root.readonly.value || composing.value || !dirty.value) return false
  const value = read(text.value)
  if (value && typeof value === 'object') {
    report(value)
    event.preventDefault()
    return false
  }
  dirty.value = false
  report(null)
  if (value === null) root.modelValue.value = undefined
  else root.applyInputValue(props.formatValue ? new Intl.NumberFormat(locale.value, props.formatOptions).format(value) : text.value.trim())
  void nextTick(() => { if (!dirty.value) display(shown.value) })
  return true
}

function focusedIn() { focused.value = true; if (!dirty.value) display(shown.value) }
function focusedOut(event: FocusEvent) { focused.value = false; commit(event); if (!dirty.value) display(shown.value) }
function step(move: () => void) {
  dirty.value = false
  report(null)
  move()
  void nextTick(() => { if (!dirty.value) display(shown.value) })
}
function keydown(event: KeyboardEvent) {
  if (event.defaultPrevented || composing.value || event.isComposing || event.keyCode === 229) return
  if (event.key === 'Enter') {
    const committed = commit(event)
    if (!event.defaultPrevented) emit('enter', event)
    const form = input.value?.form
    if (committed && !event.defaultPrevented && form) {
      event.preventDefault()
      const controls = Array.from(form.elements)
      const submitter = controls.find((element): element is HTMLButtonElement | HTMLInputElement =>
        (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && (element.type === 'submit' || element.type === 'image'))
      const implicitSubmit = !submitter && controls.filter(element => element instanceof HTMLInputElement && implicitSubmissionTypes.has(element.type)).length <= 1
      if (implicitSubmit || (submitter && !submitter.matches(':disabled'))) void nextTick(() => form.requestSubmit(submitter))
    }
    return
  }
  if (root.disabled.value || root.readonly.value) return
  switch (event.key) {
    case 'ArrowUp': event.preventDefault(); step(() => root.handleIncrease()); break
    case 'ArrowDown': event.preventDefault(); step(() => root.handleDecrease()); break
    case 'PageUp': event.preventDefault(); step(() => root.handleIncrease(10)); break
    case 'PageDown': event.preventDefault(); step(() => root.handleDecrease(10)); break
    case 'Home': event.preventDefault(); step(() => root.handleMinMaxValue('min')); break
    case 'End': event.preventDefault(); step(() => root.handleMinMaxValue('max')); break
  }
}
function wheel(event: WheelEvent) {
  if (root.disableWheelChange.value || root.disabled.value || root.readonly.value || !focused.value
    || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
  event.preventDefault()
  step(() => event.deltaY < 0 ? root.handleIncrease() : root.handleDecrease())
}

watch([() => root.modelValue.value, () => props.resetRevision], reset, { flush: 'post' })
watch([shown, () => root.disabled.value, () => root.readonly.value], () => {
  if (root.disabled.value || root.readonly.value) reset()
  else if (!dirty.value) display(shown.value)
})
watch([parser, () => props.min, () => props.max, () => props.integerOnly], () => {
  if (rejection) {
    const value = read(text.value)
    report(value && typeof value === 'object' ? value : null)
  }
})
onMounted(() => { if (input.value) root.onInputElement(input.value) })
</script>

<template>
  <input ref="input" :id="root.id.value" class="sy-stepped-field__value" role="spinbutton" type="text" data-sy-focus-target
    :value="text" :inputmode="root.inputMode.value" :disabled="root.disabled.value || undefined" :readonly="root.readonly.value || undefined"
    :data-disabled="root.disabled.value || undefined" :data-readonly="root.readonly.value || undefined"
    :aria-valuenow="root.modelValue.value ?? undefined" :aria-valuemin="min" :aria-valuemax="max"
    :aria-valuetext="valueText"
    autocomplete="off" autocorrect="off" spellcheck="false"
    @input="edit" @keydown="keydown" @wheel="wheel" @focus="focusedIn" @blur="focusedOut"
    @compositionstart="composing = true" @compositionend="composing = false" />
</template>
