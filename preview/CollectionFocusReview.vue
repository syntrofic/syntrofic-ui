<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SCheckbox, SMotionText, useGridFocus, useListFocus, useTreeFocus, useTypeahead } from '../src'

defineProps<{ variant: 'list' | 'grid' | 'tree' }>()
const blockOslo = ref(false)
const note = ref('')
const stop = ref('循环按方向键浏览项目。')
const list = useListFocus({ itemSelector: '[data-focus-item]', boundarySelector: '[data-focus-boundary]',
  orientation: 'both', hasRovingTabIndex: true, hasCaretGuard: true, hasPaging: true, onEscape() { stop.value = '已结束列表导航。' } })
const listRef = list.listRef
const typeahead = useTypeahead({
  getItemLabels: () => list.getItems().map(item => item instanceof HTMLInputElement ? null : item.textContent),
  getCurrentIndex: () => list.getItems().findIndex(item => item === item.ownerDocument.activeElement),
  onMatch: list.focusItem,
  isDisabled: index => list.getItems()[index]?.getAttribute('aria-disabled') === 'true',
})
function listKey(event: KeyboardEvent) {
  if (list.ownsEvent(event) && !typeahead.onKeyDown(event)) list.handleKeyDown(event)
}
const labels = ['Örebro', 'Oslo', 'Odense', 'Łódź', 'Trondheim']

const gridNotice = ref('')
const rtl = ref(false)
const grid = useGridFocus({
  columns: 3, cellSelector: '[role="gridcell"]', hasRovingTabIndex: true, getFocusTarget: cell => cell.querySelector('button'),
  onNavigateBefore: (column, offset) => { gridNotice.value = `起始边界 · 第 ${column + 1} 列 · 步长 ${offset}` },
  onNavigateAfter: (column, offset) => { gridNotice.value = `结束边界 · 第 ${column + 1} 列 · 步长 ${offset}` },
  onPageDown: event => { gridNotice.value = event.shiftKey ? '下一组排期' : '下一页排期' },
})
const gridRef = grid.gridRef
const gridRows = [['周一', '周二', '周三'], ['周四', '周五', '周六'], ['周日', '下周一', '下周二']]
const palette = [
  ['深灰绿', '#456055'], ['苔绿', '#647655'], ['灰青', '#426779'], ['雾蓝', '#5076a0'],
  ['蓝灰', '#657382'], ['灰紫', '#746085'], ['浅陶土', '#a57163'], ['深陶土', '#83574e'],
  ['灰绿', '#a0b3a6'], ['淡苔绿', '#c2c9ac'], ['浅灰青', '#a0bac0'], ['淡雾蓝', '#bccce0'],
  ['浅蓝灰', '#c4ccd3'], ['淡紫', '#c9bed7'], ['烟粉', '#d0aab0'], ['砂色', '#e5cbb5'],
] as const
const selectedColor = ref('')
const swatches = useGridFocus({ columns: 8, cellSelector: '[role="gridcell"]', hasRovingTabIndex: true, getFocusTarget: cell => cell.querySelector('button') })
const swatchRef = swatches.gridRef

const opened = ref(false)
const treeNotice = ref('')
const tree = useTreeFocus({
  hasRovingTabIndex: true,
  onToggleExpand() { opened.value = !opened.value },
  onActivate(item) {
    if (item.hasAttribute('aria-expanded')) return false
    treeNotice.value = `已打开 ${item.textContent?.trim()}`
    return true
  },
})
const treeRef = tree.treeRef
</script>

