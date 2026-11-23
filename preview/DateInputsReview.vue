<script setup lang="ts">
import CalendarToolsReview from './CalendarToolsReview.vue'
import EditableFieldReview from './EditableFieldReview.vue'
import { computed, ref, shallowRef } from 'vue'
import { CalendarDate, CalendarDateTime, Time } from '@internationalized/date'
import { DateFieldRoot } from 'reka-ui'
import {
  SButton, SCalendar, SCalendarYearPicker, SDateField, SDateInputGroup, SDatePicker, SDateTimeInput,
  SDateRangePicker, SForm, SInputOTP, SMotionText, SNumberField, SRangeCalendar,
  SSearchField, STimeField, SToggleButtonGroup,
} from '../src'
import type { CalendarDuration, DateRange, DateRangePreset, DateValue, FieldStatus, TimeValue } from '../src'
import { useMediaQuery } from '../src/internal/interaction'
import I18nProvider from '../src/rac/I18nProvider.vue'

defineProps<{ id: string }>()

const start = new CalendarDate(2026, 11, 18)
const end = new CalendarDate(2026, 11, 24)
const min = new CalendarDate(2024, 1, 1)
const max = new CalendarDate(2032, 12, 31)
const date = shallowRef<DateValue>(start)
const optionalDate = shallowRef<DateValue | undefined>(start)
const wheelDate = shallowRef<DateValue>(start)
const range = shallowRef<DateRange>({ start, end })
const time = shallowRef<TimeValue>(new Time(9, 30, 0))
const appointment = shallowRef<TimeValue>()
const time12 = shallowRef<TimeValue>(new Time(15, 45))
const time24 = shallowRef<TimeValue>(new Time(15, 45))
const secondsTime = shallowRef<TimeValue>(new Time(15, 45, 32))
const minTime = new Time(9)
const maxTime = new Time(17, 30)
const dateTime = shallowRef<CalendarDateTime | undefined>(new CalendarDateTime(2026, 11, 21, 15, 30))
const reportRange = shallowRef<DateRange>()
const wide = useMediaQuery('(min-width: 720px)')
const presetRanges: readonly DateRangePreset[] = [7, 14, 30, 90].map(days => ({ id: String(days), label: `近 ${days} 天`,
  getRange: () => ({ start: end.subtract({ days: days - 1 }), end }) }))
const timeMessages = { 'time.outsideBounds': '请选择可预约时间段内的时刻。', 'time.offStep': '请选择可预约的时间档。' }
const dateTimeLabels = { title: '设置交付日期和时间', picker: '交付日期和时间', date: '日期', time: '时刻', done: '完成' }
const statusMessages = [
  { type: 'error', message: '此时段已被占用。', live: 'off' },
  { type: 'warning', message: '此时段需要提前确认。', live: 'off' },
  { type: 'success', message: '已确认可用。', live: 'off' },
] as const satisfies readonly FieldStatus[]
const statusExamples = ['待调整', '待确认', '已确认']
const currentYear = shallowRef<DateValue>(start)
const month = shallowRef<DateValue>(start)
const code = ref('')
const amount = ref(120)
const query = ref('')
const result = ref('')
const showTwo = ref(false)
const rangeTwo = ref(false)
const weekdaysOnly = ref(false)
const calendarView = ref('month')
const arabic = ref(false)
const dateFormats = [{ value: 'date', label: '简短日期' }, { value: 'date_long', label: '完整日期' },
  { value: 'date_weekday', label: '带星期' }, { value: 'system_date', label: '系统日期' }] as const
function formatDate(value: DateValue) { return `第 ${value.day} 日 · ${value.month} 月` }
const calendarExamples = new Set(['W.calendar', 'W.date-picker', 'W.date-range-picker', 'W.range-calendar'])
const views = [
  { value: 'month', label: '月' },
  { value: 'week', label: '两周' },
  { value: 'day', label: '单日' },
  { value: 'days', label: '五日' },
]
const durations: Record<string, CalendarDuration> = {
  week: { weeks: 2 }, day: { days: 1 }, days: { days: 5 },
}
const duration = computed(() => durations[calendarView.value])
const selectedRange = computed(() => range.value.start && range.value.end
  ? `${range.value.start.toString()} 至 ${range.value.end.toString()}`
  : range.value.start?.toString() ?? '选择起始日期')

