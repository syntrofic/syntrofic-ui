import {
  agentCount, astryx, astryxExamples, categories as chineseCategories, components, features as chineseFeatures, guideContent, guides as chineseGuides, markdown,
  nativeInstallPath, repository, templates as chineseTemplates, webInstallPath,
} from './content.mjs'
import { icon, syntroficIcons } from './icons.mjs'
import { englishCopy, englishFeatures, englishGuides, englishPosts, englishTemplates } from './english.mjs'
import { checkoutBlocks as chineseBlocks } from './template-catalog.mjs'
import { readFileSync } from 'node:fs'

const origin = 'https://ui.syntrofic.com'
const siteName = 'Syntrofic UI'
const shareImage = '/previews/dashboard-comparison.webp'
const vuePath = '/docs/vue/components/'
const nativePath = '/docs/native/components/'
const escape = (text) => markdown.utils.escapeHtml(String(text))
const islandPlaceholder = (text, shape = 'control') => `<div class="island-placeholder" data-island-placeholder="${shape}">
  <span class="sr-only" role="status">${escape(text)}</span>
  <div class="island-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
</div><noscript><p class="island-static-note">互动预览需要 JavaScript。</p></noscript>`
const chinesePosts = JSON.parse(readFileSync(new URL('../catalog/blog.json', import.meta.url), 'utf8'))
const postPath = id => '/blog/' + id + '/'
function englishExample(example) {
  return example?.replaceAll(/已保存|保存更改|保存修改|保存|预览|交付视图|看板|已选中|列表|网格|邮件通知|项目名称|发布进度|取消|确认|发布更新/g, value =>
    ({ 已保存: 'Saved', 保存更改: 'Save changes', 已选中: 'Selected', 列表: 'List', 网格: 'Grid', 邮件通知: 'Email notifications',
      项目名称: 'Project name', 发布进度: 'Release progress', 取消: 'Cancel', 确认: 'Confirm', 发布更新: 'Publish update',
      保存修改: 'Save changes', 保存: 'Save', 预览: 'Preview', 交付视图: 'Delivery view', 看板: 'Board' })[value])
}

const englishUsage = {
  'W.button': 'Use `variant` to express action priority. Use `click-action` for asynchronous work and `action-error` to handle a failed operation.',
  'W.checkbox': 'Bind a Boolean with `v-model`. Use `indeterminate` for a partial group selection. Provide a label, including when the checkbox sits inside a table.',
  'W.input': 'Bind the input value with `v-model` and provide a label. Use `clearable` to let the user clear a value without losing focus.',
  'W.switch': 'Bind a Boolean setting with `v-model`. A pending `change-action` preserves the current focus.',
  'W.select': 'Provide `options` with labels and values. Use `v-model` for a single value or `multiple` for an array.',
  'W.table': 'Set `row-key` to a stable identifier. Use `selection-mode="multiple"` and `v-model:selected` for row selection. Use `sort-mode="manual"` when sorting on the server.',
  'W.modal': 'Bind `v-model:open` and provide a title. Put confirmation and cancellation controls in the footer slot.',
  'W.tabs': 'Give every tab a stable value. The tab bar stays in place as panels of different heights transition.',
}

function localizedMetadata(items, names, key) {
  return items.map(item => {
    const [title, summary] = names[item[key]]
    return { ...item, title, description: summary, summary }
  })
}

function localizedTemplate(item) {
  const [name, description] = englishTemplates[item.id]
  return { ...item, name, description, kind: item.standard ? 'Standard design' : item.kind }
}

