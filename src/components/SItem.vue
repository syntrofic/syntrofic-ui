<script setup lang="ts">
import { computed, defineComponent, mergeProps, useTemplateRef, watch, type Component } from 'vue'
import { contentUrl } from '../internal/content-url'
import { useClickableContainer } from '../internal/element-behavior'
import SItemSwipeFrame from '../internal/SItemSwipeFrame.vue'
import type { ItemSwipe } from '../internal/swipe'
import SLink from './SLink.vue'
import STypography from './STypography.vue'

const props = withDefaults(defineProps<{
  label: string; description?: string; as?: string | Component; align?: 'start' | 'center' | 'first-line'; density?: 'compact' | 'balanced' | 'spacious'
  labelLines?: number; descriptionLines?: number
  layout?: 'stacked' | 'inline'
  interactive?: boolean
  interactiveTarget?: () => HTMLElement | null | undefined
  href?: string
  target?: string
  rel?: string
  selected?: boolean
  highlighted?: boolean
  disabled?: boolean
  swipe?: ItemSwipe
  itemKey?: string | number
}>(), { as: 'div', align: 'center', density: 'balanced', labelLines: 1, layout: 'stacked', selected: undefined })
defineOptions({ inheritAttrs: false })
const RowOnly = defineComponent({ setup: (_, { slots }) => () => slots.default?.() })
const emit = defineEmits<{ activate: [event: MouseEvent] }>()
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const delegated = computed(() => Boolean(props.interactiveTarget))
const externalControl = computed(() => props.interactiveTarget?.())
const href = computed(() => delegated.value ? undefined : contentUrl(props.href))
const linkRoot = computed(() => Boolean(href.value && props.as === 'a'))
const actionable = computed(() => delegated.value || Boolean(href.value || props.interactive))
const swipeList = computed(() => Boolean(props.swipe && props.as === 'li'))
const surface = useClickableContainer(() => ({
  interactive: externalControl.value ?? trigger.value,
  href: href.value, target: props.target, disabled: props.disabled || linkRoot.value,
  onClick: href.value ? event => emit('activate', event) : undefined,
}))
function activate(event: MouseEvent) {
  if (props.disabled) { event.preventDefault(); return }
  emit('activate', event)
}
watch([externalControl, () => props.selected], ([node, selected], _, cleanup) => {
  if (!node || !selected || node.hasAttribute('aria-current')) return
  node.setAttribute('aria-current', 'true')
  cleanup(() => { if (node.getAttribute('aria-current') === 'true') node.removeAttribute('aria-current') })
}, { flush: 'post' })
</script>

<template>
  <component :is="swipe ? SItemSwipeFrame : RowOnly" v-bind="swipe ? { swipe, itemKey, disabled, as: swipeList ? 'li' : 'div', 'data-reorder-key': itemKey } : {}">
  <component :is="linkRoot ? SLink : swipeList ? 'div' : as" class="sy-item" :data-align="align" :data-density="density" :data-layout="layout"
    :data-clickable="actionable || undefined" :data-highlighted="highlighted || undefined" :data-selected="selected || undefined" :data-disabled="disabled || undefined"
    :data-reorder-key="swipe ? undefined : itemKey"
    v-bind="mergeProps($attrs, linkRoot ? { href, target, rel, disabled, 'aria-current': selected ? 'page' : undefined, onClick: activate }
      : actionable ? surface : {})">
    <span v-if="$slots.marker" class="sy-item__marker"><slot name="marker" /></span>
    <span v-if="$slots.start" class="sy-item__start"><slot name="start" /></span>
    <span class="sy-item__body">
      <STypography as="span" class="sy-item__label" :max-lines="labelLines"><slot name="label">{{ label }}</slot></STypography>
      <STypography v-if="description || $slots.description" as="span" variant="body-sm" tone="muted" :max-lines="descriptionLines">
        <slot name="description">{{ description }}</slot>
      </STypography>
    </span>
    <span v-if="$slots.end" class="sy-item__end"><slot name="end" /></span>
    <slot />
    <SLink v-if="actionable && !delegated && !linkRoot && href && !disabled" class="sy-item__control sy-visually-hidden"
      :href="href" :target="target" :rel="rel" :aria-label="label" :aria-current="selected ? 'page' : undefined" @click="activate" />
    <button v-else-if="actionable && !delegated && !linkRoot" ref="trigger" type="button" class="sy-item__control sy-visually-hidden"
      :role="href ? 'link' : undefined" :aria-label="label" :aria-disabled="disabled || undefined"
      :aria-pressed="href ? undefined : selected" @click="activate" />
  </component>
  </component>
</template>
