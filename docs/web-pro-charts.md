# Web Pro 图表组件

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 176 | `SAreaChart` 面积图 | [面积图示例](../?component=WP.area-chart) |
| 177 | `SBarChart` 柱状图 | [柱状图示例](../?component=WP.bar-chart) |
| 178 | `SChartTooltip` 图表提示 | [图表提示示例](../?component=WP.chart-tooltip) |
| 179 | `SComposedChart` 组合图 | [组合图示例](../?component=WP.composed-chart) |
| 180 | `SLineChart` 折线图 | [折线图示例](../?component=WP.line-chart) |
| 181 | `SPieChart` 饼图 | [饼图示例](../?component=WP.pie-chart) |
| 182 | `SRadarChart` 雷达图 | [雷达图示例](../?component=WP.radar-chart) |
| 183 | `SRadialChart` 径向图 | [径向图示例](../?component=WP.radial-chart) |

在 `@syntrofic/ui` 导入组件，并加载 `@syntrofic/ui/style.css`。所有组件使用 SVG 绘制，服务端可直接输出初始图形。图、图例和数据摘要使用同一份数据，通过绘图区容器宽度适配窄屏。

## 笛卡尔图

向 `data` 传入带 `label` 和 `values` 的数据行，向 `series` 传入数据字段键、名称、颜色和单位。 `null` 表示缺失。面积图还接受两个端点组成的区间。折线和面积图支持直线、平滑曲线与阶梯线，可设置 `connect-nulls` 连接图形缺口，悬浮提示与数据摘要仍保留缺失值。

同坐标轴同标记类型的堆叠系列通过 `stack` 分组。正负值从零点分别计算。柱状图支持横排，组合图通过每个系列的 `mark` 混合面积、柱与线，并可将不同单位放在独立右轴。可配置主副轴范围、刻度格式、基准线、网格和迷你图模式。

## 极坐标图

饼图支持实心、圆环、嵌套环、角度间隔和可读总值。零占比不会绘制扇区，负值与非有限值按缺失处理。雷达图支持多系列、圆形或多边形网格、径向刻度和仅显示数据点。径向图通过起止角、数值范围和轨道控制进度环，可为每条弧配置独立范围。

## 查数与动效

交互图可通过悬停、触屏点按和键盘检查数据。使用方向键、Home 和 End 移动，Escape 收起提示。提示可以定位在图内，也能使用下方固定区域。通过 `tooltip`、`legend`、`data` 插槽接入定制视图。图形摘要用原生表格呈现实际值，数值提示复用按字和数字位更新，绘图区域保留尺寸。图形插值和过渡遵循系统减少动效偏好。 `SChartTooltip` 可独立使用，支持按系列设置值格式、单位与标记样式。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc) · [面积图](https://heroui.pro/docs/react/components/area-chart) · [柱状图](https://heroui.pro/docs/react/components/bar-chart) · [图表提示](https://heroui.pro/docs/react/components/chart-tooltip) · [组合图](https://heroui.pro/docs/react/components/composed-chart) · [折线图](https://heroui.pro/docs/react/components/line-chart) · [饼图](https://heroui.pro/docs/react/components/pie-chart) · [雷达图](https://heroui.pro/docs/react/components/radar-chart) · [径向图](https://heroui.pro/docs/react/components/radial-chart)
