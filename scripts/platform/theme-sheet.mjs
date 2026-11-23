import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { projectThemeInteractions } from './theme-interactions.mjs'
import { prepareThemeLightbox, themeMediaFixture, themeMediaPalette } from './theme-part-probes.mjs'
import { themeVariantPanels } from './theme-sheet-variants.mjs'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'
import { coreTemplates } from './template.mjs'

const sections = {
  actions: '操作', inputs: '输入', selection: '选择', navigation: '导航', feedback: '反馈',
  data: '数据', containers: '容器', overlays: '浮层', pages: '页面', colors: '配色',
}
export function validateThemeSection(section) {
  if (section !== undefined && !Object.hasOwn(sections, section)) {
    throw Object.assign(new TypeError('Choose a theme section: ' + Object.keys(sections).join(', ')), { code: 'ERR_INVALID_ARGUMENT' })
  }
}
const sheetStyle = `
body{margin:0;background:var(--sy-canvas);color:var(--sy-text);font-family:var(--sy-font)}
.theme-sheet{width:min(100% - 1.5rem,72rem);margin:auto;padding-block:1rem 3rem}
.theme-sheet-bar,.theme-row,nav.theme-links{display:flex;align-items:center;gap:var(--sy-space-2);flex-wrap:wrap}
.theme-sheet-bar{justify-content:space-between}
.theme-sheet-bar h1{margin:0;font-size:clamp(1.5rem,4vw,2.2rem)}.theme-sample>h2{margin:0;font-size:1.23rem}
section.theme-sample{display:grid;gap:var(--sy-space-2);margin-top:var(--sy-space-3);padding:var(--sy-space-3);border-radius:var(--sy-radius-md);background:var(--sy-surface-subtle)}
.theme-links{padding-top:var(--sy-space-3)}.theme-links a{color:var(--sy-accent-text)}
.theme-sheet-stale{padding:.7rem 1rem;border-radius:var(--sy-radius-sm);background:var(--sy-warning-soft);color:var(--sy-warning)}
.theme-sheet-bar select{font:inherit;margin-inline-start:.5rem}
.theme-row>.sy-field{min-width:min(16rem,100%)}
.theme-states-wrap{overflow-x:auto}.theme-states{width:100%;border-collapse:collapse;text-align:start}
.theme-states th,.theme-states td{padding:.4rem .6rem;text-align:start;white-space:nowrap}
.theme-states tbody tr:nth-child(odd){background:var(--sy-canvas)}
.theme-overlay-examples{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:var(--sy-space-3)}
.theme-overlay-example{position:relative;min-width:0;min-height:12.5rem;padding:var(--sy-space-3);background:var(--sy-canvas);border-radius:var(--sy-radius-sm)}
.theme-overlay-example h3{margin:0 0 var(--sy-space-2);font-size:1rem}
.theme-overlay-example .sy-popover{min-width:10rem;padding:var(--sy-space-3)}
.theme-overlay-example .sy-hover-card__content p{margin-block:.3rem}
.theme-overlay-example .sy-hover-card__content a{color:var(--sy-accent-text);text-underline-offset:.15em}
.theme-overlay-preview{position:relative;isolation:isolate;min-block-size:11rem;overflow:clip;border-radius:var(--sy-radius-sm);padding:var(--sy-space-2);background:var(--sy-surface-subtle)}
.theme-overlay-example>[data-state]+.theme-overlay-preview{margin-block-start:var(--sy-space-2)}
.theme-overlay-preview--dialog{display:grid;grid-template-columns:minmax(0,1fr);place-items:center}
.theme-overlay-preview--dialog[data-open]{background:var(--sy-scrim)}
.theme-overlay-preview--dialog>*{grid-area:1/1}
.theme-overlay-preview--dialog[data-open]>.theme-overlay-preview__opener{opacity:0;pointer-events:none}
.theme-overlay-preview--dialog .sy-dialog{--sy-design-surface-fill:var(--sy-surface)}
.theme-overlay-preview .sy-panel-layer{position:absolute;inset:0}
.theme-overlay-preview :is(p,dl,dd){margin:0}
.theme-overlay-preview dl{display:grid;grid-template-columns:auto 1fr;gap:var(--sy-space-1);align-items:baseline}
.theme-overlay-preview select{font:inherit;max-inline-size:100%}
.theme-media-samples{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));gap:var(--sy-space-2)}
.theme-media-samples>.sy-media-theme{padding:var(--sy-space-2);border-radius:var(--sy-radius-sm)}
.theme-media-samples strong{display:block;margin-block-end:var(--sy-space-1)}
.theme-variant-specimen .sy-dialog.sy-lightbox{position:relative;inset:auto;margin:0;inline-size:100%;max-inline-size:100%}
.theme-variant-specimen .sy-dialog.sy-lightbox .sy-lightbox__stage{block-size:6rem}
#theme-contrast ul{margin:0;padding-inline-start:1.4em}
.theme-examples{display:grid;gap:.45rem}
.theme-example-frame{position:relative;min-width:0}
.theme-example{background:var(--sy-canvas);border-radius:var(--sy-radius-sm)}
.theme-example summary{cursor:pointer;padding:.45rem .6rem;font-weight:600;overflow-wrap:anywhere}
.theme-example summary code{margin-inline-start:.5rem;color:var(--sy-text-muted);font-weight:400}
.theme-example__body{padding:.2rem .6rem .6rem;min-width:0}
.theme-example__body>a{display:inline-block;margin-block-start:.5rem;color:var(--sy-accent-text)}
.theme-example__viewport{position:relative;min-inline-size:0;background:var(--sy-canvas)}
.theme-example__viewport:focus-visible,.theme-example summary:focus-visible{outline:2px solid var(--sy-focus);outline-offset:2px;border-radius:var(--sy-radius-sm)}
.theme-example__pending,.theme-example__failure{display:grid;justify-items:start;align-content:center;gap:.55rem;min-block-size:6rem;color:var(--sy-text-muted)}
.theme-example__pending>span[aria-hidden]{inline-size:min(12rem,85%);block-size:.7rem;border-radius:999px;background:var(--sy-surface-muted)}
.theme-example__pending>span[aria-hidden]:last-child{inline-size:min(8rem,65%)}
.theme-example__viewport>[data-theme-host='pending']{position:absolute;inset:0;visibility:hidden;pointer-events:none}
.theme-example__failure button{font:inherit;cursor:pointer;color:var(--sy-text);background:var(--sy-canvas);border:1px solid var(--sy-border);border-radius:999px;padding:.3rem .8rem}
.theme-example__failure button:is(:hover,:focus-visible){background:var(--sy-surface-muted)}
.theme-example__failure button[aria-disabled='true']{opacity:.58;cursor:wait}
.theme-example-frame [data-site-departure]{pointer-events:none;z-index:1}
.theme-variants h3{font-size:1rem;margin:.35rem 0 0}
.theme-variant-frame{position:relative;min-inline-size:0}
.theme-variant-frame [data-site-departure]{pointer-events:none;z-index:1}
.theme-variant-panel summary code{margin:0;color:inherit;font-weight:600}
.theme-variant-body{display:grid;gap:var(--sy-space-2);padding:0 var(--sy-space-2) var(--sy-space-2)}
.theme-variant-row{display:grid;gap:var(--sy-space-1);min-inline-size:0}
.theme-variant-row h4{margin:0;padding-inline:var(--sy-space-2);font-size:.92rem;overflow-wrap:anywhere}
.theme-variant-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr));gap:var(--sy-space-1);align-items:stretch}
.theme-variant-panel[data-wide] .theme-variant-cases{grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))}
.theme-variant-case{display:grid;grid-template-rows:auto 1fr;gap:var(--sy-space-1);min-inline-size:0;margin:0;padding:var(--sy-space-2);background:var(--sy-surface-subtle);border-radius:var(--sy-radius-sm)}
.theme-variant-case figcaption{font-size:.875rem;color:var(--sy-text-muted)}
.theme-variant-specimen{min-inline-size:0;overflow-wrap:anywhere;display:grid;align-content:center;justify-items:start}
.theme-variant-specimen>*{min-inline-size:0;max-inline-size:100%}
.theme-variant-specimen :is(.sy-dialog,.sy-field,.sy-file-input,.sy-drop-zone,.sy-table,.sy-layout){width:100%}
.theme-variant-specimen .sy-select__list[data-highlighted]{--sy-option-y:5px;--sy-option-height:calc(100% - 10px)}
.theme-variant-specimen .sy-popover{padding:var(--sy-space-2)}
.theme-palette{display:grid;gap:var(--sy-space-3)}
.theme-swatch-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,6rem),1fr));gap:.45rem;margin:0;padding:0;list-style:none}
.theme-swatch-list li{display:grid;gap:.25rem;min-width:0;font-size:.8rem;overflow-wrap:anywhere}
.theme-swatch{height:2rem;border:1px solid var(--sy-border);border-radius:var(--sy-radius-sm)}
#theme-status-vision{grid-template-columns:minmax(0,1fr)}
.theme-status-swatch{display:inline-block;inline-size:1rem;block-size:1rem;vertical-align:middle;border-radius:var(--sy-radius-xs)}
.theme-assignment-table{width:100%;border-collapse:collapse;text-align:start;font-size:.86rem}
.theme-assignment-table td,.theme-assignment-table th{padding:.45rem;text-align:start;border-bottom:1px solid var(--sy-border);overflow-wrap:anywhere}
.theme-coverage-table{font-size:.925rem}
.theme-coverage-table td,.theme-coverage-table th{padding:.32rem .5rem;border:0}
.theme-coverage-table tbody tr:nth-child(odd){background:var(--sy-canvas)}
.theme-repairs{display:grid;gap:var(--sy-space-1);margin:0;padding:0;list-style:none}
.theme-repairs>li{display:grid;gap:var(--sy-space-1);min-inline-size:0;padding:var(--sy-space-2);background:var(--sy-canvas);border-radius:var(--sy-radius-sm)}
.theme-repairs :is(strong,code){overflow-wrap:anywhere}
body[data-sy-theme='light'] [data-palette-mode='dark'],body[data-sy-theme='dark'] [data-palette-mode='light']{display:none}
@media(prefers-color-scheme:light){body[data-sy-theme='system'] [data-palette-mode='dark']{display:none}}
@media(prefers-color-scheme:dark){body[data-sy-theme='system'] [data-palette-mode='light']{display:none}}
@media(prefers-reduced-motion:no-preference){
  html:not([data-sy-reduced-motion]) .theme-overlay-preview--dialog{transition:background-color var(--sy-motion-enter) var(--sy-ease-settle)}
  html:not([data-sy-reduced-motion]) .theme-overlay-preview__opener{transition:opacity var(--sy-motion-replace) var(--sy-ease-settle)}
  html:not([data-sy-reduced-motion]) .theme-example__pending>span[aria-hidden]{background:linear-gradient(100deg,var(--sy-surface-muted) 35%,var(--sy-border) 50%,var(--sy-surface-muted) 65%) 100% 0/250% 100%;animation:theme-preview-sweep 1.2s var(--sy-ease-settle) infinite}
  html:not([data-sy-reduced-motion]) .theme-example__pending>span[aria-hidden]:last-child{animation-delay:.12s}
}
@keyframes theme-preview-sweep{to{background-position:-67% 0}}
::view-transition-old(root),::view-transition-new(root){animation-duration:var(--sy-motion-replace);animation-timing-function:var(--sy-ease-settle)}
html[data-sy-reduced-motion]::view-transition-old(root),html[data-sy-reduced-motion]::view-transition-new(root){animation:none}
@media(prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root){animation:none}}
`
const modeScript = `
const picker = document.getElementById('theme-appearance')
function update() { document.body.dataset.syTheme = picker.value }
const initial = location.hash.slice(1)
if (['light', 'dark', 'system'].includes(initial)) picker.value = initial
update()
let appearanceMotion
picker.addEventListener('change', () => {
  const reduced = document.documentElement.hasAttribute('data-sy-reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches
  if (document.startViewTransition && !reduced) { document.startViewTransition(update); return }
  appearanceMotion?.cancel()
  update()
  if (!reduced && document.body.animate) {
    const styles = getComputedStyle(document.body)
    const duration = parseFloat(styles.getPropertyValue('--sy-motion-replace'))
    const easing = styles.getPropertyValue('--sy-ease-settle').trim() || 'cubic-bezier(.23,.72,.24,1)'
    appearanceMotion = document.body.animate([{ opacity: .65 }, { opacity: 1 }], { duration: duration || 220, easing })
  }
})
`

