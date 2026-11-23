# 标准设计组件

标准浅色主题使用纯白页面底色，通过 `--sy-surface-subtle` 的微灰底和间距区分卡片与内容分组。卡片、分区、布局和浮层默认使用 `--sy-inset` 的 8 px 内边距。卡片内容区之间留 4 px，分区内容之间留 8 px，表单字段之间留 12 px。示例直接呈现内容和操作，省略重复说明。表单错误与必要提示使用接近正文的字号，状态和焦点有独立的视觉反馈。组件可通过 `@syntrofic/ui` 导入，并使用 `@syntrofic/ui/style.css` 加载样式。

成功、警告、错误和信息用文字或不同图标配合语义色。单独使用状态点时，提供可见标签。用 `syntrofic theme editor how "检查红绿色觉差异下的状态色" --theme studio` 检查自定义主题中的状态色对。

独立按钮默认全圆角。文本、数字、日期和选择输入默认使用 9 px 圆角。代码块使用 14 px 圆角，代码栏复制按钮使用 12 px 圆角。[基础组件的圆角设置](web-foundation.md)

## 布局与内容

| 组件 | 用法 |
| --- | --- |
| SAspectRatio | 通过 `ratio`、`fit` 和 `shape` 控制媒体的比例、裁切或留白。 |
| SGrid、SStack | 使用固定列数、CSS 列轨或 `minColumnWidth`。堆叠支持方向、对齐和换行。 |
| SBlockquote、SMetadataList | 分别呈现带出处的引文和字段值对。元数据条目支持字段、值和标题插槽。 |
| SScrollableArea、SOverflowList | 前者按逻辑轴滚动，溢出时可用键盘进入。后者在容器变窄时将多余项移入浮层，使用 `item` 和 `overflow` 插槽渲染条目。 |

`SCenter` 支持单轴与双轴居中。`SGrid` 可设置自动适配的最小列宽、独立行列间距和隐式行高。`SGridSpan` 可让项目跨越指定行列或占据整行。`SStack` 支持横向、纵向和逻辑对齐。`SStackItem` 的 `size="fill"` 吸收可用空间，默认尺寸保留内容的固有大小。

`SLayout` 使用 `header`、`start`、`content`、`end` 和 `footer` 插槽编排可独立滚动的区域。切换区域时使用非线性过渡，正文节点保留滚动位置。可将 `useResizable` 返回的控制对象传给 `SLayoutPanel`，并用 `SResizeHandle` 的 `controls` 指向面板 ID。面板折叠时，面板内的焦点会回到手柄。拖动过程中可以用 `:animate="false"` 让布局直接跟随指针。

`SSection` 提供标题、动作区和页脚，可设置柔和或透明表面与逻辑边框。`SScrollableArea` 的 `overscroll` 控制滚动是否传给外层，`sticky-containment="always"` 可让内容未溢出的区域继续约束粘性标题。通过 `full-bleed` 扩展到父容器边缘时，视口内的内容间距仍可独立设置。

`SText` 和 `SLineClamp` 分别支持截断单一文本节点与包含多种子元素的内容。

窄控件中的纯阿拉伯文和希伯来文从左侧截断，纯拉丁文从右侧截断。混合文字跟随外层方向，图标、按钮和表格仍沿原布局排列。给 `SMotionText` 设置 `truncate` 可在固定宽度内保留完整读屏文本，用淡入淡出替换显示文字。

SLayout 的 `contentWidth` 对齐各区域的内容。侧栏使用微灰底，页头和页脚可以通过 `defaultHasDividers` 开启分隔线。SSection 和 SScrollableArea 支持逻辑边尺寸与内边距。滚动容器的 `fullBleed` 使用上层分区的内边距对齐外边缘，并可另设自己的内容间距。

## 反馈与导航

SClickableCard 的 `label` 命名主体操作。传入 `href` 使用链接语义，或监听 `activate` 执行动作。卡片内独立按钮保留自己的操作。SSelectableCard 使用布尔 `v-model`，设置 `name` 后可参与表单提交。SBanner 通过 `v-model:open` 和 `v-model:expanded` 管理显示和详情，可用 `actions` 插槽提供操作。

通过 `provideIcons` 可为当前 Vue 子树设置语义或命名空间图标。SIcon 和 `useIcon` 从最近的图标配置中查找名称，再回退到内置图标。

