<script setup lang="ts">
import { GregorianCalendar, type CalendarDate } from '@internationalized/date'
import { computed, nextTick, onBeforeUnmount, ref, watch, useTemplateRef } from 'nativescript-vue'
import { nativeDatePartOrder } from '../calendar-format'
import { nativeDateDraft, nativeSelectableDate, readNativeDateDraft, type NativeDateDraft, type NativeDatePart } from '../calendar-state'
import { useNativeUI } from '../context'
import { nativePopupCalendar, type NativeDatePickerOptions } from '../date-picker'
import type { NativeDialogCloseReason } from '../modal'
import { nativeDigitText } from '../number-state'
import SNativeButton from './SNativeButton.vue'
import SNativeDatePopup from './SNativeDatePopup.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeInputGroup from './SNativeInputGroup.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<NativeDatePickerOptions & {
  picker?: boolean
  pickerLabel?: string
  invalidMessage?: string
  segmentLabels?: Partial<Record<NativeDatePart, string>>
  segmentPlaceholders?: Partial<Record<NativeDatePart, string>>
  separator?: string
  autoAdvance?: boolean
}>(), {
  picker: true, pickerLabel: 'Open calendar', clearLabel: 'Clear date', requiredMessage: 'Enter a date.',
  invalidMessage: 'Enter a valid date.', separator: '/', autoAdvance: true, fixedWeeks: undefined,
  showOutsideMonth: undefined, yearPicker: undefined, closeOnSelect: true,
})
const date = defineModel<CalendarDate>()
const opened = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  change: [date?: CalendarDate]; submit: [date?: CalendarDate]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown]
}>()
const { direction } = useNativeUI()
const gregorian = new GregorianCalendar()
const popup = useTemplateRef<InstanceType<typeof SNativeDatePopup>>('popup')
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const fields = new Map<NativeDatePart, InstanceType<typeof SNativeInput>>()
const order = computed(() => nativeDatePartOrder(props.locale))
const visualOrder = computed(() => direction.value === 'rtl' ? [...order.value].reverse() : order.value)
const defaults = { year: 'Year', month: 'Month', day: 'Day' }
const hints = { year: 'yyyy', month: 'mm', day: 'dd' }
const literal = computed(() => /^\s*[.\/:／：-]\s*$/u.test(props.separator) ? props.separator.trim() : props.separator)
const draft = ref<NativeDateDraft>(nativeDateDraft(date.value))
const focused = ref<NativeDatePart>()
const checked = ref(false)
const blank = computed(() => !Object.values(draft.value).some(Boolean))
const parsed = computed(() => readNativeDateDraft(draft.value, date.value?.calendar ?? props.defaultMonth?.calendar ?? gregorian, date.value?.era ?? props.defaultMonth?.era ?? 'AD'))
const allowed = computed(() => Boolean(parsed.value && nativeSelectableDate(parsed.value, props)))
const inactive = computed(() => props.disabled || props.readonly)
const status = computed(() => props.error || (!checked.value ? undefined :
  blank.value && props.required ? props.requiredMessage : !blank.value && !allowed.value ? props.invalidMessage : undefined))
let queuedBlur: ReturnType<typeof setTimeout> | undefined
let written: CalendarDate | undefined = date.value

