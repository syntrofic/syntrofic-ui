# Web Pro 列表、地图、时间线与仪表组件

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 172 | `SListView` 列表视图 | [列表视图示例](../?component=WP.list-view) |
| 173 | `SMap` 地图 | [地图示例](../?component=WP.map) |
| 174 | `STimeline` 和 `STimelineItem` 时间线 | [时间线示例](../?component=WP.timeline) |
| 175 | `SWidget` 仪表组件 | [仪表组件示例](../?component=WP.widget) |

## 列表视图

`SListView` 接收数据和键、标题、描述、分组、链接提取器。支持只读、单选和多选，可以控制 `selected`，为禁用项目指定键或条件。画面可采用低对比色块或弱分隔线，配合 `SActionBar` 展示批量操作。标题内容和尾部动作都可通过插槽自定义。原生链接与尾部动作独立于行选择。方向键、Home、End、Page Up 和 Page Down 移动焦点，键入字符搜索项目。空格选择，Enter 执行行操作，F2 进入尾部操作，Escape 返回该行。虚拟列表保留焦点行并支持变高条目。

## 地图

从 `@syntrofic/ui/map` 导入地图并安装可选对等依赖 `maplibre-gl`。同时加载 `@syntrofic/ui/style.css` 和 `maplibre-gl/dist/maplibre-gl.css`。若打包器需要明确配置 Worker，可传入同源的 `worker-url`，例如使用 Vite 的 `?worker&url`。页面在客户端挂载后启动地图，服务端可直接渲染地图容器和加载状态。

传入 MapLibre 样式对象或 URL，或用 `styles` 按明暗主题选择样式。地图可控制 `viewport` 和选中标记，在移动后同步视野。标记支持自定义内容、提示、详情和拖动。气泡支持独立定位，也可跟随标记。键盘打开气泡后可用 Escape 关闭并返回标记。内建控件包含缩放、正北、定位、全屏，工具区可组合自定义控件。

支持坐标线路、跨经线弧线、GeoJSON 聚类、扩展图层和要素点击。工作台使用原创园区示意数据验证真实渲染和离线工作流。产品接入真实底图时，应选择有使用权限的样式和数据源并保留对应署名。初始化失败时支持重试，也可用插槽展示替代内容。

## 时间线与仪表组件

`STimeline` 会渲染有序列表。可选择起始或居中轴、起始端或结束端、交替排列、横向或纵向。条目支持紧凑样式、当前状态、可读时间、装饰连接线和自定义内容。窄屏下居中轴会移至内容一侧。

`SWidget` 用标题、工具、图例、内容和页脚组合仪表区。状态可切换为加载、空结果或失败，可用各状态插槽接入重试和替代内容。默认保留内容区高度，加载时工具按钮位置保持稳定。工作台示例包含指标组和带重试的交付记录。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc) · [List View](https://heroui.pro/docs/react/components/list-view) · [Map](https://heroui.pro/docs/react/components/map) · [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) · [Timeline](https://heroui.pro/docs/react/components/timeline) · [Widget](https://heroui.pro/docs/react/components/widget)
