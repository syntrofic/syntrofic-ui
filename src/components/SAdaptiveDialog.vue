<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '../internal/interaction'
import type { OverlayPurpose, SheetHeight } from '../internal/panel'
import SDialog, { type DialogPosition } from './SDialog.vue'
import type { LayoutSize } from '../internal/layout-spacing'
import SSheet from './SSheet.vue'

type Presentation = 'dialog' | 'fullscreen' | 'bottom-sheet'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  dismissLabel?: string
  size?: 'sm' | 'md' | 'lg'
  width?: number | string
  maxHeight?: number | string
  padding?: LayoutSize
  position?: Readonly<DialogPosition>
  purpose?: OverlayPurpose
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  presentation?: Presentation
  touchPresentation?: Presentation
  bottomSheetHeight?: SheetHeight
}>(), {
  touchPresentation: 'dialog', bottomSheetHeight: 'capped', showCloseButton: undefined,
  closeOnBackdrop: undefined, closeOnEscape: undefined,
})
const open = defineModel<boolean>('open', { default: false })
const touch = useMediaQuery('(max-width: 1024px) and (pointer: coarse) and (hover: none)')
const desired = computed(() => props.presentation ?? (touch.value ? props.touchPresentation : 'dialog'))
const mode = ref(desired.value)
// Keep the same surface through editing and the closing animation.
watch(open, visible => { if (visible) mode.value = desired.value })
</script>

<template>
  <SSheet v-if="mode === 'bottom-sheet'" v-model:open="open" :title="title" :description="description" :height="bottomSheetHeight"
    :purpose="purpose" :dismiss-label="dismissLabel" :hide-close-button="showCloseButton === undefined ? undefined : !showCloseButton"
    :close-on-backdrop="closeOnBackdrop" :close-on-escape="closeOnEscape">
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots['header-start']" #header-start="actions"><slot name="header-start" v-bind="actions" /></template>
    <template v-if="$slots['header-end']" #header-end="actions"><slot name="header-end" v-bind="actions" /></template>
    <slot />
    <template v-if="$slots.footer" #footer="actions"><slot name="footer" v-bind="actions" /></template>
  </SSheet>
  <SDialog v-else v-model:open="open" :variant="mode === 'fullscreen' ? 'fullscreen' : 'standard'" :title="title" :description="description"
    :dismiss-label="dismissLabel" :size="size" :width="width" :max-height="maxHeight" :padding="padding" :position="position" :purpose="purpose" :show-close-button="showCloseButton"
    :close-on-backdrop="closeOnBackdrop" :close-on-escape="closeOnEscape">
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots['header-start']" #header-start="actions"><slot name="header-start" v-bind="actions" /></template>
    <template v-if="$slots['header-end']" #header-end="actions"><slot name="header-end" v-bind="actions" /></template>
    <slot />
    <template v-if="$slots.footer" #footer="actions"><slot name="footer" v-bind="actions" /></template>
  </SDialog>
</template>
