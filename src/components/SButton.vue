<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { buttonGroup } from '../internal/button-group'
import { toolbarContext } from '../internal/toolbar-context'
import { usePressFeedback } from '../internal/press-feedback'
import { useLinkComponent, type LinkComponent, type LinkDestination } from '../internal/link-component'
import type { ButtonElevation, ButtonSize, ButtonVariant } from '../types'
import SInlineLabel from '../internal/SInlineLabel'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  elevation?: ButtonElevation
  iconOnly?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  clickAction?: (event: MouseEvent, signal: AbortSignal) => void | PromiseLike<void>
  interruptible?: boolean
  href?: LinkDestination
  to?: LinkDestination
  as?: LinkComponent
  rel?: string
  target?: string
}>(), {
  type: 'button',
})

const emit = defineEmits<{ actionError: [error: unknown] }>()
const group = inject(buttonGroup, null)
const toolbar = inject(toolbarContext, null)
const pressable = usePressFeedback()
const Link = useLinkComponent(() => props.as)
const hasLink = computed(() => props.href !== undefined || props.to !== undefined || props.as !== undefined)
const pending = shallowRef<AbortController>()
const busy = computed(() => props.loading || Boolean(pending.value))
const blocked = computed(() => busy.value && !props.interruptible)
const attributes = computed(() => {
  const disabled = props.disabled || group?.disabled || toolbar?.disabled.value
  return hasLink.value ? { ...pressable, href: props.href, to: props.to, rel: props.rel, target: props.target, disabled: disabled || (props.loading && !props.interruptible) }
    : { ...pressable, disabled, type: props.type }
})
const spinnerSlot = useTemplateRef<HTMLSpanElement>('spinnerSlot')
const spinning = ref(busy.value)

watch(busy, async (loading, _, onCleanup) => {
  if (loading) {
    spinning.value = true
    return
  }
  let current = true
  onCleanup(() => { current = false })
  await nextTick()
  const transitions = spinnerSlot.value?.getAnimations() ?? []
  await Promise.allSettled(transitions.map(animation => animation.finished))
  if (current) spinning.value = false
})

function guardActivation(event: MouseEvent) {
  if (blocked.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  const button = event.currentTarget as HTMLButtonElement
  if (event.detail > 0 && button.ownerDocument.activeElement !== button) {
    button.focus({ preventScroll: true })
  }
}

async function invokeAction(event: MouseEvent) {
  if (!props.clickAction || event.defaultPrevented || blocked.value) return
  const earlier = pending.value
  const action = new AbortController()
  pending.value = action
  earlier?.abort()
  if (action.signal.aborted) return
  try {
    const result = props.clickAction(event, action.signal)
    if (result) await result
  } catch (error) {
    if (!action.signal.aborted) emit('actionError', error)
  } finally {
    if (pending.value === action) pending.value = undefined
  }
}

onBeforeUnmount(() => pending.value?.abort())
</script>

<template>
  <component
    :is="hasLink ? Link : 'button'"
    v-bind="attributes"
    class="sy-button"
    :data-variant="variant ?? group?.variant ?? 'primary'"
    :data-size="size ?? group?.size ?? toolbar?.size.value ?? 'md'"
    :data-elevation="group ? 'none' : elevation ?? 'none'"
    :data-icon-only="iconOnly || undefined"
    :aria-disabled="blocked || undefined"
    :aria-busy="busy || undefined"
    :data-loading="busy || undefined"
    @click.capture="guardActivation"
    @click="invokeAction"
  >
    <span class="sy-button__inner">
      <span v-if="$slots.start" class="sy-button__start"><slot name="start" /></span>
      <span ref="spinnerSlot" class="sy-button__spinner-slot" aria-hidden="true">
        <span class="sy-button__spinner" :data-spinning="spinning || undefined" />
      </span>
      <SInlineLabel class="sy-button__label"><slot /></SInlineLabel>
      <span v-if="$slots.end && !iconOnly" class="sy-button__end"><slot name="end" /></span>
    </span>
  </component>
</template>
