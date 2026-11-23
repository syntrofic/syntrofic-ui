# Native Pro 信息展示

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 232 | `SNativeBadge` 角标 | 数字上限、完整读数、四角定位、状态点与归零退出。 |
| 233 | `SNativeCarousel` 轮播 | 点击和手势切页、邻页预览、缩略索引、自动播放与暂停。 |
| 234 | `SNativeEmptyState` 空状态 | 无结果、读取失败、重新读取和初始状态。 |
| 235 | `SNativeFlipCard` 翻转卡片 | 提示按钮、滑动、背面独立操作及减少动效。 |

角标可独立呈现，也可通过 `anchor` 插槽叠放于按钮、头像或其他元素。数字超过预设上限时以加号显示，辅助技术仍可获取实际数量。状态点使用调用方提供的语义标签。[Badge](https://heroui.pro/docs/native/components/badge)

轮播与滑动标签页共用原生滚动和沉降逻辑。轮播支持每屏多项、卡片间距、两侧内边距和靠边吸附。可用滑动、键盘和程序定位切页，也可把指示点替换为缩略图。自动播放支持显式暂停，在减少动效或应用进入后台时暂停。[Carousel](https://heroui.pro/docs/native/components/carousel)

空状态提供可选媒体、短说明和主次动作，默认采用紧凑的文本布局。媒体和标题可以同排，主动作复用加载过渡。翻转卡片允许切换翻转轴，正反面共用预留尺寸，背面可以放置独立按钮。滑动范围默认在卡片顶部，并可用 `swipeArea` 调整，为下方操作保留触摸区域。原生透视旋转在半程交换可见面，减少动效时直接切换。[EmptyState](https://heroui.pro/docs/native/components/empty-state) · [FlipCard](https://heroui.pro/docs/native/components/flip-card)

`pnpm check:native` 验证吸附位置、RTL 映射、角标上限和翻转角度，并构建 Android 与 iOS 预览脚本。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 236 | `SNativeSwipeableRow` 滑动操作行 | 双侧轨道、横向手势、文字菜单和关闭复位。 |
| 237 | `SNativeTable` 表格 | 共用列宽、排序描述符、行选择、横向滚动和可选原生列表渲染。 |
| 238 | `SNativeTimeline` 时间线 | 横纵布局、时间列、自定义节点和状态文字。 |
| 239 | `SNativeWidget` 小部件 | 内容、工具、图例、脚注、加载、空状态和重试。 |

滑动操作行通过独立文字菜单提供全部操作。表格用 `v-model:sort` 接收排序条件，开启 `localSort` 后在本地排序。时间线和小部件保留插槽供业务内容复用。 [SwipeableRow](https://heroui.pro/docs/native/components/swipeable-row) · [Table](https://heroui.pro/docs/native/components/table) · [Timeline](https://heroui.pro/docs/native/components/timeline) · [Widget](https://heroui.pro/docs/native/components/widget)
