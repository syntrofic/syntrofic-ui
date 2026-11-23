<script setup lang="ts">
import { computed, inject, useId, type Component } from 'vue'
import SNavigationLink from '../internal/SNavigationLink.vue'
import { megaMenuSelect } from '../internal/shell-layout'
import SNavIcon from './SNavIcon.vue'

const props = withDefaults(defineProps<{ title: string; description?: string; icon?: string; href?: string; closeOnSelect?: boolean; as?: string | Component }>(), {
  closeOnSelect: true,
})
const emit = defineEmits<{ select: [event: MouseEvent] }>()
const select = inject(megaMenuSelect, undefined)
const id = `sy-mega-nav-note-${useId()}`
const destination = computed(() => ({ id, label: props.title, href: props.href }))

function activate(_: unknown, event: MouseEvent) {
  emit('select', event)
  select?.(event, props.closeOnSelect)
}
</script>

<template>
  <li class="sy-top-nav-mega-item">
    <SNavigationLink :item="destination" :as="as" :aria-label="title" :aria-describedby="description ? id : undefined" @activate="activate">
      <SNavIcon v-if="icon || $slots.icon" :icon="icon"><template v-if="$slots.icon" #default><slot name="icon" /></template></SNavIcon>
      <span class="sy-top-nav-mega-item__copy">
        <strong>{{ title }}</strong>
        <small v-if="description" :id="id">{{ description }}</small>
      </span>
    </SNavigationLink>
  </li>
</template>
