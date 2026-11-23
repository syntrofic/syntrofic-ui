<script setup lang="ts" generic="Multiple extends boolean = false">
import SIcon from './SIcon.vue'
import { useLayerCollisionPadding } from '../internal/layer-context'
import {
  SelectContent, SelectGroup, SelectItem, SelectItemText, SelectLabel, SelectRoot,
  SelectTrigger, SelectValue, SelectViewport,
} from 'reka-ui'
import { computed, inject, nextTick, ref, useAttrs, useTemplateRef, watch } from 'vue'
import { toolbarContext } from '../internal/toolbar-context'
import { useTextControl } from '../internal/field'
import { useScrollLock } from '../internal/document-scroll'
import { groupOptions } from '../internal/collection'
import { onFormReset } from '../internal/form-reset'
import { useMenuPresentation, type MenuPresentation } from '../internal/menu-presentation'
import { useControlStatus, type FieldStatus } from '../internal/status-icon'
import { useTranslator } from '../rac/locale'
import SSelectChoices from '../internal/SSelectChoices.vue'
import { noteOutsidePress } from '../internal/backdrop-press'
import SButton from './SButton.vue'
import SFieldLabel from './SFieldLabel.vue'
import SFieldStatus from './SFieldStatus.vue'
import SMotionText from './SMotionText.vue'
import SPopover from './SPopover.vue'
import SSelectorOption from './SSelectorOption.vue'
import SSheet from './SSheet.vue'
import type { ButtonSize, SelectOption } from '../types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  id?: string
  name?: string
  form?: string
  autocomplete?: string
  label?: string
  hideLabel?: boolean
  optional?: boolean
  size?: ButtonSize
  variant?: 'input' | 'ghost'
  description?: string
  error?: string
  status?: FieldStatus
  placeholder?: string
  options: readonly SelectOption[]
  disabled?: boolean
  required?: boolean
  requiredMessage?: string
  multiple?: Multiple & boolean
  clearable?: boolean
  clearLabel?: string
  showSelectedDescription?: boolean
  presentation?: MenuPresentation
  panelTitle?: string
  dismissLabel?: string
  searchable?: boolean
  searchLabel?: string
  selectAll?: boolean
  selectAllLabel?: string
  emptyText?: string
  direction?: 'ltr' | 'rtl'
  locale?: string
  inline?: boolean
  visibleItems?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}>(), { clearLabel: 'Clear selection', emptyText: 'No options', presentation: 'popover', variant: 'input' })

defineSlots<{
  leading(): unknown
  value(props: { text: string; selected: string | string[] | undefined }): unknown
  indicator(props: { open: boolean }): unknown
  option?(props: { option: SelectOption; selected: boolean }): unknown
}>()

type Selection = Multiple extends true ? string[] : string
const model = defineModel<Selection>()
const toolbar = inject(toolbarContext, null)
const open = defineModel<boolean>('open')
const list = useTemplateRef<HTMLDivElement>('list')
const control = useTemplateRef<HTMLButtonElement | InstanceType<typeof SelectTrigger>>('control')
const trigger = computed<HTMLButtonElement | undefined>(() => {
  const element = control.value
  if (element) return '$el' in element ? element.$el : element
})
const native = useTemplateRef<HTMLSelectElement>('native')
const validationMessage = ref('')
const { id: controlId, hintId, errorId, disabled: controlDisabled, required: controlRequired, invalid, controlAttrs }
  = useTextControl(props, 'sy-select')
const { id: statusId, isInvalid: statusInvalid, status, variant: statusVariant, statusIcon, attrs } = useControlStatus(() => {
  if (validationMessage.value && !props.error && props.status?.type !== 'error') {
    return { type: 'error', message: props.requiredMessage ?? validationMessage.value, variant: 'detached' }
  }
  return props.status && { ...props.status, variant: props.status.variant ?? (props.variant === 'ghost' ? 'detached' : 'attached') }
}, controlAttrs)
const presentation = useMenuPresentation(() => props.presentation, () => Boolean(open.value))
const pickerPanel = computed(() => props.searchable || props.multiple && props.selectAll || presentation.value === 'bottom-sheet')
const panelOpen = computed(() => Boolean(open.value) && !controlDisabled.value)
useScrollLock(() => !pickerPanel.value && panelOpen.value, () => trigger.value?.ownerDocument ?? globalThis.document)
const panelId = computed(() => controlId.value + '-panel')
const fallthrough = useAttrs()
const popupLabel = computed(() => props.panelTitle ?? props.label ?? (typeof fallthrough['aria-label'] === 'string' ? fallthrough['aria-label'] : 'Choose an option'))
const selected = computed(() => props.multiple
  ? (Array.isArray(model.value) ? model.value : [])
  : typeof model.value === 'string' ? model.value : undefined)
