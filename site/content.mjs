import { readFileSync, readdirSync } from 'node:fs'
import MarkdownIt from 'markdown-it'
import { standardTemplates } from './template-catalog.mjs'
import { reviewItems } from '../preview/review-catalog.ts'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const catalog = JSON.parse(read('../catalog/parity.json'))
export const astryx = JSON.parse(read('../catalog/astryx.json'))
export const astryxExamples = JSON.parse(read('../catalog/astryx-examples.json'))
const implementation = JSON.parse(read('../catalog/implementation.json'))
const webPackage = JSON.parse(read('../package.json'))
const nativePackage = JSON.parse(read('../packages/native/package.json'))
const webExports = read('../src/index.ts')
const nativeExports = read('../packages/native/src/index.ts')
const webNames = new Map(reviewItems.map(([id, label]) => [id, label]))
const nativeNames = new Map(Array.from(
  read('../apps/native-demo/src/review-items.ts').matchAll(/id: '([^']+)', number: '\d+', label: '([^']+)'/g),
  ([, id, label]) => [id, label],
))

export const version = webPackage.version
export const repository = 'https://github.com/syntrofic/syntrofic-ui'
export const webInstallPath = '/docs/quick-start/'
export const nativeInstallPath = '/docs/native/quick-start/'
export const markdown = new MarkdownIt({ html: false, linkify: false })
markdown.renderer.rules.table_open = (tokens, index, options, _env, renderer) => {
  tokens[index].attrJoin('class', 'doc-table')
  return renderer.renderToken(tokens, index, options)
}

export const categories = {
  Buttons: '按钮', Forms: '表单', 'Date and Time': '日期与时间', Navigation: '导航', Overlays: '浮层',
  Collections: '集合', Controls: '控件', Feedback: '反馈', Layout: '布局', Media: '媒体',
  Pickers: '选择器', Typography: '排版', 'Data Display': '数据展示', Colors: '颜色',
  Utilities: '工具', Charts: '图表', AI: 'AI 界面',
}

const docs = readdirSync(new URL('../docs/', import.meta.url))
  .filter(file => /^(web-|native-).*\.md$/.test(file))
  .map(file => {
    const source = read('../docs/' + file)
    const sections = source.split(/^## /m).slice(1).map(section => {
      const firstLine = section.indexOf('\n')
      return { heading: section.slice(0, firstLine), body: section.slice(firstLine + 1).trim() }
    })
    return { file, title: source.split('\n')[0].slice(2), source, sections }
  })

