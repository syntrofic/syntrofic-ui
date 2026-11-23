<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import {
  SAspectRatio, SBanner, SBlockquote, SButton, SCandlestickChart, SChartWebGLLayer, SChatDictationButton, SChatMessage, SChip, SClickableCard, SCodeEditor, SCommentComposer, SCommentPin, SComposedChart, SDiffViewer, SFileInput,
  SIcon, SIndicator, SInfoTip, SInput, SItem, SLayer, SLightbox, SListInput, SMediaControl, SMediaPlayer, SMediaTheme, SMegaMenu, SMetadataList, SMobileNav, SMobileNavToggle, SNavIcon, SNavMenu, SNavMenuItem, SOverflowList, SOverlay, SPageControl, SPowerSearch, STopNavMenu,
  SMotionText, SSankeyChart, SScrollableArea, SSelectableCard, SSnapPaging, SSpatialChart, SSurface, SSwipeActions, SThumbnail,
  SLayout, SLayoutContent, SLayoutFooter, SLayoutHeader, SLayoutPanel, SSection, SSideNavHeading, SSideNavItem, SSideNavSection, STabMenu, STabs,
  SDialog, SFieldStatus, SPopover, provideIcons,
  SAutocomplete, SChatComposerDrawer, SChatComposerInput, SChatComposerTokenElement, SCommand, SCommandInput, SComplexSelector, SKbd, SMarkdown, SNavbar, SOutline, SPromptInput, SSelect, SSelectorOption, STopNavMegaMenu, STopNavMegaMenuFeaturedCard, STopNavMegaMenuItem, STreeList, STypeaheadItem,
  SText, STokenizer, STour, STourStep, SVegaChart, SVisuallyHidden, SWebGLChart, SWeightedIcon, SWeightedIconSprite, buildWeightedIcon, createAnimator, createDragToSnapPoints, createReorderable,
  createDiffFile, createSwipe, parseUnifiedDiff, solveDecay, solveSpring, solveSpringTowardRamp, useAnimatedLayout, useAnimator, useChatPasteAsToken, useKeyboardInset, useLayer, useLightbox, useMediaPlaybackTime, useMediaPlayer, useOutlineFromDOM, useOutlineFromMarkdown, useOverlay, usePanGesture, usePowerSearchConfig,
} from '../src'
import type { ChatComposerTrigger, ChatReaction, CodeEditorTokenizer, CommandGroup, DiffLineReference, DropZoneRejection, ListInputColumn, MarkdownTransform, SearchField, SearchFilter, SelectOption, SpatialMark, VegaChartSpec, WebGLMark } from '../src'
import bundledSpatialSamples from './assets/spatial-samples-next.json'
import nextSpatialSamples from './assets/spatial-samples-next.json?url&no-inline'
import bundledVegaSamples from './assets/vega-delivery-next.json'
import nextVegaSamples from './assets/vega-delivery-next.json?url&no-inline'
import I18nProvider from '../src/rac/I18nProvider.vue'
import LogStreamReview from './LogStreamReview.vue'
import TransferListReview from './TransferListReview.vue'
import NavigationStackReview from './NavigationStackReview.vue'
import CommentThreadReview from './CommentThreadReview.vue'
import CommentsReview from './CommentsReview.vue'
import RevealReview from './RevealReview.vue'
import IdentityMediaReview from './IdentityMediaReview.vue'
import SurfaceReview from './SurfaceReview.vue'
import TypographyReview from './TypographyReview.vue'
import LayoutPrimitivesReview from './LayoutPrimitivesReview.vue'
import LayoutRegionReview from './LayoutRegionReview.vue'
import ScrollableReview from './ScrollableReview.vue'
import MediaScenariosReview from './MediaScenariosReview.vue'
import RoleReviewSurface from './RoleReviewSurface.vue'
import LayerReview from './LayerReview.vue'
import FieldStatusReview from './FieldStatusReview.vue'
import FormLayoutReview from './FormLayoutReview.vue'
import MobileNavScenariosReview from './MobileNavScenariosReview.vue'
import TypeaheadScenariosReview from './TypeaheadScenariosReview.vue'
import TokenizerScenariosReview from './TokenizerScenariosReview.vue'
import ReferenceScenariosReview from './ReferenceScenariosReview.vue'
import ContentScenariosReview from './ContentScenariosReview.vue'
import PowerSearchScenariosReview from './PowerSearchScenariosReview.vue'
import OutlineScenariosReview from './OutlineScenariosReview.vue'
import OverflowScenariosReview from './OverflowScenariosReview.vue'
import TreeListScenariosReview from './TreeListScenariosReview.vue'
import ComplexSelectorScenariosReview from './ComplexSelectorScenariosReview.vue'
import IconRegistryReview from './IconRegistryReview.vue'
import IconScenariosReview from './IconScenariosReview.vue'
import LocalizationScenariosReview from './LocalizationScenariosReview.vue'
import ThemeScenariosReview from './ThemeScenariosReview.vue'
import ComposerDictationReview from './ComposerDictationReview.vue'
import ComposerEditorScenariosReview from './ComposerEditorScenariosReview.vue'
import ComposerScenariosReview from './ComposerScenariosReview.vue'
import SnapToolsReview from './SnapToolsReview.vue'
import LayoutToolsReview from './LayoutToolsReview.vue'
import MotionThemeReview from './MotionThemeReview.vue'
import MotionScenariosReview from './MotionScenariosReview.vue'
import KeyboardRevealReview from './KeyboardRevealReview.vue'
import FieldHooksReview from './FieldHooksReview.vue'
import ProjectLinkHookReview from './ProjectLinkHookReview.vue'
import InteractionHooksReview from './InteractionHooksReview.vue'
import TimeReadoutReview from './TimeReadoutReview.vue'
import CollectionItemScenariosReview from './CollectionItemScenariosReview.vue'
import MetadataListScenariosReview from './MetadataListScenariosReview.vue'
import deliveryArea from './assets/delivery-area.png'
import deliveryVideo from './assets/delivery-preview.mp4'
import deliveryCaptions from './assets/delivery-preview.vtt?url&no-inline'

const props = defineProps<{ id: string }>()
const DateInputsReview = defineAsyncComponent(() => import('./DateInputsReview.vue'))
const shown = ref(true)
const selected = ref(false)
const result = ref('')
const recordSwipe = createSwipe({
  leading: [{ id: 'keep', label: '保留', icon: 'check', onActivate: ({ itemKey }) => { result.value = '已保留 ' + itemKey } }],
  trailing: [{ id: 'archive', label: '归档', icon: 'file', onActivate: ({ itemKey }) => { result.value = '已归档 ' + itemKey } }],
})
const pendingSwipe = createSwipe({ swipeBehavior: 'commit', trailing: [
  { id: 'read', label: '标为已读', onActivate: ({ itemKey }) => { result.value = '已读 ' + itemKey } },
] })
const open = ref(false)
const current = ref(0)
const scrollable = useTemplateRef('scrollable')
const itemToggle = useTemplateRef<HTMLButtonElement>('itemToggle')
const chapterPage = ref(1)
const uploads = ref<File[]>([])
const deliveryFile = ref<File[]>([])
const fileRejections = { type: '类型不支持', size: '超过文件大小限制', limit: '已达到文件数量上限', directory: '请选择文件' }
const describeRejectedFiles = (files: readonly DropZoneRejection[]) => files.map(({ name, reason }) => `${name} · ${fileRejections[reason]}`).join(' / ')
const removeUploadLabel = (file: File) => `移除 ${file.name}`
const members = ref(['lin'])
const contacts = ref([{ id: 1, name: '林舟', team: '设计' }, { id: 2, name: '周昱', team: '工程' }])
let contactId = 2
const contactColumns: ListInputColumn<(typeof contacts.value)[number]>[] = [
  { key: 'name', label: '姓名', read: item => item.name, write: (item, name) => ({ ...item, name }) },
  { key: 'team', label: '团队', read: item => item.team, write: (item, team) => ({ ...item, team }) },
]
const contactLabels = { add: '添加', remove: '移除', reorder: '调整顺序', up: '上移', down: '下移', done: '完成调整',
  added: '已添加', removed: '已移除', moved: '已移动', empty: '暂无访客' }
