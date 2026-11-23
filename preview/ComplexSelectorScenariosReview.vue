<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { CalendarDateTime } from '@internationalized/date'
import { SButton, SComplexSelector, SDateTimeInput, SInput, SMotionText, STreeList, useGridFocus, type TreeListItem } from '../src'

const modes = [
  ['表格 · 紧凑', '表格 · 标准', '表格 · 宽松'],
  ['列表 · 紧凑', '列表 · 标准', '列表 · 宽松'],
]
const selectedMode = ref(modes[0][1])
const grid = useGridFocus({ columns: 3, cellSelector: '[role="gridcell"]', hasRovingTabIndex: true, getFocusTarget: cell => cell.querySelector('button') })
const gridRef = grid.gridRef
const initial = new CalendarDateTime(2026, 11, 24, 16, 30)
const deadline = ref<string>()
const editingDate = ref(false)
const draft = shallowRef<CalendarDateTime | undefined>(initial)
const presets = ['今日 18:00', '明日 12:00', '下周一 09:00']
function renderDeadline(value: CalendarDateTime) {
  return value.toString().split('T').map((part, index) => index ? part.slice(0, 5) : part).join(' ')
}

const folders: TreeListItem[] = [
  { id: 'team', label: '团队资料', icon: 'folder', kind: 'folder', children: [
    { id: 'brand', label: '品牌档案', icon: 'folder', kind: 'folder', children: [
      { id: 'logos', label: '标志库', icon: 'folder', kind: 'folder' },
      { id: 'guides', label: '用法指南', icon: 'folder', kind: 'folder' },
    ] },
    { id: 'review', label: '内部评审', icon: 'folder', kind: 'folder' },
  ] },
  { id: 'archive', label: '发布归档', icon: 'folder', kind: 'folder', children: [
    { id: 'year', label: '2026 年版本', icon: 'folder', kind: 'folder' },
  ] },
]
const names = new Map<string, string>()
function index(items: readonly TreeListItem[]) {
  for (const item of items) {
    names.set(item.id, item.label)
    if (item.children) index(item.children)
  }
}
index(folders)
const target = ref('team')
const folderQuery = ref('')
const expanded = shallowRef<readonly string[]>(['team'])
function filter(items: readonly TreeListItem[], term: string): TreeListItem[] {
  return items.flatMap(item => {
    if (item.label.includes(term)) return [item]
    const children = item.children ? filter(item.children, term) : []
    return children.length ? [{ ...item, children }] : []
  })
}
const branches = computed(() => folderQuery.value.trim() ? filter(folders, folderQuery.value.trim()) : folders)
function ancestors(items: readonly TreeListItem[]): string[] {
  return items.flatMap(item => item.children?.length ? [item.id, ...ancestors(item.children)] : [])
}
watch(folderQuery, value => { expanded.value = value.trim() ? ancestors(branches.value) : ['team'] })
</script>

<template>
  <section class="complex-scenarios" aria-label="组合选择器实际用法">
    <SComplexSelector v-model="selectedMode" label="文档显示布局" placeholder="选择布局" popup-width="23rem" start-icon="viewColumns">
      <template #value="{ value }"><SMotionText :value="value ?? ''" /></template>
      <template #default="{ commit, close }">
        <div ref="gridRef" role="grid" aria-label="预览布局网格" class="complex-scenarios__grid" @keydown="grid.handleKeyDown" @focusin="grid.handleFocus">
          <div v-for="(row, index) in modes" :key="index" role="row">
            <div v-for="mode in row" :key="mode" role="gridcell" :aria-selected="mode === selectedMode">
              <SButton size="sm" :variant="mode === selectedMode ? 'primary' : 'secondary'"
                @click="async () => { if (await commit(mode)) close() }">{{ mode }}</SButton>
            </div>
          </div>
        </div>
      </template>
    </SComplexSelector>
    <SComplexSelector v-model="deadline" label="交付截止时间" placeholder="设置截止时间" popup-width="20rem" start-icon="calendar"
      @open-change="shown => { if (!shown) editingDate = false }">
      <template #value="{ value }"><SMotionText :value="value ?? '设置截止时间'" /></template>
      <template #default="{ commit, close }">
        <div v-if="!editingDate" class="complex-scenarios__editor">
          <SButton v-for="preset in presets" :key="preset" size="sm" variant="secondary"
            @click="async () => { if (await commit(preset)) close() }">{{ preset }}</SButton>
          <SButton size="sm" variant="ghost" @click="editingDate = true">自定义日期和时间</SButton>
        </div>
        <Transition v-else name="sy-field-feedback" appear>
          <div class="complex-scenarios__editor">
            <SDateTimeInput v-model="draft" label="指定日期和时间" locale="zh-CN" :hour-cycle="24" presentation="popover" />
            <div class="review__row">
              <SButton size="sm" variant="secondary" @click="editingDate = false">返回选项</SButton>
              <SButton size="sm" :disabled="!draft" @click="async () => { if (draft && await commit(renderDeadline(draft))) close() }">应用截止时间</SButton>
            </div>
          </div>
        </Transition>
      </template>
    </SComplexSelector>
    <SComplexSelector v-model="target" label="目标文件夹" :trigger-label="names.get(target)" popup-width="19rem" start-icon="folder"
      @open-change="shown => { if (!shown) folderQuery = '' }">
      <template #value="{ value }"><SMotionText :value="names.get(value ?? '') ?? ''" /></template>
      <template #default="{ commit, close }">
        <div class="complex-scenarios__editor">
          <SInput v-model="folderQuery" label="搜索文件夹" placeholder="按名称筛选" start-icon="search" />
          <STreeList :items="branches" :selected="[target]" v-model:expanded="expanded" label="文件夹目录" empty-text="未找到文件夹"
            density="compact" activate-branches
            @activate="async node => { if (await commit(node.id)) close() }"
            @update:selected="async ids => { if (ids?.length && await commit(ids[0])) close() }" />
        </div>
      </template>
    </SComplexSelector>
  </section>
</template>

<style scoped>
.complex-scenarios, .complex-scenarios__editor, .complex-scenarios__grid { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.complex-scenarios__grid > div { display: grid; gap: 4px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.complex-scenarios__grid .sy-button { inline-size: 100%; padding-inline: 5px; white-space: normal; }
</style>
