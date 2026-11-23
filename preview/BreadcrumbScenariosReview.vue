<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { SBreadcrumbItem, SBreadcrumbs, SMotionText, type BreadcrumbItem, type MenuEntry } from '../src'

const teams = [{ id: 'brand', label: '品牌组' }, { id: 'product', label: '产品研发组' }, { id: 'delivery', label: '发布组' }]
const menu: MenuEntry[] = [...teams.slice(0, 2), { id: 'divider', kind: 'separator' }, teams[2]]
const team = ref('brand')
const currentTeam = computed(() => teams.find(row => row.id === team.value)!.label)
const currentFile = ref('审批记录')
const CustomAnchor = defineComponent((_, { slots }) => () => h('a', { 'data-custom-crumb': '' }, slots.default?.()))
const records = [
  { id: 'studio', label: '工作室', icon: 'home', href: '#studio' },
  { id: 'archive', label: '档案室', icon: 'folder', href: '#archive' },
  { id: 'events', label: '线下活动', href: '#events' },
  { id: 'year', label: '2026 年度', href: '#2026' },
  { id: 'current', label: '布展交接记录' },
]
const current = computed<BreadcrumbItem[]>(() => [
  { id: 'studio', label: '工作室', icon: 'home', actionable: true },
  { id: 'team', label: currentTeam.value, menu, icon: 'users' },
  { id: 'approvals', label: currentFile.value },
])
</script>

<template>
  <section class="breadcrumb-scenarios" aria-label="面包屑布局与操作">
    <SBreadcrumbs label="项目档案路径" :items="records" separator="›" />
    <SBreadcrumbs label="辅助路径" variant="supporting" :items="records.slice(2)" separator="·" />
    <div class="breadcrumb-scenarios__workspace">
      <SBreadcrumbs label="切换同级工作区" :items="current"
        @action="(_, id) => { team = id; currentFile = '审批记录' }"
        @activate="currentFile = '工作室概览'">
        <template #item="{ item }"><SMotionText v-if="item.id === 'team' || item.id === 'approvals'" :value="item.label" /><template v-else>{{ item.label }}</template></template>
      </SBreadcrumbs>
      <p aria-live="polite"><SMotionText :value="currentTeam + ' · ' + currentFile" /></p>
    </div>
    <SBreadcrumbs label="组合式报表路径" separator="→">
      <SBreadcrumbItem label="运营报表" icon="file" href="#reports" :as="CustomAnchor" />
      <SBreadcrumbItem label="交付周期" current />
    </SBreadcrumbs>
  </section>
</template>

<style scoped>
.breadcrumb-scenarios { display: grid; gap: var(--sy-space-4); min-inline-size: 0; }
.breadcrumb-scenarios__workspace { display: grid; gap: var(--sy-space-2); }
.breadcrumb-scenarios__workspace p { margin: 0; color: var(--sy-text-muted); font-size: .875rem; }
</style>
