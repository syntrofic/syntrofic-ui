<script setup lang="ts">
import { computed } from 'vue'
import STypography, { type DisplayTypographyRole, type HeadingLevel, type TypographyProps } from './STypography.vue'

export type HeadingProps = Omit<TypographyProps, 'as' | 'variant' | 'type'> & { level: HeadingLevel; type?: DisplayTypographyRole }
const props = withDefaults(defineProps<HeadingProps>(), { hasTruncateTooltip: true })
const tag = computed(() => `h${[1, 2, 3, 4, 5, 6].includes(props.level) ? props.level : 2}` as const)
const announcedLevel = computed(() => props.accessibilityLevel !== props.level ? props.accessibilityLevel : undefined)
const appearance = computed(() => {
  const { level: _level, accessibilityLevel: _accessibilityLevel, ...typography } = props
  return typography
})
</script>

<template>
  <STypography v-bind="appearance" :as="tag" :variant="tag" :data-heading-level="tag.slice(1)" :aria-level="announcedLevel">
    <slot />
  </STypography>
</template>
