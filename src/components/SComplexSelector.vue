<script setup lang="ts" generic="Value">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { computed, nextTick, onMounted, onScopeDispose, onUpdated, shallowRef, toRaw, useId, useTemplateRef, watch } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverRoot } from 'reka-ui'
import { joinIds } from '../internal/field'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'
import type { FieldStatus } from '../internal/status-icon'
import SFieldStatus from './SFieldStatus.vue'
import SIcon from './SIcon.vue'
import SInfoTip from './SInfoTip.vue'
import SLabel from './SLabel.vue'
import SSpinner from './SSpinner.vue'
import STooltip from './STooltip.vue'

const props = withDefaults(defineProps<{
  label: string
  triggerLabel?: string
  placeholder?: string
  description?: string
  labelTooltip?: string
  labelHidden?: boolean
  optional?: boolean
  optionalLabel?: string
  required?: boolean
  disabled?: boolean
  disabledMessage?: string
  loading?: boolean
  status?: FieldStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'input' | 'secondary' | 'ghost'
  startIcon?: string
  width?: LayoutSize
  popupWidth?: LayoutSize
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  changeAction?: (value: Value) => void | Promise<void>
  failureMessage?: string
}>(), { placeholder: 'Select an option', optionalLabel: 'Optional', size: 'md', variant: 'input', side: 'bottom', align: 'start', failureMessage: 'Could not save the selection.' })
const model = defineModel<Value>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  change: [value: Value]
  changeError: [error: unknown, attempted: Value]
  openChange: [open: boolean]
  click: [event: MouseEvent]
  keydown: [event: KeyboardEvent]
}>()
const host = useTemplateRef<HTMLElement>('host')
const element = shallowRef<HTMLElement | null>(null)
const pending = shallowRef(false)
const failure = shallowRef(false)
const busy = computed(() => props.loading || pending.value)
const visible = computed(() => open.value && !props.disabled)
const id = `sy-complex-select-${useId()}`
const controlId = `${id}-control`
const panelId = `${id}-panel`
const labelId = `${id}-label`
const hintId = `${id}-hint`
const reasonId = `${id}-reason`
const statusId = `${id}-status`
let restoreFocus = false
let transaction = 0
onScopeDispose(() => { transaction++ })

const result = computed<FieldStatus | undefined>(() => failure.value ? { type: 'error', message: props.failureMessage } : props.status)
const treatment = computed(() => props.statusVariant === 'tooltip' ? 'tooltip'
  : props.variant !== 'input' ? 'detached' : props.statusVariant ?? result.value?.variant ?? 'attached')
const attrs = computed(() => ({
  id: controlId, role: 'combobox' as const, tabindex: 0, 'aria-labelledby': labelId, 'aria-haspopup': 'dialog' as const,
  'aria-controls': visible.value ? panelId : undefined, 'aria-expanded': visible.value,
  'aria-disabled': props.disabled || undefined, 'aria-busy': busy.value || undefined,
  'aria-required': props.required || undefined, 'aria-invalid': result.value?.type === 'error' || undefined,
  'aria-describedby': joinIds(props.description ? hintId : undefined, props.disabled && props.disabledMessage ? reasonId : undefined, result.value?.message ? statusId : undefined),
  onClick: click, onKeydown: keydown,
}))

function syncAnchor() { element.value = host.value?.ownerDocument.getElementById(controlId) ?? null }
onMounted(syncAnchor)
onUpdated(syncAnchor)
watch(visible, next => emit('openChange', next))
watch(() => props.disabled, disabled => { if (disabled) open.value = false })

function show() {
  if (props.disabled || busy.value) return
  open.value = true
}

function close(focus = true) {
  restoreFocus = focus
  open.value = false
}

function toggle() {
  if (visible.value) close()
  else show()
}

function click(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented) toggle()
}

