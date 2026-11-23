import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createSSRApp, h } from 'vue'
import { parseDate } from '@internationalized/date'
import { renderToString } from 'vue/server-renderer'
import { SActionBar, SAgenda, SAppLayout, SButton, SCarousel, SCommand, SDataGrid, SDialog, SEmptyState, SFileTree, SFloatingToc, SHoloCard, SHoverCard, SKanban, SFocusGroup, SItemCard, SItemCardGroup, SKpi, SKpiGroup, SListView, SAreaChart, SBarChart, SChartTooltip, SChainOfThought, SChatAttachment, SChatConversation, SChatListView, SChatLoader, SChatMessage, SComposedChart, SLineChart, SPieChart, SRadarChart, SRadialChart, STimeline, STimelineItem, SWidget, SInlineSelect, SInput, SMarkdown, SNavbar, SNativeSelect, SResizable, SRichTextEditor, SSelect, SSidebar, STable } from '../dist/index.js'

import SMap from '../dist/map.js'
import { SChatMessageActions, SChatSource, SChatTool } from '../dist/index.js'
import { SBanner, SButtonGroup, SDateTimeInput, SSelectableCard, STimestamp, SPowerSearch, STimer } from '../dist/index.js'
import { SPromptInput, SPromptSuggestion, STextShimmer } from '../dist/index.js'
import { SListInput, SMediaPlayer, useTableColumnResize, useTableColumnSettings, useTableGroupedRows, useTableInfiniteScroll,
  useTableRowExpansion, useTableRowIndex, useTableTreeData, useTableTreeState } from '../dist/index.js'
import { applyBrandPatch, createBrandTheme, defineBrandTheme, resolveThemeToken, resolveThemeTokens, SBrandTheme, SSyntaxTheme, syntaxThemes, tokenVar, tokenVars, useSyntaxTheme, useTheme } from '../dist/index.js'

