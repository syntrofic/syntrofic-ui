<script setup lang="ts">
import { inject, useSlots, useTemplateRef, watch } from 'vue'
import type { BreadcrumbItem } from '../types'
import { breadcrumbSeparator } from '../internal/breadcrumb-context'
import type { LinkComponent } from '../internal/link-component'
import { createAnimator } from '../internal/motion'
import SButton from './SButton.vue'
import SDropdown from './SDropdown.vue'
import SIcon from './SIcon.vue'
import SLink from './SLink.vue'

const props = defineProps<Omit<BreadcrumbItem, 'id' | 'label'> & { label?: string; as?: LinkComponent }>()
const emit = defineEmits<{ activate: [event: MouseEvent]; action: [id: string] }>()
const separator = inject(breadcrumbSeparator, undefined)
const text = useTemplateRef<HTMLSpanElement>('text')
const slots = useSlots()
watch(() => props.label, (_, __, cleanup) => {
  if (slots.default || !text.value || typeof text.value.animate !== 'function') return
  const animator = createAnimator(text.value)
  animator.animate('label', [{ opacity: .45, translate: '0 3px' }, { opacity: 1, translate: '0 0' }], { role: 'enter', reducedMotion: 'fade' })
  cleanup(animator.dispose)
}, { flush: 'post' })
</script>

<template>
  <li class="sy-crumbs__item">
    <span class="sy-crumbs__separator" aria-hidden="true"><slot name="separator">{{ separator ?? '/' }}</slot></span>
    <SDropdown v-if="(menu || $slots.menu) && !current" :label="label ?? 'Choose destination'"
      :items="menu" :disabled="disabled" @action="emit('action', $event)">
      <template #trigger>
        <SButton class="sy-crumbs__control" variant="ghost" size="sm">
          <span v-if="icon || $slots.icon" class="sy-crumbs__icon" aria-hidden="true"><slot name="icon"><SIcon :name="icon" size="sm" /></slot></span>
          <span ref="text" class="sy-crumbs__label" :title="label"><slot>{{ label }}</slot></span>
          <SIcon name="chevronDown" size="sm" class="sy-crumbs__chevron" />
        </SButton>
      </template>
      <template v-if="$slots.menu" #default><slot name="menu" /></template>
    </SDropdown>
    <component
      v-else
      :is="!current && href ? SLink : !current && actionable ? 'button' : 'span'"
      class="sy-crumbs__control"
      :href="!current ? href : undefined"
      :as="!current && href ? as : undefined"
      :target="!current ? target : undefined"
      :type="!current && actionable && !href ? 'button' : undefined"
      :disabled="!current && (href || actionable) ? disabled : undefined"
      :aria-current="current ? 'page' : undefined"
      @click="!current && !disabled && (href || actionable) && emit('activate', $event)"
    >
      <span v-if="icon || $slots.icon" class="sy-crumbs__icon" aria-hidden="true"><slot name="icon"><SIcon :name="icon" size="sm" /></slot></span>
      <span ref="text" class="sy-crumbs__label" :title="label"><slot>{{ label }}</slot></span>
    </component>
  </li>
</template>
