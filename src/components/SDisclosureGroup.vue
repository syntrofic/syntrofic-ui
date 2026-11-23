<script setup lang="ts">
import { computed, provide } from 'vue'
import { disclosureGroup } from '../internal/disclosure'
import { useListFocus } from '../internal/list-focus'

const props = defineProps<{
  label: string
  multiple?: boolean
  disabled?: boolean
  defaultValue?: string | readonly string[]
  dividers?: boolean
  density?: 'compact' | 'balanced' | 'spacious'
}>()
const selected = defineModel<readonly string[]>()
const initial = typeof props.defaultValue === 'string' ? [props.defaultValue] : props.defaultValue ?? []
const current = computed(() => selected.value ?? initial)
const opened = computed(() => new Set(props.multiple ? current.value : current.value.slice(0, 1)))
function setOpen(value: string, open: boolean) {
  if (open && !props.multiple) {
    selected.value = [value]
    return
  }
  const next = new Set(opened.value)
  if (open) next.add(value)
  else next.delete(value)
  selected.value = [...next]
}

provide(disclosureGroup, {
  isOpen: value => opened.value.has(value),
  isDisabled: () => Boolean(props.disabled),
  setOpen,
})

const { listRef, handleKeyDown } = useListFocus({ itemSelector: 'button[data-sy-disclosure-trigger]', boundarySelector: '.sy-disclosure-group' })
function navigate(event: KeyboardEvent) {
  if (event.target instanceof Element && event.target.matches('button[data-sy-disclosure-trigger]')) handleKeyDown(event)
}
</script>

<template>
  <div ref="listRef" class="sy-disclosure-group" role="group" :aria-label="label" :data-dividers="dividers || undefined"
    :data-density="density ?? (dividers ? 'balanced' : undefined)" @keydown="navigate"><slot /></div>
</template>