const chartRows = [{ label: '周一', values: { count: 14 } }, { label: '周二', values: { count: 18 } }]
const chartSeries = [{ label: '数量', key: 'count' }]
const chartSlices = [{ id: 'release', label: '已交付', value: 18 }]
const navItems = [{ id: 'home', label: '工作区', href: '/work' }]
const app = createSSRApp({
  render: () => h('div', [
    h(SButton, null, () => '归档项目'),
    h(SBanner, { title: '标准设计已更新', tone: 'success' }),
    h(SDateTimeInput, { label: '交付时刻' }),
    h(SSelectableCard, { label: '收藏项目', modelValue: true }, () => '项目资料'),
    h(STimestamp, { value: '2026-11-21T10:00:00Z', format: 'system_date_time', timeZone: 'UTC', tooltip: false }),
    h(STimer, { format: 'clock' }),
    h(SPowerSearch, { label: '筛选项目', fields: [{ key: 'name', label: '名称' }] }),
    h(SListInput, { label: '访客名单', columns: [{ key: 'name', label: '姓名' }], getItemKey: item => item.id,
      createItem: () => ({ id: 1 }), labels: { empty: '暂无访客' } }),
    h(SMediaPlayer, { title: '交付录音', type: 'audio', src: '/fixtures/review.wav' }),
    h(SAppLayout, { mainLabel: '应用内容' }, {
      navbar: () => h(SNavbar, { items: navItems, currentPath: '/work' }, {
        center: () => h('input', { type: 'search', 'aria-label': '查找工作区' }),
      }),
      sidebar: () => h(SSidebar, { groups: [{ id: 'main', items: navItems }] }),
      default: () => '项目概览',
    }),
    h(SCommand, { title: '命令面板', groups: [{ id: 'files', items: [{ id: 'open', label: '打开文档' }] }] }),
    h(SResizable, { label: '工作区布局', panels: [{ id: 'files', defaultSize: 25 }, { id: 'preview' }] },
      { default: ({ panel }) => panel.id }),
    h(SActionBar, { count: 2, label: '文件操作', actions: [{ label: '共享', id: 'share' }] }),
    h(SAgenda, { label: '项目日程', defaultDate: parseDate('2026-11-18'), timeZone: 'Asia/Shanghai',
      defaultView: 'day', events: [{ id: 'review', title: '设计评审', start: parseDate('2026-11-18'), end: parseDate('2026-11-18') }] }),
    h(SCarousel, { label: '作品集', slides: [{ id: 'a', label: '方案一' }, { id: 'b', label: '方案二' }] }),
    h(SEmptyState, { title: '暂无文件', heading: 'h3', appearance: 'surface' }),
    h(SDataGrid, { label: '资料网格', rows: [{ id: 'file', name: '组件说明' }], rowKey: row => row.id,
      columns: [{ key: 'name', label: '文件', value: row => row.name }], selectionMode: 'multiple' }),
    h(SFileTree, { label: '文件目录', items: [{ id: 'file', label: '组件说明' }] }),
    h(SFloatingToc, { triggerLabel: '查看目录', items: [{ id: 'overview', label: '概览' }] }),
    h(SHoloCard, { src: './membership.png', alt: '工作室证件' }),
    h(SHoverCard, { label: '项目预览', triggerLabel: '查看项目' }),
    h(SKanban, { label: '项目看板', columns: [{ id: 'queue', title: '待办' }],
      defaultItems: [{ id: 'first', title: '校对', column: 'queue' }], getTitle: item => item.title,
      getKey: item => item.id, getColumn: item => item.column, setColumn: (item, column) => ({ ...item, column }) }),
    h(SItemCardGroup, { title: '资料分组' }, () => h(SItemCard, { title: '项目说明', href: '/notes' }, {
      action: () => h(SButton, null, () => '保存说明'),
    })),
    h(SKpiGroup, { title: '核心指标' }, () => h(SKpi, {
      title: '交付量', value: 38, chart: [3, 8, null, 10, 12], chartLabel: '交付趋势',
    })),
    h(SListView, { label: '资源列表', items: [{ label: '发布资源' }], getKey: item => item.label, getText: item => item.label }),
    h(SMap, { label: '园区位置', loadingText: '绘制地图' }),
    h(STimeline, { 'aria-label': '交付流程' }, () => [
      h(STimelineItem, { key: 'first', title: '发布', datetime: '2026-11-20', status: 'current' }),
    ]),
    h(SWidget, { title: '本周记录', state: 'empty', statusLabel: '尚无记录' }),
    h(SAreaChart, { label: '季度发布面积', data: chartRows, series: chartSeries }),
    h(SBarChart, { label: '季度发布柱形', data: chartRows, series: chartSeries }),
    h(SChartTooltip, { title: '季度数量', items: [{ key: 'count', label: '发布', value: 18 }] }),
    h(SComposedChart, { label: '季度组合', data: chartRows, series: [{ ...chartSeries[0], mark: 'bar' }] }),
    h(SLineChart, { label: '季度走势', data: chartRows, series: chartSeries }),
    h(SPieChart, { label: '季度占比', data: chartSlices, centerLabel: '合计' }),
    h(SRadarChart, { label: '季度维度', data: chartRows, series: chartSeries }),
    h(SRadialChart, { label: '季度进度', data: chartSlices }),
    h(SChainOfThought, { title: '准备摘要', elapsed: 12, defaultOpen: true, steps: [{ id: 'checked', title: '核对结果', status: 'current' }] }),
    h(SChatAttachment, { attachment: { id: 'photo', name: '现场记录.png', src: '/photos/field.png', kind: 'image' } }),
    h(SChatConversation, { label: '交付对话' }, () => h(SChatMessage, { messageRole: 'user', source: '核对交付数量' })),
    h(SChatListView, { label: '最近会话', defaultSelected: 'a', items: [{ id: 'a', title: '版本归档', group: '今天' }] }),
    h(SChatLoader, { variant: 'skeleton', label: '载入对话' }),
    h(SChatMessage, { format: 'markdown', source: '正文 <mark data-chat-raw>样例</mark>' }),
    h(SChatMessageActions, { label: '消息操作', text: '已归档', actions: ['copy', 'like'], feedback: 'like' }),
    h(SChatSource, { source: { href: '/references/checklist.pdf', title: '交付清单', type: 'document', newWindow: true } }),
    h(SChatSource, { source: { href: 'javascript:invalid-citation()', title: '无效引用', faviconUrl: 'javascript:invalid-favicon()' } }),
    h(SChatTool, { defaultOpen: true, tool: { toolName: '登记归档', state: 'requires-action', input: { name: '<archive>' } } }),
    h(SPromptInput, { label: '交付请求', modelValue: '核对交付数量', layout: 'compact' }),
    h(SPromptInput, { label: '带提及的请求', tokenMode: true,
      tokens: [{ type: 'text', text: '<mark data-prompt-review>' }, { type: 'token', id: 'review', value: '@复核组' }] }),
    h(SPromptSuggestion, { title: '建议请求', items: [{ id: 'compare', title: '比较版本' }] }),
    h(STextShimmer, { text: '正在检查文件' }),
    h(SFocusGroup, null, () => [
      h(SInput, { label: '查找' }),
      h(SSelect, { label: '分类', modelValue: 'design', options: [{ label: '设计', value: 'design' }] }),
    ]),
    h('p', ['前缀 ', h(SInlineSelect, { label: '频率', options: [{ label: '每天', value: 'daily' }], modelValue: 'daily' }), ' 后缀']),
    h(SNativeSelect, { label: '地区', options: [{ label: '上海', value: 'sh' }, { label: '东京', value: 'ty' }], modelValue: 'ty' }),
    h(SMarkdown, { source: '## 文档预览\n\n<mark data-review-raw>保留为文本</mark>\n\n[本地](file:///tmp/review.pdf)\n\n```ts\nconst value = 3\n```' }),
    h(SRichTextEditor, { label: '服务端编辑器', defaultValue: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '已保存草稿' }] }] } }),
    h(SDialog, { title: '归档项目？', open: true }, { footer: () => h(SButton, null, () => '取消') }),
    h(STable, {
      label: '项目',
      rows: [{ id: 1, name: '品牌资源库' }],
      rowKey: row => row.id,
      columns: [{ key: 'name', label: '项目名称', value: row => row.name }],
    }),
  ]),
})
const markup = await renderToString(app)
const inlineDialog = await renderToString(h(SButtonGroup, { size: 'lg', variant: 'danger', disabled: true }, {
  default: () => h(SDialog, { inline: true, open: true, title: '发布清单', padding: 2 }, {
    default: () => h(SButton, null, () => '核对附件'),
  }),
}))
assert.match(inlineDialog, /<section(?=[^>]*\bdata-inline="true")(?=[^>]*\baria-labelledby="[^"]+")[^>]*>/)
assert.match(inlineDialog, /--sy-dialog-padding-override:var\(--sy-space-2\)/)
assert.doesNotMatch(inlineDialog, /<dialog\b/)
assert.match(inlineDialog, /<button(?=[^>]*data-variant="primary")(?=[^>]*data-size="md")(?![^>]*\bdisabled)[^>]*>/)
assert.equal(markup.match(/aria-label="查找工作区"/g)?.length, 1)
assert.match(markup, /class="sy-navbar__center">[^<]*(?:<!--[^>]*-->)*<input type="search" aria-label="查找工作区">/)
assert.match(markup, /<button[^>]*>.*归档项目/)
assert.match(markup, /<section[^>]+class="sy-banner"[^>]*>/)
assert.match(markup, /aria-label="收藏项目"/)
assert.match(markup, /aria-label="筛选项目"/)
assert.match(markup, /暂无访客/)
assert.match(markup, /<audio[^>]*src="\/fixtures\/review\.wav"/)
assert.match(markup, /aria-label="交付录音"/)
const timestamp = markup.match(/<time\b[^>]*\bdatetime="2026-11-21T10:00:00\.000Z"[^>]*>([\s\S]*?)<\/time>/)?.[1]
assert.equal(timestamp?.replace(/<[^>]*>/g, ''), '2026-11-21 10:00:00')
const timer = markup.match(/<time\b[^>]*\bdatetime="PT0S"[^>]*>([\s\S]*?)<\/time>/)?.[1] ?? ''
assert.match(timer, /class="sy-visually-hidden">0:00<\/span>/)
assert.match(markup, /<a(?=[^>]*href="\/work")(?=[^>]*aria-current="page")[^>]*>/)
assert.match(markup, /<main[^>]*aria-label="应用内容"/)
assert.match(markup, /<table(?=[^>]*role="grid")(?=[^>]*aria-label="资料网格")[^>]*>/)
assert.match(markup, /<div(?=[^>]*role="tree")(?=[^>]*aria-label="文件目录")[^>]*>/)
assert.match(markup, /<button(?=[^>]*aria-label="查看目录")(?=[^>]*aria-expanded="false")[^>]*>/)
assert.match(markup, /<img(?=[^>]*class="sy-holo-card__art")(?=[^>]*alt="工作室证件")[^>]*>/)
assert.match(markup, /<button(?=[^>]*class="sy-hover-card__trigger")(?=[^>]*aria-expanded="false")[^>]*>/)
assert.match(markup, /<div(?=[^>]*role="row")(?=[^>]*aria-label="校对")[^>]*>/)
assert.match(markup, /<ul[^>]*role="list"[^>]*>[\s\S]*?<li[^>]*class="sy-item-card"[\s\S]*?<a[^>]*href="\/notes"[\s\S]*?<\/a>[\s\S]*?<button[^>]*>[\s\S]*?保存说明/)
assert.match(markup, /<dt[^>]*class="sy-kpi__title"[^>]*>[\s\S]*?交付量[\s\S]*?<\/dt><dd/)
assert.match(markup, /<div(?=[^>]*role="slider")(?=[^>]*aria-label="交付趋势")[^>]*>/)
assert.match(markup, /<path[^>]*d="M[^"]*M[^"]*"[^>]*vector-effect="non-scaling-stroke"/)
assert.match(markup, /<div(?=[^>]*role="grid")(?=[^>]*aria-label="资源列表")[^>]*>/)
assert.match(markup, /<section(?=[^>]*aria-label="园区位置")(?=[^>]*aria-busy="true")[^>]*>/)
assert.match(markup, /<li(?=[^>]*class="sy-timeline__item")(?=[^>]*aria-current="true")[^>]*>/)
assert.match(markup, /<time[^>]*datetime="2026-11-20">/)
assert.match(markup, /<section(?=[^>]*class="sy-widget")(?=[^>]*data-state="empty")[^>]*>/)
assert.match(markup, /<div(?=[^>]*role="slider")(?=[^>]*aria-label="季度发布面积")[^>]*>/)
assert.match(markup, /<path[^>]*class="sy-chart__area"/)
assert.match(markup, /<rect[^>]*class="sy-chart__bar"/)
assert.match(markup, /<div(?=[^>]*role="tooltip")(?=[^>]*class="sy-chart-tooltip")[^>]*>/)
assert.match(markup, /<path[^>]*class="sy-chart__arc"/)
assert.match(markup, /<img[^>]*src="\/photos\/field.png"/)
assert.match(markup, /<div(?=[^>]*role="log")(?=[^>]*aria-label="交付对话")[^>]*>/)
assert.match(markup, /<article(?=[^>]*data-role="user")(?=[^>]*data-bubble="true")[^>]*>/)
assert.match(markup, /<nav(?=[^>]*aria-label="最近会话")[^>]*>/)
assert.match(markup, /<button(?=[^>]*class="sy-item-card__lead")(?=[^>]*aria-current="true")[^>]*>/)
assert(markup.includes('&lt;mark data-chat-raw&gt;') && !markup.includes('<mark data-chat-raw>'))
assert.match(markup, /<div(?=[^>]*role="group")(?=[^>]*aria-label="消息操作")[^>]*>/)
assert.match(markup, /<a(?=[^>]*href="\/references\/checklist.pdf")(?=[^>]*rel="noopener noreferrer")[^>]*>/)
assert.match(markup, /<span class="sy-chat-source__pill">(?:<!---->)?<span class="sy-chat-source__title">无效引用<\/span>/)
assert(!markup.includes('javascript:invalid-'))
assert.match(markup, /<div(?=[^>]*class="sy-disclosure sy-chat-tool")(?=[^>]*data-tool-state="requires-action")[^>]*>/)
assert(markup.includes('&lt;archive&gt;') && !markup.includes('<archive>'))
assert.match(markup, /<form(?=[^>]*aria-label="交付请求")(?=[^>]*data-layout="compact")[^>]*>/)
assert.match(markup, /<textarea(?=[^>]*aria-label="交付请求")[^>]*>核对交付数量<\/textarea>/)
assert.match(markup, /<div(?=[^>]*aria-label="带提及的请求")(?=[^>]*role="combobox")[^>]*>/)
assert(markup.includes('&lt;mark data-prompt-review&gt;@复核组') && !markup.includes('<mark data-prompt-review>'))
assert.match(markup, /class="sy-prompt-suggestion"/)
assert.match(markup, /class="sy-text-shimmer__highlight"/)
assert.match(markup, /data-agenda-day="2026-11-18"/)
assert.match(markup, /aria-label="作品集"[^>]*aria-roledescription="carousel"/)
assert.match(markup, /<h3 class="sy-empty-state__title">[\s\S]{0,35}暂无文件/)
assert.match(markup, /role="combobox"[^>]*aria-expanded="false"/)
assert.match(markup, /role="separator"[^>]*aria-valuetext="25%"/)
assert.match(markup, /<div(?=[^>]*role="toolbar")(?=[^>]*aria-label="文件操作")[^>]*>/)
assert.match(markup, /role="combobox"/)
const inline = markup.match(/<p>前缀 .* 后缀<\/p>/)?.[0]
assert(inline && inline.includes('每天') && !inline.includes('<div'), 'Inline select must render phrasing content inside a paragraph')
assert.match(markup, /<select[^>]*>.*<option[^>]*selected[^>]*>东京<\/option>/)
assert.match(markup.replace(/<!--[\s\S]*?-->/g, ''), /<h2>文档预览<\/h2>/)
assert(markup.includes('&lt;mark data-review-raw&gt;') && !markup.includes('<mark data-review-raw>'))
assert(!markup.includes('href="file:'))
assert(markup.includes('hljs-keyword') && markup.includes('已保存草稿'))
assert.match(markup, /<table[^>]*>.*品牌资源库/)
assert.match(markup, /<dialog(?![^>]*\sopen[\s=>])/)

let requestedOnServer = 0
const tables = await renderToString(createSSRApp({ setup() {
  const rows = [{ id: 'root', name: '资料目录', children: [{ id: 'guide', name: '指南文件' }] }]
  const rowKey = row => row.id
  const columns = [{ key: 'name', label: '文件名', value: row => row.name }]
  const tree = useTableTreeState({ data: rows, idKey: 'id', defaultExpandedIds: ['root'] })
  const treeData = useTableTreeData(() => ({ ...tree.treeConfig.value, getRowLabel: row => row.name }))
  const paginationRows = [{ id: 'sample', name: '归档资料' }]
  const groups = useTableGroupedRows({ data: paginationRows, groupBy: () => '11 月' })
  const index = useTableRowIndex({ label: '编号' })
  const expansion = useTableRowExpansion({ expandedKeys: new Set(['sample']), onToggle() {}, getRowKey: rowKey,
    renderExpanded: () => h('p', '归档资料详情') })
  const loader = useTableInfiniteScroll({ hasMore: true, isLoading: false, async onLoadMore() { requestedOnServer++ } })
  const settings = useTableColumnSettings({ columns: [{ key: 'name', label: '文件名', isAlwaysVisible: true }], activeColumnKeys: [] })
  const resizer = useTableColumnResize({ getResizeLabel: () => '调整名称列宽' })
  return () => h('main', [
    h(STable, { label: '目录', rows: tree.visibleData.value, rowKey, columns, tree: treeData.value }),
    h(STable, { label: '分组归档', rows: paginationRows, rowKey, columns, rowGroups: groups.control, rowIndex: index, rowExpansion: expansion.value }),
    h(STable, { label: '动态记录', rows: paginationRows, rowKey, columns, infiniteScroll: loader, loadMoreLabel: '加载更多样例',
      columnSettings: settings.control, columnResize: resizer }),
  ])
} }))
assert.match(tables, /aria-expanded="true"[^>]*aria-controls="[^"]+"[^>]*>/)
assert(tables.includes('指南文件') && tables.includes('11 月 (1)') && tables.includes('归档资料详情'))
assert.match(tables, /<th[^>]*class="sy-table__row-index"[^>]*>编号<\/th>/)
assert(tables.includes('加载更多样例') && requestedOnServer === 0)
assert.match(tables, /role="separator"[^>]*aria-label="调整名称列宽"/)

const seed = createBrandTheme('packed-theme')
const authoredTheme = defineBrandTheme({ id: 'authored', base: 'stone', radius: 13, modes: { dark: { accent: '#b6abc7' } },
  parts: { 'button-ghost': { states: { hover: { background: '#e5eef0' } } } } })
const forkedTheme = defineBrandTheme({ id: 'forked', base: authoredTheme, parts: { 'button-ghost': { states: { hover: { foreground: '#333333' } } } } })
assert.equal(forkedTheme.radius, 13)
assert.equal(resolveThemeToken(forkedTheme, '--sy-canvas'), '#ffffff')
assert.equal(resolveThemeToken(forkedTheme, '--sy-accent', { mode: 'dark' }), '#b6abc7')
assert.equal(resolveThemeToken(forkedTheme, '--sy-brand-button-ghost-hover-background'), '#e5eef0')
assert.equal(resolveThemeToken(forkedTheme, '--sy-brand-button-ghost-hover-foreground'), '#333333')
const derived = applyBrandPatch(seed, { revision: 0, changes: [
  { type: 'settings', value: { motion: { timings: { enter: { duration: 420 } } } } },
  { type: 'color', mode: 'light', key: 'text', value: '#000000' },
  { type: 'part', key: 'button-primary', value: { background: '#ffffff' } },
] })
assert.equal(tokenVar('--review-color'), 'var(--review-color)')
assert.equal(tokenVars['--sy-canvas'], 'var(--sy-canvas)')
assert.equal(resolveThemeToken(null, '--sy-motion-enter'), '255ms')
assert.equal(resolveThemeToken(derived, '--sy-motion-enter'), '420ms')
assert.equal(resolveThemeToken(derived, '--sy-brand-button-primary-hover'), 'rgb(216.75 216.75 216.75)')
assert.equal(resolveThemeToken(derived, '--unknown', { fallback: '#ffffff' }), '#ffffff')
const theme = applyBrandPatch(seed, { revision: 0, changes: [{ type: 'settings', value: {
  motion: { tempo: 1.15, character: 'crisp' }, syntax: syntaxThemes.standard,
} }] })
const themeReadout = {
  setup() {
    const theme = useTheme()
    const syntax = useSyntaxTheme()
    return () => h('output', { 'data-name': theme.name.value, 'data-mode': theme.mode.value }, [
      theme.token('--sy-canvas'), syntax.token('keyword'), theme.token('--sy-motion-tempo'),
    ].join(' · '))
  },
}
const themed = await renderToString(createSSRApp({ render: () => h(SBrandTheme, { theme, mode: 'dark' },
  () => h(SSyntaxTheme, { theme: syntaxThemes.ink }, () => h(themeReadout))) }))
assert.equal(resolveThemeTokens()['--sy-canvas'], '#ffffff')
assert.match(themed, /data-name="packed-theme" data-mode="dark">#1d1e1f · #9cbee9 · 1.15/)
assert.match(themed, /--sy-motion-tempo:1.15/)

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
for (const [path, conditions] of Object.entries(manifest.exports)) {
  if (path === '.' || typeof conditions === 'string') continue
  await access(new URL(`../${conditions.types}`, import.meta.url))
  if (!conditions.import) continue
  const entry = await import(`${manifest.name}${path.slice(1)}`)
  if (path === './variants') {
    assert.equal(typeof entry.createVariants, 'function', path)
  } else if (path === './vite') {
    assert.equal(typeof entry.syntroficThemePlugin, 'function', path)
  } else if (path === './postcss') {
    assert.equal(typeof entry.syntroficThemePostcss, 'function', path)
  } else if (path !== './rac') {
    assert.equal(typeof entry.default, 'object', path)
  } else {
    for (const name of ['Collection', 'ListBoxLoadMoreItem', 'RouterProvider', 'I18nProvider', 'Pressable', 'Focusable']) {
      assert.equal(typeof entry[name], 'object', name)
    }
    for (const name of ['isRTL', 'useLocale', 'useFilter', 'ListLayout', 'TableLayout', 'Virtualizer', 'parseColor', 'getLocalizationScript']) {
      assert.equal(typeof entry[name], 'function', name)
    }
    assert.equal(entry.isRTL('fa-IR'), true)
    assert.equal(entry.isRTL('az-Latn'), false)
    assert.equal(entry.formatColor(entry.parseColor('rgb(0 30% 200 / 50%)')), '#004DC880')
    assert.equal(entry.formatColor(entry.parseColor('#af48')), '#AAFF4488')
    assert.throws(() => entry.parseColor('rgb(1, 2, 3) trailing'))
    assert.throws(() => entry.parseColor('rgb(1e999 2 3)'))
    const source = entry.getLocalizationScript('ar', { label: '</script>\u2028document' })
    assert(!source.includes('</script>'))
    const isolated = {}
    runInNewContext(source, isolated)
    assert.equal(isolated.__SYNTROFIC_LOCALE__.direction, 'rtl')
    assert.equal(isolated.__SYNTROFIC_LOCALE__.messages.label, '</script>\u2028document')
  }
}
console.log('SSR rendered the library entry and resolved all component subpaths without browser globals')
