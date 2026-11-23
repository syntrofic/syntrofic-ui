<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { useThemeScopeId, type PortalTheme } from './portal-theme'
import { reducedMotionContext } from './reduced-motion'

const props = defineProps<{ theme?: PortalTheme; persistent?: boolean }>()
const scope = useThemeScopeId()
const rules = computed(() => props.theme?.rules?.(scope.selector))
const inherited = inject(reducedMotionContext, null)
const reduced = computed(() => props.theme?.reducedMotion === true || inherited?.value === true)
provide(reducedMotionContext, reduced)
</script>

<template>
  <div v-if="theme || persistent" data-sy-portal-scope :data-sy-scope-id="scope.id" :data-sy-brand="theme?.brand" :data-sy-theme="theme?.mode"
    :data-sy-reduced-motion="reduced || undefined" :style="[theme?.style, { display: 'contents' }]">
    <component :is="'style'" v-if="rules" v-html="rules" />
    <slot />
  </div>
  <slot v-else />
</template>
