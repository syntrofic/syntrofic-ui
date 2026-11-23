<script setup lang="ts">
import { computed, defineAsyncComponent, h, onMounted, onScopeDispose, ref, type Component } from 'vue'
import { brandColors, resolveThemeTokens, SBrandTheme, SInput, SMotionText, SSegment, SSpinner, SThemePreview, SWorkspaceTemplate,
  type BrandTheme, type ThemePreviewConfig, type ThemePreviewPage } from '@syntrofic/ui'
import { defaultTheme, themes } from 'virtual:syntrofic-theme'
import configuration from '../syntrofic.theme-preview.json'
import initialTheme from './theme.json'
import templates from './preview-templates.json'
import symbols from './preview-components.json'

const config = configuration as { theme?: string; pages: ThemePreviewPage[] }
const theme = computed<BrandTheme>(() => themes[config.theme ?? ''] ?? defaultTheme ?? initialTheme as BrandTheme)
const modes = [{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '系统' }]
const mode = ref<'light' | 'dark' | 'system'>('light')
const overview: ThemePreviewConfig = { version: 1, pages: [{ id: 'overview', label: '主题概览', kind: 'overview' }] }
const pages = computed(() => config.pages)
const selection = ref('')
const page = computed(() => pages.value.find(item => item.id === selection.value) ?? pages.value[0])
const query = ref('')
const libraries = import.meta.glob<Component>('./components/*.vue', { import: 'default' })
const loading = { render: () => h(SSpinner, { label: '正在加载预览' }) }
const examples = new Map(Object.entries(libraries).map(([path, loader]) => [path.split('/').at(-1), defineAsyncComponent({ loader, loadingComponent: loading, delay: 120 })]))
const template = computed(() => templates.find(item => item.id === page.value?.id))
const example = computed(() => examples.get(template.value?.example) ?? SWorkspaceTemplate)
const components = computed(() => {
  const terms = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return Object.groupBy(symbols.filter(item => terms.every(term => `${item.name} ${item.symbol} ${item.category}`.toLowerCase().includes(term))), item => item.category)
})
type ColorMode = 'light' | 'dark'
type ColorAssignment = { source: 'palette' | 'token' | 'authored'; shade: number | null; contrastAdjusted?: boolean }
type PaletteFamily = { id: string; name: string; seed: string; modes: Record<ColorMode, { stop: number; color: string }[]> }
type PreviewPalette = { vibrancy: number; assignments: Record<ColorMode, Record<string, ColorAssignment>>; families: PaletteFamily[] }
const palettes = import.meta.glob<PreviewPalette>('./themes/*/palette.json', { eager: true, import: 'default' })
const paletteStudy = computed(() => Object.entries(palettes).find(([path]) => path.split('/').at(-2) === theme.value.id)?.[1])
const sources = { palette: '由品牌色生成', token: '精确 Token', authored: '手工配置' }
const colorModes = [{ id: 'light', label: '浅色' }, { id: 'dark', label: '深色' }] as const
const colors = computed(() => colorModes.map(({ id: scheme, label }) => {
  const tokens = resolveThemeTokens(theme.value, { mode: scheme })
  const assignments = paletteStudy.value?.assignments[scheme]
  return { scheme, label, values: brandColors.map(color => {
    const key = '--sy-' + color
    return { color, value: tokens[key], assignment: assignments?.[key] }
  }) }
}))

function readSelection() { selection.value = new URL(location.href).searchParams.get('preview') ?? '' }
function chooseMode(next?: string | null) { if (next === 'light' || next === 'dark' || next === 'system') mode.value = next }
function select(id: string) {
  if (id === page.value?.id) return
  const next = new URL(location.href)
  next.searchParams.set('preview', id)
  history.pushState({}, '', next)
  selection.value = id
}
onMounted(() => {
  readSelection()
  window.addEventListener('popstate', readSelection)
})
onScopeDispose(() => window.removeEventListener('popstate', readSelection))
</script>