const stateScript = `;(${prepareThemeLightbox.toString()})();(${projectThemeInteractions.toString()})()`
const templatePages = coreTemplates().filter(page => page.type === 'page')

function actionStates(ui, compact = false) {
  const variants = compact ? ['secondary'] : ['primary', 'secondary', 'ghost', 'danger']
  const sizes = compact ? ['md'] : ['sm', 'md', 'lg']
  const states = [
    ['默认', {}], ['悬停', { 'data-theme-state': 'hover' }], ['键盘焦点', { 'data-theme-state': 'focus focus-visible' }],
    ['按下', { 'data-theme-state': 'hover active', 'data-sy-press': 'held' }],
    ...(!compact ? [['不可用', { disabled: true }], ['加载中', { loading: true }]] : []),
  ]
  return h('div', { class: 'theme-states-wrap' }, [h('table', { class: 'theme-states', 'aria-label': '按钮变体与交互状态' }, [
    h('thead', [h('tr', ['变体与尺寸', ...states.map(([label]) => label)].map(label => h('th', { scope: 'col' }, label)))]),
    h('tbody', variants.flatMap(variant => sizes.map(size => h('tr', [
      h('th', { scope: 'row' }, h('code', `${variant} · ${size}`)),
      ...states.map(([, state]) => h('td', [h(ui.SButton, { variant, size, ...state }, { default: () => '确认' })])),
    ])))),
  ])])
}

