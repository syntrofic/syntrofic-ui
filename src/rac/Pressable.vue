<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Primitive } from 'reka-ui'

const props = withDefaults(defineProps<{
  as?: 'button' | 'a' | 'div' | 'span'
  asChild?: boolean
  disabled?: boolean
}>(), { as: 'button' })
const emit = defineEmits<{ press: [event: MouseEvent] }>()
const pressed = ref(false)
let removePointerListeners: (() => void) | undefined
const disabledAt = (element: EventTarget | null) => props.disabled || (element as HTMLElement | null)?.matches(':disabled, [aria-disabled="true"]') === true

function release() {
  pressed.value = false
  removePointerListeners?.()
  removePointerListeners = undefined
}

function pointerdown(event: PointerEvent) {
  if (disabledAt(event.currentTarget) || event.button !== 0 || !event.isPrimary) return
  release()
  pressed.value = true
  const owner = (event.currentTarget as HTMLElement).ownerDocument
  owner.addEventListener('pointerup', release, true)
  owner.addEventListener('pointercancel', release, true)
  removePointerListeners = () => {
    owner.removeEventListener('pointerup', release, true)
    owner.removeEventListener('pointercancel', release, true)
  }
}

function click(event: MouseEvent) {
  if (disabledAt(event.currentTarget)) {
    event.preventDefault()
    event.stopImmediatePropagation()
  } else if (!event.defaultPrevented) {
    emit('press', event)
  }
}

function native(element: HTMLElement, key: string) {
  return element.matches('button, input, select, textarea, summary') || (key === 'Enter' && element.matches('a[href]'))
}

function keydown(event: KeyboardEvent) {
  if (disabledAt(event.currentTarget) || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key !== ' ' && event.key !== 'Enter') return
  pressed.value = true
  const element = event.currentTarget as HTMLElement
  if (native(element, event.key)) return
  event.preventDefault()
  if (event.key === 'Enter' && !event.repeat) element.click()
}

function keyup(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  const activate = pressed.value && !disabledAt(event.currentTarget) && event.key === ' '
  release()
  const element = event.currentTarget as HTMLElement
  if (activate && !native(element, event.key)) {
    event.preventDefault()
    element.click()
  }
}

onBeforeUnmount(release)
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :type="as === 'button' && !asChild ? 'button' : undefined"
    :disabled="as === 'button' && !asChild ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    :role="!asChild && (as === 'div' || as === 'span') ? 'button' : undefined"
    :tabindex="disabled ? -1 : (!asChild && (as === 'div' || as === 'span') ? 0 : undefined)"
    :data-pressed="pressed || undefined"
    @click.capture="click"
    @pointerdown="pointerdown"
    @keydown="keydown"
    @keyup="keyup"
    @blur="release"
  ><slot :pressed="pressed" /></Primitive>
</template>
