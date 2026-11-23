<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SMoreMenu, SMotionText, SNavMenu, SNavMenuItem, SSidebar, SSideNavCollapseButton, SSideNavHeading, type MenuEntry, type NavigationItem } from '../src'

const workspace = ref('设计团队')
const selection = ref('draft')
const pinned = ref(false)
const description = ref('')
const entries: NavigationItem[] = [
  { id: 'calendar', label: '交付日程', icon: 'calendar' },
  { id: 'draft', label: '发布草稿', icon: 'file', selectedIcon: 'check' },
  { id: 'members', label: '团队成员', icon: 'users', children: [
    { id: 'roles', label: '成员权限', icon: 'lock' },
  ] },
  { id: 'records', label: '归档版本', icon: 'archive', disabled: true },
]
const groups = computed(() => [{ id: 'delivery', label: '交付工作区', items: pinned.value ? [entries[1], entries[0], ...entries.slice(2)] : entries }])
const actions = computed<MenuEntry[]>(() => [
  { id: 'pin', label: pinned.value ? '取消置顶草稿' : '置顶发布草稿' },
  { id: 'settings', label: '查看草稿权限' },
])
const currentLabel = computed(() => entries.flatMap(entry => [entry, ...(entry.children ?? [])]).find(entry => entry.id === selection.value)?.label ?? '')
function act(id: string) {
  if (id === 'pin') {
    pinned.value = !pinned.value
    description.value = pinned.value ? '已将发布草稿置顶' : '已取消置顶'
  } else {
    description.value = '发布草稿由当前团队的成员编辑'
  }
}
</script>

<template>
  <section class="side-nav-scenarios" aria-label="可折叠工作区侧栏">
    <SSidebar v-model="selection" label="交付资源侧栏" :groups="groups" :breakpoint="0" expand-label="展开">
      <template #start="{ rail }">
        <SSideNavHeading :heading="workspace" superheading="Syntrofic Studio" subheading="交付资料" icon="folder"
          :collapsed="rail" menu-label="切换团队账户">
          <template #menu>
            <SNavMenu label="选择团队账户">
              <SNavMenuItem label="设计团队" icon="users" @select="workspace = '设计团队'" />
              <SNavMenuItem label="交付团队" icon="upload" @select="workspace = '交付团队'" />
            </SNavMenu>
          </template>
        </SSideNavHeading>
      </template>
      <template #item-end="{ item }">
        <SBadge v-if="item.id === 'calendar'">3</SBadge>
        <small v-else-if="item.id === 'members'">8 人</small>
      </template>
      <template #item-actions="{ item }">
        <SMoreMenu v-if="item.id === 'draft'" label="发布草稿操作" :items="actions" @action="act" />
      </template>
      <template #end>
        <SSideNavCollapseButton collapse-label="收起交付侧栏" expand-label="展开交付侧栏" />
      </template>
    </SSidebar>
    <div class="side-nav-scenarios__content">
      <h3><SMotionText :value="currentLabel" /></h3>
      <output aria-label="侧栏操作结果"><SMotionText :value="description" /></output>
    </div>
  </section>
</template>

<style scoped>
.side-nav-scenarios { display: flex; align-items: start; flex-wrap: wrap; gap: var(--sy-space-3); min-inline-size: 0; }
.side-nav-scenarios > :deep(.sy-sidebar) { inline-size: auto; max-inline-size: 100%; }
.side-nav-scenarios__content { flex: 1 1 12rem; min-inline-size: 0; }
.side-nav-scenarios__content h3 { margin: var(--sy-space-2) 0; }
</style>
