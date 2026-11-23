# Web Pro 资源卡片与指标卡

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 168 | `SItemCard` 资源卡片 | [资源卡片示例](../?component=WP.item-card) |
| 169 | `SItemCardGroup` 资源卡片组 | [资源卡片组示例](../?component=WP.item-card-group) |
| 170 | `SKpi` 指标卡 | [指标卡示例](../?component=WP.kpi) |
| 171 | `SKpiGroup` 指标卡组 | [指标卡组示例](../?component=WP.kpi-group) |

## 资源

`SItemCard` 提供标题、说明、状态和操作插槽，另外用默认插槽放多行补充内容。通过 `pressable` 或 `href` 让标题区成为原生按钮或链接。尾部操作保持独立，可嵌入按钮、开关、单选和多选。标题和说明使用插槽时放入文本或其他行内内容。可选图标与标题同一行，直接沿用前景色。动态状态按字更新，`reserve-status` 可预留位置。默认状态适合浏览，`variant` 可选不同的浅色面、描边或透明底。

`SItemCardGroup` 支持标题、说明、组级操作和页脚。列表模式默认用轻分隔线区分条目。网格可设两列或三列，并随容器宽度逐级收为单列。组内的卡片有原生列表项语义，可以单独覆盖组的表面样式。

## 指标

`SKpi` 用语义化名值对显示统计项。沿用 `SNumberValue`、`STrendChip` 和 `SProgressBar`，支持本地化、前后缀、趋势、进度、上下文、操作、分隔线和页脚。默认按位滚动数字，`reserve` 可预留字符宽度。趋势可使用紧凑文本，图标和标题同一行。

趋势图可置于数值旁或正文下方。数据可为数字、`null` 或带标签的点。`null` 保留缺口，开启 `chart-connect-nulls` 可连接相邻有效数据。启用检查时可悬停、点按或用方向键及 Home、End 查看各点。数据提示有固定高度，图形更新和游标移动有缓动，系统减少动态效果时直接落到目标状态。数字和提示支持独立格式设置。

`SKpiGroup` 支持横排等宽和纵向堆叠。默认横排会在窄容器中换成纵向。可选分隔线放在相邻卡片之间，各指标保留独立背景。组内可组合不同数值格式、图表、趋势和进度。

[思源组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc) · [Item Card](https://heroui.pro/docs/react/components/item-card) · [Item Card Group](https://heroui.pro/docs/react/components/item-card-group) · [KPI](https://heroui.pro/docs/react/components/kpi) · [KPI Group](https://heroui.pro/docs/react/components/kpi-group)
