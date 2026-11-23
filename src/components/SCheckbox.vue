<script setup lang="ts">
import { useChoice } from '../internal/choice-group'
import { onFormReset } from '../internal/form-reset'
import SChoiceField from '../internal/SChoiceField.vue'
import SSpinner from './SSpinner.vue'
import { syntroficIcons, syntroficIconViewBox } from '../icons/artwork'
import type { ChoiceFieldProps } from '../types'

defineOptions({ inheritAttrs: false })

const props = defineProps<ChoiceFieldProps & { value?: string | number; name?: string }>()
const emit = defineEmits<{ actionError: [error: unknown] }>()
const model = defineModel<boolean>()
const mixed = defineModel<boolean>('indeterminate')
const initialMixed = mixed.value
const { input, checked, name, defaultChecked, options, controlAttrs } = useChoice('checkbox', props, model)
onFormReset(() => input.value, () => { mixed.value = initialMixed })
</script>

<template>
  <SChoiceField kind="checkbox" :options="options" :input="input" :control-attrs="controlAttrs()" @action-error="emit('actionError', $event)">
    <template #default="{ attrs, busy, inactive }">
      <input ref="input" v-bind="attrs" v-model="checked" class="sy-choice__input" type="checkbox"
        :name="inactive && options.disabledMessage ? undefined : name" :value="value ?? 'on'" :defaultChecked.prop="defaultChecked"
        :indeterminate.prop="mixed" @change="mixed = false" />
      <span class="sy-checkbox__box" :data-size="options.size ?? 'md'" aria-hidden="true">
        <svg class="sy-checkbox__indicator" :viewBox="syntroficIconViewBox" focusable="false">
          <path class="sy-checkbox__check" :d="syntroficIcons.check.path" />
          <path class="sy-checkbox__mixed" :d="syntroficIcons.minus.path" />
        </svg>
        <Transition name="sy-choice-spinner"><SSpinner v-if="busy" size="sm" decorative /></Transition>
      </span>
    </template>
    <template v-if="$slots.default" #label><slot /></template>
    <template v-if="$slots.start" #start><slot name="start" /></template>
    <template v-if="$slots.end" #end><slot name="end" /></template>
  </SChoiceField>
</template>
