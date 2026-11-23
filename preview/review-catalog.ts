export const dateInputItems = [
  ['W.input-otp', '验证码输入', 'SInputOTP'],
  ['W.number-field', '数字输入', 'SNumberField'],
  ['W.search-field', '搜索输入', 'SSearchField'],
  ['W.calendar', '日历', 'SCalendar'],
  ['W.date-field', '日期输入', 'SDateField'],
  ['W.date-picker', '日期选择器', 'SDatePicker'],
  ['W.date-range-picker', '日期范围选择器', 'SDateRangePicker'],
  ['W.range-calendar', '范围日历', 'SRangeCalendar'],
  ['W.time-field', '时间输入', 'STimeField'],
  ['W.export.calendar-year-picker', '年份选择器', 'SCalendarYearPicker'],
  ['W.export.date-input-group', '组合日期输入', 'SDateInputGroup'],
] as const

export const dateInputExamples = new Set<string>(dateInputItems.map(([id]) => id))

const overlayFeedbackItems = [
  ['W.drawer', '抽屉', 'SDrawer'],
  ['W.sheet', '滑出面板', 'SSheet'],
  ['W.toast', '轻提示', 'SToast'],
  ['W.slider', '滑块', 'SSlider'],
  ['W.meter', '度量条', 'SMeter'],
  ['W.progress-bar', '线性进度', 'SProgressBar'],
  ['W.progress-circle', '环形进度', 'SProgressCircle'],
  ['W.avatar-group', '头像组', 'SAvatarGroup'],
  ['W.kbd', '快捷键', 'SKbd'],
  ['W.typography', '排版', 'STypography'],
  ['W.scroll-shadow', '滚动边缘提示', 'SScrollShadow'],
] as const

export const overlayFeedbackExamples = new Set<string>(overlayFeedbackItems.map(([id]) => id))

const colorItems = [
  ['W.color-area', '二维调色区', 'SColorArea'],
  ['W.color-field', '颜色输入', 'SColorField'],
  ['W.color-picker', '颜色选择器', 'SColorPicker'],
  ['W.color-slider', '颜色滑块', 'SColorSlider'],
  ['W.color-swatch', '色样', 'SColorSwatch'],
  ['W.color-swatch-picker', '色板选择器', 'SColorSwatchPicker'],
  ['W.export.color-input-group', '组合颜色输入', 'SColorInputGroup'],
  ['W.export.rac', 'Vue 辅助入口', 'ListBoxLoadMoreItem'],
] as const

export const colorExamples = new Set<string>(colorItems.filter(([id]) => id !== 'W.export.rac').map(([id]) => id))

const proFeedbackItems = [
  ['WP.number-value', '数值显示', 'SNumberValue'],
  ['WP.trend-chip', '趋势标签', 'STrendChip'],
  ['WP.pressable-feedback', '按压反馈', 'SPressableFeedback'],
  ['WP.rating', '评分', 'SRating'],
  ['WP.emoji-picker', '表情选择器', 'SEmojiPicker'],
  ['WP.emoji-reaction-button', '表情反应按钮', 'SEmojiReactionButton'],
] as const

export const proFeedbackExamples = new Set<string>(proFeedbackItems.map(([id]) => id))

const proSettingsItems = [
  ['WP.cell-color-picker', '单元格颜色选择器', 'SCellColorPicker'],
  ['WP.cell-select', '单元格选项', 'SCellSelect'],
  ['WP.cell-slider', '单元格滑块', 'SCellSlider'],
  ['WP.cell-switch', '单元格开关', 'SCellSwitch'],
  ['WP.inline-select', '行内选项', 'SInlineSelect'],
  ['WP.native-select', '原生下拉选择', 'SNativeSelect'],
] as const

export const proSettingsExamples = new Set<string>(proSettingsItems.map(([id]) => id))

const proFormControlsItems = [
  ['WP.checkbox-button-group', '按钮式复选组', 'SCheckboxButtonGroup'],
  ['WP.radio-button-group', '按钮式单选组', 'SRadioButtonGroup'],
  ['WP.number-stepper', '数字步进器', 'SNumberStepper'],
  ['WP.drop-zone', '文件拖放区', 'SDropZone'],
] as const

export const proFormControlsExamples = new Set<string>(proFormControlsItems.map(([id]) => id))

const proContentItems = [
  ['WP.rich-text-editor', '富文本编辑器', 'SRichTextEditor'],
  ['WP.markdown', 'Markdown 渲染', 'SMarkdown'],
  ['WP.code-block', '代码块', 'SCodeBlock'],
] as const

export const proContentExamples = new Set<string>(proContentItems.map(([id]) => id))

const proNavigationItems = [
  ['WP.segment', '分段选择', 'SSegment'],
  ['WP.stepper', '步骤条', 'SStepper'],
  ['WP.context-menu', '上下文菜单', 'SContextMenu'],
] as const

