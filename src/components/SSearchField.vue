<script setup lang="ts">
import SIcon from './SIcon.vue'
import { computed, useTemplateRef } from 'vue'
import { joinIds, useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import { useInputContainer } from '../internal/input-container'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import STooltip from './STooltip.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  name?: string
  placeholder?: string
  clearLabel?: string
  clearable?: boolean
  readonly?: boolean
  labelHidden?: boolean
  disabledMessage?: string
}>(), { clearLabel: 'Clear search', clearable: true })
const value = defineModel<string>()
const emit = defineEmits<{ search: [query: string]; clear: [] }>()
const initial = value.value
const input = useTemplateRef<HTMLInputElement>('input')
const group = useTemplateRef<HTMLDivElement>('group')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-search')
const container = useInputContainer({ containerRef: group, inputRef: input, disabled: () => Boolean(disabled.value) })
const explained = computed(() => disabled.value && Boolean(props.disabledMessage))
const reason = computed(() => explained.value ? `${id.value}-disabled` : undefined)

function inputAttrs() {
  const attrs = controlAttrs()
  return { ...attrs, 'aria-describedby': joinIds(attrs['aria-describedby'], reason.value) }
}

function clear() {
  if (!value.value || props.readonly || disabled.value) return
  input.value?.focus()
  value.value = ''
  emit('clear')
}

function keydown(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229 || disabled.value) return
  if (event.key === 'Enter') emit('search', value.value ?? '')
  if (event.key === 'Escape' && props.clearable && value.value && !props.readonly && !disabled.value) {
    event.preventDefault()
    event.stopPropagation()
    clear()
  }
}

onFormReset(() => input.value, () => { value.value = initial })
defineExpose({ input, focus: () => input.value?.focus(), blur: () => input.value?.blur() })
</script>

<template>
  <div class="sy-field" :data-invalid="invalid">
    <SLabel v-if="label" :for="id" :class="{ 'sy-visually-hidden': labelHidden }">{{ label }}</SLabel>
    <div ref="group" class="sy-input-group sy-search" v-bind="container">
      <div v-if="$slots.start" class="sy-input-group__affix"><slot name="start" /></div>
      <div class="sy-input-group__control">
        <STooltip :disabled="!explained" :text="disabledMessage">
          <template #trigger><input
          ref="input"
          v-bind="inputAttrs()"
          :id="id"
          v-model="value"
          :defaultValue.prop="initial ?? ''"
          type="search"
          class="sy-field__control"
          data-sy-focus-target
          :name="name"
          :placeholder="placeholder"
          :readonly="readonly || explained"
          :disabled="disabled && !explained"
          :aria-disabled="explained || undefined"
          :required="required"
          @keydown="keydown"
        /></template>
        </STooltip>
      </div>
      <button
        v-if="clearable && !readonly"
        type="button"
        class="sy-field-action sy-search__clear"
        :aria-label="clearLabel"
        :aria-hidden="!value || undefined"
        :data-hidden="!value || undefined"
        :disabled="disabled || !value"
        @click="clear"
      ><SIcon name="close" /></button>
    </div>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
    <span v-if="reason" :id="reason" hidden>{{ disabledMessage }}</span>
  </div>
</template>