<template>
  <SBrandTheme :theme="theme" :mode="mode" class="preview">
    <header class="preview-header">
      <h1>{{ theme.name }}</h1>
      <SSegment :model-value="mode" :items="modes" label="预览模式" @update:model-value="chooseMode" />
    </header>
    <div class="preview-layout">
      <nav class="preview-nav" aria-label="主题预览页">
        <a v-for="item in pages" :key="item.id" :href="`?preview=${encodeURIComponent(item.id)}`" :aria-current="item.id === page?.id ? 'page' : undefined"
          @click.exact.prevent="select(item.id)">{{ item.label }}</a>
      </nav>
      <main class="preview-content" :aria-label="page?.label ?? '主题预览'">
        <Transition name="page" mode="out-in">
          <SThemePreview v-if="page?.id === 'overview'" key="overview" :theme="theme" :mode="mode" :config="overview" embedded />
          <div v-else-if="page?.id === 'components'" key="components" class="preview-catalog">
            <SInput v-model="query" type="search" label="查找组件" />
            <section v-for="(entries, category) in components" :key="category">
              <h2>{{ category }}</h2>
              <ul><li v-for="entry in entries" :key="entry.symbol"><strong>{{ entry.name }}</strong><code>syntrofic component {{ entry.symbol }} --props</code></li></ul>
            </section>
          </div>
          <div v-else-if="page?.id === 'colors'" key="colors">
            <section v-if="paletteStudy" class="preview-palette" aria-label="品牌色阶">
              <h2>品牌色阶</h2>
              <p>鲜艳度 {{ paletteStudy.vibrancy }} / 100</p>
              <div v-for="family in paletteStudy.families" :key="family.id" class="palette-family">
                <h3>{{ family.name }} <code>{{ family.seed }}</code></h3>
                <div v-for="{ id, label } in colorModes" :key="id">
                  <h4>{{ label }}</h4>
                  <ul :aria-label="family.name + ' · ' + label">
                    <li v-for="shade in family.modes[id]" :key="shade.stop">
                      <span class="color-swatch" :style="{ backgroundColor: shade.color }" aria-hidden="true"></span>
                      <span>{{ shade.stop }}</span>
                      <code>{{ shade.color }}</code>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
            <div class="preview-colors">
              <section v-for="{ scheme, label, values } in colors" :key="scheme" :aria-label="label + '语义色'">
                <h2>{{ label }}语义色</h2>
                <dl><div v-for="{ color, value, assignment } in values" :key="color">
                  <span class="color-swatch" :style="{ backgroundColor: value }" aria-hidden="true"></span>
                  <dt>{{ color }}</dt>
                  <dd>
                    <SMotionText :value="value" />
                    <small v-if="assignment">
                      {{ sources[assignment.source] }}{{ assignment.shade === null ? '' : ' · 色阶 ' + assignment.shade }}
                      {{ assignment.contrastAdjusted ? ' · 已校正对比度' : '' }}
                    </small>
                  </dd>
                </div></dl>
              </section>
            </div>
          </div>
          <div v-else-if="template" :key="template.id">
            <component :is="example" :kind="template.id" v-bind="template.example === 'IdentityTemplateDemo.vue' ? { theme } : {}" />
          </div>
          <p v-else key="empty">运行 <code>syntrofic experimental theme preview add</code> 添加预览页。</p>
        </Transition>
      </main>
    </div>
  </SBrandTheme>
</template>

<style scoped>
:global(body) { margin: 0; }
.preview { min-height: 100dvh; background: var(--sy-canvas); color: var(--sy-text); font-family: var(--sy-font); }
.preview-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; padding: .85rem clamp(1rem, 5vw, 3rem); border-bottom: 1px solid var(--sy-border); }
.preview-header h1 { margin: 0; font-size: 1.3rem; }
.preview-layout { display: grid; grid-template-columns: minmax(9rem, 12rem) minmax(0, 1fr); min-width: 0; gap: 1rem; margin-inline: auto; padding: clamp(1rem, 4vw, 2rem); max-width: 84rem; }
.preview-nav { display: flex; flex-direction: column; align-self: start; gap: .35rem; }
.preview-nav a { color: inherit; text-decoration: none; padding: .55rem .85rem; border-radius: var(--sy-radius-pill); }
.preview-nav a:hover, .preview-nav a[aria-current='page'] { background: var(--sy-accent-soft); color: var(--sy-accent-text); }
.preview-content { min-width: 0; }
.preview-catalog ul, .preview-colors dl { display: grid; gap: .45rem; margin: 0; padding: 0; }
.preview-catalog h2, .preview-colors h2, .preview-palette h2 { font-size: 1.1rem; }
.preview-catalog li, .preview-colors dl > div { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem .8rem; padding: .6rem .75rem; border-radius: var(--sy-radius-sm); background: var(--sy-surface); }
.preview-catalog li code, .preview-colors dd { font-size: .85rem; overflow-wrap: anywhere; color: var(--sy-text-muted); }
.preview-colors { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.preview-colors dd { margin-inline-start: auto; }
.preview-colors dd small { display: block; }
.color-swatch { width: 1.15rem; height: 1.15rem; border-radius: 50%; border: 1px solid var(--sy-border); transition: background-color var(--sy-motion-replace) var(--sy-ease-settle); }
.preview-palette { margin-block-end: 1.5rem; }
.palette-family { margin-block: 1rem; }
.palette-family h3 { font-size: 1rem; }
.palette-family h4 { font-size: .9rem; margin-block: .6rem .3rem; }
.palette-family ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(4.1rem, 1fr)); gap: .35rem; list-style: none; margin: 0; padding: 0; }
.palette-family li { display: grid; justify-items: center; gap: .25rem; border-radius: var(--sy-radius-sm); background: var(--sy-surface); padding: .4rem .2rem; font-size: .72rem; }
.palette-family li .color-swatch { width: 100%; height: 1.4rem; border-radius: var(--sy-radius-sm); }
.page-enter-active { transition: opacity var(--sy-motion-enter) var(--sy-ease-settle); }
.page-leave-active { transition: opacity var(--sy-motion-exit) var(--sy-ease-exit); }
.page-enter-from, .page-leave-to { opacity: 0; }
@media (max-width: 680px) {
  .preview-layout { grid-template-columns: minmax(0, 1fr); }
  .preview-nav { flex-direction: row; flex-wrap: wrap; }
}
</style>
