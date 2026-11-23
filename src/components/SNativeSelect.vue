<script setup lang="ts" generic="Multiple extends boolean = false">
import { computed, useTemplateRef } from 'vue'
import { groupOptions } from '../internal/collection'
import { useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import type { SelectOption } from '../types'
import SMotionText from './SMotionText.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  options: readonly SelectOption[]
  disabledGroups?: readonly string[]
  placeholder?: string
  name?: string
  form?: string
  autocomplete?: string
  multiple?: Multiple & boolean
  size?: number
  variant?: 'default' | 'secondary'
  fullWidth?: boolean
}>(), { variant: 'default' })
defineSlots<{ indicator(): unknown }>()
type Selection = Multiple extends true ? string[] : string
const model = defineModel<Selection>()
const select = useTemplateRef<HTMLSelectElement>('select')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-native-select')
const groups = computed(() => groupOptions(props.options))
const placeholderOption = computed(() => props.placeholder !== undefined && !props.multiple && !props.options.some(option => option.value === ''))
const first = computed(() => props.options.find(option => !option.disabled && !(option.group && props.disabledGroups?.includes(option.group)))?.value)
const value = computed({
  get: () => model.value ?? (props.multiple ? [] : placeholderOption.value ? '' : first.value ?? ''),
  set: next => { model.value = next as Selection },
})
const initial = Array.isArray(value.value) ? [...value.value] : value.value
const defaultSelection = new Set(Array.isArray(initial) ? initial : [initial])
onFormReset(() => select.value, () => { value.value = Array.isArray(initial) ? [...initial] : initial })
</script>

<template>
  <div class="sy-field sy-native-select" :data-variant="variant" :data-full-width="fullWidth || undefined">
    <label v-if="label" class="sy-field__label" :for="id">{{ label }}</label>
    <div class="sy-native-select__control">
      <select ref="select" v-model="value" v-bind="controlAttrs()" :id="id" class="sy-field__control"
        :name="name" :form="form" :size="size" :multiple="multiple" :autocomplete="autocomplete"
        :disabled="disabled" :required="required" :data-multiple="multiple || (size ?? 1) > 1 || undefined">
        <option v-if="placeholderOption" value="" disabled :selected="defaultSelection.has('')">{{ placeholder }}</option>
        <template v-for="[group, items] in groups" :key="group ?? ''">
          <optgroup v-if="group" :label="group" :disabled="disabledGroups?.includes(group)">
            <option v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled" :selected="defaultSelection.has(item.value)">{{ item.label }}</option>
          </optgroup>
          <template v-else>
            <option v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled" :selected="defaultSelection.has(item.value)">{{ item.label }}</option>
          </template>
        </template>
      </select>
      <span v-if="!multiple && (size ?? 1) <= 1" class="sy-native-select__indicator" aria-hidden="true">
        <slot name="indicator"><span class="sy-native-select__arrow" /></slot>
      </span>
    </div>
    <p v-if="description" :id="hintId" class="sy-field__hint">{{ description }}</p>
    <div class="sy-native-select__validation" :data-show="Boolean(error) || undefined">
      <div><p :id="errorId" class="sy-field__error"><SMotionText :value="error ?? ''" /></p></div>
    </div>
  </div>
</template>
