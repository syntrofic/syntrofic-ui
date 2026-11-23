import { borderWidthToken, editorDials, editorMotionSettings, themeAspects, themeConditions, themeEditorChange, themeEditorCommand, themeEditorEntry, themeEditorGroups, themeEditorGroupScopes, themeEditorModes, themeEditorTokenNames, themeEditorUndo, themeInputTargets, themePartCapabilities, themePartSupportsMedia, themePropertyParts, themeTokenDetails, validateThemeEditorMode } from './theme-editor.mjs'
import { themeFontStack } from './theme-fonts.mjs'

const chinese = {
  '代码块复制按钮': 'code block copy button', '代码块': 'code block', '复制按钮': 'copy button', '横幅': 'banner',
  '展示标题': 'display headings', '一级展示标题': 'display-1 heading', '二级展示标题': 'display-2 heading', '三级展示标题': 'display-3 heading',
  '恢复显示': 'restore', '取消隐藏': 'restore', '不要隐藏': "don't hide", '不要显示': 'hide',
  '输入框前缀': 'input group prefix', '输入框占位文字': 'input placeholder', '复选框': 'checkbox', '输入框': 'input',
  '复选框勾选标记': 'checked checkbox indicator', '部分选中复选框': 'indeterminate checkbox',
  '单选框圆点': 'radio dot', '开关滑块': 'switch thumb', '关闭状态': 'unchecked', '开启状态': 'selected',
  '切换按钮组': 'toggle button group', '切换按钮': 'toggle button', '组内': 'grouped',
  '已按下': 'pressed', '未按下': 'unpressed', '已选中': 'checked', '已禁用': 'disabled',
  '下拉框箭头': 'select arrow', '下拉框指示图标': 'select indicator icon', '展开时': 'when expanded', '收起时': 'when collapsed',
  '按钮图标': 'button icons', '图标': 'icon', '对话框标题': 'dialog title', '对话框页头标题': 'dialog header title',
  '对话框关闭图标': 'dialog close icon', '对话框关闭按钮': 'dialog close button', '通知关闭按钮': 'toast close button',
  '通知关闭图标': 'toast close icon', '通知': 'toast',
  '次要按钮': 'secondary button', '主要按钮': 'primary button', '幽灵按钮': 'ghost button', '危险按钮': 'danger button', '按钮': 'button', '描边': 'outline',
  '卡片': 'card', '对话框': 'dialog', '下拉框': 'select', '导航栏': 'top nav', '页头': 'app shell header', '标题': 'heading',
  '表头': 'table headers', '表格单元格': 'table cells', '表格分隔线': 'table row dividers', '大写': 'uppercase', '小写': 'lowercase',
  '选项卡': 'tabs', '标签页': 'tabs', '下划线': 'underline', '指示条': 'tab indicator', '纵向': 'vertical', '横向': 'horizontal',
  '下拉菜单': 'dropdown menu', '右键菜单': 'context menu', '菜单项': 'menu item', '菜单': 'menus',
  '分隔线': 'separator', '变细': 'thinner', '淡一点': 'less visible', '警告色': 'warning color',
  '成功色': 'success color', '错误色': 'danger color', '信息色': 'info color', '加深': 'darker', '调浅': 'lighter',
  '焦点轮廓': 'focus ring', '焦点环': 'focus ring', '错误状态': 'error',
  '进度条轨道': 'progress bar track', '进度条填充': 'progress bar fill', '进度条加载条': 'progress bar sweep', '进度条': 'progress bar',
  '不确定进度': 'indeterminate', '厚度': 'thickness',
  '日期范围选择器': 'date range picker', '日期选择器': 'date picker', '日历日期': 'calendar day', '日历': 'calendar',
  '范围内日期': 'in-range days', '选中日期': 'selected day', '今天': 'today date',
  '页面底色': 'canvas color', '背景颜色': 'background color', '背景色': 'background color', '底色': 'background color',
  '看起来像': 'look like', '外观和': 'look like', '默认按钮': 'default button', '一样': '',
  '官网': 'site', '页面': 'page', '默认': 'default',
  '文字颜色': 'text color', '边框颜色': 'border color', '边框宽度': 'border width', '边框厚度': 'border width', '内边距': 'padding', '圆角': 'radius',
  '字体大小': 'font size', '字号': 'font size', '字重': 'font weight', '字体': 'font family', '正文': 'body text', '代码': 'code',
  '阴影': 'shadow', '边框': 'border', '加深': 'darker', '减淡': 'lighter', '对话框': 'dialog',
  '内凹描边': 'sunken bevel', '不透明度': 'opacity', '透明度': 'transparency',
  '占位文字': 'placeholder', '前缀': 'prefix', '高度': 'height', '宽度': 'width', '文字': 'text',
  '及': 'and', '以及': 'and', '并且': 'and', '并': 'and', '和': 'and', '然后': 'then', '设为': 'set to', '改为': 'set to', '改成': 'set to',
  '是什么': 'what is', '是多少': 'what is', '查看': 'what is', '悬停时': 'on hover', '禁用时': 'when disabled',
  '深色模式': 'dark mode', '浅色模式': 'light mode', '深色': 'dark mode', '浅色': 'light mode',
  '隐藏': 'hide', '移除': 'remove', '去掉': 'remove', '取消': 'remove', '增加': 'increase', '减少': 'decrease',
  '整体': 'everything', '全局': 'everything', '更大': 'larger', '除了': 'except', '以外': '',
  '不要用': 'never use', '作为': 'for', '不要改动': 'never change', '输入控件': 'inputs',
  '动效速度': 'motion speed', '动效节奏': 'motion tempo', '动效风格': 'motion character',
  '减少动效': 'reduced motion', '始终': 'always', '跟随系统': 'system', '动效': 'motion', '动画': 'animations', '更快': 'faster', '更慢': 'slower',
  '更紧凑': 'more compact', '更圆': 'rounder', '更亮': 'lighter', '更深': 'darker', '更粗': 'thicker', '更细': 'thinner', '加粗': 'bold',
  '纯白': 'white', '白色': 'white', '纯黑': 'black', '黑色': 'black', '透明': 'transparent', '强调色': 'accent', '饱和度': 'vibrancy',
}
const translations = new RegExp(Object.keys(chinese).sort((a, b) => b.length - a.length).join('|'), 'g')
const properties = {
  'placeholder text color': '--sy-field-placeholder-color', 'placeholder color': '--sy-field-placeholder-color', placeholder: '--sy-field-placeholder-color',
  'prefix text color': '--sy-input-group-prefix-color', 'prefix color': '--sy-input-group-prefix-color', prefix: '--sy-input-group-prefix-color',
  'background color': 'background-color', background: 'background-color', fill: 'background-color',
  'text color': 'color', 'foreground color': 'color', foreground: 'color', text: 'color', color: 'color',
  'border color': 'border-color', 'outline color': 'border-color', 'border width': 'border-width', 'border thickness': 'border-width',
  'border-width': 'border-width', border: 'border', borders: 'border',
  'border radius': 'border-radius', 'corner radius': 'border-radius', radius: 'border-radius', corners: 'border-radius',
  rounded: 'border-radius', round: 'border-radius', rounder: 'border-radius', square: 'border-radius', squarer: 'border-radius',
  'box shadow': 'box-shadow', shadow: 'box-shadow', 'shadows': 'box-shadow', 'font size': 'font-size', 'text size': 'font-size',
  'sunken bevel': 'box-shadow',
  'font weight': 'font-weight', bold: 'font-weight', bolder: 'font-weight', 'font family': 'font-family', 'typeface': 'font-family',
  'letter spacing': 'letter-spacing', 'line height': 'line-height', 'line spacing': 'line-height',
  'text transform': 'text-transform', uppercase: 'text-transform', lowercase: 'text-transform', capitalize: 'text-transform',
  'horizontal padding': 'padding-inline', 'vertical padding': 'padding-block', 'padding inline': 'padding-inline', 'padding block': 'padding-block',
  'padding top': 'padding-top', 'padding bottom': 'padding-bottom', 'padding left': 'padding-left', 'padding right': 'padding-right',
  padding: 'padding', 'minimum height': 'min-height', 'min height': 'min-height', height: 'height', width: 'width',
  'gap': 'gap', 'vibrancy': 'vibrancy', 'spacing': 'spacing', 'density': 'spacing',
}
const targetNames = {
  'app header': 'app-shell-header', 'app shell header': 'app-shell-header', 'application header': 'app-shell-header',
  'header': 'top-nav', 'navigation': 'top-nav', 'navbar': 'top-nav', 'top navigation': 'top-nav', 'nav link': 'top-nav-item',
  'input field': 'input', 'input fields': 'inputs', 'inputs': 'inputs', 'text field': 'input', 'text fields': 'inputs', 'text input': 'input',
  'text area': 'textarea', 'input group': 'input-group', 'dropdown': 'select', 'combo box': 'combobox', 'check box': 'checkbox',
  'modal': 'dialog', 'panel': 'card', 'control': 'controls', 'checkboxes': 'checkbox', 'switches': 'switch', 'menu items': 'menu-item',
  'buttons': 'button', 'cards': 'card',
  'toggle button': 'toggle-button', 'toggle buttons': 'toggle-button',
  'toggle button group': 'toggle-button-group', 'toggle button groups': 'toggle-button-group', 'toggle group': 'toggle-button-group',
  'destructive button': 'button-danger', 'destructive buttons': 'button-danger',
  'table headers': 'table-header-cell', 'table header': 'table-header-cell',
  'table borders': 'table-row', 'table row dividers': 'table-row', 'table dividers': 'table-row',
  'tabs': 'tab', 'tab underline': 'tab-indicator', 'tab underlines': 'tab-indicator', 'tab selection indicator': 'tab-indicator',
  'progress bar': 'progress-bar-track', 'progress bars': 'progress-bar-track', 'progress track': 'progress-bar-track',
  'progress fill': 'progress-bar-fill', 'progress indicator': 'progress-bar-fill', 'progress bar indicator': 'progress-bar-fill',
  'progress sweep': 'progress-bar-sweep',
  separator: 'divider', separators: 'divider',
  menu: 'menus',
}
const colors = { white: '#ffffff', black: '#000000', gray: '#808080', grey: '#808080', red: '#ff0000', green: '#008000',
  blue: '#0000ff', orange: '#ffa500', yellow: '#ffff00', purple: '#800080', transparent: 'transparent' }
