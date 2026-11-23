import parity from '../catalog/parity.json'
import type { AgentDocument, AgentEntry, AgentNode, AgentNodeKind } from '../src/agent-ui/schema'
import { reviewAgentNode } from './agent-review'

const labels = [
  '柱形与环形', '趋势图组合', '关键指标', '日历', '登录', '信息卡片', '命令菜单', '应用布局', '导航页眉', '滚动横幅',
  '应用侧栏', '数据表格', '反馈提示', '业务表单', '导航栏', '流程步骤',
  '提示容器', '对话工作台', '助手能力', '提示词输入', '消息列表',
  '常见问题', '产品定价', '页脚', '首页主区', '方案对比', '团队介绍', '信息横幅', '隐私设置',
  '商品筛选', '商品列表', '订单结算', '商品详情', '商品评论',
]
const metrics = [['总文件数', 126], ['待处理', 18], ['已归档', 92]] as const
const products: AgentEntry[] = [
  { id: 'ledger', label: '工作记录本', value: 49, detail: '日常文档', values: { 单价: 49, 规格: 'A5', 分类: '文具' } },
  { id: 'marker', label: '颜色样卡', value: 32, detail: '雾蓝和苔绿', values: { 单价: 32, 规格: '24 色', 分类: '样品' } },
  { id: 'folder', label: '档案文件夹', value: 24, detail: '淡棕 · 6 入', values: { 单价: 24, 规格: 'A4', 分类: '文具' } },
]
const plans: AgentEntry[] = [
  { id: 'studio', label: '工作室', value: 0, values: { 月费: 0, 席位: 1, 容量: '2 GB' } },
  { id: 'team', label: '团队', value: 49, values: { 月费: 49, 席位: 5, 容量: '20 GB' } },
  { id: 'org', label: '机构', value: 129, values: { 月费: 129, 席位: 20, 容量: '120 GB' } },
]
const simple = (...items: readonly (readonly [string, string | number])[]) => items.map(([label, value], index) => ({ id: String(index), label, value }))
const action = (id: string, label: string) => ({ id, label })
const person = (id: string, title: string, text: string): AgentNode => ({ id, kind: 'record-card', title, text })
function chart(kind: AgentNodeKind, id = kind): AgentNode { return { ...reviewAgentNode(kind), id } }
function cards(entries: readonly AgentEntry[], kind: 'product-card' | 'card' = 'card'): AgentNode[] {
  return entries.map(entry => ({ id: entry.id, kind, title: entry.label, text: entry.detail, values: [{ id: 'price', label: '金额', value: entry.value }],
    actions: [action('choose', '选择')] }))
}
function block(slug: string, title: string): AgentNode[] {
  const make = (kind: AgentNodeKind, options: Omit<Partial<AgentNode>, 'id' | 'kind'> = {}): AgentNode[] => [{ id: slug, kind, title, ...options }]
  switch (slug) {
    case 'bars-and-circles': return make('grid', { children: [chart('bar-chart'), chart('donut-chart')] })
    case 'graphs': return make('grid', { children: [chart('line-chart'), chart('area-chart')] })
    case 'kpi-stats': return make('kpi-grid', { values: simple(...metrics).map(row => ({ ...row, series: [10, 24, 18, 36, Number(row.value)] })) })
    case 'cards': return make('grid', { children: cards(products) })
    case 'layouts': return make('dashboard', { children: [chart('metric-grid'), chart('data-table'), chart('line-chart')] })
    case 'navigation-headers': return make('tabs', { children: [person('overview', '概览', '查看交付概况。'), person('details', '活动', '最近更新了样张。')] })
    case 'sidebars': return make('row', { children: [
      { id: 'side',kind: 'action-group', actions: [action('recent','最近使用'),action('archive','历史归档')] },
      person('summary','项目摘要','查看最近的资源和批次。'),
    ] })
    case 'tables': return make('data-table', { values: products })
    case 'feedbacks': return make('column', { children: [
      { id: 'done',kind: 'callout',title:'已归档',text:'可在历史记录恢复。' },
      { id: 'warning',kind: 'callout',title:'等待确认',text:'校对后即可提交。' },
      { id: 'progress',kind: 'progress',title:'本周处理进度',value:64 },
    ] })
    case 'forms': return [{ ...reviewAgentNode('form'),id:slug,title }]
    case 'navbars': return make('tabs', { children: [person('files','资料','当前目录共有 24 份材料。'),person('team','成员','当前协作成员共 6 位。')] })
    case 'steppers': return make('steps', { values: simple(['接收文件','已完成'],['核对版本','进行中'],['提交归档','待开始']) })
    case 'prompt-containers': case 'playgrounds': return make('generated-composition', { children: [person('thread','本周交付','核对初稿、终稿和使用许可。'),chart('comparison-list')] })
    case 'features': return make('grid', { children: [person('organize','整理材料','按批次归并文件。'),person('find','核对资源','定位缺失的授权资料。')] })
    case 'messages': return make('column', { children: [person('user','项目成员','这一批还有缺项吗？'),person('assistant','工作台助手','授权说明待补，图稿与文本已齐。')] })
    case 'faqs': return make('accordion', { values: simple(['怎样恢复项目？','打开归档，在操作栏选择恢复。'],['支持哪些文件？','项目可保存设计稿和文档。'],['怎样邀请成员？','进入项目的成员页。']) })
    case 'pricing': return make('grid', { children: cards(plans.map(plan => ({ ...plan, detail: String(plan.values?.容量) }))) })
    case 'pricing-comparison': return make('data-table', { values: plans })
    case 'footers': return make('row', { children: [person('about','关于 Syntrofic','面向产品团队的界面工具。'),
      { id:'legal',kind:'action-group',actions:[action('terms','服务条款'),action('privacy','隐私政策')] }] })
    case 'hero-sections': return make('card', { title:'从资料到交付',text:'统一检查版本、授权和交付进度。',actions:[action('start','查看工作台'),action('learn','了解流程')] })
    case 'teams': return make('grid', { children: [person('lin','林舟','设计与规范'),person('xu','许然','产品与运营'),person('zhou','周昱','工程与交付')] })
    case 'banners': return make('callout', { title:'交付时间调整',text:'本周文件统一于周五下午归档。' })
    case 'cookie-consents': return make('card', { title:'隐私设置',text:'设置是否允许可选的使用情况统计。',actions:[action('necessary','仅保留必要项'),action('all','允许统计')] })
    case 'product-list': return make('grid', { children: cards(products,'product-card') })
    case 'product-view': return [cards(products.slice(0,1),'product-card')[0]]
    case 'reviews': return make('grid', { children: [
      { id:'rating',kind:'rating',title:'工作记录本',value:4.5,max:5 },
      { id:'buyer-reviews',kind:'list',title:'买家反馈',values:simple(['使用两周','纸张适合日常记录'],['资料整理','封面耐磨，尺寸合适']) },
    ] })
    default: return []
  }
}
export const legacyReviews = parity.legacyBlocks.map(({ id, name }, index) => {
  const slug = id.split('.').at(-1)!
  const label = labels[index]
  return { id, slug, name, label, number: String(306 + index), document: { version: 1, nodes: block(slug, label) } satisfies AgentDocument }
})
