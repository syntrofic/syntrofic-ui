<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { SButton, SFocusGroup, SMotionText, useCalendarConstraints, useCalendarDays, useCalendarNavigation, type CalendarDay } from '../src'

const calendar = ref<'gregory' | 'coptic' | 'hebrew'>('gregory')
const focusDate = ref('2026-11-15')
const anchored = ref(true)
const fixed = ref(true)
const monday = ref(true)
const closed = ref(0)
const checkIn = ref('2026-11-25')
const checkOut = ref('')
const focused = ref<string>()
const table = useTemplateRef<HTMLTableElement>('table')
let restoreDay = false
const navigation = useCalendarNavigation(() => ({
  focusDate: focusDate.value, onFocusDateChange: date => { focusDate.value = date },
  numberOfMonths: 2, calendar: calendar.value, locale: 'en',
}))
const grid = useCalendarDays(() => ({
  ...navigation.visibleCalendarMonths.value[0], calendar: calendar.value, locale: 'en',
  weekStartsOn: monday.value ? 1 : 0, hasVariableRowCount: !fixed.value,
}))
const constraints = useCalendarConstraints(() => calendar.value === 'gregory' ? {
  min: '2026-11-20', max: '2026-12-12',
  rangeAnchor: anchored.value && !checkOut.value ? checkIn.value : undefined, minRangeSpan: 3, maxRangeSpan: 8,
  dateConstraints: [date => date.getUTCDay() !== closed.value], timeZone: 'UTC',
} : {})
const { weeks, dayNames, totalCells } = grid
const { baseMonth, monthYearLabel, pendingFocus, navigateMonth, clearPendingFocus } = navigation
const enabled = computed(() => grid.days.value.filter(day => !day.isOutside && !unavailable(day)))
const tabStop = computed(() => enabled.value.find(day => day.iso === focused.value)?.iso ?? enabled.value[0]?.iso)
const booking = computed(() => checkOut.value ? `${checkIn.value} 至 ${checkOut.value}`
  : checkIn.value ? `${checkIn.value} · 请选择离店日期` : '请选择入住日期')

function unavailable(day: CalendarDay) {
  return day.isOutside || constraints.isDateDisabled(day.date)
    || calendar.value === 'gregory' && anchored.value && !checkOut.value && day.iso < checkIn.value
}

function select(day: CalendarDay) {
  if (unavailable(day)) return
  if (calendar.value !== 'gregory' || !anchored.value || !checkIn.value || checkOut.value) {
    checkIn.value = day.iso
    checkOut.value = ''
  } else if (day.iso > checkIn.value) checkOut.value = day.iso
}
function clearBooking() { checkIn.value = ''; checkOut.value = '' }

function focusDay(iso: string) {
  const target = table.value?.querySelector<HTMLButtonElement>(`[data-date="${iso}"] button:not(:disabled)`)
  target?.focus({ preventScroll: true })
  return Boolean(target)
}

function move(event: KeyboardEvent, day: CalendarDay) {
  const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === 'rtl'
  const steps: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -7, ArrowDown: 7 }
  const step = steps[event.key]
  if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  const sign = Math.sign(step)
  for (let offset = step; Math.abs(offset) <= Math.abs(step) + 7; offset += sign) {
    const candidate = day.date.add({ days: offset })
    const iso = candidate.toString()
    if (unavailable({ date: candidate, iso, isOutside: false, dayNumber: candidate.day })) continue
    if (focusDay(iso)) return
    restoreDay = true
    navigateMonth(sign, day.iso, Math.abs(offset))
    return
  }
}

watch([pendingFocus, weeks], () => {
  if (!restoreDay || !pendingFocus.value) return
  restoreDay = false
  if (focusDay(pendingFocus.value)) clearPendingFocus()
}, { flush: 'post' })

function changeCalendar() {
  focusDate.value = calendar.value === 'coptic' ? '2026-09-07' : calendar.value === 'hebrew' ? '2024-03-12' : '2026-11-15'
  focused.value = undefined
  navigation.clearPendingFocus()
}
</script>

<template>
  <section class="calendar-tools-review" aria-label="日历组合式工具">
    <div class="review__row">
      <label>日历系统
        <select v-model="calendar" @change="changeCalendar">
          <option value="gregory">公历</option>
          <option value="coptic">科普特历</option>
          <option value="hebrew">希伯来历</option>
        </select>
      </label>
      <label><input v-model="fixed" type="checkbox"> 固定六周</label>
      <label><input v-model="monday" type="checkbox"> 周一开头</label>
      <label><input v-model="anchored" type="checkbox"> 限制范围长度</label>
      <label v-if="calendar === 'gregory'">停业日
        <select v-model.number="closed"><option value="0">周日</option><option value="1">周一</option></select>
      </label>
    </div>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="navigateMonth(-1)">上个月</SButton>
      <time :datetime="baseMonth.toString()">{{ monthYearLabel }}</time>
      <SButton size="sm" variant="secondary" @click="navigateMonth(1)">下个月</SButton>
      <SButton size="sm" variant="ghost" @click="navigateMonth(1, baseMonth.add({ days: 28 }), 7)">移至下周</SButton>
    </div>
    <SFocusGroup class="calendar-tools-grid">
      <table ref="table" aria-label="月份日期" :data-count="totalCells">
        <thead><tr><th v-for="(name, index) in dayNames" :key="index" scope="col">{{ name }}</th></tr></thead>
        <tbody><tr v-for="week in weeks" :key="week[0].iso">
          <td v-for="day in week" :key="day.iso" :data-date="day.iso" :data-outside="day.isOutside || undefined">
            <button type="button" :aria-label="day.iso" :disabled="unavailable(day)" :tabindex="tabStop === day.iso ? 0 : -1"
              :aria-pressed="day.iso === checkIn || day.iso === checkOut" :data-in-range="Boolean(checkOut && day.iso > checkIn && day.iso < checkOut) || undefined"
              @focus="focused = day.iso" @keydown="move($event, day)" @click="select(day)">{{ day.dayNumber }}</button>
          </td>
        </tr></tbody>
      </table>
    </SFocusGroup>
    <div v-if="calendar === 'gregory'" class="review__row">
      <SMotionText class="review__result" :value="booking" announce />
      <SButton size="sm" variant="ghost" @click="clearBooking">重选入住</SButton>
    </div>
    <div v-if="pendingFocus" class="review__row">
      <output aria-label="待聚焦日期">{{ pendingFocus }}</output>
      <SButton size="sm" variant="ghost" @click="clearPendingFocus()">清除日期</SButton>
    </div>
  </section>
</template>

<style scoped>
.calendar-tools-review { display: grid; gap: 12px; }
.calendar-tools-grid { inline-size: min(100%, 24rem); }
.calendar-tools-review table { width: min(100%, 24rem); table-layout: fixed; text-align: center; font-size: .8125rem; }
.calendar-tools-review td button { width: 100%; min-height: 1.85rem; color: var(--sy-text); background: var(--sy-control); border: 0; border-radius: var(--sy-radius-sm);
  transition: background-color var(--sy-duration) var(--sy-ease-settle), color var(--sy-duration) var(--sy-ease-settle); }
.calendar-tools-review td button[data-in-range] { background: var(--sy-accent-soft); }
.calendar-tools-review td button[aria-pressed='true'] { background: var(--sy-accent); color: var(--sy-accent-on); }
.calendar-tools-review td button:disabled { color: var(--sy-text-muted); opacity: .5; }
.calendar-tools-review td[data-outside] button { background: transparent; }
</style>
