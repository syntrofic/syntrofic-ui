<script setup lang="ts">
import { computed, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { CalendarDate } from '@internationalized/date'
import type { DateRange, DateValue } from 'reka-ui'
import { createToastManager } from 'reka-ui'
import { measureNavigationFit, type NavigationFitSample } from '../scripts/platform/navigation-fit.mjs'
import SBanner from '../src/components/SBanner.vue'
import SBadge from '../src/components/SBadge.vue'
import SBaseTypeahead from '../src/components/SBaseTypeahead.vue'
import SButton from '../src/components/SButton.vue'
import SCard from '../src/components/SCard.vue'
import SCheckbox from '../src/components/SCheckbox.vue'
import SCodeBlock from '../src/components/SCodeBlock.vue'
import SComboBox from '../src/components/SComboBox.vue'
import SContextMenu from '../src/components/SContextMenu.vue'
import SDatePicker from '../src/components/SDatePicker.vue'
import SDialog from '../src/components/SDialog.vue'
import SDisclosure from '../src/components/SDisclosure.vue'
import SDropdown from '../src/components/SDropdown.vue'
import SFileInput from '../src/components/SFileInput.vue'
import SHeading from '../src/components/SHeading.vue'
import SIcon from '../src/components/SIcon.vue'
import SInput from '../src/components/SInput.vue'
import SInputGroup from '../src/components/SInputGroup.vue'
import SInputGroupText from '../src/components/SInputGroupText.vue'
import SLabel from '../src/components/SLabel.vue'
import SLayerProvider from '../src/components/SLayerProvider.vue'
import SLayout from '../src/components/SLayout.vue'
import { SLayoutHeader } from '../src/internal/layout-regions'
import SListBox from '../src/components/SListBox.vue'
import SLightbox from '../src/components/SLightbox.vue'
import SMediaTheme from '../src/components/SMediaTheme.vue'
import SMenu from '../src/components/SMenu.vue'
import SMenuCheckboxItem from '../src/components/SMenuCheckboxItem.vue'
import SMenuItem from '../src/components/SMenuItem.vue'
import SMenuSubmenu from '../src/components/SMenuSubmenu.vue'
import SMotionText from '../src/components/SMotionText.vue'
import SNavbar from '../src/components/SNavbar.vue'
import SPagination from '../src/components/SPagination.vue'
import SPopover from '../src/components/SPopover.vue'
import SProgressBar from '../src/components/SProgressBar.vue'
import SRadio from '../src/components/SRadio.vue'
import SRadioGroup from '../src/components/SRadioGroup.vue'
import SRangeCalendar from '../src/components/SRangeCalendar.vue'
import SSideNavHeading from '../src/components/SSideNavHeading.vue'
import SSwitch from '../src/components/SSwitch.vue'
import SSelect from '../src/components/SSelect.vue'
import SSeparator from '../src/components/SSeparator.vue'
import STable from '../src/components/STable.vue'
import STabs from '../src/components/STabs.vue'
import SToastProvider from '../src/components/SToastProvider.vue'
import SToggleButton from '../src/components/SToggleButton.vue'
import SToggleButtonGroup from '../src/components/SToggleButtonGroup.vue'
import SBrandTheme from '../src/components/SBrandTheme.vue'
import type { MenuEntry } from '../src/types'
import { brandThemeStyle, createBrandTheme, createStandardBrandTheme, exportBrandTheme, standardBrandNames, standardBrandPresets, type BrandDesign, type StandardBrandPreset } from '../src/platform/theme-workspace'
import { brandRuleKey, brandRuleStyle, resolveBrandThemeRules, type BrandComponentRule } from '../src/platform/brand-rules'
import { syntaxThemes } from '../src/internal/syntax-theme'
import ChartThemeDemo from './ChartThemeDemo.vue'
import BorderWidthDemo from './BorderWidthDemo.vue'
import ShadowDemo from './ShadowDemo.vue'
import FontRoleDemo from './FontRoleDemo.vue'
import deliveryArea from '../preview/assets/delivery-area.png'
import { copyText } from './clipboard'
import { revealSiteContent } from './motion'

const colors = [
  { name: '灰绿', value: '#425849', light: '#a8bda9', hover: '#354b3c', lightHover: '#bed0bd' },
  { name: '雾蓝', value: '#365975', light: '#afc9de', hover: '#294660', lightHover: '#c4d9e8' },
  { name: '灰紫', value: '#624d73', light: '#cdb8df', hover: '#4e3a60', lightHover: '#ddc9ed' },
  { name: '陶土', value: '#775149', light: '#debbb0', hover: '#653e36', lightHover: '#edd0c6' },
]
type ThemeChoice = 'morandi' | StandardBrandPreset
type SyntaxChoice = keyof typeof syntaxThemes
const presets: { value: ThemeChoice; label: string }[] = [
  { value: 'morandi', label: 'Syntrofic 标准' }, ...standardBrandPresets.map(value => ({ value, label: standardBrandNames[value] })),
]
const preset = ref<ThemeChoice>('morandi')
const syntax = ref<SyntaxChoice>('standard')
const syntaxOptions = Object.entries(syntaxThemes).map(([value, theme]) => ({ value, label: theme.name }))
const badgeOptions = [{ value: 'soft', label: '柔和' }, { value: 'solid', label: '实心' }, { value: 'outline', label: '描边' }] as const
const badge = ref<NonNullable<BrandDesign['badges']>>('soft')
const heights = [{ value: 'default', label: '组件默认' }, { value: '36', label: '36 px' }, { value: '48', label: '48 px' }, { value: '56', label: '56 px' }]
const controlHeight = ref('default')
const visibility = [{ value: 'team', label: '团队可见' }, { value: 'private', label: '仅自己' }]
const audience = ref('team')
const notificationOptions = [
  { value: 'summary', label: '每日摘要', description: '将交付更新汇总成一条消息' },
  { value: 'instant', label: '即时提醒', description: '每次发布后发送提醒' },
]
const notification = ref('summary')
const applyPadding = ref(false)
const applyCardSurface = ref(false)
const applyChartColor = ref(false)
const paginationFrame = ref(false)
const paginationFill = ref(false)
const paginationCorners = ref(false)
const currentPage = ref(4)
const floatingDark = ref(false)
const markupDark = ref(false)
const floatingTheme = {
  ...createBrandTheme('floating-example', '局部浮层', 'neutral'),
  rules: {
    'popover-both-base': { target: 'popover', declarations: { border: '1px solid #b9b9b9', '--sy-radius-md': '22px' } },
    'menu-item-both-base': { target: 'menu-item', declarations: { 'padding-inline': '18px' } },
  } satisfies Record<string, BrandComponentRule>,
}
const markupTheme = {
  ...createBrandTheme('markup-example', 'CSS 局部浮层', 'neutral'),
  rules: {
    'popover-both-base': { target: 'popover', declarations: { 'border-radius': '12px' } },
    'popover-light-base': { target: 'popover', mode: 'light', declarations: { '--sy-canvas': '#f7f7f7' } },
    'popover-dark-base': { target: 'popover', mode: 'dark', declarations: { '--sy-canvas': '#292929' } },
    'menu-item-both-base': { target: 'menu-item', declarations: { 'padding-inline': '22px' } },
  } satisfies Record<string, BrandComponentRule>,
}
const markupCss = exportBrandTheme(markupTheme)['theme.css']
const cardSurfaces = (['light', 'dark'] as const).map<BrandComponentRule>(mode => ({
  target: 'card', when: { variant: 'muted', elevation: 'low' }, mode,
  declarations: { '--sy-surface-muted': mode === 'light' ? '#ededed' : '#3a3a3a' },
}))
const padding = (['select', 'file-input'] as const).map<BrandComponentRule>(target => ({
  target, declarations: { padding: '24px 20px' },
}))
const typographyOptions = [{ value: 'default', label: '组件默认' }, { value: '18px', label: '18 px' }, { value: '22px', label: '22 px' }]
const navigationTextSize = ref('default')
const navigationTabs = [{ value: 'overview', label: '概览' }, { value: 'activity', label: '活动' }]
const useTabLine = ref(false)
const useFullTabLabels = ref(false)
const indicatorTabs = computed(() => useFullTabLabels.value ? [
  { value: 'overview', label: '交付概览' }, { value: 'activity', label: '最近活动' },
] : navigationTabs)
const navigationCurrent = ref('files')
const expandNavigationLabel = ref(false)
const selectionItems = computed(() => [
  { id: 'overview', label: '概览', icon: 'viewColumns', iconOnly: true },
  { id: 'files', label: expandNavigationLabel.value ? '交付文件' : '文件', icon: 'file' },
  { id: 'activity', label: '活动', icon: 'calendar' },
])
const navigationWidths = [
  { value: '100%', label: '完整宽度' },
  { value: '330px', label: '自动换行' },
  { value: '225px', label: '紧凑菜单' },
]
const navigationWidth = ref('100%')
const projectSearch = ref('')
const projects = ['品牌指南', '交付记录', '组件文档']
const matchingProjects = computed(() => projects.filter(project => project.includes(projectSearch.value.trim())).join('、') || '没有匹配的项目')
const headerLayouts = [
  { value: 'shared', label: '共享头部尺寸' },
  { value: 'height', label: '头部高度不同' },
  { value: 'padding', label: '头部内边距不同' },
  { value: 'row', label: '单独设置导航行' },
  { value: 'short', label: '导航项超出高度' },
  { value: 'padding-overflow', label: '导航项内边距过大' },
  { value: 'padding-repair', label: '收紧导航项内边距' },
  { value: 'states', label: '悬停与键盘焦点' },
]
const headerLayout = ref('shared')
const navigationItems = [{ id: 'reviews', label: '评审', href: '/examples/' }]
const navigationSample = useTemplateRef<HTMLElement>('navigationSample')
const navigationFit = shallowRef<NavigationFitSample>()
const fitIssue = computed(() => navigationFit.value?.issues.reduce<NavigationFitSample['issues'][number] | undefined>((largest, issue) =>
  !largest || issue.height - issue.available > largest.height - largest.available ? issue : largest, undefined))
const fitMessage = computed(() => {
  const fit = navigationFit.value
  if (!fit) return '正在测量导航行…'
  const pixels = (size: number) => Math.round(size * 10) / 10 + ' px'
  const issue = fitIssue.value
  return issue ? `可用 ${pixels(issue.available)} · ${issue.label || '导航行'}需要 ${pixels(issue.height)}`
    : `导航行可用 ${pixels(fit.available)}`
})
const navigationSizeProperty = /^(?:height|minHeight|blockSize|minBlockSize|padding.+|border.*Width|fontSize|lineHeight|letterSpacing)$/
watch(navigationSample, (sample, _, cleanup) => {
  const view = sample?.ownerDocument.defaultView
  if (!sample || !view) return
  let frame = 0
  let disposed = false
  let waiting = false
  const measure = () => {
    if (disposed || frame || waiting) return
    frame = view.requestAnimationFrame(() => {
      frame = 0
      const active = sample.getAnimations({ subtree: true }).filter(animation => animation.playState !== 'finished'
        && (animation.effect as KeyframeEffect | null)?.getKeyframes().some(key =>
          Object.keys(key).some(property => navigationSizeProperty.test(property))))
      if (!active.length) {
        navigationFit.value = measureNavigationFit(sample)[0]
        return
      }
      // Publish one reading after the header has reached its new size.
      waiting = true
      void Promise.allSettled(active.map(animation => animation.finished)).then(() => {
        waiting = false
        measure()
      })
    })
  }
  const observer = new ResizeObserver(measure)
  for (const element of sample.querySelectorAll('.sy-layout-header, .sy-navbar__bar, .sy-navbar__bar .sy-navigation-link')) {
    observer.observe(element)
  }
  measure()
  cleanup(() => {
    disposed = true
    observer.disconnect()
    view.cancelAnimationFrame(frame)
  })
}, { flush: 'post' })
const headerRules = computed(() => {
  const short = headerLayout.value === 'short'
  const states = headerLayout.value === 'states'
  const paddingExample = headerLayout.value === 'padding-overflow' || headerLayout.value === 'padding-repair'
  const rules: BrandComponentRule[] = [
    { target: 'app-shell-header', declarations: {
      height: short || paddingExample ? '2.5rem' : states ? '48px' : '68px',
      'padding-block': paddingExample ? '0px' : short ? '0.375rem' : '4px',
    } },
  ]
  if (headerLayout.value === 'height' || headerLayout.value === 'padding') {
    rules.push({ target: 'layout-header', declarations: {
      height: headerLayout.value === 'height' ? '76px' : '68px',
      'padding-block': headerLayout.value === 'padding' ? '8px' : '4px',
    } })
  }
  if (headerLayout.value === 'row') rules.push({ target: 'top-nav', declarations: { height: '54px', 'padding-block': '2px' } })
  if (short) rules.push({ target: 'top-nav-item', declarations: { 'min-height': '3rem' } })
  if (paddingExample) rules.push({ target: 'top-nav-item', declarations: {
    'line-height': '19px', padding: '16px 10px', ...(headerLayout.value === 'padding-repair' && { 'padding-block': '10.5px' }),
  } })
  if (states) rules.push(
    { target: 'top-nav-item', state: 'hover', declarations: { height: '3rem' } },
    { target: 'top-nav-item', state: 'focus-visible', declarations: { height: '3.5rem', 'padding-inline': '14px' } },
    { target: 'top-nav-item', state: 'active', declarations: { height: '2.75rem' } },
  )
  return Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule]))
})
const stageOptions = [
  { value: 'draft', label: '准备材料', description: '整理设计稿与组件清单' },
  { value: 'review', label: '发送评审', description: '邀请团队核对交付资料' },
  { value: 'publish', label: '正式发布', description: '通过评审后开放', disabled: true },
]
const reviewStage = ref('draft')
const stageSearchId = useId()
const highContrastRows = ref(false)
const applyFieldText = ref(false)
const applyFieldSurface = ref(false)
const fieldText: BrandComponentRule[] = (['light', 'dark'] as const).map(mode => ({
  target: 'input-group', mode, declarations: { '--sy-text-muted': mode === 'light' ? '#624d73' : '#dbc4eb' },
}))
const fieldSurface: BrandComponentRule[] = (['light', 'dark'] as const).map(mode => ({
  target: 'input-group', mode, declarations: { 'background-color': mode === 'light' ? 'rgba(66, 88, 73, 0.16)' : 'rgba(168, 189, 169, 0.18)' },
}))
const optionHighlight = (['selector-option-row', 'typeahead-option', 'combobox-option', 'menu-item', 'listbox-option'] as const).map<BrandComponentRule>(target => ({
  target, state: 'highlighted', declarations: { color: '#ffffff', 'background-color': '#334b3b' },
}))
const paginationRules = computed(() => {
  const rules: BrandComponentRule[] = []
  if (paginationFrame.value) rules.push({ target: 'pagination', declarations: { border: '1px solid var(--sy-border)', 'border-radius': '16px' } })
  if (paginationFill.value) rules.push({ target: 'pagination', declarations: { 'background-color': 'light-dark(#f5f5f5, #393939)' } })
  if (paginationCorners.value) rules.push({ target: 'pagination-item', declarations: { 'border-radius': '8px' } })
  return rules
})
const reduceMotion = ref(false)
const brand = computed(() => {
  const base = preset.value === 'morandi' ? createBrandTheme('theme-preview', '主题预览') : createStandardBrandTheme(preset.value)
  const height: Record<string, string> = controlHeight.value === 'default' ? {} : { '--sy-control-height-md': controlHeight.value + 'px' }
  const typography = navigationTextSize.value === 'default' ? [] :
    (['top-nav-heading', 'side-nav-heading', 'tab-list'] as const).map<BrandComponentRule>(target => ({
      target, declarations: { 'font-size': navigationTextSize.value },
    }))
  const adjustments = [...(applyPadding.value ? padding : []), ...typography, ...paginationRules.value, ...(highContrastRows.value ? optionHighlight : []),
    ...(applyFieldText.value ? fieldText : []), ...(applyFieldSurface.value ? fieldSurface : []), ...(applyCardSurface.value ? cardSurfaces : [])]
  const rules: Record<string, BrandComponentRule> = {}
  for (const rule of adjustments) {
    const key = brandRuleKey(rule)
    rules[key] = { ...rule, declarations: { ...rules[key]?.declarations, ...rule.declarations } }
  }
  const modes = applyChartColor.value ? {
    light: { ...base.modes.light, 'data-categorical-sage': '#546b98' },
    dark: { ...base.modes.dark, 'data-categorical-sage': '#adbee6' },
  } : base.modes
  return { ...base, modes, rules, design: { ...base.design, badges: badge.value, tokens: { ...base.design?.tokens, ...height } },
    syntax: syntaxThemes[syntax.value], motion: reduceMotion.value ? { ...base.motion, reducedMotion: 'always' as const } : base.motion }
})
const accent = ref<typeof colors[number]>()
const radius = ref(18)
const dark = ref(false)
const enabled = ref(true)
const saved = ref(false)
const copied = ref(false)
const theme = computed(() => dark.value ? 'dark' : 'light')
const applyButtonColors = ref(false)
const buttonColors: BrandComponentRule[] = (['light', 'dark'] as const).map(mode => ({
  target: 'button', state: 'hover', when: { variant: 'primary' }, mode,
  declarations: { '--sy-accent-hover': mode === 'light' ? '#344d64' : '#a6c5df' },
}))
const outlineDangerButton = ref(false)
const sampleRemoved = ref(false)
const dangerOutline: BrandComponentRule = { target: 'button', when: { variant: 'danger' }, declarations: { 'button-style': 'outline' } }
const buttonPreview = computed(() => {
  const rules = [...(applyButtonColors.value ? buttonColors : []), ...(outlineDangerButton.value ? [dangerOutline] : [])]
  return { ...brand.value, id: 'button-colors', design: { ...brand.value.design, buttons: 'solid' as const },
    rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
async function toggleSample(_event: MouseEvent, signal: AbortSignal) {
  await new Promise(resolve => setTimeout(resolve, 420))
  if (!signal.aborted) sampleRemoved.value = !sampleRemoved.value
}
const thinProgress = ref(false)
const customProgressColors = ref(false)
const progressPending = ref(false)
const progress = ref(32)
const progressPreview = computed(() => {
  const rules: BrandComponentRule[] = thinProgress.value ? [
    { target: 'progress-bar-track', declarations: { height: '4px' } },
  ] : []
  if (customProgressColors.value) {
    rules.push({ target: 'progress-bar-fill', when: { tone: 'accent' }, declarations: { 'background-color': 'light-dark(#365975, #a6c5df)' } },
      { target: 'progress-bar-sweep', when: { tone: 'accent' }, declarations: { 'background-color': 'light-dark(#624d73, #d8bfeb)' } })
  }
  return { ...brand.value, id: 'progress-style', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const customCalendarDays = ref(false)
const deliveryDate = shallowRef<DateValue>(new CalendarDate(2026, 11, 24))
const reviewDates = shallowRef<DateRange>({ start: new CalendarDate(2026, 11, 23), end: new CalendarDate(2026, 11, 27) })
const calendarPreview = computed(() => {
  const rules: BrandComponentRule[] = customCalendarDays.value ? [
    { target: 'calendar-day', state: 'selected', when: { context: 'picker' },
      declarations: { 'background-color': 'light-dark(#365975, #a6c5df)', color: 'light-dark(#ffffff, #202124)' } },
    { target: 'calendar-day', state: 'in-range', when: { variant: 'range' },
      declarations: { 'background-color': 'light-dark(#eceff2, #34383b)' } },
    { target: 'calendar-day', state: 'focus-visible',
      declarations: { 'outline-color': 'light-dark(#624d73, #d8bfeb)' } },
  ] : []
  return { ...brand.value, id: 'calendar-days', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const navigationPreview = computed(() => ({ ...brand.value, id: 'navigation-layout', rules: headerRules.value }))
const customChoiceInk = ref(false)
const includeAssets = ref(true)
const partiallyReview = ref(true)
const publishChannel = ref('preview')
const publishNotes = ref(false)
const saveChoice = () => new Promise<void>(resolve => setTimeout(resolve, 500))
const choicePreview = computed(() => {
  const rules: BrandComponentRule[] = customChoiceInk.value ? [
    { target: 'checkbox-indicator', state: 'checked', declarations: { color: 'light-dark(#fff0c0, #302347)' } },
    { target: 'checkbox-indicator', when: { checked: 'indeterminate' }, declarations: { color: 'light-dark(#f1e0ff, #332226)' } },
    { target: 'radio-indicator-dot', declarations: { 'background-color': 'light-dark(#365975, #a6c5df)' } },
    { target: 'switch-thumb', state: 'selected', declarations: { 'background-color': 'light-dark(#ffeecc, #24242a)' } },
    { target: 'switch-thumb', state: 'unchecked', declarations: { 'background-color': 'light-dark(#624d73, #d8bfeb)' } },
  ] : []
  return { ...brand.value, id: 'choice-indicators', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const customizeStatePairs = ref(false)
const pinDelivery = ref(false)
const lockAttachment = ref(false)
const includeAttachment = ref(true)
const asyncPin = ref(false)
const failAsyncPin = ref(false)
const asyncPinError = ref(false)
function saveAsyncPin(_value: boolean, _event: MouseEvent, signal: AbortSignal) {
  const fails = failAsyncPin.value
  asyncPinError.value = false
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); resolve() }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      if (fails) reject(new Error('保存失败'))
      else resolve()
    }, 800)
    signal.addEventListener('abort', cancel, { once: true })
  })
}
const combinationPreview = computed(() => {
  const rules: BrandComponentRule[] = customizeStatePairs.value ? [
    { target: 'toggle-button', state: 'hover', declarations: { 'background-color': 'light-dark(#edf2f5, #323c44)' } },
    { target: 'toggle-button', state: 'pressed', declarations: {
      'background-color': 'light-dark(#e2ece3, #3a4b3c)', color: 'light-dark(#294234, #e6efe8)',
    } },
    { target: 'toggle-button', state: 'hover+pressed', declarations: {
      'background-color': 'light-dark(#eae1f0, #4b3a55)', color: 'light-dark(#4e3a60, #f1e8f6)',
    } },
    { target: 'checkbox-indicator', state: 'checked', declarations: { color: 'light-dark(#fff0c0, #302347)' } },
    { target: 'checkbox-indicator', state: 'checked+disabled', declarations: { color: 'light-dark(#e8d7f6, #493155)' } },
  ] : []
  return { ...brand.value, id: 'combined-states', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const deliveryView = ref('list')
const customizeGroup = ref(false)
const verticalGroup = ref(false)
const groupPreview = computed(() => {
  const rules: BrandComponentRule[] = customizeGroup.value ? [
    { target: 'toggle-button-group', declarations: { gap: '6px' } },
    { target: 'toggle-button', state: 'grouped+pressed', declarations: {
      'background-color': 'light-dark(#e6ede7, #344339)', color: 'light-dark(#294234, #e6efe8)',
    } },
  ] : []
  return { ...brand.value, id: 'grouped-toggles', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const customIconInk = ref(false)
const emphasizeDialogTitle = ref(false)
const dialogName = ref('预览资料')
const iconDialog = ref(false)
const iconScope = ref('team')
const iconToastQueue = createToastManager()
function showIconToast() {
  iconToastQueue.add({ id: 'theme-icon-preview', title: '预览已保存', status: 'success', duration: 0 })
}
const iconPreview = computed(() => {
  const rules: BrandComponentRule[] = customIconInk.value ? [
    { target: 'button', when: { variant: 'secondary' }, declarations: { '--sy-button-icon-color': 'light-dark(#365975, #a6c5df)' } },
    { target: 'button', when: { variant: 'secondary' }, state: 'hover', declarations: { '--sy-button-icon-color': 'light-dark(#624d73, #cdb8df)' } },
    { target: 'selector-indicator-icon', declarations: { color: 'light-dark(#365975, #a6c5df)' } },
    { target: 'selector-indicator-icon', state: 'expanded', declarations: { color: 'light-dark(#624d73, #cdb8df)' } },
    { target: 'dialog-header-close-icon', declarations: { color: 'light-dark(#775149, #debbb0)' } },
    { target: 'toast-close', when: { tone: 'success' }, declarations: { color: 'light-dark(#365975, #a6c5df)' } },
    { target: 'toast-close', when: { tone: 'success' }, state: 'hover', declarations: { color: 'light-dark(#624d73, #cdb8df)' } },
  ] : []
  if (emphasizeDialogTitle.value) rules.push({ target: 'dialog-header-title-block', when: { variant: 'header' },
    declarations: { 'font-size': '22px', 'font-weight': '800', color: 'light-dark(#365975, #a6c5df)' } })
  return { ...brand.value, id: 'component-icons', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const customInputFocus = ref(false)
const darkInputFocus = ref(false)
const inputFocusPreview = computed(() => {
  const rules: BrandComponentRule[] = customInputFocus.value ? [
    { target: 'input-focus-ring', state: 'focus-visible', mode: 'light', declarations: { 'outline-color': '#365975' } },
    { target: 'input-focus-ring', state: 'focus-visible', mode: 'dark', declarations: { 'outline-color': '#a6c5df', 'outline-width': '1px' } },
    { target: 'input-focus-ring', state: 'focus-visible', mode: 'light', when: { status: 'error' },
      declarations: { 'outline-color': '#963630', 'outline-width': '3px' } },
    { target: 'input-focus-ring', state: 'focus-visible', mode: 'dark', when: { status: 'error' },
      declarations: { 'outline-color': '#f1aba3', 'outline-width': '3px' } },
  ] : []
  return { ...brand.value, id: 'input-focus-preview', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const compactMenus = ref(false)
const showMenuDividers = ref(true)
const emphasizeMenuDividers = ref(false)
const menuChoices = [{ value: 'mockups', label: '设计稿' }, { value: 'notes', label: '交付说明' }, { value: 'bundle', label: '资源包' }]
const menuEntries: MenuEntry[] = [
  { id: 'mockups', label: '设计稿' }, { id: 'section-break', kind: 'separator' },
  { id: 'notes', label: '交付说明' }, { id: 'bundle', label: '资源包' },
]
const menuDocument = ref('mockups')
const menuDocuments = ref(['mockups'])
const menuQueryId = useId()
function findMenuDocuments(query: string) {
  return menuChoices.filter(choice => choice.label.includes(query))
}
const menuPreview = computed(() => {
  const rules: BrandComponentRule[] = compactMenus.value ? [
    ...(['dropdown-menu', 'context-menu', 'selector-popup', 'multi-selector-popup', 'typeahead-dropdown'] as const).map<BrandComponentRule>(target => ({
      target, declarations: { 'background-color': 'var(--sy-surface-subtle)', 'border-radius': '4px 4px 10px 10px',
        ...(target === 'dropdown-menu' && { padding: '3px' }) },
    })),
    { target: 'typeahead-dropdown', when: { variant: 'search' }, declarations: { padding: '5px' } },
  ] : []
  if (!showMenuDividers.value || emphasizeMenuDividers.value) {
    rules.push({ target: 'dropdown-menu-divider', when: { context: 'dropdown' }, declarations: {
      ...(!showMenuDividers.value && { height: '0px' }),
      ...(emphasizeMenuDividers.value && { '--sy-border': 'light-dark(#afafaf, #777778)' }),
    } })
  }
  return { ...brand.value, id: 'menu-surface-preview', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const tabIndicatorPreview = computed(() => {
  const rule: BrandComponentRule = { target: 'tab-indicator', when: { orientation: 'horizontal', variant: 'line' },
    declarations: { height: '3px' } }
  return { ...brand.value, id: 'tab-indicator-preview', rules: { [brandRuleKey(rule)]: rule } }
})
const showCopyControl = ref(true)
const showBannerIcon = ref(true)
const showTabUnderline = ref(true)
const optionalTabs = [{ value: 'build', label: '构建' }, { value: 'preview', label: '预览' }]
const optionalPartsPreview = computed(() => {
  const rules: BrandComponentRule[] = []
  if (!showCopyControl.value) rules.push({ target: 'code-block-copy-button', declarations: { display: 'none' } })
  if (!showBannerIcon.value) rules.push({ target: 'banner-icon', declarations: { display: 'none' } })
  if (!showTabUnderline.value) rules.push({ target: 'tab-indicator', when: { variant: 'line' }, declarations: { display: 'none' } })
  return { ...brand.value, id: 'optional-parts', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const repairMediaContrast = ref(true)
const mediaPreview = computed(() => {
  const rules: BrandComponentRule[] = [
    { target: 'button', when: { variant: 'secondary' }, mode: 'dark', declarations: {
      background: 'linear-gradient(#ffffff, #dedede)', color: repairMediaContrast.value ? '#252525' : '#f1f1f1',
    } },
    { target: 'lightbox', mode: 'dark', declarations: { color: repairMediaContrast.value ? '#f1f1f1' : '#343434' } },
  ]
  return { ...brand.value, id: 'media-caption-preview', design: { ...brand.value.design, appearance: 'light-only' as const },
    rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const mediaExample = { id: 'delivery-area', src: deliveryArea, alt: '一周交付量面积图',
  caption: '周四的规范交付量最高。源文件交付量在周日达到本周峰值。' }
const tightenTable = ref(false)
const tableDividers = ref(false)
const tableRecords = [
  { id: 'design', title: '品牌规范', status: '已发布' },
  { id: 'components', title: '组件样张', status: '待评审' },
  { id: 'templates', title: '页面模板', status: '排期中' },
]
const tableColumns = [
  { key: 'title', label: '资料', sortable: true, value: (row: (typeof tableRecords)[number]) => row.title },
  { key: 'status', label: '进度', value: (row: (typeof tableRecords)[number]) => row.status },
]
const tablePreview = computed(() => {
  const rules: BrandComponentRule[] = [
    { target: 'table-row', declarations: { '--sy-border': 'var(--sy-border-strong)' } },
    ...(tightenTable.value ? [
      { target: 'table-header-cell', declarations: { padding: '2px 8px' } },
      { target: 'table-cell', declarations: { padding: '2px 8px' } },
    ] satisfies BrandComponentRule[] : []),
  ]
  return { ...brand.value, id: 'table-spacing', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const applyHeadingSize = ref(false)
const inheritedHeadings = Object.fromEntries(([
  { target: 'heading', when: { level: '3' }, declarations: { 'font-size': '26px' } },
  { target: 'heading', when: { level: '4' }, declarations: { 'font-size': '19px' } },
] satisfies BrandComponentRule[]).map(rule => [brandRuleKey(rule), rule]))
const localHeading: BrandComponentRule = { target: 'heading', when: { level: '4' }, declarations: { 'font-size': '16px' } }
const commonHeading: BrandComponentRule = { target: 'heading', declarations: { 'font-size': '20px' } }
const headingPreview = computed(() => ({ ...brand.value, id: 'heading-inheritance', inheritedRules: inheritedHeadings,
  rules: { ...inheritedHeadings, [brandRuleKey(localHeading)]: localHeading,
    ...(applyHeadingSize.value && { [brandRuleKey(commonHeading)]: commonHeading }) } }))
const tokens = computed(() => ({
  ...brandThemeStyle(brand.value, theme.value),
  ...(accent.value ? {
    '--sy-accent': dark.value ? accent.value.light : accent.value.value,
    '--sy-accent-hover': dark.value ? accent.value.lightHover : accent.value.hover,
    '--sy-accent-on': dark.value ? '#1d2520' : '#fffdf9',
  } : {}),
  '--sy-radius-md': radius.value + 'px',
  '--sy-button-radius': radius.value + 'px',
}))
const enlargeDisplayHeadings = ref(false)
const displayHeadingPreview = computed(() => {
  const sizes = { 'display-1': '60px', 'display-2': '45px', 'display-3': '35px' }
  const rules: BrandComponentRule[] = enlargeDisplayHeadings.value ? Object.entries(sizes).map(([type, size]) => ({
    target: 'heading', when: { type }, declarations: { 'font-size': size },
  })) : []
  return { ...brand.value, id: 'display-headings', rules: Object.fromEntries(rules.map(rule => [brandRuleKey(rule), rule])) }
})
const css = computed(() => {
  const selector = `[data-sy-theme='${theme.value}']`
  const variables = Object.entries(tokens.value).map(([key, value]) => `  ${key}: ${value};`).join('\n')
  const headingCss = applyHeadingSize.value
    ? brandRuleStyle(resolveBrandThemeRules(headingPreview.value).rules, '[data-sy-brand="heading-inheritance"]', theme.value) : ''
  const buttonCss = brandRuleStyle(buttonPreview.value.rules, '[data-sy-brand="button-colors"]', theme.value)
  const progressCss = brandRuleStyle(progressPreview.value.rules, '[data-sy-brand="progress-style"]', theme.value)
  const calendarCss = brandRuleStyle(calendarPreview.value.rules, '[data-sy-brand="calendar-days"]', theme.value)
  const choiceCss = brandRuleStyle(choicePreview.value.rules, '[data-sy-brand="choice-indicators"]', theme.value)
  const combinationCss = brandRuleStyle(combinationPreview.value.rules, '[data-sy-brand="combined-states"]', theme.value)
  const groupCss = brandRuleStyle(groupPreview.value.rules, '[data-sy-brand="grouped-toggles"]', theme.value)
  const displayHeadingCss = brandRuleStyle(displayHeadingPreview.value.rules, '[data-sy-brand="display-headings"]', theme.value)
  const optionalCss = brandRuleStyle(optionalPartsPreview.value.rules, '[data-sy-brand="optional-parts"]', theme.value)
  const iconCss = brandRuleStyle(iconPreview.value.rules, '[data-sy-brand="component-icons"]', theme.value)
  const menuCss = brandRuleStyle(menuPreview.value.rules, '[data-sy-brand="menu-surface-preview"]', theme.value)
  const navigationCss = brandRuleStyle(headerRules.value, '[data-sy-brand="navigation-layout"]', theme.value)
  return [`${selector} {\n${variables}\n}`, brandRuleStyle(brand.value.rules, selector, theme.value), buttonCss, progressCss, calendarCss, choiceCss, combinationCss, groupCss, iconCss, menuCss, headingCss,
    navigationCss, optionalCss, displayHeadingCss].filter(Boolean).join('\n\n')
})
const tokenPreview = useTemplateRef<HTMLElement>('tokenPreview')
watch(css, () => {
  if (tokenPreview.value) revealSiteContent(tokenPreview.value, 'theme-css')
}, { flush: 'post' })

function choose(value?: string) {
  const next = presets.find(item => item.value === value)?.value
  if (!next) return
  preset.value = next
  accent.value = undefined
  radius.value = brand.value.radius
}

function chooseSyntax(value?: string) {
  if (value && Object.hasOwn(syntaxThemes, value)) syntax.value = value as SyntaxChoice
}

function chooseBadge(value?: string) {
  const choice = badgeOptions.find(option => option.value === value)
  if (choice) badge.value = choice.value
}

async function copy() {
  copied.value = await copyText(css.value)
  if (copied.value) setTimeout(() => { copied.value = false }, 1600)
}
</script>

<template>
  <div class="theme-demo">
    <div class="theme-controls">
      <div class="theme-field-grid">
        <SSelect :model-value="preset" :options="presets" label="配色预设" @update:model-value="choose" />
        <SSelect :model-value="syntax" :options="syntaxOptions" label="代码配色" @update:model-value="chooseSyntax" />
        <SSelect :model-value="badge" :options="badgeOptions" label="徽标样式" @update:model-value="chooseBadge" />
        <SSelect v-model="controlHeight" :options="heights" label="控件高度" />
      </div>
      <fieldset>
        <legend>强调色</legend>
        <div class="swatches">
          <button v-for="color in colors" :key="color.value" type="button" :aria-label="color.name" :title="color.name"
            :aria-pressed="accent === color" :style="{ '--swatch': color.value }" @click="accent = color" />
        </div>
      </fieldset>
      <label class="radius-control">圆角 <output><SMotionText :value="`${radius} px`" motion="roll" /></output><input v-model.number="radius" type="range" min="4" max="30"></label>
      <div class="theme-toggles">
        <SSwitch v-model="dark">预览深色主题</SSwitch>
        <SSwitch v-model="reduceMotion">减少预览动效</SSwitch>
      </div>
    </div>
    <SBrandTheme :theme="brand" :mode="theme" class="theme-preview" :style="tokens" role="region" aria-label="主题预览">
      <div class="theme-settings">
        <h2>项目设置</h2>
        <div class="theme-badges" aria-label="状态徽标">
          <SBadge tone="accent">品牌</SBadge><SBadge tone="success">已确认</SBadge>
          <SBadge tone="warning">待评审</SBadge><SBadge tone="danger">需处理</SBadge>
        </div>
        <div class="theme-field-grid">
          <SInput label="项目名称" />
          <SSelect v-model="audience" label="可见范围" :options="visibility" />
        </div>
      </div>
      <SDisclosure title="按钮状态配色" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="applyButtonColors">应用主按钮悬停色</SSwitch>
            <SSwitch v-model="outlineDangerButton">危险按钮描边</SSwitch>
          </div>
          <SBrandTheme :theme="buttonPreview" :mode="theme" class="theme-badges" role="group" aria-label="按钮配色预览">
            <SButton>主按钮</SButton>
            <SButton variant="secondary">次按钮</SButton>
            <SButton variant="danger" :click-action="toggleSample"><SMotionText :value="sampleRemoved ? '恢复样例' : '移除样例'" /></SButton>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="进度条样式" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="thinProgress">细轨道</SSwitch>
            <SSwitch v-model="customProgressColors">分别配色</SSwitch>
            <SSwitch v-model="progressPending">加载中</SSwitch>
          </div>
          <SBrandTheme :theme="progressPreview" :mode="theme" class="theme-progress-samples" role="group" aria-label="进度条预览">
            <SProgressBar label="资料同步" :value="progress" :indeterminate="progressPending" />
            <SProgressBar label="已校验" tone="success" :value="76" />
          </SBrandTheme>
          <div><SButton size="sm" variant="secondary" @click="progress = progress === 32 ? 76 : 32">更新进度</SButton></div>
        </div>
      </SDisclosure>
      <SDisclosure title="选择控件标记" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="customChoiceInk">自定义控件标记</SSwitch>
          <SBrandTheme :theme="choicePreview" :mode="theme" class="theme-field-grid" role="group" aria-label="选择控件预览">
            <div class="theme-choice-options">
              <SCheckbox v-model="includeAssets" label="包含源文件" />
              <SCheckbox v-model:indeterminate="partiallyReview" label="复核附件" />
              <SSwitch v-model="publishNotes" label="发送发布提醒" :change-action="saveChoice" />
            </div>
            <SRadioGroup v-model="publishChannel" label="发布渠道">
              <SRadio value="preview" label="团队预览" :change-action="saveChoice" />
              <SRadio value="public" label="公开发布" :change-action="saveChoice" />
            </SRadioGroup>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="组合状态" variant="plain" class="theme-preview-section">
        <SBrandTheme :theme="combinationPreview" :mode="theme" class="theme-samples" role="group" aria-label="组合状态预览">
          <SSwitch v-model="customizeStatePairs">自定义组合状态</SSwitch>
          <div class="theme-sample-controls">
            <SToggleButton v-model="pinDelivery" label="固定交付资料" pressed-label="已固定交付资料" icon="plus" pressed-icon="check" />
            <SSwitch v-model="lockAttachment">锁定附件选项</SSwitch>
            <SCheckbox v-model="includeAttachment" label="包含交付附件" :disabled="lockAttachment" />
          </div>
        </SBrandTheme>
      </SDisclosure>
      <SDisclosure title="切换按钮组" variant="plain" class="theme-preview-section">
        <SBrandTheme :theme="groupPreview" :mode="theme" class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="customizeGroup">自定义组样式</SSwitch>
            <SSwitch v-model="verticalGroup">纵向排列</SSwitch>
          </div>
          <SToggleButtonGroup v-model="deliveryView" label="交付视图" size="sm" :orientation="verticalGroup ? 'vertical' : 'horizontal'">
            <SToggleButton value="list">列表</SToggleButton>
            <SToggleButton value="board" icon="viewColumns">看板</SToggleButton>
            <SToggleButton value="archive" disabled>归档</SToggleButton>
          </SToggleButtonGroup>
        </SBrandTheme>
      </SDisclosure>
      <SDisclosure title="异步切换" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="异步切换预览">
          <div class="theme-sample-controls">
            <SToggleButton v-model="asyncPin" label="固定预览资料" pressed-label="已固定预览资料" icon="plus" pressed-icon="check"
              size="sm" :pressed-change-action="saveAsyncPin" @action-error="asyncPinError = true" />
            <SSwitch v-model="failAsyncPin">模拟保存失败</SSwitch>
          </div>
          <Transition name="sy-standard-fade">
            <span v-if="asyncPinError" class="theme-action-error" role="alert">保存失败，请重试</span>
          </Transition>
        </div>
      </SDisclosure>
      <SDisclosure title="控件图标" variant="plain" class="theme-preview-section">
        <SBrandTheme :theme="iconPreview" :mode="theme" class="theme-samples" role="group" aria-label="控件图标预览">
          <SSwitch v-model="customIconInk">自定义控件图标</SSwitch>
          <SSelect v-model="iconScope" label="预览权限" :options="visibility" />
          <SToastProvider :queue="iconToastQueue" label="主题通知" viewport-label="主题通知列表" dismiss-label="关闭主题通知" :max-visible="1">
            <div class="theme-sample-controls">
              <SButton variant="secondary" @click="iconDialog = true">
                <template #start><SIcon name="plus" /></template>
                打开预览对话框
              </SButton>
              <SButton variant="secondary" @click="showIconToast">
                显示通知
                <template #end><SIcon name="bell" /></template>
              </SButton>
            </div>
          </SToastProvider>
          <SDialog v-model:open="iconDialog" :title="dialogName.trim() || '预览资料'" show-close-button dismiss-label="关闭预览">
            <div class="theme-samples">
              <SInput v-model="dialogName" label="预览名称" />
              <SSwitch v-model="emphasizeDialogTitle">强调标题</SSwitch>
            </div>
          </SDialog>
        </SBrandTheme>
      </SDisclosure>
      <SDisclosure title="输入组辅助文字" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="输入组配色预览">
          <SSwitch v-model="applyFieldText">应用灰紫配色</SSwitch>
          <SSwitch v-model="applyFieldSurface">使用半透明底色</SSwitch>
          <SInputGroup label="项目编号">
            <template #start><SInputGroupText>PRJ-</SInputGroupText></template>
            <SInput label="项目编号" hide-label placeholder="输入编号" />
          </SInputGroup>
        </div>
      </SDisclosure>
      <SDisclosure title="日历日期样式" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="customCalendarDays">自定义日期样式</SSwitch>
          <SBrandTheme :theme="calendarPreview" :mode="theme" class="theme-samples" role="group" aria-label="日期样式预览">
            <SDatePicker v-model="deliveryDate" label="交付日期" locale="zh-CN" trigger-label="选择交付日期" prevent-deselect />
            <SRangeCalendar v-model="reviewDates" label="评审日期范围" locale="zh-CN" :visible-duration="{ weeks: 1 }" :week-starts-on="1" />
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="卡片变体底色" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="卡片底色预览">
          <SSwitch v-model="applyCardSurface">调整低阴影浅灰卡片</SSwitch>
          <div class="theme-card-samples">
            <SCard padding="sm"><strong>默认卡片</strong></SCard>
            <SCard variant="muted" elevation="low" padding="sm"><strong>低阴影浅灰卡片</strong></SCard>
          </div>
        </div>
      </SDisclosure>
      <SDisclosure title="图表数据配色" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="applyChartColor">调整已交付系列颜色</SSwitch>
          <ChartThemeDemo />
        </div>
      </SDisclosure>
      <SDisclosure title="分页边框和圆角" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="分页样式预览">
          <SSwitch v-model="paginationFrame">显示共享边框</SSwitch>
          <SSwitch v-model="paginationFill">给分页区填底色</SSwitch>
          <SSwitch v-model="paginationCorners">调整单个控件圆角</SSwitch>
          <SPagination v-model="currentPage" :total="12" :sibling-count="0" label="资料分页" previous-label="上一页" next-label="下一页"
            :page-label="page => `第 ${page} 页`" :jump-label="page => `跳到第 ${page} 页`" />
          <output class="theme-tab-summary"><SMotionText :value="`第 ${currentPage} 页，共 12 页`" motion="roll" /></output>
        </div>
      </SDisclosure>
      <SDisclosure title="局部浮层主题" variant="plain" class="theme-preview-section">
        <SLayerProvider>
          <SBrandTheme :theme="floatingTheme" :mode="floatingDark ? 'dark' : 'light'" class="theme-badges"
            :style="{ '--sy-accent': floatingDark ? '#d4c8e6' : '#553e6b' }" role="group" aria-label="局部浮层预览">
            <SPopover portal label="局部主题浮层">
              <template #trigger><SButton variant="secondary">打开预览浮层</SButton></template>
              <div class="theme-samples">
                <SSwitch v-model="floatingDark">浮层深色模式</SSwitch>
                <SButton>局部主题操作</SButton>
              </div>
            </SPopover>
            <SContextMenu label="局部主题菜单" as-child :items="[{ id: 'copy', label: '复制项目编号' }]">
              <template #trigger><SButton variant="secondary">右键菜单示例</SButton></template>
            </SContextMenu>
            <div :data-sy-brand="markupTheme.id" :data-sy-theme="markupDark ? 'dark' : 'system'"
              class="theme-badges" role="group" aria-label="CSS 局部主题"
              :style="{ '--sy-accent': markupDark ? '#c5d5df' : '#344d64' }">
              <component :is="'style'" v-html="markupCss" />
              <SPopover portal label="CSS 局部主题浮层">
                <template #trigger><SButton variant="secondary">打开 CSS 主题浮层</SButton></template>
                <div class="theme-samples">
                  <SSwitch v-model="markupDark">CSS 浮层深色模式</SSwitch>
                  <SButton>CSS 主题操作</SButton>
                </div>
              </SPopover>
              <SContextMenu label="CSS 局部主题菜单" as-child :items="[{ id: 'copy', label: '复制 CSS 项目编号' }]">
                <template #trigger><SButton variant="secondary">CSS 右键菜单</SButton></template>
              </SContextMenu>
            </div>
          </SBrandTheme>
        </SLayerProvider>
      </SDisclosure>
      <SDisclosure title="导航文字字号" variant="plain" class="theme-preview-section">
        <div class="theme-samples" aria-label="字号预览" role="group">
          <SSelect v-model="navigationTextSize" label="主文字字号" :options="typographyOptions" />
          <SNavbar label="顶栏示例" brand="交付工作台" brand-description="设计团队" brand-href="/components/" />
          <SSideNavHeading heading="交付记录" superheading="工作区" subheading="本周更新" />
          <STabs label="项目视图" :tabs="navigationTabs">
            <template #panel="{ tab }">
              <p class="theme-tab-summary">{{ tab.value === 'overview' ? '3 份交付资料等待评审' : '已上传品牌组件清单' }}</p>
            </template>
          </STabs>
        </div>
      </SDisclosure>
      <SDisclosure title="导航选中项" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="导航选中项预览">
          <SSwitch v-model="expandNavigationLabel">使用完整文件名称</SSwitch>
          <SNavbar v-model="navigationCurrent" brand="工作区" label="工作区导航示例" menu-label="打开工作区导航"
            :items="selectionItems" :breakpoint="310" />
        </div>
      </SDisclosure>
      <SDisclosure title="标签页选中指示" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="useTabLine">使用细线</SSwitch>
            <SSwitch v-model="useFullTabLabels">使用完整标签</SSwitch>
          </div>
          <SBrandTheme :theme="tabIndicatorPreview" :mode="theme">
            <STabs label="交付视图" :tabs="indicatorTabs" :indicator="useTabLine ? 'line' : 'surface'" size="sm">
              <template #panel="{ tab }">
                <p class="theme-tab-summary">{{ tab.value === 'overview' ? '3 份资料待评审' : '组件清单已上传' }}</p>
              </template>
            </STabs>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="可选部件" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="showCopyControl">显示复制按钮</SSwitch>
            <SSwitch v-model="showBannerIcon">显示横幅图标</SSwitch>
            <SSwitch v-model="showTabUnderline">显示标签页下划线</SSwitch>
          </div>
          <SBrandTheme :theme="optionalPartsPreview" :mode="theme" class="theme-samples" role="group" aria-label="可选部件预览">
            <SCodeBlock code="pnpm build" scroll-label="发布命令" copy-label="复制命令" :show-language-label="false" />
            <SBanner title="文档构建成功" tone="success" dismissible dismiss-label="关闭横幅" />
            <STabs label="发布阶段" :tabs="optionalTabs" indicator="line" size="sm">
              <template #panel="{ tab }"><p class="theme-tab-summary">{{ tab.value === 'build' ? '文档已构建' : '预览已就绪' }}</p></template>
            </STabs>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="居中导航与换行" variant="plain" class="theme-preview-section">
        <div class="theme-samples" role="group" aria-label="导航换行预览">
          <SSelect v-model="navigationWidth" label="导航可用宽度" :options="navigationWidths" />
          <div class="theme-navbar-preview" :style="{ inlineSize: navigationWidth }">
            <SNavbar brand="交付工作台" label="项目搜索导航" menu-label="打开项目搜索" :breakpoint="260">
              <template #start-content><SBadge>团队版</SBadge></template>
              <template #center>
                <SInput v-model="projectSearch" type="search" label="搜索项目" hide-label placeholder="搜索项目" :width="152" size="sm" />
              </template>
              <template #end>
                <SButton variant="secondary" size="sm" @click="projectSearch = ''">清除搜索</SButton>
              </template>
            </SNavbar>
            <p class="theme-navigation-preview__content" role="status"><SMotionText :value="matchingProjects" wrap /></p>
          </div>
        </div>
      </SDisclosure>
      <SDisclosure title="导航行尺寸" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSelect v-model="headerLayout" label="头部与导航尺寸" :options="headerLayouts" />
          <SBrandTheme :theme="navigationPreview" :mode="theme" class="theme-navigation-preview" role="group" aria-label="导航尺寸预览">
            <div ref="navigationSample">
              <SLayout padding="0" data-navigation-fit="layout-header">
                <template #header>
                  <SLayoutHeader :has-divider="false">
                    <SNavbar label="布局头部导航" brand="交付工作台" brand-description="设计团队" brand-href="/components/"
                      :breakpoint="0" :items="navigationItems" />
                  </SLayoutHeader>
                </template>
                <p class="theme-navigation-preview__content">评审记录</p>
              </SLayout>
            </div>
            <p class="theme-navigation-preview__fit" role="status" :data-overflow="fitIssue ? '' : undefined">
              <SMotionText :value="fitMessage" motion="roll" wrap />
            </p>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="媒体文字配色" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="repairMediaContrast">修正媒体文字色</SSwitch>
          <SBrandTheme :theme="mediaPreview" mode="light">
            <SMediaTheme mode="dark" class="theme-media-ink" role="group" aria-label="深色媒体区域">
              <SLightbox :media="mediaExample" label="交付图片" close-label="关闭交付图片">
                <template #trigger="{ open: show }">
                  <SButton size="sm" variant="secondary" aria-haspopup="dialog" @click="show()">打开交付图片</SButton>
                </template>
              </SLightbox>
            </SMediaTheme>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="表格间距" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="tightenTable">收紧单元格</SSwitch>
            <SSwitch v-model="tableDividers">显示行分隔线</SSwitch>
          </div>
          <SBrandTheme :theme="tablePreview" :mode="theme">
            <STable label="交付记录" :rows="tableRecords" :columns="tableColumns" :row-key="row => row.id"
              density="compact" :dividers="tableDividers ? 'rows' : 'none'" />
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="主题继承" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="applyHeadingSize">应用通用标题字号 20 px</SSwitch>
          <SBrandTheme :theme="headingPreview" :mode="theme" class="theme-heading-preview" role="group" aria-label="继承字号预览">
            <h3>基础主题标题</h3>
            <h4>手动指定的四级标题</h4>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="字体角色" variant="plain" class="theme-preview-section">
        <FontRoleDemo :brand="brand" :mode="theme" />
      </SDisclosure>
      <SDisclosure title="展示标题" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <SSwitch v-model="enlargeDisplayHeadings">放大标题</SSwitch>
          <SBrandTheme :theme="displayHeadingPreview" :mode="theme" class="theme-display-headings" role="group" aria-label="展示标题预览">
            <SHeading :level="2" type="display-1">设计规范</SHeading>
            <SHeading :level="2" :accessibility-level="3" type="display-2">发布进度</SHeading>
            <SHeading :level="4" type="display-3">最新更新</SHeading>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="全局边框" variant="plain" class="theme-preview-section">
        <BorderWidthDemo :brand="brand" :mode="theme" />
      </SDisclosure>
      <SDisclosure title="阴影层级" variant="plain" class="theme-preview-section">
        <ShadowDemo :brand="brand" :mode="theme" />
      </SDisclosure>
      <SDisclosure title="选项行高亮" variant="plain" class="theme-preview-section">
        <div class="theme-samples" aria-label="选项样式预览" role="group">
          <SSwitch v-model="highContrastRows">使用深色高亮</SSwitch>
          <SSelect v-model="reviewStage" :options="stageOptions" label="交付阶段" show-selected-description />
          <div class="sy-field theme-option-search">
            <SLabel :for="stageSearchId">搜索交付阶段</SLabel>
            <SBaseTypeahead :id="stageSearchId" :options="stageOptions" label="搜索交付阶段" placeholder="输入阶段名称或说明"
              open-on-focus @select="reviewStage = $event.value" />
          </div>
          <SComboBox v-model="reviewStage" :options="stageOptions" label="关联交付阶段" trigger-label="打开候选项" />
          <SMenu menu-label="交付快捷操作">
            <template #trigger><SButton variant="secondary">交付快捷操作</SButton></template>
            <SMenuItem v-for="stage in stageOptions" :key="stage.value" :label="stage.label" :description="stage.description"
              :disabled="stage.disabled" @select="reviewStage = stage.value" />
          </SMenu>
          <SListBox v-model="reviewStage" :options="stageOptions" label="可选交付阶段" highlight-on-hover />
        </div>
      </SDisclosure>
      <SDisclosure title="菜单面板" variant="plain" class="theme-preview-section">
        <SLayerProvider>
          <SBrandTheme :theme="menuPreview" :mode="theme" class="theme-samples">
            <SSwitch v-model="compactMenus">使用紧凑菜单</SSwitch>
            <div class="theme-sample-controls">
              <SMenu menu-label="资料菜单">
                <template #trigger><SButton size="sm" variant="secondary">资料菜单</SButton></template>
                <SMenuCheckboxItem v-model="compactMenus" label="紧凑面板" />
                <SMenuCheckboxItem v-model="showMenuDividers" label="显示分隔线" />
                <SMenuCheckboxItem v-model="emphasizeMenuDividers" label="加深分隔线" />
                <SSeparator />
                <SMenuSubmenu label="切换资料">
                  <SMenuItem v-for="choice in menuChoices" :key="choice.value" :label="choice.label" @select="menuDocument = choice.value" />
                </SMenuSubmenu>
              </SMenu>
              <SContextMenu label="资料右键菜单" as-child :items="menuEntries"
                @action="menuDocument = $event">
                <template #trigger><SButton size="sm" variant="secondary">资料右键菜单</SButton></template>
              </SContextMenu>
              <SDropdown label="触屏菜单" presentation="bottom-sheet" :items="menuEntries" @action="menuDocument = $event">
                <template #trigger><SButton size="sm" variant="secondary">触屏菜单</SButton></template>
              </SDropdown>
            </div>
            <div class="theme-menu-fields">
              <SSelect v-model="menuDocument" :options="menuChoices" label="默认资料" />
              <SSelect v-model="menuDocuments" :options="menuChoices" label="包含资料" multiple />
            </div>
            <div class="sy-field theme-option-search">
              <SLabel :for="menuQueryId">查找资料</SLabel>
              <SBaseTypeahead :id="menuQueryId" label="查找资料" :options="menuChoices" :search="findMenuDocuments" :search-delay="300"
                loading-text="正在查找资料" empty-text="没有匹配资料" @select="menuDocument = $event.value" />
            </div>
          </SBrandTheme>
        </SLayerProvider>
      </SDisclosure>
      <SDisclosure title="输入焦点环" variant="plain" class="theme-preview-section">
        <div class="theme-samples">
          <div class="theme-sample-controls">
            <SSwitch v-model="customInputFocus">自定义焦点环</SSwitch>
            <SSwitch v-model="darkInputFocus">深色预览</SSwitch>
          </div>
          <SBrandTheme :theme="inputFocusPreview" :mode="darkInputFocus ? 'dark' : 'light'" class="theme-input-focus"
            role="group" aria-label="输入焦点环预览">
            <SInput label="项目编号" model-value="PRJ-026" />
            <SInput label="无效的项目编号" model-value="026" :status="{ type: 'error' }" />
            <SInputGroup label="交付链接">
              <template #start><SInputGroupText>/release/</SInputGroupText></template>
              <SInput label="交付链接" hide-label model-value="studio" />
            </SInputGroup>
          </SBrandTheme>
        </div>
      </SDisclosure>
      <SDisclosure title="多行控件内边距" variant="plain" class="theme-preview-section">
        <div class="theme-samples" aria-label="内边距预览" role="group">
          <SSwitch v-model="applyPadding">应用上下 24 px、左右 20 px 的内边距</SSwitch>
          <SSelect v-model="notification" label="通知方式" :options="notificationOptions" show-selected-description />
          <SFileInput label="文件字段" browse-label="选择文件" />
          <SFileInput label="文件拖放区" mode="dropzone" browse-label="选择文件" />
        </div>
      </SDisclosure>
      <SSwitch v-model="enabled">发送交付提醒</SSwitch>
      <SProgressBar label="发布进度" :value="76" />
      <SButton @click="saved = !saved"><SMotionText :value="saved ? '已保存' : '保存设置'" /></SButton>
      <SCodeBlock class="theme-code" :code="`const project = { status: 'ready', progress: 76 }`" language="typescript" label="项目配置" :copyable="false" wrap />
    </SBrandTheme>
    <div class="code-block">
      <div class="code-toolbar"><span>CSS Token</span><button type="button" @click="copy"><SMotionText :value="copied ? '已复制' : '复制 CSS'" /></button></div>
      <pre><code ref="tokenPreview">{{ css }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.theme-demo { display: grid; align-items: start; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: var(--sy-space-2); }
.theme-controls, .theme-preview { min-width: 0; display: grid; align-content: start; justify-items: start; gap: var(--sy-space-2); padding: var(--sy-inset); }
.theme-controls { background: var(--surface); border-radius: var(--sy-radius-md); }
.theme-field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: var(--sy-space-2); width: 100%; }
.theme-toggles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: var(--sy-space-2); width: 100%; }
.theme-controls fieldset { padding: 0; border: 0; margin: 0; }
.swatches { display: flex; gap: var(--sy-space-2); margin-top: var(--sy-space-1); flex-wrap: wrap; }
.swatches button { width: 2rem; height: 2rem; border: 2px solid transparent; border-radius: 50%; background: var(--swatch); }
.swatches button[aria-pressed="true"] { outline: 2px solid var(--ink); outline-offset: -2px; }
.radius-control { display: grid; grid-template-columns: 1fr auto; gap: .25rem; }
.radius-control input { grid-column: 1 / -1; accent-color: var(--primary); }
.theme-preview { background: var(--sy-canvas); color: var(--sy-text); border-radius: var(--sy-radius-md); }
.theme-preview .sy-field, .theme-preview :deep(.sy-measure), .theme-code { width: 100%; }
.theme-settings { display: grid; gap: var(--sy-space-2); width: 100%; min-inline-size: 0; padding: var(--sy-space-3); border-radius: var(--sy-radius-md); background: var(--sy-surface-subtle); }
.theme-settings > h2 { font-size: 1.18rem; }
.theme-badges { display: flex; flex-wrap: wrap; gap: .45rem; }
.theme-preview-section { width: 100%; min-width: 0; background: var(--sy-surface-subtle); }
.theme-samples { display: grid; gap: var(--sy-space-2); }
.theme-display-headings { display: grid; gap: var(--sy-space-1); padding: var(--sy-space-2); background: var(--sy-surface-subtle); border-radius: var(--sy-radius-sm); }
.theme-sample-controls { display: flex; flex-wrap: wrap; gap: var(--sy-space-2) var(--sy-space-3); }
.theme-action-error { color: var(--sy-danger); }
.theme-progress-samples { display: grid; gap: var(--sy-space-2); }
.theme-choice-options { display: grid; align-content: start; gap: var(--sy-space-1); }
.theme-menu-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: var(--sy-space-2); }
.theme-input-focus {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: var(--sy-space-2);
  padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); background: var(--sy-canvas); color: var(--sy-text);
  transition: background-color var(--sy-motion-replace) var(--sy-ease-settle), color var(--sy-motion-replace) var(--sy-ease-settle);
}
.theme-media-ink { padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); background: var(--sy-canvas); color: var(--sy-text); }
.theme-card-samples { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr)); gap: var(--sy-space-3); }
.theme-navigation-preview { background: var(--sy-surface-subtle); border-radius: var(--sy-radius-md); }
.theme-navbar-preview { min-inline-size: 0; max-inline-size: 100%; }
.theme-navigation-preview__content { margin: 0; padding: var(--sy-space-3); color: var(--sy-text-muted); }
.theme-navigation-preview__fit {
  margin: 0;
  padding: 0 var(--sy-space-3) var(--sy-space-3);
  color: var(--sy-text-muted);
  font-size: .8125rem;
  transition: color var(--sy-motion-replace) var(--sy-ease-settle);
}
.theme-navigation-preview__fit[data-overflow] { color: var(--sy-warning); }
.theme-heading-preview { display: grid; justify-items: start; gap: var(--sy-space-2); }
.theme-heading-preview :is(h3, h4) {
  margin: 0;
  transition: font-size var(--sy-motion-replace) var(--sy-ease-settle);
}
.theme-option-search :deep(.sy-base-typeahead__input) {
  padding-inline: .75rem;
  border-radius: var(--sy-radius-md);
  background: var(--sy-surface-subtle);
}
.theme-tab-summary { margin: 0; color: var(--sy-text-muted); font-size: .875rem; }
.theme-demo .code-block { grid-column: 1 / -1; margin: 0; }
.theme-demo .code-block code { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .theme-controls, .theme-preview, .theme-settings, .theme-preview-section, .theme-navigation-preview, .theme-code, .theme-code :deep(code span) {
    transition: background-color var(--sy-motion-enter) var(--sy-ease-settle), color var(--sy-motion-enter) var(--sy-ease-settle);
  }
  .theme-navbar-preview { transition: inline-size var(--sy-motion-replace) var(--sy-ease-settle); }
}
@media (prefers-reduced-motion: reduce) { .theme-navigation-preview__fit { transition: none; } }
@media (max-width: 580px) { .theme-demo { grid-template-columns: minmax(0, 1fr); } }
</style>
