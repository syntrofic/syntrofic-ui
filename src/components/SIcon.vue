<script setup lang="ts">
import { computed, toValue, type Component } from 'vue'
import { useIcon, useIconSize, type SemanticIconSize } from '../internal/icons'

const props = withDefaults(defineProps<{
  name?: string
  icon?: string | Component
  label?: string
  size?: SemanticIconSize | number | string
  color?: 'inherit' | 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent' | 'info' | 'success' | 'error' | 'warning' |
    'blue' | 'red' | 'green' | 'gray' | 'cyan' | 'teal' | 'yellow' | 'orange' | 'pink' | 'purple'
  variant?: string
  viewBox?: string
  mirror?: boolean
}>(), { mirror: undefined })
const contextSize = useIconSize()
const dimensions = { xsm: '.75rem', sm: '1rem', md: '1.25rem', lg: '1.5rem' }
const size = computed(() => props.size ?? toValue(contextSize) ?? '1em')
const semanticSize = computed(() => typeof size.value === 'string' && Object.hasOwn(dimensions, size.value) ? size.value as SemanticIconSize : undefined)
const dimension = computed(() => semanticSize.value ? dimensions[semanticSize.value] : size.value)
const artwork = useIcon(() => typeof props.icon === 'string' ? props.icon : props.name, () => props.variant, () => props.size ?? toValue(contextSize) ?? 'md')
const custom = computed(() => (typeof props.icon === 'string' ? undefined : props.icon) ?? artwork.component.value)
const appearance = computed(() => ({
  width: dimension.value, height: dimension.value, 'data-size': semanticSize.value, 'data-color': props.color,
  'data-mirror': (props.mirror ?? artwork.value?.mirror) || undefined,
  role: props.label ? 'img' : undefined, 'aria-label': props.label || undefined,
  'aria-hidden': props.label ? undefined : true, focusable: 'false',
}))
const externalSize = computed(() => typeof dimension.value === 'number' || /^\d+(\.\d+)?$/.test(dimension.value)
  ? `${dimension.value}px` : dimension.value)
</script>

<template>
  <span v-if="custom" class="sy-icon sy-icon--external" :data-size="semanticSize" :data-color="color" :data-mirror="mirror || undefined"
    :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : true"
    :style="semanticSize ? undefined : { inlineSize: externalSize, blockSize: externalSize }">
    <component :is="custom" v-bind="viewBox ? { viewBox } : {}" aria-hidden="true" focusable="false" />
  </span>
  <svg v-else class="sy-icon" v-bind="appearance" :viewBox="viewBox ?? artwork?.viewBox ?? '0 0 24 24'">
    <slot><path v-if="artwork" :d="artwork.path" :fill="artwork.fill ?? 'none'" :stroke="artwork.fill ? undefined : 'currentColor'" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" /></slot>
  </svg>
</template>
