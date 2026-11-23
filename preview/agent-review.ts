import parity from '../catalog/parity.json'
import asset from './assets/delivery-area.png'
import type { AgentDocument, AgentEntry, AgentNode, AgentNodeKind } from '../src/agent-ui/schema'

const projects: AgentEntry[] = [
  { id: 'brand', label: '品牌规范', value: 42, detail: '已完成复核', series: [13, 18, 14, 21, 37, 42], values: { 文件: 42, 版本: 3 } },
  { id: 'layout', label: '版式样张', value: 26, detail: '等待校对', series: [8, 11, 13, 20, 18, 26], values: { 文件: 26, 版本: 2 } },
  { id: 'license', label: '授权说明', value: 16, detail: '资料齐全', series: [2, 6, 8, 7, 15, 16], values: { 文件: 16, 版本: 1 } },
]
const weekly: AgentEntry[] = [
  { id: 'mon', label: '周一', values: { 接收: 24, 归档: 17 } },
  { id: 'tue', label: '周二', values: { 接收: 32, 归档: 20 } },
  { id: 'wed', label: '周三', values: { 接收: 28, 归档: 26 } },
  { id: 'thu', label: '周四', values: { 接收: 42, 归档: 28 } },
  { id: 'fri', label: '周五', values: { 接收: 47, 归档: 36 } },
]
const title: Record<AgentNodeKind, string> = {
  dashboard: '交付概览', 'kpi-grid': '文件走势', 'metric-grid': '项目指标', 'line-chart': '每周处理走势', 'area-chart': '每周文件量',
  'bar-chart': '每日处理对比', 'composed-chart': '接收及归档', 'candlestick-chart': '样本价格区间', 'pie-chart': '交付文件分布',
  'donut-chart': '内容材料构成', 'funnel-chart': '提交转化', 'radar-chart': '设计复核维度', 'radial-chart': '分组进度',
  'gauge-chart': '归档完成度', 'sunburst-chart': '文件目录分布', 'sankey-chart': '材料流向', 'scatter-chart': '文件与处理时长',
  heatmap: '每日活跃度', 'data-table': '交付文件清单', 'comparison-list': '项目文件量', 'meter-list': '容量使用情况',
  card: '第十一批交付', text: '交付说明', callout: '复核说明', image: '配送服务范围', 'tag-list': '交付分类', list: '材料列表',
  'list-block': '文件清单与状态', accordion: '交付须知', steps: '交付步骤', 'code-block': '导入示例', diagram: '资料归档流程',
  tabs: '项目视图', 'generated-composition': '单周交付视图', 'product-card': '编辑部工作手册', 'record-card': '批次记录',
  'item-card': '品牌规范', 'item-card-group': '资料合集', 'product-signals': '使用信号', 'composition-api': '材料摘要组合',
  map: '材料接收点', row: '同排摘要', column: '纵向摘要', grid: '卡片网格', spacer: '区块间距', divider: '资料分隔',
  heading: '材料总览', badge: '待复核', icon: '对勾', rating: '材料评分', progress: '文件归档进度', form: '添加交付记录',
  'switch-group': '提醒设置', 'toggle-group': '可用视图', 'action-group': '处理选项', 'follow-up': '后续操作', button: '核对交付',
}
const actions = [{ id: 'review', label: '查看复核记录' }, { id: 'export', label: '导出摘要', intent: 'secondary' as const }]
const children: AgentNode[] = [
  { id: 'first', kind: 'card', title: '复核批次', text: '核对版式与授权材料。', values: projects.slice(0, 1) },
  { id: 'second', kind: 'card', title: '交付说明', text: '本周材料周五统一归档。', values: projects.slice(1, 2) },
]
export function reviewAgentNode(kind: AgentNodeKind): AgentNode {
  const base = { id: kind, kind, title: title[kind] }
  switch (kind) {
    case 'line-chart': case 'area-chart': case 'bar-chart': case 'composed-chart': case 'radar-chart':
      return { ...base, values: weekly }
    case 'candlestick-chart':
      return { ...base, values: weekly.map((entry, index) => ({ ...entry, values: { open: 22 + index * 3, close: 25 + index * 2 + (index % 2 ? -4 : 3), low: 18 + index * 2, high: 34 + index * 3 } })) }
    case 'funnel-chart':
      return { ...base, values: [{ id: 'all', label: '收到', value: 92 }, { id: 'checked', label: '复核', value: 68 }, { id: 'done', label: '归档', value: 47 }] }
    case 'heatmap':
      return { ...base, values: ['白天', '晚间', '清晨'].flatMap((row, y) => weekly.map(({ label }, x) => ({ id: `${x}-${y}`, label, value: (x * 19 + y * 9) % 40, values: { row, column: label } }))) }
    case 'sunburst-chart':
      return { ...base, values: projects.map(entry => ({ ...entry, children: [{ id: 'final', label: '终稿', value: 3 }, { id: 'notes', label: '批注', value: 2 }] })) }
    case 'sankey-chart':
      return { ...base, values: [{ id: 'a', label: '设计部归档', value: 26, values: { source: '设计部', target: '归档' } },
        { id: 'b', label: '设计部复核', value: 12, values: { source: '设计部', target: '复核' } },
        { id: 'c', label: '产品部复核', value: 20, values: { source: '产品部', target: '复核' } }] }
    case 'scatter-chart':
      return { ...base, values: weekly.map((entry, index) => ({ ...entry, values: { x: 8 + index * 3, y: 4 + (index * 7) % 10, size: 12 + index, group: index % 2 ? '复核' : '接收' } })) }
    case 'map':
      return { ...base, values: [{ id: 'west', label: '接收处', values: { longitude: 121.47, latitude: 31.23 } }, { id: 'east', label: '归档处', values: { longitude: 121.49, latitude: 31.24 } }] }
    case 'image': return { ...base, src: asset, label: '配送区域示意图' }
    case 'dashboard': return { ...base, children: [{ id: 'dashboard-kpi', kind: 'kpi-grid', values: projects, title: '材料分组' }, { id: 'dashboard-line', kind: 'line-chart', values: weekly, title: '每日处理量' }] }
    case 'generated-composition': case 'composition-api': case 'tabs': case 'row': case 'column': case 'grid': case 'item-card-group':
      return { ...base, children }
    case 'form': return { ...base, fields: [{ id: 'name', label: '文件名', type: 'text', required: true },
      { id: 'category', label: '分类', type: 'select', options: ['设计', '文档', '授权'] },
      { id: 'count', label: '份数', type: 'number' }], actions: [{ id: 'save', label: '保存记录' }] }
    case 'switch-group': case 'toggle-group': return { ...base, fields: [{ id: 'status', label: '状态', type: 'checkbox' }, { id: 'changes', label: '变更提醒', type: 'checkbox' }] }
    case 'text': case 'callout': return { ...base, text: '终稿、批注及字体授权需要一起归档。' }
    case 'code-block': return { ...base, text: "import { SAgentUI } from '@syntrofic/ui'\n\nconst document = { version: 1, nodes: [] }" }
    case 'icon': return { ...base, label: '核对通过', text: '✓' }
    case 'button': return { ...base, actions: [{ id: 'review', label: title.button }] }
    case 'action-group': case 'follow-up': return { ...base, actions }
    case 'rating': return { ...base, value: 3.5, max: 5 }
    case 'gauge-chart': case 'progress': return { ...base, value: 72, max: 100 }
    case 'spacer': return { ...base, value: 26 }
    case 'heading': case 'badge': case 'divider': return base
    case 'product-card': case 'record-card': case 'item-card': case 'card': return { ...base, text: '第十一批 · 本周提交', values: projects.slice(0, 1), actions: actions.slice(0, 1) }
    default: return { ...base, values: projects }
  }
}
export const agentReviews = parity.agentUI.map(({ id, name }, index) => {
  const kind = id.slice('agent-ui.'.length) as AgentNodeKind
  const example = reviewAgentNode(kind)
  const nodes = kind === 'spacer' || kind === 'divider'
    ? [{ id: 'above', kind: 'text', text: '交付材料' } as const, example, { id: 'below', kind: 'text', text: '授权记录' } as const]
    : [example]
  return { id, name, label: title[kind], number: String(index + 249), document: { version: 1, nodes } satisfies AgentDocument }
})
