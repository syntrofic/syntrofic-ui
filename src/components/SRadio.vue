<script setup lang="ts">
import { computed, inject, mergeProps, useTemplateRef } from 'vue'
import { radioGroup, useChoiceOptions } from '../internal/choice-group'
import { onFormReset } from '../internal/form-reset'
import SChoiceField from '../internal/SChoiceField.vue'
import SSpinner from './SSpinner.vue'
import type { ChoiceFieldProps } from '../types'

defineOptions({ inheritAttrs: false })
const props = defineProps<ChoiceFieldProps & { value: string; name?: string; required?: boolean }>()
const emit = defineEmits<{ actionError: [error: unknown] }>()
const local = defineModel<boolean>()
const initiallyChecked = Boolean(local.value)
const context = inject(radioGroup, null)
const { options, controlAttrs } = useChoiceOptions(props, context)
const input = useTemplateRef<HTMLInputElement>('input')
const checked = computed(() => context ? context.value.value === props.value : Boolean(local.value))
const defaultChecked = computed(() => context ? context.initial === props.value : initiallyChecked)
const name = computed(() => context?.name.value ?? props.name)
const required = computed(() => props.required || context?.required.value || undefined)
function choose(event: Event) {
  if (!(event.target as HTMLInputElement).checked) return
  if (context) context.value.value = props.value
  else local.value = true
}
onFormReset(() => input.value, () => {
  if (!context) local.value = initiallyChecked
})
</script>

<template>
  <SChoiceField kind="radio" :options="options" :input="input" :control-attrs="mergeProps({ onChange: choose }, controlAttrs())"
    @action-error="emit('actionError', $event)">
    <template #default="{ attrs, busy, inactive }">
      <input ref="input" v-bind="attrs" class="sy-choice__input" type="radio" :value="value" :checked="checked"
        :defaultChecked.prop="defaultChecked" :name="inactive && options.disabledMessage ? undefined : name"
        :required="!inactive && required || undefined" />
      <span class="sy-radio__ring" :data-size="options.size ?? 'md'" aria-hidden="true">
        <Transition name="sy-choice-spinner"><SSpinner v-if="busy" size="sm" decorative /></Transition>
      </span>
    </template>
    <template v-if="$slots.default" #label><slot /></template>
    <template v-if="$slots.start" #start><slot name="start" /></template>
    <template v-if="$slots.end" #end><slot name="end" /></template>
  </SChoiceField>
</template>