function specimens(ui) {
  const button = (label, props) => h(ui.SButton, props, { default: () => label })
  const badge = (label, tone) => h(ui.SBadge, { tone }, { default: () => label })
  const row = children => h('div', { class: 'theme-row' }, children)
  const card = (heading, children) => h(ui.SCard, null, { header: () => h('strong', heading), default: () => children })
  const records = [{ id: '16', title: '品牌规范', status: '已保存' }, { id: '11', title: '交付样张', status: '待评审' }]
  const columns = [{ key: 'title', label: '资料', value: item => item.title }, { key: 'status', label: '状态', value: item => item.status }]
  const scope = [{ value: 'all', label: '全部' }, { value: 'mine', label: '我的' }]
  const navigationItems = [{ id: 'review', label: '评审', href: '#pages' }]
  return {
    actions: live => live ? actionStates(ui) : row([button('提交评审', { variant: 'primary' }), button('保存草稿', { variant: 'secondary' }),
      button('取消', { variant: 'ghost' }), button('删除', { variant: 'danger' }), button('保存中', { loading: true }), button('不可用', { disabled: true })]),
    inputs: () => row([h(ui.SInput, { label: '项目名称', modelValue: '样张评审' }), h(ui.SInput, { label: '联系邮箱', placeholder: 'name@example.com', type: 'email' }),
      h(ui.SSelect, { label: '交付范围', options: scope, modelValue: 'all' }),
      h(ui.SFileInput, { label: '文件字段', browseLabel: '选择文件' }),
      h(ui.SFileInput, { label: '文件拖放区', mode: 'dropzone', browseLabel: '选择文件' }),
      h(ui.STextArea, { label: '交付说明', placeholder: '填写备注' })]),
    selection: () => row([h(ui.SCheckbox, { modelValue: true }, { default: () => '包含附件' }),
      h(ui.SSwitch, { modelValue: true }, { default: () => '发送通知' }),
      h(ui.SSegment, { label: '交付范围', modelValue: 'all', items: scope }),
      h(ui.SRadioGroup, { label: '资料范围', modelValue: 'all' }, { default: () => scope.map(item =>
        h(ui.SRadio, { value: item.value }, { default: () => item.label })) })]),
    navigation: () => [
      h(ui.SNavbar, { label: '项目顶部导航', brand: '交付工作台', brandDescription: '设计团队', brandHref: '#pages', items: navigationItems }),
      h(ui.SLayout, { padding: '0' }, {
        header: () => h(ui.SLayoutHeader, { hasDivider: false }, { default: () =>
          h(ui.SNavbar, { label: '布局头部导航', brand: '评审工作区', brandHref: '#pages', items: navigationItems }) }),
        default: () => h('p', '工作区内容'),
      }),
      h(ui.SSideNavHeading, { heading: '交付记录', superheading: '工作区', subheading: '本周更新' }),
      h(ui.SBreadcrumbs, { label: '交付导航', items: [{ id: 'projects', label: '项目', href: '#pages' }, { id: 'review', label: '样张评审' }] }),
      h(ui.STabs, { label: '交付范围', defaultValue: 'all', tabs: scope }, { panel: () => h('p', '正在查看全部交付资料。') }),
      h(ui.SPagination, { label: '资料分页', total: 8, defaultPage: 4 }),
    ],
    feedback: () => [h(ui.SAlert, { tone: 'success', title: '资料已保存', description: '评审者可以查看最新版本。' }),
      h(ui.SProgressBar, { label: '交付进度', value: 65 }), row([h(ui.SProgressCircle, { label: '任务进度', value: 65 }),
        h(ui.SSpinner, { label: '上传中' }), badge('已保存', 'success'), badge('待评审', 'warning'), badge('需修复', 'danger')]),
      h(ui.SSkeleton, { shape: 'line', width: '11rem', height: '1rem' })],
    data: () => ['none', 'rows'].map(dividers => h(ui.STable, {
      label: dividers === 'rows' ? '带分隔线的交付记录' : '交付记录', rows: records, columns, rowKey: item => item.id, density: 'compact', dividers,
    })),
    containers: () => card('交付资料', [h('p', '样张和品牌规范已整理到同一项目。')]),
    overlays: () => [actionStates(ui, true), h('div', { 'data-theme-overlays': '', 'aria-busy': true }),
      h('div', { class: 'theme-media-samples', role: 'group', 'aria-label': '媒体区域配色' },
        ['light', 'dark'].map(mode => themeMediaFixture({ surface: 'media' },
          h('div', [h('strong', mode === 'light' ? '浅色媒体' : '深色媒体'),
            h(ui.SButton, { variant: 'secondary', size: 'sm' }, { default: () => '打开图片' })]), 'theme-overlay-media-' + mode, mode)))],
    pages: () => h(ui.SWorkspaceTemplate, { kind: 'dashboard' }),
  }
}

