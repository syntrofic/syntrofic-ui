<script setup lang="ts">
import SButton from './SButton.vue'
import SDropdown from './SDropdown.vue'
import SIcon from './SIcon.vue'
import type { MenuPresentation } from '../internal/menu-presentation'
import type { ButtonSize, ButtonVariant, MenuEntry } from '../types'

withDefaults(defineProps<{
  label?: string
  items?: readonly MenuEntry[]
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  presentation?: MenuPresentation
  dismissLabel?: string
  size?: ButtonSize
  variant?: ButtonVariant
}>(), { label: 'More actions', size: 'sm', variant: 'ghost' })
const open = defineModel<boolean | undefined>('open', { default: undefined })
const selected = defineModel<readonly string[]>({ default: () => [] })
const emit = defineEmits<{ action: [id: string] }>()
</script>

<template>
  <SDropdown v-model:open="open" v-model="selected" :label="label" :items="items" :disabled="disabled" :direction="direction"
    :presentation="presentation" :dismiss-label="dismissLabel" @action="emit('action', $event)">
    <template #trigger>
      <slot name="trigger">
        <SButton icon-only :size="size" :variant="variant" :aria-label="label">
          <template #start><SIcon name="more" /></template>
        </SButton>
      </slot>
    </template>
    <template v-if="$slots.default" #default><slot /></template>
    <template v-if="$slots.sheet" #sheet="actions"><slot name="sheet" v-bind="actions" /></template>
  </SDropdown>
</template>
