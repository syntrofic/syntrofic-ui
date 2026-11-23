<script setup lang="ts">
import type { Component } from 'vue'
import SDescription from './SDescription.vue'
import SIcon from './SIcon.vue'
import SLabel from './SLabel.vue'
import SFieldLabelTip from '../internal/SFieldLabelTip.vue'
import { useTranslator } from '../rac/locale'

defineProps<{
  for: string; label?: string; hidden?: boolean; required?: boolean; optional?: boolean; disabled?: boolean
  tooltip?: string; tooltipLabel?: string; icon?: string | Component; description?: string; descriptionId?: string
}>()
const translate = useTranslator({ 'field.optional': 'Optional', 'field.moreAbout': 'About {label}', 'field.moreInfo': 'More information' })
</script>

<template>
  <div class="sy-field__heading" :class="{ 'sy-visually-hidden': hidden }" :data-disabled="disabled || undefined">
    <div class="sy-field__label-line">
      <SLabel :for="$props.for">
        <SIcon v-if="icon" :icon="icon" size="sm" />
        <slot>{{ label }}</slot>
      </SLabel>
      <span v-if="required" class="sy-field__required" aria-hidden="true">*</span>
      <span v-else-if="optional" class="sy-field__optional" aria-hidden="true">{{ translate('field.optional') }}</span>
      <SFieldLabelTip v-if="tooltip && !hidden" :text="tooltip"
        :label="tooltipLabel ?? (label ? translate('field.moreAbout', { label }) : translate('field.moreInfo'))" />
    </div>
    <SDescription v-if="description || $slots.description" :id="descriptionId ?? $props.for + '-description'">
      <slot name="description">{{ description }}</slot>
    </SDescription>
  </div>
</template>
