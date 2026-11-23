<script setup lang="ts">
import { inject, useId } from 'vue'
import { useLinkComponent } from '../internal/link-component'
import { navMenuCommit } from '../internal/shell-layout'
import SNavIcon from './SNavIcon.vue'
import SInlineLabel from '../internal/SInlineLabel'

const props = defineProps<{
  label: string
  description?: string
  icon?: string
  href?: string
  target?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ select: [event: MouseEvent] }>()
const detailId = `sy-nav-menu-detail-${useId()}`
const Link = useLinkComponent()
const commit = inject(navMenuCommit, undefined)

function select(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  if (event.defaultPrevented) return
  emit('select', event)
  if (!event.defaultPrevented) commit?.()
}
</script>

<template>
  <component :is="href && !disabled ? Link : 'div'" role="menuitem" tabindex="-1" class="sy-nav-menu__item"
    data-sy-nav-menu-item :data-syntrofic-text="label" :aria-label="label" :aria-disabled="disabled || undefined"
    :aria-describedby="description || $slots.description ? detailId : undefined"
    v-bind="href && !disabled ? { href, target } : {}" @click="select">
    <SNavIcon v-if="icon || $slots.icon" :icon="icon"><template v-if="$slots.icon" #default><slot name="icon" /></template></SNavIcon>
    <span class="sy-nav-menu__copy">
      <SInlineLabel class="sy-nav-menu__label" :text="label"><template v-if="$slots.default" #default><slot /></template></SInlineLabel>
      <small v-if="description || $slots.description" :id="detailId" class="sy-nav-menu__description"><slot name="description">{{ description }}</slot></small>
    </span>
  </component>
</template>
