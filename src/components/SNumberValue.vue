<script setup lang="ts">
import { computed } from 'vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  value: number | bigint
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
  prefix?: string
  suffix?: string
  reserve?: number
  motion?: 'roll' | 'reveal' | 'none'
  announce?: boolean
}>(), { locale: 'en', reserve: 0, motion: 'roll' })
defineSlots<{
  prefix(props: { value: number | bigint }): unknown
  suffix(props: { value: number | bigint }): unknown
  default(props: { value: number | bigint; text: string; parts: Intl.NumberFormatPart[] }): unknown
}>()
const formatter = computed(() => new Intl.NumberFormat(props.locale, props.formatOptions))
const parts = computed(() => formatter.value.formatToParts(props.value))
const text = computed(() => parts.value.map(part => part.value).join(''))
const reserve = computed(() => Number.isFinite(props.reserve) ? Math.max(0, props.reserve) : 0)
</script>

<template>
  <span class="sy-number-value">
    <span v-if="prefix !== undefined || $slots.prefix" class="sy-number-value__affix"><slot name="prefix" :value="value">{{ prefix }}</slot></span>
    <span class="sy-number-value__readout" :style="{ minInlineSize: reserve ? `${reserve}ch` : undefined }">
      <slot :value="value" :text="text" :parts="parts">
        <span v-if="motion === 'none'" :aria-live="announce ? 'polite' : undefined">{{ text }}</span>
        <SMotionText v-else :value="text" :motion="motion" :announce="announce" />
      </slot>
    </span>
    <span v-if="suffix !== undefined || $slots.suffix" class="sy-number-value__affix"><slot name="suffix" :value="value">{{ suffix }}</slot></span>
  </span>
</template>