export const proNavigationExamples = new Set<string>(proNavigationItems.map(([id]) => id))

const proAppShellItems = [
  ['WP.app-layout', '应用布局', 'SAppLayout'],
  ['WP.navbar', '顶部导航', 'SNavbar'],
  ['WP.sidebar', '侧边栏', 'SSidebar'],
] as const

export const proAppShellExamples = new Set<string>(proAppShellItems.map(([id]) => id))

const proComposedItems = [
  ['WP.command', '命令面板', 'SCommand'],
  ['WP.resizable', '可调整面板', 'SResizable'],
  ['WP.action-bar', '批量操作栏', 'SActionBar'],
] as const

export const proComposedExamples = new Set<string>(proComposedItems.map(([id]) => id))

const proDataDisplayItems = [
  ['WP.agenda', '日程', 'SAgenda'],
  ['WP.carousel', '轮播', 'SCarousel'],
  ['WP.empty-state', '空状态', 'SEmptyState'],
] as const

export const proDataDisplayExamples = new Set<string>(proDataDisplayItems.map(([id]) => id))

const proCollectionsItems = [
  ['WP.data-grid', '数据网格', 'SDataGrid'],
  ['WP.file-tree', '文件树', 'SFileTree'],
  ['WP.floating-toc', '浮动目录', 'SFloatingToc'],
] as const

export const proCollectionsExamples = new Set<string>(proCollectionsItems.map(([id]) => id))

const proCardsBoardItems = [
  ['WP.holo-card', '互动卡面', 'SHoloCard'],
  ['WP.hover-card', '悬浮预览卡', 'SHoverCard'],
  ['WP.kanban', '看板', 'SKanban'],
] as const

export const proCardsBoardExamples = new Set<string>(proCardsBoardItems.map(([id]) => id))

const proItemKpiItems = [
  ['WP.item-card', '资源卡片', 'SItemCard'],
  ['WP.item-card-group', '资源卡片组', 'SItemCardGroup'],
  ['WP.kpi', '指标卡', 'SKpi'],
  ['WP.kpi-group', '指标卡组', 'SKpiGroup'],
] as const

export const proItemKpiExamples = new Set<string>(proItemKpiItems.map(([id]) => id))

const proActivityItems = [
  ['WP.list-view', '列表视图', 'SListView'],
  ['WP.map', '地图', 'SMap'],
  ['WP.timeline', '时间线', 'STimeline'],
  ['WP.widget', '仪表组件', 'SWidget'],
] as const

export const proActivityExamples = new Set<string>(proActivityItems.map(([id]) => id))

const proChartItems = [
  ['WP.area-chart', '面积图', 'SAreaChart'],
  ['WP.bar-chart', '柱状图', 'SBarChart'],
  ['WP.chart-tooltip', '图表提示', 'SChartTooltip'],
  ['WP.composed-chart', '组合图', 'SComposedChart'],
  ['WP.line-chart', '折线图', 'SLineChart'],
  ['WP.pie-chart', '饼图', 'SPieChart'],
  ['WP.radar-chart', '雷达图', 'SRadarChart'],
  ['WP.radial-chart', '径向图', 'SRadialChart'],
] as const

export const proChartExamples = new Set<string>(proChartItems.map(([id]) => id))

const proChatItems = [
  ['WP.chain-of-thought', '活动摘要', 'SChainOfThought'],
  ['WP.chat-attachment', '对话附件', 'SChatAttachment'],
  ['WP.chat-conversation', '对话消息流', 'SChatConversation'],
  ['WP.chat-list-view', '会话列表', 'SChatListView'],
  ['WP.chat-loader', '对话加载', 'SChatLoader'],
  ['WP.chat-message', '对话消息', 'SChatMessage'],
] as const

export const proChatExamples = new Set<string>(proChatItems.map(([id]) => id))

const proChatActionItems = [
  ['WP.chat-message-actions', '消息操作', 'SChatMessageActions'],
  ['WP.chat-source', '引用来源', 'SChatSource'],
  ['WP.chat-tool', '工具调用', 'SChatTool'],
] as const

export const proChatActionExamples = new Set<string>(proChatActionItems.map(([id]) => id))

const proPromptItems = [
  ['WP.prompt-input', '提示词输入', 'SPromptInput'],
  ['WP.prompt-suggestion', '提示词建议', 'SPromptSuggestion'],
  ['WP.text-shimmer', '文字流光', 'STextShimmer'],
] as const

export const proPromptExamples = new Set<string>(proPromptItems.map(([id]) => id))

