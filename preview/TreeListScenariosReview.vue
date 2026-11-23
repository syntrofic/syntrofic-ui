<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { SBadge, SButton, SCard, SIcon, SMotionText, SSwitch, STreeList, type TreeListItem } from '../src'

const prefix = 'sy-tree-guides-' + useId() + '-'
const guides = ref(true)
const wide = ref(false)
const fileSelection = ref<readonly string[]>([])
const navigation = ref<readonly string[]>(['main'])
const unread = ref(4)
const result = ref('')
const files: readonly TreeListItem[] = [
  { id: 'source', label: '工作室素材', kind: 'folder', expanded: true, icon: 'folder', children: [
    { id: 'logos', label: '标志文件', kind: 'folder', icon: 'folder', children: [
      { id: 'primary', label: '主标志.svg', icon: 'file' },
      { id: 'secondary', label: '横版标志.svg', icon: 'file' },
    ] },
    { id: 'guide', label: '命名说明.md', icon: 'book' },
  ] },
  { id: 'download', label: '交付清单.csv', icon: 'file' },
]
const routes: readonly TreeListItem[] = [
  { id: 'main', label: '团队概览', icon: 'home', href: '#' + prefix + 'main' },
  { id: 'settings', label: '设置分类', kind: 'folder', icon: 'wrench', expanded: true, children: [
    { id: 'release', label: '发布设置', href: '#' + prefix + 'release' },
    { id: 'permissions', label: '高级权限', href: '#' + prefix + 'permissions' },
  ] },
  { id: 'docs', label: '维护文档', icon: 'book', href: '#' + prefix + 'docs' },
]
const destinations = routes.flatMap(item => item.children ?? [item])
const mail: readonly TreeListItem[] = [
  { id: 'inbox', label: '收件箱', kind: 'folder', expanded: true, icon: 'folder', children: [
    { id: 'unread', label: '未读消息', icon: 'bell' },
    { id: 'starred', label: '已收藏', icon: 'file' },
  ] },
  { id: 'outbox', label: '已发送', icon: 'link' },
  { id: 'draft', label: '邮箱草稿', icon: 'file' },
]
const current = computed(() => destinations.find(item => navigation.value.includes(item.id)) ?? destinations[0])
</script>

<template>
  <section class="tree-scenarios" aria-label="文件、设置和邮件目录">
    <div class="review__row">
      <SSwitch v-model="guides">显示文件树连接线</SSwitch>
      <SSwitch v-model="wide">宽松行距</SSwitch>
    </div>
    <div class="review__columns">
      <SCard>
        <STreeList v-model:selected="fileSelection" :items="files" label="素材文件浏览器" activate-on-click
          :variant="guides ? 'lineGuides' : 'noGuides'" :density="wide ? 'spacious' : 'compact'" @activate="result = '已打开' + $event.label">
          <template #start="{ item, expanded }"><SIcon :name="item.icon" :color="expanded && item.kind === 'folder' ? 'accent' : undefined" size="sm" /></template>
        </STreeList>
      </SCard>
      <SCard>
        <STreeList v-model:selected="navigation" :items="routes" label="工作室设置目录" activate-on-click @activate="result = '已打开' + $event.label">
          <template #end="{ item }">
            <SButton v-if="item.id === 'release'" size="sm" variant="ghost" @click="result = '已进入快捷设置'">快捷设置</SButton>
            <SIcon v-if="item.id === 'docs'" name="link" size="sm" />
          </template>
        </STreeList>
        <div v-for="item in destinations" :id="prefix + item.id" :key="item.id">
          <p v-if="item.id === current.id"><SMotionText :value="current.label" /></p>
        </div>
      </SCard>
      <SCard>
        <STreeList :items="mail" label="项目邮件目录" activate-on-click @activate="result = '已打开' + $event.label">
          <template #end="{ item }">
            <SBadge v-if="(item.id === 'inbox' || item.id === 'unread') && unread" tone="accent">
              <SMotionText :value="String(unread)" motion="roll" />
            </SBadge>
            <SBadge v-if="item.id === 'draft'" :label="1" />
          </template>
        </STreeList>
        <SButton size="sm" variant="ghost" :disabled="!unread" @click="unread = Math.max(0, unread - 1)">标记一条为已读</SButton>
      </SCard>
    </div>
    <output aria-label="目录操作结果"><SMotionText :value="result" /></output>
  </section>
</template>

<style scoped>
.tree-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.tree-scenarios p { margin-block: var(--sy-space-2) 0; }
</style>
