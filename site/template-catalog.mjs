const core = [
  ['form-wizard', '交付向导', 'SFormWizard', 'sage', '分步填写资料、验证联系信息并确认发布范围。'],
  ['form-wizard-inline', '行内交付向导', 'SFormWizard', 'sage', '保存并折叠已填写的步骤，依次检查交付信息。'],
  ['form-wizard-vertical', '纵向步骤向导', 'SFormWizard', 'blue', '在左侧显示步骤，右侧填写当前字段。'],
  ['form-wizard-dialog', '弹窗交付向导', 'SFormWizard', 'lilac', '在模态浮层里完成分步设置。'],
  ['classic-gallery', '网格图集', 'SAssetGallery', 'blue', '筛选媒体并在查看器里逐张浏览。'],
  ['mixed-gallery', '混排图集', 'SAssetGallery', 'stone', '将不同宽高比的图片编排在同一组瀑布流中。'],
  ['side-gallery', '边栏图集', 'SAssetGallery', 'blue', '并排展示媒体与资料信息。'],
  ['gallery-hero', '图集首屏', 'SAssetGallery', 'lilac', '居中展示标题和操作入口，下方是一组图片。'],
  ['table-filter', '筛选表格', 'SFilteredTable', 'sage', '组合查询条件、排序、批量选择并保存筛选视图。'],
]
const identity = [
  ['blank', '空白页面', 'SPageScaffold', 'stone', '从标题和可自由编排的正文开始。'],
  ['centered-hero', '居中首屏', 'SPageScaffold', 'sage', '将简短说明、两个入口和主图排在页面中轴。'],
  ['login', '简洁登录', 'SSignIn', 'stone', '用邮箱与密码登录并查看表单反馈。'],
  ['login-card', '卡片登录', 'SSignIn', 'sage', '提供密码表单、团队账号入口和开通说明。'],
  ['login-split', '双栏登录', 'SSignIn', 'blue', '在独立登录区与品牌图片区之间平衡空间。'],
  ['login-sso', '单点登录', 'SSignIn', 'lilac', '按邮箱域名进入身份提供方，或继续使用密码。'],
  ['settings', '连续设置', 'SSettingsWorkspace', 'stone', '在一页内查找并编辑多组设置。'],
  ['settings-dialog', '弹窗设置', 'SSettingsWorkspace', 'lilac', '在弹窗内搜索设置、预览配色和录制快捷键。'],
  ['settings-sidebar', '边栏设置', 'SSettingsWorkspace', 'blue', '通过固定分类切换设置面板并原位编辑。'],
  ['table-comparison', '方案对照表', 'SComparisonMatrix', 'sage', '增减或更换对照列，可切换最优值高亮并保留首列。'],
  ['theme-showcase', '主题样本页', 'SThemePreview', 'sage', '在浅色、深色和系统模式中切换，检查组件状态与语义色。'],
]
const operations = [
  ['dashboard-alert-rail', '服务健康仪表盘', 'SDashboard', 'sage', '切换观察范围，查看指标走势与独立滚动的事件栏。'],
  ['dashboard-cohort-funnel', '漏斗与留存', 'SDashboard', 'blue', '查看阶段转化、流失比例和分组留存热图。'],
  ['dashboard-comparison', '周期对比仪表盘', 'SDashboard', 'stone', '在当前与上一周期之间比较数据，按时间与团队筛选。'],
  ['dashboard-composition', '资产构成仪表盘', 'SDashboard', 'sage', '用堆叠趋势和贡献排序查看资料来源。'],
  ['dashboard-progress', '排期与进度', 'SDashboard', 'lilac', '查看任务完成环、阶段排期、燃尽趋势和风险。'],
  ['dashboard-scorecard', '团队评分卡', 'SDashboard', 'blue', '读取关键指标、目标达成率和周期说明。'],
  ['incident-console', '事件处理控制台', 'SIncidentConsole', 'stone', '按状态和严重程度筛选事件，在详情栏或移动抽屉查看。'],
]
const offering = [
  ['product-detail', '产品详情', 'SProductDetail', 'sage', '浏览主图、选择版本和数量、收藏或加入演示订单。'],
  ['course-detail', '课程详情', 'SCourseDetail', 'blue', '查看课程大纲与评价，按班期和学习时长估算完成日期。'],
  ['payment-form', '订单结账', 'SCheckout', 'stone', '填写配送与账单信息，调整配送方式并核对订单金额。'],
  ['work-item-detail', '事项详情', 'SWorkItemDetail', 'lilac', '更新状态、子任务和附件，在同一页讨论交付。'],
]
const tables = [
  ['table', '资料记录表', 'STable', 'stone', '排序、显示或隐藏列，执行单行和批量归档。'],
  ['table-page', '可搜索资料目录', 'SFilteredTable', 'sage', '组合关键词、团队范围和字段条件，查看随筛选变化的总数。'],
  ['table-grouped', '分组交付表', 'STable', 'blue', '折叠资料分组，通过可调宽度的详情栏查看所选记录。'],
  ['table-collapsible', '可折叠资料概况', 'STable', 'lilac', '按团队显示不同字段，展开记录趋势并切换时间范围。'],
  ['table-tree', '资料树表', 'SDataGrid', 'sage', '搜索匹配分支，展开层级，调整列宽并查看记录。'],
  ['table-inbox', '交付收件箱', 'SResizable', 'blue', '选择、阅读和回复交付消息，并调整阅读栏宽度。'],
]
const reference = [
  ['documentation', '文档导航', 'SClickableCard', 'stone', '从导航卡片进入设计、接入和主题文档。'],
  ['documentation-design', '组件设计文档', 'SFloatingToc', 'sage', '在同一页阅读准则、体验控件和查看参数。'],
  ['documentation-technical', '组件接入教程', 'SFloatingToc', 'blue', '按步骤安装、导入样式并完成首次渲染。'],
]
const workspace = [
  ['editor', '页面编辑器', 'SRichTextEditor', 'lilac', '添加内容块、编辑属性、排序和预览。'],
  ['file-explorer', '资料浏览器', 'SMetadataList', 'sage', '逐级浏览目录，在分栏和网格中查看文件与属性。'],
  ['ide', '开发工作台', 'SCodeEditor', 'stone', '在可折叠、可调大小的区域中查看源文件、输出与属性。'],
]
const collections = [
  ['checkout-wizard', '分步结账', 'SFormWizard', 'sage', '确认购物车、配送和演示付款，随选择核对订单摘要。'],
  ['contact-form', '联系表单', 'SForm', 'stone', '填写联系信息、选择咨询主题并提交演示记录。'],
  ['form-two-column', '双栏需求表单', 'SForm', 'blue', '填写接入需求并同时查看准备资料和指引。'],
  ['library', '资料库', 'SGrid', 'sage', '用关键词和分类查找设计资料与可运行示例。'],
  ['product-gallery', '产品陈列', 'SClickableCard', 'lilac', '从带主图、介绍和价格的卡片中选择产品。'],
]
const communication = [
  ['ai-chat', '助手对话', 'SChatConversation', 'sage', '查看流式回复、工具结果与生成的验收资料。'],
  ['ai-chat-landing', '助手起始页', 'SChatConversation', 'lilac', '选择示例提问或输入消息，开始一段演示对话。'],
  ['messaging-shell', '团队消息', 'SChatConversation', 'blue', '在频道与直接消息之间切换，并在讨论串回复。'],
  ['shell-nav', '双向工作区导航', 'SAppLayout', 'stone', '顶部菜单、命令搜索与可调宽度的导航栏。'],
  ['shell-side-nav', '侧栏工作区导航', 'SSidebar', 'sage', '搜索、折叠和调整分组导航栏。'],
  ['shell-top-nav', '顶部工作区导航', 'SNavbar', 'blue', '通过顶部导航的展开菜单浏览工作台和文档。'],
]
const records = [
  ['canvas-editor', '画板编辑器', 'SCanvasEditor', 'lilac', '切换画板、拖动图层，调整坐标、尺寸和透明度。'],
  ['detail-page', '订单详情', 'STimeline', 'sage', '查看订单商品、费用与交付时间线，更新收货状态。'],
  ['kanban-board', '交付看板', 'SKanban', 'stone', '添加事项，使用拖拽或键盘移动处理状态。'],
]