const stylesheetURL = new URL(import.meta.resolve('@syntrofic/ui/style.css'))
export async function embedFonts(css, markup, cached) {
  const text = [...new Set(Array.from(markup, char => char.codePointAt(0)))]
  const rules = [...css.matchAll(/@font-face\s*\{[^}]+\}/g)]
  const replacements = await Promise.all(rules.map(async ([rule]) => {
    const source = /url\(["']?(?:\.\.\/|\.\/)?([-\w]+\.woff2)["']?\)/.exec(rule)
    if (!source) return rule
    const ranges = [...rule.matchAll(/U\+([\dA-F?]+)(?:-([\dA-F]+))?/gi)]
    const active = !ranges.length || ranges.some(([, start, end]) => {
      const min = parseInt(start.replaceAll('?', '0'), 16)
      const max = parseInt(end ?? start.replaceAll('?', 'f'), 16)
      return text.some(value => value >= min && value <= max)
    })
    if (!active) return ''
    if (!cached.has(source[1])) cached.set(source[1], readFile(new URL(source[1], stylesheetURL), 'base64'))
    return rule.replace(source[0], 'url(data:font/woff2;base64,' + await cached.get(source[1]) + ')')
  }))
  let index = 0
  return css.replace(/@font-face\s*\{[^}]+\}/g, () => replacements[index++])
}

function samplePanel({ id, name, symbol, href, island }) {
  const panel = island ? { 'data-theme-template-panel': id } : { 'data-theme-example-panel': id }
  const canvas = island ? { 'data-theme-template': id, 'data-theme-template-island': island } : { 'data-theme-example': id }
  return h('div', { class: 'theme-example-frame' }, h('details', { class: 'theme-example', ...panel }, [
    h('summary', [name, h('code', symbol)]),
    h('div', { class: 'theme-example__body', 'data-site-disclosure-panel': '' }, [
      h('div', { class: 'theme-example__viewport', ...canvas, tabindex: -1, 'aria-busy': true },
        h('div', { class: 'theme-example__pending' }, [
          h('span', { role: 'status' }, island ? '正在加载模板…' : '正在加载组件示例…'),
          h('span', { 'aria-hidden': true }), h('span', { 'aria-hidden': true }),
        ])),
      href && h('a', { href }, '查看组件文档'),
    ]),
  ]))
}

function examplePanels(entries) {
  return entries.length ? h('div', { class: 'theme-examples' }, entries.map(samplePanel)) : null
}

function templatePanels() {
  return h('div', { class: 'theme-examples', role: 'group', 'aria-label': '页面模板' }, templatePages.map(page =>
    samplePanel({ ...page, symbol: page.component, island: page.island ?? 'template' })))
}

