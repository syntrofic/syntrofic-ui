<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'nativescript-vue'
import { commitNativeNumber, nativeNumberAdapter, readFormattedNativeNumber, stepNativeNumber, type NativeNumberRange } from '../number-state'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeNumberRepeat from './SNativeNumberRepeat.vue'

const props = withDefaults(defineProps<NativeNumberRange & {
  label: string
  placeholder?: string
  description?: string
  error?: string
  invalidText?: string
  required?: boolean
  requiredLabel?: string
  disabled?: boolean
  readonly?: boolean
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  stepSnapping?: boolean
  hideControls?: boolean
  decreaseLabel?: string
  increaseLabel?: string
}>(), { stepSnapping: true, invalidText: 'Enter a valid number', decreaseLabel: 'Decrease', increaseLabel: 'Increase' })
const model = defineModel<number | undefined>()
const emit = defineEmits<{ change: [value: number | undefined]; submit: [value: number | undefined]; invalid: [raw: string] }>()
const input = useTemplateRef<InstanceType<typeof SNativeInput>>('input')
const draft = ref('')
const focused = ref(false)
const rejected = ref(false)
const adapter = computed(() => nativeNumberAdapter(props.locale, props.formatOptions))
const isPercent = computed(() => props.formatOptions?.style === 'percent')
const inactive = computed(() => props.disabled || props.readonly)
const message = computed(() => props.error || (rejected.value ? props.invalidText : ''))
const parsed = computed(() => readFormattedNativeNumber(draft.value, adapter.value, isPercent.value))
const current = computed(() => focused.value && parsed.value !== undefined ? parsed.value : model.value)
const smaller = computed(() => stepNativeNumber(current.value, -1, props))
const larger = computed(() => stepNativeNumber(current.value, 1, props))

function display(value?: number) {
  return value !== undefined && Number.isFinite(value) ? adapter.value.format(value) : ''
}
function editDisplay(value: number) {
  const amount = value * (isPercent.value ? 100 : 1)
  const raw = amount.toFixed(12).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return raw.replace('.', adapter.value.symbols.decimal)
}
watch([model, adapter], ([value]) => {
  if (!focused.value) {
    draft.value = display(value)
    rejected.value = false
  }
}, { immediate: true })

function update(value: number | undefined) {
  if (!Object.is(model.value, value)) {
    model.value = value
    emit('change', value)
  }
}
function begin() {
  focused.value = true
  if (!rejected.value && model.value !== undefined && Number.isFinite(model.value)) draft.value = editDisplay(model.value)
}
function commit() {
  if (inactive.value) return true
  if (!draft.value.trim() && !props.required) {
    rejected.value = false
    update(undefined)
    return true
  }
  const value = parsed.value
  if (value === undefined) {
    rejected.value = true
    emit('invalid', draft.value)
    return false
  }
  const next = commitNativeNumber(value, props, props.stepSnapping)
  rejected.value = false
  update(next)
  draft.value = display(next)
  return true
}
function blur() {
  if (!focused.value) return
  focused.value = false
  commit()
}
async function submit() {
  if (!commit()) return
  await nextTick()
  emit('submit', model.value)
  input.value?.dismissKeyboard()
}
function step(next: number | undefined) {
  if (inactive.value || next === undefined) return
  rejected.value = false
  draft.value = focused.value ? editDisplay(next) : display(next)
  update(next)
}
defineExpose({ focus: () => input.value?.focus() ?? false, commit })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" :required="required" :required-label="requiredLabel" marginBottom="4" @tap="input?.focus()" />
    <GridLayout :columns="hideControls ? '*' : '44,*,44'" direction="ltr">
      <SNativeNumberRepeat v-if="!hideControls" col="0" :label="decreaseLabel" symbol="−" :disabled="inactive || smaller === current"
        :repeat="true" @step="step(smaller)" />
      <SNativeInput ref="input" :col="hideControls ? 0 : 1" v-model="draft" :label="label" :placeholder="placeholder"
        :hint="description" :invalid="Boolean(message)" :disabled="disabled" :readonly="readonly"
        keyboardType="decimal" returnKeyType="done" marginLeft="4" marginRight="4" textAlignment="center"
        @focus="begin" @blur="blur" @submit="submit" />
      <SNativeNumberRepeat v-if="!hideControls" col="2" :label="increaseLabel" symbol="+" :disabled="inactive || larger === current"
        :repeat="true" @step="step(larger)" />
    </GridLayout>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeFieldError :text="message" />
  </StackLayout>
</template>