const encode = (value: string) => `option:${value}`
const decode = (value: string) => value.slice('option:'.length)
const rekaValue = computed(() => {
  const value = selected.value
  return Array.isArray(value) ? value.map(encode) : typeof value === 'string' ? encode(value) : undefined
})
const chosen = computed(() => new Set(Array.isArray(selected.value) ? selected.value : [selected.value]))
const defaultValues = new Set(chosen.value)
const nativeValue = computed({
  get: () => selected.value ?? '',
  set: updateSelection,
})
onFormReset(() => native.value, () => {
  validationMessage.value = ''
  const values = [...defaultValues]
  updateSelection(props.multiple ? values : values[0])
})
const groupList = computed(() => groupOptions(props.options))
const optionsByValue = computed(() => new Map(props.options.map(option => [option.value, option])))
const describedOption = computed(() => {
  if (!props.showSelectedDescription || typeof selected.value !== 'string') return undefined
  const option = optionsByValue.value.get(selected.value)
  return option?.description ? option : undefined
})
const hasValue = computed(() => Array.isArray(selected.value) ? selected.value.length > 0 : selected.value !== undefined)
const translate = useTranslator({ 'select.placeholder': '' })
const placeholderLabel = computed(() => props.placeholder ?? translate('select.placeholder'))
const valueLabel = computed(() => {
  const value = selected.value
  if (Array.isArray(value)) {
    const names = value.map(key => optionsByValue.value.get(key)?.label ?? key)
    return new Intl.ListFormat(props.locale, { style: 'short' }).format(names) || placeholderLabel.value
  }
  return value === undefined ? placeholderLabel.value : optionsByValue.value.get(value)?.label ?? value
})
const panelAttrs = computed(() => pickerPanel.value ? {
  type: 'button' as const, role: 'combobox' as const, disabled: controlDisabled.value,
  'aria-required': controlRequired.value, 'aria-haspopup': 'dialog' as const, 'aria-expanded': panelOpen.value,
  'aria-controls': panelOpen.value ? panelId.value : undefined,
  'data-state': panelOpen.value ? 'open' : 'closed', 'data-placeholder': !hasValue.value || undefined,
  onClick: showPanel, onKeydown: openPanelFromKeyboard,
} : {})

function showPanel(event: Event) {
  if (event.defaultPrevented || controlDisabled.value) return
  trigger.value?.focus({ preventScroll: true })
  open.value = event.type === 'click' ? !panelOpen.value : true
}

function openPanelFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' || event.defaultPrevented) return
  showPanel(event)
  event.preventDefault()
}

function updateSelection(value: unknown) {
  const current = props.multiple
    ? (Array.isArray(value) ? value.filter(key => typeof key === 'string') : [])
    : (typeof value === 'string' ? value : undefined)
  model.value = current as Selection | undefined
}

function updateRekaSelection(value: unknown) {
  const decoded = Array.isArray(value)
    ? value.filter((option): option is string => typeof option === 'string').map(decode)
    : typeof value === 'string' ? decode(value) : undefined
  updateSelection(decoded)
}

function updatePanelSelection(value: unknown) {
  updateSelection(value)
  if (!props.multiple) open.value = false
}

function clear() {
  if (controlDisabled.value || !hasValue.value) return
  updateSelection(undefined)
  trigger.value?.focus({ preventScroll: true })
}
function validateSelection(event: Event) {
  const element = native.value
  if (!element || event.defaultPrevented) return
  event.preventDefault()
  validationMessage.value = element.validationMessage
  const first = element.form && [...element.form.elements].find(field => 'willValidate' in field && field.willValidate
    && 'validity' in field && !(field.validity as ValidityState).valid)
  if (!first || first === element) trigger.value?.focus()
}