function paletteSection(report) {
  const sources = { palette: '配色生成', token: 'Token 覆盖', authored: '主题配置' }
  const source = report.palette
  const swatches = entries => h('ul', { class: 'theme-swatch-list' }, entries.map(({ label, color }) => h('li', [
    h('span', { class: 'theme-swatch', style: { backgroundColor: color }, 'aria-hidden': true }), h('strong', label), h('code', color),
  ])))
  return ['light', 'dark'].map(mode => h('div', { class: 'theme-palette', 'data-palette-mode': mode }, [
    source ? h('p', `鲜艳度 ${source.vibrancy} / 100`) : null,
    ...(source?.families ?? []).map(family => h('section', { class: 'theme-palette-family' }, [
      h('h3', [family.name, ' · ', h('code', family.seed)]),
      swatches(family.modes[mode].map(({ stop, color }) => ({ label: String(stop), color }))),
    ])),
    source ? h('table', { class: 'theme-assignment-table' }, [
      h('thead', [h('tr', ['Token', '当前颜色', '生成色阶', '来源'].map(label => h('th', { scope: 'col' }, label)))]),
      h('tbody', Object.entries(source.assignments[mode]).map(([token, entry]) => h('tr', [
        h('th', { scope: 'row' }, h('code', token)),
        h('td', h('code', entry.resolved)),
        h('td', entry.contrastAdjusted ? `${entry.family} · ${entry.preferredShade} → ${entry.shade ?? '黑白'}` : `${entry.family} · ${entry.shade ?? '黑白'}`),
        h('td', sources[entry.source]),
      ]))),
    ]) : swatches(Object.entries(report.resolved[mode]).flatMap(([label, color]) => /^#[a-f\d]{6}$/i.test(color) ? [{ label, color }] : [])),
  ]))
}

function statusVisionSection(report) {
  const { modes } = report.statusVision
  const samples = Object.entries(modes)
  const visions = Object.keys(report.statusVision.simulations)
  const label = { success: '成功', warning: '警告', danger: '错误', info: '信息', protanopia: '红色盲', deuteranopia: '绿色盲',
    protanomaly: '红色弱', deuteranomaly: '绿色弱' }
  const swatch = color => [h('span', { class: 'theme-status-swatch', style: { backgroundColor: color }, 'aria-hidden': true }), ' ', h('code', color)]
  return h('section', { id: 'theme-status-vision', class: 'theme-sample' }, [
    h('h2', '状态色辨识'),
    ...samples.map(([mode, { colors, simulated, issues }]) => h('div', samples.length > 1 ? { 'data-palette-mode': mode } : {}, [
      h('div', { class: 'theme-states-wrap', role: 'region', 'aria-label': '状态色对照', tabindex: 0 }, h('table', { class: 'theme-states' }, [
        h('caption', { class: 'sy-visually-hidden' }, `${mode === 'light' ? '浅色' : '深色'}状态色模拟`),
        h('thead', h('tr', ['状态', '原色', ...visions.map(vision => label[vision])].map(title => h('th', { scope: 'col' }, title)))),
        h('tbody', Object.entries(colors).map(([tone, color]) => h('tr', [h('th', { scope: 'row' }, label[tone]),
          ...[color, ...visions.map(vision => simulated[vision][tone])].map(value => h('td', swatch(value))),
        ]))),
      ])),
      issues.length ? h('ul', issues.map(({ pair, matches, repair }) => h('li', [
        `${pair.map(tone => label[tone]).join('与')}在${matches.map(({ vision }) => label[vision]).join('、')}模拟下可能混淆。`,
        repair && h('code', { style: { overflowWrap: 'anywhere' } }, repair.command),
      ]))) : h('p', '当前模拟下未发现易混淆的状态色。'),
    ])),
  ])
}

function paintCoverageSection(report) {
  const untouched = report.paintCoverage?.parts?.filter(part => part.status === 'unreached')
  if (!untouched?.length) return null
  return h('section', { id: 'theme-paint-coverage', class: 'theme-sample' }, [
    h('h2', '配色覆盖'),
    h('table', { class: 'theme-assignment-table theme-coverage-table' }, [
      h('caption', { class: 'sy-visually-hidden' }, '沿用基础主题配色的部件'),
      h('thead', h('tr', [h('th', { scope: 'col' }, '部件'), h('th', { scope: 'col' }, '沿用基础主题')])),
      h('tbody', untouched.map(part => h('tr', [
        h('th', { scope: 'row' }, h('code', part.part)),
        h('td', part.unchanged.map(field => field === 'fill' ? '底色' : '文字').join('、')),
      ]))),
    ]),
  ])
}

const repairLabels = {
  'disabled-fill': '禁用态底色', 'selected-fill': '选中态底色', 'status-fill': '状态底色',
  'pill-corners': '保留的胶囊圆角', 'container-corners': '沿用基础圆角', 'soft-shadow': '保留的软阴影',
  'text-contrast': '文字对比度', 'indicator-contrast': '进度条对比度',
}

function repairSection(report, keys, showAll) {
  const colors = showAll || keys.includes('colors')
  const issues = [
    ...(report.contrastRepairs ?? []).filter(issue => colors || issue.kind === 'indicator-contrast' && keys.includes(
      issue.part.startsWith('progress-bar-') ? 'feedback' : 'selection') || keys.includes('overlays') &&
      (issue.surfaces?.includes('media') || issue.part.startsWith('lightbox'))),
    ...(colors ? report.missed ?? [] : []),
    ...(showAll || keys.includes('navigation') ? report.layoutRepairs ?? [] : []),
  ]
  if (!issues.length) return null
  return h('section', { id: 'theme-repairs', class: 'theme-sample' }, [
    h('h2', '可应用修正'),
    h('ul', { class: 'theme-repairs' }, issues.map(issue => {
      const scope = [issue.part, ...Object.values(issue.when ?? {}),
        issue.surfaces?.includes('media') ? '媒体' : null,
        issue.mode === 'light' ? '浅色' : issue.mode === 'dark' ? '深色' : null].filter(Boolean)
      let label = repairLabels[issue.kind]
      if (issue.kind === 'indicator-contrast' && !issue.part.startsWith('progress-bar-')) label = '控件标记对比度'
      if (issue.kind === 'text-contrast' || issue.kind === 'indicator-contrast') label += ` ${issue.beforeRatio.toFixed(2)}∶1 → ${issue.afterRatio.toFixed(2)}∶1`
      if (issue.kind === 'navigation-fit') {
        label = issue.strategy === 'keep-height' ? '保留导航高度' : '增加导航高度'
      }
      return h('li', [
        h('strong', [...scope, label].join(' · ')),
        ...issue.steps.map(step => h('code', step.command)),
      ])
    })),
  ])
}

const inlineScript = source => source.replace(/<\/script/gi, '<\\/script')
async function document(ui, report, css, heading, keys, summary, fonts, live, expandVariants) {
  const examples = specimens(ui)
  const initialMode = report.theme.design?.appearance === 'dark-only' ? 'dark' : 'light'
  const coverage = (summary && live || keys.includes('colors')) && paintCoverageSection(report)
  const repairs = live || keys.includes('colors') ? repairSection(report, keys, summary && Boolean(live)) : null
  const vision = keys.includes('colors') && report.statusVision && statusVisionSection(report)
  const page = createSSRApp({
    render: () => h('main', { class: 'theme-sheet' }, [
      h('header', { class: 'theme-sheet-bar' }, [
        h('h1', report.theme.name + ' · ' + heading),
        h('div', [h('label', { for: 'theme-appearance' }, '模式'), h('select', { id: 'theme-appearance' }, [
          h('option', { value: 'system' }, '跟随系统'), h('option', { value: 'light', selected: initialMode === 'light' }, '浅色'),
          h('option', { value: 'dark', selected: initialMode === 'dark' }, '深色'),
        ])]),
      ]),
      h('nav', { class: 'theme-links', 'aria-label': '主题示例导航' }, [
        ...keys.map(key => h('a', { href: '#' + key }, sections[key])),
        coverage && h('a', { href: '#theme-paint-coverage' }, '配色覆盖'),
        vision && h('a', { href: '#theme-status-vision' }, '状态色辨识'),
        repairs && h('a', { href: '#theme-repairs' }, '可应用修正'),
      ]),
      ...keys.map(key => {
        const content = key === 'actions' && live && expandVariants ? null
          : key === 'colors' ? paletteSection(report)
          : key === 'pages' && live ? templatePanels() : examples[key](Boolean(live))
        return h('section', { id: key, class: 'theme-sample' }, [h('h2', sections[key]), content,
          live && themeVariantPanels(ui, key, expandVariants),
          live && examplePanels(live.index.filter(entry => entry.section === key))])
      }),
      coverage,
      vision,
      repairs,
      summary && report.contrast.length > 0 ? h('section', { id: 'theme-contrast', class: 'theme-sample' }, [
        h('h2', '文字对比度低于 4.5∶1'),
        h('ul', report.contrast.map(({ mode, target, ratio }) => h('li', `${mode === 'light' ? '浅色' : '深色'} · ${target} · ${ratio.toFixed(3)}∶1`))),
      ]) : null,
    ]),
  })
  const markup = await renderToString(page)
  const mediaStyles = keys.includes('overlays') ? ['light', 'dark'].map(mode =>
    themeMediaPalette(ui, report.theme, mode, 'theme-overlay-media-' + mode)).join('\n') : ''
  const styles = await embedFonts(css + '\n' + mediaStyles, markup + (live?.glyphs ?? ''), fonts)
  const title = report.theme.name.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])
  const bundle = live ? `<script id="theme-sheet-definition" type="application/json">${JSON.stringify(report.theme).replace(/</g, '\\u003c')}</script>
<script>${inlineScript(live.script)}</script><script id="theme-sheet-licenses" type="text/plain">${inlineScript(live.licenses)}</script>` : ''
  const reducedMotion = report.theme.motion?.reducedMotion === 'always' ? ' data-sy-reduced-motion' : ''
  return `<!doctype html><html lang="zh-CN"${reducedMotion}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${heading}</title><style>${styles.replace(/<\/style/gi, '<\\/style')}${sheetStyle}</style></head>
<body data-sy-brand="${report.theme.id}" data-sy-theme="${initialMode}">${markup}<script>(() => {${modeScript}${live ? stateScript : ''}})()</script>${bundle}</body></html>\n`
}

