<script setup lang="ts">
import { computed, onScopeDispose, useTemplateRef } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  size?: 'sm' | 'md' | 'lg'
  minWidth?: number | string
}>(), { size: 'md' })
const menu = useTemplateRef<HTMLElement>('menu')
const inlineSize = computed(() => typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth)
let search = ''
let timer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(timer))

function items() {
  return [...menu.value?.querySelectorAll<HTMLElement>('[data-sy-nav-menu-item]') ?? []]
    .filter(item => item.closest('.sy-nav-menu') === menu.value && !item.closest('[hidden], [inert]'))
}

function focusFirst(last = false) {
  const rows = items()
  rows.at(last ? -1 : 0)?.focus()
}

function keydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
  const rows = items()
  const index = rows.indexOf(event.target as HTMLElement)
  if (!rows.length || (index < 0 && event.target !== menu.value)) return
  const row = rows[index]
  let next: HTMLElement | undefined
  switch (event.key) {
    case 'ArrowDown': next = rows[(index + 1) % rows.length]; break
    case 'ArrowUp': next = rows[index > 0 ? index - 1 : rows.length - 1]; break
    case 'Home': next = rows[0]; break
    case 'End': next = rows.at(-1); break
    case 'Enter':
    case ' ':
      if (row) {
        event.preventDefault()
        row.click()
      }
      return
    default: {
      if (event.key.length !== 1) return
      const key = event.key.toLocaleLowerCase()
      search += key
      const prefix = [...search].every(letter => letter === key) ? key : search
      const offset = prefix.length === 1 ? index + 1 : Math.max(index, 0)
      const ordered = [...rows.slice(offset), ...rows.slice(0, offset)]
      next = ordered.find(item => item.dataset.syntroficText?.toLocaleLowerCase().startsWith(prefix))
      clearTimeout(timer)
      timer = setTimeout(() => { search = '' }, 650)
    }
  }
  if (!next) return
  event.preventDefault()
  next.focus()
}

defineExpose({ focusFirst })
</script>

<template>
  <div ref="menu" class="sy-nav-menu" role="menu" tabindex="0" :aria-label="label" :data-size="size"
    :style="{ '--sy-nav-menu-width': inlineSize }" @focus.self="focusFirst()" @keydown="keydown"><slot /></div>
</template>