const navigation = {
  previousMonth: '上个月', nextMonth: '下个月', previousWeek: '上一页周历', nextWeek: '下一页周历',
  previousDay: '上一页日期', nextDay: '下一页日期', chooseYear: '选择年份', previousYears: '更早年份', nextYears: '更晚年份',
}
const currency = { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 } as const
function unavailable(day: DateValue) { return day.day === 22 }
function unavailableForRelease(day: DateValue, anchor?: DateValue) { return !!anchor && day.day === 22 }
function weekend(day: DateValue) { return [0, 6].includes(day.toDate('UTC').getUTCDay()) }
function limitCalendar() {
  weekdaysOnly.value = !weekdaysOnly.value
  if (weekdaysOnly.value) { date.value = start; month.value = start }
}
function submit(_: SubmitEvent, data: FormData) {
  result.value = [...data].map(([, value]) => value).join(' · ')
}
</script>

<template>
  <div v-if="calendarExamples.has(id)" class="review__row">
    <SToggleButtonGroup
      :model-value="calendarView"
      :items="views"
      label="日历视图"
      @update:model-value="calendarView = $event ?? 'month'"
    />
    <SButton
      v-if="id === 'W.calendar'"
      size="sm"
      variant="ghost"
      :pressed="arabic"
      @click="arabic = !arabic"
    >阿拉伯语</SButton>
  </div>

  <SForm v-if="id === 'W.input-otp'" @submit="submit" @reset="result = ''">
    <SInputOTP
      v-model="code"
      name="code"
      label="邮箱验证码"
      description="输入或粘贴邮件里的 6 位数字。"
      :split-at="3"
      required
    />
    <div class="review__row">
      <SButton type="submit" size="sm">验证</SButton>
      <SButton type="reset" variant="ghost" size="sm">清空</SButton>
    </div>
    <SMotionText v-if="result" class="review__result" :value="result" motion="roll" announce />
  </SForm>

  <template v-else-if="id === 'W.number-field'">
    <SForm @submit="submit" @reset="result = ''">
      <SNumberField
        v-model="amount"
        name="amount"
        label="素材预算"
        description="每次增减 0.50 元。"
        :format-options="currency"
        locale="zh-CN"
        :min="100"
        :max="160"
        :step="0.5"
        decrease-label="减少预算"
        increase-label="增加预算"
        required
      />
      <div class="review__row">
        <SButton type="submit" size="sm">保存</SButton>
        <SButton type="reset" variant="ghost" size="sm">重置</SButton>
        <SMotionText class="review__result" :value="amount === undefined ? '—' : amount.toFixed(2)" motion="roll" />
      </div>
      <p v-if="result" class="review__result" aria-live="polite">已保存金额 {{ result }}</p>
    </SForm>
    <EditableFieldReview kind="number" />
  </template>

  <div v-else-if="id === 'W.search-field'" class="review__stack">
    <SSearchField
      v-model="query"
      label="搜索项目"
      placeholder="输入项目名称"
      clear-label="清除搜索"
      @search="result = $event"
      @clear="result = ''"
    />
    <p class="review__result" aria-live="polite">
      <SMotionText :value="result ? `正在查看「${result}」的结果` : '按 Enter 搜索'" />
    </p>
  </div>

  <div v-else-if="id === 'W.calendar'" class="review__stack">
    <SCalendar
      v-model="date"
      v-model:placeholder="month"
      label="项目日历"
      :locale="arabic ? 'ar-SA-u-ca-islamic-umalqura' : 'zh-CN'"
      :dir="arabic ? 'rtl' : 'ltr'"
      :visible-duration="duration"
      :min-value="weekdaysOnly ? start : min"
      :max-value="weekdaysOnly ? new CalendarDate(2026, 12, 12) : max"
      :week-starts-on="1"
      :is-date-unavailable="unavailable"
      :is-date-disabled="weekdaysOnly ? weekend : undefined"
      :navigation-labels="navigation"
      :number-of-months="showTwo ? 2 : 1"
      year-picker
    >
      <template #indicator="{ date: day }"><span v-if="day.day === 20" data-sy-date-indicator /></template>
    </SCalendar>
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-pressed="showTwo" @click="showTwo = !showTwo">显示两个月</SButton>
      <SButton size="sm" variant="ghost" :aria-pressed="weekdaysOnly" @click="limitCalendar">仅开放工作日</SButton>
    </div>
    <SMotionText class="review__result" data-calendar-selection :value="date instanceof CalendarDate ? date.toString() : '选择日期'" motion="roll" announce />
    <CalendarToolsReview />
  </div>

  <SForm v-else-if="id === 'W.date-field'" @submit="submit">
    <SDateField v-model="date" name="release" label="发布日期" description="可逐段编辑年、月、日。" locale="zh-CN" :min-value="min" :max-value="max" required />
    <div class="review__row">
      <SButton type="submit" size="sm">保存</SButton>
      <SButton type="reset" variant="ghost" size="sm" @click="result = ''">重置</SButton>
    </div>
    <p v-if="result" class="review__result" aria-live="polite">{{ result }}</p>
  </SForm>

  <SForm v-else-if="id === 'W.date-picker'" @submit="submit">
    <div class="review__editable-columns">
      <div class="review__stack">
        <SDatePicker v-model="date" name="release" label="发布日期" locale="zh-CN" :visible-duration="duration" selection-alignment="start"
          trigger-text="日历" trigger-label="打开发布日期日历" :min-value="min" :max-value="max" :week-starts-on="1"
          :navigation-labels="navigation" year-picker required />
        <SMotionText class="review__result" :value="date?.toString() ?? '选择日期'" motion="roll" />
      </div>
      <div class="review__stack">
        <SDatePicker v-model="wheelDate" label="发布日期滚轮" locale="zh-CN" presentation="wheel" trigger-text="滚轮" haptics
          trigger-label="打开发布日期滚轮" apply-label="应用滚轮日期" :min-value="min" :max-value="max" />
        <SMotionText class="review__result" :value="wheelDate.toString()" motion="roll" />
      </div>
    </div>
    <div class="review__row">
      <SButton type="submit" size="sm">保存日期</SButton>
    </div>
    <section class="review__editable" aria-label="日期格式与清除">
      <SDatePicker v-model="optionalDate" label="计划完成日" locale="zh-CN" format="date_weekday" clearable clear-label="清除完成日"
        trigger-text="日历" trigger-label="打开完成日日历" :min-value="start" :max-value="end" :default-placeholder="start"
        description="只能选择 11 月 18 日至 24 日之间的日期。" />
      <div class="review__editable-columns">
        <SDatePicker v-for="item in dateFormats" :key="item.value" :model-value="start" :label="item.label" :format="item.value" locale="zh-CN" trigger-text="日历" />
        <SDatePicker :model-value="start" label="自定义日期" :format="formatDate" locale="zh-CN" trigger-text="日历" />
      </div>
      <div class="review__editable-columns" role="group" aria-label="日期校验反馈">
        <SDatePicker label="补充交付日" locale="zh-CN" :status="{ type: 'error', message: '请填写补充交付日。', live: 'off' }" />
        <SDatePicker :model-value="start" label="预估交付日" locale="zh-CN" :status="{ type: 'warning', message: '预算评审后可能调整。', live: 'off' }" />
        <SDatePicker :model-value="end" label="已确认交付日" locale="zh-CN" :status="{ type: 'success', message: '已与接收方确认。', live: 'off' }" />
      </div>
    </section>
    <p v-if="result" class="review__result" aria-live="polite">{{ result }}</p>
  </SForm>

  <template v-else-if="id === 'W.date-range-picker'">
    <SForm @submit="submit" @reset="result = ''">
      <SDateRangePicker
        v-model="range"
        name="window"
        label="交付周期"
        locale="zh-CN"
        :visible-duration="duration"
        selection-alignment="start"
        trigger-text="日历"
        trigger-label="打开交付周期日历"
        start-label="开始日期"
        end-label="结束日期"
        :min-value="min"
        :max-value="max"
        :week-starts-on="1"
        :navigation-labels="navigation"
        :maximum-days="16"
        required
      />
      <div class="review__row">
        <SButton type="submit" size="sm">保存周期</SButton>
        <SButton type="button" size="sm" variant="ghost" @click="range = { start: undefined, end: undefined }; result = ''">清空周期</SButton>
        <SButton type="reset" size="sm" variant="ghost">重置</SButton>
      </div>
      <p v-if="result" class="review__result" aria-live="polite">{{ result }}</p>
    </SForm>
    <section class="review__editable" aria-label="统计周期预设">
      <SDateRangePicker v-model="reportRange" label="报告周期" presentation="button" locale="zh-CN" trigger-text="选择周期"
        trigger-label="设置报告周期" presets-label="常用统计周期" :presets="presetRanges" :number-of-months="wide ? 2 : 1"
        :min-value="end.subtract({ days: 45 })" :max-value="end" :default-placeholder="end" :navigation-labels="navigation"
        description="可使用常用周期，也可以在日历中选择起止日期。" />
      <SMotionText class="review__result" :value="reportRange?.start && reportRange.end ? `${reportRange.start} 至 ${reportRange.end}` : '尚未选择报告周期'" announce />
      <div class="review__editable-columns">
        <SDateRangePicker v-for="(status, i) in statusMessages" :key="status.type" :label="`${statusExamples[i]}的档期`" presentation="button"
          locale="zh-CN" :trigger-label="`设置${statusExamples[i]}的档期`" :model-value="{ start, end }" :status="status" />
      </div>
    </section>
  </template>

  <section v-else-if="id === 'W.date-time-input'" class="review__editable" aria-label="日期时间组合用法">
    <SDateTimeInput v-model="dateTime" label="交付时间" locale="zh-CN" :hour-cycle="24" trigger-text="日历" trigger-label="设置交付时间"
      clearable clear-label="清除交付时间" :default-placeholder="start" :min-value="new CalendarDateTime(2026, 11, 18, 9)"
      :max-value="new CalendarDateTime(2026, 11, 24, 17, 30)" :step="{ minute: 15 }" :labels="dateTimeLabels" :navigation-labels="navigation"
      description="日历与时刻共同确定交付时段。" />
    <SMotionText class="review__result" :value="dateTime?.toString() ?? '尚未设置交付时间'" announce />
    <div class="review__editable-columns">
      <SDateTimeInput v-for="(status, i) in statusMessages" :key="status.type" :label="`${statusExamples[i]}的交付`" locale="zh-CN"
        :model-value="new CalendarDateTime(2026, 11, 24, 10 + i)" :status="status" :labels="dateTimeLabels"
        :trigger-label="`打开${statusExamples[i]}的交付时间`" trigger-text="日历" />
    </div>
  </section>

  <div v-else-if="id === 'W.range-calendar'" class="review__stack">
    <SRangeCalendar
      v-model="range"
      label="交付日期范围"
      locale="zh-CN"
      :visible-duration="duration"
      page-behavior="single"
      :number-of-months="rangeTwo ? 2 : 1"
      :min-value="min"
      :max-value="max"
      :week-starts-on="1"
      :navigation-labels="navigation"
      :maximum-days="16"
      :is-date-unavailable="unavailableForRelease"
      year-picker
    />
    <SButton size="sm" variant="secondary" :aria-pressed="rangeTwo" @click="rangeTwo = !rangeTwo">跨月选择</SButton>
    <SMotionText class="review__result" :value="selectedRange" motion="roll" announce />
  </div>

  <template v-else-if="id === 'W.time-field'">
    <SForm aria-label="上线时间表单" @submit="submit" @reset="result = ''">
      <STimeField
        v-model="time"
        name="publishTime"
        label="上线时间"
        locale="zh-CN"
        :hour-cycle="24"
        granularity="second"
        :step="{ minute: 5 }"
        required
      />
      <div class="review__row">
        <SButton size="sm" type="submit">保存时间</SButton>
        <SButton size="sm" type="reset" variant="ghost">重置</SButton>
      </div>
      <p v-if="result" class="review__result" aria-live="polite"><SMotionText :value="result" motion="roll" /></p>
    </SForm>
    <I18nProvider :as="false" locale="zh-CN" :messages="timeMessages">
      <section class="review__editable" aria-label="时间格式和时段">
        <STimeField v-model="appointment" label="预约时刻" presentation="adaptive-native" :min-value="minTime" :max-value="maxTime"
          :default-placeholder="minTime" :hour-cycle="24" :step="{ minute: 15 }" step-snapping description="可预约 09:00 至 17:30，间隔 15 分钟。" />
        <SMotionText class="review__result" :value="appointment ? `预约 ${appointment.toString()}` : '尚未预约'" announce />
        <div class="review__editable-columns">
          <STimeField v-model="time12" label="12 小时制" locale="zh-CN" :hour-cycle="12" />
          <STimeField v-model="time24" label="24 小时制" :hour-cycle="24" />
          <STimeField v-model="secondsTime" label="精确到秒" :hour-cycle="24" granularity="second" />
          <STimeField label="锁定的时刻" :model-value="minTime" disabled />
        </div>
        <div class="review__editable-columns">
          <STimeField v-for="(status, i) in statusMessages" :key="status.type" :label="`${statusExamples[i]}的时刻`" locale="zh-CN"
            :model-value="new Time(12 + i, 30)" :hour-cycle="24" :status="status" />
        </div>
      </section>
    </I18nProvider>
  </template>

  <SCalendarYearPicker
    v-else-if="id === 'W.export.calendar-year-picker'"
    v-model="currentYear"
    label="归档年份"
    previous-label="更早年份"
    next-label="更晚年份"
    locale="zh-CN"
    :min-value="min"
    :max-value="max"
    :years-per-page="12"
    prevent-deselect
  />

  <DateFieldRoot
    v-else
    v-slot="{ segments }"
    v-model="date"
    locale="zh-CN"
    aria-label="计划日期"
    class="sy-date-control"
  >
    <SDateInputGroup :segments="segments" locale="zh-CN" />
  </DateFieldRoot>
</template>