function positionHighlight(option: HTMLElement | null) {
  const surface = list.value
  if (!surface) return
  if (!option) {
    delete surface.dataset.highlighted
    return
  }

  const size = option.offsetHeight
  const y = option.getBoundingClientRect().top - surface.getBoundingClientRect().top
  surface.style.setProperty('--sy-option-y', `${y}px`)
  surface.style.setProperty('--sy-option-height', `${size}px`)
  surface.dataset.highlighted = ''
}

function moveHighlight(event: FocusEvent) {
  positionHighlight(event.target instanceof HTMLElement ? event.target.closest('[data-sy-option]') : null)
}

watch(() => list.value, async element => {
  if (!element) return
  await nextTick()
  if (element !== list.value) return
  const option = element.querySelector<HTMLElement>('[data-highlighted], [data-state="checked"]')
  positionHighlight(option)
})
const collisionPadding = useLayerCollisionPadding(10)
watch(controlDisabled, disabled => { if (disabled) open.value = false })
watch([selected, controlRequired, controlDisabled], () => { validationMessage.value = '' })
const choicesProps = computed(() => ({
  options: props.options, selection: selected.value, multiple: props.multiple, searchable: props.searchable, selectAll: props.selectAll,
  label: popupLabel.value, searchLabel: props.searchLabel, selectAllLabel: props.selectAllLabel, emptyText: props.emptyText,
  direction: props.direction, visibleItems: props.visibleItems,
}))
</script>

