<script setup lang="ts">
import { defineComponent, h, nextTick, ref, useTemplateRef, watch } from 'vue'
import { SSelect, SSwitch, SText, STooltip, useAnimatedLayout, useTruncationState } from '../src'

const colors = [
  { color: 'primary', label: '正文与标题' }, { color: 'secondary', label: '辅助说明' },
  { color: 'accent', label: '重点强调' }, { color: 'disabled', label: '不可用状态' },
  { color: 'placeholder', label: '输入提示' },
] as const
const weights = [
  { weight: 'normal', label: '常规' }, { weight: 'medium', label: '中等' },
  { weight: 'semibold', label: '半粗体' }, { weight: 'bold', label: '粗体' },
] as const
const textTypes = [
  { type: 'body', label: '团队交付资料已同步。' },
  { type: 'large', label: '发布概览' },
  { type: 'label', label: '资料编号' },
  { type: 'supporting', label: '上次编辑于上午九点。' },
  { type: 'code', label: 'theme.motion.enter' },
] as const
const headings = [
  { level: 1, variant: 'h1', label: '产品文档' },
  { level: 2, variant: 'h2', label: '团队交付' },
  { level: 3, variant: 'h3', label: '发布流程' },
  { level: 4, variant: 'h4', label: '版本准备' },
  { level: 5, variant: 'h5', label: '验证清单' },
  { level: 6, variant: 'h6', label: '归档记录' },
] as const
const wraps = [
  { mode: 'wrap', label: '普通换行' }, { mode: 'nowrap', label: '保持一行' },
  { mode: 'balance', label: '均衡段落' }, { mode: 'pretty', label: '减少短尾行' },
] as const
const wrapSample = 'Team archives follow a shared publication schedule for every release.'
const breakSample = 'release-assets draft_7hYf3kLm9200034Ts8Vz'
const narrative = '已整理本周交付资料，包括权限变更、内容更新以及团队审阅结果。草稿和通过验证的版本可在归档中分别打开。'
const lineOptions = [{ value: '1', label: '一行' }, { value: '2', label: '两行' }, { value: '3', label: '三行' }]
const lineCount = ref('1')
const content = useTemplateRef<HTMLElement>('content')
const layout = useAnimatedLayout({ scope: content })
async function setLines(value: string | string[] | undefined) {
  if (typeof value !== 'string') return
  const move = layout()
  lineCount.value = value
  await nextTick()
  move()
}

const compact = ref(true)
const alternatePaths = ref(false)
const assets = [
  { id: 'one', name: '构建', path: 'release/2026.11/preview/index.html', alternate: 'release/rebuilt/2026.12/preview/index.html', lines: 1 },
  { id: 'two', name: '测试', path: 'reports/ui-release/integration/coverage/index.html', alternate: 'reports/ui-release/integration/retry/coverage.html', lines: 2 },
  { id: 'three', name: '说明', path: 'README.md', alternate: 'README.md', lines: 1 },
]
const ReviewPath = defineComponent({
  props: { text: { type: String, required: true }, lines: { type: Number, required: true } },
  setup(props) {
    const cell = ref<HTMLElement | null>(null)
    const open = ref(false)
    const { isTruncated, fullText } = useTruncationState(cell)
    watch(isTruncated, clipped => { if (!clipped) open.value = false })
    return () => h(STooltip, {
      open: open.value, 'onUpdate:open': value => { open.value = Boolean(value) },
      text: fullText.value, disabled: !isTruncated.value,
    }, {
      trigger: () => h('span', {
        ref: cell, class: 'typography-review__path sy-line-clamp', style: { '--sy-clamp-lines': props.lines },
        tabindex: isTruncated.value ? 0 : undefined,
      }, props.text),
    })
  },
})
</script>

