<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAppLayout, SButton, SMobileNavToggle, SMotionText, SNavbar, SSelect, SSidebar, type NavigationItem, type SidebarGroup, type SidebarPage } from '../src'
import MobileShellActions from './MobileShellActions.vue'
import TopNavScenariosReview from './TopNavScenariosReview.vue'
import ShellScenariosReview from './ShellScenariosReview.vue'
import SideNavScenariosReview from './SideNavScenariosReview.vue'

defineProps<{ id: string }>()

const route = ref('/workspace/overview')
const top = ref('overview')
const page = ref('workspace')
const active = ref('overview')
const shellExample = ref('workbench')
const shellExamples = [
  { value: 'workbench', label: '项目工作台' },
  { value: 'content', label: '仅正文' },
  { value: 'top', label: '仅顶部导航' },
  { value: 'side', label: '仅侧栏导航' },
  { value: 'paired', label: '顶部与侧栏导航' },
  { value: 'notice', label: '带公告栏的工作台' },
]
const mobileBehavior = ref<'auto' | 'manual' | 'disabled' | 'managed'>('managed')
const mobileNav = computed(() => mobileBehavior.value === 'disabled' ? false as const : { hasToggle: mobileBehavior.value !== 'manual' })
const items: NavigationItem[] = [
  { id: 'overview', label: '概览', shortLabel: '概', href: '/workspace/overview' },
  { id: 'projects', label: '项目', shortLabel: '项', href: '/workspace/projects' },
  { id: 'files', label: '文件', shortLabel: '文', href: '/workspace/files' },
]
const groups: SidebarGroup[] = [
  { id: 'workspace', label: '工作区', items },
  {
    id: 'team', label: '团队', collapsible: true, defaultExpanded: true,
    items: [
      {
        id: 'members', label: '成员', shortLabel: '员', href: '/workspace/members',
        children: [{ id: 'permission', label: '权限', href: '/workspace/permission' }],
      },
      { id: 'archive', label: '归档', shortLabel: '档', href: '/workspace/archive' },
    ],
  },
]
const navbarItems = items.map(({ href: _, ...item }) => item)
const standaloneGroups = groups.map(group => ({
  ...group,
  items: group.items.map(({ href: _, children, ...item }) => ({
    ...item, children: children?.map(({ href: _, ...child }) => child),
  })),
}))
const pages: SidebarPage[] = [
  { id: 'workspace', groups: standaloneGroups },
  { id: 'settings', groups: [{ id: 'settings', label: '设置', items: [
    { id: 'account', label: '账户', shortLabel: '账' },
    { id: 'notifications', label: '通知', shortLabel: '通' },
  ] }] },
]
const names: Record<string, string> = {
  overview: '概览', projects: '项目', files: '文件', members: '成员', archive: '归档',
  permission: '权限', account: '账户', notifications: '通知',
}
const records: Record<string, readonly [string, string][]> = {
  overview: [['品牌资源库', '设计团队'], ['官网改版', '产品团队']],
  projects: [['官网改版', '进行中'], ['组件库', '待评审']],
  files: [['品牌手册', 'PDF'], ['组件规范', '文档']],
  members: [['林舟', '设计'], ['许然', '产品']],
  archive: [['秋季活动', '已归档']],
  permission: [['设计团队', '可编辑'], ['产品团队', '可查看']],
}
const routeId = computed(() => route.value.split('/').at(-1) ?? 'overview')
const rows = computed(() => records[routeId.value] ?? [])
const selectedTitle = computed(() => names[routeId.value] ?? '概览')
function navigate(href: string) { route.value = href }
function switchPage() {
  page.value = page.value === 'workspace' ? 'settings' : 'workspace'
  active.value = page.value === 'workspace' ? 'overview' : 'account'
}
</script>

