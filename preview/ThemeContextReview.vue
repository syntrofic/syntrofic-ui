<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { applyBrandPatch, brandRuleKey, createBrandTheme, defineBrandTheme, exportBrandTheme, SBrandTheme, SButton, SCard, SCheckbox, SCodeBlock, SInput, SMediaTheme, SSyntaxTheme,
  SAppLayout, SLayout, SLayoutHeader, SNavbar, SPopover, STable, syntaxThemes, useSyntaxTheme, useTheme, type BrandComponentRule, type TableColumn } from '../src'
import image from './assets/delivery-area.png'
import ImageModeHookReview from './ImageModeHookReview.vue'

const dark = ref(false)
const shaded = ref(false)
const mediaOff = ref(false)
const right = ref(false)
const popover = ref(false)
const base = createBrandTheme('theme-context', '工作室调色')
const theme = applyBrandPatch(base, { revision: 0, changes: [{ type: 'settings', value: {
  syntax: syntaxThemes.standard, motion: { tempo: 1.15, character: 'crisp' },
  media: { dark: { colors: { accent: '#aec3d6' }, parts: { 'button-primary': { background: '#aec3d6', foreground: '#23303b' } } } },
} }, { type: 'part', key: 'button-secondary', value: { states: {
  'focus-visible': { foreground: '#4a306a' }, active: { background: '#adbaca' }, disabled: { background: '#d1c8da' },
} } }, { type: 'part', key: 'button-secondary', mode: 'light', value: { states: {
  hover: { background: '#c0d1c5', foreground: '#27332a' },
} } }] })
const css = exportBrandTheme(theme)['theme.css']
const styled = defineBrandTheme({ id: 'theme-style-review', base: 'stone', fontSize: 20,
  design: { appearance: 'dark-only', surfaces: 'outlined', buttons: 'outline', headingWeight: 600, headingTracking: .035 } })
const rules: BrandComponentRule[] = [
  { target: 'button', when: { variant: 'ghost', size: 'sm' }, state: 'hover', mode: 'light', declarations: { 'background-color': '#e2dfee' } },
  { target: 'button', when: { variant: 'ghost', size: 'sm' }, state: 'active', mode: 'light', declarations: { 'background-color': '#c8d5cc' } },
  { target: 'input', state: 'invalid', declarations: { 'border-color': '#ba4a33' } },
  { target: 'table-row', when: { parity: 'odd' }, declarations: { 'background-color': '#eee7ff' } },
  { target: 'popover', declarations: { 'background-color': '#cee0f0' } },
  { target: 'app-shell-header', declarations: { height: '68px', 'padding-block': '4px', 'background-color': 'var(--sy-canvas)', 'box-shadow': 'inset 0 -1px var(--sy-border)' } },
]
const precise = defineBrandTheme({ id: 'precise-theme', base: 'stone', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) })
const rulesCss = exportBrandTheme(defineBrandTheme({ id: 'precise-css', base: precise }))['theme.css']
const headerCases = [
  { value: 'shared', label: '共享尺寸' }, { value: 'height', label: '高度冲突' },
  { value: 'padding', label: '内边距冲突' }, { value: 'row', label: '独立导航行' },
]
const headerCase = ref('shared')
const headerTheme = computed(() => {
  const rules: BrandComponentRule[] = [
    { target: 'app-shell-header', declarations: { height: '68px', 'padding-block': '4px' } },
    { target: 'heading', when: { level: '2' }, declarations: { 'font-weight': '800' } },
  ]
  if (headerCase.value === 'height' || headerCase.value === 'padding') rules.push({
    target: 'layout-header',
    declarations: { height: headerCase.value === 'height' ? '76px' : '68px', 'padding-block': headerCase.value === 'padding' ? '8px' : '4px' },
  })
  if (headerCase.value === 'row') rules.push({
    target: 'top-nav', declarations: { height: '54px', 'padding-block': '2px' },
  })
  return defineBrandTheme({ id: 'header-layout-review', base: 'stone', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) })
})
const records = [{ key: 1, item: '品牌规范' }, { key: 2, item: '动效说明' }, { key: 3, item: '交付样张' }]
const columns: TableColumn<typeof records[number]>[] = [{ key: 'item', label: '交付资料', value: row => row.item, rowHeader: true }]
const TokenDetails = defineComponent({
  setup() {
    const paint = useTheme()
    const syntax = useSyntaxTheme()
    return () => h('output', { 'data-theme-name': paint.name.value, 'data-theme-mode': paint.mode.value,
      'data-syntax': syntax.name.value, 'data-keyword-ink': syntax.token('keyword'), 'data-canvas': paint.token('--sy-canvas') }, [
      '画布 ', paint.token('--sy-canvas'), ' · 关键字 ', syntax.token('keyword'),
    ])
  },
})
</script>

