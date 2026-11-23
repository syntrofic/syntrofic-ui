<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { SButton, SCheckbox, SDialog, SFocusGroup, SInput, SMotionText, SSelect, SSwitch, STable } from '../src'
import type { TableColumn, TableKey, TableSort } from '../src'

type Project = {
  id: number
  name: string
  owner: string
  area: 'design' | 'product' | 'engineering'
  files: number
  updated: string
}

const projects: Project[] = [
  { id: 1, name: '品牌资源库', owner: '林舟', area: 'design', files: 42, updated: '2026-11-20' },
  { id: 2, name: '产品体验规范', owner: '许然', area: 'product', files: 18, updated: '2026-11-19' },
  { id: 3, name: '组件文档', owner: '周昱', area: 'engineering', files: 116, updated: '2026-11-18' },
  { id: 4, name: '网站改版', owner: '章清', area: 'design', files: 33, updated: '2026-11-16' },
  { id: 5, name: '试点应用', owner: '宋一', area: 'product', files: 24, updated: '2026-11-14' },
  { id: 6, name: '发布工具', owner: '何辰', area: 'engineering', files: 9, updated: '2026-11-12' },
  { id: 7, name: '视觉素材', owner: '祁南', area: 'design', files: 71, updated: '2026-11-11' },
  { id: 8, name: '用户研究', owner: '肖芮', area: 'product', files: 13, updated: '2026-11-09' },
  { id: 9, name: '主题预览', owner: '苏景', area: 'engineering', files: 22, updated: '2026-11-08' },
]
const teams = { design: '设计', product: '产品', engineering: '工程' }
const areaOptions = [
  { label: '全部分类', value: 'all' },
  ...Object.entries(teams).map(([value, label]) => ({ label, value })),
]
const columns: TableColumn<Project>[] = [
  { key: 'name', label: '项目名称', value: row => row.name, sortable: true, rowHeader: true },
  { key: 'owner', label: '负责人', value: row => row.owner },
  { key: 'area', label: '分类', value: row => teams[row.area] },
  { key: 'files', label: '文件数', value: row => row.files, sortable: true, align: 'end' },
  { key: 'updated', label: '最近更新', value: row => row.updated, sortable: true, align: 'end' },
]

const theme = ref(false)
const search = ref('')
const area = ref('all')
const showArchived = ref(false)
const archived = ref<number[]>([])
const selected = ref<readonly TableKey[]>([])
const sort = ref<TableSort | null>(null)
const page = ref(1)
const dialogOpen = ref(false)
const committing = ref(false)
const dialogIds = ref<number[]>([])
const restoring = ref(false)
const result = ref('')
let task: ReturnType<typeof setTimeout> | undefined

const visible = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const archivedKeys = new Set(archived.value)
  return projects.filter(project =>
    archivedKeys.has(project.id) === showArchived.value &&
    (area.value === 'all' || project.area === area.value) &&
    (!query || `${project.name} ${project.owner}`.toLocaleLowerCase().includes(query)),
  )
})
const action = computed(() => showArchived.value ? '恢复项目' : '归档项目')
const dialogTitle = computed(() => restoring.value ? '恢复项目？' : '归档项目？')
const dialogDescription = computed(() => {
  const name = dialogIds.value.length === 1
    ? `「${projects.find(project => project.id === dialogIds.value[0])?.name}」`
    : `所选 ${dialogIds.value.length} 个项目`
  return restoring.value ? `${name}将返回项目列表。` : `${name}归档后可恢复。`
})

watch([search, area, showArchived], () => {
  page.value = 1
  selected.value = []
})
watch(dialogOpen, open => {
  if (open) return
  clearTimeout(task)
  task = undefined
  committing.value = false
})
onBeforeUnmount(() => clearTimeout(task))

function openDialog() {
  if (!selected.value.length) return
  dialogIds.value = selected.value.filter((id): id is number => typeof id === 'number')
  restoring.value = showArchived.value
  dialogOpen.value = true
}

function applyChanges() {
  if (task !== undefined || !dialogOpen.value) return
  committing.value = true
  task = setTimeout(() => {
    committing.value = false
    task = setTimeout(() => {
      const ids = new Set(dialogIds.value)
      archived.value = restoring.value
        ? archived.value.filter(id => !ids.has(id))
        : [...new Set([...archived.value, ...ids])]
      result.value = restoring.value ? `已恢复 ${ids.size} 个项目` : `已归档 ${ids.size} 个项目`
      dialogOpen.value = false
      selected.value = []
    }, 230)
  }, 680)
}
</script>

<template>
  <div class="workbench" :data-sy-theme="theme ? 'dark' : 'light'">
    <header class="workbench__top">
      <a class="workbench__brand" href="#projects">Syntrofic UI</a>
      <div class="workbench__links">
        <a href="?component=W.button">组件验收</a>
        <SSwitch v-model="theme">深色</SSwitch>
      </div>
    </header>

    <main id="projects" class="workbench__main">
      <header class="workbench__heading">
        <h1>{{ showArchived ? '项目归档' : '项目' }}</h1>
        <SCheckbox v-model="showArchived">查看归档</SCheckbox>
      </header>

      <SFocusGroup class="workbench__toolbar">
        <SInput v-model="search" label="查找" placeholder="项目名称或负责人" />
        <SSelect v-model="area" label="分类" :options="areaOptions" locale="zh-CN" />
      </SFocusGroup>

      <div class="workbench__actions">
        <p><SMotionText :value="`已选 ${selected.length} 项`" motion="roll" announce /></p>
        <SButton variant="secondary" size="sm" :aria-disabled="!selected.length || undefined" @click="openDialog">
          <SMotionText :value="action" />
        </SButton>
      </div>
      <STable
        v-model:selected="selected"
        v-model:sort="sort"
        v-model:page="page"
        :label="showArchived ? '项目归档' : '项目列表'"
        :rows="visible"
        :columns="columns"
        :row-key="row => row.id"
        :row-label="row => `选择${row.name}`"
        :page-size="5"
        selection-mode="multiple"
        select-all-label="选择本页全部项目"
        selection-column-label="选择项目"
        previous-label="上一页"
        next-label="下一页"
        page-label="项目分页"
        :empty-text="search || area !== 'all' ? '没有匹配的项目' : '这里还没有项目'"
        locale="zh-CN"
      />
      <p class="sy-visually-hidden" role="status">{{ result }}</p>
    </main>

    <SDialog v-model:open="dialogOpen" :title="dialogTitle" :description="dialogDescription" dismiss-label="取消">
      <template #footer="{ close }">
        <SButton size="sm" variant="secondary" autofocus @click="close">取消</SButton>
        <SButton class="workbench__confirm" size="sm" :variant="restoring ? 'primary' : 'danger'" :loading="committing" @click="applyChanges">
          {{ restoring ? '恢复项目' : '归档项目' }}
        </SButton>
      </template>
    </SDialog>
  </div>
</template>