const weights = { light: '300', regular: '400', normal: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' }
const modePattern = /\b(light|dark)\s+(?:mode|theme|appearance)\b/g
const lookupPattern = /\b(?:what|which|how (?:round|wide|tall|thick|large|much)|show me|tell me|look up|inspect|current value)\b/
const editPattern = /\b(?:set|make|change|remove|hide|turn off|increase|decrease|adjust|no|without|never|should|put|give|rounder|thicker|thinner|lighter|darker|bold|bolder|compact|colorful|saturated|steps?|faster|slower|uppercase|lowercase|capitalize|underlines?)\b/
const hidePiece = /\b(?:hide|remove|no|without|turn off)\b/
const restorePiece = /\b(?:un[- ]?hide|restore|show|stop (?:hiding|removing)|(?:never|do not|don't|avoid)\s+(?:hide|hiding|remove|removing)|(?:isn't|aren't|not)\s+(?:hidden|removed))\b/
const avoidShowingPiece = /\b(?:never|do not|don't)\s+show\b/
const complexConstraint = /\b(?:except|excluding|keep .+ as (?:it is|they are)|avoid|never|do not|don't|should not|shouldn't|everything but)\b/
const exceptionPattern = /\s+(?:except(?: for| on)?|excluding)\s+(.+)$/
const negativeCommand = "(?:never|do not|don't|avoid)"
const preservePattern = new RegExp(`^${negativeCommand} (round|change|touch|make) (.+?)\\s*[.!?]?$`)
const avoidInkPattern = new RegExp(`^${negativeCommand} (?:use |using )?(?:pure )?(black|white|#[a-f0-9]{6}|#[a-f0-9]{3}) (?:for|as|on) (?:the )?(?:(main|body|muted|secondary) )?text(?: color)?$`)
const resemblance = /\b(?:looks?\s+like|same\s+(?:look|appearance)\s+as|match\s+the\s+(?:look|appearance)\s+of)\s+/
const more = /\b(?:more|rounder|bolder|larger|bigger|taller|wider|increase|thicker|lighter)\b/
const less = /\b(?:less|squarer|smaller|shorter|narrower|decrease|thinner|darker|compact)\b/
const strongerShadow = /\b(?:darker|stronger|heavier|increase)\b/
const softerShadow = /\b(?:lighter|softer|weaker|decrease|too (?:dark|strong|heavy))\b/
const sunkenBevel = /\bsunken bevel\b/
const percent = '(\\d+(?:\\.\\d+)?)\\s*%'
const shadowAlpha = new RegExp(`\\b(?:alpha|opacity|transparency)\\s*(?:of |(?:set )?to |=\\s*)?${percent}|${percent}\\s*(?:alpha|opacity|transparent|transparency)\\b`)
const bevelShadow = 'inset 1px 1px 0 var(--sy-border-strong), inset -1px -1px 0 var(--sy-surface)'

function shadowEdit(text, scoped) {
  const absolute = shadowAlpha.exec(text)
  if (absolute) {
    const amount = Number(absolute[1] ?? absolute[2])
    if (amount > 100) throw new Error('Use a shadow alpha between 0% and 100%.')
    const alpha = /\b(?:transparent|transparency)\b/.test(absolute[0]) ? 100 - amount : amount
    return { kind: 'shadow', property: 'shadow-alpha', value: Number(alpha.toFixed(3)) + '%' }
  }
  if (scoped && sunkenBevel.test(text)) return { kind: 'set', property: 'box-shadow', value: bevelShadow }
  if (/\b(?:remove|without|turn off|no)\b/.test(text)) {
    return scoped ? undefined : { kind: 'shadow', property: 'shadow-strength', value: 'none' }
  }
  const direction = softerShadow.test(text) ? -1 : strongerShadow.test(text) ? 1 : undefined
  if (!direction) return
  const amount = Number(/\b(\d+(?:\.\d+)?)\s*%/.exec(text)?.[1] ?? 25)
  return { kind: 'shadow', property: 'shadow-strength', value: Number(Math.max(0, 100 + direction * amount).toFixed(3)) + '%' }
}
const cssColor = /^(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color(?:-mix)?|light-dark|(?:repeating-)?(?:linear|radial|conic)-gradient)\(/i
const inputFocusPhrase = /\bfocus rings?\b/
const dividerWord = /\b(?:dividers?|separators?)\b/
const faintDivider = /\b(?:less visible|fainter|more subtle)\b/
const calendarPicker = /\bdate(?: range)? pickers?\b/
const calendarDayWords = /\b(?:days?|dates?|in-range|range interior)\b/
const buttonOutline = /\b(?:outline|outlined)(?: only)?[.!?]*$/
const lengthPattern = /(?<![\w#.-])-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|dvh|vh|vw|ch|%)(?![\w-])/g
const cornerLength = '(?:0|(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:px|rem|em|dvh|vh|vw|ch|%))(?![\\w.-])'
const cornerRadii = new RegExp(`(?<![\\w#.-])${cornerLength}(?: +${cornerLength})*(?: *\\/ *${cornerLength}(?: +${cornerLength})*)?`)
const fontWeightPattern = /\b([1-9]00)\b/
const displayHeading = /\bdisplay(?:[- ]([123]))? (heading|headings)\b/
const fontLength = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)$/
const fontRoleName = 'headings?|body(?: text)?|code(?: blocks?)?'
const roleFirstFont = new RegExp(`^(?:(?:set|make|change) )?(?:the )?(${fontRoleName})( +font(?: family)?)?\\s+(?:(?:set )?(to|in|as) )?(.+)$`, 'u')
const familyFirstFont = new RegExp(`^(?:(use) )?(.+?) (?:for )?(?:the )?(${fontRoleName})$`, 'u')
const fontRoleMention = new RegExp(`\\b(${fontRoleName})\\b`)
const show = 'syntrofic theme editor how'

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function includesPhrase(text, phrase) {
  return new RegExp(`(?<![\\w-])${escapeRegex(phrase)}(?![\\w-])`).test(text)
}

function phraseMatcher(aliases) {
  const names = Object.keys(aliases).sort((a, b) => b.length - a.length).map(escapeRegex)
  return new RegExp(`(?<![\\w-])(${names.join('|')})(?![\\w-])`, 'g')
}

function language(library) {
  const aliases = { ...targetNames }
  for (const level of [1, 2, 3, 4, 5, 6]) aliases['h' + level] = 'heading'
  const groups = themeEditorGroups(library)
  for (const target of [...Object.keys(library.brandRuleTargets), ...Object.keys(groups)]) {
    const spaced = target.replaceAll('-', ' ')
    aliases[target] ??= target
    aliases[spaced] ??= target
    aliases[spaced + (spaced.endsWith('s') ? 'es' : 's')] ??= target
  }
  return { aliases, groups, targets: phraseMatcher(aliases), settings: phraseMatcher(properties), font: text => fontRequest(library, text),
    isOptionalPiece: target => library.brandRuleTargets[target]?.properties.display === 'hide' }
}

function clean(input) {
  return input.normalize('NFKC').toLowerCase().replace(/’/g, "'").replace(translations, term => ` ${chinese[term]} `)
    .replace(/。/g, ';').replace(/[？]/g, '?').replace(/[^\S\n]+/g, ' ').trim()
}

function cssAtoms(input) {
  const found = []
  let rest = input
  const next = /(?:[a-z-]+)\(/g
  while (true) {
    const match = next.exec(rest)
    if (!match) break
    if (!cssColor.test(match[0])) continue
    let index = next.lastIndex, depth = 1
    while (index < rest.length && depth) {
      const char = rest[index++]
      if (char === '(') depth++
      if (char === ')') depth--
    }
    const marker = `@value${found.length}@`
    found.push(rest.slice(match.index, index))
    rest = rest.slice(0, match.index) + marker + rest.slice(index)
    next.lastIndex = match.index + marker.length
  }
  rest = rest.replace(/@value\d+@(?:\s*,\s*@value\d+@)+/g, list => {
    const marker = `@value${found.length}@`
    found.push(list.replace(/@value(\d+)@/g, (_, index) => found[Number(index)]))
    return marker
  })
  return { masked: rest, atoms: found }
}

function readTargets(text, syntax) {
  const targets = Array.from(text.matchAll(syntax.targets), ([, name]) => syntax.aliases[name])
  if (/\bcode[ -]blocks?\b/.test(text) && /\bcopy[ -]buttons?\b/.test(text)) return ['code-block-copy-button']
  if (/\b(?:banners?|alerts?)\b/.test(text) && /\bicons?\b/.test(text)) return ['banner-icon']
  const indicatorOwners = [
    ['checkbox', 'checkbox-indicator', /\b(?:checkbox|checkboxes|check box(?:es)?)\b/,
      /\b(?:checkmarks?|check marks?|ticks?|dashes?|indeterminate|mixed|indicators?|checked\b.*\bdisabled|disabled\b.*\bchecked)\b/],
    ['radio', 'radio-indicator-dot', /\b(?:radios?|radio buttons?)\b/, /\bdots?\b/],
    ['switch', 'switch-thumb', /\bswitch(?:es)?\b/, /\b(?:thumbs?|knobs?)\b/],
  ]
  for (const [owner, part, noun, piece] of indicatorOwners) {
    if (noun.test(text) && piece.test(text)) return [...new Set([...targets.filter(target => target !== owner), part])]
  }
  if (/\b(?:selects?|drop[ -]?downs?|selectors?)\b/.test(text) && !/\bmenus?\b/.test(text)
      && /\b(?:indicators?|chevrons?|arrows?)\b/.test(text)) {
    return [...new Set([...targets.filter(target => target !== 'select'), 'selector-indicator-icon'])]
  }
  if (/\b(?:close|dismiss)[ -]+(?:buttons?|icons?|x|cross)\b/.test(text)) {
    if (/\b(?:toast|toasts|notifications?)\b/.test(text)) return [...new Set([
      ...targets.filter(target => !['toast', 'button'].includes(target)), 'toast-close',
    ])]
    if (/\b(?:dialog|dialogs|modals?)\b/.test(text)) return [...new Set([
      ...targets.filter(target => !['dialog', 'dialog-header', 'top-nav', 'button'].includes(target)), 'dialog-header-close-icon',
    ])]
  }
  if (/\b(?:dialog|dialogs|modals?)\b/.test(text) && /\b(?:titles?|headings?)\b/.test(text)) {
    return [...new Set([...targets.filter(target => !['dialog', 'dialog-header', 'top-nav', 'heading'].includes(target)), 'dialog-header-title-block'])]
  }
  if (dividerWord.test(text) && /\bmenus?\b/.test(text)) {
    return [...new Set([...targets.filter(part => !['menus', 'dropdown-menu', 'context-menu', 'divider'].includes(part)), 'dropdown-menu-divider'])]
  }
  if (calendarDayWords.test(text) && (calendarPicker.test(text) || /\bcalendar\b/.test(text))) {
    return [...new Set([...targets.filter(part => part !== 'date-input'), 'calendar-day'])]
  }
  return [...new Set(targets)]
}

function readProperties(text, syntax) {
  const matches = Array.from(text.matchAll(syntax.settings), ([, name]) => properties[name])
  if (/\b(rgba?|#[\da-f]+|@value\d+@|white|black|red|green|blue|gray)\b/.test(text) && matches.includes('color') &&
      matches.some(property => property === 'background-color' || property === 'border-color' || property.endsWith('-color'))) {
    return [...new Set(matches.filter(property => property !== 'color'))]
  }
  return [...new Set(matches)]
}

function textClauses(text, syntax) {
  const out = []
  const editable = part => syntax.font(part) || readProperties(part, syntax).length || readTargets(part, syntax).some(syntax.isOptionalPiece)
  for (const raw of text.split(/[;\n,]+|\bthen\b/g)) {
    const op = raw.trim()
    if (!op || /^(?:in\s+(?:the\s+)?)?(?:light|dark) (?:mode|theme|appearance)$/.test(op)) continue
    let active = ''
    for (const piece of op.split(/\s+(?:and|plus|without)\s+/)) {
      const without = op.includes(` without ${piece}`)
      if (active && !complexConstraint.test(op) && editable(active) && editable(piece)) {
        out.push(active)
        const intent = readTargets(piece, syntax).some(syntax.isOptionalPiece) && !readProperties(piece, syntax).length
          && !hidePiece.test(piece) && !restorePiece.test(piece) && /^(hide|remove|restore|show)\b/.exec(active)?.[1]
        active = without ? 'remove ' + piece : intent ? intent + ' ' + piece : piece
      } else active += (active ? without ? ' without ' : ' and ' : '') + piece
    }
    if (active) out.push(active)
  }
  return out
}

function normalizeExceptions(text) {
  return text.replace(/\s+(?:and|but)\s+(?=(?:never|do not|don't|avoid)\s)/g, '; ')
    .replace(/,\s*(?=(?:never|do not|don't|avoid)\s)/g, '; ')
    .replace(/,?\s+but keep (.+?)(?: as (?:they are|it is)| unchanged)?(?=\s*[,;.\n]|$)/g, ' except $1')
    .replace(/\s+(?:besides|save for|apart from|but not)\s+/g, ' except ')
    .replace(/,\s*([^,;\n]+?) excepted(?=\s*[;.!?\n]|$)/g, ' except $1')
    .replace(/,\s*(?=(?:except|excluding)\b)/g, ' ')
    .replace(/(\b(?:except|excluding)\b[^;\n]+?)(?=\bthen\b|[;\n]|$)/g, (_, phrase) => phrase.replace(/,\s*/g, ' and '))
}

function explicitColor(text, atoms) {
  const hex = /#[^\s;!?]+/.exec(text)?.[0]?.replace(/[.)]+$/, '')
  if (hex) {
    if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) throw new Error('Invalid hexadecimal color ' + hex)
    if (hex.length === 4 || hex.length === 5) return '#' + [...hex.slice(1)].map(char => char.repeat(2)).join('')
    return hex
  }
  const index = /@value(\d+)@/.exec(text)?.[1]
  return index === undefined ? undefined : atoms[Number(index)]
}

function lengthList(text) {
  const pair = /(?<![\w.])(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(px|rem|em|%)(?!\w)/.exec(text)
  if (pair) return [pair[1] + pair[3], pair[2] + pair[3]]
  return [...text.matchAll(lengthPattern)].map(([value]) => value)
}

function qualifiedScope(library, target, text, options, mode) {
  // A color name can also be a variant (for example a red card). Use it as a qualifier only before the part name.
  const variantText = text.split(/\b(?:to|as|=|with)\b|[#@]/, 1)[0]
  const targetKey = target?.startsWith('button-') && target !== 'button-group' ? 'button' : target
  const entry = targetKey && library.brandRuleTargets[targetKey]
  const when = [...(options.when ?? [])]
  if (targetKey === 'heading' && !when.some(value => /(^|\+)level:/.test(value))) {
    const level = /\b(?:h([1-6])|heading level ([1-6])|level ([1-6]) heading)\b/.exec(variantText)?.slice(1).find(Boolean)
    if (level) when.push('level:' + level)
  }
  const axes = { sm: ['small', 'sm'], md: ['medium', 'md'], lg: ['large', 'lg'] }
  const size = Object.keys(axes).find(key => axes[key].some(name => includesPhrase(variantText, name)))
  if (size && (entry?.variants?.size || ['inputs', 'controls'].includes(targetKey)) && !when.some(value => /(^|\+)size:/.test(value))) when.push('size:' + size)
  if (entry?.variants?.variant && !when.some(value => /(^|\+)variant:/.test(value))) {
    const variant = targetKey !== target ? target.slice(7) : entry.variants.variant.values.find(name => includesPhrase(variantText, name))
    if (variant) when.push('variant:' + variant)
  }
  if (entry?.variants?.tone && !when.some(value => /(^|\+)tone:/.test(value))) {
    const tone = entry.variants.tone.values.find(name => includesPhrase(variantText, name))
    if (tone) when.push('tone:' + tone)
  }
  if (entry?.variants?.orientation && !when.some(value => /(^|\+)orientation:/.test(value))) {
    const orientation = entry.variants.orientation.values.find(name => includesPhrase(variantText, name))
    if (orientation) when.push('orientation:' + orientation)
  }
  const calendar = targetKey === 'calendar-day'
  if (calendar && !when.some(value => /(^|\+)context:/.test(value))) {
    if (calendarPicker.test(text)) when.push('context:picker')
    else if (/\binline\b/.test(text)) when.push('context:inline')
  }
  if (targetKey === 'dropdown-menu-divider') {
    if (!when.some(value => /(^|\+)context:/.test(value))) {
      const context = /\bcontext menus?\b/.test(text) ? 'context' : /\bdropdown menus?\b/.test(text) ? 'dropdown' : undefined
      if (context) when.push('context:' + context)
    }
    if (!when.some(value => /(^|\+)presentation:/.test(value))) {
      if (/\b(?:bottom |touch )?sheets?\b/.test(text)) when.push('presentation:sheet')
      else if (/\bpopovers?\b/.test(text)) when.push('presentation:popover')
    }
  }
  const dayState = calendar ? /\b(?:today|in-range|range-start|range-end|unavailable|outside-view)\b/.exec(text)?.[0]
    ?? (/\brange interior\b/.test(text) ? 'in-range' : undefined) : undefined
  const mark = targetKey === 'checkbox-indicator'
  const mixedMark = mark && /\b(?:mixed|indeterminate|partially checked)\b/.test(text)
  const disabledMark = mark && /\bdisabled\b/.test(text)
  const simultaneousMark = disabledMark && (mixedMark ? 'disabled+mixed' : /\bchecked\b/.test(text) ? 'checked+disabled' : undefined)
  if (mixedMark && !simultaneousMark && !when.some(value => /(^|\+)checked:/.test(value))) when.push('checked:indeterminate')
  const arrowState = targetKey === 'selector-indicator-icon'
    ? /\b(?:expanded|open)\b/.test(text) ? 'expanded' : /\b(?:collapsed|closed)\b/.test(text) ? 'collapsed' : undefined
    : undefined
  const toggle = targetKey === 'toggle-button'
  const focused = calendar && inputFocusPhrase.test(text) || /\b(?:keyboard focus|focus visible|focused|focus-visible)\b/.test(text)
  const toggleState = toggle ? [
    /\b(?:unpressed|not pressed)\b/.test(text) ? 'unpressed' : /\b(?:pressed|aria-pressed)\b/.test(text) ? 'pressed' : undefined,
    /\bgrouped\b/.test(text) ? 'grouped' : undefined,
    /\bhover(?:ed|ing)?\b/.test(text) ? 'hover' : undefined, focused ? 'focus-visible' : undefined,
    /\b(?:active|disabled|loading)\b/.exec(text)?.[0],
  ].filter(Boolean).sort().join('+') : undefined
  const position = targetKey === 'switch-thumb' ? /\b(?:unchecked|selected|checked)\b/.exec(text)?.[0]
    : targetKey === 'radio-indicator-dot' && /\b(?:selected|checked)\b/.test(text) ? 'selected' : undefined
  const positionInteraction = focused ? 'focus-visible' : /\b(?:disabled|dragging|loading)\b/.exec(text)?.[0]
  const positionState = position && positionInteraction
    ? [position === 'checked' ? 'selected' : position, positionInteraction].sort().join('+') : undefined
  const state = options.state ?? (toggleState || simultaneousMark || positionState || (focused ? 'focus-visible'
    : disabledMark ? 'disabled'
      : dayState ?? arrowState ?? (targetKey === 'switch-thumb' && /\b(?:unchecked|dragging)\b/.exec(text)?.[0] ||
        /\b(?:hover(?:ed|ing)?|active|pressed|disabled|selected|highlighted|checked|loading|invalid|open|rest|indeterminate)\b/.exec(text)?.[0])))
  const normalized = /^hover(?:ed|ing)?$/.test(state ?? '') ? 'hover' : state === 'pressed' && !toggle ? 'active'
    : mixedMark && !options.state && ['checked', 'indeterminate'].includes(state) ? undefined
      : state === 'checked' && !mark ? 'selected' : state
  const only = Boolean(options.only || ['input', 'select', 'textarea', 'number-input', 'date-input', 'checkbox', 'radio', 'switch'].includes(targetKey))
  return { ...(targetKey && { on: targetKey }), ...(when.length && { when }), ...(normalized && { state: normalized }),
    ...(mode && { mode }), ...(only && { only }) }
}

function readExceptions(library, text, syntax, anchor) {
  if (!text) return []
  const separated = text.replace(/^(?:for|the)\s+/, '').replace(/[.!?]$/, '').split(/\s+(?:and|or)\s+/).filter(Boolean)
  const trailingPart = readTargets(separated.at(-1) ?? '', syntax)[0] ?? anchor
  const exceptions = separated.map(selection => {
    const [target, ...extra] = readTargets(selection, syntax)
    const source = target ? selection : trailingPart && `${selection} ${trailingPart}`
    if (!source || extra.length) throw new Error('Name each part to preserve after except.')
    const mode = [...selection.matchAll(modePattern)].at(-1)?.[1]
    const { on, when = [], state } = qualifiedScope(library, target ?? trailingPart, source, {}, undefined)
    if (!target && !when.length && !state) throw new Error('Unknown exception: ' + selection)
    const conditions = [...when, ...(state ? ['state:' + state] : []), ...(mode ? ['appearance:' + mode] : [])]
    return on + (conditions.length ? '/' + conditions.join('+') : '')
  })
  return [...new Set(exceptions)]
}

function questionConstraint(library, operation, syntax, mode) {
  const withoutMode = operation.replace(/[.!?]$/, '')
    .replace(/(?:^(?:in (?:the )?)?|\s+in (?:the )?)(?:light|dark) (?:mode|theme|appearance)(?:\s+|$)/g, ' ').trim()
  const ink = avoidInkPattern.exec(withoutMode)
  if (ink) {
    const value = colors[ink[1]] ?? explicitColor(ink[1], [])
    return { kind: 'text-color', property: ['muted', 'secondary'].includes(ink[2]) ? '--sy-text-muted' : '--sy-text', value,
      scope: { ...(mode && { mode }) } }
  }
  const preserve = preservePattern.exec(withoutMode)
  if (!preserve) return
  const [, verb, phrase] = preserve
  const ending = /\s+(rounder|squarer|more compact|roomier)$/.exec(phrase)
  if (verb === 'make' && !ending) return
  if (mode) throw new Error('Use an appearance-neutral clause to preserve part geometry.')
  const parts = readExceptions(library, ending ? phrase.slice(0, ending.index) : phrase, syntax)
  if (!parts.length) return
  const appearance = ending?.[1]
  const property = verb === 'round' || ['rounder', 'squarer'].includes(appearance) ? 'border-radius'
    : appearance ? 'spacing' : undefined
  return { kind: 'preserve', parts, property }
}

function protectsEdit(guard, action) {
  if (!['set', 'relative'].includes(action.kind) || ['name', 'mode', 'voice'].includes(action.property)) return false
  return !guard.property || guard.property === action.property || guard.property === 'border-radius' && action.property === 'corners'
}

function propertyValue(property, text, atoms) {
  const color = explicitColor(text, atoms)
  const remove = /\b(?:remove|no|turn off|without|disable)\b/.test(text)
  if (property === 'outline-width' && remove) return '0px'
  if (/color$/.test(property) || property === 'color' || property === 'background' || property.startsWith('--sy-')) {
    if (color) return color
    if (remove && ['background-color', '--sy-border'].includes(property)) return 'transparent'
    if (property.startsWith('--sy-') && lengthList(text).length) return lengthList(text)[0]
    return Object.entries(colors).find(([name]) => includesPhrase(text, name))?.[1]
  }
  if ((property === 'box-shadow' || property === 'border') && (remove || /\bnone\b/.test(text))) return 'none'
  if (property === 'border' && /\b(?:solid|dashed|dotted|double)\b/.test(text)) {
    const style = /\b(solid|dashed|dotted|double)\b/.exec(text)[0]
    const shade = color ?? Object.entries(colors).find(([name]) => includesPhrase(text, name))?.[1]
    return [lengthList(text)[0], style, shade].filter(Boolean).join(' ')
  }
  if (property === 'font-weight') return fontWeightPattern.exec(text)?.[1] ?? Object.entries(weights).find(([weight]) => includesPhrase(text, weight))?.[1]
  if (property === 'text-transform') return /\b(uppercase|lowercase|capitalize|none)\b/.exec(text)?.[1]
  if (property === 'font-family') return /\b(?:to|as)\s+([\p{L}][\p{L}\d .,'-]{0,65})$/u.exec(text)?.[1]
  if (property === 'border-radius') {
    if (/\b(?:square|zero)\b/.test(text)) return '0px'
    return cornerRadii.exec(text)?.[0]
  }
  const lengths = lengthList(text)
  if (!lengths.length) return
  if (property.startsWith('padding') && lengths.length > 1) return lengths.join(' ')
  return lengths[0]
}

function displayHeadingRequests(library, text, options, mode, query, properties, atoms) {
  const match = displayHeading.exec(text)
  if (!match) return
  const scope = qualifiedScope(library, 'heading', text, options, mode)
  const explicit = themeConditions(scope.when).type
  const types = explicit ? [explicit] : match[1] ? ['display-' + match[1]] : match[2] === 'heading' ? ['display-1']
    : library.brandRuleTargets.heading.variants.type.values.filter(value => value.startsWith('display-'))
  const length = lengthList(text)[0]
  const amount = /\bby\s+([\d.]+px)\b/.exec(text)?.[1]
  const scale = more.test(text) || less.test(text)
  const alignment = /\b(?:align(?:ed|ment)? (?:to the )?(start|center|end|left|right|justify)|centered|centred)\b/.exec(text)
  const family = /\b(?:heading|headings) (?:in|use|font(?: family)?(?: to)?) ([\p{L}][\p{L}\d .'-]+)\s*[.!?]?$/u.exec(text)?.[1]?.trim()
  const weight = /\b(?:heavy|heavier|bolder|bold)\b/.test(text)
  const color = explicitColor(text, atoms) || Object.keys(colors).some(name => includesPhrase(text, name))
  const goals = properties.length ? properties.map(property => property === 'background-color' ? 'color' : property)
    : [alignment ? 'text-align' : family ? 'font-family' : weight ? 'font-weight' : color ? 'color' : 'font-size']
  const destination = role => ({ ...scope, when: [...(scope.when ?? []), ...(!explicit ? ['type:' + role] : [])] })
  return goals.flatMap(property => {
    const tracking = property === 'letter-spacing' && /\b(tighter|tight|normal|wide)\b/.exec(text)?.[1]
    const value = property === 'text-align' && alignment ? alignment[1] ?? 'center'
      : property === 'font-family' ? themeFontStack(family ?? propertyValue(property, text, atoms) ?? '') || undefined
        : tracking ? `${editorDials.headings.tracking[tracking]}em`
          : propertyValue(property, text, atoms) ?? (property === 'font-weight' && weight ? /\bheav(?:y|ier)\b/.test(text) ? '800' : '700' : undefined)
    if (query || !value && !scale && !editPattern.test(text)) {
      return types.map(role => ({ kind: 'lookup', property, scope: destination(role) }))
    }
    if (property === 'font-size' && types.length > 1 && (length && !amount || scale)) {
      return [{ kind: 'heading-scale', property, scope, types, value: amount ? undefined : length,
        direction: less.test(text) ? -1 : 1, ...(amount && { delta: amount }), steps: Number(/\b(\d+)\s+steps?\b/.exec(text)?.[1] ?? 1) }]
    }
    if (value !== undefined && !amount) return types.map(role => ({ kind: 'set', property, value, scope: destination(role) }))
    if (property === 'font-size' && scale) return types.map(role => ({ kind: 'relative', property, scope: destination(role),
      direction: less.test(text) ? -1 : 1, ...(amount && { delta: amount }) }))
    throw new Error('Choose a concrete value for the display heading ' + property)
  })
}

function inputFocusActions(library, text, targets, options, mode, query, atoms) {
  if (!inputFocusPhrase.test(text)) return
  const on = 'input-focus-ring'
  const part = library.brandRuleTargets[on]
  const named = targets.filter(target => part.variants.kind.values.includes(target))
  if (targets.some(target => ![on, 'inputs', 'field', ...named].includes(target))) return
  const conditions = themeConditions(options.when)
  const status = /\b(error|invalid|warning|success|info)\b/.exec(text)?.[1]
  if (status && !conditions.status) conditions.status = status === 'invalid' ? 'error' : status
  if (named.length === 1 && named[0] !== 'input' && !conditions.kind) conditions.kind = named[0]
  if (named.length > 1 && !conditions.kind) throw new Error('Name one input kind or use separate instructions for the focus rings.')
  const when = Object.entries(conditions).map(([axis, value]) => axis + ':' + value)
  const scope = { on, state: 'focus-visible', ...(when.length && { when }), ...(mode && { mode }) }
  if (query) {
    const property = /\b(color|colour)\b/.test(text) ? 'outline-color' : /\b(wide|width|thick|thickness)\b/.test(text) ? 'outline-width' : undefined
    return [{ kind: 'lookup', property, scope }]
  }
  if (/\b(?:remove|hide|disable|without|no)\b/.test(text)) return [{ kind: 'set', property: 'outline-width', value: '0px', scope }]
  const alpha = /\b(\d+(?:\.\d+)?)\s*%\s+(?:more )?transparent\b/.exec(text)?.[1]
  if (alpha !== undefined) {
    if (Number(alpha) > 100) throw new Error('Use a transparency from 0% to 100%.')
    return [{ kind: 'relative', property: 'outline-color', transparency: Number(alpha), scope }]
  }
  const appearances = [...text.matchAll(modePattern)]
  const segments = appearances.length > 1 ? text.split(/\s+(?:and|while)\s+/).map(phrase => ({
    text: phrase, modes: [...phrase.matchAll(modePattern)].map(match => match[1]),
  })) : [{ text, modes: mode ? [mode] : [] }]
  if (appearances.length > 1 && (segments.length !== appearances.length || segments.some(segment => segment.modes.length !== 1))) {
    throw new Error('Name each mode together with its focus ring color or width.')
  }
  const actions = segments.flatMap(segment => {
    const local = { ...scope, mode: segment.modes[0] }
    const value = propertyValue('outline-color', segment.text, atoms)
    const width = lengthList(segment.text)[0]
    const direction = /\b(?:thinner|narrower)\b/.test(segment.text) ? -1 : /\b(?:thicker|wider)\b/.test(segment.text) ? 1 : 0
    return [
      ...(width ? [{ kind: 'set', property: 'outline-width', value: width, scope: local }]
        : direction ? [{ kind: 'relative', property: 'outline-width', direction, scope: local }] : []),
      ...(value ? [{ kind: 'set', property: 'outline-color', value, scope: local }] : []),
    ]
  })
  if (!actions.length) throw new Error('Name a color, a width, or a relative thickness for the focus ring.')
  return actions
}

function fontRequest(library, text, options = {}) {
  if (options.when || options.state || options.only || /\bfont (?:size|weight|style|variant|stretch)\b/.test(text)) return
  const role = phrase => phrase?.split(' ')[0].replace(/^(heading)s$/, '$1')
  const normalize = phrase => phrase.replace(/[.!?]$/, '').trim()
  const known = value => editorDials.font.includes(value) || /^(?:sans-serif|serif|monospace|system-ui)$/.test(value)
  const family = (value, explicit) => {
    const choice = normalize(value)
    return (explicit || known(choice)) && /^[\p{L}][\p{L}\p{N} .'-]*$/u.test(choice) ? choice : undefined
  }
  const subject = normalize(text.replace(/^(?:把|将)\s*/, ''))
  if (lookupPattern.test(subject) && /\b(?:font(?: family)?|typeface)\b/.test(subject) && !/\bfont (?:size|weight)\b/.test(subject)) {
    const on = role(fontRoleMention.exec(subject)?.[1]) ?? options.on
    if (on && Object.hasOwn(library.brandFontRoleTokens, on)) return { kind: 'lookup', property: library.brandFontRoleTokens[on] }
  }
  const first = roleFirstFont.exec(subject)
  if (first) {
    const value = family(first[4], first[2] || first[3])
    if (value) return { kind: 'set', property: 'font', on: role(first[1]), value }
  }
  const last = familyFirstFont.exec(subject)
  if (last) {
    const value = family(last[2], last[1])
    if (value) return { kind: 'set', property: 'font', on: role(last[3]), value }
  }
  const whole = /^(?:(?:set|change|make) )?(?:(?:the )?font(?: family)?(?: to)?|(everything|the whole theme)(?: in| use)?) (.+)$/.exec(subject)
  if (whole) {
    const value = family(whole[2], !whole[1])
    if (value) return { kind: 'set', property: 'font', on: options.on, value }
  }
}

function dial(text, props, library, atoms) {
  if (/\b(?:compact|roomier|roomy|spacious|density|spacing)\b/.test(text)) {
    const named = /\b(tight|compact|medium|roomy|spacious)\b/.exec(text)?.[1]
    return { property: 'spacing', value: /\b(?:more compact|tighter|less spacing)\b/.test(text) ? 'less' : /\broomier\b/.test(text) ? 'more' : named ?? lengthList(text)[0] }
  }
  if (/\b(?:vibrancy|colorful|saturated|saturation)\b/.test(text)) {
    const value = /\b(\d+(?:\.\d+)?)(?:\s*%)?(?![\w.])/.exec(text)?.[1]
    return { property: 'vibrancy', value: value ?? (less.test(text) ? 'less' : 'more') }
  }
  const named = /\b(canvas|accent|neutral|success|warning|danger|info|text-muted|text)s?\b/.exec(text)?.[1]
  if (named && library.brandColors.includes(named)) {
    const property = '--sy-' + named
    const value = propertyValue('color', text, atoms)
    const shift = /\b(?:lighter|darker)\b/.exec(text)?.[0]
    return { property, value, ...(value === undefined && shift && { direction: shift === 'lighter' ? 1 : -1 }) }
  }
  if (/\b(page|site|default)\b/.test(text) && (!props.length || props.includes('background-color'))) {
    const value = propertyValue('color', text, atoms)
    if (value !== undefined) return { property: '--sy-canvas', value }
  }
  if (props.includes('border-radius')) return { property: 'corners', value: propertyValue('border-radius', text, atoms) ?? (less.test(text) ? 'less' : 'more') }
  if (props.includes('border') && /\b(?:remove|no|without|turn off)\b/.test(text)) {
    return { property: borderWidthToken, value: '0px' }
  }
  if (props.includes('border-width') || props.includes('border') && /\b(?:thicker|thinner)\b/.test(text)) {
    const direction = more.test(text) ? 'more' : less.test(text) ? 'less' : undefined
    const by = /\bby\s+(\d+(?:\.\d+)?(?:px|rem|em|%))\b/.exec(text)?.[1]
    const named = Object.keys(editorDials['border-width']).find(width => includesPhrase(text, width))
    return { property: borderWidthToken, value: by ? direction : lengthList(text)[0] ?? named ?? direction, ...(by && { by }) }
  }
  if (props.includes('box-shadow') && /\b(?:remove|no|without|turn off)\b/.test(text)) return { property: 'shadow', value: 'none' }
  if (props.includes('font-size')) return { property: 'text-size', value: lengthList(text)[0] ?? (less.test(text) ? 'less' : 'more') }
}

function motionQuestion(text, query) {
  const preference = /\breduced motion\b/.test(text)
  const character = /\bmotion character\b/.test(text)
  if (!preference && !character && !/\b(?:motion|animations?|transitions?)\b/.test(text)) return
  const property = preference ? 'reduced-motion' : character ? 'motion-character' : 'motion-tempo'
  if (query) return { kind: 'lookup', property }
  const choices = editorDials[property]
  const value = (Array.isArray(choices) ? choices : Object.keys(choices)).find(choice => includesPhrase(text, choice))
  if ((preference || character) && value) return { kind: 'set', property, value }
  if (property === 'motion-tempo') {
    const tempo = /\b\d+(?:\.\d+)?\s*[x×](?:\s|$)|\b(?:tempo|speed)\s+(?:(?:set\s+)?to\s+)?\d+(?:\.\d+)?\b/.exec(text)?.[0]?.match(/\d+(?:\.\d+)?/)?.[0]
    const step = /\bfaster\b/.test(text) ? 'less' : /\bslower\b/.test(text) ? 'more' : value
    if (tempo || step) return { kind: 'set', property, value: tempo ?? step }
  }
}

function comparisonFor(text, syntax) {
  const same = /\bas\s+(round|wide|tall|large|small|dark|light|thick)\s+as\s+/.exec(text)
  const than = /\bthan\s+/.exec(text)
  const match = same ?? than
  if (!match) return
  const split = match.index + match[0].length
  return { requested: text.slice(0, match.index), reference: text.slice(split),
    target: readTargets(text.slice(split), syntax)[0], value: lengthList(text.slice(split))[0],
    property: { round: 'border-radius', wide: 'width', tall: 'height', thick: 'border-width', dark: 'background-color', light: 'background-color' }[same?.[1]],
    direction: same ? 0 : less.test(text.slice(0, split)) ? -1 : 1 }
}

function variantResemblance(library, syntax, clause, original, options, mode) {
  const like = resemblance.exec(clause)
  if (!like || lookupPattern.test(clause)) return
  if (/\b(?:not|never|don't|without)\b/.test(clause)) throw new Error('This request asks to avoid matching the named appearance.')
  const destination = clause.slice(0, like.index)
  const reference = clause.slice(like.index + like[0].length)
  const targets = options.on ? [options.on] : readTargets(destination, syntax)
  const sources = readTargets(reference, syntax)
  if (targets.length !== 1 || sources.length > 1) throw new Error('Name one reference and one destination for the variant copy')
  const to = qualifiedScope(library, targets[0], destination, options, mode)
  const from = qualifiedScope(library, sources[0] ?? to.on, reference, {}, mode)
  if (to.on !== from.on) throw new Error('The reference and destination must be variants of the same component')
  if (to.state || from.state || mode) throw new Error('A variant copy covers the whole appearance across modes and states. Name a property for a scoped change.')
  const when = themeConditions(to.when)
  const source = themeConditions(from.when)
  const axis = ['variant', 'tone', 'size', 'elevation'].find(axis => when[axis] && (source[axis] || /\bdefault\b/.test(reference)))
  if (!axis) throw new Error('Name the reference and destination variants, for example ghost buttons and primary buttons')
  if (Object.keys(source).some(key => key !== axis && source[key] !== when[key])) {
    throw new Error('Use the same additional size and variant conditions for the reference and destination')
  }
  return { kind: 'copy', property: 'copy-style', value: `${axis}:${source[axis] ?? 'default'}`, scope: { ...to, only: undefined }, clause: original }
}

export function parseThemeQuestion(library, input, options) {
  const { masked: text, atoms } = cssAtoms(clean(input))
  const masked = normalizeExceptions(text)
  const syntax = language(library)
  const direct = /^(?:what (?:is|does) (?:the )?)(.+?)(?: do)?\??$/.exec(masked)?.[1] ?? masked
  const name = direct.replaceAll(' ', '-')
  const on = Object.hasOwn(syntax.groups, name) ? name : Object.hasOwn(syntax.aliases, direct) ? syntax.aliases[direct] : undefined
  const setting = Object.hasOwn(editorDials, name) || Object.hasOwn(themeAspects, name) || themePropertyParts(library, name).length ? name : undefined
  if (!options.on && !/^(?:colors?|palette)$/.test(name) && (on || setting)) {
    const scope = { ...(on && { on }), when: options.when, state: options.state, mode: options.mode }
    return { request: input, actions: [{ kind: 'lookup', property: on ? undefined : setting, scope, clause: input }],
      constraints: [], unsupported: [], groups: syntax.groups, ordered: false }
  }
  const referenceToken = /--sy-[\w-]+/.exec(masked)?.[0]
  const pageColor = /\b(?:page|site)\b/.test(masked) && Object.keys(colors).some(color => includesPhrase(masked, color))
  const paletteColor = /\b(?:accent|success|warning|danger|info)s?\b/.test(masked) && Object.keys(colors).some(color => includesPhrase(masked, color))
  const clauses = textClauses(masked, syntax)
  const typography = clauses.some(clause => fontRequest(library, clause.replace(exceptionPattern, ''), options))
  if (!lookupPattern.test(masked) && !editPattern.test(masked) && !complexConstraint.test(masked) && !resemblance.test(masked) &&
      !referenceToken && !pageColor && !paletteColor && !typography && !inputFocusPhrase.test(masked) && !buttonOutline.test(masked) && !sunkenBevel.test(masked) && !strongerShadow.test(masked) && !softerShadow.test(masked) && !faintDivider.test(masked) &&
      !displayHeading.test(masked) && !(restorePiece.test(masked) && readTargets(masked, syntax).some(syntax.isOptionalPiece)) &&
      !(masked.includes(':') || /@value\d+@|#\S+/.test(masked) || lengthList(masked).length)) return
  const globalMode = /^(?:in\s+(?:the\s+)?)?(light|dark)\s+(?:mode|theme|appearance)\s*(?:,|:|\bin\b|$)/.exec(masked)?.[1]
  const parsed = clauses.map(clause => {
    const exception = exceptionPattern.exec(clause)
    const operation = exception ? clause.slice(0, exception.index) : clause
    const comparison = comparisonFor(operation, syntax)
    const subject = comparison?.requested ?? operation
    const requested = readProperties(subject, syntax)
    const targets = readTargets(subject, syntax)
    const progressHeight = targets.length === 1 && targets[0] === 'progress-bar-track' && /\b(?:tall(?:er)?|high|thick(?:er|ness)?|thin(?:ner)?|shorter)\b/.test(subject)
    return { clause, operation, subject, comparison, exception, targets,
      properties: requested.length ? requested : [comparison?.property ?? (progressHeight ? 'height' : undefined)].filter(Boolean) }
  })
  const actions = [], unsupported = [], constraints = []
  let priorTargets = [], priorProperties = []
  for (const [index, item] of parsed.entries()) {
    const { clause, operation, subject, comparison, exception } = item
    const original = clause.replace(/@value(\d+)@/g, (_, i) => atoms[Number(i)])
    const modes = [...operation.matchAll(modePattern)].map(match => match[1])
    const mode = modes.at(-1) ?? globalMode ?? options.mode
    try {
      const constraint = !exception && questionConstraint(library, operation, syntax, mode)
      if (constraint) {
        constraints.push({ ...constraint, clause: original })
        continue
      }
    } catch (error) {
      unsupported.push({ clause: original, reason: error.message })
      continue
    }
    const restoringPiece = !exception && restorePiece.test(operation) && item.targets.some(syntax.isOptionalPiece)
    if (!restoringPiece && (complexConstraint.test(operation) || exception && complexConstraint.test(exception[1]))) {
      unsupported.push({ clause: original, reason: 'This constraint requires an explicit component scope. Name the parts to change and the property to set.' })
      continue
    }
    const query = lookupPattern.test(subject) || /^(?:token:)?--sy-[\w-]+$/.test(subject)
    const token = /--sy-[\w-]+/.exec(subject)?.[0]
    const explicitTarget = item.targets.length > 0
    const contextTargets = index === 0 && parsed[index + 1]?.targets.length && /\b(?:no|remove|without)\b/.test(subject)
      ? parsed[index + 1].targets : priorTargets
    let targets = explicitTarget ? item.targets : options.on ? [options.on] : token || /\b(?:everything|whole theme|all borders|vibrancy|canvas)\b/.test(subject) ? [] : contextTargets
    let goals = token ? [token] : item.properties.length ? item.properties : targets.length && priorProperties.length ? priorProperties : []
    const tabUnderline = !token && /\bunderlines?\b/.test(subject) && targets.length > 0
      && targets.every(part => part === 'tab' || part === 'tab-indicator')
    const tabThickness = !token && targets.length === 1 && targets[0] === 'tab-indicator' && /\bthick(?:ness|er)?\b/.test(subject)
    if (!token && targets.length === 1 && targets[0] === 'table-row' && /\b(?:table (?:row )?dividers|table borders)\b/.test(subject)) {
      goals = ['--sy-border']
    }
    if (!goals.length && targets.some(part => part === 'table-cell' || part === 'table-header-cell') && /\bcompact\b/.test(subject)) {
      goals = ['padding-block']
    }
    if (comparison?.property === 'border-width' || /\b(?:thick|thicker|thin|thinner)\b/.test(subject)) {
      goals = goals.map(property => property === 'border' ? 'border-width' : property)
    }
    if (!goals.length && targets.length && (/@value\d+@|#\w+/.test(subject) || Object.keys(colors).some(color => includesPhrase(subject, color)))) goals = ['background-color']
    const buttonIcons = targets.length && targets.every(part => /^button(?:-(?:primary|secondary|ghost|danger))?$/.test(part))
      && /\bicons?\b/.test(subject)
    if (!token && buttonIcons && !/\b(?:background|fill)\b/.test(subject)) {
      goals = goals.length ? goals.map(property => ['color', 'background-color'].includes(property) ? '--sy-button-icon-color' : property)
        : query ? ['--sy-button-icon-color'] : goals
    }
    if (targets.length === 1 && ['radio-indicator-dot', 'switch-thumb'].includes(targets[0])) {
      goals = goals.map(property => property === 'color' ? 'background-color' : property)
    }
    if (!token && targets.length === 1 && ['selector-indicator-icon', 'dialog-header-close-icon', 'dialog-header-title-block', 'toast-close'].includes(targets[0])
        && !/\b(?:background|fill)\b/.test(subject)) {
      goals = goals.map(property => property === 'background-color' ? 'color' : property)
    }
    if (!token && targets.length === 1 && targets[0] === 'calendar-day' && inputFocusPhrase.test(subject)) {
      const ink = propertyValue('outline-color', subject, atoms)
      const width = lengthList(subject).length || /\b(?:thick(?:er|ness)?|thin(?:ner)?|wide(?:r)?|width|remove|hide)\b/.test(subject)
      goals = [...(width ? ['outline-width'] : []), ...(ink || /\bcolou?r\b/.test(subject) ? ['outline-color'] : [])]
    }
    if (explicitTarget) priorTargets = targets
    if (item.properties.length) priorProperties = item.properties
    try {
      const visibility = avoidShowingPiece.test(subject) ? 'set' : restorePiece.test(subject) ? 'restore' : hidePiece.test(subject) ? 'set' : undefined
      const piece = tabUnderline ? 'tab-indicator' : targets.length === 1 ? targets[0] : undefined
      if (!query && !token && !item.properties.length && !lengthList(subject).length && visibility && syntax.isOptionalPiece(piece)) {
        const scope = qualifiedScope(library, piece, subject, options, mode)
        if (scope.state === 'rest' || piece === 'tab-indicator' && scope.state === 'selected') delete scope.state
        if (tabUnderline && !themeConditions(scope.when).variant) scope.when = [...(scope.when ?? []), 'variant:line']
        actions.push({ kind: visibility, property: 'display', value: 'none', scope, clause: original })
        continue
      }
      if (!query && visibility === 'set' && piece === 'dialog-header-close-icon' && !item.properties.length) {
        throw new Error('The dialog close control needs its visible icon.')
      }
      let markerAxis
      if (tabUnderline || tabThickness) {
        targets = ['tab-indicator']
        const orientation = themeConditions(options.when).orientation ?? (/\bvertical\b/.test(subject) ? 'vertical' : 'horizontal')
        markerAxis = orientation === 'vertical' ? 'width' : 'height'
        const ink = /\bcolor\b/.test(subject) || propertyValue('background-color', subject, atoms)
        goals = query && ink ? ['background-color'] : [markerAxis, ...(!query && ink ? ['background-color'] : [])]
      }
      const exceptions = readExceptions(library, exception?.[1], syntax, targets.length === 1 ? targets[0] : undefined)
      if (exceptions.length && (query || resemblance.test(operation))) throw new Error('Use an editable setting before naming the parts to preserve.')
      const preserve = exceptions.length ? { except: exceptions } : {}
      const display = !token && displayHeadingRequests(library, subject, options, mode, query, item.properties, atoms)
      if (display) {
        actions.push(...display.map(action => ({ ...action, scope: { ...action.scope, ...preserve }, clause: original })))
        continue
      }
      if (!token && !query && targets.length === 1 && ['divider', 'dropdown-menu-divider'].includes(targets[0])) {
        const menu = targets[0] === 'dropdown-menu-divider'
        const scope = { ...qualifiedScope(library, targets[0], subject, options, mode), ...preserve }
        const width = menu ? 'height' : borderWidthToken
        const remove = /\b(?:hide|remove|no|without|turn off)\b/.test(subject)
        const thickness = goals.some(property => ['height', 'width', 'border-width'].includes(property))
          || /\b(?:thin(?:ner)?|thick(?:er|ness)?)\b/.test(subject)
        const dim = faintDivider.test(subject) || /\b(?:lighter|darker)\b/.test(subject)
        if (remove || thickness) {
          const length = lengthList(subject)[0]
          actions.push(remove || length ? { kind: 'set', property: remove && mode ? 'background-color' : width,
            value: remove ? mode ? 'transparent' : '0px' : length, scope, clause: original }
            : { kind: 'relative', property: width, direction: less.test(subject) ? -1 : 1,
              delta: less.test(subject) ? '0.5px' : '1px', scope, clause: original })
          continue
        }
        if (dim) {
          const conditions = themeConditions(scope.when)
          const variants = conditions.variant ? [conditions.variant] : library.brandRuleTargets[targets[0]].variants.variant.values
          for (const variant of variants) {
            actions.push({ kind: 'relative', property: 'background-color', direction: less.test(subject) ? -1 : 1,
              ...(faintDivider.test(subject) && { transparency: 40 }), scope: { ...scope, when: [...(scope.when ?? []),
                ...(!conditions.variant ? ['variant:' + variant] : [])] }, clause: original })
          }
          continue
        }
        const ink = propertyValue('background-color', subject, atoms)
        if (ink) {
          const tone = themeConditions(scope.when).variant
          const property = menu && !includesPhrase(subject, 'background color') ? tone === 'strong' ? '--sy-border-strong' : '--sy-border' : 'background-color'
          actions.push({ kind: 'set', property, value: ink, scope, clause: original })
          continue
        }
      }
      if (!query && targets.length === 1 && /^(?:button|buttons|button-(?:primary|secondary|ghost|danger))$/.test(targets[0])
        && buttonOutline.test(subject.replace(modePattern, '').replace(/\s+in\s*$/, '').trim())) {
        const scope = qualifiedScope(library, targets[0] === 'buttons' ? 'button' : targets[0], subject, options, mode)
        const local = scope.when || scope.state || scope.mode || scope.only || options.on
        actions.push({ kind: 'set', property: local ? 'button-style' : 'buttons', value: 'outline',
          scope: { ...(local && scope), ...preserve }, clause: original })
        continue
      }
      const focus = inputFocusActions(library, subject, targets, options, mode,
        query || /^how (?:is|are) .*\bfocus rings?\b/.test(subject), atoms)
      if (focus) {
        actions.push(...focus.map(action => ({ ...action, scope: { ...action.scope, ...preserve }, clause: original })))
        continue
      }
      const motion = !targets.length && !token && motionQuestion(operation, query)
      if (motion) {
        actions.push({ ...motion, scope: { ...qualifiedScope(library, undefined, subject, options, mode), ...preserve }, clause: original })
        continue
      }
      const font = fontRequest(library, operation, options)
      if (font) {
        const { on, ...request } = font
        actions.push({ ...request, scope: { ...(on && { on }), ...(mode && { mode }), ...preserve }, clause: original })
        continue
      }
      const copy = variantResemblance(library, syntax, operation, original, options, mode)
      if (copy) { actions.push(copy); continue }
      const shadow = !query && !comparison && goals.length === 1 && goals[0] === 'box-shadow' && shadowEdit(subject, targets.length > 0)
      if (shadow) {
        const parts = shadow.kind === 'shadow' ? targets.flatMap(target => syntax.groups[target] ?? target) : targets
        for (const on of parts.length ? parts : [undefined]) {
          const scope = { ...qualifiedScope(library, on, subject, options, mode), ...preserve }
          actions.push({ ...shadow, scope, clause: original })
        }
        continue
      }
      const literal = explicitColor(subject, atoms)
      if (query && !targets.length && (token || goals.length)) {
        if (!token && goals.includes('box-shadow') && /\bshadows\b/.test(subject)) {
          const scope = qualifiedScope(library, undefined, subject, options, mode)
          actions.push(...library.brandShadowTokens.map(property => ({ kind: 'lookup', property, scope, clause: original })))
          continue
        }
        const named = /\b(?:canvas|accent|surface|text-muted|text|border)\b/.exec(subject)?.[0]
        const property = token ?? (goals.includes('border-width') ? borderWidthToken : named ? '--sy-' + named
          : { 'border-radius': 'corners', 'box-shadow': 'shadow', 'font-family': 'font', 'font-size': 'text-size' }[goals[0]] ?? goals[0])
        actions.push({ kind: 'lookup', property,
          scope: qualifiedScope(library, undefined, subject, options, mode), clause: original })
        continue
      }
      if (!targets.length) {
        const setting = token ? { property: token, value: explicitColor(subject, atoms) ?? lengthList(subject)[0] } : dial(subject, goals, library, atoms)
        const reference = setting?.property === borderWidthToken ? comparison : undefined
        if (setting?.value !== undefined || setting?.direction || reference?.value || reference?.target) {
          const { property, value, by, direction } = setting
          const appearance = mode ?? (property === '--sy-canvas' && /\b(?:default|page|site)\b/.test(subject) ? 'light' : undefined)
          const scope = { ...qualifiedScope(library, undefined, subject, options, appearance), ...preserve }
          actions.push(by || direction || reference ? { kind: 'relative', property, scope, ...(by && { delta: by }),
            direction: reference?.direction ?? direction ?? (value === 'less' ? -1 : 1), clause: original,
            ...(reference?.target && { reference: qualifiedScope(library, reference.target, reference.reference, {}, appearance) }),
            ...(reference?.value && { referenceValue: reference.value }),
          }
            : { kind: 'set', property, value, scope, clause: original })
          continue
        }
      }
      if (targets.length && (goals.length || query)) {
        const backgroundPaint = literal && /gradient\(/i.test(literal) && !includesPhrase(subject, 'background color')
        for (const on of targets) for (const property of goals.length ? goals.map(property => property === 'background-color' && backgroundPaint ? 'background' : property) : [undefined]) {
          const scope = { ...qualifiedScope(library, on, subject, options, mode), ...preserve }
          if (on === 'tab-indicator' && scope.state === 'selected') delete scope.state
          if (markerAxis && !themeConditions(scope.when).orientation) scope.when = [...(scope.when ?? []), 'orientation:horizontal']
          if (scope.on === 'button' && property === 'height') scope.only = true
          if (query) { actions.push({ kind: 'lookup', property, scope, clause: original }); continue }
          const value = propertyValue(property, subject, atoms) ?? (tabUnderline && property === markerAxis
            ? /\b(?:remove|hide|no|without)\b/.test(subject) ? '0px' : '2px' : undefined)
          const by = /\bby\s+(-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%))\b/.exec(subject)?.[1]
          if (!comparison && (value === undefined || by) && (more.test(subject) || less.test(subject))) {
            actions.push({ kind: 'relative', property, scope, direction: less.test(subject) ? -1 : 1,
              ...(by && { delta: by }), steps: Number(/\b(\d+)\s+steps?\b/.exec(subject)?.[1] ?? 1), clause: original })
          } else if (comparison) {
            actions.push({ kind: 'relative', property, scope, direction: comparison.direction,
              ...comparison.target && { reference: qualifiedScope(library, comparison.target, comparison.reference, {}, mode) },
              ...(comparison.value && { referenceValue: comparison.value }), delta: lengthList(subject)[0], clause: original })
          } else if (value === undefined) unsupported.push({ clause: original, reason: 'Choose a concrete value for ' + property })
          else actions.push({ kind: 'set', property, value, scope, clause: original })
        }
        continue
      }
      unsupported.push({ clause: original, reason: 'Name a known component, theme setting or token and what to inspect or change.' })
    } catch (error) { unsupported.push({ clause: original, reason: error.message }) }
  }
  for (const constraint of constraints.filter(guard => guard.kind === 'preserve')) {
    const affected = actions.filter(action => protectsEdit(constraint, action))
    for (const { scope } of affected) scope.except = [...new Set([...(scope.except ?? []), ...constraint.parts])]
    constraint.status = affected.length ? 'applied-to-request' : 'preserved'
  }
  return { request: input, actions, constraints, unsupported, groups: syntax.groups, ordered: /\bthen\b/.test(masked) }
}

const geometry = /^(?:padding|width|height|min-height|border-width|outline-width|border-radius|font-size|gap|letter-spacing|line-height)/
const paint = property => property === 'color' || property.endsWith('-color')
const px = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/

function adjustedColor(reading, direction, steps) {
  let channels
  let alpha = 1
  if (/^#[\da-f]{6}$/i.test(reading)) channels = reading.slice(1).match(/../g).map(value => parseInt(value, 16))
  else {
    const match = /^(rgba?|color\(srgb)\s*\(?([\d.,%\s/+-]+)\)$/.exec(reading)
    if (!match) throw new Error('Cannot derive a color from ' + reading)
    const values = match[2].trim().split(/\s*[,/]\s*|\s+/)
    channels = values.slice(0, 3).map(value => value.endsWith('%') ? parseFloat(value) * 255 / 100 :
      Number(value) * (match[1].startsWith('color') ? 255 : 1))
    if (values.length === 4) alpha = values[3].endsWith('%') ? parseFloat(values[3]) / 100 : Number(values[3])
  }
  if (channels.length !== 3 || channels.some(value => !Number.isFinite(value) || value < 0 || value > 255) || !Number.isFinite(alpha)) {
    throw new Error('Cannot derive a color from ' + reading)
  }
  const amount = Math.min(.6, steps * .12)
  const target = direction > 0 ? 255 : 0
  const next = channels.map(channel => Math.round(channel + (target - channel) * amount))
  return alpha === 1 ? '#' + next.map(channel => channel.toString(16).padStart(2, '0')).join('') : `rgba(${next.join(', ')}, ${alpha})`
}

function flagsFor({ on, state, when, mode, only, except }) {
  return [...(on ? ['--on', on] : []), ...(when ?? []).flatMap(condition => ['--when', condition]),
    ...(state ? ['--state', state] : []), ...(mode ? ['--mode', mode] : []), ...(only ? ['--only'] : []),
    ...(except ?? []).flatMap(part => ['--except', part])]
}

function availableModes(theme, { mode, on }) {
  validateThemeEditorMode(theme, mode, on)
  return mode ? [mode] : themeEditorModes(theme)
}

function relatedProperty(library, on, property) {
  const target = library.brandRuleTargets[on]
  if (!target) return
  if (!property) return target.properties
  return Object.hasOwn(target.properties, property) || Object.hasOwn(target.tokenProperties ?? {}, property) || library.brandRuleTokens(on).includes(property)
}

function comparisonScope(library, scope) {
  const { on, when = [], state = 'rest', mode } = scope
  const target = library.brandRuleTargets[on]
  const conditions = themeConditions(when)
  const variant = target.variants?.variant?.values.find(value => ['primary', 'default'].includes(value))
  if (variant && !conditions.variant) conditions.variant = variant
  if (target.variants?.size?.values.includes('md') && !conditions.size) conditions.size = 'md'
  if (target.variants?.elevation?.values.includes('none') && !conditions.elevation) conditions.elevation = 'none'
  return { when: conditions, state, mode }
}

function computedValue(details) {
  if (details?.value !== undefined) return details.value
  const values = Object.values(details?.longhands ?? {}).map(value => value.value ?? value).filter(value => typeof value === 'string')
  return values.length ? values.join(' ') : undefined
}

function relativeValue(action, reading) {
  const { property, direction, delta, steps = 1, transparency } = action
  if (transparency !== undefined) return `color-mix(in srgb, ${reading} ${100 - transparency}%, transparent)`
  if (direction === 0) return property === 'border-radius' && /^[-.\d]+px\s+[-.\d]+px$/.test(reading) ? reading.replace(' ', ' / ') : reading
  if (paint(property)) return adjustedColor(reading, direction, steps)
  if (!geometry.test(property)) throw new Error('Provide an exact value for ' + property)
  if (delta && !px.test(delta)) throw new Error('Use a pixel amount for a relative change')
  const amounts = reading.split(/\s+/).filter(value => value !== '/')
  if (!amounts.length || !amounts.every(value => px.test(value))) throw new Error('Use an exact value when the measured value is ' + reading)
  if (property === 'border-radius' && direction > 0 && amounts.every(value => Number(px.exec(value)[1]) >= 999)) return reading
  const offset = direction * (delta ? Number(px.exec(delta)[1]) : steps * (['border-width', 'outline-width'].includes(property) ? 1 : 2))
  const values = amounts.map(value => `${Math.max(0, Math.round((Number(px.exec(value)[1]) + offset) * 100) / 100)}px`)
  return property === 'border-radius' && values.length === 2 ? values.join(' / ') : values.join(' ')
}

function changeKey({ property, scope }) {
  return JSON.stringify([property, scope.on, scope.mode, scope.state, themeConditions(scope.when)])
}

const editValueKey = ({ value, scope }) => JSON.stringify([value, [...(scope.except ?? [])].sort()])

export async function answerThemeQuestion(library, directory, registered, plan, { effective, themeChosenBy, createFrom, builtIn, history = [] }) {
  const { themePartReport, themePartChanges } = await import('./theme-part-report.mjs')
  const refused = [...plan.unsupported], steps = [], lookups = [], alternatives = []
  const inkGuards = plan.constraints.filter(guard => guard.kind === 'text-color')
  const lookupCache = new Map()
  let theme = registered
  let effectiveTheme = await effective(registered)
  const mode = scope => availableModes(effectiveTheme, scope)
  const memberScope = (scope, { target, state, when }) => ({ ...scope, on: target, state,
    when: Object.entries(when ?? {}).map(([axis, value]) => axis + ':' + value) })
  const bans = (property, appearance) => inkGuards.filter(guard => guard.property === property &&
    (!guard.scope.mode || guard.scope.mode === appearance)).map(guard => guard.value)
  const inspect = (on, scope, property, oneSample) => {
    const properties = property ? [property] : undefined
    const options = oneSample ? comparisonScope(library, { ...scope, on }) : {
      when: themeConditions(scope.when), mode: scope.mode, state: scope.state ?? 'rest',
    }
    if (options.state !== 'rest') options.state = library.normalizeBrandRule({
      target: on, when: options.when, state: options.state, declarations: {},
    }).state
    const base = library.createBrandTheme('part-baseline', 'Base theme', effectiveTheme.design?.base === 'none' ? 'morandi' : effectiveTheme.design?.base)
    const revision = effectiveTheme.revision
    const key = JSON.stringify([revision, on, options, properties])
    if (!lookupCache.has(key)) lookupCache.set(key, themePartReport(directory, library, effectiveTheme, base, on, { ...options, properties }))
    return lookupCache.get(key)
  }

  async function lookup({ property, scope, clause }) {
    const modes = mode(scope)
    if (!scope.on) {
      const design = effectiveTheme.design
      const dial = Object.hasOwn(editorDials, property) && { dial: property, choices: editorDials[property], value: {
        ...editorMotionSettings(effectiveTheme), corners: effectiveTheme.radius, spacing: effectiveTheme.spacing,
        'text-size': effectiveTheme.fontSize, 'border-width': effectiveTheme.borderWidth, font: effectiveTheme.font,
        base: design?.base ?? 'morandi', mode: design?.appearance ?? 'both', surfaces: design?.surfaces, buttons: design?.buttons, badges: design?.badges,
        headings: { weight: design?.headingWeight, tracking: design?.headingTracking },
        name: effectiveTheme.name, shadow: effectiveTheme.shadow, vibrancy: design?.palette?.vibrancy ?? 50,
      }[property] }
      const aspect = Object.hasOwn(themeAspects, property) && themeAspects[property]
      if (aspect) return { aspect: property, ...dial, dials: aspect.dials,
        tokens: [...new Set([...Object.keys(library.resolveThemeTokens()), ...themeEditorTokenNames(library)])].filter(token => aspect.tokens.test(token)),
        properties: [...new Set(Object.values(library.brandRuleTargets).flatMap(target => Object.keys(target.properties)))]
          .filter(name => aspect.properties.test(name)).sort(), clause }
      if (dial) return { ...dial, ...(property === 'border-width' && {
        values: Object.fromEntries(modes.map(mode => [mode, library.resolveThemeTokens(effectiveTheme, { mode })[borderWidthToken]])),
      }), clause }
      const parts = themePropertyParts(library, property)
      if (parts.length) return { property, parts, clause }
      const { values: resolved, ...details } = (await themeTokenDetails(library, [property], effectiveTheme))[property]
      const values = Object.fromEntries(modes.flatMap(appearance => resolved[appearance] === undefined ? [] : [[appearance, resolved[appearance]]]))
      if (!Object.keys(values).length && !details.partCount && !details.usedInStylesheet) throw new Error('Unknown theme token ' + property)
      return { token: property, ...details, values, clause }
    }
    const group = Object.hasOwn(plan.groups, scope.on) && plan.groups[scope.on]
    const targets = group || [scope.on]
    const unqualified = !scope.state && !scope.when?.length && !scope.mode
    if (group && !property && unqualified) {
      const shared = scope.on === 'inputs' ? ['field', ...themeInputTargets] : scope.on === 'checks' ? targets : undefined
      const memberScopes = themeEditorGroupScopes(library, scope.on, {})
        .flatMap(({ target, when, state }) => when || state ? [{ part: target, when, state }] : [])
      return { group: scope.on, parts: targets, scope: '--on ' + scope.on, ...(shared && { shared, separate: '--only' }),
        ...(memberScopes.length && { memberScopes }), clause }
    }
    if (group) {
      const members = themeEditorGroupScopes(library, scope.on, { ...scope, when: themeConditions(scope.when) }, property)
      if (!members.length) throw new Error('No part in ' + scope.on + ' supports that property and scope')
      const parts = []
      for (const member of members) parts.push(await lookup({ property, scope: memberScope(scope, member), clause }))
      return { group: scope.on, parts, clause }
    }
    if (!property && unqualified) {
      return { ...themePartCapabilities(library, targets[0]), clause }
    }
    const part = targets[0]
    if (!relatedProperty(library, part, property)) throw new Error(`${part} does not expose ${property}`)
    const readings = []
    for (const appearance of modes) {
      const report = await inspect(part, { ...scope, mode: appearance }, property, false)
      const seen = new Map()
      const samples = report.modes[appearance] ?? report.media?.[appearance] ?? []
      for (const sample of samples) {
        const details = property ? sample.styles[property] : sample.styles
        const value = property ? computedValue(details) : details
        if (value === undefined) continue
        const key = JSON.stringify(value)
        const existing = seen.get(key)
        if (existing) existing.samples++
        else seen.set(key, { value, when: sample.when, state: sample.state, source: property ? details.source : 'computed', samples: 1 })
      }
      readings.push({ mode: appearance, ...(!report.modes[appearance] && report.media?.[appearance] && { surface: 'media' }), values: [...seen.values()] })
    }
    return { part, property, readings, clause, command: themeEditorCommand(['show', theme.id, ...flagsFor({ ...scope, on: part, only: false })]) }
  }

  async function suggestion(action) {
    const { scope, property } = action
    mode(scope)
    if (action.kind === 'restore') {
      const record = { clause: action.clause, property, scope }
      const rule = library.normalizeBrandRule({ target: scope.on, when: themeConditions(scope.when), state: scope.state,
        mode: scope.mode, declarations: { display: 'none' } })
      const report = await inspect(scope.on, scope, 'display', false)
      if (!Object.values(report.modes).flat().some(sample => sample.styles.display.value === 'none')) {
        return { ...record, status: 'already-visible' }
      }
      const restored = themeEditorUndo(library, theme, history, property, { ...scope, expected: 'none' })
      const next = library.defineBrandTheme({ ...restored.theme, revision: theme.revision + 1 })
      const rendered = await effective(next)
      const [check] = await themePartChanges(directory, library, effectiveTheme, rendered, [rule], property, 'styles')
      if (!check.reaches?.some(sample => sample.values.display?.before === 'none' && sample.values.display.after !== 'none')) {
        throw new Error(`The recorded hide on ${scope.on} is overridden in this scope.`)
      }
      theme = next
      effectiveTheme = rendered
      return { ...record, command: themeEditorCommand(['undo', theme.id, property, ...flagsFor(scope)]), validation: 'rendered' }
    }
    if (builtIn) throw new Error(`Create a local theme to edit ${theme.id}.`)
    if (action.kind === 'heading-scale') return suggestHeadingScale(action)
    if (action.kind === 'copy') {
      const record = { clause: action.clause, property, value: action.value, scope }
      const { planThemeVariantCopy } = await import('./theme-variant-copy.mjs')
      try {
        const copied = await planThemeVariantCopy(library, directory, theme, action.value, scope, effective)
        theme = copied.result
        effectiveTheme = await effective(theme)
        return { ...record, command: themeEditorCommand(['set', theme.id, property, action.value, ...flagsFor(scope)]),
          validation: 'rendered', appearanceCopy: copied.match }
      } catch (error) {
        if (error.code === 'ERR_THEME_NO_EFFECT') return { ...record, status: 'already-applied-or-overridden' }
        throw error
      }
    }
    if (action.kind === 'shadow') {
      const record = { clause: action.clause, property, value: action.value, scope }
      try {
        const planned = scope.except?.length
          ? await (await import('./theme-exceptions.mjs')).planThemeExceptions(library, directory, theme, property, action.value, scope, effective)
          : await (await import('./theme-shadows.mjs')).themeShadowEdits(library, directory, theme, property, action.value, scope, effective)
        theme = planned.result
        effectiveTheme = await effective(theme)
        return { ...record, command: themeEditorCommand(['set', theme.id, property, action.value, ...flagsFor(scope)]),
          validation: 'rendered', ...(planned.preservation && { preservation: planned.preservation }) }
      } catch (error) {
        if (error.code === 'ERR_THEME_NO_EFFECT') return { ...record, status: 'already-applied-or-overridden' }
        throw error
      }
    }
    const value = action.kind === 'relative' ? await measuredRelative(action) : action.value
    const mediaOnly = scope.mode && !themeEditorModes(effectiveTheme).includes(scope.mode) && themePartSupportsMedia(scope.on)
    const editingScope = { ...scope, ...(scope.state === 'rest' && { state: undefined }), ...(mediaOnly && { only: true }) }
    const record = { clause: action.clause, property, value, scope: editingScope }
    if (!scope.on && mode(scope).some(appearance => bans(property, appearance).includes(value))) {
      throw new Error(`The requested ${property} value ${value} conflicts with a text color restriction in this question.`)
    }
    if (editingScope.except?.length) {
      const { planThemeExceptions } = await import('./theme-exceptions.mjs')
      try {
        const planned = await planThemeExceptions(library, directory, theme, property, value, editingScope, effective)
        theme = planned.result
        effectiveTheme = await effective(theme)
        return { ...record, validation: 'rendered', preservation: planned.preservation,
          command: themeEditorCommand(['set', theme.id, property, value, ...flagsFor(editingScope)]) }
      } catch (error) {
        if (error.code === 'ERR_THEME_NO_EFFECT') return { ...record, status: 'already-applied-or-overridden' }
        throw error
      }
    }
    const current = Object.hasOwn(editorMotionSettings(theme), property) ? effectiveTheme : theme
    const changes = themeEditorChange(library, current, property, value, editingScope)
    const patched = library.applyBrandPatch(theme, { revision: theme.revision, changes })
    const next = await effective(patched)
    const fields = themeEditorEntry(property, editingScope, effectiveTheme, next, changes).fields
    const colorToken = !scope.on && property.startsWith('--sy-') && library.brandColors.includes(property.slice(5))
    const sameColor = colorToken && mode(scope).every(mode => library.resolveThemeTokens(effectiveTheme, { mode })[property] ===
      library.resolveThemeTokens(next, { mode })[property])
    if (!fields.length || sameColor || action.kind === 'relative' && action.direction > 0 && property === 'border-radius' && value === '999px') {
      return { ...record, status: 'already-applied-or-overridden' }
    }
    let validation = 'theme-configuration'
    const scopes = changes.flatMap(edit => edit.type === 'rule' ? [edit.value] : edit.type === 'part'
      ? [{ target: edit.key, mode: edit.mode, state: editingScope.state }] : [])
    const sharedHeight = property === 'height' && changes.some(edit => edit.type === 'settings')
    if (scopes.length && !sharedHeight) {
      const part = library.brandRuleTargets[scopes[0].target]
      const comparison = part.textSize && (property === 'font-size' || property === part.textSize.token) ? 'font-size'
        : paint(property) || property === 'button-style' || property.startsWith('--sy-') && !part.tokenProperties?.[property] && !library.brandTypedTokens[property] ? 'paint' : 'styles'
      const checks = await themePartChanges(directory, library, effectiveTheme, next, scopes, property, comparison)
      if (checks.length === scopes.length && checks.every(check => check.status === 'measured')) {
        if (checks.every(check => !check.reaches.length && !check.mediaReaches?.length)) return { ...record, status: 'already-applied-or-overridden' }
        validation = 'rendered'
      }
    }
    const args = ['set', theme.id, property, value, ...flagsFor(editingScope)]
    theme = patched
    effectiveTheme = next
    return { ...record, command: themeEditorCommand(args), validation }
  }

  async function suggestHeadingScale(action) {
    const { scope, property, value, types, clause } = action
    if (scope.mode) throw new Error('Display heading sizes apply in both color modes.')
    const exact = value && fontLength.exec(value)
    if (value && !exact) throw new Error('Use px, rem or em for a proportional display heading size.')
    const mode = themeEditorModes(effectiveTheme)[0]
    const report = await inspect('heading', { ...scope, mode }, property, false)
    const tokens = library.resolveThemeTokens(effectiveTheme, { mode })
    const defaults = library.resolveThemeTokens(undefined, { mode })
    const looks = types.map(type => {
      const sample = report.modes[mode].find(sample => sample.when.type === type)
      const reading = sample?.styles[property]
      const token = `--sy-${type}-size`
      const declared = reading?.declarations.find(declaration => declaration.property === property)?.value
      const source = declared?.startsWith('var(') ? reading.tokens.find(item => item.name === token)?.value : declared
      const fluid = Boolean(source && !fontLength.test(source))
      const fixed = fontLength.exec(tokens[token]) ?? fontLength.exec(defaults[token])
      const before = fluid && exact && fixed ? Number(fixed[1]) * (fixed[2] === 'px' ? 1 : 16) : parseFloat(reading?.value)
      return { type, fluid, before, source }
    })
    const anchor = looks[0].before
    if (exact && !(anchor > 0)) throw new Error('The first display heading has no measurable font size.')
    const steps = []
    const skipped = []
    for (const { type, before, fluid, source } of looks) {
      if (!(before > 0) || fluid && !exact) {
        skipped.push({ type, reason: fluid ? 'Responsive size' : 'No measurable font size', ...(source && { value: source }) })
        continue
      }
      const size = exact ? type === types[0] ? value : Number((Number(exact[1]) * before / anchor).toFixed(4)) + exact[2]
        : relativeValue(action, before + 'px')
      const setting = await suggestion({ kind: 'set', property, value: size, clause, scope: { ...scope, when: [...(scope.when ?? []), 'type:' + type] } })
      steps.push({ type, before, ...setting })
    }
    const commands = steps.flatMap(step => step.command ?? [])
    return { clause, scope, property, sizes: steps, commands, ...(skipped.length && { skipped }),
      ...(exact && { anchor: { type: types[0], before: anchor, value }, preservesScale: true }),
      ...(commands.length && { validation: steps.every(step => !step.command || step.validation === 'rendered') ? 'rendered' : 'theme-configuration' }) }
  }

  async function measuredRelative(action) {
    const measuring = action.property === borderWidthToken ? { ...action, property: 'border-width' } : action
    if (action.referenceValue) return relativeValue(measuring, action.referenceValue)
    const source = action.reference ?? action.scope
    if (!source.on && action.property === borderWidthToken) {
      const width = library.resolveThemeTokens(effectiveTheme, { mode: mode(source)[0] })[borderWidthToken]
      return relativeValue(measuring, width === '0' ? '0px' : width)
    }
    if (!source.on && library.brandColors.includes(action.property.replace(/^--sy-/, ''))) {
      const tokens = library.resolveThemeTokens(effectiveTheme, { mode: mode(source)[0] })
      return adjustedColor(tokens[action.property], action.direction, action.steps ?? 1)
    }
    const members = themeEditorGroupScopes(library, source.on, { ...source, when: themeConditions(source.when) }, measuring.property)
    const reference = members ? members[0] && memberScope(source, members[0]) : source
    const on = reference?.on
    const property = on === 'divider' && action.property === borderWidthToken ? borderWidthToken : measuring.property
    if (!on || !relatedProperty(library, on, property)) throw new Error('Name a reference part that supports ' + property)
    const appearance = mode(source)[0]
    const report = await inspect(on, { ...reference, mode: appearance }, property, true)
    const samples = report.modes[appearance] ?? report.media?.[appearance]
    const value = computedValue(samples?.[0]?.styles[property])
    if (!value) throw new Error('Cannot read ' + property + ' from ' + on)
    return relativeValue(measuring, value === '0' && action.property === borderWidthToken ? '0px' : value)
  }

  const exclusive = new Map()
  for (const action of plan.actions) {
    if (action.kind !== 'set' && action.kind !== 'shadow') continue
    try {
      const key = changeKey(action)
      const list = exclusive.get(key) ?? []
      list.push(action)
      exclusive.set(key, list)
    } catch (error) { refused.push({ clause: action.clause, reason: error.message }) }
  }
  const blocked = new Set()
  if (!plan.ordered) {
    for (const actions of exclusive.values()) {
      if (new Set(actions.map(editValueKey)).size < 2) continue
      const previous = theme, earlier = effectiveTheme
      const choices = []
      for (const action of actions) {
        blocked.add(action)
        try { choices.push(await suggestion(action)) }
        catch (error) { choices.push({ ...action, reason: error.message }) }
        theme = previous
        effectiveTheme = earlier
      }
      alternatives.push({ reason: 'Multiple values were requested for the same setting and scope.', choices })
    }
  }
  const seen = new Set()
  const editActions = plan.actions.filter(action => action.kind !== 'lookup' && !blocked.has(action))
  for (const action of editActions) {
    try {
      const key = changeKey(action) + '/' + editValueKey(action)
      if (plan.ordered && action.kind === 'set' && !editActions.some(other => ['relative', 'shadow'].includes(other.kind)) && exclusive.get(changeKey(action)).at(-1) !== action) continue
      if (!plan.ordered && ['set', 'shadow'].includes(action.kind) && seen.has(key)) continue
      seen.add(key)
      if (steps.length >= 12) {
        refused.push({ clause: action.clause, reason: 'Split requests of more than 12 edits into separate questions.' })
        break
      }
      const colorToken = action.property.startsWith('--sy-') && library.brandColors.includes(action.property.slice(5))
      const scopes = action.kind === 'relative' && (paint(action.property) || colorToken) && !action.scope.mode
        ? mode(action.scope).map(mode => ({ ...action.scope, mode })) : [action.scope]
      for (const scope of scopes) steps.push(await suggestion({ ...action, scope }))
    } catch (error) { refused.push({ clause: action.clause, reason: error.message }) }
  }
  for (const guard of inkGuards) {
    const { clause, scope, property, value } = guard
    try {
      const edits = []
      for (const appearance of mode(scope)) {
        const tokens = library.resolveThemeTokens(effectiveTheme, { mode: appearance })
        if (tokens[property] !== value) continue
        const opposite = appearance === 'dark' ? 'light' : 'dark'
        const candidates = [library.resolveThemeTokens(undefined, { mode: appearance })[property],
          library.resolveThemeTokens(undefined, { mode: opposite })[property], '#010101', '#fefefe']
        const excluded = bans(property, appearance)
        const replacement = candidates.find(candidate => !excluded.includes(candidate) &&
          (library.colorContrast(candidate, tokens['--sy-canvas']) ?? 0) >= 4.5)
        if (!replacement) throw new Error(`Choose a text color that contrasts with the ${appearance} canvas.`)
        edits.push({ kind: 'set', property, value: replacement, scope: { mode: appearance }, clause })
      }
      for (const edit of edits) steps.push(await suggestion(edit))
      const unmet = mode(scope).find(appearance => library.resolveThemeTokens(effectiveTheme, { mode: appearance })[property] === value)
      if (unmet) throw new Error(`The ${unmet} theme source still overrides the requested text color.`)
      guard.status = edits.length ? 'adjusted' : 'satisfied'
    } catch (error) { refused.push({ clause, reason: error.message }) }
  }
  for (const action of plan.actions.filter(action => action.kind === 'lookup')) {
    try { lookups.push(await lookup(action)) }
    catch (error) { refused.push({ clause: action.clause, reason: error.message }) }
  }
  const edits = steps.flatMap(step => step.commands ?? step.command ?? [])
  const create = createFrom && themeEditorCommand(['new', theme.id, ...(createFrom === 'morandi' ? [] : ['--from', createFrom])])
  if (edits.length + Number(Boolean(create)) > 12) {
    refused.push({ clause: plan.request, reason: 'Split requests that need more than 12 commands into separate questions.' })
  }
  const complete = !refused.length && !alternatives.length
  const themeNote = {
    named: `Using the theme named with --theme: ${theme.id}.`,
    only: `Using the only local theme: ${theme.id}.`,
    'last-changed': `Using the theme changed most recently by the editor: ${theme.id}.`,
    active: `Using the active local theme: ${theme.id}.`,
    default: create ? `Create ${theme.id} before applying the edits.` : `Reading the default theme: ${theme.id}.`,
  }[themeChosenBy]
  return { request: plan.request, theme: theme.id, themeChosenBy, themeNote, steps, lookups, refused, alternatives,
    ...(plan.constraints.length && { constraints: plan.constraints }),
    ...(complete && edits.length && { commands: [...(create ? [create] : []), ...edits], sequence: edits.length > 1 || Boolean(create) }),
    ...(!complete && { hint: 'Resolve the unanswered or conflicting clauses before applying the full request.', run: [show] }),
  }
}
