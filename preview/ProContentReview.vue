<script setup lang="ts">
import StreamingTextReview from './StreamingTextReview.vue'
import { onBeforeUnmount, ref } from 'vue'
import { SButton, SCodeBlock, SMotionText, SRichTextEditor, SRichTextView, SStreamMarkdown, type RichTextDocument } from '../src'
import ThemeContextReview from './ThemeContextReview.vue'
import CodeBlockScenariosReview from './CodeBlockScenariosReview.vue'
import MarkdownScenariosReview from './MarkdownScenariosReview.vue'

defineProps<{ id: string }>()
const initial: RichTextDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '品牌资源交付说明' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: '设计文件已按最新规范归档。' },
      { type: 'text', marks: [{ type: 'bold' }], text: '请确认命名与字体授权。' },
    ] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '更新插画和颜色规范' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '整理源文件与导出说明' }] }] },
    ] },
  ],
}
const document = ref(initial)
const saved = ref(JSON.stringify({ type: 'doc', content: [
  { type: 'paragraph', content: [{ type: 'text', text: '暂无已保存的草稿。' }] },
] }))
const result = ref('')
const autoLink = { patterns: [{ pattern: /\bTEAM-\d+\b/g, href: (match: RegExpExecArray) => `/docs/standard-design/#${match[0]}` }] }
const messages = {
  toolbar: '文本格式', selection: '选区格式', insert: '插入段落', blockStyle: '段落样式',
  paragraph: '段落', h1: '一级标题', h2: '二级标题', h3: '三级标题',
  bullets: '项目列表', numbers: '编号列表', quote: '引用', codeBlock: '代码块',
  bold: '加粗', italic: '斜体', underline: '下划线', strike: '删除线', code: '行内代码',
  undo: '撤销', redo: '重做', clear: '清除格式', clearContent: '清空内容',
  link: '链接', url: '链接地址', apply: '应用链接', unlink: '移除链接', invalidUrl: '请输入有效链接。',
  suggestions: '插入内容', noSuggestions: '没有匹配的内容', words: '词', characters: '字符',
}

function save(event: SubmitEvent) {
  const field = new FormData(event.currentTarget as HTMLFormElement).get('body')
  if (typeof field === 'string') {
    saved.value = field
    result.value = '草稿已保存'
  }
}

const sampleCode = [
  'export const reviewTheme = {',
  "  surface: 'sage',",
  '  radius: 13,',
  "  description: 'A long line stays inside the code panel on smaller screens and can be read by scrolling horizontally.',",
  '} as const',
].join('\n')
const base = [
  '## 资源更新',
  '',
  '本次交付包含 **品牌插画** 与 *排版规范*，详见[使用说明](https://example.com/guide)。',
  '',
  '| 资源 | 格式 |',
  '| --- | :---: |',
  '| 图形文件 | PNG |',
  '| 规范文档 | PDF |',
  '',
  '- [x] 核对字体授权',
  '- [ ] 补齐导出说明',
].join('\n')
const addition = [
  '', '### 交付示例', '', '保存时使用项目现有的语义色与圆角。',
  '', '```ts', "const review = { status: 'ready', assets: 2 }", '```', '',
].join('\n')
const source = ref(base)
const streaming = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
function send() {
  if (streaming.value) return
  source.value = base
  streaming.value = true
  const characters = Array.from('\n' + addition)
  let offset = 0
  timer = setInterval(() => {
    source.value += characters.slice(offset, offset + 5).join('')
    offset += 5
    if (offset >= characters.length) {
      clearInterval(timer)
      streaming.value = false
    }
  }, 32)
}
onBeforeUnmount(() => clearInterval(timer))
const copyLabels = { copyLabel: '复制代码', copiedLabel: '已复制', failureLabel: '复制失败', scrollLabel: '代码内容' }
</script>

<template>
  <div v-if="id === 'WP.rich-text-editor'" class="content-review">
    <form class="content-review__form" @submit.prevent="save" @reset="result = ''">
      <SRichTextEditor v-model="document" name="body" label="编辑交付说明" placeholder="写下交付说明…" :max-length="250"
        show-word-count locale="zh-CN" :messages="messages" :auto-link="autoLink" />
      <div class="review__row">
        <SButton type="submit" size="sm">保存内容</SButton>
        <SButton type="reset" size="sm" variant="secondary">恢复草稿</SButton>
      </div>
      <p class="review__result"><SMotionText :value="result" announce /></p>
    </form>
    <SRichTextView :value="saved" label="已保存内容" error-fallback="无法读取草稿。" />
  </div>
  <div v-else-if="id === 'WP.markdown'" class="content-review">
    <SStreamMarkdown data-review-streamed-document :source="source" :streaming="streaming" v-bind="copyLabels" table-label="资源格式" />
    <div class="review__row"><SButton size="sm" variant="secondary" :disabled="streaming" @click="send">继续输出</SButton></div>
    <StreamingTextReview />
    <MarkdownScenariosReview />
  </div>
  <div v-else class="content-review">
    <SCodeBlock :code="sampleCode" label="TypeScript · 评审主题" language="typescript" line-numbers v-bind="copyLabels" />
    <SCodeBlock code="pnpm check:catalog" language="shell" label="命令行" wrap :copyable="false" v-bind="copyLabels" />
    <ThemeContextReview />
    <CodeBlockScenariosReview />
  </div>
</template>
