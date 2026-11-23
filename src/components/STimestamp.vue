<script lang="ts">
export type TimestampFormat = 'auto' | 'relative' | 'relative_short' | 'date' | 'date_long' | 'date_weekday' |
  'date_time' | 'time' | 'system_date' | 'system_date_time' | 'system_time' | 'unix_seconds'
export interface TimestampDetail {
  label?: string
  timeZone?: string
  timezoneID?: string
  format?: TimestampFormat | 'full'
  copyable?: boolean
  isCopyable?: boolean
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { relativeTime, useClock } from '../internal/clock'
import { useDevWarning } from '../internal/element-behavior'
import { writeClipboard } from '../internal/clipboard'
import { useLocale } from '../rac/locale'
import { createAnimator } from '../internal/motion'
import SHoverCard from './SHoverCard.vue'
import SButton from './SButton.vue'
import STypography, { type TypographyColor, type TypographyRole, type TypographySize, type TypographyWeight } from './STypography.vue'

const props = withDefaults(defineProps<{
  value: number | string | Date
  timeZone?: string
  timezoneID?: string
  locale?: string
  format?: TimestampFormat
  autoThreshold?: number
  showTimeZone?: boolean
  live?: boolean
  tooltip?: boolean
  details?: readonly TimestampDetail[]
  tooltipEntries?: readonly TimestampDetail[]
  type?: TypographyRole
  size?: TypographySize
  color?: TypographyColor
  weight?: TypographyWeight
  copyLabel?: string
  copiedLabel?: string
  copyFailedLabel?: string
}>(), { format: 'auto', autoThreshold: 604800, tooltip: true, type: 'supporting', color: 'secondary', copyLabel: 'Copy', copiedLabel: 'Copied', copyFailedLabel: 'Copy failed' })
const international = useLocale()
const locale = computed(() => {
  try { return Intl.getCanonicalLocales(props.locale ?? international.locale.value)[0] ?? 'en' }
  catch { return 'en' }
})
const zone = computed(() => props.timeZone ?? props.timezoneID)
const relative = computed(() => ['auto', 'relative', 'relative_short'].includes(props.format))
const clock = useClock(() => Boolean(props.live && ['auto', 'relative', 'relative_short'].includes(props.format)))
const date = computed(() => {
  const value = props.value instanceof Date ? props.value : new Date(typeof props.value === 'number' ? props.value * 1000 : props.value)
  return Number.isFinite(value.getTime()) ? value : undefined
})
const open = shallowRef(false)
const copied = shallowRef<number>()
const failed = shallowRef<number>()
const readout = useTemplateRef<HTMLSpanElement>('readout')
let copyRequest = 0
watch([open, date], () => { copyRequest++; copied.value = undefined; failed.value = undefined })

function validZone(value?: string) {
  if (!value || value === 'local') return true
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true }
  catch { return false }
}
useDevWarning(() => !validZone(zone.value) || [...props.details ?? [], ...props.tooltipEntries ?? []].some(row => !validZone(row.timeZone ?? row.timezoneID)),
  'STimestamp received an unknown time zone and will use the viewer time zone.')

function absolute(value: Date, format: TimestampFormat | 'full', requestedZone?: string, fullZone: 'short' | 'long' = 'short') {
  if (format === 'unix_seconds') return String(Math.floor(value.getTime() / 1000))
  const timeZone = (requestedZone && requestedZone !== 'local' && validZone(requestedZone) ? requestedZone : undefined)
    ?? (clock.value === undefined ? 'UTC' : undefined)
  const system = format.startsWith('system_')
  const includeTime = ['time', 'date_time', 'system_time', 'system_date_time', 'auto', 'relative', 'relative_short', 'full'].includes(format)
  const includeDate = !['time', 'system_time'].includes(format)
  const options: Intl.DateTimeFormatOptions = {
    timeZone, calendar: system ? 'gregory' : includeDate ? international.calendar?.value : undefined, numberingSystem: system ? 'latn' : undefined,
    year: includeDate ? 'numeric' : undefined,
    month: includeDate ? system ? '2-digit' : format === 'date_long' ? 'long' : 'short' : undefined,
    day: includeDate ? system ? '2-digit' : 'numeric' : undefined,
    weekday: format === 'date_weekday' ? 'short' : undefined,
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    second: system && includeTime || format === 'full' ? '2-digit' : undefined,
    hourCycle: system ? 'h23' : undefined,
    timeZoneName: format === 'full' ? fullZone : props.showTimeZone && !system && includeTime ? 'short' : undefined,
  }
  const formatter = new Intl.DateTimeFormat(locale.value, options)
  if (!system) return formatter.format(value)
  const parts = Object.fromEntries(formatter.formatToParts(value).map(part => [part.type, part.value]))
  return [includeDate && [parts.year, parts.month, parts.day].join('-'),
    includeTime && [parts.hour, parts.minute, parts.second].join(':')].filter(Boolean).join(' ')
}

