<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { applyNativePadKey } from '../number-state'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = withDefaults(defineProps<{
  label?: string
  decimal?: string
  decimalLabel?: string
  deleteLabel?: string
  maxDigits?: number
  disabled?: boolean
  disabledKeys?: readonly string[]
  keys?: readonly string[]
  labels?: Record<string, string>
}>(), { label: 'Number pad', decimalLabel: 'Decimal point', deleteLabel: 'Delete', disabledKeys: () => [] })
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ key: [key: string, value: string]; change: [value: string] }>()
defineSlots<{ key(props: { action: string; label: string; disabled: boolean }): unknown }>()
const { theme } = useNativeUI()
const cells = computed(() => props.keys ?? ['1', '2', '3', '4', '5', '6', '7', '8', '9', props.decimal ? 'decimal' : 'spacer', '0', 'delete'])
const rows = computed(() => Array.from({ length: Math.ceil(cells.value.length / 3) }, () => '48').join(','))
const labelOf = (key: string) => props.labels?.[key] ?? (key === 'delete' ? props.deleteLabel : key === 'decimal' ? props.decimalLabel : key)
const symbol = (key: string) => key === 'delete' ? props.deleteLabel : key === 'decimal' ? props.decimal ?? '' : props.labels?.[key] ?? key
const result = (key: string) => applyNativePadKey(model.value, key, props)
const blocked = (key: string) => Boolean(props.disabled || props.disabledKeys.includes(key) || key === 'spacer' ||
  (/^[0-9]$/.test(key) || key === 'delete' || key === 'decimal') && result(key) === model.value)

function press(key: string) {
  if (blocked(key)) return
  const next = result(key)
  if (next !== model.value) {
    model.value = next
    emit('change', next)
  }
  emit('key', key, next)
}
</script>

<template>
  <GridLayout columns="*,*,*" :rows="rows" :accessibilityLabel="label" direction="ltr">
    <template v-for="(key, index) in cells" :key="`${key}-${index}`">
      <SNativePressableFeedback v-if="key !== 'spacer'" :row="Math.floor(index / 3)" :col="index % 3"
        :label="labelOf(key)" :disabled="blocked(key)" :fill="theme.colors.surfaceMuted" :pressFill="theme.colors.accentSoft"
        :paddingInline="0" :minHeight="44" margin="2" @tap="press(key)">
        <slot name="key" :action="key" :label="labelOf(key)" :disabled="blocked(key)">
          <Label :text="symbol(key)" :color="theme.colors.text" :fontSize="key.length === 1 ? 19 : 14"
            fontWeight="600" textAlignment="center" verticalAlignment="middle" />
        </slot>
      </SNativePressableFeedback>
    </template>
  </GridLayout>
</template>