async function componentIndex() {
  const [catalog, implementation] = await Promise.all(['parity.json', 'implementation.json'].map(file =>
    readFile(new URL('../../catalog/' + file, import.meta.url), 'utf8').then(JSON.parse)))
  const byCategory = { Buttons: 'actions', Forms: 'inputs', 'Date and Time': 'inputs', Controls: 'selection', Pickers: 'selection', Colors: 'selection',
    Navigation: 'navigation', Overlays: 'overlays', Feedback: 'feedback', Collections: 'data', 'Data Display': 'data', Charts: 'data', AI: 'pages' }
  const choices = new Set(['SCheckbox', 'SCheckboxGroup', 'SCheckboxButtonGroup', 'SRadio', 'SRadioGroup', 'SRadioButtonGroup', 'SSwitch', 'SSwitchGroup'])
  return catalog.components.flatMap(entry => {
    const symbol = implementation[entry.id]?.component
    return entry.track.startsWith('web') && symbol ? [{ id: entry.id, name: entry.name, symbol,
      section: choices.has(symbol) ? 'selection' : byCategory[entry.category] ?? 'containers',
      href: 'https://ui.syntrofic.com/docs/vue/components/' + entry.id.split('.').at(-1) + '/' }] : []
  })
}

async function liveExamples() {
  const folder = new URL('./theme-sheet/', stylesheetURL)
  let [script, css, licenses, index] = await Promise.all([
    readFile(new URL('sheet.js', folder), 'utf8'), readFile(new URL('sheet.css', folder), 'utf8'),
    readFile(new URL('licenses/bundled.md', folder), 'utf8'), componentIndex(),
  ])
  const paths = new Set([...script.matchAll(/`(?:\.\/)?(assets\/maplibre-gl-worker-[\w-]+\.js|delivery-preview\.vtt)`/g)].map(([, file]) => file))
  for (const file of paths) {
    const resource = await readFile(new URL(file, folder), 'base64')
    const replacement = file.endsWith('.js')
      ? `URL.createObjectURL(new Blob([Uint8Array.from(atob("${resource}"), character => character.charCodeAt(0))], {type:"text/javascript"}))`
      : JSON.stringify('data:text/vtt;base64,' + resource)
    script = script.replaceAll('`' + file + '`', replacement).replaceAll('`./' + file + '`', replacement)
  }
  const glyphs = [...new Set(script.match(/[\p{Script=Han}\u3000-\u303f]/gu))].join('')
  return { css, script, licenses, index, glyphs }
}

