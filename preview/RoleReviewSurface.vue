<script setup lang="ts">
import { useInteractiveRole } from '../src'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ href?: string; disabled?: boolean; action?: boolean }>()
const { semantic } = useInteractiveRole(() => ({ href: props.href, isDisabled: props.disabled, onActivate: props.action }))
</script>

<template>
  <component :is="semantic === 'link' ? 'a' : semantic === 'button' ? 'button' : 'span'" v-bind="$attrs"
    :type="semantic === 'button' ? 'button' : undefined" :href="semantic === 'link' ? href : undefined"
    :disabled="semantic === 'button' ? disabled : undefined" :data-resolved-role="semantic">
    <slot />
  </component>
</template>
