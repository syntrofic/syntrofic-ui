<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { SButton, SCodeEditor, SDisclosure, SFileTree, SGrid, SInput, SMetadataList, SResizable, SRichTextEditor,
  SSearchField, SSegment, useAnimatedLayout, useOutlineFromMarkdown, type FileTreeNode, type ResizablePanel, type RichTextDocument } from '../src'
import { useShellCompact } from '../src/internal/shell-layout'

type PageBlock = { id: number; type: 'heading' | 'paragraph'; label: string; text: string; body: RichTextDocument }
const props = defineProps<{ kind: string }>()
const root = useTemplateRef<HTMLElement>('root')
const compact = useShellCompact(root, () => 640)
const doc = (text: string): RichTextDocument => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })
const blocks = ref<PageBlock[]>([{ id: 1, type: 'heading', label: '页标题', text: '交付记录', body: doc('') },
  { id: 2, type: 'paragraph', label: '段落', text: '', body: doc('记录设计、工程和验收交付。') }])
const blockId = ref(1)
const blockPanel = ref('blocks')
const pageCanvas = useTemplateRef<HTMLElement>('pageCanvas')
const animateBlocks = useAnimatedLayout({ scope: pageCanvas })
const selectedBlock = computed(() => blocks.value.find(item => item.id === blockId.value))
const selectedIndex = computed(() => blocks.value.findIndex(item => item.id === blockId.value))
const blockTabs = [{ value: 'blocks', label: '内容块' }, { value: 'properties', label: '属性' }]
let sequence = 2
function addBlock(type: PageBlock['type']) {
  const id = ++sequence
  blocks.value.push({ id, type, label: type === 'heading' ? '页标题' : '段落', text: '新标题', body: doc('填写内容') })
  blockId.value = id
  blockPanel.value = 'properties'
}
async function moveBlock(direction: -1 | 1) {
  const current = selectedIndex.value
  const next = current + direction
  if (current < 0 || next < 0 || next >= blocks.value.length) return
  const play = animateBlocks()
  const copy = [...blocks.value]
  const block = copy[current]
  copy[current] = copy[next]
  copy[next] = block
  blocks.value = copy
  await nextTick()
  play()
}

const folders: FileTreeNode[] = [
  { id: 'src', label: 'src', children: [
    { id: 'workspace', label: 'Workspace.vue' }, { id: 'styles', label: 'theme.css' },
    { id: 'controls', label: 'components', children: [{ id: 'toolbar', label: 'Toolbar.vue' }] },
  ] },
  { id: 'docs', label: 'docs', children: [{ id: 'readme', label: 'README.md' }, { id: 'review', label: 'review.md' }] },
  { id: 'manifest', label: 'package.json' },
]
const content: Record<string, string> = {
  workspace: '<script setup lang="ts">\nimport { SButton } from "@syntrofic/ui"\n<\/script>\n\n<template>\n  <SButton>保存项目</SButton>\n</template>',
  styles: ':root {\n  --sy-canvas: #ffffff;\n  --sy-accent: #425849;\n}',
  readme: '# 交付工作区\n\n## 接入\n\n使用 Vue 3 和 Syntrofic UI。\n\n## 验收\n\n检查键盘操作、默认白底和窄屏表现。',
  review: '# 验收清单\n\n- 键盘交互\n- 窄屏布局\n- 浅色模式', manifest: '{\n  "name": "delivery-workspace",\n  "dependencies": { "vue": "^3.5.0" }\n}',
  toolbar: '<template>\n  <nav aria-label="工作区">\n    <slot />\n  </nav>\n</template>',
}
function flatten(nodes: readonly FileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap(node => [node, ...flatten(node.children ?? [])])
}
const lookup = new Map(flatten(folders).map(item => [item.id, item]))
const selectedFile = ref<readonly string[]>(['workspace'])
const file = computed(() => lookup.get(selectedFile.value[0]))
const fileText = computed(() => content[file.value?.id ?? ''] ?? '')
const fileOutline = useOutlineFromMarkdown(fileText)
const fileView = ref('columns')
const fileViews = [{ value: 'columns', label: '分栏' }, { value: 'list', label: '列表' }, { value: 'grid', label: '网格' }]
const trail = ref<FileTreeNode[]>([])
const fileQuery = ref('')
const fileTerm = computed(() => fileQuery.value.trim().toLowerCase())
function showsFile(item: FileTreeNode): boolean {
  return item.label.toLowerCase().includes(fileTerm.value) || Boolean(item.children?.some(showsFile))
}
const browsable = (items: readonly FileTreeNode[]) => items.filter(showsFile)
const explorerColumns = computed(() => [folders, ...trail.value.map(folder => folder.children ?? [])].map(browsable))
const plainItems = computed(() => browsable(trail.value.at(-1)?.children ?? folders))
const panels: ResizablePanel[] = [
  { id: 'files', label: '文件', defaultSize: 23, minSize: '128px', collapsible: true },
  { id: 'code', label: '代码', defaultSize: 53, minSize: '240px' },
  { id: 'inspector', label: '检查器', defaultSize: 24, minSize: '140px', collapsible: true },
]
const editorPanels: ResizablePanel[] = [{ id: 'editor', label: '编辑区', defaultSize: 76, minSize: 50 }, { id: 'console', label: '输出', defaultSize: 24, minSize: '74px', collapsible: true }]
function browse(item: FileTreeNode, depth: number) {
  selectedFile.value = [item.id]
  if (item.children) trail.value = [...trail.value.slice(0, depth), item]
  else trail.value = trail.value.slice(0, depth)
}
function navigateFolder(index: number) { trail.value = trail.value.slice(0, index) }
const fileMeta = computed(() => file.value ? [
  { id: 'name', label: '名称', value: file.value.label }, { id: 'type', label: '类型', value: file.value.children ? '文件夹' : '文本文件' },
  { id: 'size', label: file.value.children ? '条目数' : '字符数', value: file.value.children?.length ?? fileText.value.length },
] : [])
const language = computed(() => file.value?.label.endsWith('.css') ? 'css' : file.value?.label.endsWith('.md') ? 'markdown' : file.value?.label.endsWith('.json') ? 'json' : 'html')
</script>