function keydown(event: KeyboardEvent) {
  if (!event.defaultPrevented && !props.disabled && !busy.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault()
    show()
  }
  emit('keydown', event)
}

function closed(event: Event) {
  event.preventDefault()
  if (restoreFocus) element.value?.focus({ preventScroll: true })
  restoreFocus = false
}

async function commit(next: Value) {
  if (busy.value || props.disabled) return false
  const prior = model.value
  const operation = ++transaction
  failure.value = false
  model.value = next
  emit('change', next)
  if (!props.changeAction) return true
  pending.value = true
  try {
    await props.changeAction(next)
    return operation === transaction
  } catch (error) {
    if (operation === transaction) {
      await nextTick()
      if (operation !== transaction) return false
      if (Object.is(toRaw(model.value), toRaw(next))) model.value = prior
      failure.value = true
      emit('changeError', error, next)
    }
    return false
  } finally {
    if (operation === transaction) pending.value = false
  }
}

defineExpose({ open: show, close, toggle, isOpen: () => visible.value })
const collisionPadding = useLayerCollisionPadding(12)
</script>

<template>
  <div ref="host" class="sy-complex-select" :data-variant="variant" :data-size="size" :style="{ inlineSize: layoutSize(width) }">
    <div class="sy-complex-select__label" :class="{ 'sy-visually-hidden': labelHidden || $slots.trigger }">
      <SLabel :id="labelId" :for="controlId">{{ label }}</SLabel>
      <small v-if="optional && !required">{{ optionalLabel }}</small>
      <SInfoTip v-if="labelTooltip && !labelHidden && !$slots.trigger" :label="label" :text="labelTooltip" />
    </div>
    <PopoverRoot :open="visible" @update:open="$event ? show() : close(false)">
      <PopoverAnchor :reference="element ?? undefined"><span hidden /></PopoverAnchor>
      <div class="sy-complex-select__control" :data-custom="Boolean($slots.trigger) || undefined">
        <STooltip :text="disabledMessage" :disabled="!disabled || !disabledMessage">
          <template #trigger>
            <slot name="trigger" :attrs="attrs" :open="visible" :value="model" :busy="busy">
              <button v-bind="attrs" type="button" class="sy-complex-select__trigger" :data-placeholder="!triggerLabel && model === undefined || undefined">
                <slot name="start"><SIcon v-if="startIcon" :icon="startIcon" /></slot>
                <span class="sy-complex-select__value"><slot name="value" :value="model">{{ triggerLabel ?? model ?? placeholder }}</slot></span>
                <SSpinner v-if="busy" decorative size="sm" />
                <SIcon v-else icon="chevronDown" />
              </button>
            </slot>
          </template>
        </STooltip>
        <SInfoTip v-if="treatment === 'tooltip' && result?.message" :label="result.message" :text="result.message" />
      </div>
      <PopoverContent as-child :side="side" :align="align" :side-offset="6" :collision-padding="collisionPadding"
        @close-auto-focus="closed" @escape-key-down.prevent="close()"
        @interact-outside="event => { if (element?.contains(event.target as Node)) event.preventDefault() }">
        <div :id="panelId" class="sy-floating-panel sy-complex-select__panel" role="dialog" :aria-label="label"
          :style="{ '--sy-complex-panel-width': layoutSize(popupWidth) }" :aria-busy="busy || undefined">
          <slot :value="model" :commit="commit" :close="close" :busy="busy" :error="failure" />
        </div>
      </PopoverContent>
    </PopoverRoot>
    <SFieldStatus v-if="result && treatment !== 'tooltip'" v-bind="result" :id="statusId" :variant="treatment" />
    <span v-else-if="result" :id="statusId" hidden>{{ result.message }}</span>
    <span v-if="description" :id="hintId" class="sy-complex-select__description">{{ description }}</span>
    <span v-if="disabled && disabledMessage" :id="reasonId" hidden>{{ disabledMessage }}</span>
  </div>
</template>