const standardItems = [
  ['W.aspect-ratio', '布局比例', 'SAspectRatio'],
  ['W.stack', '堆叠布局', 'SStack'],
  ['W.grid', '网格布局', 'SGrid'],
  ['W.blockquote', '引用块', 'SBlockquote'],
  ['W.metadata-list', '元数据列表', 'SMetadataList'],
  ['W.status-dot', '状态圆点', 'SStatusDot'],
  ['W.info-tip', '信息提示', 'SInfoTip'],
  ['W.clickable-card', '可点击卡片', 'SClickableCard'],
  ['W.selectable-card', '可选卡片', 'SSelectableCard'],
  ['W.banner', '横幅通知', 'SBanner'],
  ['W.overlay', '内容覆盖层', 'SOverlay'],
  ['W.scrollable-area', '滚动区域', 'SScrollableArea'],
  ['W.timer', '计时器', 'STimer'],
  ['W.timestamp', '时间戳', 'STimestamp'],
  ['W.thumbnail', '缩略图', 'SThumbnail'],
  ['W.lightbox', '媒体查看器', 'SLightbox'],
  ['W.date-time-input', '日期时间输入', 'SDateTimeInput'],
  ['W.file-input', '文件输入', 'SFileInput'],
  ['W.tokenizer', '令牌输入', 'STokenizer'],
  ['W.power-search', '组合筛选搜索', 'SPowerSearch'],
  ['W.overflow-list', '溢出列表', 'SOverflowList'],
  ['W.snap-paging', '吸附分页', 'SSnapPaging'],
  ['W.swipe-actions', '滑动操作', 'SSwipeActions'],
  ['W.transfer-list', '穿梭列表', 'STransferList'],
  ['W.navigation-stack', '导航栈', 'SNavigationStack'],
  ['W.tour', '分步导览', 'STour'],
  ['W.log-stream', '日志流', 'SLogStream'],
  ['W.icon', '图标', 'SIcon'],
  ['W.internationalization-provider', '国际化', 'SInternationalizationProvider'],
  ['W.brand-theme', '局部主题', 'SBrandTheme'],
  ['W.interaction-tools', '交互辅助函数', 'useHotkeys'],
  ['W.nav-icon', '导航图标', 'SNavIcon'],
  ['W.nav-menu', '标题导航菜单', 'SNavMenu'],
  ['W.top-nav-menu', '顶部导航菜单', 'STopNavMenu'],
  ['W.mobile-nav', '移动导航抽屉', 'SMobileNav'],
  ['W.side-nav-heading', '侧栏导航标题', 'SSideNavHeading'],
  ['W.side-nav-item', '侧栏导航项', 'SSideNavItem'],
  ['W.side-nav-section', '侧栏导航分组', 'SSideNavSection'],
  ['W.tab-menu', '选项卡溢出菜单', 'STabMenu'],
  ['W.layout', '五区布局', 'SLayout'],
  ['W.section', '页面分区', 'SSection'],
  ['W.field-status', '字段状态', 'SFieldStatus'],
  ['W.form-layout', '表单布局', 'SFormLayout'],
  ['W.indicator', '选择指示器', 'SIndicator'],
  ['W.visually-hidden', '视觉隐藏', 'SVisuallyHidden'],
  ['W.chat-dictation-button', '对话听写', 'SChatDictationButton'],
  ['W.mega-menu', '导航大菜单', 'SMegaMenu'],
  ['W.top-nav-mega-menu', '顶部全宽导航菜单', 'STopNavMegaMenu'],
  ['W.outline', '文档目录', 'SOutline'],
  ['W.selector-option', '选择器选项', 'SSelectorOption'],
  ['W.typeahead-item', '搜索建议条目', 'STypeaheadItem'],
  ['W.complex-selector', '组合选择器', 'SComplexSelector'],
  ['W.text', '语义文本', 'SText'],
  ['W.command-input', '命令面板输入', 'SCommandInput'],
  ['W.chat-composer-drawer', '对话输入抽屉', 'SChatComposerDrawer'],
  ['W.chat-composer-token', '对话令牌元素', 'SChatComposerTokenElement'],
  ['W.chat-composer-input', '对话富输入', 'SChatComposerInput'],
  ['W.tree-list', '树状列表', 'STreeList'],
  ['W.item', '通用条目', 'SItem'],
  ['W.chat-reaction-bar', '消息回应', 'SChatReactionBar'],
  ['W.comment-composer', '评论编辑器', 'SCommentComposer'],
  ['W.comment-thread', '评论讨论串', 'SCommentThread'],
  ['W.code-editor', '代码输入', 'SCodeEditor'],
  ['W.diff-viewer', '文本差异查看器', 'SDiffViewer'],
  ['W.comments', '评论与回复', 'SComments'],
  ['W.candlestick-chart', '蜡烛图', 'SCandlestickChart'],
  ['W.vega-chart', 'Vega 图表', 'SVegaChart'],
  ['W.sankey-chart', '桑基图', 'SSankeyChart'],
  ['W.spatial-chart', '三维图表', 'SSpatialChart'],
  ['W.comment-pin', '评审批注锚点', 'SCommentPin'],
  ['W.webgl-chart', 'WebGL 图表', 'SWebGLChart'],
  ['W.motion', '通用动效', 'createAnimator'],
] as const

