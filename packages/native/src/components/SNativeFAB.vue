<script setup lang="ts">
import { computed, useTemplateRef } from 'nativescript-vue'
import { compactActionSize, type NativeFabAction, type NativeFabDirection } from '../action-state'
import type { NativeButtonSize, NativeButtonVariant } from '../button'
import { useNativeUI } from '../context'
import type { NativeDialogCloseReason } from '../modal'
import SNativeButton from './SNativeButton.vue'
import SNativeFabMenuItem from './SNativeFabMenuItem.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePopover from './SNativePopover.vue'

const props = withDefaults(defineProps<{
  label: string
  closeLabel?: string
  actions?: readonly NativeFabAction[]
  disabled?: boolean
  size?: NativeButtonSize
  variant?: NativeButtonVariant
  position?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  direction?: NativeFabDirection
  offset?: number
  inset?: number
  buttonWidth?: number
  menuWidth?: number
  appearance?: 'together' | 'staggered'
  backdrop?: 'transparent' | 'dim' | 'blur'
  dismissOnOutside?: boolean
  closeOnAction?: boolean
  defaultOpen?: boolean
}>(), {
  actions: () => [], size: 'md', variant: 'primary', position: 'bottom-end', direction: 'auto',
  offset: 7, inset: 12, appearance: 'staggered', dismissOnOutside: true, closeOnAction: true,
})
const open = defineModel<boolean | undefined>('open', { default: undefined })
const visible = computed({ get: () => open.value ?? props.defaultOpen ?? false, set: value => { open.value = value } })
const emit = defineEmits<{ tap: []; action: [item: NativeFabAction]; opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
defineSlots<{
  start(props: { color: string; open: boolean }): unknown
  action(props: { action: NativeFabAction; run: () => void; close: () => void }): unknown
  default(props: { close: () => void }): unknown
}>()
const { direction: writingDirection } = useNativeUI()
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const rtl = computed(() => writingDirection.value === 'rtl')
const bottom = computed(() => props.position.startsWith('bottom'))
const end = computed(() => props.position.endsWith('end'))
const hasMenu = computed(() => props.actions.length > 0)
const side = computed(() => {
  if (props.direction === 'auto') return bottom.value ? 'top' : 'bottom'
  if (props.direction === 'up') return 'top'
  if (props.direction === 'down') return 'bottom'
  return (props.direction === 'end') !== rtl.value ? 'right' : 'left'
})
const horizontal = computed(() => side.value === 'left' || side.value === 'right')
const dimensions = computed(() => compactActionSize([props.label, props.closeLabel ?? props.label], props.size))
const width = computed(() => props.buttonWidth !== undefined && Number.isFinite(props.buttonWidth)
  ? Math.max(dimensions.value.height, props.buttonWidth) : dimensions.value.width)
const menuWidth = computed(() => props.menuWidth ?? (horizontal.value ? Math.min(260, Math.max(144, props.actions.length * 84)) : 146))

function tap() {
  if (!props.disabled) emit('tap')
}

function run(action: NativeFabAction, close: () => void) {
  if (props.disabled || action.disabled) return
  emit('action', action)
  if (props.closeOnAction) close()
}

const focus = () => trigger.value?.focus() ?? false
defineExpose({ focus })
</script>

<template>
  <GridLayout :horizontalAlignment="end !== rtl ? 'right' : 'left'" :verticalAlignment="bottom ? 'bottom' : 'top'"
    :width="width" :height="dimensions.height" :margin="Math.max(0, inset)" :iosOverflowSafeArea="false">
    <SNativePopover v-if="hasMenu || $slots.default" v-model:open="visible"
      :placement="side" :align="horizontal ? bottom ? 'end' : 'start' : end ? 'end' : 'start'" :disabled="disabled" :width="menuWidth" stretchTrigger
      :offset="offset" :inset="inset" :avoidCollisions="direction === 'auto'" :backdrop="backdrop" :dismissOnOutside="dismissOnOutside"
      @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('error', $event)">
      <template #trigger="{ open: show, close, visible: expanded }">
        <SNativeButton ref="trigger" :label="expanded ? closeLabel ?? label : label" :variant="variant" :size="size" :disabled="disabled"
          :pressed="expanded" fullWidth @tap="expanded ? close('cancel') : show(focus)">
          <template v-if="$slots.start" #start="{ color }"><slot name="start" :color="color" :open="expanded" /></template>
          <template v-if="closeLabel && closeLabel !== label" #label="state">
            <GridLayout>
              <Label v-for="text in [label, closeLabel]" :key="text" :text="text" :fontSize="state.size"
                textWrap="true" opacity="0" :accessibilityHidden="true" />
              <SNativeMotionText :value="state.label" :size="state.size" :color="state.color" horizontalAlignment="center" verticalAlignment="middle" />
            </GridLayout>
          </template>
        </SNativeButton>
      </template>
      <template #default="{ close }">
        <slot :close="() => close('cancel')">
          <StackLayout :orientation="horizontal ? 'horizontal' : 'vertical'">
            <SNativeFabMenuItem v-for="(item, index) in actions" :key="item.id"
              :delay="appearance === 'staggered' ? index * 40 : 0"
              :marginTop="!horizontal && index > 0 ? 3 : 0" :marginLeft="horizontal && index > 0 ? 3 : 0">
              <slot name="action" :action="item" :run="() => run(item, () => close('confirm'))" :close="() => close('confirm')">
                <SNativeButton :label="item.label" :accessibilityLabel="item.accessibilityLabel" size="sm"
                  :disabled="disabled || item.disabled" :fullWidth="!horizontal" variant="secondary" @tap="run(item, () => close('confirm'))" />
              </slot>
            </SNativeFabMenuItem>
          </StackLayout>
        </slot>
      </template>
    </SNativePopover>
    <SNativeButton v-else ref="trigger" :label="label" :size="size" :variant="variant" :disabled="disabled" fullWidth @tap="tap">
      <template v-if="$slots.start" #start="{ color }"><slot name="start" :color="color" :open="false" /></template>
    </SNativeButton>
  </GridLayout>
</template>
