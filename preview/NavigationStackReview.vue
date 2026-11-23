<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { SButton, SInput, SNavigationStack, useNavigationStack, type NavigationScreen } from '../src'

interface LibraryFile { title: string; format: string; size: string }
interface Folder { id: string; title: string; files: LibraryFile[] }
interface LibraryScreen extends NavigationScreen { folder?: Folder; file?: LibraryFile }

const folders: Folder[] = [
  { id: 'resources', title: '品牌资源', files: [
    { title: '品牌规范', format: 'PDF', size: '4.8 MB' },
    { title: '标志组合', format: 'SVG', size: '280 KB' },
    { title: '产品配色', format: 'CSS', size: '6 KB' },
    { title: '文字样式', format: 'JSON', size: '12 KB' },
    { title: '插画索引', format: 'PDF', size: '1.5 MB' },
  ] },
  { id: 'components', title: 'UI 组件', files: [
    { title: '导航组件', format: 'FIG', size: '2.4 MB' },
    { title: '表单组件', format: 'FIG', size: '1.8 MB' },
    { title: '数据展示', format: 'FIG', size: '3.1 MB' },
  ] },
  { id: 'delivery', title: '交付清单', files: [
    { title: '移动端验收', format: 'PDF', size: '1.2 MB' },
    { title: '桌面端验收', format: 'PDF', size: '1.6 MB' },
    { title: '版本记录', format: 'MD', size: '24 KB' },
  ] },
  { id: 'prototype', title: '交互原型', files: [
    { title: '项目导航流程', format: 'FIG', size: '6.8 MB' },
    { title: '文件审批流程', format: 'FIG', size: '4.3 MB' },
  ] },
  { id: 'research', title: '研究记录', files: [
    { title: '可用性访谈', format: 'PDF', size: '1.9 MB' },
    { title: '任务完成数据', format: 'CSV', size: '56 KB' },
  ] },
  { id: 'archive', title: '设计归档', files: [
    { title: '视觉探索', format: 'PDF', size: '3.4 MB' },
    { title: '布局草稿', format: 'FIG', size: '920 KB' },
  ] },
]
const screens = ref<LibraryScreen[]>([{ id: 'library', title: '资料库', titleDisplayMode: 'large' }])
const search = ref('')
function matches(folder: Folder) {
  const query = search.value.trim().toLocaleLowerCase()
  return folder.title.toLocaleLowerCase().includes(query) || folder.files.some(file => file.title.toLocaleLowerCase().includes(query))
}

const LibraryShortcut = defineComponent({
  setup() {
    const { popToRoot } = useNavigationStack()
    return () => h(SButton, { size: 'sm', variant: 'ghost', onClick: popToRoot }, () => '回到资料库')
  },
})
</script>

<template>
  <SNavigationStack v-model="screens" label="文件目录" height="15rem" class="navigation-review">
    <template #end="{ depth }">
      <LibraryShortcut v-if="depth > 1" />
    </template>
    <template #default="{ screen, push }">
      <dl v-if="screen.file" class="navigation-review__metadata">
        <div><dt>格式</dt><dd>{{ screen.file.format }}</dd></div>
        <div><dt>大小</dt><dd>{{ screen.file.size }}</dd></div>
      </dl>
      <ul v-else-if="screen.folder" class="navigation-review__rows">
        <li v-for="file in screen.folder.files" :key="file.title">
          <SButton size="sm" variant="ghost"
            @click="push({ id: `${screen.id}/${file.title}`, title: file.title, titleDisplayMode: 'large', file }, $event.currentTarget as HTMLElement)">
            {{ file.title }} <span class="navigation-review__meta" aria-hidden="true">{{ file.format }}</span>
          </SButton>
        </li>
      </ul>
      <div v-else class="navigation-review__library">
        <SInput v-model="search" label="资料搜索" />
        <ul class="navigation-review__rows">
          <li v-for="folder in folders.filter(matches)" :key="folder.id">
            <SButton size="sm" variant="ghost" :aria-label="`查看${folder.title}`"
              @click="push({ id: folder.id, title: folder.title, folder }, $event.currentTarget as HTMLElement)">
              {{ folder.title }} <span class="navigation-review__meta" aria-hidden="true">{{ folder.files.length }}</span>
            </SButton>
          </li>
        </ul>
      </div>
    </template>
  </SNavigationStack>
</template>

<style scoped>
.navigation-review__library,
.navigation-review__rows { display: grid; gap: var(--sy-space-1); }
.navigation-review__rows { margin: 0; padding: 0; list-style: none; }
.navigation-review__rows .sy-button {
  inline-size: 100%; border-radius: var(--sy-radius-sm); background: var(--sy-surface-subtle);
}
.navigation-review__rows .sy-button:hover { background: var(--sy-surface-muted); }
.navigation-review__rows :deep(.sy-button__inner), .navigation-review__rows :deep(.sy-button__label) { inline-size: 100%; }
.navigation-review__rows :deep(.sy-button__label) { display: flex; justify-content: space-between; gap: var(--sy-space-2); }
.navigation-review__meta { color: var(--sy-text-muted); font-variant-numeric: tabular-nums; }
.navigation-review__metadata { margin: 0; background: var(--sy-surface-subtle); border-radius: var(--sy-radius-sm); padding: var(--sy-space-2); }
.navigation-review__metadata > div { display: flex; justify-content: space-between; gap: var(--sy-space-2); }
.navigation-review__metadata dd { margin: 0; }
</style>
