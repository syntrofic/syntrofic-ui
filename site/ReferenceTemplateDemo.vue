<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { SBadge, SBanner, SButton, SClickableCard, SCodeBlock, SFloatingToc, SGrid, SInput, SMarkdown, STable,
  useOutlineFromMarkdown, type TableColumn } from '../src'

const props = defineProps<{ kind: string }>()
const content = useTemplateRef<HTMLElement>('content')
const dark = ref(false)
const project = ref('交付工作区')
const source = computed(() => props.kind === 'documentation-design'
  ? '## 交互示例\n\n检查默认、悬停和键盘焦点，并确认操作名称能独立描述它的用途。\n\n## 参数\n\n语义样式通过组件参数传入。\n\n## 使用示例\n\n样式随主题更新。保持按钮的主次关系，避免在同一区域放置多个主要操作。'
  : '## 1. 安装组件库\n\n在 Vue 3 项目中添加依赖。\n\n## 2. 加载样式\n\n在应用入口加载样式和 Token。\n\n## 3. 渲染组件\n\n导入并使用组件。')
const outline = useOutlineFromMarkdown(source, 'guide-')
const rows = [{ name: 'variant', type: 'primary | secondary | ghost', purpose: '控件视觉强调等级' },
  { name: 'disabled', type: 'boolean', purpose: '在条件未满足时阻止操作' },
  { name: 'loading', type: 'boolean', purpose: '保留控件尺寸并显示进度' }]
const columns: TableColumn<(typeof rows)[number]>[] = [
  { key: 'name', label: '参数', rowHeader: true, value: row => row.name }, { key: 'type', label: '类型', value: row => row.type },
  { key: 'purpose', label: '用途', value: row => row.purpose },
]
const pages = [
  { id: 'design', name: '组件设计规范', body: '使用渲染示例、参数和代码学习组件模式。', href: '/templates/documentation-design/' },
  { id: 'technical', name: 'Vue 接入流程', body: '从安装依赖到完成第一个页面。', href: '/templates/documentation-technical/' },
  { id: 'tokens', name: '语义 Token', body: '查看配色、尺寸、动效与平台接入。', href: '/docs/theming/' },
]
const blocks = computed(() => source.value.split(/\n\n(?=## )/))
const sampleCodes = ['pnpm add @syntrofic/ui', "import '@syntrofic/ui/style.css'", "import { SButton } from '@syntrofic/ui'\n\n<SButton>保存设置</SButton>"]
const designCode = '<SButton>保存</SButton>\n<SButton variant="secondary">取消</SButton>'
</script>

<template>
  <div v-if="kind === 'documentation'" class="reference-template">
    <SBanner title="Syntrofic UI 文档" description="按任务浏览设计准则、组件接入和主题 Token。" :dismissible="false" />
    <SGrid min-column-width="13rem">
      <SClickableCard v-for="page in pages" :key="page.id" :label="page.name" :href="page.href">
        <h3>{{ page.name }}</h3><p>{{ page.body }}</p>
      </SClickableCard>
    </SGrid>
  </div>
  <div v-else class="reference-template reference-template--article">
    <SFloatingToc :items="outline.map(item => ({ ...item, level: item.depth }))" label="本页目录" trigger-label="查看目录"
      trigger-mode="press" position="inline" :content-root="content" />
    <article ref="content" class="doc-prose reference-template__article">
      <SBanner v-if="kind === 'documentation-technical'" title="开始前" description="需要一个 Vue 3 项目和可用的包管理器。" :dismissible="false" />
      <template v-for="(block, index) in blocks" :key="block">
        <SMarkdown :source="block" heading-ids heading-prefix="guide-" />
        <template v-if="kind === 'documentation-design'">
          <div v-if="index === 0" class="reference-template__sample" :data-sy-theme="dark ? 'dark' : 'light'">
            <SInput v-model="project" label="项目名称" />
            <SButton @click="dark = !dark">切换配色</SButton>
          </div>
          <STable v-if="index === 1" label="按钮参数" :rows="rows" :columns="columns" :row-key="row => row.name" />
          <SGrid v-if="index === 2" min-column-width="11rem">
            <div class="reference-template__sample"><SBadge tone="success">主要操作明确</SBadge><SButton>保存</SButton><SButton variant="secondary">取消</SButton></div>
            <div class="reference-template__sample"><SBadge tone="warning">主要操作冲突</SBadge><SButton>保存</SButton><SButton>取消</SButton></div>
          </SGrid>
          <SCodeBlock v-if="index === 2" :code="designCode" language="vue" copy-label="复制代码" copied-label="已复制" />
        </template>
        <SCodeBlock v-else :code="sampleCodes[index]" :language="index === 0 ? 'sh' : 'typescript'" copy-label="复制代码" copied-label="已复制" />
      </template>
      <SBanner v-if="kind === 'documentation-technical'" title="继续组装页面" :dismissible="false">
        <template #actions><a href="/docs/vue/components/">查看组件目录</a></template>
      </SBanner>
    </article>
  </div>
</template>

<style scoped>
.reference-template, .reference-template__article, .reference-template__sample { display: grid; min-width: 0; gap: var(--sy-space-4); }
.reference-template h3 { margin: 0; }
.reference-template .sy-action-card { padding: var(--sy-space-4); }
.reference-template .sy-banner { --sy-banner-bg: var(--surface); }
.reference-template :deep(.sy-banner__icon) { background: var(--sy-info-soft); color: var(--sy-info); }
.reference-template__sample { align-items: start; justify-items: start; padding: var(--sy-space-4); border-radius: var(--sy-radius-md); background: var(--surface); color: var(--sy-text); }
.reference-template__article :deep(.sy-code-block) { --sy-syntax-background: var(--surface); }
.reference-template__article :deep(.sy-code-block__header) { background: var(--soft); }
.reference-template__article > a { justify-self: start; }
</style>