const filters = ref<SearchFilter[]>([])
const query = ref('')
const reactionChoices = [{ id: 'review', label: '评审回应', items: [{ glyph: '👍', label: '赞同' }, { glyph: '🎉', label: '庆祝' }] }]
const reactions = ref<ChatReaction[]>([{ emoji: '👍', count: 2, label: '赞同' }])
function reactToChat(emoji: string, next: boolean) {
  const previous = reactions.value.find(value => value.emoji === emoji)
  if (previous && Boolean(previous.selected) === next) return
  if (previous) reactions.value = reactions.value.map(value => value === previous
    ? { ...value, count: value.count + (next ? 1 : -1), selected: next } : value).filter(value => value.count > 0)
  else if (next) reactions.value = [...reactions.value, { emoji, label: reactionChoices[0].items.find(value => value.glyph === emoji)?.label, count: 1, selected: true }]
}
const advancedFilters = ref<SearchFilter[]>([
  { field: 'scope', operator: 'is', value: '团队', readonly: true },
  { field: 'amount', operator: 'between', value: '12', endValue: '24' },
  { field: 'state', operator: 'in', value: 'open', values: ['open'] },
])
const advancedFields: readonly SearchField[] = [
  { key: 'amount', label: '交付量', type: 'number', operators: [{ key: 'between', label: '在区间内' }, 'is'] },
  { key: 'state', label: '进度', type: 'list', typeaheadAliases: ['status'], options: [{ value: 'open', label: '进行中' }, { value: 'done', label: '已完成' }] },
  { key: 'scope', label: '范围', type: 'text' },
  { key: 'topic', label: '主题', type: 'text' },
  { key: 'delivered', label: '交付日期', type: 'date' },
]
const deliveries = [
  { amount: 12, state: 'open', scope: '团队', topic: '交付规范', delivered: new Date('2026-11-19T17:00:00Z') },
  { amount: 18, state: 'done', scope: '团队', topic: '验收结果', delivered: '2026-11-18' },
  { amount: 24, state: 'open', scope: '团队', topic: '版本草案', delivered: new Date('2026-11-19T14:00:00Z') },
  { amount: 36, state: 'open', scope: '公开', topic: '资料目录', delivered: '2026-11-15' },
]
const { config: deliverySearch, applyFilters: getDeliveries } = usePowerSearchConfig(advancedFields, {
  name: 'delivery', contentSearchFieldKey: 'topic', timeZone: 'Asia/Shanghai', now: () => new Date('2026-11-20T17:00:00Z'),
})
const visibleDeliveries = computed(() => getDeliveries(advancedFilters.value, deliveries).length)
const structuredFilters = ref<SearchFilter[]>([])
const DurationEditor = defineComponent({
  props: { modelValue: String, label: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const lengths = [{ value: '2', label: '两小时' }, { value: '4', label: '四小时' }]
    return () => h(SSelect as Component, { ...props, options: lengths, 'onUpdate:modelValue': (value: string | undefined) => emit('update:modelValue', value) })
  },
})
const structuredFields: readonly SearchField[] = [
  { key: 'reviewers', label: '评审组', type: 'nested', typeaheadAliases: ['review'], typeaheadMinQueryLength: 3,
    operators: [{ key: 'is', label: '包含符合条件的成员' }], fields: [
      { key: 'role', label: '角色', type: 'enum', options: [{ value: 'owner', label: '负责人' }, { value: 'backup', label: '协作者' }] },
    ] },
  { key: 'estimate', label: '预计耗时', type: 'custom', operators: [{ key: 'gte', label: '至少', editor: DurationEditor,
    validate: value => Number(value) > 0, format: value => value + ' 小时', match: (value, filter) => Number(value) >= Number(filter.value) }] },
  { key: 'state', label: '项目状态', type: 'enum', options: [{ value: 'open', label: '待验收' }, { value: 'done', label: '已验收' }] },
  { key: 'teams', label: '协作团队', type: 'list',
    search: (input) => [{ value: 'studio', label: '设计组' }, { value: 'ops', label: '运营组' }]
      .filter(option => option.label.includes(input) || option.value.includes(input)) },
]
const structuredRows = [
  { reviewers: [{ role: 'owner' }], estimate: 5, state: 'done', teams: ['studio'] },
  { reviewers: [{ role: 'owner' }, { role: 'backup' }], estimate: 1, state: 'open', teams: ['studio', 'ops'] },
  { reviewers: [{ role: 'backup' }], estimate: 6, state: 'done', teams: ['ops'] },
]
const { config: structuredSearch, applyFilters: matchStructuredSearch } = usePowerSearchConfig(structuredFields)
const structuredCount = computed(() => matchStructuredSearch(structuredFilters.value, structuredRows).length)
const zonedDay = Date.parse('2026-11-21T16:00:00Z') / 1000
const calendarFilters = ref<SearchFilter[]>([{ field: 'delivery', operator: 'is', value: String(zonedDay) }])
const { config: calendarSearch, applyFilters: matchCalendarSearch } = usePowerSearchConfig(
  [{ key: 'delivery', label: '签收日', type: 'date', dateStorage: 'epoch' }],
  { timeZone: 'Asia/Shanghai' },
)
const calendarRows = [{ delivery: '2026-11-22' }, { delivery: '2026-11-23' }, { delivery: new Date('2026-11-22T16:10:00Z') }]
const calendarCount = computed(() => matchCalendarSearch(calendarFilters.value, calendarRows).length)
const weightedMark = buildWeightedIcon('direction-mark', {
  400: [{ d: 'M4 12h15m-5-5 5 5-5 5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }],
  700: [{ d: 'M3 12h16m-6-6 6 6-6 6', fill: 'none', stroke: 'currentColor', strokeWidth: 2.7 }],
})
const narrow = ref(false)
const thumbnail = ref(true)
const status = ref(false)
const animatedList = useTemplateRef<HTMLDivElement>('animatedList')
const capture = useAnimatedLayout({ scope: animatedList })
const treeEnd = useTemplateRef<HTMLElement>('treeEnd')
const captureTree = () => treeEnd.value ? capture([treeEnd.value]) : undefined
const treeList = [
  { id: 'team', label: '团队资料', icon: 'file', expanded: true, children: [
    { id: 'drafts', label: '共享草稿', selected: true, icon: 'file', href: '#shared-drafts', description: '最近修改', rowClass: 'standard-review__selected-tree-row' },
    { id: 'archived', label: '归档', disabled: true },
  ] },
  { id: 'publish', label: '待发布', icon: 'calendar' },
]
const slider = useTemplateRef<HTMLDivElement>('slider')
let snap: ReturnType<typeof createDragToSnapPoints> | undefined
watch(slider, (node, _, cleanup) => {
  if (!node) return
  snap = createDragToSnapPoints(node, { points: [0, 64, 128], onChange: point => { current.value = point } })
  cleanup(() => { snap?.dispose(); snap = undefined })
}, { flush: 'post' })
const options = [{ value: 'lin', label: '林舟' }, { value: 'zhou', label: '周昱' }, { value: 'xu', label: '许然' }]
const people = options.map(option => ({ id: option.value, label: option.label }))
const project = [
  { id: 'owner', label: '负责人', value: '林舟' },
  { id: 'version', label: '版本', value: '0.1.0' },
  { id: 'review', label: '评审状态', value: '待评审' },
]
const pages = ref([
  { id: 'resources', label: '品牌资源' }, { id: 'submissions', label: '交付记录' }, { id: 'archive', label: '设计归档' },
])
const links = [
  ...pages.value, { id: 'settings', label: '项目设置' }, { id: 'members', label: '团队成员' },
]
const navigationEntries = [
  { id: 'files', title: 'Files', icon: 'file', description: '共享文件和品牌素材', href: '#files' },
  { id: 'people', title: 'People', icon: 'search', description: '团队成员和权限', href: '#people', disabled: true },
  { id: 'activity', title: 'Activity', icon: 'info', description: '项目最近活动', closeOnSelect: false },
]
const tabOptions = [{ value: 'activity', label: '活动' }, { value: 'data', label: '数据' }, { value: 'pending', label: '待授权', disabled: true }]
const tabMenuSelection = ref('overview')
const publishingArea = ref('设计')
const quickQuery = ref('')
const composerDraft = ref('')
const commentDraft = ref('')
const commentAnchor = { label: '引用交付说明', text: '发布前复核颜色与资源授权。' }
const commentSendError = ref('上次提交失败')
async function uploadCommentImages(images: readonly File[], signal: AbortSignal) {
  await new Promise<void>(resolve => setTimeout(resolve, 240))
  signal.throwIfAborted()
  return images.map(image => ({ src: deliveryArea, alt: image.name }))
}
const composerInput = useTemplateRef<InstanceType<typeof SChatComposerInput>>('composerInput')
let pasteNumber = 0
const customPaste = useChatPasteAsToken(composerInput, {
  threshold: 8,
  toToken: text => {
    const id = 'review-paste-' + ++pasteNumber
    return { type: 'token', id, label: '交付摘录', value: `[交付摘录 ${pasteNumber}]`, expandedText: text }
  },
})
const composerTriggers: readonly ChatComposerTrigger[] = [{
  character: '@', emptyText: '没有匹配的成员',
  async search(query) {
    await new Promise<void>(resolve => setTimeout(resolve, query === 'd' ? 320 : 150))
    return [
      { id: 'team', value: '@team', label: '@团队成员', keywords: ['team'] },
      { id: 'design', value: '@design', label: '@设计组', keywords: ['design'] },
    ].filter(option => option.label.includes(query) || option.keywords.some(word => word.startsWith(query)))
  },
}]
const commandGroups: readonly CommandGroup[] = [{ id: 'projects', label: '项目', items: [{ id: 'archive', label: '查看归档' }, { id: 'launch', label: '发布流程' }] }]
async function savePublishingArea(value: string) {
  await new Promise<void>(resolve => setTimeout(resolve, 540))
  if (value === '归档') throw new Error('Read-only groups cannot be changed')
}
const outlineContent = useTemplateRef<HTMLElement>('outlineContent')
const generatedOutline = useOutlineFromDOM(outlineContent)
const outlineSections = [
  { id: 'sample-overview', label: '资料概览', level: 2, description: '浏览主要资料和受众。' },
  { id: 'sample-setup', label: '配置规范', level: 3, description: '设置发布权限和默认制品。' },
  { id: 'sample-delivery', label: '交付清单', level: 2, description: '核对变更、交付日期和发布负责人。' },
]
const markdownSource = '## 发布草稿\n\n项目发布记录。\n\n> ### 内部备注\n\n```text\n## 示例代码\n```'
const outlinePlugins: readonly MarkdownTransform[] = [(tokens, { final }) => {
  if (!final) return
  const text = tokens.find(token => token.type === 'inline')?.children?.[0]
  if (text) text.content = '发布记录'
}]
const markdownOutline = useOutlineFromMarkdown(markdownSource, () => ({
  headingPrefix: 'release-', plugins: outlinePlugins, isFinal: status.value,
}))
const richOptions: readonly SelectOption[] = [
  { value: 'assets', label: '品牌', icon: 'file', description: '品牌手册和视觉资产', group: '团队项目', endLabel: '12 项' },
  { value: 'people', label: '成员', description: '工作区通讯录', avatar: { initials: '组' }, group: '团队项目' },
  { value: 'archive', label: '归档', description: '仅负责人可用', disabled: true },
]
provideIcons({ 'review:location': { path: 'M5 12h14M12 5v14', variants: { filled: { path: 'M4 4h16v16H4z', fill: 'currentColor' } } } })
const reviewIcon = () => h('svg', { viewBox: '0 0 24 24' }, [h('circle', { cx: 12, cy: 12, r: 7, fill: 'currentColor' })])
const flowNodes = [
  { id: 'inbox', label: '待处理' }, { id: 'design', label: '设计评审' }, { id: 'delivery', label: '已交付' }, { id: 'rework', label: '返工' },
]
const flowLinks = [
  { source: 'inbox', target: 'design', value: 34 },
  { source: 'design', target: 'delivery', value: 28 },
  { source: 'design', target: 'rework', value: 6 },
]
const cloud = Array.from({ length: 49 }, (_, index) => {
  const x = index % 7
  const z = Math.floor(index / 7)
  return { id: String(index), x, z, y: +(Math.sin(x / 2) * Math.cos(z / 2) * 6 + 8).toFixed(2) }
})
const plotMark = ref<WebGLMark>('dot')
const samples = cloud.map(point => ({ ...point, y: point.z, value: point.y }))
const namedHeatmap = ref(false)
const wideStream = ref(false)
const heatmapCategories = samples.map(point => ({ ...point, x: `资料 ${point.x + 1}`, y: `阶段 ${point.y + 1}` }))
const webglSamples = computed(() => plotMark.value === 'heatmap' && namedHeatmap.value ? heatmapCategories : samples)
const webglExample = useTemplateRef<{ push: (x: number, y: number, value?: number, label?: string) => void; clear: () => void }>('webglExample')
const sharedRows = [{ key: '受理', value: .5 }, { key: '配货', value: 1.5 }, { key: '配送', value: 2.5 }]
const shareColumns = ['上午', '中午', '下午', '傍晚']
const sharedHistory = shareColumns.map((label, index) => ({ label, values: { plan: .4 + index * .7, actual: [.65, 1.27, 1.16, 2.45][index] } }))
const sharedCells = shareColumns.flatMap((label, column) => sharedRows.map((row, index) =>
  ({ id: label + row.key, x: label, y: row.key, value: (column + 1) * (index + 1) + Number(column === index) })))
const sharedStreamPoints = sharedHistory.slice(0, 2).map(({ label, values }) => ({ x: label, y: values.actual }))
const sharedRenderer = ref<'webgl' | 'svg'>('webgl')
const sharedStream = useTemplateRef<InstanceType<typeof SChartWebGLLayer>>('sharedStream')
let streamIndex = 0
function appendSamples() {
  for (let index = 0; index < 3; index++) {
    streamIndex++
    webglExample.value?.push(6 + streamIndex, streamIndex % 7, undefined, `实时样本 ${streamIndex}`)
  }
}
const mark = ref<SpatialMark>('scatter')
const markLabels = { scatter: '散点', bars: '柱形', surface: '曲面' }
const spinSpatial = ref(false)
const spatialCloud = shallowRef(cloud)
const spatialLoading = ref(false)
const spatialError = ref('')
let spatialRequest: AbortController | undefined
async function refreshSpatial() {
  if (spatialRequest) return
  const request = new AbortController()
  spatialRequest = request
  spatialLoading.value = true
  spatialError.value = ''
  try {
    let heights: unknown = bundledSpatialSamples
    if (import.meta.env.MODE !== 'theme-sheet') {
      const response = await fetch(nextSpatialSamples, { signal: request.signal })
      if (!response.ok) throw new Error('Unable to load spatial samples')
      heights = await response.json()
    }
    if (!Array.isArray(heights) || heights.length !== cloud.length || !heights.every(Number.isFinite)) throw new Error('Invalid spatial samples')
    if (!request.signal.aborted) spatialCloud.value = cloud.map((sample, index) => ({ ...sample, y: heights[index] }))
  } catch {
    if (!request.signal.aborted) spatialError.value = '三维样本加载失败。'
  } finally {
    if (spatialRequest === request) {
      spatialRequest = undefined
      spatialLoading.value = false
    }
  }
}
function clearSpatial() {
  spatialRequest?.abort()
  spatialRequest = undefined
  spatialLoading.value = false
  spatialError.value = ''
  spatialCloud.value = []
}
onBeforeUnmount(() => spatialRequest?.abort())
const gallery = [
  { id: 'district', src: deliveryArea, alt: '配送范围示意图', caption: '配送范围' },
  { id: 'route', src: deliveryArea, alt: '同一地图上的交付路径', caption: '交付路径' },
]
const managedGallery = useLightbox({ media: [gallery[0], { id: 'route-video', type: 'video', src: deliveryVideo,
  alt: '交付路线短片', poster: deliveryArea }], label: '查看交付媒资', closeLabel: '关闭交付媒资', autoplayVideo: true, bufferingLabel: '正在缓冲视频' })
const savedDeliveryNote = ref(false)
const FocusOverlayExample = defineComponent({
  setup() {
    const { containerRef, containerProps, renderOverlay } = useOverlay({ showOn: 'focus', scrim: 'light', position: 'bottom' })
    return () => h('section', { ...containerProps, ref: containerRef, class: [containerProps.class, 'standard-review__overlay-card'],
      'aria-label': '交付说明卡片' }, [
      h('p', '验收人员可在此保存交付说明。'),
      renderOverlay(h(SButton, { size: 'sm', onClick: () => { savedDeliveryNote.value = true } }, () => '保存交付说明')),
    ])
  },
})
const audio = ref('')
const playerLabels = { play: '播放', pause: '暂停', mute: '静音', unmute: '取消静音', timeline: '播放进度',
  volume: '音量', speed: '播放速度', chapters: '章节', error: '媒体无法播放。', markers: '时间标记',
  waiting: '正在加载媒体', retry: '重新加载', nextTrack: '下一音轨', skipBack: '后退', skipForward: '前进' }
const PlaybackReadout = defineComponent({
  setup() {
    const time = useMediaPlaybackTime()
    const { formatTime } = useMediaPlayer()
    return () => h('output', { 'aria-label': '视频位置' }, formatTime(time.value))
  },
})
onMounted(() => {
  if (props.id !== 'W.lightbox') return
  const sampleRate = 8000
  const samples = sampleRate * 5
  const wave = new ArrayBuffer(44 + samples * 2)
  const header = new DataView(wave)
  header.setUint32(0, 0x52494646)
  header.setUint32(4, wave.byteLength - 8, true)
  header.setUint32(8, 0x57415645)
  header.setUint32(12, 0x666d7420)
  header.setUint32(16, 16, true)
  header.setUint16(20, 1, true)
  header.setUint16(22, 1, true)
  header.setUint32(24, sampleRate, true)
  header.setUint32(28, sampleRate * 2, true)
  header.setUint16(32, 2, true)
  header.setUint16(34, 16, true)
  header.setUint32(36, 0x64617461)
  header.setUint32(40, samples * 2, true)
  for (let index = 0; index < samples; index++) {
    const seconds = index / sampleRate
    const pitch = seconds < 2 ? 220 : 275
    const envelope = Math.min(1, (seconds % 1) * 20, (1 - seconds % 1) * 5)
    header.setInt16(44 + index * 2, Math.sin(seconds * pitch * Math.PI * 2) * envelope * 900, true)
  }
  audio.value = URL.createObjectURL(new Blob([wave], { type: 'audio/wav' }))
})
onBeforeUnmount(() => { if (audio.value) URL.revokeObjectURL(audio.value) })
const fields: SearchField[] = [
  { key: 'owner', label: '负责人', options },
  { key: 'title', label: '标题', type: 'text' },
  { key: 'files', label: '文件数', type: 'number' },
  { key: 'published', label: '发布时间', type: 'date' },
]
const actions = { add: '添加筛选', apply: '应用', cancel: '取消', remove: '移除', clear: '清空筛选', field: '字段', operator: '条件', value: '值' }
const operators = { is: '等于', 'is-not': '不等于', contains: '包含', 'starts-with': '开头为', gt: '大于', lt: '小于' }
const vega: VegaChartSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  width: 'container', height: 160,
  data: { values: [{ label: '设计', quantity: 18 }, { label: '工程', quantity: 23 }, { label: '产品', quantity: 14 }] },
  mark: { type: 'bar', cornerRadiusEnd: 5, tooltip: true },
  encoding: {
    x: { field: 'label', type: 'nominal', axis: { title: null, labelAngle: 0 } },
    y: { field: 'quantity', type: 'quantitative', axis: { title: '交付量' } },
    color: { field: 'label', type: 'nominal', legend: null },
  },
}
const invalidVega = ref(false)
const nextVega = ref(false)
const vegaSource = computed(() => {
  if (invalidVega.value) return '{"$schema":"https://vega.github.io/schema/unknown/v1.json"}'
  if (!nextVega.value) return vega
  const data = import.meta.env.MODE === 'theme-sheet' ? { values: bundledVegaSamples } : { url: nextVegaSamples }
  return { ...vega, data, title: '下一批交付量' }
})
const editor = ref('export const project = {\n  label: "品牌资源",\n  version: "0.1.0",\n}\n')
const tokenizeProject: CodeEditorTokenizer = code => code.split('\n').map(line => line.split(/(version)/).map(text => ({
  text, className: text === 'version' ? 'hljs-type' : undefined,
})))
const reviewedFiles = parseUnifiedDiff([
  'diff --git a/src/project.ts b/src/delivery.ts',
  'rename from src/project.ts', 'rename to src/delivery.ts', '--- a/src/project.ts', '+++ b/src/delivery.ts',
  '@@ -1,5 +1,5 @@',
  ' export const project = {', '   label: "品牌资源",', '-  version: "0.1.0",', '+  version: "0.2.0",',
  '   assets: ["brand/guidelines/basics/typography-and-colors.pdf", "release/asset-permissions-and-attributions.md"],', ' }',
  'diff --git a/cover.png b/cover.png', 'Binary files a/cover.png and b/cover.png differ',
].join('\n'))
const reviewLines = ref<DiffLineReference[]>([])
const largeDiff = computed(() => createDiffFile({ path: 'release-log.txt',
  oldValue: Array.from({ length: 1600 }, (_, index) => `Archived ${index + 1}`).join('\n'),
  newValue: Array.from({ length: 1600 }, (_, index) => `Published ${index + 1}`).join('\n'),
}))
function annotateLine(reference: DiffLineReference) {
  if (reviewLines.value.some(line => line.side === reference.side && line.lineNumber === reference.lineNumber)) return
  reviewLines.value = [...reviewLines.value, reference]
}
const revisions = [
  ['2026-11-16', 22, 27, 20, 29], ['2026-11-17', 27, 24, 21, 28], ['2026-11-18', 24, 29, 23, 31],
  ['2026-11-19', 29, 29, 26, 33], ['2026-11-20', 29, 31, 27, 35],
] as const
const candles = revisions.map(([label, open, close, low, high]) => ({ id: label, label: label.slice(5), open, close, low, high }))
const megaGroups = [{ id: 'design', title: '设计', links: [
  { id: 'tokens', label: '主题与样式', href: '/docs/theming/', description: '查看主题 Token' },
  { id: 'vue', label: 'Vue 组件', href: '/docs/vue/components/', description: '浏览组件与示例' },
] }]
const megaFeature = { id: 'design', href: '/docs/standard-design/', label: '标准设计', description: '查看组件与动效规范', image: deliveryArea }
const tourSteps = [
  { id: 'summary', title: '查看概览', description: '项目进度在概览中更新。', target: '[data-demo-tour-summary]' },
  { id: 'files', title: '管理文件', description: '可以从这里查看交付记录。', target: '[data-demo-tour-files]' },
]

async function switchOrder(next: typeof pages.value) {
  const play = capture()
  pages.value = next
  await nextTick()
  play()
}
function reorder() { return switchOrder([...pages.value].reverse()) }
watch(animatedList, (node, _, cleanup) => {
  if (!node) return
  cleanup(createReorderable(node, {
    axis: 'horizontal',
    onMove({ key, target, placement }) {
      const item = pages.value.find(page => page.id === key)
      const next = pages.value.filter(page => page.id !== key)
      const at = next.findIndex(page => page.id === target)
      if (item && at >= 0) {
        next.splice(at + Number(placement === 'after'), 0, item)
        void switchOrder(next)
      }
    },
  }))
}, { flush: 'post' })
let animator: ReturnType<typeof createAnimator> | undefined
const motionTempo = ref(false)
const keyboardInset = useKeyboardInset()
const mapLayer = useLayer({ lightDismiss: true })
const physicsMarker = useTemplateRef<HTMLElement>('physicsMarker')
const gestureMarker = useTemplateRef<HTMLElement>('gestureMarker')
const gestureAnimator = useAnimator(gestureMarker)
let gestureOrigin = 0
usePanGesture(gestureMarker, { axis: 'x', onPan({ state, translation, velocity }) {
  if (state === 'began') {
    gestureAnimator.stop()
    gestureOrigin = gestureAnimator.get().x
  } else if (state === 'changed') gestureAnimator.set({ x: Math.max(0, Math.min(112, gestureOrigin + translation.x)) })
  else void gestureAnimator.animate({ x: gestureAnimator.get().x > 52 ? 112 : 0 }, { velocity: { x: velocity.x } })
} })
let physicsAnimator: ReturnType<typeof createAnimator> | undefined
onBeforeUnmount(() => { animator?.dispose(); physicsAnimator?.dispose() })
function replay(event: MouseEvent) {
  const element = event.currentTarget as HTMLElement
  animator ??= createAnimator(element)
  animator.animate('feedback', [{ scale: 1, opacity: .7 }, { scale: .96, opacity: .9 }, { scale: 1, opacity: 1 }], { role: 'press', reducedMotion: 'fade' })
}
function playPhysics(kind: 'spring' | 'coast' | 'tracking') {
  if (!physicsMarker.value) return
  physicsAnimator ??= createAnimator(physicsMarker.value)
  const spring = solveSpring({ from: 0, to: 128, spring: { duration: .38, bounce: .2 } })
  const result = kind === 'spring' ? spring : kind === 'coast' ? solveDecay({ from: 0, velocity: 720, rate: .995 })
    : solveSpringTowardRamp({ spring: { response: .35, dampingRatio: .85 }, from: 0, target: 20, slope: 150 })
  const duration = kind === 'spring' ? Math.max(.72, spring.settleTime(.1)) : .72
  const frames = Array.from({ length: 43 }, (_, step) => {
    const time = duration * step / 42
    return { translate: result.value(time) + 'px' }
  })
  physicsAnimator.animate('play', frames, { duration: duration * 1000, easing: 'linear', fill: 'forwards' })
}
</script>

<template>
  <MediaScenariosReview v-if="id === 'W.aspect-ratio'" kind="aspect" />
  <LayoutPrimitivesReview v-else-if="id === 'W.stack'" kind="stack" />
  <LayoutPrimitivesReview v-else-if="id === 'W.grid'" kind="grid" />
  <template v-else-if="id === 'W.blockquote'">
    <SBlockquote attribution="Syntrofic 设计规范">让状态变化有清楚的来处和结果。</SBlockquote>
    <ContentScenariosReview kind="quote" />
  </template>
  <template v-else-if="id === 'W.metadata-list'">
    <SMetadataList title="项目资料" :items="project" :limit="2" expand-label="显示更多" collapse-label="收起" />
    <MetadataListScenariosReview />
  </template>
  <IdentityMediaReview v-else-if="id === 'W.status-dot'" kind="status" />
  <template v-else-if="id === 'W.info-tip'">
    <div class="review__row"><strong>配送范围</strong><SInfoTip label="了解配送范围" text="不同服务区域使用不同的交付时段。" /></div>
    <ReferenceScenariosReview kind="info" />
  </template>
  <template v-else-if="id === 'W.clickable-card'">
    <SClickableCard label="打开品牌资源" @activate="result = '已打开品牌资源'">
      <template #header><strong>品牌资源</strong></template>
      查看项目资料和设计文件。
      <template #footer><SButton variant="secondary" size="sm" @click="result = '已复制资源名称'">复制名称</SButton></template>
    </SClickableCard>
    <p class="review__result" role="status">{{ result }}</p>
    <section class="review__row" aria-label="交互角色示例">
      <RoleReviewSurface href="#role-preview">跳至角色说明</RoleReviewSurface>
      <RoleReviewSurface id="role-preview">普通说明</RoleReviewSurface>
      <RoleReviewSurface action class="sy-button" data-size="sm" data-variant="secondary" @click="result = '已确认角色操作'">确认角色操作</RoleReviewSurface>
      <SPopover label="角色面板">
        <template #trigger><RoleReviewSurface class="sy-button" data-size="sm" data-variant="secondary">打开角色说明</RoleReviewSurface></template>
        <p>自定义控件接收弹出层的触发语义。</p>
      </SPopover>
    </section>
    <SurfaceReview kind="clickable" />
    <ProjectLinkHookReview />
  </template>
  <template v-else-if="id === 'W.selectable-card'">
    <SSelectableCard v-model="selected" label="将品牌资源加入收藏">
      <template #header><strong>品牌资源</strong></template>
      <SMotionText :value="selected ? '已加入收藏' : '加入收藏后可在工作台查看。'" />
    </SSelectableCard>
    <SurfaceReview kind="selectable" />
  </template>
  <template v-else-if="id === 'W.banner'">
    <SBanner v-model:open="shown" title="设计评审已就绪" description="组件更新已进入评审队列。" tone="success" dismissible
      dismiss-label="关闭通知" expand-label="查看详情" collapse-label="收起详情">
      <p>按钮、表单和组件示例已完成构建。</p>
    </SBanner>
    <SButton v-if="!shown" size="sm" variant="secondary" @click="shown = true">恢复通知</SButton>
    <SurfaceReview kind="banner" />
  </template>
  <template v-else-if="id === 'W.overlay'">
    <SOverlay show-on="hover" class="standard-review__media">
      <SAspectRatio :ratio="16 / 9" fit="cover"><img :src="deliveryArea" alt="配送范围示意图"></SAspectRatio>
      <template #overlay><SMediaTheme mode="dark"><SButton size="sm" variant="secondary" @click="result = '已选择地图'">选择地图</SButton>
        <span role="status">{{ result }}</span></SMediaTheme></template>
    </SOverlay>
    <FocusOverlayExample />
    <p v-if="savedDeliveryNote" role="status">已保存交付说明</p>
    <button type="button" class="sy-button" data-size="sm" data-variant="secondary" :aria-expanded="mapLayer.open.value" :aria-controls="mapLayer.id"
      :ref="mapLayer.ref" @click="mapLayer.open.value ? mapLayer.hide() : mapLayer.show()">地图图层</button>
    <SLayer :layer="mapLayer" label="地图范围"><p>图层显示访客入口及配送边界。</p></SLayer>
    <LayerReview />
    <MediaScenariosReview kind="overlay" />
  </template>
  <template v-else-if="id === 'W.scrollable-area'">
    <SScrollableArea ref="scrollable" label="交付记录" role="region" :height="144" :padding-inline="2" overscroll="contain">
      <ul><li v-for="item in 18" :key="item">交付记录 {{ item }}</li></ul>
    </SScrollableArea>
    <SButton variant="secondary" size="sm" @click="scrollable?.scrollToStart()">回到列表开头</SButton>
    <ScrollableReview />
  </template>
  <template v-else-if="id === 'W.section'">
    <SSection title="交付记录容器" variant="transparent" :max-width="520"
      :padding="4" :padding-inline-start="6" :dividers="['top', 'end']">
      <SScrollableArea label="可滚动交付记录" role="region" :height="120" :padding="2" full-bleed>
        <ul><li v-for="item in 12" :key="item">提交记录 {{ item }}</li></ul>
      </SScrollableArea>
    </SSection>
    <LayoutPrimitivesReview kind="section" />
  </template>
  <template v-else-if="id === 'W.layout'">
    <SLayout :height="236" :content-width="492" :padding="2" :default-has-dividers="true">
      <template #header><SLayoutHeader label="页面页头">交付工作台</SLayoutHeader></template>
      <template #start><SLayoutPanel v-if="shown" :width="120" role="navigation" label="资料分类" has-divider>资料分类</SLayoutPanel></template>
      <SLayoutContent label="主要资料" role="region"><ul><li v-for="item in 18" :key="item">资料 {{ item }}</li></ul></SLayoutContent>
      <template #end><SLayoutPanel v-if="selected" :width="84" label="详情" role="complementary">详情</SLayoutPanel></template>
      <template #footer><SLayoutFooter :has-divider="false">已同步</SLayoutFooter></template>
    </SLayout>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="shown = !shown">切换分类</SButton>
      <SButton size="sm" variant="secondary" @click="selected = !selected">切换详情</SButton>
    </div>
    <LayoutRegionReview />
  </template>
  <TimeReadoutReview v-else-if="id === 'W.timer'" kind="timer" />
  <TimeReadoutReview v-else-if="id === 'W.timestamp'" kind="timestamp" />
  <template v-else-if="id === 'W.text'">
    <div class="review__block">
      <SText as="h3" variant="h3" :accessibility-level="2">发布记录</SText>
      <SText type="supporting" color="accent" size="sm" tabular-numbers strikethrough>2026.11.20 · 124 项</SText>
      <SText type="body" :max-lines="1" has-truncate-tooltip="below" style="max-inline-size: 9rem">查看本周发布记录和团队交付资料，包含成员审阅结果与更新日期。</SText>
    </div>
    <TypographyReview />
  </template>
  <template v-else-if="id === 'W.command-input'">
    <SCommandInput v-model="quickQuery" label="搜索快捷指令" placeholder="输入指令" :loading="selected">
      <template #end><SKbd :keys="['⌘', 'K']" /></template>
    </SCommandInput>
    <SButton size="sm" variant="secondary" @click="selected = !selected">切换搜索状态</SButton>
    <SCommand title="内联命令面板" :groups="commandGroups" :shortcut="false" inline @select="result = $event.label">
      <template #input>
        <SCommandInput label="筛选项目命令" placeholder="搜索命令或操作">
          <template #end><SKbd :keys="['Enter']" /></template>
        </SCommandInput>
      </template>
    </SCommand>
    <p role="status">{{ result }}</p>
  </template>
  <template v-else-if="id === 'W.chat-composer-drawer' || id === 'W.chat-composer-token'">
    <SPromptInput label="编写工作消息" placeholder="输入消息" :allow-attachments="false" :labels="{ send: '发送' }" @submit="result = $event.text">
      <template #drawer>
        <SChatComposerDrawer v-model:collapsed="selected" :count="2" label="工作区上下文">
          <template #summary="{ count }"><span>已附上 {{ count }} 项上下文</span></template>
          <SChatComposerTokenElement :token="{ id: 'brief', value: '@发布清单', label: '发布清单', tone: 'blue', icon: 'file' }" />
          <SChatComposerTokenElement :token="{ id: 'planning', value: '@项目排期' }"><strong>项目排期</strong></SChatComposerTokenElement>
          <SButton size="sm" variant="ghost" @click="result = '已查看上下文'">查看上下文</SButton>
        </SChatComposerDrawer>
      </template>
    </SPromptInput>
    <p role="status" aria-label="工作区上下文结果">{{ result }}</p>
    <ComposerScenariosReview v-if="id === 'W.chat-composer-drawer'" kind="drawer" />
  </template>
  <template v-else-if="id === 'W.chat-composer-input'">
    <SChatComposerInput ref="composerInput" v-model="composerDraft" label="编写包含令牌的消息" :triggers="composerTriggers"
      :max-rows="4" :debounce-ms="40" loading-text="正在查询成员" pasted-text-label="粘贴文本" :paste-token-threshold="24"
      :paste-as-token="selected ? customPaste : true"
      @submit="result = $event; composerDraft = ''" @files="result = $event.map(file => file.name).join('、')" />
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="composerInput?.insertText('检查交付')">插入文本</SButton>
      <SButton size="sm" variant="secondary" @click="composerInput?.expandToken('team')">展开团队令牌</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="selected" @click="selected = !selected">使用自定义粘贴规则</SButton>
    </div>
    <p role="status" aria-label="编辑器令牌提交结果">{{ result }}</p>
    <ComposerEditorScenariosReview />
    <ComposerDictationReview />
  </template>
  <template v-else-if="id === 'W.tree-list'">
    <STreeList :items="treeList" :variant="selected ? 'noGuides' : 'lineGuides'" :animated-layout="captureTree" density="compact"
      @activate="result = $event.label">
      <template #header>交付资料目录</template>
      <template #end="{ item }"><SButton v-if="item.id === 'publish'" size="sm" variant="ghost" @click="result = '已打开发布设置'">设置</SButton></template>
    </STreeList>
    <div ref="treeEnd" class="review__row" data-tree-follow><SButton size="sm" variant="secondary" @click="selected = !selected">切换引导线</SButton></div>
    <p class="review__result" role="status">{{ result }}</p>
    <TreeListScenariosReview />
  </template>
  <template v-else-if="id === 'W.item'">
    <SItem label="交付资料" description="待评审" layout="inline" density="compact" interactive @activate="result = '已打开资料'">
      <template #marker><span aria-hidden="true">•</span></template>
      <template #start><SIcon icon="file" /></template>
      <template #end><SButton size="sm" variant="secondary" @click="result = '已打开详情'">详情</SButton></template>
    </SItem>
    <SItem label="订阅记录" description="跟踪文档更新" :selected="selected" :interactive-target="() => itemToggle">
      <template #start>
        <button ref="itemToggle" class="sy-button" role="switch" type="button" :aria-checked="selected" aria-label="订阅更新"
          @click="selected = !selected">{{ selected ? '已订阅' : '订阅' }}</button>
      </template>
    </SItem>
    <SItem as="a" href="#item-archive" label="项目归档" />
    <SItem label="仅管理员可用" interactive disabled @activate="result = '已执行管理员操作'" />
    <ul class="standard-review__item-list" role="list">
      <SItem as="li" label="双向滑动记录" :swipe="recordSwipe" item-key="record-17">
        <template #end>
          <SButton size="sm" variant="ghost" @click="result = '已保留 record-17'">保留记录</SButton>
          <SButton size="sm" variant="ghost" @click="result = '已归档 record-17'">归档记录</SButton>
        </template>
      </SItem>
      <SItem as="li" label="快速处理记录" :swipe="pendingSwipe" item-key="read-23">
        <template #end><SButton size="sm" variant="ghost" @click="result = '已读 read-23'">标记已读</SButton></template>
      </SItem>
    </ul>
    <p id="item-archive" role="status">{{ result }}</p>
    <CollectionItemScenariosReview />
  </template>
  <SChatMessage v-else-if="id === 'W.chat-reaction-bar'" author="林舟" source="交付文件已上传，可以开始评审。"
    locale="zh-CN" :reactions="reactions" reaction-label="消息回应" :reaction-categories="reactionChoices" add-reaction add-reaction-label="添加回应"
    @toggle-reaction="reactToChat" @add-reaction="emoji => reactToChat(emoji, true)" />
  <template v-else-if="id === 'W.comment-composer'">
    <SCommentComposer v-model="commentDraft" label="撰写评审意见" placeholder="写下建议" submit-label="发布意见"
      :anchor="selected ? undefined : commentAnchor" anchor-dismissible dismiss-anchor-label="移除引用"
      :error="commentSendError" retryable retry-label="重试" :upload-images="uploadCommentImages" attach-label="附加图片"
      :triggers="composerTriggers" :agent-commands="[{ id: 'review', value: '/review', label: '/审核交付' }]"
      emoji-picker :emoji-categories="reactionChoices" emoji-label="添加表情" locale="zh"
      @anchor-dismiss="selected = true" @retry="commentSendError = ''" @submit="result = $event; commentDraft = ''" />
    <p class="review__result" role="status">{{ result }}</p>
  </template>
  <CommentThreadReview v-else-if="id === 'W.comment-thread'" />
  <template v-else-if="id === 'W.thumbnail'">
    <div class="review__row">
      <SThumbnail v-if="thumbnail" :src="deliveryArea" alt="配送范围示意图" label="配送地图" removable actionable remove-label="移除配送地图"
        :loading="selected" loading-label="正在上传配送地图" @activate="open = true" @remove="thumbnail = false" />
      <SThumbnail label="照片上传队列" :loading="selected" loading-label="正在等待缩略图" />
      <SThumbnail :src="deliveryArea" label="已归档地图" disabled removable show-remove-on="always" remove-label="移除已归档地图" />
    </div>
    <SButton v-if="!thumbnail" size="sm" variant="secondary" @click="thumbnail = true">恢复缩略图</SButton>
    <SButton size="sm" variant="secondary" @click="selected = !selected">切换上传状态</SButton>
    <SLightbox v-model:open="open" :media="gallery.slice(0, 1)" label="配送地图预览" close-label="关闭预览" />
    <IdentityMediaReview kind="thumbnail" />
    <RevealReview variant="reveal" />
  </template>
  <template v-else-if="id === 'W.lightbox'">
    <MediaScenariosReview kind="lightbox" />
    <SLightbox v-model:open="open" v-model:index="current" :media="gallery" label="配送图集"
      close-label="关闭" previous-label="上一张" next-label="下一张" zoom-in-label="放大" zoom-out-label="缩小">
      <template #trigger="{ open: show }"><SButton @click="show()">查看配送图集</SButton></template>
    </SLightbox>
    <SButton size="sm" variant="secondary" v-bind="managedGallery.getTriggerProps(1)">打开交付短片</SButton>
    <component :is="managedGallery.element" />
    <SMediaPlayer v-if="audio" type="audio" label="音频示例" :src="audio" :labels="playerLabels" muted
      title="交付提示音" subtitle="设计规范 · 媒体测试" :artwork-src="deliveryArea"
      :skip-back-seconds="1" :skip-forward-seconds="2" :next-track="() => { result = '下一音轨已请求' }"
      :chapters="[{ start: 0, title: '开始' }, { start: 2, title: '第二段' }]"
      :markers="[{ id: 'review', time: 3, label: '评审' }]">
      <template #marker="{ marker, formattedTime }">{{ formattedTime }} · {{ marker.label }}节点</template>
    </SMediaPlayer>
    <p v-if="result" role="status">{{ result }}</p>
    <SMediaPlayer label="路线视频" :src="deliveryVideo" :poster="deliveryArea" :aspect-ratio="16 / 9"
      :tracks="[{ src: deliveryCaptions, language: 'zh-CN', label: '简体中文' }]" :labels="playerLabels">
      <template #controls>
        <div class="review__row">
          <SMediaControl kind="play" label="播放路线" alternate-label="暂停路线" variant="secondary" />
          <SMediaControl kind="seek" :offset="2" label="跳到后两秒" />
          <SMediaControl kind="captions" label="切换路线字幕" />
          <SMediaControl kind="rate" label="路线播放速度" :rates="[.5, 1, 1.5]" />
          <SMediaControl kind="fullscreen" label="全屏查看路线" alternate-label="退出全屏" />
          <PlaybackReadout />
        </div>
        <SMediaControl kind="timeline" label="路线进度" />
      </template>
    </SMediaPlayer>
  </template>
  <DateInputsReview v-else-if="id === 'W.date-time-input'" :id="id" />
  <div v-else-if="id === 'W.file-input'" class="review__editable" role="group" aria-label="文件用法示例">
    <SFileInput v-model="deliveryFile" label="交付清单" browse-label="选择交付清单" remove-text="移除"
      accept=".pdf,application/pdf" :max-size="1024 * 1024" description="选择一份不超过 1 MB 的 PDF 文件。"
      :format-rejections="describeRejectedFiles" :remove-label="removeUploadLabel" />
    <SFileInput v-model="uploads" label="参考文件" browse-label="选择文件" remove-text="移除"
      accept=".txt,.pdf,image/*" multiple :max-files="3" :max-size="5 * 1024 * 1024" description="拖放或选择最多 3 个文件，每个不超过 5 MB。"
      :format-rejections="describeRejectedFiles" :remove-label="removeUploadLabel" />
  </div>
  <template v-else-if="id === 'W.tokenizer'">
    <STokenizer v-model="members" :options="options" label="项目成员" placeholder="搜索成员"
      empty-text="没有匹配的成员" clearable clear-label="清空" :remove-label="name => '移除' + name" />
    <TokenizerScenariosReview />
    <div class="standard-review__contacts">
      <SListInput v-model="contacts" label="访客名单" item-name="访客" :columns="contactColumns" :get-item-key="item => item.id"
        :create-item="() => ({ id: ++contactId, name: '', team: '' })" :labels="contactLabels" :max-items="4" reorderable />
    </div>
  </template>
  <template v-else-if="id === 'W.power-search'">
    <SPowerSearch v-model="filters" v-model:query="query" :fields="fields" label="搜索资料"
      :labels="actions" :operator-labels="operators" placeholder="输入关键词" />
    <SPowerSearch v-model="advancedFilters" :config="deliverySearch" label="搜索交付记录" token-overflow-behavior="unfocusedInline"
      :result-count="visibleDeliveries" :labels="{ ...actions, add: '添加交付条件', more: '更多条件', end: '上限',
        filters: '交付条件', done: '完成', back: '返回', discard: '放弃修改', confirmDiscard: '放弃筛选变更？', confirmClear: '清空可编辑条件？', empty: '暂无条件',
        unit: '时间单位', days: '天', weeks: '周', months: '个月' }"
      :operator-labels="{ ...operators, in: '属于', 'not-in': '不属于', last: '最近', next: '接下来' }">
      <template #end="{ count }"><output aria-label="匹配记录">{{ count }} 条记录</output></template>
    </SPowerSearch>
    <SPowerSearch v-model="structuredFilters" :config="structuredSearch" label="组合记录筛选" field-suggestions
      :result-count="structuredCount" :labels="{ ...actions, add: '添加组合条件', applyNested: '应用子条件', value: '条件值' }"
      :operator-labels="{ ...operators, in: '属于' }">
      <template #end="{ count }"><output aria-label="组合匹配数">{{ count }} 条记录</output></template>
    </SPowerSearch>
    <I18nProvider locale="fa-IR" calendar="persian">
      <SPowerSearch v-model="calendarFilters" :config="calendarSearch" label="跨历法日期筛选"
        :result-count="calendarCount" :labels="{ ...actions, add: '添加签收日期', value: '日期值', calendar: '选择日期' }" :operator-labels="operators">
        <template #end="{ count }"><output aria-label="签收匹配数">{{ count }} 条记录</output></template>
      </SPowerSearch>
      <output aria-label="签收日存储值">{{ calendarFilters[0]?.value }}</output>
    </I18nProvider>
    <PowerSearchScenariosReview />
  </template>
  <template v-else-if="id === 'W.overflow-list'">
    <SButton size="sm" variant="ghost" @click="narrow = !narrow">{{ narrow ? '展开容器' : '缩小容器' }}</SButton>
    <SOverflowList :style="{ inlineSize: narrow ? '11rem' : '100%' }" :items="links" label="项目导航" more-label="更多">
      <template #item="{ item }"><SButton variant="secondary" size="sm" @click="result = item.label">{{ item.label }}</SButton></template>
      <template #overflow="{ item }"><SButton variant="ghost" size="sm" @click="result = item.label">{{ item.label }}</SButton></template>
    </SOverflowList>
    <p class="review__result" role="status" aria-label="项目导航操作结果">{{ result }}</p>
    <OverflowScenariosReview />
  </template>
  <template v-else-if="id === 'W.snap-paging'">
    <SSnapPaging v-model="current" :pages="pages" label="资料分组" previous-label="上一组" next-label="下一组">
      <template #default="{ item }"><SSurface class="standard-review__panel" tone="blue">{{ item.label }}</SSurface></template>
    </SSnapPaging>
    <div class="review__row">
      <SPageControl v-model="chapterPage" :total-pages="18" label="资料章节" :page-label="page => `第 ${page} 章`" />
      <span>{{ chapterPage }} / 18</span>
    </div>
  </template>
  <template v-else-if="id === 'W.swipe-actions'">
    <SSwipeActions label="显示操作" close-label="收起操作">
      最近交付记录
      <template #actions="{ close }"><SButton size="sm" variant="danger" @click="result = '已归档'; close()">归档</SButton></template>
    </SSwipeActions>
    <p class="review__result" role="status">{{ result }}</p>
  </template>
  <TransferListReview v-else-if="id === 'W.transfer-list'" />
  <NavigationStackReview v-else-if="id === 'W.navigation-stack'" />
  <div v-else-if="id === 'W.tour'" class="review__row">
    <SButton data-demo-tour-summary size="sm" variant="secondary" @click="result = '已打开概览'">概览</SButton>
    <SButton data-demo-tour-files size="sm" variant="secondary" @click="result = '已打开文件'">文件</SButton>
    <SButton size="sm" variant="ghost" :aria-pressed="selected" @click="selected = !selected">聚焦遮罩</SButton>
    <STour previous-label="上一步" next-label="下一步" finish-label="完成" dismiss-label="关闭导览" skip-label="跳过"
      show-step-count :backdrop="selected" @dismiss="result = ({ complete: '导览完成', escape: '键盘退出', backdrop: '点按遮罩退出', close: '关闭导览', skip: '已跳过导览' })[$event]">
      <template #trigger="{ open: show }"><SButton size="sm" @click="show">开始导览</SButton></template>
      <template #steps>
        <STourStep v-for="part in tourSteps" :id="part.id" :key="part.id" :target="part.target" :title="part.title" alignment="start">
          <p>{{ part.description }}</p>
        </STourStep>
      </template>
    </STour>
    <p class="review__result" role="status">{{ result }}</p>
  </div>
  <LogStreamReview v-else-if="id === 'W.log-stream'" />
  <div v-else-if="id === 'W.icon'" class="review__row">
    <SIcon v-for="icon in (['plus', 'check', 'search', 'link', 'file'] as const)" :key="icon" :name="icon" :size="24" />
    <SIcon name="chevron" :size="24" mirror label="下一项" />
    <SIcon icon="review:location" :variant="selected ? 'filled' : undefined" size="lg" color="accent" label="自定义位置" />
    <SIcon :icon="reviewIcon" :size="14" color="blue" label="外部图形" />
    <SIcon icon="calendar" size="sm" color="success" />
    <SWeightedIconSprite :icons="[weightedMark]">
      <span :style="{ fontWeight: selected ? 700 : 400 }"><SWeightedIcon :icon="weightedMark" sprite label="方向标记" /></span>
    </SWeightedIconSprite>
    <SButton size="sm" variant="ghost" @click="selected = !selected">切换图标字重</SButton>
    <IconRegistryReview />
    <IconScenariosReview />
  </div>
  <LocalizationScenariosReview v-else-if="id === 'W.internationalization-provider'" />
  <ThemeScenariosReview v-else-if="id === 'W.brand-theme'" />
  <InteractionHooksReview v-else-if="id === 'W.interaction-tools'" />
  <FormLayoutReview v-else-if="id === 'W.form-layout'" />
  <template v-else-if="id === 'W.field-status'">
    <SInput label="联系地址" :status="selected ? { type: 'error', message: '请输入可用的联系地址' } : undefined" />
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="selected = true">检查联系地址</SButton>
      <SButton size="sm" variant="secondary" @click="open = true">打开验证对话框</SButton>
    </div>
    <SFieldStatus type="success" variant="detached" message="已保存工作区设置" />
    <FieldStatusReview />
    <FieldHooksReview kind="status" />
    <SDialog v-model:open="open" title="验证对话框">
      <SFieldStatus type="warning" variant="detached" message="确认前请检查负责人" />
      <SButton size="sm" @click="open = false">完成</SButton>
    </SDialog>
  </template>
  <div v-else-if="id === 'W.nav-icon'" class="review__row">
    <SNavIcon icon="file" label="文件导航" /><SNavIcon icon="info" />
    <SNavIcon><SIcon name="link" /></SNavIcon>
  </div>
  <div v-else-if="id === 'W.nav-menu'" class="review__row">
    <SSurface tone="neutral">
      <SNavMenu label="工作区分区" :min-width="220">
        <SNavMenuItem v-for="entry in navigationEntries" :key="entry.id" :label="entry.title" :description="entry.description"
          :icon="entry.icon" :disabled="entry.disabled" :href="entry.href" @select="result = entry.title" />
      </SNavMenu>
    </SSurface>
    <p class="review__result" role="status">{{ result }}</p>
  </div>
  <div v-else-if="id === 'W.top-nav-menu'" class="review__row">
    <STopNavMenu label="工作区" :items="navigationEntries" @select="result = $event.title" />
    <SButton size="sm" variant="ghost" @click="result = '设置'">设置</SButton>
    <p class="review__result" role="status">{{ result }}</p>
  </div>
  <template v-else-if="id === 'W.mobile-nav'">
    <div class="review__row">
      <SMobileNavToggle v-model:open="open" label="展开项目导航" controls-id="review-mobile-drawer" />
      <SButton size="sm" variant="secondary" @click="selected = !selected">切换导航方向</SButton>
      <SMobileNav v-model:open="open" title="项目导航" :direction="selected ? 'rtl' : 'ltr'" side="start" :width="360"
        controls-id="review-mobile-drawer" dismiss-label="关闭导航">
        <template #header><strong>资料工作区</strong></template>
        <SSideNavSection title="项目">
          <SSideNavItem v-for="item in links.slice(0, 3)" :key="item.id" :label="item.label" :current="item.id === (result || 'resources')"
            @activate="result = item.id" />
        </SSideNavSection>
        <SSideNavSection title="配置">
          <SSideNavItem v-for="item in links.slice(3)" :key="item.id" :label="item.label" :current="item.id === result"
            @activate="result = item.id" />
        </SSideNavSection>
      </SMobileNav>
    </div>
    <MobileNavScenariosReview />
  </template>
  <template v-else-if="id === 'W.side-nav-heading'">
    <SSurface class="standard-review__side-nav" tone="neutral">
      <SSideNavHeading heading="资料库" icon="file" heading-href="#library" superheading="设计团队"
        superheading-href="#team" subheading="共享工作区" menu-label="切换资料库" :collapsed="selected">
        <template #end><SButton size="sm" variant="ghost" @click="result = '通知已读'">标记已读</SButton></template>
        <template #menu>
          <SNavMenu label="资料库切换" size="sm">
            <SNavMenuItem label="共享资料" @select="result = '共享资料'" />
            <SNavMenuItem label="归档资料" disabled />
          </SNavMenu>
        </template>
      </SSideNavHeading>
      <SSideNavHeading heading="模板" subheading="浏览模板" icon="link" heading-href="#templates" />
    </SSurface>
    <SButton size="sm" variant="secondary" @click="selected = !selected">切换折叠</SButton>
    <p class="review__result" role="status">{{ result }}</p>
  </template>
  <template v-else-if="id === 'W.side-nav-item' || id === 'W.side-nav-section'">
    <nav class="standard-review__side-nav" aria-label="资料导航">
      <SSideNavSection title="团队资源" subtitle="设计文件与交付记录">
        <template #end><SButton size="sm" variant="ghost" @click="result = '添加资源'">添加</SButton></template>
        <SSideNavItem label="项目" icon="file" selected-icon="check" :current="!result || result === '项目'"
          v-model:expanded="open" collapsible expand-label="展开" @activate="result = '项目'">
          <template #end><SChip label="2" /></template>
          <template #actions><SButton size="sm" variant="ghost" @click="result = '重命名项目'">重命名</SButton></template>
          <template #children>
            <ul class="sy-sidebar__list" role="list">
              <SSideNavItem label="交付文件" icon="link" :current="result === '交付文件'" @activate="result = '交付文件'" />
              <SSideNavItem label="草稿" disabled />
            </ul>
          </template>
        </SSideNavItem>
      </SSideNavSection>
      <SSideNavSection title="归档" header-hidden><SSideNavItem label="历史版本" @activate="result = '历史版本'" /></SSideNavSection>
    </nav>
    <p class="review__result" role="status">{{ result }}</p>
  </template>
  <template v-else-if="id === 'W.tab-menu'">
    <STabs v-model="tabMenuSelection" label="工作区选项卡" :tabs="[{ value: 'overview', label: '概览' }, { value: 'files', label: '文件' }]"
      :overflow="{ label: '更多面板', options: tabOptions }" activation="manual">
      <template #panel="{ tab }"><SSurface tone="neutral" class="review__block">{{ tab.label }}面板</SSurface></template>
    </STabs>
    <STabMenu v-model="result" label="切换状态" :options="[{ value: 'ready', label: '已就绪' }, { value: 'draft', label: '草稿' }]"
      id="review-tab-menu-trigger" data-review-tab-action role="link" aria-haspopup="false" @click="current++" />
    <p role="status">{{ current }} 次打开菜单操作</p>
  </template>
  <template v-else-if="id === 'W.indicator'">
    <div class="review__row">
      <SIndicator :state="selected ? 'on' : 'off'" /><SIndicator state="mixed" /><SIndicator kind="radio" state="on" />
      <SButton variant="secondary" size="sm" @click="selected = !selected">切换第一项</SButton>
    </div>
    <RevealReview variant="ring" />
  </template>
  <template v-else-if="id === 'W.visually-hidden'">
    <SButton size="sm" variant="secondary" @click="result = '已找到帮助入口'">
      <SIcon name="info" /><SVisuallyHidden>了解当前选项</SVisuallyHidden>
    </SButton>
    <ContentScenariosReview kind="hidden" />
  </template>
  <template v-else-if="id === 'W.chat-dictation-button'">
    <section class="review__row" aria-label="独立听写按钮">
      <SChatDictationButton locale="zh-CN" label="开始听写" stop-label="停止听写" unavailable-label="当前浏览器不支持听写" :hide-when-unsupported="false"
        @transcript="result = $event" @error="result = '听写当前不可用'" />
      <span role="status">{{ result }}</span>
    </section>
    <ComposerDictationReview include-states />
  </template>
  <SMegaMenu v-else-if="id === 'W.mega-menu'" label="浏览资源" :groups="megaGroups" :feature="megaFeature" />
  <template v-else-if="id === 'W.top-nav-mega-menu'">
    <SNavbar label="产品导航" brand="交付平台" menu-label="移动产品导航" :breakpoint="460">
      <template #menus>
        <li>
          <STopNavMegaMenu label="浏览产品" @open-change="status = $event">
            <template #items>
              <STopNavMegaMenuItem title="交付分析" icon="calendar" description="汇总最近的文件和发布进度" @select="result = '交付分析'" />
              <STopNavMegaMenuItem title="通知中心" icon="info" description="查看团队通知" :close-on-select="false" @select="result = '通知中心'" />
            </template>
            <template #featured>
              <STopNavMegaMenuFeaturedCard title="最新发布" description="共享资料库已开放。" action-label="查看发布记录"
                href="#review-release-notes" @select="result = '查看发布记录'" />
            </template>
          </STopNavMegaMenu>
        </li>
      </template>
    </SNavbar>
    <p id="review-release-notes" class="review__result" role="status"><SMotionText :value="result" /></p>
  </template>
  <template v-else-if="id === 'W.outline'">
    <div class="standard-review__outline-workspace">
      <SOutline label="资料目录" :items="generatedOutline" :scroll-root="outlineContent" :offset="14" :scroll-on-click="!selected"
        @navigate-start="result = `开始导航 ${$event}`" @navigate-end="current++; result = `已结束导航 ${$event}`" />
      <section ref="outlineContent" class="standard-review__outline-content" aria-label="资料正文" tabindex="0">
        <section v-for="part in outlineSections" :key="part.id">
          <component :is="'h' + part.level" :id="part.id">{{ part.label }}</component><p>{{ part.description }}</p>
        </section>
      </section>
    </div>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="selected = !selected">{{ selected ? '恢复自动滚动' : '停用自动滚动' }}</SButton>
      <SButton size="sm" variant="secondary" :aria-expanded="open" @click="open = !open">显示 Markdown 目录</SButton>
    </div>
    <div v-if="open" class="standard-review__outline-workspace">
      <SOutline label="发布目录" :items="markdownOutline" />
      <SMarkdown :source="markdownSource" :plugins="outlinePlugins" :streaming="!status" heading-ids heading-prefix="release-" />
      <SButton v-if="!status" size="sm" variant="secondary" @click="status = true">完成发布文档</SButton>
    </div>
    <p class="review__result" role="status" aria-label="资料导航结果" :data-navigate-ends="current">{{ result }}</p>
    <OutlineScenariosReview />
  </template>
  <template v-else-if="id === 'W.selector-option'">
    <SSelect label="预设说明" :options="richOptions" placeholder="选择预设">
      <template #option="{ option }"><SSelectorOption :label="option.label" :description="option.description" /></template>
    </SSelect>
    <SSelect v-model="result" label="项目分组" :options="richOptions" placeholder="选择分组">
      <template #option="{ option }">
        <SSelectorOption :label="option.label" :description="option.description" :icon="option.icon">
          <template v-if="option.endLabel" #end><SChip :label="option.endLabel" /></template>
        </SSelectorOption>
      </template>
    </SSelect>
  </template>
  <template v-else-if="id === 'W.typeahead-item'">
    <SAutocomplete label="搜索团队项目" :options="richOptions" placeholder="输入资源或成员名称">
      <template #option="{ option }"><STypeaheadItem :item="option" /></template>
    </SAutocomplete>
    <TypeaheadScenariosReview items-only />
  </template>
  <template v-else-if="id === 'W.complex-selector'">
    <SComplexSelector v-model="publishingArea" label="发布分组" description="变更会应用到下次发布。" :width="270" required
      start-icon="file" :change-action="savePublishingArea" failure-message="保存失败，已恢复原分组。">
      <template #default="{ commit, close, busy }">
        <div class="review__row">
          <SButton size="sm" variant="secondary" :disabled="busy" @click="commit('归档')">选择归档</SButton>
          <SButton size="sm" variant="secondary" :disabled="busy" @click="async () => { if (await commit('工程')) close() }">选择工程</SButton>
        </div>
      </template>
    </SComplexSelector>
    <SComplexSelector label="组织默认分组" trigger-label="由管理员配置" disabled disabled-message="仅工作区管理员可变更。" :width="270" />
    <SComplexSelector v-model="result" label="快捷选择" variant="ghost">
      <template #trigger="{ attrs }"><SButton v-bind="attrs" size="sm" variant="ghost">{{ result || '打开快捷选择' }}</SButton></template>
      <template #default="{ commit, close }"><SButton size="sm" @click="commit('已选模板'); close()">选择模板</SButton></template>
    </SComplexSelector>
    <ComplexSelectorScenariosReview />
  </template>
  <template v-else-if="id === 'W.code-editor'">
    <SButton size="sm" variant="secondary" :aria-pressed="selected" @click="selected = !selected">使用项目高亮规则</SButton>
    <SCodeEditor v-model="editor" label="编辑项目配置" language="ts" line-numbers :max-height="140" size="sm"
      indent-with-tab placeholder="输入项目配置" :tokenizer="selected ? tokenizeProject : undefined" />
    <SCodeEditor :model-value="editor" label="只读项目配置" language="ts" readonly :rows="3" />
  </template>
  <template v-else-if="id === 'W.diff-viewer'">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-pressed="selected" @click="selected = !selected">并排查看</SButton>
      <SButton size="sm" variant="secondary" :aria-expanded="open" @click="open = !open">显示大型差异示例</SButton>
    </div>
    <SDiffViewer :file="reviewedFiles[0]" :view-mode="selected ? 'split' : 'unified'" :change-indicator="selected ? 'bars' : 'classic'"
      label="版本更新" before-label="旧行号" after-label="新行号" line-label="内容" changed-label="仅看变更"
      scroll-label="水平滚动差异"
      add-label="已添加" remove-label="已移除" :status-labels="{ renamed: '已重命名' }" inline-highlight="char"
      :context="1" line-interactive :annotation-lines="reviewLines" @line-click="annotateLine">
      <template #annotation="{ side, lineNumber }"><p>正在评审{{ side === 'new' ? '新版' : '旧版' }}第 {{ lineNumber }} 行</p></template>
    </SDiffViewer>
    <SDiffViewer :file="reviewedFiles[1]" binary-label="二进制文件已更新" />
    <SDiffViewer v-if="open" :file="largeDiff" show-full-label="展开完整差异" :large-change-label="count => `大型变更，共 ${count} 行`" />
  </template>
  <div v-else-if="id === 'W.comment-pin'" class="review__row">
    <SCommentPin v-model="selected" label="打开 4 条评审意见，其中 1 条未读" :participants="people.map(person => ({ id: person.id, name: person.label }))"
      :thread-count="4" :unread-count="1" />
    <span role="status">{{ selected ? '已打开评审意见' : '' }}</span>
  </div>
  <CommentsReview v-else-if="id === 'W.comments'" />
  <SSankeyChart v-else-if="id === 'W.sankey-chart'" label="资源流向" :nodes="flowNodes" :links="flowLinks"
    data-label="查看数据" total-label="合计" />
  <template v-else-if="id === 'W.spatial-chart'">
    <div class="review__row">
      <SButton v-for="(label, key) in markLabels" :key="key" size="sm" :variant="key === mark ? 'primary' : 'secondary'"
        :aria-pressed="key === mark" @click="mark = key">{{ label }}</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="selected" @click="selected = !selected">使用 SVG 绘制</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="spinSpatial" @click="spinSpatial = !spinSpatial">自动旋转</SButton>
      <SButton size="sm" variant="secondary" :aria-disabled="spatialLoading || undefined" @click="refreshSpatial">加载下一批样本</SButton>
      <SButton size="sm" variant="ghost" @click="clearSpatial">清空样本</SButton>
    </div>
    <SSpatialChart :data="spatialCloud" :mark="mark" label="三维样本" controls-label="三维视图操作" data-label="查看数据"
      :renderer="selected ? 'svg' : 'auto'" :axis-labels="{ x: '样本', y: '强度', z: '时间' }"
      :auto-rotate="spinSpatial ? 24 : 0" :loading="spatialLoading" loading-text="正在加载三维样本" empty-text="暂无三维样本"
      :error="spatialError" :retry="refreshSpatial" retry-label="重试加载三维样本"
      rotate-left-label="向左旋转" rotate-right-label="向右旋转" reset-label="重置视角" unavailable-label="此设备暂时无法绘制三维图表。" />
  </template>
  <template v-else-if="id === 'W.webgl-chart'">
    <div class="review__row">
      <SButton size="sm" :variant="plotMark === 'dot' ? 'primary' : 'secondary'" @click="plotMark = 'dot'">散点</SButton>
      <SButton size="sm" :variant="plotMark === 'dot-interactive' ? 'primary' : 'secondary'" @click="plotMark = 'dot-interactive'">可检查散点</SButton>
      <SButton size="sm" :variant="plotMark === 'heatmap' ? 'primary' : 'secondary'" @click="plotMark = 'heatmap'">热力</SButton>
      <SButton size="sm" :variant="plotMark === 'stream' ? 'primary' : 'secondary'" @click="plotMark = 'stream'">折线</SButton>
      <SButton v-if="plotMark === 'heatmap'" size="sm" variant="secondary" :aria-pressed="namedHeatmap" @click="namedHeatmap = !namedHeatmap">使用分类标签</SButton>
      <template v-if="plotMark === 'stream'">
        <SButton size="sm" variant="secondary" :aria-pressed="wideStream" @click="wideStream = !wideStream">加粗折线</SButton>
        <SButton size="sm" variant="secondary" @click="appendSamples">追加采样</SButton>
        <SButton size="sm" variant="ghost" @click="webglExample?.clear()">清空采样</SButton>
      </template>
    </div>
    <SWebGLChart ref="webglExample" :data="webglSamples" :mark="plotMark" :buffer-size="50" :cell-gap=".06" :line-width="wideStream ? 5 : 1"
      :color-range="['var(--sy-surface-blue)', 'var(--sy-chart-blue)', 'var(--sy-chart-sage)']" label="采样分布" value-label="强度" data-label="查看数据"
      unavailable-label="此设备暂时无法绘制 WebGL 图表。">
      <template v-if="plotMark === 'dot-interactive'" #tooltip="{ datum }">
        <div class="standard-review__callout">样本 {{ datum.id }} · 强度 {{ datum.value }}</div>
      </template>
    </SWebGLChart>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="sharedStream?.push('下午', 1.16); sharedStream?.push('傍晚', 2.45)">追加实时进度</SButton>
      <SButton size="sm" variant="ghost" @click="sharedStream?.clear()">清空实时进度</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="sharedRenderer === 'svg'"
        @click="sharedRenderer = sharedRenderer === 'webgl' ? 'svg' : 'webgl'">使用 SVG 回退</SButton>
    </div>
    <SComposedChart :data="sharedHistory" :series="[{ key: 'plan', label: '计划', mark: 'line', color: 'var(--sy-chart-blue)' },
      { key: 'actual', label: '实时进度', mark: 'dot', color: 'var(--sy-chart-sage)' }]"
      :domain="[0, 3]" :animate="false" label="配送阶段与进度" data-label="查看阶段数据"
      :axis-format="value => sharedRows.find(row => row.value === value)?.key ?? String(value)">
      <template #underlay="{ plot }">
        <SChartWebGLLayer mark="heatmap" :plot="plot" :cells="sharedCells" :rows="sharedRows" :opacity=".45" :renderer="sharedRenderer" />
      </template>
      <template #default="{ plot }">
        <SChartWebGLLayer ref="sharedStream" mark="stream" :plot="plot" :points="sharedStreamPoints" :buffer-size="3" canvas-placement="overlay"
          :line-width="4" :renderer="sharedRenderer" />
      </template>
    </SComposedChart>
  </template>
  <template v-else-if="id === 'W.vega-chart'">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-pressed="nextVega" @click="nextVega = !nextVega">查看下一批交付数据</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="invalidVega" @click="invalidVega = !invalidVega">模拟规范错误</SButton>
    </div>
    <SVegaChart :spec="vegaSource" label="交付数据" loading-label="正在绘制交付数据" error-label="无法绘制数据" />
  </template>
  <SCandlestickChart v-else-if="id === 'W.candlestick-chart'" label="每日价格区间" :data="candles" data-label="查看数据"
    :labels="{ open: '开盘', close: '收盘', high: '最高', low: '最低' }" />
  <template v-else-if="id === 'W.motion'">
    <div class="review__row" :style="{ '--sy-motion-tempo': motionTempo ? 2 : 1 }">
      <SButton size="sm" @click="reorder">反转顺序</SButton>
      <SButton size="sm" variant="secondary" @click="replay">播放按压反馈</SButton>
      <SButton size="sm" variant="secondary" :aria-pressed="motionTempo" @click="motionTempo = !motionTempo">慢速预览</SButton>
    </div>
    <div ref="animatedList" class="review__row standard-review__reorder" aria-label="拖动或按 Alt 和方向键排序" role="group"
      :style="{ '--sy-motion-tempo': motionTempo ? 2 : 1 }">
      <SChip v-for="item in pages" :key="item.id" :label="item.label" :data-reorder-key="item.id"
        data-reorder-handle tabindex="0" />
    </div>
    <div class="standard-review__snap">
      <div ref="slider" class="standard-review__grab" data-snap-marker aria-hidden="true">↔</div>
    </div>
    <div class="review__row" aria-label="吸附位置" role="group">
      <SButton v-for="(point, index) in [0, 64, 128]" :key="point" size="sm" variant="secondary"
        :aria-pressed="current === point" @click="snap?.snapTo(point)">位置 {{ index + 1 }}</SButton>
    </div>
    <div class="standard-review__snap" :style="{ '--sy-motion-tempo': motionTempo ? 2 : 1 }">
      <div ref="physicsMarker" class="standard-review__grab" data-physics-marker aria-hidden="true">·</div>
    </div>
    <div class="review__row" aria-label="运动曲线" role="group">
      <SButton size="sm" variant="secondary" @click="playPhysics('spring')">播放弹簧</SButton>
      <SButton size="sm" variant="secondary" @click="playPhysics('coast')">播放惯性减速</SButton>
      <SButton size="sm" variant="secondary" @click="playPhysics('tracking')">追踪移动目标</SButton>
    </div>
    <div class="standard-review__snap">
      <div ref="gestureMarker" class="standard-review__grab" data-gesture-marker aria-hidden="true">↔</div>
    </div>
    <div class="review__row" aria-label="手势弹簧" role="group">
      <SButton size="sm" variant="secondary" @click="gestureAnimator.animate({ x: 112 })">弹至停靠点</SButton>
      <SButton size="sm" variant="ghost" @click="gestureAnimator.animate({ x: 0 })">回到起点</SButton>
    </div>
    <SInput label="软键盘视口" :status="{ type: 'info', message: `底部偏移 ${keyboardInset} px` }" placeholder="在触屏设备上聚焦" />
    <KeyboardRevealReview />
    <SnapToolsReview />
    <LayoutToolsReview />
    <MotionThemeReview />
    <MotionScenariosReview />
  </template>
