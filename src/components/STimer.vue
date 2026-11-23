<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClock } from '../internal/clock'
import { useLocale } from '../rac/locale'
import SMotionText from './SMotionText.vue'
import STypography, { type TypographyColor, type TypographyRole, type TypographySize, type TypographyWeight } from './STypography.vue'

const props = withDefaults(defineProps<{
  startTime?: number
  format?: 'clock' | 'elapsed'
  locale?: string
  type?: TypographyRole
  size?: TypographySize
  color?: TypographyColor
  weight?: TypographyWeight
}>(), { format: 'elapsed', type: 'supporting', color: 'secondary' })
const international = useLocale()
const locale = computed(() => props.locale ?? international.locale.value)
const clock = useClock(true)
const mountedAt = ref<number>()
watch(clock, now => { mountedAt.value ??= now }, { flush: 'sync' })
const seconds = computed(() => {
  const start = Number.isFinite(props.startTime) ? props.startTime : mountedAt.value
  return start === undefined || clock.value === undefined ? 0 : Math.max(0, Math.floor((clock.value - start) / 1000))
})
const precision = computed(() => props.format === 'elapsed' && seconds.value >= 3600 ? 60 : 1)
const iso = computed(() => `PT${Math.floor(seconds.value / precision.value) * precision.value}S`)
const units = computed(() => Object.fromEntries(['hour', 'minute', 'second'].map(unit => [unit,
  new Intl.NumberFormat(locale.value, { style: 'unit', unit, unitDisplay: 'narrow' })])))
const display = computed(() => {
  const hours = Math.floor(seconds.value / 3600)
  const minutes = Math.floor(seconds.value / 60) % 60
  const rest = seconds.value % 60
  if (props.format === 'clock') {
    const pad = (value: number) => String(value).padStart(2, '0')
    return hours ? hours + ':' + pad(minutes) + ':' + pad(rest) : minutes + ':' + pad(rest)
  }
  const unit = (value: number, name: 'hour' | 'minute' | 'second') => units.value[name].format(value)
  if (hours) return `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`
  if (minutes) return `${unit(minutes, 'minute')} ${unit(rest, 'second')}`
  return unit(rest, 'second')
})
</script>

<template>
  <STypography as="time" class="sy-standard-time" :type="type" :size="size" :color="color" :weight="weight" :datetime="iso" tabular-numbers>
    <SMotionText :value="display" motion="roll" />
  </STypography>
</template>