export const standardTemplates = [
  ['standard-template', core], ['identity-template', identity], ['operations-template', operations], ['offering-template', offering], ['table-template', tables],
  ['reference-template', reference], ['workspace-template', workspace], ['collection-template', collections], ['communication-template', communication],
  ['records-template', records],
].flatMap(([island, entries]) => entries.map(([id, name, component, tone, description]) => ({
  id, name, component, tone, description, kind: '标准设计', standard: true, island,
})))

export const checkoutBlocks = [
  ['checkout-address', '配送地址', 'DemoOrderAddress.vue', 'SInput', '选择国家或地区，填写并校验配送地址。', ', { emptyDemoAddress }', 'emptyDemoAddress()', ' kind="shipping"'],
  ['checkout-discount', '订单优惠码', 'DemoOrderDiscount.vue', 'SInput', '输入、验证和移除演示优惠码。', '', '0', ''],
  ['checkout-payment', '演示付款方式', 'DemoPaymentFields.vue', 'SRadioGroup', '切换测试银行卡和演示钱包。', ', { emptyDemoPayment }', 'emptyDemoPayment()', ''],
].map(([id, name, file, component, description, imports, initial, attributes]) => ({
  id, name, file, component, description, imports, initial, attributes, type: 'block', package: '@syntrofic/ui',
  keywords: ['checkout', 'payment', 'order', 'form', '结账'],
}))