const full = computed(() => date.value ? absolute(date.value, 'full', zone.value) : '')
const output = computed(() => {
  if (!date.value) return ''
  if (relative.value) {
    if (clock.value === undefined) return full.value
    const delta = (date.value.getTime() - clock.value) / 1000
    if (props.format !== 'auto' || Math.abs(delta) <= props.autoThreshold) {
      return relativeTime(delta, locale.value, props.format === 'relative_short')
    }
  }
  return absolute(date.value, props.format, zone.value)
})
const accessibleName = computed(() => {
  if (!date.value) return undefined
  const spoken = absolute(date.value, 'full', zone.value, 'long')
  return output.value === spoken ? spoken : `${output.value} · ${spoken}`
})
watch(output, (next, previous, onCleanup) => {
  if (!next || !previous || typeof readout.value?.animate !== 'function') return
  const animator = createAnimator(readout.value)
  animator.animate('timestamp', [{ opacity: .52, translate: '0 .18em' }, { opacity: 1, translate: '0 0' }], { role: 'move' })
  onCleanup(animator.dispose)
}, { flush: 'post' })
const rows = computed(() => {
  const value = date.value
  if (!value) return []
  const configured = props.tooltipEntries ?? props.details
  if (!configured && !relative.value) return []
  return (configured ?? [{ copyable: true }]).map(row => ({
    ...row, value: absolute(value, row.format ?? 'full', row.timeZone ?? row.timezoneID ?? zone.value),
    copyable: row.copyable ?? row.isCopyable ?? !props.tooltipEntries,
  }))
})

async function copy(event: MouseEvent, index: number) {
  const node = event.currentTarget as HTMLElement
  const current = ++copyRequest
  try {
    await writeClipboard(rows.value[index].value, node.ownerDocument)
    if (current === copyRequest) { copied.value = index; failed.value = undefined }
  } catch {
    if (current === copyRequest) { failed.value = index; copied.value = undefined }
  }
}
</script>

<template>
  <SHoverCard v-if="date && tooltip && rows.length" v-model:open="open" :label="full">
    <template #trigger="{ triggerProps }">
      <button type="button" class="sy-timestamp-trigger" v-bind="triggerProps" :aria-label="accessibleName" @click="open = true">
        <STypography as="time" :type="type" :size="size" :color="color" :weight="weight" class="sy-standard-time" tabular-numbers
          :datetime="date.toISOString()"><span ref="readout" class="sy-timestamp__readout">{{ output }}</span></STypography>
      </button>
    </template>
    <ul class="sy-timestamp-details" :data-copyable="rows.some(row => row.copyable) || undefined">
      <li v-for="(row, index) in rows" :key="index">
        <span><strong v-if="row.label">{{ row.label }}</strong>{{ row.value }}</span>
        <SButton v-if="row.copyable" variant="ghost" size="sm" @click="copy($event, index)">
          {{ copied === index ? copiedLabel : failed === index ? copyFailedLabel : copyLabel }}
        </SButton>
      </li>
    </ul>
  </SHoverCard>
  <STypography v-else-if="date" as="time" class="sy-standard-time" :type="type" :size="size" :color="color" :weight="weight"
    :datetime="date.toISOString()" :aria-label="relative ? accessibleName : undefined" tabular-numbers><span ref="readout" class="sy-timestamp__readout">{{ output }}</span></STypography>
  <slot v-else name="invalid" />
</template>
