<script setup lang="ts">
import { provide, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger, Primitive } from 'reka-ui'
import { useCollapsible } from '../internal/disclosure'
import { DisclosureStateContext, openState } from '../rac/state'

const props = defineProps<{
  title?: string
  value?: string
  defaultOpen?: boolean
  disabled?: boolean
  keepMounted?: boolean
  variant?: 'surface' | 'plain'
  headingLevel?: 2 | 3 | 4 | 5 | 6
}>()
const model = defineModel<boolean | undefined>('open', { default: undefined })
const trigger = useTemplateRef<ComponentPublicInstance>('trigger')
const body = useTemplateRef<HTMLDivElement>('body')
const { isOpen: open, setOpen: update, disabled: groupDisabled } = useCollapsible(() => ({
  value: props.value, isCollapsible: { isOpen: model.value ?? props.defaultOpen ?? false, onOpenChange: next => { model.value = next } },
}))
provide(DisclosureStateContext, openState(open, update))
watch(open, visible => {
  const panel = body.value
  if (!visible && panel?.contains(panel.ownerDocument.activeElement)) trigger.value?.$el.focus({ preventScroll: true })
})
</script>

<template>
  <CollapsibleRoot
    class="sy-disclosure"
    :data-variant="variant"
    :open="open"
    :disabled="disabled || groupDisabled"
    :unmount-on-hide="!keepMounted"
    @update:open="update"
  >
    <component :is="headingLevel ? `h${headingLevel}` : Primitive" :as-child="headingLevel ? undefined : true"
      :class="headingLevel ? 'sy-disclosure__heading' : undefined">
      <CollapsibleTrigger ref="trigger" class="sy-disclosure__trigger" data-sy-disclosure-trigger>
        <slot name="title">{{ title }}</slot>
        <span class="sy-disclosure__arrow" aria-hidden="true"></span>
      </CollapsibleTrigger>
    </component>
    <CollapsibleContent class="sy-disclosure__content" :inert="!open && !keepMounted">
      <div ref="body" class="sy-disclosure__body"><slot /></div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