const publicParagraph = (text) => !/https?:|\]\(\.\.?\/|验收|工作台|对标|上游|发布时间|评审/.test(text)
const matchesName = (text, name) => new RegExp('(?<![\\w])' + name + '(?![\\w])').test(text)

function resolveReference(symbol, native, preferredSubpath) {
  const manifest = native ? nativePackage : webPackage
  const packageExports = native ? nativeExports : webExports
  const isNamed = new RegExp('\\b(?:as\\s+)?' + symbol + '\\s*[},]').test(packageExports) ||
    new RegExp('\\bexport\\s+(?:const|function|class)\\s+' + symbol + '\\b').test(packageExports)
  if (isNamed) return { from: manifest.name, named: true }
  if (preferredSubpath && manifest.exports[preferredSubpath]) {
    const modulePath = manifest.exports[preferredSubpath].types
    const exported = native ? read('../packages/native/src/' + preferredSubpath.slice(2) + '.ts') : null
    const hasDefault = native ? /\bdefault\b/.test(exported) : /\.vue\.d\.ts$/.test(modulePath) || preferredSubpath === './map' || preferredSubpath === './markdown'
    return { from: manifest.name + preferredSubpath.slice(1), named: !hasDefault }
  }
  return null
}

const exportBySymbol = new Map(catalog.packageExports.map(item => [
  (item.track.startsWith('native') ? 'native:' : 'web:') + implementation[item.id]?.component, item.name,
]))

export const components = catalog.components.map(entry => {
  const impl = implementation[entry.id]
  const native = entry.track.startsWith('native')
  const symbol = impl?.component
  const slug = entry.id.split('.').at(-1)
  const preferredSubpath = exportBySymbol.get((native ? 'native:' : 'web:') + symbol) ?? './' + slug
  const reference = symbol && resolveReference(symbol, native, preferredSubpath)
  const related = symbol ? docs.filter(doc => doc.file.startsWith(native ? 'native-' : 'web-') && matchesName(doc.source, symbol)) : []
  const notes = related.flatMap(doc => doc.sections.filter(section =>
    publicParagraph(section.heading) && matchesName(section.body, symbol),
  ).map(section => ({
    heading: section.heading,
    html: markdown.render(section.body.split(/\n\n+/).filter(block => publicParagraph(block) && !block.startsWith('|')).join('\n\n')),
  }))).filter(note => note.html).slice(0, 3)
  const use = related.flatMap(doc => doc.source.split('\n').filter(line => line.startsWith('|') && matchesName(line, symbol))
    .map(line => line.split('|').at(-2)?.trim())
    .filter(text => text && publicParagraph(text) && !text.includes(']('))).find(Boolean)
  const platform = native ? 'native' : 'vue'
  return {
    ...entry, label: (native ? nativeNames : webNames).get(entry.id), symbol, native,
    path: '/docs/' + platform + '/components/' + slug + '/',
    reference, reviewNumber: impl?.reviewNumber, preview: !native && webNames.has(entry.id), notes, use,
  }
})

export { standardTemplates }

export const templates = [
  { id: 'dashboard', name: '交付仪表盘', kind: 'Dashboard', tone: 'sage', description: '查看订单总览、交付状态和物流记录。' },
  { id: 'mail', name: '团队邮箱', kind: 'Mail', tone: 'blue', description: '切换文件夹、阅读邮件，撰写并保存草稿。' },
  { id: 'chat', name: '资料助手', kind: 'Chat', tone: 'lilac', description: '切换会话，体验流式回复和资料库。' },
  { id: 'crm', name: '客户工作台', kind: 'CRM', tone: 'stone', description: '筛选客户、推进商机并了解账户健康。' },
  { id: 'finances', name: '财务概览', kind: 'Finances', tone: 'sage', description: '查看资产组合、月度交易和支出分布。' },
  { id: 'wallet', name: '模拟钱包', kind: 'Native', tone: 'blue', description: '查看组合行情、资产详情并模拟交易。', native: true },
  { id: 'fitness', name: '健身工作台', kind: 'Native', tone: 'lilac', description: '查看活动环、记录训练组数并浏览历史。', native: true },
  ...standardTemplates,
]

export const agentCount = catalog.agentUI.length
export const features = [
  { path: '/themes/', icon: 'palette', tone: 'sage', title: '主题实验室', description: '调整语义色和圆角，实时预览并复制 CSS Token。' },
  { path: '/templates/', icon: 'layout', tone: 'blue', title: '应用模板', description: '按场景查找可运行的页面示例，体验仪表盘、表格、表单和对话。' },
  { path: '/agent/', icon: 'spark', tone: 'lilac', title: 'Agent UI', description: '用结构化文档渲染图表、表单和交互操作。' },
]

export const guides = [
  { path: webInstallPath, title: 'Vue 快速开始', summary: '安装组件包、引入样式并在 Vue 3 或 Nuxt 中使用。', file: 'vue' },
  { path: nativeInstallPath, title: 'Native 快速开始', summary: '为 NativeScript-Vue 应用添加 Syntrofic UI。', file: 'native' },
  { path: '/docs/standard-design/', title: '标准设计', summary: '白色底色、组件与动效规范，以及 Astryx 对标清单。', file: 'standard-design' },
  { path: '/docs/design-rules/', title: '设计规范', summary: '供项目和 AI 直接引用的颜色、圆角、排版和动效规则。', file: 'design-rules' },
  { path: '/docs/theming/', title: '主题与样式', summary: '语义 Token、明暗模式、局部主题和样式包。', file: 'theming' },
  { path: '/docs/tools/', title: 'CLI 与 MCP', summary: '初始化、搜索组件、导出参考资料和连接 MCP。', file: 'tools' },
  { path: '/docs/releases/', title: '更新记录', summary: '查看 Syntrofic UI 的开发预览版本。', file: 'releases' },
]

export const guideContent = new Map(guides.map(guide => [guide.path, read('guides/' + guide.file + '.md')]))
