<script setup lang="ts">
import type { Component } from 'vue'
import type { SelectOption } from '../types'
import SAvatar from './SAvatar.vue'
import SSelectorOption from './SSelectorOption.vue'

withDefaults(defineProps<{ item: SelectOption; icon?: string | Component; description?: string; disabled?: boolean }>(), { disabled: undefined })
</script>

<template>
  <SSelectorOption class="sy-typeahead-item" :label="item.label" :description="description ?? item.description"
    :icon="icon ?? item.icon" :end-label="item.endLabel" :disabled="disabled ?? item.disabled">
    <template v-if="$slots.icon || (item.avatar && !icon)" #icon>
      <slot name="icon"><SAvatar v-if="item.avatar" :src="item.avatar.src" :initials="item.avatar.initials" :name="item.label" size="sm" :tooltip="false" /></slot>
    </template>
    <template v-if="$slots.default" #default><slot /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots.end" #end><slot name="end" /></template>
  </SSelectorOption>
</template>