<template>
  <component :is="inline ? 'span' : 'div'" class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="status?.type">
    <label v-if="label && inline" class="sy-field__label" :class="{ 'sy-visually-hidden': hideLabel }" :for="controlId">{{ label }}</label>
    <SFieldLabel v-else-if="label" :for="controlId" :label="label" :hidden="hideLabel"
      :required="controlRequired" :optional="optional" :disabled="controlDisabled" />
    <component :is="inline ? 'span' : 'div'" class="sy-select__field-content">
      <SelectRoot
        :model-value="rekaValue"
        :open="!pickerPanel && panelOpen"
        :required="controlRequired"
        :disabled="controlDisabled"
        :multiple="Boolean(multiple)"
        :dir="direction"
        @update:model-value="updateRekaSelection"
        @update:open="open = $event"
      >
        <component :is="inline ? 'span' : 'div'" class="sy-select" :data-clearable="clearable || undefined"
          :data-status-tip="statusVariant === 'tooltip' && Boolean(statusIcon) || undefined" :data-variant="variant">
          <component
            :is="pickerPanel ? 'button' : SelectTrigger"
            ref="control"
            v-bind="{ ...attrs(), ...panelAttrs }"
            :id="controlId"
            class="sy-field__control sy-select__control"
            :data-size="size ?? toolbar?.size.value ?? 'md'"
            :data-description="Boolean(describedOption) || undefined"
            :data-expand-value="showSelectedDescription || undefined"
            data-sy-focus-target
          >
            <slot name="leading" />
            <component :is="pickerPanel ? 'span' : SelectValue" class="sy-select__value" v-bind="pickerPanel ? {} : { placeholder: placeholderLabel }">
              <slot name="value" :text="valueLabel" :selected="selected">
                <SSelectorOption v-if="describedOption" :label="describedOption.label" :description="describedOption.description"
                  :icon="describedOption.icon" animated />
                <SMotionText v-else :value="valueLabel" />
              </slot>
            </component>
            <slot name="indicator" :open="Boolean(open)"><span class="sy-select__arrow" aria-hidden="true"></span></slot>
          </component>
          <span v-if="statusVariant === 'tooltip' && statusIcon" class="sy-select__status-tip"><component :is="statusIcon" /></span>
          <SButton
            v-if="clearable"
            variant="ghost"
            size="sm"
            class="sy-select__clear"
            :aria-label="clearLabel"
            :data-visible="hasValue || undefined"
            :aria-hidden="!hasValue || undefined"
            :disabled="controlDisabled || !hasValue"
            @click="clear"
          ><SIcon name="close" /></SButton>
        </component>
        <SelectContent
          v-if="!pickerPanel"
          class="sy-select__popup"
          :body-lock="false"
          :data-multiple="multiple || undefined"
          position="popper"
          :side="side"
          :align="align"
          :side-offset="6"
          :collision-padding="collisionPadding"
          @pointer-down-outside="noteOutsidePress($event, trigger)"
        >
          <SelectViewport class="sy-select__viewport"
            :style="{ '--sy-select-item-limit': visibleItems === undefined ? undefined : `calc(${Math.max(1, Math.trunc(visibleItems) || 1)} * var(--sy-select-option-height))` }">
            <div ref="list" class="sy-select__list" @focusin="moveHighlight">
              <SelectGroup v-for="([group, items], i) in groupList" :key="group ?? i" class="sy-select__group">
                <SelectLabel v-if="group" class="sy-select__group-label">{{ group }}</SelectLabel>
                <SelectItem
                  v-for="option in items"
                  :key="option.value"
                  :value="encode(option.value)"
                  :disabled="option.disabled"
                  :text-value="option.label"
                  :aria-describedby="option.description ? `${controlId}-option-${encodeURIComponent(option.value)}` : undefined"
                  class="sy-select__option"
                  data-sy-option
                >
                  <template v-if="$slots.option || option.icon || option.description || option.endLabel">
                    <SelectItemText class="sy-visually-hidden">{{ option.label }}</SelectItemText>
                    <slot name="option" :option="option" :selected="chosen.has(option.value)">
                      <SSelectorOption :label="option.label" :icon="option.icon" :description="option.description" :end-label="option.endLabel" />
                    </slot>
                    <span v-if="option.description" :id="`${controlId}-option-${encodeURIComponent(option.value)}`" hidden>{{ option.description }}</span>
                  </template>
                  <SelectItemText v-else>{{ option.label }}</SelectItemText>
                  <span class="sy-select__mark" :data-checked="chosen.has(option.value) || undefined" aria-hidden="true"></span>
                </SelectItem>
              </SelectGroup>
              <p v-if="!options.length" class="sy-select__empty">{{ emptyText }}</p>
            </div>
          </SelectViewport>
        </SelectContent>
      </SelectRoot>
      <SSheet v-if="pickerPanel && presentation === 'bottom-sheet'" :open="panelOpen" @update:open="open = $event"
        :content-class="multiple ? 'sy-select-sheet sy-select-sheet--multiple' : 'sy-select-sheet sy-select-sheet--single'"
        :title="popupLabel" :content-id="panelId" :direction="direction" :dismiss-label="dismissLabel" height="capped">
        <SSelectChoices v-bind="choicesProps" focus-search @change="updatePanelSelection">
          <template v-if="$slots.option" #option="choice"><slot name="option" v-bind="choice" /></template>
        </SSelectChoices>
      </SSheet>
      <SPopover v-else-if="pickerPanel" :open="panelOpen" @update:open="open = $event" :anchor="trigger"
        :content-id="panelId" :label="popupLabel" :side="side" :align="align" tab-behavior="pageOrder">
        <SSelectChoices v-bind="choicesProps" :data-menu-selection="multiple ? 'multiple' : 'single'" @change="updatePanelSelection">
          <template v-if="$slots.option" #option="choice"><slot name="option" v-bind="choice" /></template>
        </SSelectChoices>
      </SPopover>
      <select
        v-if="name || controlRequired"
        ref="native"
        v-model="nativeValue"
        tabindex="-1"
        aria-hidden="true"
        class="sy-visually-hidden"
        :name="name"
        :form="form"
        :autocomplete="autocomplete"
        :multiple="Boolean(multiple)"
        :required="controlRequired"
        :disabled="controlDisabled"
        @invalid="validateSelection"
      >
        <option v-if="!multiple && !options.some(option => option.value === '')" value="" disabled :selected="defaultValues.has(undefined)"></option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
          :selected="defaultValues.has(option.value)"
        >{{ option.label }}</option>
      </select>
    </component>
    <Transition name="sy-field-feedback">
      <SFieldStatus v-if="status?.message && statusVariant !== 'tooltip'" v-bind="status" :id="statusId" />
    </Transition>
    <component :is="inline ? 'span' : 'p'" v-if="description" :id="hintId" class="sy-field__hint">{{ description }}</component>
    <component :is="inline ? 'span' : 'p'" v-if="error" :id="errorId" class="sy-field__error">{{ error }}</component>
  </component>
</template>