<template>
  <div v-if="id === 'WP.app-layout'" class="review-app-shell">
    <SSelect v-model="shellExample" label="应用布局示例" :options="shellExamples" class="review-app-shell__choice" />
    <Transition name="shell-preview" mode="out-in">
    <SAppLayout
      v-if="shellExample === 'workbench'"
      :breakpoint="610" :sidebar-size="145" :sidebar-min="128" :sidebar-max="248" :aside-size="132" :aside-min="118"
      variant="inset" resize-sidebar :navigate="navigate" sidebar-title="工作区导航" aside-title="项目详情"
      sidebar-resize-label="调整侧栏宽度" dismiss-label="关闭" main-label="工作区内容"
      :mobile-nav="mobileNav"
    >
      <template #navbar="{ compact, sidebarOpen, asideOpen, sidebarId, asideId, toggleSidebar, toggleAside }">
        <SNavbar brand="工作台" label="顶部导航" menu-label="菜单" :items="items" :current-path="route">
          <template v-if="mobileBehavior !== 'auto'" #end>
            <SButton v-if="!compact" size="sm" variant="secondary" :aria-expanded="sidebarOpen" :aria-controls="sidebarId" @click="toggleSidebar">导航</SButton>
            <SMobileNavToggle v-if="mobileBehavior !== 'manual'" label="导航" />
            <SButton size="sm" variant="secondary" :aria-expanded="asideOpen" :aria-controls="asideId" @click="toggleAside">详情</SButton>
          </template>
        </SNavbar>
      </template>
      <template #sidebar>
        <SSidebar :groups="groups" :current-path="route" label="工作区链接" expand-label="展开" />
        <MobileShellActions variant="close" />
      </template>
      <section class="review-app-shell__main">
        <h3><SMotionText :value="selectedTitle" /></h3>
        <div v-if="routeId === 'overview'" class="review-app-shell__totals">
          <div><span>进行中</span><strong>04</strong></div>
          <div><span>待评审</span><strong>02</strong></div>
        </div>
        <ul class="review-app-shell__records">
          <li v-for="[name, detail] in rows" :key="name"><span>{{ name }}</span><small>{{ detail }}</small></li>
        </ul>
        <div class="review__row">
          <label>移动导航触发器
            <select v-model="mobileBehavior">
              <option value="managed">指定位置</option>
              <option value="manual">自定义</option>
              <option value="auto">自动</option>
              <option value="disabled">关闭</option>
            </select>
          </label>
          <MobileShellActions variant="trigger" />
        </div>
      </section>
      <template #aside>
        <div class="review-app-shell__details">
          <h4>项目详情</h4>
          <dl><dt>当前项目</dt><dd>品牌资源库</dd><dt>可见范围</dt><dd>团队可见</dd></dl>
        </div>
      </template>
    </SAppLayout>
    <ShellScenariosReview v-else :key="shellExample" :layout="shellExample ?? 'content'" />
    </Transition>
  </div>
  <div v-else-if="id === 'WP.navbar'" class="review-app-shell review-app-shell--nav">
    <SNavbar
      v-model="top" brand="项目空间" label="项目顶部导航" menu-label="菜单"
      :items="navbarItems" position="floating" lock-scroll
    >
      <template #end><SButton size="sm" variant="secondary" @click="top = 'projects'">查看项目</SButton></template>
    </SNavbar>
    <section class="review-app-shell__nav-body">
      <h3><SMotionText :value="names[top] ?? '概览'" /></h3>
      <ul class="review-app-shell__records">
        <li v-for="[name, detail] in records[top]" :key="name"><span>{{ name }}</span><small>{{ detail }}</small></li>
      </ul>
    </section>
    <TopNavScenariosReview />
  </div>
  <template v-else>
  <div class="review-app-shell review-app-shell--sidebar">
    <SSidebar
      v-model="active" v-model:page="page" :pages="pages" :breakpoint="420" label="项目侧栏" toggle-label="导航"
      expand-label="展开" dismiss-label="关闭" show-toggle
    >
      <template #trigger="{ toggle, open, controls, compact }">
        <SButton size="sm" variant="secondary" :aria-expanded="open" :aria-controls="controls" @click="toggle">导航</SButton>
        <SButton v-if="!compact" size="sm" variant="secondary" @click="switchPage">切换分区</SButton>
      </template>
    </SSidebar>
    <div class="review-app-shell__sidebar-body"><SMotionText :value="names[active] ?? '概览'" announce /></div>
  </div>
  <SideNavScenariosReview />
  </template>
</template>

<style scoped>
.review-app-shell__choice { margin-block-end: var(--sy-space-3); }
.shell-preview-enter-active, .shell-preview-leave-active {
  transition: opacity var(--sy-motion-replace) var(--sy-ease-settle), translate var(--sy-motion-replace) var(--sy-ease-settle);
}
.shell-preview-enter-from, .shell-preview-leave-to { opacity: 0; translate: 0 5px; }
@media (prefers-reduced-motion: reduce) {
  .shell-preview-enter-from, .shell-preview-leave-to { translate: none; }
}
</style>
