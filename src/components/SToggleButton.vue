<script setup lang="ts">
import { computed, inject, mergeProps, onBeforeUnmount, shallowRef, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import { Toggle, ToggleGroupItem } from 'reka-ui'
import { onFormReset } from '../internal/form-reset'
import { usePressFeedback } from '../internal/press-feedback'
import { toolbarContext } from '../internal/toolbar-context'
import { toggleButtonGroupContext } from '../internal/toggle-button-group'
import type { ButtonElevation, ButtonSize } from '../types'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SSpinner from './SSpinner.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  disabled?: boolean
  label?: string
  pressedLabel?: string
  icon?: string
  pressedIcon?: string
  pressedIconVariant?: string
  pressedTone?: 'accent' | 'info' | 'warning' | 'danger'
  iconOnly?: boolean
  loading?: boolean
  size?: ButtonSize
  value?: string
  elevation?: ButtonElevation
  pressedChangeAction?: (pressed: boolean, event: MouseEvent, signal: AbortSignal) => void | PromiseLike<void>
}>()
const emit = defineEmits<{
  pressedChange: [pressed: boolean, event: MouseEvent]
  actionError: [error: unknown]
}>()
const selected = defineModel<boolean | undefined>('modelValue', { default: undefined })
const toolbar = inject(toolbarContext, null)
const group = inject(toggleButtonGroupContext, null)
const grouped = computed(() => Boolean(group && props.value !== undefined))
const groupPressed = computed(() => {
  const member = props.value
  const value = group?.selected.value
  return member !== undefined && (Array.isArray(value) ? value.includes(member) : value === member)
})
const disabled = computed(() => props.disabled || (grouped.value && group?.disabled.value) || toolbar?.disabled.value)
const pending = shallowRef<{ value: boolean; controller: AbortController }>()
const active = computed(() => grouped.value ? groupPressed.value : pending.value?.value ?? selected.value ?? false)
const busy = computed(() => props.loading || Boolean(pending.value))
const toggleProps = computed(() => grouped.value ? { value: props.value } : { modelValue: selected.value ?? false })
const glyph = computed(() => active.value ? props.pressedIcon ?? props.icon : props.icon)
const glyphVariant = computed(() => active.value ? props.pressedIconVariant : undefined)
const visibleLabel = computed(() => (active.value ? props.pressedLabel : undefined) ?? props.label ?? '')
const press = usePressFeedback()
const root = useTemplateRef<ComponentPublicInstance>('root')
const button = () => root.value?.$el?.nodeType === 1 ? root.value.$el as HTMLButtonElement : null

function cancelPending() {
  const previous = pending.value
  pending.value = undefined
  previous?.controller.abort()
}

watch(selected, cancelPending, { flush: 'sync' })
watch(grouped, cancelPending, { flush: 'sync' })
watch(disabled, unavailable => { if (unavailable) cancelPending() }, { flush: 'sync' })
onFormReset(button, cancelPending)
onBeforeUnmount(cancelPending)

function guardActivation(event: MouseEvent) {
  if (props.loading || disabled.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  const element = event.currentTarget as HTMLElement
  if (event.detail > 0 && element.ownerDocument.activeElement !== element) {
    element.focus({ preventScroll: true })
  }
}

async function activate(event: MouseEvent) {
  if (grouped.value || event.defaultPrevented) return
  const value = !active.value
  emit('pressedChange', value, event)
  if (event.defaultPrevented) return
  const action = props.pressedChangeAction
  if (!action) {
    cancelPending()
    selected.value = value
    return
  }

  const previous = pending.value
  const request = { value, controller: new AbortController() }
  pending.value = request
  previous?.controller.abort()
  if (request.controller.signal.aborted) return
  try {
    const result = action(value, event, request.controller.signal)
    if (result) await result
    if (pending.value !== request) return
    pending.value = undefined
    selected.value = value
  } catch (error) {
    if (pending.value !== request) return
    pending.value = undefined
    emit('actionError', error)
  }
}
</script>

<template>
  <component
    :is="grouped ? ToggleGroupItem : Toggle"
    ref="root"
    class="sy-toggle sy-press-background"
    v-bind="mergeProps($attrs, press, toggleProps)"
    :disabled="disabled"
    :aria-pressed="active"
    :aria-label="label ?? $attrs['aria-label']"
    :aria-busy="busy || $attrs['aria-busy']"
    :aria-disabled="loading || $attrs['aria-disabled']"
    :data-size="size ?? (grouped ? group?.size.value : undefined) ?? toolbar?.size.value ?? 'md'"
    :data-sy-toggle-member="grouped ? '' : undefined"
    :data-elevation="elevation ?? 'none'"
    :data-sy-interruptible="pending && !loading ? '' : undefined"
    :data-state="active ? 'on' : 'off'"
    :data-pressed-tone="pressedTone"
    :data-icon-only="iconOnly || undefined"
    @click.capture="guardActivation"
    @click="activate"
  >
    <Transition name="sy-toggle-glyph-track">
      <span v-if="icon || pressedIcon || busy" class="sy-toggle__glyph" aria-hidden="true">
        <Transition name="sy-toggle-glyph">
          <SSpinner v-if="busy" key="loading" size="sm" decorative />
          <SIcon v-else-if="glyph" :key="[glyph, glyphVariant].join(':')" :name="glyph" :variant="glyphVariant" />
        </Transition>
      </span>
    </Transition>
    <span v-if="$slots.default || label" :class="{ 'sy-visually-hidden': iconOnly, 'sy-toggle__label': !iconOnly && !$slots.default }">
      <slot :pressed="active">
        <span v-if="!iconOnly" class="sy-toggle__label-space" aria-hidden="true">{{ label }}</span>
        <span v-if="!iconOnly && pressedLabel" class="sy-toggle__label-space" aria-hidden="true">{{ pressedLabel }}</span>
        <SMotionText :value="visibleLabel" />
      </slot>
    </span>
  </component>
</template>
