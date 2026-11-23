<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SMotionText, SPowerSearch, STable, usePowerSearchConfig, type SearchField, type SearchFilter, type TableColumn } from '../src'

const states = [{ value: 'active', label: '进行中' }, { value: 'done', label: '已完成' }, { value: 'waiting', label: '待确认' }]
const priorities = [{ value: 'high', label: '高' }, { value: 'normal', label: '普通' }]
const people = [{ value: 'lin', label: '林舟' }, { value: 'zhou', label: '周昱' }, { value: 'xu', label: '许然' }]
const tags = [{ value: 'design', label: '设计' }, { value: 'delivery', label: '交付' }, { value: 'docs', label: '文档' }]
const directory = [
  { id: 'A01', title: '品牌组件规范', status: 'active', priority: 'high', owner: 'lin', tags: ['design', 'docs'] },
  { id: 'A02', title: '品牌发布清单', status: 'active', priority: 'high', owner: 'zhou', tags: ['delivery'] },
  { id: 'A03', title: '团队入职手册', status: 'done', priority: 'normal', owner: 'xu', tags: ['docs'] },
  { id: 'A04', title: '品牌色板', status: 'active', priority: 'normal', owner: 'lin', tags: ['design'] },
  { id: 'A05', title: '站点交付记录', status: 'waiting', priority: 'high', owner: 'zhou', tags: ['delivery', 'docs'] },
]
const columns: TableColumn<(typeof directory)[number]>[] = [
  { key: 'title', label: '资料', rowHeader: true, value: row => row.title },
  { key: 'owner', label: '负责人', value: row => people.find(item => item.value === row.owner)?.label },
  { key: 'status', label: '状态', value: row => states.find(item => item.value === row.status)?.label },
]
const fields: SearchField[] = [
  { key: 'title', label: '资料名称', type: 'text', defaultOperator: 'contains' },
  { key: 'status', label: '交付状态', type: 'enum', options: states },
  { key: 'priority', label: '资料优先级', type: 'enum', options: priorities },
  { key: 'tags', label: '资料标签', type: 'list', options: tags },
  { key: 'owner', label: '资料负责人', type: 'entity', search: async (term, signal) => {
    await new Promise(resolve => setTimeout(resolve, 180))
    return signal.aborted ? [] : people.filter(person => person.label.includes(term))
  } },
]
const { config, applyFilters } = usePowerSearchConfig(fields, { name: 'delivery-directory', contentSearchFieldKey: 'title' })
function preset(): SearchFilter[] {
  return [{ field: 'status', operator: 'is', value: 'active' }, { field: 'priority', operator: 'is', value: 'high' }]
}
const filters = ref(preset())
const query = ref('')
const visible = computed(() => applyFilters(filters.value, directory))
const labels = { add: '添加资料筛选', apply: '应用资料筛选', cancel: '取消', remove: '移除资料筛选', clear: '清空资料筛选',
  field: '资料条件字段', operator: '资料条件运算符', value: '资料条件值', filters: '资料筛选', done: '完成',
  back: '返回', confirmClear: '清空资料筛选？', empty: '暂无筛选' }
</script>

<template>
  <section class="power-search-scenarios" aria-label="资料筛选和实时结果">
    <h3>交付资料目录</h3>
    <SPowerSearch v-model="filters" v-model:query="query" :config="config" label="按资料名称搜索" placeholder="输入文件标题并回车"
      :labels="labels" :operator-labels="{ is: '等于', contains: '包含', in: '包括任一' }" field-suggestions
      :result-count="visible.length" :result-count-label="count => `${count} 条资料`">
      <template #end="{ count }"><span role="status" aria-label="匹配资料数量"><SMotionText :value="`${count} 条资料`" motion="roll" /></span></template>
    </SPowerSearch>
    <SButton size="sm" variant="secondary" @click="filters = preset(); query = ''">恢复预设筛选</SButton>
    <STable label="匹配的交付资料" :rows="visible" :columns="columns" :row-key="row => row.id" />
  </section>
</template>

<style scoped>
.power-search-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.power-search-scenarios h3 { margin: 0; }
.power-search-scenarios > .sy-button { justify-self: start; }
</style>
