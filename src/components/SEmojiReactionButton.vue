<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import SButton from './SButton.vue'
import SNumberValue from './SNumberValue.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  emoji: string
  label: string
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  controlled?: boolean
  disabled?: boolean
  reserve?: number
  formatLabel?: (label: string, count: number) => string
}>(), { size: 'sm', reserve: 3 })
const attrs = useAttrs()
const selected = defineModel<boolean>('selected', { default: false })
const count = defineModel<number>('count', { default: 0 })
const emit = defineEmits<{ toggle: [reaction: { emoji: string; selected: boolean; count: number }] }>()
const number = computed(() => Number.isFinite(count.value) ? Math.max(0, Math.floor(count.value)) : 0)
const labelText = computed(() => props.formatLabel?.(props.label, number.value) ?? `${props.label}, ${number.value}`)

function toggle() {
  if (props.disabled || props.readonly) return
  const next = !selected.value
  const total = Math.max(0, number.value + (next ? 1 : -1))
  if (!props.controlled) {
    selected.value = next
    count.value = total
  }
  emit('toggle', { emoji: props.emoji, selected: next, count: total })
}
</script>

<template>
  <component :is="readonly ? 'span' : SButton" v-bind="attrs"
    class="sy-emoji-reaction" :data-selected="selected || undefined" :data-size="size"
    :size="readonly ? undefined : size" :variant="readonly ? undefined : 'secondary'"
    :disabled="readonly ? undefined : disabled" :aria-label="readonly ? undefined : labelText"
    :aria-pressed="readonly ? undefined : selected" @click="toggle">
    <span v-if="readonly" class="sy-visually-hidden">{{ labelText }}</span>
    <span class="sy-emoji-reaction__content" aria-hidden="true">
      <span class="sy-emoji-reaction__glyph">{{ emoji }}</span>
      <SNumberValue :value="number" :reserve="reserve" />
    </span>
  </component>
</template>
