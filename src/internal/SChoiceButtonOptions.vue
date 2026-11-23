<script setup lang="ts">
import { computed, useId } from 'vue'
import SCheckbox from '../components/SCheckbox.vue'
import SFocusGroup from '../components/SFocusGroup.vue'
import SPressableFeedback from '../components/SPressableFeedback.vue'
import SRadio from '../components/SRadio.vue'
import type { ChoiceButtonGroupProps, ChoiceButtonOption } from '../types'

export interface ChoiceButtonSlotProps {
  option: ChoiceButtonOption
  selected: boolean
  disabled: boolean
}

const props = withDefaults(defineProps<Pick<ChoiceButtonGroupProps, 'options' | 'layout' | 'appearance' | 'indicator' | 'effect' | 'disabled'> & {
  kind: 'checkbox' | 'radio'
  selected: readonly string[]
}>(), { layout: 'wrap', appearance: 'card', indicator: true, effect: 'highlight' })
defineSlots<{
  content(props: ChoiceButtonSlotProps): unknown
  icon(props: ChoiceButtonSlotProps): unknown
  indicator(props: ChoiceButtonSlotProps): unknown
}>()
const chosen = computed(() => new Set(props.selected))
const uid = useId()
const idFor = (index: number) => `${uid}-choice-${index}`

function state(option: ChoiceButtonOption) {
  return { option, selected: chosen.value.has(option.value), disabled: Boolean(props.disabled || option.disabled) }
}

function focusOnPress(event: MouseEvent) {
  const input = event.currentTarget as HTMLInputElement
  if (event.detail > 0 && input.ownerDocument.activeElement !== input) input.focus({ preventScroll: true })
}
</script>

<template>
  <SFocusGroup class="sy-choice-buttons" :data-layout="layout" :data-appearance="appearance">
    <SPressableFeedback v-for="(option, index) in options" :key="option.value" as="div" :effect="effect"
      class="sy-choice-button" :disabled="disabled || option.disabled" data-sy-focus-anchor
      :data-selected="chosen.has(option.value) || undefined" :data-disabled="disabled || option.disabled || undefined"
      :data-hide-default-indicator="!indicator || Boolean($slots.indicator) || undefined">
      <component :is="kind === 'radio' ? SRadio : SCheckbox" :value="option.value" :disabled="disabled || option.disabled"
        :aria-labelledby="idFor(index)" :aria-describedby="option.description ? idFor(index) + '-hint' : undefined"
        data-sy-focus-target @click="focusOnPress">
        <span class="sy-choice-button__title" :id="idFor(index)">
          <span v-if="$slots.icon" class="sy-choice-button__icon" aria-hidden="true"><slot name="icon" v-bind="state(option)" /></span>
          <slot name="content" v-bind="state(option)">{{ option.label }}</slot>
        </span>
        <span v-if="option.description" class="sy-choice-button__description" :id="idFor(index) + '-hint'">{{ option.description }}</span>
        <span v-if="indicator && $slots.indicator" class="sy-choice-button__custom" aria-hidden="true">
          <slot name="indicator" v-bind="state(option)" />
        </span>
      </component>
    </SPressableFeedback>
  </SFocusGroup>
</template>