</template>

<style scoped>
.standard-review__media { inline-size: min(100%, 30rem); border-radius: var(--sy-radius-md); overflow: clip; }
.standard-review__panel { min-block-size: 7rem; display: grid; place-items: center; }
.standard-review__side-nav { inline-size: min(100%, 21rem); }
.standard-review__outline-workspace { display: grid; grid-template-columns: minmax(7rem, 13rem) minmax(0, 1fr); align-items: start; gap: var(--sy-space-3); }
.standard-review__outline-content { block-size: 11rem; overflow: auto; padding: 0 var(--sy-space-2); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-sm); }
.standard-review__outline-content > section { min-block-size: 9.5rem; }
.standard-review__outline-content :is(h2, h3, h4) { scroll-margin-top: 11px; }
.standard-review__item-list { margin: 0; padding: 0; display: grid; gap: 4px; }
.standard-review__contacts { max-block-size: 22rem; overflow: auto; overflow-anchor: none; padding: var(--sy-space-1); }
.standard-review__overlay-card { min-block-size: 5rem; padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); background: var(--sy-surface-muted); }
@media (max-width: 520px) { .standard-review__outline-workspace { grid-template-columns: minmax(0, 1fr); } }
.standard-review__reorder .sy-chip { touch-action: pan-y; cursor: grab; }
.standard-review__reorder [data-sy-reordering] { z-index: 1; background: var(--sy-accent-soft); }
.standard-review__reorder [data-sy-reorder-target='before'] { box-shadow: -3px 0 var(--sy-accent); }
.standard-review__reorder [data-sy-reorder-target='after'] { box-shadow: 3px 0 var(--sy-accent); }
.standard-review__snap {
  inline-size: 11rem; padding: .25rem; border-radius: var(--sy-radius-pill); background: var(--sy-surface-muted);
}
.standard-review__grab {
  display: grid; place-items: center; block-size: 2.25rem; inline-size: 3rem;
  border-radius: var(--sy-radius-pill); background: var(--sy-accent); color: var(--sy-accent-on);
  touch-action: pan-y; user-select: none; cursor: grab;
}
</style>
