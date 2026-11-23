<script setup lang="ts">
import { ref } from 'vue'
import { SMarkdown, SSwitch, type ChatSourceInfo } from '../src'

const withNumbers = ref(false)
const compact = ref(true)
const sources: Record<string, ChatSourceInfo & { icon?: string }> = {
  catalog: { title: '标准设计对照清单', href: '/docs/standard-design/examples/', description: '列出组件、公开示例与对应的官网入口。', icon: 'book' },
  guide: { title: '接入文档', href: '/docs/quick-start/', description: '包含安装、主题与服务端渲染入口。', icon: 'file' },
}
const evidence = [
  '# 发布资料',
  '',
  '可以从对照清单进入示例[catalog]，也可以按接入文档配置项目[guide]。',
  '',
  '## 复核记录',
  '',
  '- 对照清单提供当前验收进度[catalog]。',
  '- 保留原样的标记：`[catalog]` 与 \\[guide]。',
  '- 带链接的标记：[catalog](/docs/)。',
].join('\n')
const record = [
  '# 本周交付摘要',
  '',
  '交付包已经整理，**两份源文件**仍需核对。材料命名采用 *发布批次*，可从 `release.json` 查询版本。',
  '',
  '| 资料 | 状态 | 数量 |',
  '| :--- | :---: | ---: |',
  '| 界面规范 | 已核对 | 12 |',
  '| 源文件 | 待复核 | 2 |',
  '',
  '> 请将新的复核结果附在发布记录下方。',
  '',
  '- [x] 完成页面着色',
  '- [ ] 核对高对比度',
  '',
  '```typescript',
  "const release = { channel: 'review', count: 14 }",
  '```',
].join('\n')
</script>

<template>
  <section class="markdown-scenarios" aria-label="带引用的 Markdown">
    <h3>资料引用</h3>
    <SSwitch v-model="withNumbers">显示引用编号</SSwitch>
    <SMarkdown :source="evidence" :sources="sources" :citation-style="withNumbers ? 'number' : 'label'"
      :citation-number-label="(number, title) => `引用 ${number}：${title}`"
      :heading-level-start="4" heading-ids heading-prefix="evidence-" density="compact" />
  </section>
  <section class="markdown-scenarios" aria-label="交付摘要与数据表">
    <h3>交付摘要</h3>
    <SSwitch v-model="compact">紧凑排版</SSwitch>
    <SMarkdown :source="record" :density="compact ? 'compact' : 'default'" :heading-level-start="4"
      table-label="交付数量表" copy-label="复制发布配置" />
  </section>
</template>

<style scoped>
.markdown-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-2); min-inline-size: 0; }
.markdown-scenarios h3 { margin: 0; font-size: 1rem; }
</style>
