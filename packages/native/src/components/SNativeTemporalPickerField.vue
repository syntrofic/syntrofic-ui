<script setup lang="ts">
import { computed, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import type { NativeDialogCloseReason } from '../modal'
import type { NativeTemporalPickerOptions } from '../temporal-picker'
import SNativeButton from './SNativeButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeDialog from './SNativeDialog.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativePopover from './SNativePopover.vue'

const props = withDefaults(defineProps<NativeTemporalPickerOptions & { display: string; hasValue?: boolean; status?: string }>(), { clearLabel: 'Clear selection' })
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ clear: []; opening: []; opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
const overlayView = useTemplateRef<InstanceType<typeof SNativePopover> | InstanceType<typeof SNativeDialog>>('overlayView')
const button = useTemplateRef<InstanceType<typeof SNativeButton>>('button')
const { direction } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
const disabled = computed(() => props.disabled || props.readonly)
const dialog = computed(() => props.overlay?.presentation === 'dialog')
const overlayOptions = computed(() => dialog.value ? {
  maxWidth: typeof props.overlay?.width === 'number' ? props.overlay.width : 356,
  dismissOnOutside: props.overlay?.dismissOnOutside, dismissOnBack: props.overlay?.dismissOnBack,
} : { width: 336, maxHeight: 468, ...props.overlay, stretchTrigger: true, detents: props.detents })

function show() {
  if (disabled.value || open.value) return
  emit('opening')
  overlayView.value?.show(() => button.value?.focus())
}
function close(reason: NativeDialogCloseReason = 'programmatic') { overlayView.value?.close(reason) }
defineExpose({ show, close })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" :required="required" :required-label="requiredLabel" marginBottom="4" @tap="show" />
    <GridLayout :columns="clearable ? rtl ? '44,*' : '*,44' : '*'" direction="ltr">
      <component :is="dialog ? SNativeDialog : SNativePopover" ref="overlayView" :col="clearable && rtl ? 1 : 0"
        v-model:open="open" v-bind="overlayOptions" @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('error', $event)">
        <template #trigger="{ visible }">
          <SNativeButton ref="button" :label="display" :accessibilityLabel="label" :accessibilityValue="display"
            :disabled="disabled" :pressed="visible" variant="secondary" fullWidth @tap="show">
            <template v-if="$slots.end" #end><slot name="end" /></template>
          </SNativeButton>
        </template>
        <template #default="controls"><slot v-bind="controls" /></template>
        <template v-if="$slots.footer" #footer="controls"><slot name="footer" v-bind="controls" /></template>
      </component>
      <SNativeButton v-if="clearable" :col="rtl ? 0 : 1" :label="clearLabel" icon="close" size="sm"
        :disabled="disabled || !hasValue" variant="ghost" fullWidth @tap="emit('clear')" />
    </GridLayout>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeFieldError v-if="required || status || error !== undefined" :text="status || error" :minHeight="16" />
  </StackLayout>
</template>