function createSite(english) {
  const categories = english ? Object.fromEntries(Object.keys(chineseCategories).map(name => [name, name])) : chineseCategories
  const guides = english ? localizedMetadata(chineseGuides, englishGuides, 'file') : chineseGuides
  const features = english ? localizedMetadata(chineseFeatures, englishFeatures, 'path') : chineseFeatures
  const templates = english ? chineseTemplates.map(localizedTemplate) : chineseTemplates
  const checkoutBlocks = english ? chineseBlocks.map(localizedTemplate) : chineseBlocks
  const posts = english ? chinesePosts.map(post => ({ ...post, ...englishPosts[post.id] })) : chinesePosts
  const blogIndex = JSON.stringify(posts, null, 2) + '\n'
  const blogOrigin = origin + (english ? '/en' : '')
  const blogName = english ? `${siteName} releases` : `${siteName} 更新记录`
  const blogDescription = english ? 'Component, theme, and developer tooling updates.' : 'Syntrofic UI 的组件、主题与开发工具更新。'
  const blogFeed = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>' +
    `<title>${blogName}</title><link>${blogOrigin}/blog/</link><description>${blogDescription}</description><language>${english ? 'en' : 'zh-CN'}</language>` +
    posts.map(post => {
      const url = blogOrigin + postPath(post.id)
      return `<item><title>${escape(post.title)}</title><link>${url}</link><guid>${url}</guid>` +
        `<pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escape(post.description)}</description></item>`
    }).join('') + '</channel></rss>\n'
  const componentPath = (id) => components.find(item => item.id === id).path
  const anchors = (title) => title.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  const mark = '<img src="/mark.svg" alt="" width="34" height="34">'
  const brand = `<a class="brand" href="/">${mark}<span>Syntrofic <b>UI</b></span></a>`
  const navItems = [
    [vuePath, '组件', (path) => path.includes('/components/')],
    ['/templates/', '模板', (path) => path.startsWith('/templates/')],
    ['/icons/', english ? 'Icons' : '图标', (path) => path === '/icons/'],
    ['/themes/', '主题', (path) => path === '/themes/'],
    ['/docs/', '文档', (path) => path.startsWith('/docs/') && !path.includes('/components/')],
    ['/agent/', 'Agent UI', (path) => path === '/agent/'],
  ]
  const navigation = (route, indicator = false) => navItems.map(([path, label, active]) => {
    const current = active(route)
    const marker = current && indicator ? '<span class="topnav-indicator" aria-hidden="true"></span>' : ''
    return `<a href="${path}"${current ? ` aria-current="${path === route ? 'page' : 'true'}"` : ''}>${label}${marker}</a>`
  }).join('')

  function header(route) {
    const languagePath = english ? route : '/en' + route
    const language = english ? 'zh-CN' : 'en'
    const languageLabel = english ? '简体中文' : 'English'
    return `<a class="skip-link" href="#main">跳到正文</a>
    <header class="topbar">
      <div class="wide topbar-row">
        ${brand}
        <nav class="topnav" aria-label="主导航">${navigation(route, true)}</nav>
        <div class="top-actions">
          <button class="search-button" type="button" data-search-open aria-label="搜索官网" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">${icon('search')}<span class="search-button__copy"><span>搜索</span></span></button>
          <details class="theme-menu" data-site-disclosure="popup">
            <summary class="icon-button" data-theme-toggle role="button" aria-expanded="false" aria-controls="site-theme-options" aria-label="切换明暗主题"><span>${icon('theme')}${icon('moon')}</span></summary>
            <fieldset id="site-theme-options" class="theme-options" data-site-disclosure-panel aria-label="${english ? 'Appearance' : '外观偏好'}">
              <label><input name="site-theme" type="radio" value="system" checked>${english ? 'System' : '跟随系统'}</label>
              <label><input name="site-theme" type="radio" value="light">${english ? 'Light' : '浅色'}</label>
              <label><input name="site-theme" type="radio" value="dark">${english ? 'Dark' : '深色'}</label>
            </fieldset>
          </details>
          <a class="locale-link" data-site-language href="${languagePath}" hreflang="${language}" lang="${language}" aria-label="${languageLabel}">${english ? '中文' : 'EN'}</a>
          <a class="repo-link" href="${repository}" aria-label="GitHub" title="GitHub 源码">${icon('code')}<span>GitHub</span></a>
          <div class="mobile-nav-frame"><details class="mobile-nav" data-site-disclosure="popup"><summary class="icon-button" aria-label="主导航"><span>${icon('menu')}${icon('close')}</span></summary><nav data-site-disclosure-panel aria-label="移动端主导航">${navigation(route)}<a href="${repository}">GitHub</a></nav></details></div>
        </div>
      </div>
    </header>
    <dialog class="search-dialog" aria-labelledby="search-title">
      <form method="dialog" class="search-form">
        <label id="search-title" class="sr-only" for="site-search">搜索资源</label>
        ${icon('search')}<input id="site-search" type="search" placeholder="搜索组件、文档和模板…" autocomplete="off" autofocus>
        <button class="icon-button" aria-label="关闭搜索">${icon('close')}</button>
      </form>
      <div class="search-scroll"><div class="search-results" data-search-results></div></div>
    </dialog>
    <p class="sr-only" data-site-navigation-status role="status"></p>
    <p class="site-status sr-only" role="status"></p>`
  }

  function footer() {
    return `<footer class="site-footer">
      <div class="wide footer-row">${brand}
        <nav aria-label="页脚导航"><a href="/docs/standard-design/">标准设计</a><a href="/docs/releases/">更新记录</a><a href="${repository}">GitHub</a></nav>
      </div>
    </footer>`
  }

  const button = (href, label, secondary = false) => `<a class="pill ${secondary ? 'pill-soft' : 'pill-solid'}" href="${href}">${label}</a>`
  const codeToolbar = (language = '') => `<div class="code-toolbar"><span>${escape(language || '代码')}</span><button type="button" data-copy><span data-site-action-label>复制</span></button></div>`
  const code = (source, language = '') => `<div class="code-block">${codeToolbar(language)}<pre><code>${escape(source.trimEnd())}</code></pre></div>`
  const featuredTemplates = ['dashboard-comparison', 'table-page', 'checkout-wizard']

  function templatePreviews() {
    return `<div class="template-previews">${featuredTemplates.map(id => {
      const template = templates.find(item => item.id === id)
      const height = id === 'checkout-wizard' ? 494 : 501
      return `<a class="template-preview" href="/templates/${id}/">
        <div class="template-preview__media">
          <div class="template-preview__picture" data-site-preview>
            <img src="/previews/${id}.webp" width="850" height="${height}" loading="lazy" decoding="async" alt="">
            <div class="template-preview__placeholder" aria-hidden="true"><span></span><span></span><span></span></div>
            <span class="template-preview__unavailable" aria-hidden="true">${icon('image')}</span>
          </div>
        </div>
        <div class="template-preview__copy"><h3>${escape(template.name)}</h3></div>
      </a>`
    }).join('')}</div>`
  }

  function resourceLink(path, name, symbol) {
    const platform = symbol === 'vue' || symbol === 'native' ? ` data-platform="${symbol}"` : ''
    return `<a class="resource-link" href="${path}"${platform}><span class="strip-icon">${icon(symbol)}</span><span>${escape(name)}</span></a>`
  }

  function playground() {
    const featured = ['W.button', 'W.input', 'W.switch', 'W.chip', 'W.progress-bar', 'W.modal']
    return `<section class="home-playground" aria-labelledby="home-playground-title">
      <div class="section-top"><h2 id="home-playground-title">组件工作台</h2>${button(vuePath, '全部组件', true)}</div>
      <div class="playground-grid">
        <div class="hero-demo" data-island="hero">
          <div class="hero-fallback"><span>交付工作台</span><strong>76%</strong><progress value="76" max="100" aria-label="项目进度">76%</progress></div>
        </div>
        <div class="sample-grid" role="group" aria-label="单个组件">${featured.map(id => {
          const entry = components.find(item => item.id === id)
          return `<article class="sample-card">
            <h3 class="sample-caption"><a href="${entry.path}">${escape(entry.name)}</a></h3>
            <div class="sample-stage" data-island="sample" data-component="${id}">
              <div class="sample-placeholder" aria-hidden="true"><span></span><span></span></div>
            </div>
          </article>`
        }).join('')}</div>
      </div>
    </section>`
  }

  function home() {
    return `<main id="main" class="wide site-home">
      <section class="home-intro" aria-labelledby="home-title">
        <div class="home-title">
          <h1 id="home-title"><span class="platform-word" data-platform="vue">Vue</span> 与 <span class="platform-word" data-platform="native">Native</span><br>界面组件库</h1>
          <div class="home-actions">${button(webInstallPath, '快速开始')}${button('/docs/standard-design/', '标准设计', true)}</div>
        </div>
        <div class="home-setup">
          ${code(`git clone ${repository}.git`, english ? 'Get the source' : '获取源码')}
          <nav class="home-platforms" aria-label="按平台浏览组件">
            ${resourceLink(vuePath, 'Vue 组件', 'vue')}
            ${resourceLink(nativePath, 'Native 组件', 'native')}
          </nav>
        </div>
      </section>
      ${playground()}
      <section class="home-section" aria-labelledby="home-templates-title">
        <div class="section-top"><h2 id="home-templates-title">页面模板</h2>${button('/templates/', '全部模板', true)}</div>
        ${templatePreviews()}
      </section>
      <section class="home-section" aria-labelledby="home-resources-title">
        <div class="section-top"><h2 id="home-resources-title">开发资源</h2></div>
        <nav class="home-resources" aria-labelledby="home-resources-title">
          ${resourceLink('/docs/', '接入文档', 'cube')}
          ${resourceLink('/themes/', '主题实验室', 'palette')}
          ${resourceLink('/agent/', 'Agent UI', 'spark')}
          ${resourceLink('/docs/tools/', 'CLI 与 MCP', 'code')}
        </nav>
      </section>
    </main>`
  }

  const platformLinks = (native) => `<div class="segmented platform-links">
    <a href="${vuePath}" data-platform="vue"${native ? '' : ' aria-current="page"'}>${icon('vue')} Vue</a>
    <a href="${nativePath}" data-platform="native"${native ? ' aria-current="page"' : ''}>${icon('native')} Native</a>
  </div>`

  function docsNav(path, entry) {
    const platform = entry?.native || path === nativePath || path === nativeInstallPath
    const pairs = entry ? components.filter(item => item.native === entry.native && item.category === entry.category) : []
    const scope = (english ? 'en:' : '') + (entry ? (platform ? 'native:' : 'vue:') + entry.category : 'docs')
    return `<aside class="docs-rail"><div class="docs-nav" data-docs-scope="${escape(scope)}"><details data-site-disclosure open><summary>文档导航</summary>
      <nav data-site-disclosure-panel aria-label="文档导航"><h2>开始使用</h2>
        <a href="/docs/"${path === '/docs/' ? ' aria-current="page"' : ''}>文档总览</a>
        ${guides.map(guide => `<a href="${guide.path}"${path === guide.path ? ' aria-current="page"' : ''}>${guide.title}</a>`).join('')}
        <h2>组件目录</h2>
        <a href="${vuePath}"${path === vuePath ? ' aria-current="page"' : ''}>Vue 组件</a>
        <a href="${nativePath}"${path === nativePath ? ' aria-current="page"' : ''}>Native 组件</a>
        ${entry ? `<h2>${platform ? 'Native' : 'Vue'} · ${categories[entry.category]}</h2>${pairs.map(item => `<a href="${item.path}"${path === item.path ? ' aria-current="page"' : ''}>${escape(item.name)}</a>`).join('')}` : ''}
      </nav>
    </details></div></aside>
    <script>
      {
        const pane = document.currentScript.previousElementSibling.querySelector('.docs-nav')
        const scope = 'syntrofic-docs-nav:' + pane.dataset.docsScope
        let entry
        try {
          let id = history.state?.syntroficDocsVisit
          if (!id) {
            id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
            history.replaceState({ ...history.state, syntroficDocsVisit: id }, '')
          }
          entry = scope + ':visit:' + id
        } catch {}
        const scrollable = () => getComputedStyle(pane).overflowY === 'auto'
        const disclosure = pane.firstElementChild
        function save() {
          if (!scrollable()) return
          try {
            const top = String(pane.scrollTop)
            if (entry) sessionStorage.setItem(entry, top)
            sessionStorage.setItem(scope, top)
          } catch {}
        }
        // Restore this rail before the browser paints the new document.
        if (disclosure.toggleAttribute('data-docs-compact', !scrollable())) {
          disclosure.open = false
        } else {
          let saved
          try {
            saved = entry ? sessionStorage.getItem(entry) : null
            pane.scrollTop = Number(saved ?? sessionStorage.getItem(scope) ?? 0)
          } catch {}
          // Prior visits preserve the reader's position, even when the current link is out of view.
          const active = saved == null ? pane.querySelector('[aria-current="page"]') : null
          if (active) {
            const viewport = pane.getBoundingClientRect()
            const row = active.getBoundingClientRect()
            if (row.bottom <= viewport.top) pane.scrollTop += row.top - viewport.top
            else if (row.top >= viewport.bottom) pane.scrollTop += row.bottom - viewport.bottom
          }
        }
        pane.addEventListener('click', event => { if (event.target.closest?.('a[href]')) save() }, true)
        window.addEventListener('pagehide', save)
      }
    </script>`
  }

  function docsLayout(path, content, titles = [], entry) {
    return `<main id="main" class="wide docs-layout">${docsNav(path, entry)}<article class="docs-content">${content}</article>
      ${titles.length ? `<aside class="page-toc"><nav aria-label="本页目录"><strong>本页目录</strong>${titles.map(title => `<a href="#${anchors(title)}">${escape(title)}</a>`).join('')}</nav></aside>` : ''}
    </main>`
  }

  function intro(label, title, description) {
    return `<header class="page-intro">${label ? `<p class="breadcrumb">${label}</p>` : ''}
      <h1>${escape(title)}</h1>
      ${description ? `<p class="page-description">${escape(description)}</p>` : ''}
    </header>`
  }

  function list(native) {
    const path = native ? nativePath : vuePath
    const entries = components.filter(item => item.native === native)
    const groups = Object.keys(categories).filter(key => entries.some(item => item.category === key))
    const content = `<div class="directory-heading">${intro('', native ? 'Native 组件' : 'Vue 组件')}${platformLinks(native)}</div>`
    return docsLayout(path, content + `
      <div class="catalog-tools">
        <label class="filter-label">${icon('search')}<span class="sr-only">筛选组件</span><input id="component-filter" type="search" placeholder="筛选组件…" autocomplete="off"></label>
        <p class="catalog-count" role="status" data-count>${entries.length} 个组件</p>
      </div>
      <div class="catalog-results" data-catalog-results>
      ${groups.map(group => `<section class="catalog-group" data-group><h2 id="${anchors(categories[group])}">${categories[group]}</h2><div class="component-grid">
        ${entries.filter(item => item.category === group).map(item => `<a class="component-card" data-component-card data-query="${escape([item.name, item.label, item.symbol, item.id, item.criteria].join(' '))}" href="${item.path}">
          <h3>${escape(item.name)}</h3>
        </a>`).join('')}
      </div></section>`).join('')}
      <p class="notice" data-no-components hidden>没有匹配的组件。</p>
      </div>`, groups.map(group => categories[group]))
  }

  const minimalExamples = {
    'W.button': `<script setup lang="ts">
  import { SButton } from '@syntrofic/ui'
  import '@syntrofic/ui/style.css'
  import { ref } from 'vue'

  const saved = ref(false)
  async function save() {
    await new Promise(resolve => setTimeout(resolve, 450))
    saved.value = true
  }
  </script>

  <template>
    <SButton :click-action="save">{{ saved ? '已保存' : '保存修改' }}</SButton>
    <SButton variant="secondary" size="sm" elevation="med">预览</SButton>
  </template>`,
    'W.toggle-button-group': `<script setup lang="ts">
  import { SToggleButton, SToggleButtonGroup } from '@syntrofic/ui'
  import { ref } from 'vue'

  const view = ref<string | undefined>('list')
  </script>

  <template>
    <SToggleButtonGroup v-model="view" label="交付视图" size="sm">
      <SToggleButton value="list">列表</SToggleButton>
      <SToggleButton value="board">看板</SToggleButton>
    </SToggleButtonGroup>
  </template>`,
    'W.switch': `<script setup lang="ts">
  import { SSwitch } from '@syntrofic/ui'
  import { ref } from 'vue'

  const enabled = ref(true)
  </script>

  <template>
    <SSwitch v-model="enabled">邮件通知</SSwitch>
  </template>`,
    'W.progress-bar': `<script setup lang="ts">
  import { SProgressBar } from '@syntrofic/ui'
  </script>

  <template>
    <SProgressBar label="发布进度" :value="76" />
  </template>`,
    'N.button': `<script setup lang="ts">
  import { SNativeButton } from '@syntrofic/ui-native'
  import { ref } from 'vue'

  const saved = ref(false)
  </script>

  <template>
    <SNativeButton :label="saved ? '已保存' : '保存'" @tap="saved = true" />
  </template>`,
  }

  const compactPreviewCategories = new Set(['Buttons', 'Forms', 'Date and Time', 'Controls', 'Pickers', 'Colors', 'Form Controls', 'Typography'])
  const selfContainedPreviews = new Set(['W.power-search', 'W.code-editor', 'WP.rich-text-editor'])

  function detail(entry) {
    const platform = entry.native ? 'Native' : 'Vue'
    const root = entry.native ? nativePath : vuePath
    const start = entry.native ? nativeInstallPath : webInstallPath
    const pages = components.filter(item => item.native === entry.native)
    const position = pages.indexOf(entry)
    const imported = entry.reference ? `import ${entry.reference.named ? '{ ' + entry.symbol + ' }' : entry.symbol} from '${entry.reference.from}'` : null
    const example = english ? englishExample(minimalExamples[entry.id]) : minimalExamples[entry.id]
    const use = english ? englishUsage[entry.id] : entry.use
    const simplePreview = compactPreviewCategories.has(entry.category) && !selfContainedPreviews.has(entry.id)
    const preview = entry.preview ? `<h2 id="实时预览">实时预览</h2>
      <div class="demo-frame"><div class="demo-body" data-island="component" data-component="${entry.id}"${simplePreview ? ' data-preview-surface' : ''}>${islandPlaceholder('示例加载中…')}</div></div>` : ''
    const sections = english ? '' : entry.notes.map((note, index) => `<section><h3 id="note-${index}">${escape(note.heading)}</h3>${note.html}</section>`).join('')
    const prev = pages[position - 1]
    const next = pages[position + 1]
    return docsLayout(entry.path, intro(`<a href="/docs/">文档</a> / <a href="${root}">${platform} 组件</a> / ${categories[entry.category]}`,
      entry.name) +
      `<div class="doc-prose">${preview}<h2 id="接入">接入</h2>
      ${imported ? code(imported, 'TypeScript') : ''}
      <p><a href="${start}">${platform} 安装与配置</a></p>
      ${example ? code(example, 'Vue') : ''}
      ${use || sections ? `<h2 id="使用说明">使用说明</h2>${use ? markdown.render(use) : ''}${sections}` : ''}
      ${entry.native ? `<h2 id="设备预览">设备预览</h2><p>${english
        ? `Open <code>${entry.symbol}</code> in the Native example app${entry.reviewNumber ? ' (scene ' + entry.reviewNumber + ')' : ''}. <a href="${nativeInstallPath}#run-the-examples">Run the iOS or Android examples</a>.`
        : `在 Native 示例应用中打开 ${entry.reviewNumber ? `编号 <code>${entry.reviewNumber}</code> 的` : ''} <code>${entry.symbol}</code> 场景。<a href="${nativeInstallPath}#运行示例">运行 iOS 或 Android 示例</a>。`}</p>` : ''}
      </div>
      <nav class="page-neighbors" aria-label="相邻组件">${prev ? `<a href="${prev.path}" rel="prev" aria-label="上一个组件 ${escape(prev.name)}"><span>上一个组件</span><strong>${escape(prev.name)}</strong></a>` : ''}${next ? `<a href="${next.path}" rel="next" aria-label="下一个组件 ${escape(next.name)}"><span>下一个组件</span><strong>${escape(next.name)}</strong></a>` : ''}</nav>`,
      [...(entry.preview ? ['实时预览'] : []), '接入', ...(use || sections ? ['使用说明'] : []), ...(entry.native ? ['设备预览'] : [])], entry)
  }

  const coverageGroups = {
    core: 'Web 组件', native: '原生组件', motion: '动效', utility: '辅助函数与配置',
    charts: '图表组件', 'chart-mark': '图表标记', richtext: '富文本', vega: 'Vega',
    lab: '实验组件', template: '页面模板', theme: '主题', tool: '开发工具',
  }
  const coverageLabels = { mapped: '有对应', partial: '部分覆盖', gap: '缺口' }
  const standardLinks = new Map(components.map(entry => [entry.id, entry.path]))
  const designExamplesPath = '/docs/standard-design/examples/'

  function coverageFilter(total, labels) {
    return `<div class="design-coverage-filter" data-coverage-filter hidden>
      <label class="filter-label">${icon('search')}<span class="sr-only">搜索对照清单</span><input id="design-coverage-query" type="search" placeholder="名称或实现…" autocomplete="off"></label>
      <label for="design-coverage-status">筛选覆盖情况</label>` +
      '<select id="design-coverage-status"><option value="">全部</option>' +
      Object.entries(labels).map(([status, title]) => '<option value="' + status + '">' + title + '</option>').join('') +
      '</select><span role="status" data-coverage-count>' + total + ' 项</span></div>' +
      '<p class="notice" data-no-coverage hidden>没有匹配的条目。可以清除条件后重试。</p>'
  }

  function coverage() {
    const entries = Object.values(astryx.groups).flat()
    const totals = Object.fromEntries(Object.keys(coverageLabels).map(status => [status, entries.filter(row => row[2] === status).length]))
    const source = astryx.repository + '/blob/' + astryx.revision + '/'
    const summary = '<p>参考版本 <a href="' + astryx.repository + '/tree/' + astryx.revision + '"><code>' + astryx.revision.slice(0, 12) +
      '</code></a> · ' + entries.length + ' 项 · ' + Object.entries(coverageLabels).map(([status, title]) => title + ' ' + totals[status]).join(' · ') + '</p>'
    return summary + coverageFilter(entries.length, coverageLabels) + Object.entries(coverageGroups).map(([group, title]) => {
      const rows = astryx.groups[group]
      return '<div class="design-coverage-frame"><details class="design-coverage" data-site-disclosure><summary>' + title + ' · ' + rows.length + '</summary>' +
        '<table class="doc-table" data-site-disclosure-panel><thead><tr><th scope="col">Astryx</th><th scope="col">覆盖情况</th><th scope="col">Syntrofic</th></tr></thead><tbody>' +
        rows.map(([name, path, status, symbol, id]) => {
          const template = group === 'template' && templates.find(item => item.id === name)
          const href = template ? '/templates/' + template.id + '/' : group === 'theme' && symbol ? '/themes/'
            : group === 'tool' && symbol?.startsWith('syntrofic') ? '/docs/tools/'
            : standardLinks.get(id) ?? (id?.startsWith('DX-') ? '/docs/tools/' : id?.startsWith('DS-') ? '/themes/' : undefined)
          const local = symbol ? '<code>' + escape(symbol) + '</code>' : '—'
          return '<tr><th scope="row"><a href="' + escape(source + path) + '">' + escape(name) + '</a></th>' +
            '<td data-coverage="' + status + '">' + coverageLabels[status] + '</td><td>' +
            (href ? '<a href="' + href + '">' + local + '</a>' : local) + '</td></tr>'
        }).join('') + '</tbody></table></details></div>'
    }).join('')
  }

  function designExamples() {
    const groups = Object.entries(astryxExamples.groups)
    const total = groups.reduce((sum, [, examples]) => sum + examples.length, 0)
    const verified = Object.keys(astryxExamples.verified).length
    const labels = { mapped: '已有示例', pending: '待核对' }
    const source = `${astryx.repository}/blob/${astryxExamples.revision}/packages/cli/assets/templates/blocks/components/`
    const list = groups.map(([component, examples]) => `<div class="design-coverage-frame"><details class="design-coverage" data-site-disclosure><summary>${escape(component)} · ${examples.length}</summary>
      <table class="doc-table" data-site-disclosure-panel><thead><tr><th scope="col">Astryx 示例</th><th scope="col">覆盖情况</th><th scope="col">Syntrofic</th></tr></thead><tbody>${examples.map(example => {
        const key = component + '/' + example
        const local = standardLinks.get(astryxExamples.verified[key])
        const status = local ? 'mapped' : 'pending'
        return `<tr><th scope="row"><a href="${escape(source + key + '.doc.mjs')}">${escape(example)}</a></th>
          <td data-coverage="${status}">${labels[status]}</td><td>${local ? `<a href="${local}#实时预览">试用对应示例</a>` : '—'}</td></tr>`
      }).join('')}</tbody></table></details></div>`).join('')
    return docsLayout(designExamplesPath, intro('<a href="/docs/standard-design/">标准设计</a>', '独立示例对照',
      `${total} 个 Astryx 示例，已有示例 ${verified} 项，待核对 ${total - verified} 项。`) +
      `<div class="doc-prose">${coverageFilter(total, labels)}${list}</div>`)
  }

  function guidePage(guide) {
    const source = english ? readFileSync(new URL('./guides/en/' + guide.file + '.md', import.meta.url), 'utf8') : guideContent.get(guide.path)
    const titles = Array.from(source.matchAll(/^## (.+)$/gm), match => match[1])
    let heading = 0
    let rendered = markdown.render(source).replaceAll('<h2>', () => `<h2 id="${anchors(titles[heading++])}">`)
      .replaceAll(/<pre><code(?: class="language-([^"]+)")?>/g, (_, language) =>
        `<div class="code-block">${codeToolbar(language)}<pre><code>`)
      .replaceAll('</code></pre>', '</code></pre></div>')
    if (guide.file === 'standard-design') {
      const motionTitle = english ? 'Interaction and motion' : '交互与动效'
      const motionHeading = `<h2 id="${anchors(motionTitle)}">${motionTitle}</h2>`
      rendered = rendered.replace(motionHeading, motionHeading + `
        <div class="demo-frame design-motion-demo"><div class="demo-body" data-island="layout-motion">
          ${islandPlaceholder('布局动效示例加载中…')}
        </div></div>`)
    }
    return docsLayout(guide.path, intro('<a href="/docs/">文档</a>', guide.title) + `<div class="doc-prose">${rendered}${guide.file === 'standard-design' ? coverage() : ''}</div>`, titles)
  }

  function docsHome() {
    return docsLayout('/docs/', intro('', '开发文档') + `
      <section class="docs-index-section" aria-labelledby="docs-start">
        <h2 id="docs-start">安装与接入</h2>
        <div class="docs-entry">${resourceLink(webInstallPath, 'Vue 快速开始', 'vue')}${resourceLink(nativeInstallPath, 'Native 快速开始', 'native')}</div>
      </section>
      <section class="docs-index-section" aria-labelledby="docs-components">
        <h2 id="docs-components">组件目录</h2>
        <div class="docs-entry">${resourceLink(vuePath, 'Vue 组件', 'vue')}${resourceLink(nativePath, 'Native 组件', 'native')}</div>
      </section>
      <section class="docs-index-section" aria-labelledby="docs-resources">
        <h2 id="docs-resources">设计与开发</h2>
        <div class="docs-entry">${resourceLink('/docs/standard-design/', '标准设计', 'cube')}${resourceLink('/docs/design-rules/', '设计规范', 'form')}${resourceLink('/docs/theming/', '主题与样式', 'palette')}
          ${resourceLink('/docs/tools/', 'CLI 与 MCP', 'code')}${resourceLink('/docs/releases/', '更新记录', 'spark')}</div>
      </section>`)
  }

  const templateCategories = [
    ['all', '全部'], ['dashboard', '仪表盘'], ['table', '数据表格'], ['form', '表单与设置'],
    ['conversation', '对话与消息'], ['page', '页面布局'], ['native', 'Native'],
  ]
  const templateIcons = { dashboard: 'chart', table: 'table', data: 'table', form: 'form', conversation: 'message', native: 'native' }
  const blocksPath = '/templates/blocks/'
  const blockPath = id => blocksPath + id + '/'
  const blockCategories = [
    ['all', '全部'], ['form', '表单'], ['action', '操作与反馈'], ['navigation', '导航与浮层'],
    ['data', '数据展示'], ['layout', '布局与内容'], ['conversation', '对话'],
  ]
  const componentBlockCategory = {
    Buttons: 'action', Feedback: 'action', Controls: 'action', Forms: 'form', Pickers: 'form', 'Date and Time': 'form',
    Navigation: 'navigation', Overlays: 'navigation', Charts: 'data', Collections: 'data', 'Data Display': 'data', AI: 'conversation',
  }

  function templateCategory(template) {
    if (template.native) return 'native'
    if (/^(dashboard|incident|finances)/.test(template.id)) return 'dashboard'
    if (template.id.startsWith('table') || template.id === 'crm') return 'table'
    if (/^(checkout|contact|form|login|payment|settings)/.test(template.id)) return 'form'
    if (/^(ai-chat|chat|mail|messaging)/.test(template.id)) return 'conversation'
    return 'page'
  }

  function templateSwitch(selected) {
    return `<nav class="template-type-links" aria-label="模板类型">
      <a href="/templates/"${selected === 'pages' ? ' aria-current="page"' : ''}>应用页面</a>
      <a href="${blocksPath}"${selected === 'blocks' ? ' aria-current="page"' : ''}>可复用片段</a>
    </nav>`
  }

  function templateDirectory(entries = templates, groups = templateCategories, unit = '模板') {
    return `<div class="catalog-tools template-tools">
        <div class="catalog-filters" data-template-tools inert>
          <div class="segmented" aria-label="${unit}分类">${groups.map(([value, label]) =>
            `<button type="button" data-template-category="${value}" aria-pressed="${value === 'all'}">${label}</button>`).join('')}</div>
          <label class="filter-label">${icon('search')}<span class="sr-only">筛选${unit}</span><input id="template-filter" type="search" placeholder="搜索${unit}…" autocomplete="off"></label>
        </div>
        <p class="catalog-count" role="status" data-template-count data-template-unit="${unit}">${entries.length} 个${unit}</p>
      </div>
      <div class="catalog-results" data-catalog-results><div class="feature-grid template-grid">${entries.map(template => {
        const category = template.category ?? templateCategory(template)
        const label = groups.find(([id]) => id === category)[1]
        const query = [template.name, template.id, template.kind, template.component, template.description, label, template.native ? 'iOS Android' : 'Vue'].filter(Boolean).join(' ')
        return `<a class="template-card" data-template-card="${category}" data-query="${escape(query)}" href="${template.href ?? '/templates/' + template.id + '/'}">
          <span class="feature-icon"${template.native ? ' data-platform="native"' : ''}>${icon(templateIcons[category] ?? (template.href ? 'cube' : 'layout'))}</span>
          <h2>${escape(template.name)}</h2>
        </a>`
      }).join('')}</div>
      <p class="notice" data-no-templates hidden>没有匹配的${unit}。可以清除条件或切换分类。</p></div>`
  }

  const blocks = [
    ...checkoutBlocks.map(block => ({ ...block, href: blockPath(block.id), category: 'form', kind: '结账 订单付款 checkout' })),
    ...components.filter(entry => entry.preview && entry.reference && entry.symbol).map(entry => ({
      id: entry.id, name: english ? entry.name : entry.label ?? entry.name, component: entry.symbol, description: english ? entry.name : entry.criteria || entry.name, kind: entry.name,
      href: entry.path + '#实时预览', category: componentBlockCategory[entry.category] ?? 'layout',
    })),
  ]

  function featurePage(title, content) {
    return `<main id="main" class="wide feature-page">${intro('', title)}${content}</main>`
  }

  function iconDirectory() {
    const title = english ? 'Syntrofic Icons' : 'Syntrofic 图标'
    const labels = english ? { actions: 'Actions', navigation: 'Navigation', content: 'Content', status: 'Status', devices: 'Devices and tools' }
      : { actions: '操作', navigation: '导航', content: '内容', status: '状态', devices: '设备与工具' }
    const searchLabel = english ? 'Search icons' : '搜索图标'
    const filterLabel = english ? 'Icon category' : '图标类别'
    const entries = Object.entries(syntroficIcons)
    return `<main id="main" class="wide feature-page icon-directory">
      ${intro('', title, english ? 'Flat vector icons for Vue, Native, and SVG.' : '官网、Vue 与 Native 共用的扁平矢量图标。')}
      <section data-icon-directory aria-label="${title}">
        <div class="icon-directory-tools" data-icon-tools hidden>
          <label class="filter-label">${icon('search')}<span class="sr-only">${searchLabel}</span><input type="search" data-icon-search placeholder="${searchLabel}" autocomplete="off"></label>
          <label class="icon-directory-category"><span class="sr-only">${filterLabel}</span><select data-icon-category>
            <option value="">${english ? 'All categories' : '全部类别'}</option>
            ${Object.entries(labels).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
          </select></label>
          <output data-icon-count role="status">${english ? `${entries.length} icons` : `${entries.length} 个图标`}</output>
        </div>
        <ul class="icon-directory-grid" aria-label="${title}">${entries.map(([name, definition]) => {
          const label = english ? definition.en : definition.zh
          const keywords = [name, definition.en, definition.zh, definition.keywords, labels[definition.category]].join(' ')
          const download = english ? `Download ${label} SVG` : `下载${label} SVG`
          return `<li class="icon-directory-card" data-icon-entry="${name}" data-icon-group="${definition.category}" data-icon-keywords="${escape(keywords)}">
            <span class="icon-directory-preview">${icon(name)}</span>
            <div class="icon-directory-name"><strong>${escape(label)}</strong><code>${name}</code></div>
            <a class="icon-directory-download" href="/icons/svg/${name}.svg" download="syntrofic-${name}.svg" aria-label="${escape(download)}">SVG</a>
          </li>`
        }).join('')}</ul>
        <p class="notice" data-icon-empty hidden>${english ? 'No icons match your search.' : '没有匹配的图标。'}</p>
      </section>
    </main>`
  }

  function templateCatalog(title, selected, entries, categories, unit) {
    return `<main id="main" class="wide feature-page">
      <div class="directory-heading">${intro('', title)}${templateSwitch(selected)}</div>
      ${templateDirectory(entries, categories, unit)}
    </main>`
  }

  const routes = new Map()
  function route(path, title, description, body) {
    if (routes.has(path)) throw new Error('Duplicate route ' + path)
    routes.set(path, { title, description, body })
  }

  route('/', english ? 'Syntrofic UI | Open-source Vue and NativeScript UI library' : 'Syntrofic UI｜开源 Vue 与 NativeScript 组件库',
    english ? 'Build Web, iOS, and Android apps with the MIT-licensed Syntrofic UI library. Explore Vue 3 and NativeScript-Vue components, themes, charts, and live templates.'
      : 'Syntrofic UI 是采用 MIT 许可证的 Vue 3 与 NativeScript-Vue 组件库。在线试用组件、主题、图表和页面模板，构建 Web、iOS 和 Android 界面。', home)
  route('/docs/', '开发文档', 'Syntrofic UI 的入门、组件、主题和开发工具。', docsHome)
  const iconTitle = english ? 'Syntrofic Icons · SVG icon library' : 'Syntrofic 图标 · SVG 图标库'
  const iconDescription = english ? 'Search and download flat SVG icons shared by Syntrofic UI for Vue and Native.' : '搜索和下载 Syntrofic 扁平 SVG 图标，可在 Vue 与 Native 中使用。'
  route('/icons/', iconTitle, iconDescription, iconDirectory)
  route(vuePath, 'Vue 组件', 'Syntrofic UI 的 Vue 3 组件目录和交互示例。', () => list(false))
  route(nativePath, 'Native 组件', 'Syntrofic UI 的 NativeScript-Vue 原生组件目录。', () => list(true))
  for (const entry of components) {
    const platform = entry.native ? 'NativeScript-Vue' : 'Vue 3'
    const usage = englishUsage[entry.id]?.replaceAll('`', '')
    const description = english
      ? `${entry.name} for ${platform}. ${usage ?? (entry.preview ? 'See the component usage and try the live example.' : 'See the component usage in Syntrofic UI.')}`
      : `${platform} 的 ${entry.name} 组件。${entry.criteria ?? `查看 ${entry.symbol ?? entry.name} 的接入与用法。`}`
    route(entry.path, `${entry.name} · ${platform}`, description, () => detail(entry))
  }
  route(designExamplesPath, '独立示例对照', '按组件核对 Astryx 的独立示例，并试用 Syntrofic 的对应实现。', designExamples)
  for (const guide of guides) route(guide.path, guide.title, guide.summary, () => guidePage(guide))
  route('/blog/', '更新记录', 'Syntrofic UI 的组件、主题和开发工具更新。', () => featurePage('更新记录',
    `<p><a href="/blog/feed.xml">订阅 RSS</a></p><div class="feature-grid release-grid">${posts.map(post => `<a class="feature-card" href="${postPath(post.id)}">
    <h2>${escape(post.title)}</h2><time datetime="${escape(post.date)}">${escape(post.date)}</time></a>`).join('')}</div>`))
  for (const post of posts) route(postPath(post.id), post.title, post.description, () => featurePage(post.title,
    `<article class="doc-prose"><p><time datetime="${escape(post.date)}">${escape(post.date)}</time></p>${markdown.render(post.body)}</article>`))
  for (const feature of features) {
    if (feature.path === '/templates/') {
      route(feature.path, feature.title, feature.description, () => templateCatalog(feature.title, 'pages'))
      continue
    }
    const content = feature.path === '/themes/'
      ? `<div class="feature-stage" data-island="theme">${islandPlaceholder('主题实验室加载中…', 'page')}</div>`
      : `<div class="feature-stage" data-island="agent">${islandPlaceholder('示例加载中…', 'page')}</div><div class="doc-prose feature-prose"><h2>接入 Agent UI</h2>
        <p>${english
        ? `Pass a structured <code>version: 1</code> document. The renderer validates nodes against ${agentCount} catalog entries. Handle user actions via the <code>action</code> event.`
        : `组件接收 <code>version: 1</code> 的结构化文档，支持 ${agentCount} 个目录条目。渲染器校验节点后生成界面，宿主应用通过 <code>action</code> 事件处理操作。`}</p>
        ${code(`import { SAgentUI } from '@syntrofic/ui'\n\n<SAgentUI :document="document" @action="onAction" />`, 'Vue')}</div>`
    route(feature.path, feature.title, feature.description, () => featurePage(feature.title, content))
  }
  const blockDescription = '按场景查找组件交互示例，或把订单表单片段加入项目。'
  route(blocksPath, '可复用片段', blockDescription, () => templateCatalog('可复用片段', 'blocks', blocks, blockCategories, '片段'))
  for (const block of checkoutBlocks) {
    route(blockPath(block.id), block.name, block.description, () => `<main id="main" class="wide feature-page">
      ${intro('<a href="/templates/">模板</a> / <a href="' + blocksPath + '">可复用片段</a>', block.name)}
      <div class="feature-stage" data-island="checkout-block" data-template="${block.id}">${islandPlaceholder('片段加载中…')}</div>
      <div class="doc-prose feature-prose"><h2>在项目中试用</h2>${code(`pnpm exec syntrofic template add ${block.id} --type block --out ./${block.id}`, '终端')}</div>
    </main>`)
  }
  for (const template of templates) {
    route('/templates/' + template.id + '/', template.name, template.description, () => `<main id="main" class="wide feature-page">
      ${intro('<a href="/templates/">模板</a> / ' + (template.native ? 'Native' : 'Vue'), template.name)}
      ${template.native
        ? `<div class="notice">${english ? `Open ${template.name} in the <a href="${nativeInstallPath}#run-the-examples">Native example app</a>.` :
          `在 <a href="${nativeInstallPath}#运行示例">Native 示例应用</a>中选择「${template.name}」体验。`}</div>`
        : `<div class="feature-stage" data-island="${template.island ?? 'template'}" data-template="${template.id}">${islandPlaceholder('模板加载中…', 'page')}</div>
          <div class="doc-prose feature-prose"><h2>在项目中使用</h2>${template.standard
            ? code(`import { ${template.component} } from '@syntrofic/ui'`, 'TypeScript')
            : code(`import { SWorkspaceTemplate } from '@syntrofic/ui'\n\n<SWorkspaceTemplate kind="${template.id}" />`, 'Vue')}</div>`}
    </main>`)
  }

  const notFound = {
    title: '页面未找到', description: '此路径没有对应的 Syntrofic UI 页面。',
    body: () => `<main id="main" class="wide feature-page">${intro('', '页面未找到')}<div class="home-actions">${button('/docs/', '打开文档')}${button(vuePath, '浏览组件', true)}</div></main>`,
  }

  const searchIndex = [
    ...guides.map(guide => [guide.title, guide.path, '文档', guide.summary]),
    [iconTitle, '/icons/', english ? 'Icons' : '图标', iconDescription],
    ['独立示例对照', designExamplesPath, '文档', '查找 Astryx 示例及对应的 Syntrofic 组件预览'],
    ...features.map(feature => [feature.title, feature.path, '功能', feature.description]),
    ...posts.map(post => [post.title, postPath(post.id), '更新记录', post.description]),
    ...templates.map(template => [template.name, '/templates/' + template.id + '/', '模板', template.kind + ' ' + template.description]),
    ['可复用片段', blocksPath, '模板', blockDescription],
    ...checkoutBlocks.map(block => [block.name, blockPath(block.id), '片段', block.description]),
    ...components.map(entry => [entry.name, entry.path, entry.native ? 'Native' : 'Vue',
      [entry.label, entry.symbol, entry.id, entry.criteria].filter(Boolean).join(' ')]),
  ]
  return { routes, header, footer, notFound, blogIndex, blogFeed, searchIndex }

}
const chinese = createSite(false)
const english = createSite(true)
const inEnglish = path => path.startsWith('/en/')
const toEnglish = path => '/en' + path
const routes = new Map([...chinese.routes, ...Array.from(english.routes, ([path, page]) => [toEnglish(path), page])])
const staticRoutes = new Set(['/blog/feed.xml', '/blog/feed.json'])
const englishHref = path => english.routes.has(path) || staticRoutes.has(path) ? toEnglish(path) : path
const englishBody = html => englishCopy(html)
  .replace(/(href=")(\/[^"#?]*)([^"]*)"/g, (_, attribute, path, suffix) => attribute + englishHref(path) + suffix + '"')
  .replace(/(id="|href="#|#[^"]*?)(Live preview|Setup|Usage|Device preview|Run the examples)"/g,
    (_, prefix, label) => prefix + label.toLowerCase().replaceAll(' ', '-') + '"')

const siteSchema = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': origin + '/#website',
  name: siteName, url: origin + '/', inLanguage: ['zh-CN', 'en'],
})

function pageMetadata(path, pagePath, title, description) {
  if (!routes.has(path)) return '<meta name="robots" content="noindex">'
  const isEnglish = inEnglish(path)
  const imageAlt = isEnglish ? 'Syntrofic UI dashboard template' : 'Syntrofic UI 仪表盘模板'
  return `<link rel="canonical" href="${origin + path}">
      <link rel="alternate" hreflang="zh-CN" href="${origin + pagePath}">
      <link rel="alternate" hreflang="en" href="${origin + toEnglish(pagePath)}">
      <link rel="alternate" hreflang="x-default" href="${origin + pagePath}">
      <link rel="alternate" type="application/rss+xml" title="${siteName}" href="${origin}${isEnglish ? '/en' : ''}/blog/feed.xml">
      <meta property="og:site_name" content="${siteName}">
      <meta property="og:type" content="${pagePath.startsWith('/blog/') && pagePath !== '/blog/' ? 'article' : 'website'}">
      <meta property="og:locale" content="${isEnglish ? 'en_US' : 'zh_CN'}">
      <meta property="og:locale:alternate" content="${isEnglish ? 'zh_CN' : 'en_US'}">
      <meta property="og:title" content="${escape(title)}">
      <meta property="og:description" content="${escape(description)}">
      <meta property="og:url" content="${origin + path}">
      <meta property="og:image" content="${origin + shareImage}">
      <meta property="og:image:width" content="850">
      <meta property="og:image:height" content="501">
      <meta property="og:image:alt" content="${escape(imageAlt)}">
      <meta name="twitter:card" content="summary_large_image">
      ${pagePath === '/' ? `<script type="application/ld+json">${siteSchema}</script>` : ''}`
}

function renderPage(template, path) {
  const isEnglish = inEnglish(path)
  const site = isEnglish ? english : chinese
  const pagePath = isEnglish ? path.slice(3) : path
  const page = site.routes.get(pagePath) ?? site.notFound
  const localize = isEnglish ? englishCopy : value => value
  const title = localize(pagePath === '/' ? page.title : page.title + ' | ' + siteName)
  const description = localize(page.description)
  const zhPath = site.routes.has(pagePath) ? pagePath : '/'
  const body = site.header(zhPath) + page.body() + site.footer()
  const enBody = () => {
    const localized = englishBody(body)
    return localized.replace(/(data-site-language href=")\/en(\/[^"]*)"/, '$1$2"')
  }
  return template.replace('lang="zh-CN"', isEnglish ? 'lang="en"' : 'lang="zh-CN"')
    .replace('<!-- site-head -->', () => `<title>${escape(title)}</title>
      <meta name="description" content="${escape(description)}">
      ${pageMetadata(path, pagePath, title, description)}`)
    .replace('<!-- site-body -->', isEnglish ? enBody : () => body)
}

const searchIndex = JSON.stringify(chinese.searchIndex)
const englishSearchIndex = JSON.stringify(english.searchIndex.map(([title, path, category, keywords]) =>
  [englishCopy(title), englishHref(path), englishCopy(category), englishCopy(keywords)]))
const { blogIndex, blogFeed } = chinese
const englishBlogIndex = english.blogIndex
const englishBlogFeed = english.blogFeed
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  [...routes.keys()].map(path => `<url><loc>${origin + path}</loc></url>`).join('\n') + '</urlset>\n'

export { blogIndex, blogFeed, englishBlogIndex, englishBlogFeed, renderPage, routes, searchIndex, englishSearchIndex, sitemap }
