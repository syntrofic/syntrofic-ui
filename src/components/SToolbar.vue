<script setup lang="ts">
import { computed, provide, useSlots } from 'vue'
import { ToolbarRoot, ToolbarSeparator } from 'reka-ui'
import type { ButtonSize, ToolbarItem } from '../types'
import SToolbarButton from './SToolbarButton.vue'
import { toolbarContext } from '../internal/toolbar-context'
import { useKeyboardHint } from '../internal/keyboard-hint'

const props = withDefaults(defineProps<{
  label: string
  items?: readonly ToolbarItem[]
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  loop?: boolean
  keyboardHint?: string | boolean
  size?: ButtonSize
  variant?: 'plain' | 'muted'
  dividers?: readonly ('top' | 'bottom')[]
}>(), { items: () => [], orientation: 'horizontal', loop: true, keyboardHint: true, size: 'sm' })

const emit = defineEmits<{ action: [key: string, event: MouseEvent] }>()
provide(toolbarContext, { size: computed(() => props.size), disabled: computed(() => Boolean(props.disabled)) })
const slots = useSlots()
const { HintElement, onFocus, onBlur, onKeyDown } = useKeyboardHint(() => ({ orientation: props.orientation,
  focusSelector: '[data-sy-toolbar-button]',
  isEnabled: !props.disabled && props.keyboardHint !== false && Boolean(slots.default || slots.start || slots.end || slots.center
    || props.items.filter(item => !item.disabled && !item.separator).length > 1),
  label: typeof props.keyboardHint === 'string' ? props.keyboardHint : undefined }))
</script>

<template>
  <ToolbarRoot
    class="sy-toolbar"
    :data-orientation="orientation"
    :data-size="size"
    :data-variant="variant"
    :data-centered="Boolean($slots.center) || undefined"
    :data-divider-top="dividers?.includes('top') || undefined"
    :data-divider-bottom="dividers?.includes('bottom') || undefined"
    :orientation="orientation"
    :dir="direction"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    :loop="loop"
    data-sy-keyboard-hint-scope
    @focusin="onFocus" @focusout="onBlur" @keydown="onKeyDown"
  >
    <div v-if="$slots.start" class="sy-toolbar__start"><slot name="start" /></div>
    <div v-if="$slots.center" class="sy-toolbar__center"><slot name="center" /></div>
    <slot>
      <template v-for="item in items" :key="item.id">
        <ToolbarSeparator v-if="item.separator" class="sy-toolbar__separator" />
        <SToolbarButton v-else :variant="item.variant ?? 'ghost'" :disabled="item.disabled" @click="emit('action', item.id, $event)">
          <slot name="item" :item="item">{{ item.label }}</slot>
        </SToolbarButton>
      </template>
    </slot>
    <div v-if="$slots.end" class="sy-toolbar__end"><slot name="end" /></div>
    <HintElement />
  </ToolbarRoot>
</template>
