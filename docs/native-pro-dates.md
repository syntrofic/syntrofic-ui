# Native Pro 日程和日期

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 212 | `SNativeAgenda` 日程 | 日、周、月视图，跨日与重叠时间段，空日，选中、移动和调整时长。 |
| 213 | `SNativeCalendar` 日历 | 月份和年份导航、不可用日期、日期选择与本地化。 |
| 214 | `SNativeDateField` 日期输入框 | 按地区习惯排列的年月日、必填校验、无效日期、清空与辅助日历。 |
| 215 | `SNativeDatePicker` 日期选择器 | 锚定弹层或底部面板、日期范围、禁用日期与选中关闭。 |

日程可用 `v-model:view` 切换日、周、月，并通过 `v-model:selected` 管理选中的事件。日和周支持时间轴或按日分组的列表。跨午夜的记录按当天区间裁切，相互重叠的事件会分列显示。启用 `editable` 后可拖动时间轴上的事件和下沿，也可从选中操作区调整时间。应用接收 `edit` 并更新原始事件集合。[Agenda](https://heroui.pro/docs/native/components/agenda)

日历可分别绑定选中日期和当前月份，以 `minDate`、`maxDate` 与回调限制可选范围。自定义 `day` 插槽可展示日期标记。控件共用 `CalendarDate`，日程采用 `CalendarDateTime` 表示当地墙钟时间。可以从原生包直接导入日期类型和 ISO 解析函数。[Calendar](https://heroui.pro/docs/native/components/calendar) · [CalendarDate](https://react-aria.adobe.com/internationalized/date/CalendarDate) · [CalendarDateTime](https://react-aria.adobe.com/internationalized/date/CalendarDateTime)

日期输入框保存各分段的编辑内容，校验时检查日期实际存在且可选。日期选择器复用同一日历，可用 `overlay.presentation` 选择锚定弹层或底部面板，用 `closeOnSelect` 设置选择后何时关闭。[DateField](https://heroui.pro/docs/native/components/date-field) · [DatePicker](https://heroui.pro/docs/native/components/date-picker)

`pnpm check:native` 验证跨日裁切、事件重叠、闰日、输入范围与两个平台的预览脚本。设备截图使用固定编号。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
