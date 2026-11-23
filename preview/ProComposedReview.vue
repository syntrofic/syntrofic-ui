<script setup lang="ts">
import ResizableToolsReview from './ResizableToolsReview.vue'
import CommandScenariosReview from './CommandScenariosReview.vue'
import { computed, ref } from 'vue'
import {
  SActionBar, SButton, SCheckbox, SCommand, SKbd, SMotionText, SResizable, SSegment, SSwitch,
  type ActionBarAction, type CommandGroup, type CommandItem, type ResizablePanel,
} from '../src'

defineProps<{ id: string }>()

const commandOpen = ref(false)
const lastAction = ref('')
const commandGroups: CommandGroup[] = [
  { id: 'navigation', label: '工作区', items: [
    { id: 'projects', label: '打开项目', description: '查看最近参与的项目', keywords: ['open project'], shortcut: ['command', 'O'] },
    { id: 'files', label: '检索文档', description: '按标题或关键字查找', keywords: ['search files', 'find document'] },
    { id: 'archive', label: '查看归档', keywords: ['archive'] },
  ] },
  { id: 'actions', label: '操作', items: [
    { id: 'create', label: '新建', keywords: ['create', 'new'], children: [
      { id: 'types', label: '新建内容', items: [
        { id: 'new-project', label: '新建项目', keywords: ['new project'] },
        { id: 'new-file', label: '新建文档', keywords: ['new file'] },
      ] },
    ] },
    { id: 'members', label: '邀请成员', description: '需要管理员权限', disabled: true },
  ] },
]
const commandDetails: Record<string, string> = {
  projects: '最近打开 · 官网改版、组件库',
  files: '搜索范围 · 团队共享文档',
  archive: '可恢复过去归档的项目。',
  create: '选择要创建的内容类型。',
}
function execute(item: CommandItem) {
  lastAction.value = `已执行「${item.label}」`
}

const vertical = ref('horizontal')
const orientations = [{ value: 'horizontal', label: '横向' }, { value: 'vertical', label: '纵向' }]
const horizontalPanels: ResizablePanel[] = [
  { id: 'files', label: '文件列表', defaultSize: '9rem', minSize: '5.75rem', maxSize: 63, collapsible: true, collapsedSize: '2.25rem', resizeBehavior: 'pixel' },
  { id: 'document', label: '文档预览', minSize: '6rem' },
]
const verticalPanels: ResizablePanel[] = [
  { id: 'files', label: '文件列表', defaultSize: 40, minSize: '3rem', maxSize: 70, collapsible: true, collapsedSize: '2.25rem' },
  { id: 'document', label: '文档预览', minSize: '4rem' },
]
const documents = [
  { id: 'colors', label: '品牌色板', summary: '用于产品界面和品牌物料。', palette: ['#d5ded0', '#e9dfd7', '#d9dfe5'] },
  { id: 'type', label: '字体规范', summary: '字号、行高与字重的使用规则。', palette: ['#d6dbd2', '#d6c1b8', '#ded6ca'] },
  { id: 'motion', label: '动效说明', summary: '按压、拖动与内容切换。', palette: ['#cbd4cb', '#e3e5d7', '#e6d4d3'] },
]
const doc = ref(documents[0].id)
const currentDoc = computed(() => documents.find(item => item.id === doc.value) ?? documents[0])

const initialFiles = [
  { id: 'brand', label: '品牌手册', status: '共享' },
  { id: 'guide', label: '组件规范', status: '私有' },
  { id: 'deck', label: '产品演示', status: '私有' },
  { id: 'assets', label: '设计素材', status: '共享' },
]
const files = ref(initialFiles)
const checked = ref<string[]>([])
const floating = ref(false)
const sharedMessage = ref('')
const selectAll = ref<HTMLElement | null>(null)
const actionBarActions: ActionBarAction[] = [
  { id: 'share', label: '设为共享', shortLabel: '共享' },
  { id: 'archive', label: '归档', variant: 'secondary' },
]

function selectFile(id: string, next: boolean) {
  checked.value = next ? [...new Set([...checked.value, id])] : checked.value.filter(key => key !== id)
}

function updateFiles(action: ActionBarAction) {
  const selected = new Set(checked.value)
  if (action.id === 'archive') files.value = files.value.filter(file => !selected.has(file.id))
  if (action.id === 'share') files.value = files.value.map(file => selected.has(file.id) ? { ...file, status: '共享' } : file)
  sharedMessage.value = action.id === 'archive' ? `已归档 ${selected.size} 项` : `已共享 ${selected.size} 项`
  checked.value = []
}