<template>
  <div ref="content" class="review__stack typography-review">
    <section class="typography-review__columns" aria-label="文字角色与字重">
      <div class="review__stack">
        <SText v-for="example in textTypes" :key="example.type" :type="example.type" display="block">{{ example.label }}</SText>
        <SText type="body" display="block" strikethrough>已撤回发布排程</SText>
        <SText type="body" display="block" tabular-numbers>1,024.00 · 86.42</SText>
      </div>
      <div class="review__stack">
        <SText v-for="option in colors" :key="option.color" type="body" :color="option.color">{{ option.label }}</SText>
        <div class="review__row">
          <SText v-for="row in weights" :key="row.weight" type="body" :weight="row.weight">{{ row.label }}</SText>
        </div>
      </div>
    </section>
    <section class="review__stack" aria-label="六种标题规格">
      <SText v-for="sample in headings" :key="sample.variant" :variant="sample.variant" :accessibility-level="sample.level">{{ sample.label }}</SText>
    </section>
    <SText as="p" type="body" display="block">通过 <SText type="code">theme.motion</SText> 在不同页面复用过渡时长。</SText>
    <section class="typography-review__columns" aria-label="换行与断词">
      <div v-for="mode in wraps" :key="mode.mode" class="typography-review__sample">
        <SText type="label" display="block">{{ mode.label }}</SText>
        <SText as="p" type="body" :text-wrap="mode.mode">{{ wrapSample }}</SText>
      </div>
      <div v-for="mode in (['break-word', 'break-all'] as const)" :key="mode" class="typography-review__sample">
        <SText type="label" display="block">{{ mode === 'break-word' ? '按词换行' : '逐字符换行' }}</SText>
        <SText as="p" type="body" :max-lines="2" :word-break="mode" :has-truncate-tooltip="false">{{ breakSample }}</SText>
      </div>
    </section>
    <section class="review__stack" aria-label="多行截断">
      <SSelect label="摘要行数" :model-value="lineCount" :options="lineOptions" @update:model-value="setLines" />
      <div class="typography-review__sample">
        <SText type="body" :max-lines="Number(lineCount)" has-truncate-tooltip="below">{{ narrative }}</SText>
      </div>
    </section>
    <section class="review__stack" aria-label="路径列截断">
      <div class="review__row">
        <SSwitch v-model="compact">缩窄路径列</SSwitch>
        <SSwitch v-model="alternatePaths">切换发布版本</SSwitch>
      </div>
      <table class="typography-review__files" :data-compact="compact || undefined">
        <thead><tr><th scope="col">资料</th><th scope="col">路径</th></tr></thead>
        <tbody>
          <tr v-for="asset in assets" :key="asset.id">
            <th scope="row">{{ asset.name }}</th>
            <td><ReviewPath :text="alternatePaths ? asset.alternate : asset.path" :lines="asset.lines" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.typography-review { min-inline-size: 0; grid-template-columns: minmax(0, 1fr); }
.typography-review__columns { display: grid; justify-self: stretch; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: var(--sy-space-2); }
.typography-review__sample { min-inline-size: 0; max-inline-size: 14rem; overflow: clip; padding: var(--sy-space-2);
  border-radius: var(--sy-radius-sm); background: var(--sy-surface); }
.typography-review__sample p { margin-block: .25em 0; }
.typography-review__files { inline-size: 100%; max-inline-size: 31rem; table-layout: fixed; text-align: start; border-collapse: collapse; }
.typography-review__files :is(th, td) { text-align: start; padding: var(--sy-space-2); border-block-end: 1px solid var(--sy-border); }
.typography-review__files th:first-child { inline-size: 3.75rem; }
.typography-review__files :deep(.typography-review__path) { max-inline-size: 27rem; word-break: break-all; font: .8125rem/1.5 monospace;
  transition: max-inline-size var(--sy-motion-replace) var(--sy-ease-settle); }
.typography-review__files[data-compact] :deep(.typography-review__path) { max-inline-size: 7.75rem; }
@media (prefers-reduced-motion: reduce) { .typography-review__files :deep(.typography-review__path) { transition: none; } }
</style>