<template>
  <section v-if="variant === 'list'" class="focus-review" aria-label="线性焦点工具示例">
    <SCheckbox v-model="blockOslo">禁用 Oslo</SCheckbox>
    <div ref="listRef" class="focus-review__list" role="toolbar" aria-label="目录键盘导航" data-focus-boundary
      @keydown="listKey" @focusin="list.handleFocus">
      <SButton v-for="label in labels" :key="label" data-focus-item size="sm" variant="ghost"
        :aria-disabled="label === 'Oslo' && blockOslo || undefined">{{ label }}</SButton>
      <input v-model="note" class="sy-field__control" data-focus-item aria-label="输入备注">
      <div role="toolbar" aria-label="独立工具栏" data-focus-boundary>
        <SButton data-focus-item size="sm" variant="ghost">独立动作</SButton>
      </div>
    </div>
    <output>{{ stop }}</output>
  </section>
  <section v-else-if="variant === 'grid'" class="focus-review" aria-label="网格焦点工具示例">
    <SCheckbox v-model="rtl">反向排列排期</SCheckbox>
    <div ref="gridRef" role="grid" aria-label="排期导航网格" :dir="rtl ? 'rtl' : 'ltr'" @keydown="grid.handleKeyDown" @focusin="grid.handleFocus">
      <div v-for="(row, index) in gridRows" :key="index" class="focus-review__grid-row" role="row">
        <div v-for="label in row" :key="label" role="gridcell">
          <SButton size="sm" variant="secondary" :disabled="label === '周二'">{{ label }}</SButton>
        </div>
      </div>
    </div>
    <output>{{ gridNotice }}</output>
    <div ref="swatchRef" class="focus-review__swatches" role="grid" aria-label="工作区色板"
      @keydown="swatches.handleKeyDown" @focusin="swatches.handleFocus">
      <div v-for="row in 2" :key="row" role="row">
        <div v-for="([label, color], column) in palette.slice((row - 1) * 8, row * 8)" :key="label" role="gridcell">
          <button type="button" :aria-label="label" :aria-pressed="selectedColor === label" :style="{ backgroundColor: color }"
            :tabindex="row === 1 && column === 0 ? 0 : -1" @click="selectedColor = label" />
        </div>
      </div>
    </div>
    <output aria-label="选择的色板颜色"><SMotionText :value="selectedColor" /></output>
  </section>
  <section v-else class="focus-review" aria-label="树形焦点工具示例">
    <div ref="treeRef" class="focus-review__tree" role="tree" aria-label="项目附件树" @keydown="tree.handleKeyDown" @focusin="tree.handleFocus">
      <div role="treeitem" aria-level="1" data-tree-id="assets" :aria-expanded="opened" tabindex="0">项目资料</div>
      <div v-if="opened" role="treeitem" aria-level="2" data-tree-id="brief" data-tree-disabled aria-disabled="true" tabindex="-1">Öppen</div>
      <div v-if="opened" role="treeitem" aria-level="2" data-tree-id="review" tabindex="-1">Översikt</div>
      <div role="treeitem" aria-level="1" data-tree-id="notes" tabindex="-1">Łódź</div>
    </div>
    <output>{{ treeNotice }}</output>
  </section>
</template>

<style scoped>
.focus-review { display: grid; gap: 8px; min-inline-size: 0; }
.focus-review__list { display: grid; grid-auto-rows: 36px; inline-size: min(100%, 15rem); max-block-size: 110px; overflow: auto; }
.focus-review__grid-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-block: 4px; max-inline-size: 19rem; }
.focus-review__swatches { display: grid; gap: .3rem; max-inline-size: 25rem; padding: .25rem; }
.focus-review__swatches [role='row'] { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: .3rem; }
.focus-review__swatches button { inline-size: 100%; aspect-ratio: 1; border: 0; border-radius: var(--sy-radius-sm); display: block; cursor: pointer; }
.focus-review__swatches button:is(:focus-visible, [aria-pressed='true']) { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.focus-review__tree [role='treeitem'] { padding: 5px 8px; border-radius: var(--sy-radius-sm); }
.focus-review__tree [aria-level='2'] { margin-inline-start: 1rem; }
.focus-review__tree [role='treeitem']:focus-visible { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.focus-review__tree [aria-disabled='true'] { color: var(--sy-text-muted); }
</style>