const digest = value => createHash('sha256').update(value).digest('hex')
const inside = (root, folder) => {
  const path = relative(root, folder)
  return !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep)
}

async function outputDirectory(directory, target) {
  if (!inside(directory, target)) throw new Error('Choose a preview directory inside the project')
  const project = await realpath(directory)
  for (let folder = target; ; folder = dirname(folder)) {
    try {
      if (!inside(project, await realpath(folder))) throw new Error('Choose a preview directory inside the project')
      break
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

async function snapshot(path, encoding) {
  try {
    if (!(await lstat(path)).isFile()) return { excluded: true }
    return { previous: await readThemeOutput(path, encoding) }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  return {}
}

export async function writeEditorPreview(directory, ui, report, options) {
  const section = options.section
  validateThemeSection(section)
  const output = resolve(directory, options.out ?? `themes/${report.theme.id}`)
  await outputDirectory(directory, output)
  const sharedHeight = Object.keys(report.theme.design?.tokens ?? {}).some(token => /^--sy-control-height-(sm|md|lg)$/.test(token))
  const navigation = Object.values(report.theme.rules ?? {}).some(({ target }) => ui.brandRuleTargets[target]?.family === 'navigation')
  const pages = [
    { file: 'preview.html', heading: '项目预览',
      keys: ['pages', 'actions', ...(sharedHeight ? ['inputs'] : []), ...(navigation ? ['navigation'] : []), 'feedback'], summary: true },
  ]
  if (!options.previewOnly) {
    if (!section || options.png) pages.push({ file: 'sheet.html', heading: '组件样式', keys: Object.keys(sections), summary: true })
    if (section) pages.push({ file: `sheet-${section}.html`, heading: '组件样式', keys: [section] })
  }
  if (options.png) {
    const targets = [...Object.keys(report.theme.parts), ...Object.keys(report.theme.modeParts?.light ?? {}),
      ...Object.keys(report.theme.modeParts?.dark ?? {}), ...Object.values(report.theme.rules ?? {}).map(rule => rule.target)]
    const families = targets.map(target => ui.brandRuleTargets[target]?.family).filter(key => key && key !== 'overlays')
    if (sharedHeight) families.push('actions', 'inputs')
    for (const key of new Set([...(section ? [section] : families.length ? families : ['actions']), 'overlays'])) {
      const file = `sheet-${key}.html`
      if (!pages.some(page => page.file === file)) pages.push({ file, heading: '组件样式', keys: [key] })
    }
  }
  const pngViews = options.png ? pages.filter(page => page.file !== 'sheet.html') : []
  const pictures = pngViews.flatMap(({ file }) => ['light', 'dark'].map(mode => ({
    page: file, file: file.replace('.html', (mode === 'dark' ? '-dark' : '') + '.png'), mode,
  })))
  const files = [...pages.map(({ file }) => file), ...pictures.map(({ file }) => file)]
  if (options['dry-run']) return { directory: output, files, protected: [], written: [] }
  const carriesExamples = page => page.file !== 'preview.html' && page.keys.some(key => key !== 'colors')
  const [base, live] = await Promise.all([readFile(stylesheetURL, 'utf8'), pages.some(carriesExamples) ? liveExamples() : undefined])
  const scoped = '\n' + [options.fontCss, ui.exportBrandTheme(report.theme)['theme.css']].filter(Boolean).join('\n')
  const fonts = new Map()
  const renderings = Object.fromEntries(await Promise.all(pages.map(async page => {
    const { file, heading, keys, summary } = page
    const bundle = carriesExamples(page) ? live : undefined
    return [file, await document(ui, report, (bundle?.css ?? base) + scoped, heading, keys, summary, fonts, bundle, file !== 'sheet.html')]
  })))
  const receiptName = '.syntrofic-preview.json'
  const receipt = await readThemeOutput(resolve(output, receiptName))
  const previous = receipt ? JSON.parse(receipt) : {}
  const next = { ...previous }
  const protectedFiles = []
  const changes = []
  const pictureReceiptName = report.theme.id + '.pictures.json'
  const pictureReceipt = await snapshot(resolve(output, pictureReceiptName), 'utf8')
  let lastPictures = {}
  if (pictureReceipt.previous !== undefined) {
    try { lastPictures = JSON.parse(pictureReceipt.previous) } catch { /* Protect an authored document. */ }
  }
  const ownsPictureReceipt = !pictureReceipt.excluded && (pictureReceipt.previous === undefined ||
    lastPictures?.version === 1 && lastPictures.theme === report.theme.id && lastPictures.pictures &&
    typeof lastPictures.pictures === 'object' && !Array.isArray(lastPictures.pictures))
  const pictureEntries = { ...(ownsPictureReceipt ? lastPictures.pictures : undefined) }
  if (!ownsPictureReceipt) protectedFiles.push(pictureReceiptName)
  const motion = report.theme.motion?.reducedMotion === 'always' ? ['always'] : []
  const appearance = digest(scoped + base + JSON.stringify([report.theme.name, report.palette, ...motion]))
  const stale = previous.$appearance !== undefined
    ? previous.$appearance !== appearance
    : previous['preview.html'] !== digest(renderings['preview.html'])
  next.$appearance = appearance
  async function owned(file, encoding) {
    const stored = await snapshot(resolve(output, file), encoding)
    if (stored.excluded || (stored.previous !== undefined && previous[file] !== digest(stored.previous))) {
      protectedFiles.push(file)
      return
    }
    return stored
  }
  function stage(file, expected, stored) {
    next[file] = digest(expected)
    if (stored.previous === undefined || next[file] !== previous[file]) changes.push({ file, previous: stored.previous, expected })
  }
  for (const [file, expected] of Object.entries(renderings)) {
    const stored = await owned(file)
    if (stored) stage(file, expected, stored)
  }
  const candidates = []
  for (const { page, file, mode } of pictures) {
    if (protectedFiles.includes(page)) continue
    const stored = await owned(file, null)
    if (stored) candidates.push({ html: renderings[page], file, mode, page, stored, expand: !['preview.html', 'sheet-overlays.html'].includes(page),
      paginate: page !== 'preview.html' })
  }
  let note
  const captured = []
  const capturedViews = new Set()
  if (candidates.length) {
    const { captureThemePictures } = await import('./theme-pictures.mjs')
    try {
      const result = await captureThemePictures(directory, candidates)
      note = result.note
      for (const { file, expected, view } of result.files) {
        const candidate = candidates.find(item => item.file === view)
        capturedViews.add(candidate.page + '/' + candidate.mode)
        const stored = file === view ? candidate.stored : await owned(file, null)
        if (stored) {
          stage(file, expected, stored)
          captured.push(file)
          pictureEntries[file] = { digest: digest(expected), page: candidate.page, mode: candidate.mode, appearance }
        }
      }
    } catch (error) { note = 'PNG capture stopped: ' + error.message.split('\n')[0] }
  }
  const expired = []
  const staleSheets = []
  const invalidate = options.invalidatePictures && stale
  if (invalidate || capturedViews.size) {
    for (const file of Object.keys(previous)) {
      if (protectedFiles.includes(file)) continue
      if (invalidate && /^sheet(?:-[a-z]+)?\.html$/.test(file) && !Object.hasOwn(renderings, file)) {
        const stored = await owned(file)
        if (!stored?.previous || stored.previous.includes('role="status" class="theme-sheet-stale"')) continue
        stage(file, stored.previous.replace('</header>', '</header><p role="status" class="theme-sheet-stale">主题已更新。重新生成此样张以查看最新样式。</p>'), stored)
        staleSheets.push(file)
      } else if (/^[a-z0-9-]+\.png$/.test(file) && !captured.includes(file)) {
        const picture = pictureEntries[file]
        if (!invalidate && !capturedViews.has(picture?.page + '/' + picture?.mode)) continue
        const stored = await owned(file, null)
        if (!stored) continue
        if (stored.previous !== undefined) {
          changes.push({ file, previous: stored.previous, expected: undefined })
          expired.push(file)
        }
        delete next[file]
        delete pictureEntries[file]
      }
    }
  }
  const expected = JSON.stringify(next, null, 2) + '\n'
  if (Object.keys(next).length && expected !== receipt) changes.push({ file: receiptName, previous: receipt, expected })
  if (ownsPictureReceipt && (Object.keys(pictureEntries).length || pictureReceipt.previous)) {
    const expected = JSON.stringify({ version: 1, theme: report.theme.id, pictures: pictureEntries }, null, 2) + '\n'
    if (expected !== pictureReceipt.previous) changes.push({ file: pictureReceiptName, previous: pictureReceipt.previous, expected })
  }
  if (changes.length) {
    if (options.stage) options.stage(output, changes)
    else await writeThemeOutputs(output, changes)
  }
  return { directory: output, files: [...Object.keys(renderings).filter(file => !protectedFiles.includes(file)), ...captured], protected: protectedFiles,
    ...(note && { note }),
    ...(expired.length && { expired }),
    ...(staleSheets.length && { staleSheets }),
    written: changes.filter(({ file, expected }) => file !== receiptName && expected !== undefined).map(({ file }) => file) }
}
