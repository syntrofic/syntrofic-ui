<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCarousel, SPagination, STable, type TableColumn } from '../src'

const compact = ref(3)
const direct = ref(1)
const shift = ref(1)
const tablePage = ref(1)
const perPage = ref(4)
const applied = ref({ page: 1, size: 4 })
const slides = [
  { id: 'brand', label: '品牌资料', detail: '包含标志、色板和使用规则。' },
  { id: 'writing', label: '文案校对', detail: '核对页面文字、链接和发布日期。' },
  { id: 'pack', label: '文件归档', detail: '将审核后的成品和源文件入库。' },
]
const index = ref(0)
const activeSlide = computed({ get: () => index.value + 1, set: (page: number) => { index.value = page - 1 } })
const records = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1, title: '设计记录 ' + String(i + 1).padStart(2, '0'), owner: ['陈禾', '周昱', '陆珊'][i % 3],
}))
const columns: TableColumn<(typeof records)[number]>[] = [
  { key: 'title', label: '交付记录', value: row => row.title, rowHeader: true },
  { key: 'owner', label: '负责人', value: row => row.owner },
]
const shown = computed(() => {
  const { page, size } = applied.value
  return records.slice(size * (page - 1), size * page)
})
const labels = { firstLabel: '首页', previousLabel: '上一页', nextLabel: '下一页', lastLabel: '末页' }
const compactLabel = (page: number, total?: number) => total ? '第 ' + page + ' 页，共 ' + total + ' 页' : '第 ' + page + ' 页'
function loadPage(page: number, signal: AbortSignal, size: number) {
  return new Promise<void>(resolve => {
    function cancel() { clearTimeout(timer); resolve() }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      applied.value = { page, size }
      resolve()
    }, 380)
    signal.addEventListener('abort', cancel, { once: true })
  })
}
</script>

<template>
  <section class="pagination-scenarios" aria-label="不同内容的分页">
    <section class="pagination-scenarios__block" aria-label="交付说明轮播">
      <SCarousel v-model="index" label="交付阶段说明" :slides="slides" navigation="none" :show-controls="false">
        <template #slide="{ index: slide }">
          <div class="pagination-scenarios__slide"><h3>{{ slides[slide].label }}</h3><p>{{ slides[slide].detail }}</p></div>
        </template>
      </SCarousel>
      <SPagination v-model="activeSlide" :total="slides.length" label="选择交付阶段" variant="dots" :page-label="page => slides[page - 1].label" />
    </section>
    <section class="pagination-scenarios__block" aria-label="分页桌面与窄屏布局">
      <SPagination v-model="compact" :total-pages="10" :step="2" label="交付进度页码" variant="compact" has-first-last
        :compact-label="compactLabel" :get-page-href="page => '#交付进度-' + page" v-bind="labels" />
      <SPagination v-model="direct" :total="8" label="文档章节分页" variant="input" page-input-label="章节" v-bind="labels" />
      <SPagination v-model="shift" :has-more="shift < 3" label="按批次翻页" variant="compact" :compact-label="compactLabel" v-bind="labels" />
    </section>
    <section class="pagination-scenarios__block" aria-label="分页交付记录">
      <STable :rows="shown" :columns="columns" :row-key="row => row.id" label="分页后的交付记录" />
      <SPagination v-model="tablePage" v-model:page-size="perPage" :total-items="records.length" variant="count" label="交付记录分页"
        :range-label="(start, end, total) => start + '–' + end + ' 条，共 ' + total + ' 条'"
        :page-size-options="[4, 8, 12]" page-size-label="每页条数" loading-label="加载交付记录" :change-action="loadPage" v-bind="labels" />
    </section>
  </section>
</template>

<style scoped>
.pagination-scenarios, .pagination-scenarios__block { display: grid; min-inline-size: 0; gap: var(--sy-space-3); }
.pagination-scenarios { gap: var(--sy-space-5); }
.pagination-scenarios__slide { background: var(--sy-surface-sage); padding: var(--sy-space-5); border-radius: var(--sy-radius-md); }
.pagination-scenarios__slide p, .pagination-scenarios__slide h3 { margin: 0; }
.pagination-scenarios__slide p { margin-block-start: var(--sy-space-2); }
</style>
