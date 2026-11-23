<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { isAppleKeyboard } from '../internal/keyboard-shortcut'

export interface KeyboardKey {
  text: string
  label?: string
}

const named = {
  command: { text: '⌘', label: 'Command' }, shift: { text: '⇧', label: 'Shift' },
  control: { text: 'Ctrl', label: 'Control' }, ctrl: { text: 'Ctrl', label: 'Control' },
  option: { text: '⌥', label: 'Option' }, alt: { text: 'Alt', label: 'Alt' },
  win: { text: 'Win', label: 'Windows' }, enter: { text: '↵', label: 'Enter' },
  escape: { text: 'Esc', label: 'Escape' }, delete: { text: 'Del', label: 'Delete' },
  backspace: { text: '⌫', label: 'Backspace' },
  tab: { text: 'Tab', label: 'Tab' }, space: { text: 'Space', label: 'Space' },
  capslock: { text: 'Caps', label: 'Caps Lock' }, help: { text: 'Help', label: 'Help' },
  home: { text: 'Home', label: 'Home' }, end: { text: 'End', label: 'End' },
  pageup: { text: 'PgUp', label: 'Page Up' }, pagedown: { text: 'PgDn', label: 'Page Down' },
  left: { text: '←', label: 'Left Arrow' }, right: { text: '→', label: 'Right Arrow' },
  up: { text: '↑', label: 'Up Arrow' }, down: { text: '↓', label: 'Down Arrow' },
  fn: { text: 'Fn', label: 'Function' },
} satisfies Record<string, KeyboardKey>
const aliases: Record<string, keyof typeof named> = {
  meta: 'command', cmd: 'command', esc: 'escape', return: 'enter', del: 'delete',
  arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
}

const props = withDefaults(defineProps<{
  keys?: string | readonly (string | KeyboardKey)[]
  label?: string
  variant?: 'default' | 'light'
  separator?: string
}>(), { variant: 'default', separator: '+' })

const root = useTemplateRef<HTMLElement>('root')
const apple = ref(false)
onMounted(() => { apple.value = isAppleKeyboard(root.value?.ownerDocument) })
const keys = computed(() => (typeof props.keys === 'string' ? props.keys.split('+').map(key => key.trim()).filter(Boolean) : props.keys ?? []).map((key): KeyboardKey => {
  if (typeof key !== 'string') return key
  const identifier = key.toLowerCase()
  if (identifier === 'mod') return apple.value ? named.command : named.control
  const resolved = aliases[identifier] ?? identifier
  return Object.hasOwn(named, resolved) ? named[resolved as keyof typeof named]
    : { text: typeof props.keys === 'string' && /^[a-z]$/u.test(key) ? key.toUpperCase() : key }
}))
const accessible = computed(() => props.label ?? keys.value.map(key => key.label ?? key.text).join(' + '))
</script>

<template>
  <kbd ref="root" class="sy-kbd" :data-variant="variant">
    <template v-if="keys.length">
      <span class="sy-visually-hidden">{{ accessible }}</span>
      <span class="sy-kbd__keys" aria-hidden="true" dir="ltr">
        <template v-for="(key, index) in keys" :key="index">
          <span v-if="index && separator" class="sy-kbd__join">{{ separator }}</span>
          <abbr v-if="key.label && key.label !== key.text" class="sy-kbd__key" :title="key.label">{{ key.text }}</abbr>
          <span v-else class="sy-kbd__key">{{ key.text }}</span>
        </template>
      </span>
    </template>
    <slot v-else />
  </kbd>
</template>
