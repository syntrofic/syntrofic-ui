<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'nativescript-vue'
import {
  SNativeAgenda, SNativeButton, SNativeCalendar, SNativeDateField, SNativeDatePicker, SNativeMotionText,
  parseDate, parseDateTime, type CalendarDate, type NativeAgendaEvent, type NativeAgendaView,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const november = parseDate('2026-11-18')
const minDate = parseDate('2026-11-01')
const maxDate = parseDate('2027-02-28')
const agendaDay = shallowRef(november)
const mode = ref<NativeAgendaView>('day')
const calendarSelection = shallowRef<CalendarDate>(november)
const typed = shallowRef<CalendarDate>()
const picked = shallowRef<CalendarDate>()
const realField = useTemplateRef<InstanceType<typeof SNativeDateField>>('field')
const output = ref('')
const fieldSegments = { year: '年份', month: '月份', day: '日期' }
const fieldHints = { year: '年', month: '月', day: '日' }
const views = { day: '日', week: '周', month: '月' }
function event(id: string, title: string, start: string, end: string, options?: Partial<NativeAgendaEvent>) {
  return { id, title, start: parseDateTime(start), end: parseDateTime(end), ...options }
}
const events = shallowRef<NativeAgendaEvent[]>([
  event('delivery', '归档截止', '2026-11-18T00:00', '2026-11-19T00:00', { allDay: true, description: '最终版本提交到项目空间' }),
  event('sync', '跨日同步', '2026-11-17T23:00', '2026-11-18T08:30'),
  event('review', '校阅项目包', '2026-11-18T10:00', '2026-11-18T11:00'),
  event('sign', '签发准备', '2026-11-18T10:30', '2026-11-18T11:45'),
])
function update(next: NativeAgendaEvent) {
  events.value = events.value.map(item => item.id === next.id ? next : item)
  output.value = `已调整 ${String(next.start.hour).padStart(2, '0')}:${String(next.start.minute).padStart(2, '0')}`
}
function validate() {
  output.value = realField.value?.check() && typed.value ? `已输入 ${typed.value.toString()}` : ''
}
function unavailable(date: CalendarDate) { return date.day === 20 }
</script>

<template>
  <StackLayout v-if="id === 'NP.agenda'">
    <SNativeMotionText :value="output" announce marginBottom="4" />
    <SNativeAgenda v-model="agendaDay" v-model:view="mode" :events="events" locale="zh-CN" :view-labels="views"
      show-calendar-label="展开日期" hide-calendar-label="收起日期" previous-label="上一个时段" next-label="下一个时段"
      empty-label="当天没有日程" earlier-label="提前" later-label="推迟" extend-label="延长"
      :start-hour="7" :end-hour="14" editable @edit="update" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.calendar'">
    <SNativeCalendar v-model="calendarSelection" :min-date="minDate" :max-date="maxDate" :is-date-unavailable="unavailable"
      locale="zh-CN" previous-month-label="上个月" next-month-label="下个月" year-picker-label="选择年份" close-year-picker-label="返回月历" />
    <SNativeMotionText :value="`已选 ${calendarSelection.toString()}`" announce marginTop="7" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.date-field'">
    <SNativeDateField ref="field" v-model="typed" :default-month="november" :min-date="minDate" :max-date="maxDate"
      :segment-labels="fieldSegments" :segment-placeholders="fieldHints" label="复核日期" locale="zh-CN"
      picker-label="打开日期面板" clear-label="清空日期" invalid-message="请检查日期和可选范围" required required-label="必填"
      required-message="请输入复核日期" clearable :year-picker="false" @change="output = ''" />
    <SNativeButton label="校验日期" size="sm" fullWidth marginTop="4" @tap="validate" />
    <SNativeMotionText :value="output" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.date-picker'">
    <SNativeDatePicker v-model="picked" label="选择交付日" placeholder="选择日期" clearable clear-label="移除日期"
      locale="zh-CN" :default-month="november" :min-date="minDate" :max-date="maxDate" :is-date-unavailable="unavailable"
      :year-picker="false" previous-month-label="上个月" next-month-label="下个月" />
    <SNativeMotionText :value="picked ? `已安排 ${picked.toString()}` : ''" announce marginTop="6" />
  </StackLayout>
</template>
