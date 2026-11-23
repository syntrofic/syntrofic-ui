<script setup lang="ts" generic="Multiple extends boolean = false">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'
import type { AccordionItemData } from '../types'

const props = defineProps<{
  items: readonly AccordionItemData[]
  multiple?: Multiple & boolean
  disabled?: boolean
  keepMounted?: boolean
  direction?: 'ltr' | 'rtl'
  label?: string
}>()

type Open = Multiple extends true ? string[] : string
const model = defineModel<Open>()

function update(value: unknown) {
  const normalized = props.multiple
    ? Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
    : typeof value === 'string' ? value : undefined
  model.value = normalized as Open | undefined
}
</script>

<template>
  <AccordionRoot
    class="sy-accordion"
    :role="label ? 'group' : undefined"
    :aria-label="label"
    :type="multiple ? 'multiple' : 'single'"
    :model-value="model"
    :disabled="disabled"
    :dir="direction"
    :unmount-on-hide="!keepMounted"
    collapsible
    @update:model-value="update"
  >
    <AccordionItem v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled" class="sy-accordion__item">
      <AccordionHeader class="sy-disclosure__heading">
        <AccordionTrigger class="sy-disclosure__trigger">
          <slot name="title" :item="item">{{ item.label }}</slot>
          <span class="sy-disclosure__arrow" aria-hidden="true"></span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="sy-disclosure__content">
        <div class="sy-disclosure__body"><slot name="content" :item="item">{{ item.description }}</slot></div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
