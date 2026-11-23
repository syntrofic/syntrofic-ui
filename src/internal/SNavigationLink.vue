<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useLinkComponent } from './link-component'
import type { NavigationItem } from './shell-layout'

const props = defineProps<{ item: NavigationItem; current?: boolean; compact?: boolean; as?: string | Component }>()
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const Link = useLinkComponent(() => props.as ?? props.item.as)
const href = computed(() => props.item.disabled ? undefined : props.item.href)

function activate(event: MouseEvent) {
  if (props.item.disabled || event.defaultPrevented || event.button !== 0 ||
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (href.value && props.item.target && props.item.target !== '_self') return
  emit('activate', props.item, event)
}
</script>

<template>
  <component
    :is="href ? Link : 'button'"
    class="sy-navigation-link"
    :type="href ? undefined : 'button'"
    :href="href"
    :target="href ? item.target : undefined"
    :disabled="item.disabled || undefined"
    :aria-disabled="item.disabled || undefined"
    :aria-current="current ? 'page' : undefined"
    :aria-label="compact ? item.label : undefined"
    :title="compact ? item.label : undefined"
    @click="activate"
  >
    <slot />
  </component>
</template>
