<script setup lang="ts">
import { computed, mergeProps, provide, useId, useTemplateRef } from 'vue'
import { joinIds } from '../internal/field'
import { useInputContainer } from '../internal/input-container'
import { inputStatusGroup, useInputStatusIcon, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import SDescription from './SDescription.vue'
import SFieldStatus from './SFieldStatus.vue'
import type { ButtonSize } from '../types'

const props = defineProps<{ label?: string; description?: string; disabled?: boolean; size?: ButtonSize; status?: FieldStatus; statusVariant?: FieldStatusVariant }>()
defineOptions({ inheritAttrs: false })
const id = `sy-input-group-${useId()}`
const root = useTemplateRef<HTMLDivElement>('root')
const container = useInputContainer({ containerRef: root, disabled: () => Boolean(props.disabled),
  inputRef: () => root.value?.querySelector<HTMLElement>('[data-sy-focus-target],input:not([type="hidden"]),textarea,[contenteditable="true"]') })
const { id: statusId, status, statusIcon, variant, describedBy: statusDescription } = useInputStatusIcon(
  () => props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant })
const describedBy = computed(() => joinIds(props.description && `${id}-description`, statusDescription.value))
provide(inputStatusGroup, { status, describedBy })
</script>

<template>
  <div class="sy-input-group-frame" :class="{ 'sy-field': label || description }">
    <span v-if="label" :id="`${id}-label`" class="sy-field__label">{{ label }}</span>
    <div ref="root" class="sy-input-group" v-bind="mergeProps(container, $attrs)" :role="typeof $attrs.role === 'string' ? $attrs.role : label ? 'group' : undefined"
      :aria-labelledby="joinIds($attrs['aria-labelledby'] ?? (label && `${id}-label`))"
      :aria-describedby="joinIds($attrs['aria-describedby'], describedBy)" :data-size="size ?? $attrs['data-size'] ?? 'md'"
      :data-invalid="status?.type === 'error' || undefined">
      <span v-if="$slots.start" class="sy-input-group__affix" data-side="start"><slot name="start" /></span>
      <div class="sy-input-group__control"><slot /></div>
      <span v-if="$slots.end" class="sy-input-group__affix"><slot name="end" /></span>
      <component :is="statusIcon" v-if="statusIcon" />
    </div>
    <SFieldStatus v-if="status?.message && variant !== 'tooltip'" v-bind="status" :id="statusId" />
    <SDescription v-if="description" :id="`${id}-description`">{{ description }}</SDescription>
  </div>
</template>