function remember(part: NativeDatePart, control: unknown) {
  if (control && typeof control === 'object' && 'focus' in control) fields.set(part, control as InstanceType<typeof SNativeInput>)
  else fields.delete(part)
}
function update(value?: CalendarDate) {
  if (value ? date.value?.compare(value) === 0 : !date.value) return
  written = value
  date.value = value
  emit('change', value)
}
function commit() {
  if (inactive.value) return true
  checked.value = true
  if (blank.value && !props.required) update()
  if (!status.value && allowed.value) {
    update(parsed.value)
    draft.value = nativeDateDraft(parsed.value)
  }
  return !status.value
}
function input(part: NativeDatePart, raw: string) {
  const length = part === 'year' ? 4 : 2
  const next = nativeDigitText(raw).replace(/[^0-9]/g, '').slice(0, length)
  draft.value = { ...draft.value, [part]: next }
  if (allowed.value && draft.value.year.length === 4) update(parsed.value)
  const following = order.value[order.value.indexOf(part) + 1]
  if (props.autoAdvance && next.length === length && following && !draft.value[following]) {
    void nextTick(() => fields.get(following)?.focus())
  }
}
function focus(part?: NativeDatePart) {
  clearTimeout(queuedBlur)
  focused.value = part
}
function blur(part: NativeDatePart) {
  if (focused.value === part) focused.value = undefined
  clearTimeout(queuedBlur)
  queuedBlur = setTimeout(() => { if (!focused.value && !opened.value) commit() }, 110)
}
function submit(part: NativeDatePart) {
  const next = order.value[order.value.indexOf(part) + 1]
  if (next) { fields.get(next)?.focus(); return }
  if (!commit()) return
  emit('submit', parsed.value)
  fields.get(part)?.dismissKeyboard()
}
function choose(value: CalendarDate) {
  draft.value = nativeDateDraft(value)
  checked.value = false
  update(value)
}
function show() {
  if (focused.value) fields.get(focused.value)?.dismissKeyboard()
  popup.value?.show(() => trigger.value?.focus())
}
function clear() {
  if (inactive.value) return
  draft.value = nativeDateDraft()
  checked.value = false
  update()
}
watch(date, value => {
  if (value ? written?.compare(value) === 0 : !written) return
  written = value
  draft.value = nativeDateDraft(value)
  checked.value = false
})
onBeforeUnmount(() => clearTimeout(queuedBlur))
defineExpose({ check: commit, clear, show, focus: () => fields.get(order.value[0])?.focus() ?? false })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" :required="required" :requiredLabel="requiredLabel" marginBottom="4"
      @tap="fields.get(order[0])?.focus()" />
    <SNativeInputGroup :disabled="disabled" :readonly="readonly" :invalid="Boolean(status)">
      <template #default>
        <GridLayout columns="auto,auto,auto,auto,auto" direction="ltr"
          :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'" paddingLeft="6" paddingRight="6">
          <template v-for="(part, index) in visualOrder" :key="part">
            <SNativeText v-if="index" :col="index * 2 - 1" :text="literal" tone="muted" :wrap="false"
              textAlignment="center" verticalAlignment="middle" :accessibilityHidden="true" />
            <SNativeInput :ref="control => remember(part, control)" :col="index * 2" :model-value="draft[part]"
              :label="segmentLabels?.[part] ?? defaults[part]" :placeholder="segmentPlaceholders?.[part] ?? hints[part]"
              :disabled="disabled" :readonly="readonly" :invalid="Boolean(status)" :maxLength="part === 'year' ? 4 : 2"
              keyboardType="number" :returnKeyType="order.at(-1) === part ? 'done' : 'next'" textAlignment="center"
              :minWidth="part === 'year' ? 37 : 20" paddingLeft="0" paddingRight="0"
              @update:model-value="input(part, $event)" @focus="focus(part)" @blur="blur(part)" @submit="submit(part)" />
          </template>
        </GridLayout>
      </template>
      <template #suffix>
        <SNativeDatePopup v-if="picker" ref="popup" v-model:open="opened" :date="allowed ? parsed : date"
          :options="nativePopupCalendar(props)" :disabled="inactive" :close-on-select="closeOnSelect" :done-label="doneLabel"
          :overlay="overlay" :detents="detents" anchor-align="end" @select="choose" @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('popupError', $event)">
          <template #trigger="{ visible }">
            <SNativeButton ref="trigger" :label="pickerLabel" icon="calendar" :disabled="inactive"
              :pressed="visible" size="sm" variant="ghost" width="44" @tap="show" />
          </template>
        </SNativeDatePopup>
        <SNativeButton v-if="clearable" :label="clearLabel" icon="close"
          :disabled="inactive || blank" size="sm" variant="ghost" width="44" @tap="clear" />
      </template>
    </SNativeInputGroup>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeFieldError :text="status" :minHeight="16" />
  </StackLayout>
</template>
