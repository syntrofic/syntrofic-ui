# Web Pro 日程与内容展示

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 159 | `SAgenda` | 日、周、月视图，全天与跨日、同时间叠放，拖动维护日程。 |
| 160 | `SCarousel` | 键盘与拖动切换、缩略图、并排、弹窗循环、暂停与播放。 |
| 161 | `SEmptyState` | 初始、无匹配、错误，动作与恢复，头像及填满容器等布局。 |

`SAgenda` 接收由 `@internationalized/date` 表示的事件起止时间。使用 `v-model:date`、`v-model:view`、`v-model:selected` 控制日期、视图和选中项。可指定时区、周起始日、时制、时段范围和窄屏周视图天数。仅有日期的事件默认视为全天，结束日期为开区间。同一日期的起止值表示当日。普通跨午夜事件按可见日期分段展示，时间重叠时并列排放。月视图的多日全天事件跨列显示，单日溢出时可进入日视图。[HeroUI Pro Agenda](https://heroui.pro/docs/react/components/agenda)

启用 `editable` 后可在空白时段点击或拖动创建，在事件上拖动以移动或调整时长，外部通过 `create`、`move`、`resize`、`delete` 提交数据。可用 `allowCreate` 等开关配置各操作，通过 `isReadOnly` 保护单个事件。按 Alt 加方向键移动，Alt+Shift 加上下键调整时长，Delete 删除。启用 `allowsSwipe` 后，日周视图支持触屏横滑和水平触控板滚动。当前时间在指定时区显示。

`SCarousel` 使用 Embla 处理滑动、拖动和循环，Vue 接口通过 `v-model` 绑定当前页。`slidesPerView`、`navigation`、`type` 分别配置并排张数、分页样式和控件布局。可传 Embla 选项、插件，或通过 `ready` 与 `useCarousel` 操作。页面隐藏、组件离开视口、指针悬停或焦点进入内容时会暂停自动轮播。用户可显式选择播放或暂停。系统偏好减少动效时，默认关闭自动轮播并用直接定位切换。[HeroUI Pro Carousel](https://heroui.pro/docs/react/components/carousel)

`SEmptyState` 原有的标题、描述和操作插槽继续适用于列表空状态。可指定大小、对齐、语义标题、描边或色块表面及填充高度。通过 `media` 放图片、头像或头像组，`content` 或 `actions` 放下一步动作。异常场景可使用 `status` 读出提示。预览提供添加资料、清除筛选和重试的恢复流程。[HeroUI Pro Empty State](https://heroui.pro/docs/react/components/empty-state)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
