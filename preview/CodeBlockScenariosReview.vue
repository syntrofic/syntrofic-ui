<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  SBrandTheme, SCodeBlock, SSyntaxTheme, SSwitch, createBrandTheme, syntaxThemes, useSyntaxTheme,
} from '../src'

const compact = ref(true)
const highlight = ref(true)
const dark = ref(false)
const palette = computed(() => dark.value ? syntaxThemes.gothic : syntaxThemes.ink)
const brand = createBrandTheme('code-sample', '代码预览')
const code = [
  'interface ReleaseRecord {',
  '  title: string',
  '  updatedAt: string',
  '}',
  '',
  '/* UTC values stay stable across',
  '   all workspace locales. */',
  'export function createRecord(title: string, date: Date): ReleaseRecord {',
  '  return { title, updatedAt: date.toISOString() }',
  '}',
].join('\n')
const command = 'pnpm check:catalog\npnpm typecheck'
const configuration = JSON.stringify({ channel: 'review', include: ['components', 'themes', 'examples'], locale: 'zh-CN', publish: false }, null, 2)
const log = ['$ pnpm check:catalog', '正在核对标准设计目录…', '本地目录检查完成'].join('\n')
const listings = Array.from({ length: 24 }, (_, index) => `export const step${index + 1} = { order: ${index + 1}, status: 'ready' }`).join('\n')
const KeywordSample = defineComponent({
  setup() {
    const syntax = useSyntaxTheme()
    return () => h('output', { 'aria-label': '关键字颜色', 'data-preset': syntax.name.value },
      [h('code', { style: { color: syntax.token('keyword') } }, 'const')])
  },
})
</script>

<template>
  <section class="code-block-scenarios" aria-label="行高亮与受限代码区">
    <h3>行高亮与受限代码区</h3>
    <div class="review__row">
      <SSwitch v-model="highlight">标出修改行</SSwitch>
      <SSwitch v-model="compact">限制代码区高度</SSwitch>
    </div>
    <SCodeBlock label="release-record.ts" :code="code" language="typescript" line-numbers :highlight-lines="highlight ? [6, 7, 9] : []"
      copy-label="复制发布记录示例" scroll-label="发布记录代码" />
    <SCodeBlock label="长列表代码" :code="listings" language="typescript" line-numbers :max-height="compact ? 112 : 276"
      scroll-label="长列表代码视口" :copyable="false" />
  </section>
  <section class="code-block-scenarios" aria-label="命令、配置与语法主题">
    <h3>命令、配置与语法主题</h3>
    <SCodeBlock :code="command" language="bash" :show-language-label="false" scroll-label="发布校验命令" copy-label="复制校验命令" />
    <SCodeBlock :code="configuration" language="json" label="release.json" :copyable="false" wrap />
    <SSwitch v-model="dark">深色代码表面</SSwitch>
    <SBrandTheme :theme="brand" :mode="dark ? 'dark' : 'light'" class="code-block-scenarios__theme">
      <SSyntaxTheme :theme="palette">
        <KeywordSample />
        <SCodeBlock :code="code" language="typescript" label="当前语法主题" :max-height="128" :copyable="false" />
      </SSyntaxTheme>
    </SBrandTheme>
    <SBrandTheme :theme="brand" mode="dark" class="code-block-scenarios__theme">
      <SSyntaxTheme :theme="syntaxThemes.gothic">
        <SCodeBlock :code="log" language="bash" label="构建终端" wrap copy-label="复制终端记录" />
      </SSyntaxTheme>
    </SBrandTheme>
  </section>
</template>

<style scoped>
.code-block-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.code-block-scenarios h3 { margin: 0; font-size: 1rem; }
.code-block-scenarios__theme { background: var(--sy-canvas); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); padding: var(--sy-space-2); min-inline-size: 0; }
.code-block-scenarios__theme output { display: block; margin-block-end: var(--sy-space-2); }
.code-block-scenarios__theme code { transition: color var(--sy-motion-replace) var(--sy-ease-settle); }
</style>
