<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const group = useTemplateRef<HTMLDivElement>('group')
let focused: HTMLElement | null = null
let observer: ResizeObserver | undefined

function measure() {
  const root = group.value
  if (!root || !focused) return
  const bounds = root.getBoundingClientRect()
  const anchor = focused.closest<HTMLElement>('.sy-input-group, [data-sy-focus-anchor]') ?? focused
  const control = anchor.getBoundingClientRect()
  root.style.setProperty('--sy-focus-x', `${control.left - bounds.left + root.scrollLeft - root.clientLeft}px`)
  root.style.setProperty('--sy-focus-y', `${control.top - bounds.top + root.scrollTop - root.clientTop}px`)
  root.style.setProperty('--sy-focus-width', `${control.width}px`)
  root.style.setProperty('--sy-focus-height', `${control.height}px`)
  root.style.setProperty('--sy-focus-radius', getComputedStyle(anchor).borderRadius)
}

function control(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null
  return target.matches('[data-sy-focus-target]') && target.closest('.sy-focus-group') === group.value ? target : null
}

function focusIn(event: FocusEvent) {
  const next = control(event.target)
  const root = group.value
  if (!next || !root) return
  root.toggleAttribute('data-moving', Boolean(focused))
  if (focused) observer?.unobserve(focused)
  focused = next
  observer?.observe(next)
  measure()
  root.dataset.active = ''
}

function focusOut(event: FocusEvent) {
  if (!focused || event.target !== focused || control(event.relatedTarget)) return
  observer?.unobserve(focused)
  focused = null
  group.value?.removeAttribute('data-active')
  group.value?.removeAttribute('data-moving')
}

onMounted(() => {
  if (!group.value || typeof ResizeObserver !== 'function') return
  observer = new ResizeObserver(measure)
  observer.observe(group.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="group" class="sy-focus-group" @focusin="focusIn" @focusout="focusOut" @scroll.capture="measure">
    <slot />
    <span class="sy-focus-group__ring" aria-hidden="true"></span>
  </div>
</template>
