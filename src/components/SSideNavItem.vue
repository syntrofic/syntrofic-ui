<script setup lang="ts">
import { computed, inject, provide, useId, useTemplateRef, watch, type Component } from 'vue'
import { mobileNavClose, sideNavDepth } from '../internal/shell-layout'
import SNavigationLink from '../internal/SNavigationLink.vue'
import SInlineLabel from '../internal/SInlineLabel'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  label: string
  href?: string
  target?: string
  as?: string | Component
  icon?: string
  selectedIcon?: string
  shortLabel?: string
  current?: boolean
  disabled?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
  rail?: boolean
  expandLabel?: string
  size?: 'sm' | 'md' | 'lg'
}>(), { defaultExpanded: true, expandLabel: 'Submenu:', size: 'md' })
const expanded = defineModel<boolean | undefined>('expanded', { default: undefined })
const emit = defineEmits<{ activate: [event: MouseEvent] }>()
const id = `sy-side-nav-item-${useId()}`
const depth = inject(sideNavDepth, 0)
provide(sideNavDepth, depth + 1)
const dismiss = inject(mobileNavClose, undefined)
const content = useTemplateRef('children')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')
const open = computed(() => !props.rail && (!props.collapsible || (expanded.value ?? props.defaultExpanded)))
const item = computed(() => ({ id, label: props.label, href: props.href, target: props.target, disabled: props.disabled }))
const iconName = computed(() => props.current ? props.selectedIcon ?? props.icon : props.icon)

watch(open, visible => {
  const container = content.value
  if (!visible && container?.contains(container.ownerDocument.activeElement)) toggle.value?.focus({ preventScroll: true })
}, { flush: 'sync' })

function activate(_: unknown, event: MouseEvent) {
  emit('activate', event)
  if (!event.defaultPrevented) dismiss?.()
}
</script>

<template>
  <li class="sy-side-nav-item" :data-size="size" :data-rail="rail || undefined" :style="{ '--sy-side-indent': `${depth * 11}px` }">
    <div class="sy-sidebar__row">
      <SNavigationLink :item="item" :as="as" :current="current" :compact="rail" @activate="activate">
        <slot name="icon" :current="current"><SIcon v-if="iconName && !rail" :name="iconName" /></slot>
        <SInlineLabel class="sy-sidebar__name" :text="label"><template v-if="$slots.default" #default><slot /></template></SInlineLabel>
        <span v-if="rail" class="sy-sidebar__short" aria-hidden="true">
          <slot name="rail"><SIcon v-if="iconName" :name="iconName" /><template v-else>{{ shortLabel ?? Array.from(label)[0] }}</template></slot>
        </span>
        <span v-else-if="$slots.end" class="sy-side-nav-item__end"><slot name="end" /></span>
      </SNavigationLink>
      <button v-if="$slots.children && collapsible && !rail" ref="toggle" class="sy-sidebar__expand" type="button"
        :aria-label="`${expandLabel} ${label}`" :aria-expanded="open" :aria-controls="id" @click="expanded = !open">
        <span aria-hidden="true" />
      </button>
      <div v-if="$slots.actions && !rail" class="sy-side-nav-item__actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.children" :id="id" ref="children" class="sy-sidebar__reveal" :data-open="open || undefined"
      :inert="!open" :aria-hidden="!open || undefined">
      <div class="sy-sidebar__reveal-inner"><slot name="children" /></div>
    </div>
  </li>
</template>
