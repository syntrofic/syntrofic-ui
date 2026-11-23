<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { SButton, SContextMenu, SDialog, SDropdown, SIcon, SInput, SMotionText, type MenuEntry } from '../src'

defineProps<{ kind: 'dropdown' | 'context' }>()

const projectActions = [
  { id: 'edit', label: '编辑项目', icon: 'wrench' },
  { id: 'duplicate', label: '复制项目', icon: 'copy' },
  { id: 'share', label: '共享项目', icon: 'link' },
  { id: 'divider', kind: 'separator' },
  { id: 'archive', label: '归档草稿', tone: 'danger' },
] satisfies MenuEntry[]
const documentActions = [
  { id: 'rename', label: '重命名文档', icon: 'file' },
  { id: 'copy', label: '创建文档副本', icon: 'copy' },
  { id: 'pinned', kind: 'checkbox', label: '标记为常用' },
  { id: 'display', kind: 'radio-group', label: '显示方式', items: [
    { id: 'compact', label: '紧凑视图' }, { id: 'comfortable', label: '舒展视图' },
  ] },
  { id: 'folders', kind: 'submenu', label: '移至文件夹', items: [
    { id: 'design', label: '设计资料' }, { id: 'restricted', label: '管理员资料', disabled: true },
  ] },
  { id: 'divider', kind: 'separator' },
  { id: 'trash', label: '移至废纸篓', tone: 'danger' },
] satisfies MenuEntry[]
const selected = ref<readonly string[]>(['compact'])
const documentOpen = ref(false)
const showOpenPreview = ref(false)
const manageOpen = ref(false)
const loadingPermissions = ref(false)
let permissionsLoaded = false
let permissionRequest: ReturnType<typeof setTimeout>
onScopeDispose(() => clearTimeout(permissionRequest))
function changeManageOpen(value?: boolean) {
  clearTimeout(permissionRequest)
  if (!value || permissionsLoaded) {
    loadingPermissions.value = false
    manageOpen.value = Boolean(value)
    return
  }
  loadingPermissions.value = true
  permissionRequest = setTimeout(() => {
    permissionsLoaded = true
    loadingPermissions.value = false
    manageOpen.value = true
  }, 360)
}
const result = ref('等待选择操作')
const projectName = ref('品牌资源库')
const draftName = ref('')
const editing = ref(false)
const groupedActions = [
  { id: 'project', kind: 'section', label: '项目操作', items: [
    { id: 'edit', label: '编辑项目' }, { id: 'duplicate', label: '复制项目' }, { id: 'share', label: '共享项目' },
  ] },
  { id: 'divider', kind: 'separator' },
  { id: 'manage', kind: 'section', label: '管理员操作', items: [
    { id: 'access', label: '查看访问权限' }, { id: 'archive', label: '归档草稿', tone: 'danger' }, { id: 'transfer', label: '转移所有权', disabled: true },
  ] },
] satisfies MenuEntry[]
const messages: Record<string, string> = {
  edit: '已进入项目编辑', duplicate: '已复制项目', share: '已生成项目共享链接', archive: '已归档草稿',
  access: '已打开访问权限',
  rename: '已打开文档重命名', copy: '已创建文档副本', design: '已移至设计资料', trash: '已移至废纸篓',
}
function choose(id: string) {
  if (id === 'edit') {
    draftName.value = projectName.value
    editing.value = true
  }
  result.value = messages[id] ?? id
}

function saveName() {
  projectName.value = draftName.value.trim()
  result.value = `已保存 ${projectName.value}`
  editing.value = false
}
</script>

<template>
  <section v-if="kind === 'dropdown'" class="menu-presentation-review" aria-label="项目菜单示例">
    <div class="menu-presentation-review__controls">
      <SDropdown label="项目操作" :items="projectActions" presentation="adaptive" dismiss-label="关闭项目操作" @action="choose" />
      <SDropdown label="草稿快捷操作" :items="projectActions" presentation="popover" @action="choose">
        <template #trigger>
          <SButton icon-only variant="ghost"><template #start><SIcon name="moreHorizontal" /></template>草稿快捷操作</SButton>
        </template>
      </SDropdown>
      <SDropdown label="管理项目" :items="groupedActions" :open="manageOpen" @update:open="changeManageOpen" @action="choose">
        <template #trigger><SButton variant="secondary" :loading="loadingPermissions">管理项目</SButton></template>
      </SDropdown>
      <SDropdown v-if="showOpenPreview" label="操作预览" :items="projectActions" default-open @action="choose" />
      <SButton v-else variant="ghost" @click="showOpenPreview = true">预览已展开菜单</SButton>
    </div>
    <p><SMotionText :value="result" announce /></p>
    <SDialog v-model:open="editing" title="编辑项目" dismiss-label="取消编辑">
      <SInput v-model="draftName" label="项目名称" autofocus />
      <template #footer="{ close }">
        <SButton variant="secondary" size="sm" @click="close">取消编辑</SButton>
        <SButton size="sm" :disabled="!draftName.trim()" @click="saveName">保存名称</SButton>
      </template>
    </SDialog>
  </section>
  <section v-else class="menu-presentation-review" aria-label="文档菜单示例">
    <div class="menu-presentation-review__documents">
      <SContextMenu v-model:selected="selected" label="资料操作" trigger-label="协作资料" :items="documentActions"
        presentation="adaptive" dismiss-label="关闭资料操作" @action="choose">
        <template #trigger>
          <div class="menu-presentation-review__document"><SIcon name="file" /><div><strong>协作资料</strong><small>右键或长按打开菜单</small></div></div>
        </template>
      </SContextMenu>
      <SContextMenu v-model:open="documentOpen" v-model:selected="selected" label="文档操作" trigger-label="工作区说明" :items="documentActions"
        presentation="bottom-sheet" dismiss-label="关闭文档操作" @action="choose">
        <template #trigger>
          <div class="menu-presentation-review__document"><SIcon name="file" /><div><strong>工作区说明</strong><small>在底部面板中操作</small></div></div>
        </template>
      </SContextMenu>
    </div>
    <div class="menu-presentation-review__controls"><SButton size="sm" variant="secondary" @click="documentOpen = true">打开文档操作</SButton></div>
    <p><SMotionText :value="result" announce /></p>
  </section>
</template>

<style scoped>
.menu-presentation-review { display: grid; min-inline-size: 0; gap: var(--sy-space-3); margin-block-start: var(--sy-space-3); }
.menu-presentation-review p { margin: 0; color: var(--sy-text-muted); font-size: .85rem; }
.menu-presentation-review__controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-2); }
.menu-presentation-review__documents { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: var(--sy-space-2); }
.menu-presentation-review__document { display: flex; align-items: start; gap: var(--sy-space-2); padding: var(--sy-space-3); background: var(--sy-surface-muted); border-radius: var(--sy-radius-sm); }
.menu-presentation-review__document > div { display: grid; min-inline-size: 0; gap: 3px; }
.menu-presentation-review__document small { color: var(--sy-text-muted); }
.menu-presentation-review__document :deep(.sy-icon) { flex: none; margin-block-start: 3px; }
</style>
