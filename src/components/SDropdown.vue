<script setup lang="ts">
import { computed, useId, watch } from 'vue'
import { Primitive } from 'reka-ui'
import type { MenuEntry } from '../types'
import { useMenuPresentation, type MenuPresentation } from '../internal/menu-presentation'
import SMenu from './SMenu.vue'
import SButton from './SButton.vue'
import SMenuItems from '../internal/SMenuItems.vue'
import SMenuSheet from '../internal/SMenuSheet.vue'

const props = withDefaults(defineProps<{
  label: string
  items?: readonly MenuEntry[]
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  autofocus?: boolean
  defaultOpen?: boolean
  presentation?: MenuPresentation
  dismissLabel?: string
}>(), { items: () => [], autofocus: true })
const model = defineModel<boolean | undefined>('open', { default: undefined })
const selected = defineModel<readonly string[]>({ default: () => [] })
const emit = defineEmits<{ action: [id: string] }>()
const open = computed({
  get: () => !props.disabled && Boolean(model.value ?? props.defaultOpen),
  set: value => { model.value = value },
})
const presentationMode = useMenuPresentation(() => props.presentation ?? 'popover', open)
const sheetId = `sy-dropdown-sheet-${useId()}`

watch(() => props.disabled, disabled => { if (disabled && (model.value ?? props.defaultOpen)) open.value = false })

function toggleSheet(event: MouseEvent) {
  if (props.disabled || event.defaultPrevented) return
  if (!open.value && event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
  open.value = !open.value
}
</script>

<template>
  <template v-if="presentationMode === 'bottom-sheet'">
    <Primitive as-child :disabled="disabled" :aria-label="label" aria-haspopup="dialog" :aria-expanded="open"
      :aria-controls="open ? sheetId : undefined" @click="toggleSheet">
      <slot name="trigger"><SButton variant="secondary">{{ label }}</SButton></slot>
    </Primitive>
    <SMenuSheet :id="sheetId" v-model:open="open" v-model:selected="selected" :label="label" :items="items"
      :direction="direction" :dismiss-label="dismissLabel" @action="emit('action', $event)">
      <template v-if="$slots.sheet" #default="actions"><slot name="sheet" v-bind="actions" /></template>
    </SMenuSheet>
  </template>
  <SMenu v-else v-model:open="open" :menu-label="label" :direction="direction" :disabled="disabled" :autofocus="autofocus"
    :touch-motion="presentation !== 'popover'">
    <template #trigger><slot name="trigger"><SButton variant="secondary">{{ label }}</SButton></slot></template>
    <slot><SMenuItems :items="items" :selected="selected" @action="emit('action', $event)" @change="selected = $event" /></slot>
  </SMenu>
</template>
