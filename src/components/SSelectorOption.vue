<script setup lang="ts">
import type { Component } from 'vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

defineProps<{ label: string; icon?: string | Component; description?: string; endLabel?: string; disabled?: boolean; animated?: boolean }>()
</script>

<template>
  <span class="sy-selector-option" :data-disabled="disabled || undefined">
    <span v-if="icon || $slots.icon" class="sy-selector-option__icon" aria-hidden="true">
      <slot name="icon">
        <Transition name="sy-select-value-icon"><SIcon :key="typeof icon === 'string' ? icon : undefined" :icon="icon" size="sm" /></Transition>
      </slot>
    </span>
    <span class="sy-selector-option__copy">
      <span class="sy-selector-option__label"><slot><SMotionText v-if="animated" :value="label" /><template v-else>{{ label }}</template></slot></span>
      <small v-if="description || $slots.description"><slot name="description">
        <SMotionText v-if="animated" :value="description ?? ''" /><template v-else>{{ description }}</template>
      </slot></small>
    </span>
    <span v-if="endLabel || $slots.end" class="sy-selector-option__end"><slot name="end">{{ endLabel }}</slot></span>
  </span>
</template>
