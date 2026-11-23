<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { onFormReset } from '../internal/form-reset'
import { usePressFeedback } from '../internal/press-feedback'
import SCard from './SCard.vue'
import type { CardAppearance } from './SCard.vue'

defineProps<CardAppearance & { label: string; name?: string; value?: string; disabled?: boolean; form?: string }>()
const checked = defineModel<boolean>({ default: false })
const initial = checked.value
const input = useTemplateRef<HTMLInputElement>('input')
const pressable = usePressFeedback()
onFormReset(() => input.value, () => { checked.value = initial })

function onEnter(event: KeyboardEvent) {
  (event.currentTarget as HTMLInputElement).click()
}

async function change(event: Event) {
  const node = event.currentTarget as HTMLInputElement
  checked.value = node.checked
  await nextTick()
  if (input.value === node) node.checked = checked.value
}
</script>

<template>
  <SCard class="sy-action-card" :data-selected="checked || undefined" :data-disabled="disabled || undefined"
    :variant="variant" :elevation="elevation" :width="width" :height="height" :max-width="maxWidth" :min-height="minHeight" :padding="padding">
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <label class="sy-action-card__control" v-bind="pressable" :aria-disabled="disabled || undefined">
      <input ref="input" :checked="checked" :defaultChecked.prop="initial" class="sy-visually-hidden" type="checkbox" :name="name" :value="value ?? 'on'"
        :form="form" :disabled="disabled" :aria-label="label" v-bind="pressable" @change="change" @keydown.enter.prevent="onEnter">
    </label>
    <slot :selected="checked" />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </SCard>
</template>