Syntrofic 图标采用 24 × 24 网格、单色平面轮廓、圆角与一致的笔画宽度。使用同级短横线名称，例如 `<SIcon name="arrow-right" />`。官网和 Native 从同一份矢量稿派生展示资源。图标若单独承载含义，设置 `label`。放在已有标签的按钮旁时，沿用按钮标签。[图标目录](https://ui.syntrofic.com/icons/)

修改 `src/icons/artwork.ts` 后，用 Node 22.18 及以上与 FontTools 4.60.2 运行 `python scripts/build-icon-font.py`。把生成的 Native 字体与字形映射随原稿一起提交。`--check` 校验生成物，官网构建直接从原稿生成 SVG 下载文件。

SAvatar 的 `status` 与 `statusLabel` 提供视觉状态和读屏名称。SAvatarGroupOverflow 可显示头像组的剩余人数，开启 `interactive` 后可接收键盘和指针操作。SListItem 可渲染链接或操作，保留独立的前置内容与末尾动作。

SInfoTip 在悬停或聚焦时预览指标与权限说明。点击、触按或按 Enter 和空格可固定提示，Esc、再次按下或移开焦点可关闭。用 `v-model:open` 控制固定状态。SHoverCard 可在段落中解释术语，也可承载可操作的链接和成员预览。可通过 `defaultOpen` 初始化可见状态，或用 `useHoverCard` 自行绑定触发和渲染。

SSeparator 支持横向、纵向、带标签和强调线条。开启 `fullBleed` 时，横线延伸到卡片内容区边缘。自定义容器可用 `--sy-separator-inset` 指定需要抵消的内边距。

SEmptyState 的媒体和操作插槽可用于无搜索结果、紧凑通知以及新建项目。SAlertDialog 可用 `pending` 显示确认中的加载状态，并用 `closeOnConfirm` 控制完成时机。SVisuallyHidden 可以补充结构化标题、趋势说明与读屏播报。

SItem 支持堆叠与行内布局、链接、选中状态，以及将行点击委托给内部控件。通过 `createSwipe` 为 SItem 或 SListItem 配置逻辑起始侧和结束侧的操作。轻扫可显示可聚焦的按钮，完整滑动可提交操作。把同一操作同时放在尾部动作或菜单，键盘与鼠标即可直接使用。

SList 根据标记生成 `ul` 或 `ol`，并为内部 SListItem 提供密度。通过 `start` 接续编号，通过 `dividers` 添加行分隔线。排序时为条目提供稳定的 `item-key`，为拖动柄加上 `data-reorder-handle`，再在 `reorder` 事件中更新数据。键盘可用 Alt 加上下方向键移动当前条目。

SMetadataList 支持横向排列、自适应多列和固定列数。值可包含链接、徽章和时间。使用 `v-model:expanded` 控制可展开字段。收起时，如果焦点在即将移除的字段中，组件会把焦点送回展开按钮。

SStepper 可以把指示器放在连线上，支持每一步的状态颜色、可选说明以及当前步骤的内容区域。横向步骤通过 `horizontal-options` 按自身宽度收起。摘要可附带前进和返回按钮，按钮会跳过禁用步骤。

SBrandTheme 可在局部应用或嵌套主题。嵌套区域中的 `useThemeName()` 读取最近的主题标识，`useTheme().token()` 返回解析后的值，适合传给画布或图表。通过更新 `theme` 切换外层主题时，局部覆盖和已操作的控件状态会保留。

## 交互辅助函数

`useHotkeys` 默认忽略可编辑控件内的按键。给全局单键快捷键提供开关，并保留可以用 Tab 访问的入口。`useAnnounce` 可为停止输入后的筛选结果和复制反馈分别创建播报。`useClipboard` 返回复制状态，应用可在反馈结束后调用 `reset`。

自定义浮层可组合 `useFocusTrap` 和 `useScrollLock`，以控制 Tab 顺序、Escape 关闭、焦点恢复和背景滚动。在组件之外装配控件时，`useInputContainer` 会把图标和容器留白的点击交给输入框，`useMergedRefs` 可以让内部测量和父组件的聚焦方法引用同一个元素。

`useScrollOverflow` 以逻辑起始边和结束边报告横向内容；`useScrollableArea` 可以根据实际内容设置键盘入口和纵向边缘提示。配合背景渐变的透明度过渡，滚动范围改变时边缘提示会平滑出现或消失。

SMegaMenu 用 `groups` 组织导航链接，用 `feature` 显示推荐卡片。SSnapPaging 的当前索引从 0 开始。SSwipeActions 提供 `actions` 插槽和关闭操作。

SNavIcon 可传入内置图标名称或提供默认插槽。SNavMenu 和 SNavMenuItem 组成支持方向键及按名称定位的菜单，禁用项仍可获得焦点。STopNavMenu 支持鼠标悬停延迟和键盘打开，可用每项的 `closeOnSelect` 控制选择后是否关闭。

SDropdown 和 SContextMenu 的 `presentation` 可设置为 `popover`、`bottom-sheet` 或 `adaptive`。默认使用锚定浮层。自适应模式在宽度小于 640 像素、主指针为粗略指针且不能悬停时使用底部面板。两种展示共享 `items` 和选中状态，菜单保持打开时沿用当前展示。底部面板的关闭按钮可用 `dismissLabel` 本地化，也可通过 `sheet` 插槽提供自定义内容。SDropdown 支持 `defaultOpen` 和 `v-model:open`，SContextMenu 保留 `v-model:selected`。

手指或触控笔打开默认下拉菜单、更多操作菜单或带触发按钮的 SPopover 时，浮层从按钮所在位置展开并向原处收回。触屏的减少动态效果设置会改用原位淡入淡出。SDropdown 显式指定 `presentation="popover"` 时使用标准浮层动效。触屏菜单支持按住拖选，也能在菜单外开始滑动时关闭。

组合菜单可用 SMenuSection 为查看、导出或选项分组。SMenuItem 和 SContextMenuItem 可接收 `label`、`description` 和 `icon`，并用 `end` 插槽显示徽标或快捷键。`description` 同时作为菜单项的无障碍描述。

SMobileNav 使用 `v-model:open`、`side` 和 `width` 控制抽屉，支持自定义 `header` 以及默认插槽。独立使用时，SMobileNavToggle 可共享 `v-model:open` 与 `controlsId`。放入 SAppLayout 后也可通过布局上下文操作移动侧栏。

SBreadcrumbs 支持 `items` 和组合式 SBreadcrumbItem，分隔符可用 `separator` 或插槽设置。可给祖先项添加图标、自定义链接，或通过 `menu` 切换同级页面。用 `variant="supporting"` 显示辅助路径。

SAppLayout 的 `banner` 插槽位于顶部导航和正文之间，`contentPadding` 采用布局间距刻度。SSidebar 的 `item-end` 适合数量与状态，`item-actions` 可放独立菜单。将 SSideNavCollapseButton 放在侧栏底部即可折叠导航。SMoreMenu 提供三点触发器，复用 SDropdown 的分组、分隔线和底部面板。

同一组导航链接在路由切换时共用侧栏和滚动容器，选中态通过颜色变化显示，保留链接的尺寸和位置。SAppLayout 为传统滚动条预留侧栏空间。吸顶目录的最大高度按视口扣除顶栏、页脚和上下间距后的空间计算，短视口优先收紧间距。空间不足以显示完整链接时，使用可展开目录。跨文档导航应在首次绘制前恢复侧栏位置，前进、后退和刷新使用各自历史条目的记录。已有记录优先于自动露出选中项，即使该项已被用户滚出视野。

`useAppShellMobile()` 提供移动断点、抽屉 ID 和打开、关闭、切换方法。SNavbar 在没有自定义起始或末尾插槽时可自动显示触发器。可传入 `mobileNav="{ hasToggle: false }"` 使用自定义触发器，或通过 `:mobile-nav="false"` 关闭托管抽屉。需要自行管理移动导航时，可使用 SAppLayout 的 `mobileNav` 插槽。

`useResizable` 提供独立区域或具名区域的像素尺寸和折叠状态。用 `containerRef` 指定百分比的参考容器。初始百分比在首次测量后转换成像素，本身保持固定，最小和最大尺寸会随容器更新。使用 `percent(40, { min: pixel(200) })` 可为百分比设置像素下限。将返回的 `props` 绑定到 SResizeHandle，可启用拖动吸附、键盘操作和折叠。设置 `autoSaveId` 可保存区域宽度和折叠状态。

SSideNavHeading 支持产品标题、辅助链接、菜单和尾部操作。SSideNavSection 使用 `title`、`subtitle` 和 `end` 组织分组。SSideNavItem 用 `children` 插槽提供子项，用 `v-model:expanded` 控制折叠。`end` 插槽用于数量或状态，`actions` 插槽用于独立按钮。

STabs 的 `overflow` 接收菜单名称和额外的面板选项。选中额外面板时，STabMenu 的按钮显示该面板名称。也可独立使用 STabMenu，通过 `v-model` 接收选中的键值。

STabs 可用 `layout="fill"` 均分标签栏宽度，用 `divider` 和 `size` 将标签栏与页头操作对齐。选项的 `icon` 与 `selectedIcon` 随选中状态过渡，`tab-end` 插槽可放计数或状态点。

STabs 默认用浅色底纹标记选中项。设置 `indicator="line"` 可显示横向底线或纵向侧线。主题可通过 `tab-indicator` 单独调整指示的底色、厚度和圆角。选中项切换时，指示会平滑移动。选中折叠菜单中的标签时，指示渐隐，菜单按钮显示当前标签。

SPagination 可显示页码、点、条目范围、简洁页数或可编辑的章节号。用 `totalItems` 与 `v-model:page-size` 计算范围，选更大的每页条数后回到第一页。总数未知时用 `hasMore` 控制能否继续。用 `getPageHref` 为分页按钮提供真实链接，或用 `changeAction` 提供可取消的异步加载。

SNavbar 的 `centered` 将主导航居中，`brandHref` 让品牌标题可点击，`brandIcon` 和 `brand-icon` 插槽可设置图标或标志。导航项的 `icon` 和 `selectedIcon` 随当前项切换。通过 `menus` 插槽复用桌面和紧凑布局，同一导航栏内的菜单会在切换时收起前一个。STopNavMegaMenu 在桌面按导航栏宽度展开，在紧凑布局中将推荐内容放在条目下方。可将带有 `title`、`description`、`actionLabel` 和 `href` 的 STopNavMegaMenuFeaturedCard 放入 `featured` 插槽。菜单项和推荐操作支持 `closeOnSelect`。

SOutline 使用标题 ID 生成内页目录，可指定 `scrollRoot` 与固定页头偏移 `offset`。`v-model:active` 可接管当前项，关闭 `scrollOnClick` 可接管滚动。`navigateStart` 与 `navigateEnd` 在正常落点、减少动态效果和滚动中断时成对发送。

用 `density="compact"` 减少大纲行距。目录链接跳到可见标题后，滚动标记会保留该标题，直到阅读位置发生变化。

SOverflowList 支持从两端折叠、限制可见项数和允许多行。用 `presentation="menu"` 将多余操作交给键盘菜单，通过 `select` 取得选中项。用 `presentation="count"` 显示折叠数量。

STreeList 支持键盘打开分组、选择条目和激活链接。可通过 `v-model:expanded` 和 `v-model:selected` 接管树状态。使用 `header`、`start` 和 `end` 插槽可补充标题、图标及操作。`animatedLayout` 可为树外随展开状态移动的元素连接布局动效。

STour 用 `v-model:open` 和 `v-model:step` 控制导览。可传入步骤数组，也可在 `steps` 插槽中声明 STourStep。提示随目标定位，支持高亮和可选遮罩。完成、跳过、按 Escape 和点击遮罩会返回各自的状态。

SNavigationStack 用 `v-model` 管理页面栈，给每页提供稳定的 `id` 和 `title`。页面独立滚动并保留表单状态，`height` 可固定内容区高度。`titleDisplayMode: 'large'` 将标题放在正文开头，滚出视口后在顶栏显示。`backTitle` 可定制下一页的返回名称，`end` 插槽用于顶栏末尾操作。

默认插槽和 `useNavigationStack()` 提供 `push`、`back` 和 `popToRoot`。返回时恢复原触发控件的焦点。调用 `push(screen, opener)` 可显式传入触发控件。向返回方向拖动内容后，返回和取消均从放手时的位置接续。`swipe-back="edge"` 将手势限制在组件起始边缘，`false` 关闭手势。

SPopover 可锚定到触发按钮或独立元素。通过 `usePopover` 命令式打开时，可以等待锚点渲染，也可在打开状态下切换位置。使用 `tabBehavior="contain"` 可在浮层内循环访问控件。`useFocusTrap` 还可用于自定义对话表面。

用 Escape 关闭时，仍在浮层中的焦点会回到打开它的控件。关闭时如果焦点正移向另一处，它会留在新的控件上。菜单打开对话框后，关闭对话框会沿原来的打开路径恢复焦点。原控件移除时，优先寻找它原位置附近的可用控件。

允许点击遮罩关闭的对话框、抽屉、底部面板和多步骤面板共用按压判定。按下和抬起都在同一遮罩上才会关闭。跨边缘拖动或取消触摸时，面板保持打开。一次遮罩按压先关闭内层菜单或弹层，并将焦点保留在外层。再次点击才关闭外层。

SDialog 使用触发控件所在方向播放普通对话框的进场动效。设置 `variant="fullscreen"` 后在原位淡入淡出，并为四边预留设备安全区。主题或系统启用减少动效后，桌面直接显示，触屏使用短淡入淡出。由服务端预先打开的对话框在水合后直接到达最终状态。

以触屏为主输入时，对话框、抽屉、底部面板和移动导航会拦截在进场动效中开始的触按。模态浮层的遮罩也受保护。键盘与鼠标可继续操作，非模态面板旁的页面控件也可继续触按。

`position` 接受 `top`、`bottom`、`start`、`end`，支持像素数字和 CSS 长度。未指定的轴保持居中，`start` 和 `end` 按阅读方向映射。更新位置时对话框沿当前画面位置继续移动。`inline` 在页面中展开内容，页面其余控件可继续操作。两种展示共用插槽和 `padding` 间距设置。

`useLayer().render(content, props)` 可用于自定义顶层浮层。将 `ref` 绑定到锚点后，可以按逻辑方向设置 `placement`、`align` 和 `offset`。浮层会读取阅读方向和书写模式，在视口边缘翻转或滑入可见范围。使用 `mode: 'fixed'` 可传入坐标，使用 `positioning: 'custom'` 可自行设置 CSS 锚点定位。上下文模式保留服务端输出的占位，打开时会将内容放到最近可安全渲染的位置，继承该位置的主题样式。`lazyMount: true` 在关闭时卸载浮层内容。

在应用根部使用 SLayerProvider 配置固定栏占用的视口边距和通知位置。边距支持像素数字与 CSS 长度。子层可局部覆盖浮层避让边距，通知继续使用外层队列和设置。通知可另设边距来覆盖应用配置。

`useToast()` 返回发送通知的方法，发送后可调用返回的关闭函数。相同的 `uniqueID` 会就地更新通知，`collisionBehavior: 'ignore'` 会保留原通知直到退出结束。应用的通知会随顶层对话框或模态侧栏移动。按 F6 聚焦通知中的首个控件，关闭后焦点回到之前的控件或另一条通知。

`useTooltip` 可为自定义触发器接入悬停、键盘聚焦和触控提示。用 `ref` 同时绑定位置和交互，或分别使用 `positionRef` 和 `interactionRef`。将 `describedBy` 合并到触发器的 `aria-describedby`，再用 `renderTooltip` 渲染提示。`show()` 和 `hide()` 支持命令式操作，也可用 `isOpen` 配合回调控制。

输入控件的 `status.variant` 可选 `attached`、`detached` 或 `tooltip`。提示模式把消息关联到控件和可聚焦的状态按钮，支持悬停、聚焦、轻点和 Escape。输入组设置自己的状态时，会共享同一条描述和同一个图标。自定义控件可调用 `useInputStatusIcon` 并渲染返回的 `statusIcon`。

## 媒体、时间与讨论

`SLightbox` 支持 `v-model:open` 和从 0 开始的 `v-model:index`。每条媒体包含 `id`、`src`、`alt`，可设置图注、视频封面和字幕。设置 `fullscreen` 让预览覆盖视口。打开后才挂载媒体，加载和重试时保留舞台尺寸。切换照片时，上一张画面保留到新图解码完成。长图注最多显示两行，并可在预览内展开全文。按 Escape 收起图注后，焦点回到展开按钮。用 `useLightbox` 可连接多个媒体入口，关闭时恢复当前入口的焦点。`SThumbnail` 可启用选择或移除操作。

SOverlay 的 `overlay` 插槽承载遮罩内容，可随悬停、焦点或外部状态显示，触屏点击也能展开。已有卡片或媒体容器可通过 `useOverlay` 直接绑定事件和渲染遮罩。

图片支持双指、双击和 Ctrl 加滚轮缩放，放大后可拖动、用触控板或方向键平移。聚焦图片区域后可用 Enter、空格、`+`、`-` 和 `0` 调整视图。原始大小下可以横向拖动翻页，或向下拖动关闭。应用可设置 `maximumZoom`、`zoom` 和 `dragDismiss`。

`SImage` 的 `placeholder` 在首张图片加载时显示骨架。替换已加载的图片时，画面会保留到新图就绪或进入失败状态，两者平滑交接。不同的原始比例带来的高度变化也会缓动。用 `ratio` 或明确的宽高可让图片与失败占位共享同一比例。`SSkeleton` 接受像素或 CSS 尺寸，可用 `index` 让列表与表格的流光错开。通过 `SSpinner` 的 `show-label` 或默认插槽显示加载说明，深色媒体蒙层可用 `shade="on-media"`。

SMediaPlayer 使用原生视频或音频元素，提供章节、时间标记、变速、字幕和键盘控制。音频可设置标题、封面及切换音轨回调。自定义 `controls` 插槽时，可用 SMediaControl 组合按钮、进度和音量控件，或用 `useMediaPlayer` 与 `useMediaPlaybackTime` 读取当前位置及播放状态。

STimestamp 的数字值使用 Unix 秒，可指定 IANA 时区、时间格式以及可复制的详情行。STimer 的 `startTime` 使用 Unix 毫秒。SDateTimeInput 的值使用 `CalendarDateTime`，可启用秒字段。

SComments 通过 `create`、`reply` 和 `resolve` 事件交给应用保存数据。SCommentPin 使用布尔 `v-model` 标记选中的批注，并显示参与者、讨论数及未读状态。SChatDictationButton 由浏览器处理录音权限，使用 `transcript` 事件交付转写。

SPromptInput 的 `drawer` 插槽可放入 SChatComposerDrawer 来折叠上下文或附件。通过 `input` 插槽可接入 SChatComposerInput。它支持带取消信号的异步建议、历史草稿和长文本令牌，其 `submit` 事件同时提供序列化文本及结构化片段。SChatComposerTokenElement 与编辑器使用同一组令牌属性。

使用 `headerActions` 放置提及和附件操作，`headerContext` 可显示上下文进度，`sendActions` 可在发送按钮旁放置听写。`variant="flat"` 提供白底和输入框边线。通过 `showAttachments` 关闭正文内的附件展示后，`drawer` 插槽可读取附件并调用 `remove(file)`。使用自定义编辑器时，`getInputSegments` 可把结构化片段交给发送与排队流程。

`feedback` 接收 `{ type: 'error' | 'warning', message }`，通过 `feedbackPosition` 放在输入框上方或下方。SChatSendButton 可独立使用，或放进 SPromptInput。它在发送、停止和重试之间复用同一个控件，可通过 `sendIcon` 和 `stopIcon` 插槽自定义图标。

SChatConversation 的 `header` 和 `composer` 插槽位于消息滚动区两端。在 `layout="panel"` 模式下，`height` 约束整个面板。`density` 同时调节消息行距与气泡内边距，`gap` 可单独覆盖行距。开启 `compactJump` 后，`jump` 插槽可用 `hasNewMessages` 显示新消息文案。

SChatMessage 的 `bubbles` 插槽可放置多个 SChatMessageBubble，共用消息作者、头像和对齐方向。每个气泡可选 `filled` 或 `ghost`，通过 `group` 设定组内位置，并用 `metadata` 放置时间、发送回执和操作。SChatSystemMessage 支持分隔线、图标和动态播报。SChatTokenizedText 可给引用指定 `tone`，相同位置优先匹配较长的引用。

SChatToolCalls 用 `calls` 展示工具状态、目标、执行位置、耗时和改动行数。为条目开启 `detail` 后可通过同名插槽显示代码、差异或其他结果。折叠整组时保留已打开的详情，并将组内控件移出焦点顺序。

SCodeBlock 用 `highlightLines` 标出从 1 开始的源码行。多行注释等语法高亮会保留在对应行上，复制会读取完整源码。用 `maxHeight` 限制滚动区高度，通过 `showLanguageLabel` 隐藏命令行语言标签。SSyntaxTheme 可为代码区提供局部配色，其他区域仍读取各自的主题。

SMarkdown 的 `density="compact"` 可压缩正文间距。`headingLevelStart` 将一级标题映射到指定级别，更深的标题最多渲染为六级。向 `sources` 提供引用后，正文中的 `[来源标识]` 会显示为可访问的来源链接。选用 `citationStyle="number"` 时，同一来源重复出现会沿用首次分配的编号。

SChatReactionBar 展示表情回应、计数和当前用户的选中状态。通过 `toggle` 与 `add` 将变更交给应用保存。SChatMessage 可通过 `reactions` 直接渲染回应栏，也可用同名插槽提供自定义内容。

SCommentComposer 支持引用、提及、斜线命令、表情和图片附件。图片上传由接收取消信号的应用回调处理，提交事件保留富文本片段。

## 评论线程

SCommentThread 可独立显示首条评论和一层回复。`v-model:selected` 控制展开状态。选择 `replyBehavior="explicit"` 后，查看回复和写回复可以分别操作。`unread` 由调用方设置，未读会自动露出回复并短暂显示新回复标记，保留当前焦点和编辑状态。宿主标记为已读后，未选中线程恢复普通折叠行为。

`thread.anchor` 可提供引用，原文位置失效时设置 `status: 'orphaned'`。`typingUsers` 由协作层提供，线程展开时会显示其他输入者。`seenBy` 通过 `metadata` 插槽提供给调用方。评论可用 `progress` 提供正在进行的说明和链接，也可通过 `canReply`、`canReact`、`canEdit` 和 `canDelete` 控制可用操作。

历史可以直接读取 `previousVersions`，也可由 `loadVersions(message, signal)` 异步加载。等待时显示骨架，失败后可重试。关闭弹层或更换线程会取消旧请求。回复、编辑和删除可分别接入应用回调，关闭含草稿的线程时会提示并将焦点交回编辑器。

## 表单与绘图

SCommand 接收 `groups` 或按 `group` 自动分组的 `items`。`search(query, signal)` 接入异步数据，条件变化或关闭面板会取消上一请求。使用 `bootstrapText`、`loadingText`、`emptyText` 和 `errorText` 区分状态。开启 `picker` 后，`v-model` 保存已提交的选项，方向键只移动当前高亮。

SAutocomplete 可在聚焦时打开建议，用 `maxResults` 限制结果，并通过 `status` 关联校验信息。SBaseTypeahead 可锚定到自定义输入容器，支持列表前后插槽及 `menuRole="dialog"` 下的自定义编辑区。调用 `open(element)` 可指定关闭后回到的触发控件。

SListInput 用稳定记录键管理增删和排序。可用 `field` 插槽接入自定义输入，由应用提供字段、单条记录和列表的校验状态。添加记录后聚焦首个字段。用指针连续添加时，组件会调整可滚动的容器，尽量保持添加按钮在同一位置。

SSelect、SComboBox 和 SAutocomplete 的 `option` 插槽可重用 SSelectorOption 与 STypeaheadItem，自定义图标、说明、头像和尾部内容。SFieldStatus 支持附着与独立显示，错误用高优先级向读屏播报。SIcon 可通过 `provideIcons` 注册命名图标及其变体，也可直接接收 SVG 组件。

STextField 将标签、说明和 `status` 关联到插槽中的输入控件。设置 `descriptionPlacement="label"` 可将说明放在标签下方。SFieldLabel 可独立标注控件，并显示必填、选填、图标和帮助提示。SFormLayout 支持 `vertical`、`horizontal` 与 `horizontal-labels`，也可嵌套。容器变窄时，字段以单列呈现。

SSelect 的 `presentation` 支持 `popover`、`bottom-sheet` 和 `adaptive`。自适应模式在窄触屏上使用底部面板。开启 `searchable` 可按选项文字、分组和说明过滤，`selectAll` 切换当前结果中的可用选项。多选保留其他分组中的已选值，并可通过原生表单提交和重置。使用 `showSelectedDescription` 时，选中说明在独立控件里显示两行，在 SInputGroup 内收为一行。

SComplexSelector 的默认插槽接收 `value`、`commit`、`close` 和 `busy`。`changeAction` 运行时先显示新值，失败后恢复原值并发送 `changeError`。自定义 `trigger` 插槽时，将提供的 `attrs` 绑定到实际按钮。

将 STreeList 放入目标位置选择器时，可设置 `activateBranches`，让 Enter 提交分支，左右方向键仍用于展开和收起树。

STreeList 可开启 `activateOnClick`，让单击文件与按 Enter 一样触发 `activate`。在单选模式下，打开树中的链接会同步选中对应条目。用 `end` 插槽放置未读计数和独立操作。

SPowerSearch 用 `fields` 声明字段、值类型、候选项与条件。用 `v-model` 接收结构化筛选条件，用 `v-model:query` 接收关键词。STokenizer 支持远程候选、最大选中数量及原生表单值。SFileInput 可以接收 `File[]`，配置文件类型、字节和数量上限，并监听 `accept`、`reject`、`remove`、`retry`。SCodeEditor 提供原生文本输入、语法高亮和缩进。SDiffViewer 比较两份文本并显示增删行与上下文。

STokenizer 可用 `creatable` 新建自由文本选项，或与目录建议共用输入框。达到 `maxEntries` 时隐藏输入并保留移除操作。用 `tokenOverflowBehavior` 选择聚焦时在原位展开，或在浮层显示余下标签。`start` 和 `end` 插槽可加入图标和应用操作。用 `required` 校验是否选中条目，选中的每项按同一个字段名提交。窄触屏上，清空选项前可在底部面板核对已选标签。

SBadge 和 SChip 共用类别配色。SChip 支持首尾内容和独立的移除按钮，开启 `clickable` 后通过原生按钮触发 `activate`。SKbd 接收按键数组或用加号连接的字符串。`mod` 在 Apple 键盘上显示 Command，其余系统显示 Control。

开启 `fieldSuggestions` 后，SPowerSearch 可从搜索框匹配字段别名、枚举值和异步候选。嵌套字段接收子字段，自定义运算符可提供编辑控件、校验、显示和匹配函数。日期编辑遵循本地化提供器的历法，可用 `dateStorage: 'epoch'` 存储指定时区的 Unix 秒，或用 `dateOnly: false` 编辑日期和时间。

SCodeEditor 可开启行号、设置最大高度和只读状态，并通过 `tokenizer` 接入应用的高亮规则。SDiffViewer 可用 `parseUnifiedDiff` 读取多文件补丁，或用 `createDiffFile` 比较两个版本。视图支持统一或并排显示、行号操作与行级批注。并排模式横向滚动时两列代码同步移动，行号保持在各自列内。大型差异可先折叠。

SPowerSearch 在窄屏默认用底部面板编辑条件。面板保存筛选草稿，选择完成后应用，清空和放弃修改时会先确认。范围条件用 `value` 和 `endValue` 表示含边界的区间，多选条件用 `values` 保存选项。字段可提供带取消信号的 `search` 函数来加载候选。清空条件时保留标记为 `readonly` 的条目。

`usePowerSearchConfig` 根据字段类型生成操作列表，`config` 可传给 SPowerSearch，`applyFilters` 使用同一份字段定义筛选本地数据。

指定 `contentSearchFieldKey` 后，搜索框按 Enter 将关键词保存为可编辑的内容条件。可用 `resultCountLabel` 格式化结果数量，变化通过读屏状态播报。

日期字段支持绝对日期、日期区间和相对日期。相对条件用天、周或月表示最近或接下来的范围，两端均计入结果。`usePowerSearchConfig` 的 `timeZone` 决定当地日界，数字日期值使用 Unix 秒。

SCandlestickChart 和 SSankeyChart 提供键盘检查及数据表。SWebGLChart 支持散点、热力图及滚动折线，折线可通过 `push(x, y)` 和 `clear()` 更新。SVegaChart 接收 Vega 或 Vega-Lite 规范对象或 JSON 文本，支持本地语义配色、SVG 与 Canvas，并通过 `ready` 返回 Vega View。

WebGL 热力图的坐标可使用数字或分类名称。流式折线用 `lineWidth` 设置屏幕像素线宽，追加采样时复用绘图缓冲区。

SComposedChart 的散点系列可以设置 `renderer: 'webgl'` 或 `renderer: 'webgl-interactive'`，与其他系列共用坐标轴。交互模式在 GPU 上识别鼠标指向的数据点。无法使用 WebGL 时，组合图恢复 SVG 散点。独立的 SWebGLChart 使用 `mark="dot-interactive"` 启用同一命中机制，可在 `tooltip` 插槽中访问原始样本。

SChartWebGLLayer 可在 `underlay` 插槽加入热力图，或在默认插槽叠加滚动折线。两者接收插槽传入的 `plot`，共用坐标轴范围和响应式布局。热力图支持分类行、色阶及间距。折线通过 `push(x, y)` 和 `clear()` 更新，在 `bufferSize` 范围内保留最新样本。环境无法使用 WebGL 时会改用同一几何数据绘制 SVG。

SComposedChart 支持独立散点、区间带和误差棒。区间带和误差棒使用 `[下界, 上界]`，用 `null` 保留缺失记录。为误差棒设置 `alignToBar` 可将它对齐到分组柱形，使用 `capWidth` 和 `strokeWidth` 控制端帽和线宽。Web 和 Native 使用相同的数据格式。

使用 `references` 可标出类别位置或数值阈值。增加 `endValue` 可将数值参考线扩展为标注区间，两端都会裁剪到图表绘制范围。

笛卡尔图表的 `data[].x` 接收数值、数字字符串或日期。通过 `xScale` 选择类别、数值或时间轴。`xDomain` 控制可见区间，数据为空时仍保留已设定的轴范围。可用 `xFormat` 格式化刻度，用 `yBaseline` 选择自动、零对称或贴近数据的纵轴范围。传入 `references[].x` 和可选的 `endX` 可标记时间点或区间。Web 的 `interactions` 和默认插槽通过 `plot` 获取定位函数及绘图边界。

## 双栏选择

STransferList 使用 `items` 提供成员和分组，用 `v-model` 读写已选 ID。现有勾选加批量按钮的用法保持可用。设置 `selectionMode="direct"` 可逐项加入或移出，`searchMode="shared"` 可搜索两列的名称、说明和分组。`hasSelectAll` 和 `hasClear` 操作完整列表，保留禁用项和未载入的已选 ID。

开启 `reorderable` 后，可拖动已选条目的顺序把手，也可用 Alt 加方向键直接移动。按空格或 Enter 开启排序模式后可用方向键，Esc 退出。设置条目 `reorderable: false` 或通过 `canReorder` 返回 `false`，可固定其位置。筛选期间暂停排序。移动条目时两列保留白色底色，邻近条目沿缓动重新排布。

STransferListSelector 将同一列表放进弹出选择器。默认立即提交，用 `commitBehavior="staged"` 可先编辑草稿，应用后更新绑定值，取消或关闭放弃草稿。异步 `changeAction` 失败时恢复已保存值，弹层仍可重试应用。加载目录时用 `loading` 提供进度，通过 `error` 和 `retry` 接入失败提示与重试。

## 评论列表

`SComments` 的 `variant="timeline"` 将评论线程和 `events` 活动合并为一条时间线。`order="auto"` 按输入的首尾有效日期决定时间方向，也可指定 `oldest`、`newest` 或 `activity`。`activity` 会将新回复或编辑过的线程移到前面。使用 `v-model:selected-thread-id` 与文档标记联动。选中线程会展开正文和回复，点击回复按钮才会打开输入框。切换或收起线程会保留各自的草稿。

`layout="pane"` 在受限高度内单独滚动时间线，主输入框可通过 `composer-position` 放在顶部、底部或隐藏。`loading`、`load-error` 和 `retry-load` 用于读取状态。`has-older-comments` 和 `load-older` 接入分页。回填旧评论后，面板保持正在阅读的行。`submit-comment` 和 `submit-reply` 接受异步提交，失败后保留草稿供重试。`draft-change` 提供草稿所属的线程或引用上下文。默认 `inline` 模式保留简洁的表单和原有事件。

## 日志流

SLogStream 按时间、级别、来源和正文显示日志。已有记录可继续使用 `text`，也可使用 `message`。设置 `hasTimestamps` 隐藏时间列，用 `maxHeight` 限制可滚动区域，用 `maxEntries` 控制保留的尾部条数。`detail` 可用多行文本，或设为 `true` 并通过 `detail` 插槽渲染详情。`entry` 插槽可自定义整行。

`v-model:follow` 控制跟随状态。向上滚动或打开详情会暂停跟随，追加日志时尽量保持当前正在读的行。点击「跳转到最新日志」会平滑回到末尾。读屏只在跟随期间播报新增日志，可用 `announce` 关闭。标准模式使用白色底色，可用 `variant="terminal"` 单独开启深色终端视图。

加载历史记录时传入 `loading`，通过 `error` 和 `retry` 提供失败提示和重试。首次加载显示骨架。已有记录继续可读，失败提示和结果切换使用缓动，并遵循系统的减少动态效果设置。

## 三维视图与数据加载

SSpatialChart 支持 `auto`、`webgl` 和 `svg` 绘制模式。自动模式会在 WebGL 不可用时用 SVG 绘制散点、柱形或曲面。用 `domains` 设置三个轴的数值范围，用 `axisLabels` 设置图中轴名和数据表表头。

可拖动绘图区旋转视图。键盘聚焦后，左右方向键改变方位，上下方向键改变仰角，`+` 和 `-` 调整远近，`Home` 重置视角。`v-model:view` 读写手动设置的方位、仰角和距离，使用弧度表示角度。`autoRotate` 以每秒度数指定自动旋转速度，默认关闭。鼠标悬停、焦点进入、相机拖动或页面隐藏时暂停，减少动态效果时也会停止自动旋转。用 `interactive` 控制手动操作。

请求期间通过 `loading` 和 `loadingText` 显示进度。初次加载时显示骨架，刷新时可保留原有 `data`，请求结束后再提交新数据。用 `error` 和 `retry` 接入失败提示和重试。绘图区保持白色背景和固定高度，标记切换时平滑淡入淡出。

## 组合页面

SFormWizard 接收有序步骤并为当前步骤提供默认插槽。每次提交可使用 `validate` 验证，完成时通过 `finish` 提供按步骤索引的 FormData。可将相同组件嵌入 SDialog。SAssetGallery 提供经典、混排、侧栏和主图布局，包含媒体筛选与查看。SFilteredTable 组合筛选、排序、分页、批量选择和保存视图。通过 `v-model:views` 接收视图列表，存储由应用提供。

SAssetGallery 筛选时保留列宽和卡片比例，保留的卡片缓动至新位置。用 `categories` 在异步加载前提供筛选项。首次加载显示骨架，刷新时保留传入的 `assets`。通过 `error` 和 `retry` 提供失败提示及重试。查看器按媒体 ID 保持当前项目，列表重排时继续显示同一项。可用 `thumbnailFit: 'contain'` 在缩略图中完整保留截图内容。

SSignIn 支持普通、卡片、分栏和单点登录布局，通过 `authenticate` 接入应用认证，通过 `resolveProvider` 按邮箱选择登录入口。SSettingsWorkspace 使用字段配置生成设置页面，可嵌入 SDialog。SComparisonMatrix 支持添加、更换、移除比较列和突出显示最优数据。

SDashboard 接收指标、趋势、分组、漏斗和进度数据。SIncidentConsole 提供结构化搜索、状态筛选及响应式详情。SWorkItemDetail 通过事件交付状态、清单、评论和附件变更。

SProductDetail 和 SCourseDetail 通过选择事件将购买或报名意图交给应用。SCheckout 使用最小货币单位计算账单，通过 `payment` 插槽接入应用支付表单，并通过 `submitOrder` 提交订单。

结账向导将购物车、收货、配送和付款拆成四步。窄容器将金额摘要放在表单前面。`validateForwardNavigation` 会在重新进入下一步前走同一条表单校验流程。付款表单模板查看数量、优惠、配送费用和应付金额，演示付款在本地生成订单确认。SCheckout 的 `quantity`、`discount`、`contact` 与 `extras` 插槽可由应用扩展。

表格模板复用 `useTableFiltering`、`useTableFilterState` 和 `useTableGroupedRows`。用 `useTableColumnSettingsState` 保存列顺序和可见性。SDataGrid 内部使用 `useTableInfiniteScroll` 和 `useTableStickyColumns` 处理加载更多与固定列偏移。

`useTableTreeState` 将树状数据展开成表格的可见行。将 `useTableTreeData` 返回的配置传给 STable 的 `tree` 属性，可显示有层级缩进的展开按钮和全部展开控件。`isItemExpandable` 可在子项加载前标记分支。用 `sortSiblings` 按层级内排序，可保持子项留在原目录。

`useTableRowExpansion` 接收受控的展开键和值变更回调。把配置传给 STable 的 `rowExpansion`，详情由 `expanded` 插槽或 `renderExpanded` 渲染。可用展开按钮、右键或 Shift+F10 调出操作。配合 `useAnimatedLayout().around`，相邻行和表格外的后续内容会接续布局动效。长表的详情行可随列表一起虚拟化。

STable 的 `pagination` 可接收 `useTablePagination`，并由应用传入当前页数据。已知总项数时可按页码或数量显示，游标模式以 `hasMore` 控制能否前进。`position` 支持上方、下方和两处同时显示，`align` 控制对齐。`useTableRowIndex` 接收起始编号或按数据位置编号，分页和详情展开时仍按数据行计数。

将 `useTableGroupedRows` 的 `control` 传给 STable 的 `rowGroups`，可在同一张表内显示全宽分组标题与记录数。折叠状态可由应用控制。本地分页会把边界延伸到当前组末尾，使一组记录留在同一页。可通过 `groupOrder` 固定分组顺序，表格排序在各组内生效。

平铺表格可将 `useTableInfiniteScroll` 接给 `infiniteScroll`，通过 `hasMore`、`isLoading` 和返回 Promise 的 `onLoadMore` 追加记录。滚到末尾可自动加载，也可直接用按钮发起同一请求。失败或空批次会暂停自动加载，手动按钮仍可重试。数据、游标和错误提示由应用管理。

`textOverflow="truncate"` 让表头和默认单元格文字在本列内以省略号收尾。键盘聚焦排序或调整列宽等表头控件时，可查看完整标题。鼠标悬停或触屏轻点截断的单元格可查看全文。纯拉丁表头在从右向左的界面仍保留文字开头，含从右向左文字的表头随表格方向排列。显式使用 `textOverflow="wrap"` 时，窄列文字换行。自定义插槽可自行控制内容布局。

将 `useTableRowsVirtualization` 接给 STable 的 `virtualization`，可按外层容器实际高度挂载可见行。`rowHeight` 包括单元格内边距，`initialViewportHeight` 用于首屏和服务端渲染。固定行高与列虚拟化默认截断文字。开启换行、容器高度无约束、行高不一致或含自定义单元格时，按实际内容完整渲染。需要窗口化可变高度详情时，可使用 `virtual`。

将 `useTableColumnResize` 接给 STable 的 `columnResize` 可拖动或用方向键预览列宽。提交发生在释放指针或按 Enter 时，Escape 取消。组件按左右方向移动手柄，并在有比例列时同步调整相邻列宽，可设置全表及单列的最小和最大值。

STable 和 SFilteredTable 用 `columnLayout="fixed"` 按容器宽度和列定义分配列宽。`width` 支持 `px`、`%` 和 `fr`，`minWidth`、`maxWidth` 为像素。筛选、翻页、加载和空结果共用列轨道。容器变窄时按列的最小宽度横向滚动，状态提示留在可见区域。使用 `columnResize` 时由调整控制器提供轨道。

`useTableColumnSettingsState` 管理当前列键及顺序，支持必显列、全部显示和恢复默认。`useTableColumnSettings` 提供分组选项，可直接交给多选控件。把返回的 `control` 传给 STable 的 `columnSettings` 即可应用列配置。

把 `useTableStickyColumns({ startKeys, endKeys })` 传给 STable 的 `stickyColumns`，可分别固定从表头起始侧或结束侧延伸的一组连续列。表格按实际列宽累加偏移，调整列宽后会重算。阴影提示固定列下方还有内容可滚动。左右布局使用同一组列键。

`useTableColumnsVirtualization({ initialViewportWidth })` 为列数较多的 STable 按横向可见范围渲染列。使用像素列宽、明确的最小列宽或列宽调整控制器提供的轨道宽度，并为行和列指定稳定键。固定列和当前有焦点的列持续保留，挂载的单元格报告其在完整表格中的位置。将行、列能力作为数组传给 `virtualization` 可同时启用。启用换行、自定义单元格、表尾或层级结构时，列会全部渲染。

列的 `filter` 可指定 PowerSearch 字段键，也可用 `{ field, operator }` 指定条件。将 `useTableFiltering` 返回的控件传给 STable 的 `columnFiltering`，支持弹出、行内与紧凑行内三种排布。使用 `useTableFilterState` 管理各列条件，再用 `toSearchFilters` 配合 `applyFilters` 筛选数据。SFilteredTable 内置这套组合，保存视图时也可保存列顺序、行距、固定侧和分组设置。

SFilteredTable 通过 `loading`、`error` 和 `retry` 接入应用的数据请求。首载在表体显示进度，刷新期间可保留传入的记录和筛选条件。刷新失败时，重试操作出现在结果下方。`actions` 插槽可读取 `loading`，用于显示刷新按钮的进度。

SFilteredTable 的视图保存搜索、筛选语法、列条件和 `viewSettings`。`savedViewPresentation="strip"` 使用单行横向视图列表，默认用选择器呈现，两种入口都预留位置。保存和编辑时可核对快照内容。改名保留原快照，删除保留当前表格内容。「全部」清除查询和可编辑的筛选条件，并保留当前列布局。视图列表通过 `v-model:views` 交给应用持久化。

给 SFilteredTable 提供 `details` 插槽可启用记录检查。将 `cell` 插槽的 `inspection` 绑定到行标题按钮，并用 `@click="inspect"` 打开详情。`v-model:inspected` 保存当前记录键，和批量选择分开管理。`details` 提供 `row`、`compact` 和 `close`。达到 `compactWidth` 时使用可调整宽度的侧栏，窄于该值时使用底部抽屉。`detailsHeight` 可调抽屉高度。跨断点时复用表格实例，保留查询草稿、当前页和选择。关闭抽屉时将焦点交回触发控件并保留阅读位置。

SCanvasEditor 接收画板和图层数据。修改坐标、缩放视图、调整文本字号和透明度时，同一画板上的其他图层保留位置。可通过方向键移动焦点所在图层，按住 Shift 移动 10 个单位。

## 动效和交互函数

### 切换稳定性

- **跨页导航**直接显示最终布局，导航指示条可独立过渡。两页共有的背景、顶栏、工具栏与固定侧栏在切换前、切换中和切换后保持同一屏幕位置和可用宽度。同一组侧栏链接在首帧恢复内部滚动位置。侧栏在页面顶部和吸顶状态共用同一顶距，且为页脚预留空间。浏览器前进和后退时恢复该页原有的滚动位置。
- **页内切换**让选项卡、筛选栏、标题和触发控件保持位置。只有实际受内容变化影响的区域参与动效。切换不同高度的面板、结果或加载占位时，用主题的非线性曲线调整容器尺寸，让下方内容随同一段过渡移动。为可能出现的传统滚动条预留空间，保持可用宽度。
- **首次挂载**在首个可见帧应用最终的控件尺寸和主题。骨架为可预知的尺寸占位，页面、模板和大块预览就绪后直接呈现。客户端挂载容器可添加 `data-sy-initializing`，在主题样式和首轮 DOM 就绪后调用 `settleInitialStyles(container)`，恢复后续 CSS 过渡。[设计规范](../site/guides/design-rules.md)
- **浮层开合**共用文档滚动锁。传统滚动条的空间由视口统一保留，锁定期间顶栏、正文和触发控件保持原坐标。嵌套浮层共用同一份滚动锁，最后一个浮层退场结束后恢复滚动。
- **连续操作**从当前可见的位置、高度和透明度接续下一段动效。焦点保留在仍可用的控件上，滚动保留仍可到达的阅读位置。目标消失时，将焦点交给关联的触发控件。启用减少动态效果时直接到达最终布局。
- **验收**逐帧检查切换前、切换中和结束后的共享区域坐标、滚动位置及焦点。覆盖桌面和触屏、短视口滚到页脚时点击侧栏、连续反向切换、长短内容切换、滚动条出现或消失，以及缓慢加载和减少动态效果。

可用 `STabs` 的面板高度过渡核对选项卡栏与下方内容的位置。官网发布须通过 `pnpm check:site-stability`，检查传统滚动条下的浮层开合和目录切换。[仓库开发约定](../CONTRIBUTING.md#web-页面切换约束) · [官网标准设计](https://ui.syntrofic.com/docs/standard-design/#交互与动效)

### 动效设置

`BrandMotion.reducedMotion` 默认跟随系统。向 `SBrandTheme` 传入 `motion: { reducedMotion: 'always' }` 可减少这个主题及其浮层的动效，内部主题继续继承。位移、缩放和加载流光停用，浮层可保留原位短淡入淡出。自定义 Vue 动效可用 `useReducedMotion(element)` 读取当前偏好。只加载 CSS 时，在主题根元素添加 `data-sy-reduced-motion`。

`createAnimator` 为一个元素管理多个动画通道。同一通道上的新动画接替旧动画。`useEntryAnimation` 为出现的元素播放进场效果。`useAnimatedLayout` 连接 Vue 布局更新前后的坐标，连续更新会接续当前位置和速度。可设置范围并使用 `around(element)` 捕获附近的布局，也可用 `createAnimatedLayout` 在 Vue 组件外创建控制器。`createDragToSnapPoints` 提供弹性边界、释放后吸附和 `snapTo` 入口。支持系统减少动态效果设置。

`createReorderable` 为列表中的拖拽手柄提供指针和 Alt 加方向键排序。应用通过 `onMove` 更新数据顺序，可配合 `useAnimatedLayout` 播放移动效果。

`reportLayoutChange(layout, target)` 在更新前记录布局，再由 `animate()` 播放同一轮 DOM 更新中发生的位移。多处内容同时展开时，受影响的元素从当时显示的位置一起移动。`glideOf(element)` 可读取当前动画，`landLayoutGlide(element)` 可直接到达最终位置。

`solveSpring` 与 `solveDecay` 使用秒和单位每秒，可以查询任意时刻的位置和速度。`motionSprings` 包括吸附、按压、强调、导航、面板和菜单的弹簧配置。设定 `--sy-motion-tempo` 可按比例调整 `createAnimator` 的时长，`1` 表示标准节奏。`useKeyboardInset` 从可视视口和可用的虚拟键盘几何信息中读取底部避让距离，`rideKeyboard` 可将固定定位的操作区移到软键盘上方。

`SInput`、`STextArea` 和 `SNumberField` 随键盘报告在最近的滚动容器中露出焦点控件，空间允许时在键盘上方留 10 px。键盘收起后，自动滚动以减速曲线回到原位，用户另行滚动的位置保留。自定义文本控件可将元素引用传给 `useKeyboardReveal`。底部面板也会读取浏览器直接提供的停靠键盘几何位置。

文本控件和 `SChatComposerInput` 位于屏幕底部的固定栏内时，固定栏跟随键盘报告，只补足实际遮挡的距离。应用原有的 `transform` 会保留。键盘收起时，固定栏按缓动曲线落回原位。应用可用自己的 `translate` 接管固定栏位置。

品牌可用 `motion.timings` 指定进场、退出、按压和位移的时长及贝塞尔曲线，用 `motion.springs` 覆盖命名弹簧。把预设名传给 `useAnimator(...).animate(values, { spring })` 或 `useAnimatedLayout({ spring })` 即可应用当前品牌设置。减少动态效果仍按系统偏好生效。

SSnapPaging 的拖动释放每次最多翻一页，取消后吸附回原页。SSegment 的指示块沿拖动方向预览选项，放手时提交，宽度与位置按同一弹簧过渡。单柄 SSlider 可开启 `coast`，按释放速度滑至符合步长的值并发送一次 `commit`。

SSegment 的选项可带 `icon`，紧凑工具栏可用 `iconOnly` 隐藏文字并保留键盘和读屏名称。水平控件开启 `fullWidth` 时，各段随容器宽度均分。

向 SCarousel 的 `hasSnap` 传入 `true` 可开启原生滚动吸附。传入 `useSnapPaging({ pages: 'view' })` 后，触控、触控笔和连续横向手势每次至多翻一屏，使用 `pages: 'item'` 可改为每次一项。滚轮继续使用浏览器原生吸附。按钮、键盘和选中项模型在两种模式下使用同一套入口。

吸附轮播和多卡片轮播默认在还可以滚动的边缘显示渐变提示。到达首尾时提示随位置淡出，焦点进入卡片时让出边缘空间。可用 `fadeEdges` 配置提示。

`useDragToSnapPoints(target, options)` 可为自定义元素设置拖动轴、实时更新的吸附点、边界阻尼和释放速度阈值。用 `settleTo(index)` 调整到排序后的指定位置，动画稳定后触发 `onSettle`。中途改变吸附点时会从画面上的当前位置继续。

`usePanGesture` 在越过拖动阈值后报告从按下位置算起的位移，速度以像素每秒传给回调。结合 `useAnimator` 可以让卡片在慢速松开时弹回，在快速松开时按释放速度滑出。用按钮提供等价操作，并在减少动态效果模式下用淡入淡出替代位移。

SSheet 会按释放速度选择停靠点。慢速释放靠近当前点时回弹，快速滑动时沿滑动方向进入下一点。开启 `sequential` 后一次手势最多移动一个停靠点。手指拖过最低点时，面板保持内容高度并随指针移向屏幕边缘。

底部面板正文支持单指拖动。内层滚动区有空间时先处理滚动，到达边缘后面板只跟随继续拖动的距离。声明 `touch-action: none` 或只允许双指缩放的内容保留自己的手势。加入第二根手指会取消面板拖动。

SSwipeActions 可通过横向拖动、触控板或按钮显示操作。快速释放沿手势方向收放，慢速释放以操作区的一半为界。SItem 的完整滑动要求达到确认距离，释放前滑回即可取消确认。

`useListFocus`、`useGridFocus` 和 `useTreeFocus` 为自定义列表、网格和树提供可组合的键盘导航。把返回的容器引用、`handleKeyDown` 和 `handleFocus` 分别绑定到容器、`keydown` 和 `focusin`。开启 `hasRovingTabIndex` 可以在内容更新时维持一个 Tab 停靠点。`useTypeahead` 支持输入前缀跳转、连续按同一字母循环和带重音字母匹配。

`useCombobox` 可把自定义输入字段和任意位置的建议列表相连。用 `getFieldProps()`、`getListboxProps()` 与 `getOptionProps(index)` 绑定键盘和读屏属性。焦点留在输入框，方向键跳过禁用项并循环。建议列表打开时，Escape 先关闭列表。`useMultiCombobox` 支持连续选择和带操作单元格的网格，方向键按页面阅读方向进入该单元格。

菜单可在按下时打开，拖动时高亮当前可用项，松手时选择该项。在列表边缘停留会滚动，清除高亮时焦点会回到菜单。触摸拖选后，菜单会拦截浏览器为同一触摸补发的点击，避免误触下层控件。下一次真实按压和键盘激活照常响应。`useMenuPress` 将这个行为提供给自定义菜单，也可通过 `isMenuPressActivation(event)` 识别由松手触发的点击。

`useKeyboardHint` 在首次通过键盘进入组合控件时显示方向键提示，按方向键、Escape 或离开控件后收起。STabs、SToolbar 和 SSegment 默认启用提示，可传入 `keyboardHint` 文案或设为 `false`。自定义控件可渲染返回的 `HintElement` 并绑定 `onFocus`、`onBlur`、`onKeyDown`。

SToolbar 可用 `items` 生成操作，也可在 `start`、`center`、`end` 插槽中安排内容。使用 SToolbarButton 将按钮加入方向键导航。工具栏的 `size` 会作为内部 SButton、SInput 和 SSelect 的默认尺寸。STabs 的 `actions` 插槽可将选项卡和操作按钮放在同一工具栏中。SOverflowList 的 `indicator` 插槽提供折叠项数，已显示的项目在折叠时用主题动效重新排布。

SToggleButton 用 `v-model` 管理按下状态。`icon`、`pressedIcon`、`pressedIconVariant`、`pressedTone` 和 `pressedLabel` 可设置选中外观，`size` 和 `elevation` 控制尺寸和阴影。

将保存函数传给 `pressedChangeAction`，参数依次是目标状态、点击事件和 `AbortSignal`。按钮立即预览目标状态并显示加载指示，最新请求成功后才更新 `v-model`。再次操作会取消之前的请求。最新请求失败时恢复已保存的状态并发出 `action-error`。在同步的 `pressed-change` 事件中调用 `preventDefault()` 可以取消本次操作。外部传入的 `loading` 会暂时阻止操作并保留焦点。

`SToggleButtonGroup` 的 `v-model` 管理组内选择。可传 `items`，也可在默认插槽中放带 `value` 的 `SToggleButton`。每项可自定义内容、图标、尺寸和阴影。默认单选，再按当前项即可清空。开启 `multiple` 后绑定数组。方向键按组的方向移动焦点。触屏可沿组滑动，在松手时选中指向的可用项。用 `:drag-selection="false"` 可关闭手势。触屏命中范围最多向外延伸半个间距，视觉尺寸沿用组件大小。

SLink 的 `externalIndicator` 可显示外链图标，带 `target="_blank"` 的链接可用 `externalLabel` 本地化新标签页提示。

`useCollapsible` 提供展开状态与切换入口。使用 `isCollapsible: true` 默认展开，通过 `defaultIsOpen` 修改初始状态，或传入 `isOpen` 和 `onOpenChange` 由外部控制。SDisclosureGroup 内带 `value` 的项目由组协调状态。组支持 `defaultValue`、`v-model`、`multiple`、`dividers` 和三种 `density`。SDisclosure 支持 `headingLevel` 为触发器提供标题结构，`variant="plain"` 可用于无卡片的平铺版式。

SButton 使用共享的 `usePressFeedback`。自定义控件可绑定该方法返回的属性并添加 `sy-press-background`。触摸到滚动区域时，按压反馈会等待手势意图，滑动取消时立即清除，轻点或松手时平滑淡出。主题可通过 `--sy-overlay-pressed` 调整反馈颜色。

`useContainerReveal` 管理缩略图等容器的悬停与聚焦显隐，可反转显示条件，也可选择在隐藏时收起占位。`useIndicatorFocusRing` 把原生输入的键盘焦点反馈画在自定义指示图形上。`useInputContainer` 可将点击输入组的空白区域或装饰图标转交给输入控件，同时保留组内按钮的行为。

`useInteractiveRole().semantic` 为自定义控件解析链接、按钮和静态内容三种语义。将它作为弹出层触发器时，组合式函数读取触发器传入的属性，自定义组件则将这些属性转发到解析出的原生元素。弹出层的 `label` 可以显式指定其可访问名称。

`useHoverCard` 可为自定义触发器渲染内容预览。把 `ref` 绑定到触发元素，或分别用 `positionRef` 与 `interactionRef` 指定定位和交互元素。设置 `label` 可为预览对话框命名。键盘可从触发器进入卡片操作，按 Escape 会关闭预览并还原焦点。

用 SLinkProvider 将 Vue Router 或 Nuxt 链接组件提供给子树，SLink、带链接目标的 SButton 和 Markdown 链接都可接入。自定义控件可以渲染 `useLinkComponent()` 返回的组件。区域内部可再嵌套提供者，单个链接也可用 `as` 指定渲染方式。结构化目标会原样交给路由组件，拒绝的目标会变为不可操作内容。

SInternationalizationProvider 接收按 BCP 47 标签组织的消息目录和覆盖，区域变体缺少的消息会回退到所属语言和英语。语言、阅读方向和日历系统可以独立设置。日历默认使用公历，可通过 `calendar` 指定其他系统。页面可用 `getLocaleDirection(locale)` 给承载内容的容器设置 `dir`。

`useCalendarDays` 可为自定义月历生成日期、周行和本地化星期名称，支持固定六周和按月份实际天数排布。`useCalendarConstraints` 结合起止日期、范围长度和自定义规则判断哪些日期可选。`useCalendarNavigation` 提供单月或双月的翻页状态、标题和跨月键盘焦点目标。使用 `focusDate` 与 `onFocusDateChange` 可由应用控制当前月份。

弹簧可以用物理参数、响应和阻尼比，或周期和弹跳值配置。`settleTime` 返回位置稳定进入容差的时间。`solveSpringTowardRamp` 计算弹簧对匀速移动目标的跟随位置、速度和距离差。

SProgressBar 按进度变化量设置线性过渡时长。过渡中收到新值时，从当前显示的进度接续。启用减少动态效果后，未知进度的指示条原地改变透明度。

SSwitch 的滑块可用指针横向拖动。拖动时预览状态，释放后更新表单值。支持从右向左布局、触屏滚动和键盘切换。

从包主入口可以使用 `useAnnounce`、`useClipboard`、`useHotkeys`、`useMediaQuery`、`useTruncation` 和 `useLongPress`。从 `@syntrofic/ui/rac` 可以使用 `useDirection`、`useCollator` 和 `useTranslator`。

`useSpeechRecognition` 在应用显式调用 `start()` 后请求浏览器语音识别，提供识别状态、最终和临时文本与麦克风音量条。`useChatDictation` 可把临时文本作为预览，并在转写完成后插入当前草稿。`useChatPasteAsToken` 可按长度把粘贴内容收进令牌并保留原文，短文本仍按输入控件原生方式粘贴。`useLinkify` 可识别普通文本中的网址和邮箱，也支持自定义匹配。

`useOutlineFromDOM` 读取容器内有 ID 的标题并随 DOM 更新。将 `useOutlineFromMarkdown` 和启用 `headingIds` 的 SMarkdown 用于同一文档，可生成匹配的目录链接和标题锚点。两者接受同一组 `plugins` 来转换 Markdown，流式渲染时可同步传入 `streaming` 与 `isFinal`。
