<script setup lang="ts">
import { computed, ref, shallowRef } from 'nativescript-vue'
import {
  SNativeButton, SNativeDateRangePicker, SNativeDateTimePicker, SNativeMotionText, SNativeRangeCalendar, SNativeText,
  SNativeTimePicker, SNativeWheelDateTimePicker, SNativeWheelTimePicker, parseDate, parseDateTime, parseTime,
  type CalendarDate, type CalendarDateTime, type NativeDateRange, type Time,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const nov = parseDate('2026-11-26')
const lastDay = parseDate('2026-12-15')
const minDay = parseDate('2026-11-25')
const range = shallowRef<NativeDateRange>()
const pickedRange = shallowRef<NativeDateRange>()
const dateTime = shallowRef<CalendarDateTime>()
const dateTimeDefault = parseDateTime('2026-11-21T15:30')
const time = shallowRef<Time>()
const timeDefault = parseTime('14:30')
const wheelDate = shallowRef<CalendarDateTime>(dateTimeDefault)
const wheelTime = shallowRef<Time>(parseTime('08:30'))
const hourMode = ref<12 | 24>(12)
const maxYearDate = parseDateTime('2026-12-31T18:15')
const minYearDate = parseDateTime('2026-01-01T09:30')
const standard = { locale: 'zh-CN', previousMonthLabel: '上个月', nextMonthLabel: '下个月', yearPicker: false }
const periods = { am: '上午', pm: '下午' }
const wheelNames = { dayLabel: '日期列', hourLabel: '小时列', minuteLabel: '分钟列', periodLabel: '时段列' }
const textRange = computed(() => range.value ? `已选 ${range.value.start} 至 ${range.value.end}` : '')
const doneRange = computed(() => pickedRange.value ? `已安排 ${pickedRange.value.start} 至 ${pickedRange.value.end}` : '')
const textDateTime = computed(() => dateTime.value ? `已安排 ${dateTime.value.toString().slice(0, 16).replace('T', ' ')}` : '')
const textWheelDate = computed(() => `已定 ${wheelDate.value.toString().slice(0, 16).replace('T', ' ')}`)
const textWheelTime = computed(() => `已定 ${wheelTime.value.toString().slice(0, 5)}`)
const textTime = computed(() => time.value ? `已选 ${time.value.toString().slice(0, 5)}` : '')
const unavailable = (date: CalendarDate) => date.month === 12 && date.day === 2
</script>

<template>
  <StackLayout v-if="id === 'NP.date-range-picker'">
    <SNativeDateRangePicker v-model="pickedRange" label="交付区间" placeholder="选择交付区间" :min-date="minDay" :max-date="lastDay"
      :default-month="nov" :is-date-unavailable="unavailable" :maximum-days="12" start-prompt="选择开始日期"
      end-prompt="选择结束日期" invalid-range-text="区间包含不可用日期" start-label="开始日期" end-label="结束日期"
      manual-label="手动填写" calendar-label="回到日历" done-label="确认区间" clear-label="清除区间" clearable v-bind="standard" />
    <SNativeMotionText :value="doneRange" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.date-time-picker'">
    <SNativeDateTimePicker v-model="dateTime" label="发布计划" placeholder="选择发布日期和时间" locale="zh-CN" v-bind="wheelNames"
      :default-value="dateTimeDefault" :min-date-time="parseDateTime('2026-11-21T14:30')" :max-date-time="parseDateTime('2026-11-25T11:45')"
      :minute-interval="15" :hour-format="24" :visible-count="3" date-label="发布日期" time-label="发布时间"
      manual-label="手动填写" wheel-label="回到滚轮" done-label="保存安排" clear-label="清除安排" clearable
      invalid-message="请输入符合步长和范围的时间" />
    <SNativeMotionText :value="textDateTime" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.range-calendar'">
    <SNativeRangeCalendar v-model="range" :min-date="minDay" :max-date="lastDay" :default-month="nov"
      :is-date-unavailable="unavailable" :maximum-days="12" start-prompt="选择起点" end-prompt="选择终点"
      invalid-range-text="区间包含不可用日期" v-bind="standard" />
    <SNativeMotionText :value="textRange" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.time-picker'">
    <SNativeTimePicker v-model="time" label="校阅时间" placeholder="选择校阅时间" locale="zh-CN" :hour-format="12" :period-labels="periods"
      :default-value="timeDefault" :min-time="parseTime('13:15')" :max-time="parseTime('19:45')" :minute-interval="15" :visible-count="3"
      :editable="false" done-label="确认时间" clearable clear-label="清空时间" />
    <SNativeMotionText :value="textTime" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.wheel-date-time-picker'">
    <SNativeText text="交付日期与时间" emphasized marginBottom="5" />
    <SNativeWheelDateTimePicker v-model="wheelDate" :min-date-time="minYearDate" :max-date-time="maxYearDate" :minute-interval="15"
      :hour-format="24" locale="zh-CN" v-bind="wheelNames" :visible-count="5" />
    <SNativeMotionText :value="textWheelDate" announce marginTop="6" />
    <SNativeButton label="定位到结束日" size="sm" variant="secondary" marginTop="5" @tap="wheelDate = maxYearDate" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.wheel-time-picker'">
    <SNativeText text="开放时间" emphasized marginBottom="5" />
    <SNativeWheelTimePicker v-model="wheelTime" :hour-format="hourMode" :period-labels="periods" :minute-interval="15"
      :min-time="parseTime('05:00')" :max-time="parseTime('22:15')" locale="zh-CN" :visible-count="5" />
    <SNativeMotionText :value="textWheelTime" announce marginTop="6" />
    <SNativeButton :label="hourMode === 12 ? '切换为 24 小时制' : '切换为 12 小时制'" size="sm" variant="secondary"
      fullWidth marginTop="5" @tap="hourMode = hourMode === 12 ? 24 : 12" />
  </StackLayout>
</template>