<template>
  <section ref="root" class="workspace-demo" :aria-label="kind === 'editor' ? '页面编辑器' : kind === 'ide' ? '前端工作台' : '资料浏览器'">
    <template v-if="kind === 'editor'">
      <div class="workspace-demo__grid">
        <aside class="workspace-demo__pane" aria-label="内容块设置">
          <SSegment v-model="blockPanel" :items="blockTabs" label="编辑面板" />
          <div v-if="blockPanel === 'blocks'" class="workspace-demo__controls">
            <SButton size="sm" variant="secondary" @click="addBlock('heading')">添加标题</SButton>
            <SButton size="sm" variant="secondary" @click="addBlock('paragraph')">添加段落</SButton>
          </div>
          <div v-else-if="selectedBlock" class="workspace-demo__controls">
            <SInput v-model="selectedBlock.label" label="内容块名称" />
            <SInput v-if="selectedBlock.type === 'heading'" v-model="selectedBlock.text" label="标题文字" />
            <SRichTextEditor v-else :key="selectedBlock.id" v-model="selectedBlock.body" label="段落文字" :show-count="false" />
            <SButton size="sm" variant="secondary" :disabled="selectedIndex <= 0" @click="moveBlock(-1)">上移</SButton>
            <SButton size="sm" variant="secondary" :disabled="selectedIndex >= blocks.length - 1" @click="moveBlock(1)">下移</SButton>
          </div>
        </aside>
        <div ref="pageCanvas" class="workspace-demo__pane" role="region" aria-label="页面画布">
          <article v-for="block in blocks" :key="block.id" class="workspace-demo__block" :data-selected="block.id === blockId || undefined">
            <SButton size="sm" variant="ghost" :aria-pressed="block.id === blockId" @click="blockId = block.id; blockPanel = 'properties'">编辑 · {{ block.label }}</SButton>
            <h2 v-if="block.type === 'heading'">{{ block.text }}</h2>
            <SRichTextEditor v-else :model-value="block.body" readonly :show-count="false" :label="block.label" />
          </article>
        </div>
      </div>
    </template>

    <template v-else-if="kind === 'file-explorer'">
      <div class="workspace-demo__toolbar">
        <SSearchField v-model="fileQuery" label="筛选文件名" />
        <SSegment v-model="fileView" :items="fileViews" label="显示方式" />
      </div>
      <nav class="workspace-demo__toolbar" aria-label="文件路径">
        <SButton size="sm" variant="ghost" @click="navigateFolder(0)">交付工作区</SButton>
        <SButton v-for="(folder, index) in trail" :key="folder.id" size="sm" variant="ghost" @click="navigateFolder(index + 1)">{{ folder.label }}</SButton>
      </nav>
      <div class="workspace-demo__grid workspace-demo__grid--files">
        <div v-if="fileView === 'columns'" class="workspace-demo__file-columns" aria-label="目录分栏" role="region" tabindex="0">
          <div v-for="(items, depth) in explorerColumns" :key="depth" class="workspace-demo__pane">
            <p v-if="!items.length" role="status">没有匹配的目录项。</p>
            <SButton v-for="item in items" :key="item.id" size="sm" variant="ghost" :aria-pressed="selectedFile.includes(item.id)"
              @click="browse(item, depth)">{{ item.label }}<span v-if="item.children" aria-hidden="true"> ›</span></SButton>
          </div>
        </div>
        <div v-else-if="fileView === 'list'" class="workspace-demo__pane" aria-label="目录列表" role="region">
          <p v-if="!plainItems.length" role="status">没有匹配的目录项。</p>
          <SButton v-for="item in plainItems" :key="item.id" size="sm" variant="ghost" :aria-pressed="selectedFile.includes(item.id)"
            @click="browse(item, trail.length)">{{ item.label }}<span v-if="item.children" aria-hidden="true"> ›</span></SButton>
        </div>
        <SGrid v-else min-column-width="8rem">
          <p v-if="!plainItems.length" role="status">没有匹配的目录项。</p>
          <SButton v-for="item in plainItems" :key="item.id" variant="secondary" :aria-pressed="selectedFile.includes(item.id)"
            @click="browse(item, trail.length)">{{ item.label }}</SButton>
        </SGrid>
        <aside class="workspace-demo__pane" aria-label="文件属性"><SMetadataList :items="fileMeta" /></aside>
      </div>
    </template>

    <SResizable v-else :panels="editorPanels" orientation="vertical" height="29rem" label="开发工作台">
      <template #default="{ panel }">
        <SResizable v-if="panel.id === 'editor' && !compact" :panels="panels" label="代码工作区" height="100%">
          <template #default="{ panel: part }">
            <SFileTree v-if="part.id === 'files'" v-model:selected="selectedFile" :items="folders" :default-expanded="['src']" label="文件" />
            <SCodeEditor v-else-if="part.id === 'code'" :model-value="fileText" :label="file?.label ?? '代码'" :language="language" readonly />
            <div v-else class="workspace-demo__pane"><SMetadataList :items="fileMeta" title="检查器" />
              <ul v-if="fileOutline.length"><li v-for="item in fileOutline" :key="item.id">{{ item.label }}</li></ul></div>
          </template>
        </SResizable>
        <div v-else-if="panel.id === 'editor'" class="workspace-demo__pane">
          <SDisclosure title="文件"><SFileTree v-model:selected="selectedFile" :items="folders" :default-expanded="['src']" label="文件" /></SDisclosure>
          <SCodeEditor :model-value="fileText" :label="file?.label ?? '代码'" :language="language" readonly />
        </div>
        <div v-else class="workspace-demo__pane"><strong>检查输出</strong><p role="status">当前文件 {{ file?.label ?? '未选择' }}，共 {{ fileText.split('\n').length }} 行。</p></div>
      </template>
    </SResizable>
  </section>
</template>

<style scoped>
.workspace-demo, .workspace-demo__pane, .workspace-demo__controls { display: grid; gap: var(--sy-space-3); align-content: start; min-width: 0; }
.workspace-demo__grid { display: grid; grid-template-columns: minmax(10rem, 1fr) minmax(0, 2fr); gap: var(--sy-space-3); }
.workspace-demo__grid--files { grid-template-columns: minmax(0, 3fr) minmax(10rem, 1fr); }
.workspace-demo__pane { border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); padding: var(--sy-space-3); }
.workspace-demo__toolbar { display: flex; flex-wrap: wrap; gap: var(--sy-space-2); align-items: end; }
.workspace-demo__block { padding: var(--sy-space-2); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-sm); }
.workspace-demo__block[data-selected] { border-color: var(--sy-accent); }
.workspace-demo h2, .workspace-demo p { margin: 0; }
.workspace-demo__file-columns { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(8rem, 1fr); gap: var(--sy-space-2); overflow: auto; }
@media (max-width: 650px) { .workspace-demo__grid { grid-template-columns: minmax(0, 1fr); } }
</style>
