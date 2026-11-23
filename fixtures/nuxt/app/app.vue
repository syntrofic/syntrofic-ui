<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { SButton, SCalendar, SColorPicker, SDatePicker, SDialog, SDrawer, SFocusGroup, SInput, SLayerProvider, SProgressBar, SSelect, STable, STextField,
  toSearchFilters, useLayer, usePowerSearchConfig, useTableColumnsVirtualization, useTableFiltering, useTableFilterState, useTableRowsVirtualization,
  useTableStickyColumns, type TableColumn } from '@syntrofic/ui'
import SCalendarYearPicker from '@syntrofic/ui/calendar-year-picker'
import SColorInputGroup from '@syntrofic/ui/color-input-group'
import { I18nProvider, parseColor, type ColorValue } from '@syntrofic/ui/rac'

const query = ref('')
const categories = ref<string[]>(['design'])
const open = ref(false)
const releaseLayer = useLayer({ lazyMount: true, lightDismiss: true })
const ReleaseLayerContent = defineComponent(() => () => releaseLayer.render('浮层内容在展开时显示。', { label: '发布辅助图层' }))
const release = shallowRef(new CalendarDate(2026, 11, 18))
const brand = shallowRef<ColorValue | null>(parseColor('#859589'))
const hex = ref('#859589')
const options = [
  { label: '设计', value: 'design' },
  { label: '产品', value: 'product' },
]
const rows = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, title: `项目 ${i + 1}` }))
const columns: TableColumn<typeof rows[number]>[] = [
  { key: 'title', label: '项目名称', rowHeader: true, width: '128px', filter: 'title', value: row => row.title },
  ...Array.from({ length: 12 }, (_, index): TableColumn<typeof rows[number]> => ({
    key: 'cycle-' + (index + 1), label: '周期 ' + (index + 1), width: '104px', value: row => row.id + index,
  })),
]
const rowsWindow = useTableRowsVirtualization({ rowHeight: 38, initialViewportHeight: 200 })
const columnsWindow = useTableColumnsVirtualization({ initialViewportWidth: 520 })
const pinned = useTableStickyColumns({ startKeys: ['title'] })
const tableFilters = useTableFilterState()
const { config, applyFilters } = usePowerSearchConfig([{ key: 'title', label: '项目名称' }])
const filteredRows = computed(() => applyFilters(toSearchFilters(tableFilters.columnFilters.value, columns, config.value), rows))
const columnFiltering = useTableFiltering(() => ({ filters: tableFilters.columnFilters.value, onFilterChange: tableFilters.onFilterChange,
  searchConfig: config.value, getLabel: label => '筛选' + label, labels: { apply: '应用' } }))
</script>

<template>
  <main style="max-width: 520px; margin: 20px auto; display: grid; gap: 12px">
    <h1>项目管理</h1>
    <SFocusGroup style="display: grid; gap: 8px">
      <STextField label="查找项目">
        <SInput v-model="query" />
      </STextField>
      <SSelect v-model="categories" multiple label="分类" name="category" :options="options" />
    </SFocusGroup>
    <SButton @click="open = true">归档项目</SButton>
    <SLayerProvider :inset="{ blockStart: '2rem' }">
      <section aria-label="发布工具">
        <p><button :ref="releaseLayer.ref" type="button" :aria-expanded="releaseLayer.open.value"
          :aria-controls="releaseLayer.id" @click="releaseLayer.show()">显示发布辅助图层</button><ReleaseLayerContent /></p>
      </section>
    </SLayerProvider>
    <SDialog v-model:open="open" title="归档项目？" dismiss-label="取消" />
    <SDatePicker v-model="release" locale="zh-CN" label="发布日期" trigger-text="日历" trigger-label="打开发布日期日历" :visible-duration="{ days: 5 }" />
    <SCalendar :model-value="release" locale="ar-SA-u-ca-islamic-umalqura" dir="rtl" label="发布周历" :visible-duration="{ weeks: 2 }" readonly />
    <SCalendarYearPicker :model-value="release" locale="zh-CN" label="归档年份" readonly />
    <SDrawer title="发布设置" dismiss-label="关闭设置">
      <template #trigger><SButton>查看发布设置</SButton></template>
      <SProgressBar label="同步进度" :value="72" locale="zh-CN" />
    </SDrawer>
    <I18nProvider locale="zh-CN">
      <STextField label="备用颜色">
        <SColorInputGroup>
          <SInput v-model="hex" />
          <template #end>HEX</template>
        </SColorInputGroup>
      </STextField>
      <SColorPicker v-model="brand" label="打开品牌色" field-label="品牌色值" done-label="完成取色" />
    </I18nProvider>
    <div style="block-size: 238px">
      <STable label="项目列表" :rows="filteredRows" :columns="columns" :row-key="row => row.id"
        :virtualization="[rowsWindow, columnsWindow]" :sticky-columns="pinned" :column-filtering="columnFiltering" />
    </div>
  </main>
</template>