function restoreFiles() {
  files.value = initialFiles
  checked.value = []
  sharedMessage.value = ''
}
</script>

<template>
  <section v-if="id === 'WP.command'" class="review-pro-composed">
    <div class="review-pro-composed__command-surface">
      <SCommand
        v-model:open="commandOpen" title="快捷命令" input-label="搜索命令" list-label="命令结果"
        placeholder="搜索命令或输入关键字" empty-text="没有匹配的命令。" clear-label="清空"
        dismiss-label="关闭" back-label="返回" :groups="commandGroups" size="lg" @select="execute"
      >
        <template #trigger="{ open, expanded }">
          <SButton size="sm" variant="secondary" aria-haspopup="dialog" :aria-expanded="expanded" @click="open">
            打开命令面板
          </SButton>
        </template>
        <template #details="{ item }">
          <div class="review-pro-composed__command-detail">
            <strong>{{ item?.label ?? '搜索命令' }}</strong>
            <SMotionText v-if="item && commandDetails[item.id]" :value="commandDetails[item.id]" />
          </div>
        </template>
        <template #footer><SKbd :keys="['up', 'down']" separator="" /> 选择 <SKbd :keys="['enter']" /> 执行</template>
      </SCommand>
      <SKbd :keys="['command', 'K']" label="Command 或 Control 加 K" variant="light" />
    </div>
    <output class="review-pro-composed__result"><SMotionText :value="lastAction" /></output>
    <CommandScenariosReview />
  </section>

  <section v-else-if="id === 'WP.resizable'" class="review-pro-composed review-pro-composed--resizable">
    <SSegment v-model="vertical" :items="orientations" label="面板排列" size="sm" />
    <SResizable
      :key="vertical" label="文档工作区" :orientation="vertical === 'vertical' ? 'vertical' : 'horizontal'"
      :panels="vertical === 'vertical' ? verticalPanels : horizontalPanels"
      :storage-key="`review-resizable-${vertical}`" :height="vertical === 'vertical' ? '15rem' : '10rem'"
      handle="grip" handle-variant="secondary" :resize-label="() => '调整文档面板'"
    >
      <template #default="{ panel }">
        <div v-if="panel.id === 'files'" class="review-pro-composed__files">
          <h3>文件</h3>
          <button
            v-for="item in documents" :key="item.id" type="button" class="review-pro-composed__file"
            :aria-pressed="doc === item.id" @click="doc = item.id"
          >{{ item.label }}</button>
        </div>
        <article v-else class="review-pro-composed__document">
          <h3><SMotionText :value="currentDoc.label" /></h3>
          <p>{{ currentDoc.summary }}</p>
          <div class="review-pro-composed__swatches" aria-hidden="true">
            <div v-for="swatch in currentDoc.palette" :key="swatch" :style="{ background: swatch }" />
          </div>
        </article>
      </template>
      <template #collapsed="{ expand }">
        <button class="review-pro-composed__restore-pane" type="button" aria-label="展开文件列表" @click="expand">文件</button>
      </template>
    </SResizable>
    <ResizableToolsReview />
  </section>

  <section v-else class="review-pro-composed review-pro-composed--batch">
    <div class="review-pro-composed__batch-head">
      <div ref="selectAll">
        <SButton size="sm" variant="secondary" :disabled="!files.length" @click="checked = files.map(file => file.id)">全选</SButton>
      </div>
      <SSwitch v-model="floating">浮动</SSwitch>
    </div>
    <ul class="review-pro-composed__batch-list" aria-label="项目文件">
      <li v-for="file in files" :key="file.id">
        <SCheckbox :model-value="checked.includes(file.id)" @update:model-value="selectFile(file.id, Boolean($event))">{{ file.label }}</SCheckbox>
        <span>{{ file.status }}</span>
      </li>
    </ul>
    <div v-if="!files.length" class="review-pro-composed__batch-empty">
      <span>没有待处理文件</span>
      <SButton size="sm" variant="secondary" @click="restoreFiles">恢复示例</SButton>
    </div>
    <SActionBar
      label="文件批量操作" selected-label="已选" unit-label="项" clear-label="取消" :count="checked.length"
      :actions="actionBarActions" :count-digits="2" :position="floating ? 'floating' : 'inline'"
      :return-focus="() => selectAll?.querySelector('button:not(:disabled)') ?? null"
      @action="updateFiles" @clear="checked = []"
    />
    <output class="review-pro-composed__result"><SMotionText :value="sharedMessage" /></output>
  </section>
</template>
