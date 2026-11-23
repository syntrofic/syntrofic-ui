<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { SBadge, SButton, SCalendar, SChatTool, SChip, SDateField, SInternationalizationProvider, SMotionText, SNavbar,
  SPagination, SSegment, SSelect, STable, frFR, type LocaleCatalogs } from '../src'
import LocaleDirectionChart from './LocaleDirectionChart.vue'
import LocaleHookFields from './LocaleHookFields.vue'

const language = ref<string | null>('en')
const languages = [{ value: 'en', label: 'English' }, { value: 'fr-FR', label: 'Français' }]
const formatLocale = ref<string | null>('en-US')
const formats = [
  { value: 'en-US', label: '英语' }, { value: 'de-DE', label: '德语' },
  { value: 'sv-SE', label: '瑞典语' }, { value: 'fr-FR', label: '法语' },
]
const formatCatalog: LocaleCatalogs = {
  en: { 'project.visible': 'Showing {visible} of {total}', 'project.loadMore': 'Load more tasks' },
  de: { 'project.visible': '{visible} von {total} Aufgaben', 'project.loadMore': 'Weitere Aufgaben laden' },
  sv: { 'project.visible': 'Visar {visible} av {total}', 'project.loadMore': 'Läs in fler uppgifter' },
  fr: { 'project.visible': '{visible} tâches sur {total}', 'project.loadMore': 'Afficher plus de tâches' },
}
const regionalCatalogs: LocaleCatalogs = { en: { 'select.placeholder': 'Select an option' }, 'fr-FR': frFR }
const overrides: LocaleCatalogs = { en: { 'select.placeholder': 'Choose a delivery region' } }
const regions = [
  { value: 'north', label: '北区' }, { value: 'south', label: '南区' }, { value: 'international', label: '跨境' },
]
const currencies = [{ value: 'cny', label: '人民币' }, { value: 'eur', label: '欧元' }, { value: 'jpy', label: '日元' }]
const direction = ref<string | null>('ltr')
const page = ref(2)
const directions = [{ value: 'ltr', label: '从左往右' }, { value: 'rtl', label: '从右往左' }]
const labelSamples = {
  arabic: 'مراجعة مستندات الإصدار والإتاحة ٢٠٢٦',
  hebrew: 'סקירת מסמכי ההפצה והנגישות 2026',
  latin: '+2026 Release accessibility review',
  mixed: 'مراجعة مستندات الإصدار · Release review',
}
const labelScript = ref<keyof typeof labelSamples>('arabic')
const scripts = [
  { value: 'arabic', label: '阿拉伯文' }, { value: 'hebrew', label: '希伯来文' },
  { value: 'latin', label: '拉丁文' }, { value: 'mixed', label: '混合文字' },
]
const sampleLabel = computed(() => labelSamples[labelScript.value ?? 'arabic'])
const narrowOptions = computed(() => [{ value: 'review', label: sampleLabel.value }, { value: 'next', label: '下一项' }])
const labelColumns = computed(() => [{ key: 'title', label: sampleLabel.value, width: '128px',
  value: (row: { id: number; label: string }) => row.label }])
const calendar = ref<string | null>('japanese')
const calendars = [{ value: 'gregory', label: '公历' }, { value: 'japanese', label: '日本历' }, { value: 'buddhist', label: '佛历' }]
const date = shallowRef<DateValue | undefined>(new CalendarDate(2026, 11, 22))
const isoDate = computed(() => date.value?.toString() ?? '')
function selectDate(value: DateValue | DateValue[] | undefined) {
  date.value = Array.isArray(value) ? value[0] : value
}
</script>

<template>
  <section class="localization-scenarios" aria-label="语言包与字段覆盖">
    <SSegment v-model="language" :items="languages" label="字段语言" size="sm" />
    <SInternationalizationProvider as="div" :locale="language ?? 'en'" :messages="regionalCatalogs">
      <SSelect label="交付区域" :options="regions" clearable />
    </SInternationalizationProvider>
    <SInternationalizationProvider as="div" locale="en" :messages="regionalCatalogs" :overrides="overrides" class="localization-scenarios__fields">
      <SSelect label="账单区域" :options="regions" clearable />
      <SSelect label="币种" :options="currencies" placeholder="选择结算币种" clearable />
    </SInternationalizationProvider>
  </section>
  <section class="localization-scenarios" aria-label="双向布局与分页">
    <SSegment v-model="direction" :items="directions" label="布局方向" size="sm" />
    <SInternationalizationProvider as="div" locale="en" :dir="direction === 'rtl' ? 'rtl' : 'ltr'" class="localization-scenarios__fields" data-explicit-direction>
      <SPagination v-model="page" label="发布记录分页" :total="5" variant="compact" previous-label="前一页发布记录" next-label="后一页发布记录" />
    </SInternationalizationProvider>
    <SInternationalizationProvider as="div" :locale="direction === 'rtl' ? 'ar' : 'en'" class="localization-scenarios__fields">
      <LocaleDirectionChart />
    </SInternationalizationProvider>
  </section>
  <section class="localization-scenarios" aria-label="窄控件的双向文字">
    <SSegment :model-value="labelScript" :items="scripts" label="示例文字" size="sm"
      @update:model-value="labelScript = $event as keyof typeof labelSamples" />
    <div :dir="direction === 'rtl' ? 'rtl' : 'ltr'" class="localization-scenarios__narrow" data-label-direction-preview>
      <SButton size="sm" variant="secondary" data-sample-button>
        <template #start><span aria-hidden="true">←</span></template>{{ sampleLabel }}
      </SButton>
      <SBadge dot :label="sampleLabel" />
      <SChip :label="sampleLabel" />
      <SSegment :model-value="'review'" :items="narrowOptions" :direction="direction === 'rtl' ? 'rtl' : 'ltr'"
        full-width size="sm" label="审核阶段" />
      <SNavbar :brand="sampleLabel" brand-href="#release-label" label="发布导航" />
      <SChatTool :tool="{ toolName: sampleLabel, state: 'output-available' }" />
      <STable id="release-label" label="发布记录" :columns="labelColumns" :rows="[{ id: 1, label: sampleLabel }]"
        :row-key="row => row.id" text-overflow="truncate" />
    </div>
  </section>
  <section class="localization-scenarios" aria-label="多历法日期选择">
    <SSegment v-model="calendar" :items="calendars" label="日期显示历法" size="sm" />
    <SInternationalizationProvider as="div" locale="en" :calendar="calendar ?? 'gregory'" class="localization-scenarios__fields">
      <SDateField v-model="date" label="交付起始日期" />
      <SCalendar :model-value="date" label="交付日历" @update:model-value="selectDate" />
      <output aria-label="日期保存值"><SMotionText :value="isoDate" /></output>
    </SInternationalizationProvider>
  </section>
  <section class="localization-scenarios" aria-label="按语言格式化与排序">
    <SSegment v-model="formatLocale" :items="formats" label="发票与任务语言" size="sm" />
    <SInternationalizationProvider as="div" :locale="formatLocale ?? 'en-US'" :messages="formatCatalog" class="localization-scenarios__fields">
      <LocaleHookFields />
    </SInternationalizationProvider>
  </section>
</template>

<style scoped>
.localization-scenarios, .localization-scenarios__fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.localization-scenarios__fields { max-inline-size: 26rem; }
.localization-scenarios__fields :deep(.sy-calendar) { inline-size: min(100%, 23rem); }
.localization-scenarios__narrow { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-2); inline-size: min(100%, 10rem); }
.localization-scenarios__narrow > :is(:deep(.sy-badge), :deep(.sy-chip)) { justify-self: start; }
</style>