export const standardExamples = new Set<string>(standardItems.map(([id]) => id))

export const reviewItems = [
  ['W.button', '按钮', 'SButton'],
  ['W.button-group', '按钮组', 'SButtonGroup'],
  ['W.close-button', '关闭按钮', 'SCloseButton'],
  ['W.checkbox', '复选框', 'SCheckbox'],
  ['W.checkbox-group', '复选框组', 'SCheckboxGroup'],
  ['W.description', '说明文字', 'SDescription'],
  ['W.error-message', '错误消息', 'SErrorMessage'],
  ['W.field-error', '字段错误', 'SFieldError'],
  ['W.fieldset', '字段分组', 'SFieldset'],
  ['W.form', '表单', 'SForm'],
  ['W.input', '输入框', 'SInput'],
  ['W.input-group', '组合输入', 'SInputGroup'],
  ['W.label', '字段标签', 'SLabel'],
  ['W.radio-group', '单选组', 'SRadioGroup'],
  ['W.text-area', '文本域', 'STextArea'],
  ['W.text-field', '文本字段', 'STextField'],
  ['W.tabs', '选项卡', 'STabs'],
  ['W.modal', '确认弹窗', 'SDialog'],
  ['W.tooltip', '工具提示', 'STooltip'],
  ['W.switch', '开关', 'SSwitch'],
  ['W.alert', '通知', 'SAlert'],
  ['W.skeleton', '骨架屏', 'SSkeleton'],
  ['W.spinner', '进度指示', 'SSpinner'],
  ['W.card', '卡片', 'SCard'],
  ['W.separator', '分隔线', 'SSeparator'],
  ['W.surface', '内容表面', 'SSurface'],
  ['W.avatar', '头像', 'SAvatar'],
  ['W.badge', '徽章', 'SBadge'],
  ['W.chip', '标签', 'SChip'],
  ['W.export.radio', '单选项', 'SRadio'],
  ['W.export.switch-group', '开关组', 'SSwitchGroup'],
  ['W.select', '选择器', 'SSelect'],
  ['W.table', '表格', 'STable'],
  ['W.link', '链接', 'SLink'],
  ['W.breadcrumbs', '面包屑', 'SBreadcrumbs'],
  ['W.pagination', '分页', 'SPagination'],
  ['W.toggle-button', '切换按钮', 'SToggleButton'],
  ['W.toggle-button-group', '切换按钮组', 'SToggleButtonGroup'],
  ['W.toolbar', '工具栏', 'SToolbar'],
  ['W.accordion', '手风琴', 'SAccordion'],
  ['W.disclosure', '展开区', 'SDisclosure'],
  ['W.disclosure-group', '展开区组', 'SDisclosureGroup'],
  ['W.alert-dialog', '警示弹窗', 'SAlertDialog'],
  ['W.popover', '锚定浮层', 'SPopover'],
  ['W.dropdown', '下拉菜单', 'SDropdown'],
  ['W.export.menu', '菜单容器', 'SMenu'],
  ['W.export.menu-item', '菜单选项', 'SMenuItem'],
  ['W.export.menu-section', '菜单分组', 'SMenuSection'],
  ['W.export.header', '集合标题', 'SHeader'],
  ['W.export.empty-state', '空状态', 'SEmptyState'],
  ['W.list-box', '列表框', 'SListBox'],
  ['W.export.list-box-item', '列表选项', 'SListBoxItem'],
  ['W.export.list-box-section', '列表分组', 'SListBoxSection'],
  ['W.combo-box', '组合选择框', 'SComboBox'],
  ['W.autocomplete', '自动补全', 'SAutocomplete'],
  ['W.export.tag', '可交互标签', 'STag'],
  ['W.tag-group', '标签组', 'STagGroup'],
  ...standardItems,
  ...dateInputItems,
  ...overlayFeedbackItems,
  ...colorItems,
  ...proFeedbackItems,
  ...proSettingsItems,
  ...proFormControlsItems,
  ...proContentItems,
  ...proNavigationItems,
  ...proAppShellItems,
  ...proComposedItems,
  ...proDataDisplayItems,
  ...proCollectionsItems,
  ...proCardsBoardItems,
  ...proItemKpiItems,
  ...proActivityItems,
  ...proChartItems,
  ...proChatItems,
  ...proChatActionItems,
  ...proPromptItems,
] as const

export type ReviewItem = typeof reviewItems[number]
export const reviewHref = (id: string) => `?component=${encodeURIComponent(id)}`