<template>
  <section class="theme-context-review" aria-label="主题上下文示例">
    <div class="review__row">
      <SCheckbox v-model="dark">深色主题</SCheckbox>
      <SCheckbox v-model="shaded">深色表面</SCheckbox>
      <SCheckbox v-model="mediaOff">沿用主题配色</SCheckbox>
      <SCheckbox v-model="right">取样右侧画面</SCheckbox>
    </div>
    <SBrandTheme :theme="theme" :mode="dark ? 'dark' : 'light'" class="theme-context-review__scope">
      <SSyntaxTheme :theme="syntaxThemes.ink">
        <TokenDetails />
        <SCodeBlock :code="`const status = 'reviewed'`" label="局部语法配色" language="typescript" :copyable="false" />
      </SSyntaxTheme>
      <div class="theme-context-review__surface" :style="{ background: shaded ? '#21262f' : '#ffffff' }">
        <SMediaTheme :mode="mediaOff ? 'off' : 'auto'" role="group" aria-label="背景色自适应">
          <SButton size="sm">查看资料</SButton>
        </SMediaTheme>
      </div>
      <SMediaTheme :src="image + '?theme-sample'" :region="{ x: right ? .55 : 0, y: 0, width: .45, height: 1 }" role="group" aria-label="图片区域取样">
        <SButton size="sm">查看图片</SButton>
      </SMediaTheme>
    </SBrandTheme>
    <ImageModeHookReview />
    <component :is="'style'">{{ css }}</component>
    <div data-sy-brand="theme-context" data-sy-theme="system" class="theme-context-review__scope" role="group" aria-label="主题状态">
      <div class="review__row">
        <SButton variant="secondary">评审状态</SButton>
        <SButton variant="secondary" disabled>已锁定</SButton>
      </div>
    </div>
    <SBrandTheme :theme="styled" class="theme-context-review__scope" role="group" aria-label="主题设计选项">
      <SCard>
        <template #header><strong>交付样式</strong></template>
        <SButton>导出样式</SButton>
      </SCard>
    </SBrandTheme>
    <SBrandTheme :theme="precise" :mode="dark ? 'dark' : 'light'" class="theme-context-review__scope" role="group" aria-label="局部主题规则">
      <div class="review__row">
        <SButton variant="ghost" size="sm">小号操作</SButton>
        <SButton variant="ghost" size="md">中号操作</SButton>
      </div>
      <SInput label="资料编号" error="请输入资料编号" />
      <STable label="样张记录" :rows="records" :columns="columns" :row-key="row => row.key" />
      <SBrandTheme :theme="base" mode="light">
        <SButton variant="ghost" size="sm">嵌套主题操作</SButton>
      </SBrandTheme>
      <SMediaTheme mode="dark">
        <SButton variant="ghost" size="sm">媒体上的操作</SButton>
      </SMediaTheme>
      <SPopover v-model:open="popover" label="主题浮层" portal>
        <template #trigger><SButton variant="secondary" size="sm">打开主题浮层</SButton></template>
        <p>浮层沿用主题规则</p>
      </SPopover>
      <SAppLayout main-label="导航样本">
        <template #navbar><SNavbar brand="设计空间" :items="[{ id: 'review', label: '评审' }]" /></template>
        <p>工作区导航</p>
      </SAppLayout>
    </SBrandTheme>
    <component :is="'style'" v-html="rulesCss" />
    <div data-sy-brand="precise-css" data-sy-theme="system" class="theme-context-review__surface" role="group" aria-label="导出规则">
      <SButton variant="ghost" size="sm">系统模式操作</SButton>
    </div>
    <SBrandTheme :theme="headerTheme" mode="light" class="theme-context-review__scope" role="group" aria-label="头部尺寸规则">
      <h2>导航行样式</h2>
      <div class="review__row" role="group" aria-label="头部样式">
        <SButton v-for="item in headerCases" :key="item.value" size="sm" :variant="headerCase === item.value ? 'primary' : 'secondary'"
          :aria-pressed="headerCase === item.value" @click="headerCase = item.value">{{ item.label }}</SButton>
      </div>
      <SAppLayout>
        <template #navbar><SNavbar label="应用头部导航" brand="应用" /></template>
        <h3>应用内容</h3>
      </SAppLayout>
      <SLayout padding="0">
        <template #header>
          <SLayoutHeader :has-divider="false"><SNavbar label="布局头部导航" brand="布局" /></SLayoutHeader>
        </template>
      </SLayout>
    </SBrandTheme>
  </section>
</template>

<style scoped>
.theme-context-review, .theme-context-review__scope { display: grid; gap: var(--sy-space-2); }
.theme-context-review__scope { color: var(--sy-text); background: var(--sy-canvas); padding: var(--sy-space-3); }
.theme-context-review__surface { padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); }
</style>
