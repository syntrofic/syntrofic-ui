<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeOptionItem } from '../option-field'
import { nativePhoneCountries, nativePhoneDetails, normalizeNativePhone, type NativePhoneCountry, type NativePhoneDetails } from '../phone'
import { useNativeUI } from '../context'
import SNativeAutocomplete from './SNativeAutocomplete.vue'
import SNativeButton from './SNativeButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeReveal from './SNativeReveal.vue'

const props = withDefaults(defineProps<{
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  requiredLabel?: string
  disabled?: boolean
  readonly?: boolean
  locale?: string
  countries?: readonly NativePhoneCountry[]
  formatCountry?: (country: NativePhoneCountry) => string
  countryLabel?: string
  countryPlaceholder?: string
  countryEmptyText?: string
  invalidText?: string
  error?: string
  smartPaste?: boolean
  countryWidth?: number
}>(), {
  countryLabel: 'Country or area code', countryPlaceholder: 'Search country or calling code', countryEmptyText: 'No matching countries',
  invalidText: 'Enter a valid phone number', smartPaste: true, countryWidth: 106,
})
const model = defineModel<string>({ default: '' })
const country = defineModel<NativePhoneCountry>('country', { default: 'US' })
const emit = defineEmits<{ change: [details: NativePhoneDetails]; submit: [details: NativePhoneDetails]; countryChange: [country: NativePhoneCountry] }>()
const { direction } = useNativeUI()
const input = useTemplateRef<InstanceType<typeof SNativeInput>>('input')
const opened = ref(false)
const countryPickerUsed = ref(false)
const query = ref('')
const touched = ref(false)
const display = computed(() => {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return undefined
  try { return new Intl.DisplayNames([props.locale ?? 'en'], { type: 'region' }) }
  catch { return undefined }
})
const entries = computed(() => nativePhoneCountries(props.countries).map(({ country: id, callingCode }) => ({
  id, callingCode, name: props.formatCountry?.(id) ?? display.value?.of(id) ?? id,
})))
const detail = computed(() => nativePhoneDetails(model.value, country.value))
const area = computed(() => {
  const item = entries.value.find(entry => entry.id === country.value)
  if (item) return `${item.name} +${item.callingCode}`
  return detail.value.callingCode ? `${country.value} +${detail.value.callingCode}` : country.value
})
const options = computed<NativeOptionItem[]>(() => entries.value.map(item => ({
  id: item.id, label: `${item.name} +${item.callingCode}`, keywords: [item.id, item.callingCode],
})))
const invalid = computed(() => props.error || (touched.value && (props.required || Boolean(model.value.trim())) && !detail.value.valid ? props.invalidText : ''))
const rtl = computed(() => direction.value === 'rtl')
const countryWidth = computed(() => Number.isFinite(props.countryWidth) ? Math.max(75, props.countryWidth) : 106)
watch(detail, value => emit('change', value))
watch(() => props.disabled || props.readonly, active => { if (active) opened.value = false })

function countryTo(next: NativePhoneCountry) {
  if (country.value === next) return
  country.value = next
  emit('countryChange', next)
}
function edit(raw: string) {
  model.value = raw
  if (!props.smartPaste || !normalizeNativePhone(raw).startsWith('+')) return
  const pasted = nativePhoneDetails(raw, country.value)
  const next = pasted.country
  if (next && pasted.possible && (!props.countries || props.countries.includes(next))) countryTo(next)
}
function choose(item: NativeOptionItem) {
  const next = entries.value.find(entry => entry.id === item.id)?.id
  if (!next) return
  if (country.value !== next && normalizeNativePhone(model.value).startsWith('+')) model.value = detail.value.nationalNumber
  countryTo(next)
  opened.value = false
  query.value = ''
}
function toggle() {
  input.value?.dismissKeyboard()
  opened.value = !opened.value
  if (opened.value) {
    countryPickerUsed.value = true
    query.value = ''
  }
}
function check() {
  touched.value = true
  const value = detail.value
  if (value.possible) model.value = value.text
  return !invalid.value
}
function submit() {
  if (check()) emit('submit', detail.value)
  input.value?.dismissKeyboard()
}
defineExpose({ check, focus: () => nextTick(() => input.value?.focus()) })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" :required="required" :requiredLabel="requiredLabel" marginBottom="4" @tap="input?.focus()" />
    <GridLayout :columns="rtl ? `*,${countryWidth}` : `${countryWidth},*`" direction="ltr">
      <SNativeButton :col="rtl ? 1 : 0" :label="area" :accessibilityLabel="countryLabel" :accessibilityValue="area"
        size="sm" fullWidth variant="secondary" :pressed="opened" :disabled="disabled || readonly" @tap="toggle" />
      <SNativeInput ref="input" :col="rtl ? 0 : 1" :model-value="model" :label="label" :placeholder="placeholder"
        :disabled="disabled" :readonly="readonly" :invalid="Boolean(invalid)" :hint="description"
        keyboardType="phone" returnKeyType="done" marginLeft="5" :autocorrect="false" @update:model-value="edit" @blur="check" @submit="submit" />
    </GridLayout>
    <SNativeReveal :open="opened">
      <SNativeAutocomplete v-if="countryPickerUsed" :model-value="country" :label="countryLabel" :placeholder="countryPlaceholder" :items="options"
        :empty-text="countryEmptyText" :clearable="false" v-model:query="query" :open="true" keep-open-on-select marginTop="6" @select="choose" />
    </SNativeReveal>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeFieldError :text="invalid" />
  </StackLayout>
</template>
