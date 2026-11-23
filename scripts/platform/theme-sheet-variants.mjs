import { h } from 'vue'
import { distinctThemeParts, themePartCases, themePartSpecimen } from './theme-part-probes.mjs'
import { editorGroups } from './theme-editor.mjs'

const wideParts = new Set(['pagination', 'pagination-item', 'pagination-list', 'file-input', 'drop-zone', 'dialog', 'dialog-header',
  'lightbox', 'lightbox-caption-panel', 'dialog-header-close-icon', 'dialog-header-title-block', 'toast', 'toast-close', 'banner', ...editorGroups.menus])
const anchoredLayers = new Set(['dialog', 'popover', 'tooltip', 'toast', ...editorGroups.menus])
const states = {
  rest: '默认', hover: '悬停', active: '按下', 'focus-visible': '键盘焦点', disabled: '禁用',
  loading: '加载中', invalid: '错误', selected: '选中', mixed: '混合', open: '展开',
  dragging: '拖入', highlighted: '高亮', striped: '条纹', sorted: '已排序', indeterminate: '进度未定',
  today: '今天', 'in-range': '范围内', 'range-start': '起始日期', 'range-end': '结束日期',
  unavailable: '不可选', 'outside-view': '非本月',
  checked: '已选', unchecked: '未选',
  expanded: '展开', collapsed: '收起',
  pressed: '已按下', unpressed: '未按下', grouped: '组内',
}
const placements = {
  unchecked: '未选', checked: '已选', mixed: '部分选中', value: '有选项', description: '有说明', placeholder: '占位',
  popup: '浮层列表', choices: '行内列表', standalone: '独立导航', 'app-shell-header': '应用页头',
  'layout-header': '布局页头', 'layout-header-scrollable': '滚动页头', 'layout-region': '布局区域',
  none: '无分隔线', rows: '行分隔线',
  month: '月历', period: '周／日历',
  plain: '分隔线', labelled: '带标签',
  'dragging-on': '拖向开启', 'dragging-off': '拖向关闭',
}
const copy = { label: '交付资料', description: '团队可见', workspace: '项目工作区', invalidField: '检查输入值',
  invalidFile: '文件格式有误', openOptions: '查看选项', close: '关闭' }

function variantRows(ui, part, target) {
  const rows = new Map()
  for (const sample of themePartCases(ui, part)) {
    const { when, placement } = sample
    const values = Object.values(when)
    const key = JSON.stringify([values, placement])
    if (!rows.has(key)) rows.set(key, { when, placement, values, cases: [] })
    rows.get(key).cases.push(sample)
  }
  let index = 0
  return [...rows.values()].map(({ when, placement, values, cases }) => h('section', {
    class: 'theme-variant-row', 'data-theme-variant-row': '', 'data-theme-variant-when': JSON.stringify(when),
    'data-theme-variant-placement': placement,
  }, [
    values.length || placement ? h('h4', [
      ...(placement ? [placements[placement] ?? placement] : []), ...(placement && values.length ? [' · '] : []),
      values.length ? h('code', values.join(' · ')) : null,
    ]) : null,
    h('div', { class: 'theme-variant-cases' }, cases.map(sample => {
      const collapsed = anchoredLayers.has(part) && sample.state === 'rest'
      const label = collapsed ? '收起' : sample.state.split('+').map(name => states[name] ?? name).join(' · ')
      return h('figure', { class: 'theme-variant-case', 'data-theme-variant-state': sample.state }, [
        h('figcaption', label),
        h('div', { class: 'theme-variant-specimen', inert: true, 'data-theme-variant-selector': target.selector },
          collapsed ? [] : [themePartSpecimen(ui, sample, index++, copy)]),
      ])
    })),
  ]))
}

export function themeVariantPanels(ui, section, open) {
  const targets = distinctThemeParts(ui).filter(([, target]) => target.family === section)
  if (!targets.length) return null
  return h('section', { class: 'theme-examples theme-variants', 'aria-label': '变体与状态' }, [
    h('h3', '变体与状态'),
    ...targets.map(([part, target]) => h('div', { class: 'theme-variant-frame' }, h('details', {
      class: 'theme-example theme-variant-panel', 'data-theme-variant-panel': part, 'data-wide': wideParts.has(part) || undefined, open,
    }, [
      h('summary', h('code', part)),
      h('div', { class: 'theme-variant-body', 'data-site-disclosure-panel': '' }, variantRows(ui, part, target)),
    ]))),
  ])
}
