# Native Pro 日期区间和时间选择

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 216 | `SNativeDateRangePicker` 日期区间选择器 | 跨月端点、不可用日期、手动起止日期和清除。 |
| 217 | `SNativeDateTimePicker` 日期时间选择器 | 日期和时间联合提交、手动输入、缺失字段和范围验证。 |
| 218 | `SNativeRangeCalendar` 区间日历 | 起止预览、倒序选择、跨月与断点限制。 |
| 219 | `SNativeTimePicker` 时间选择器 | 12 小时制、分钟步长、输入范围和确认。 |
| 220 | `SNativeWheelDateTimePicker` 日期时间滚轮 | 长日期列表、边界日期与时分联动。 |
| 221 | `SNativeWheelTimePicker` 时间滚轮 | 上午下午、12／24 小时制和各列停稳。 |

区间日历复用单日期日历的翻页、日期禁用和地区格式。起点、预览和最终区间各有自己的状态。两个端点都满足规则时提交有序的 `NativeDateRange`。可以用 `minimumDays`、`maximumDays` 及 `allowNonContiguousRanges` 配置规则。选择器可在月历和手动起止日期之间切换。[RangeCalendar](https://heroui.pro/docs/native/components/range-calendar) · [DateRangePicker](https://heroui.pro/docs/native/components/date-range-picker)

日期时间用 `CalendarDateTime` 表示当地墙钟时间，时间用 `Time`。滚轮区分预览与提交，在最后一列停稳后给出符合分钟步长和日期边界的值。较长日期列表按可见区域渲染，前后占位保持滚轮位置。切换小时制沿用同一时间值。[WheelDateTimePicker](https://heroui.pro/docs/native/components/wheel-date-time-picker) · [WheelTimePicker](https://heroui.pro/docs/native/components/wheel-time-picker)

字段选择器提供滚轮和手动输入。手动时间支持 `HH:mm` 或带上午下午标记的值。`closeOnSelect` 可让滚轮停稳时自动提交，确认按钮也能提交完整值。`overlay.presentation` 支持锚定弹层、对话框与底部面板。[DateTimePicker](https://heroui.pro/docs/native/components/date-time-picker) · [TimePicker](https://heroui.pro/docs/native/components/time-picker)

`pnpm check:native` 检查倒序、跨月、闰日、间隔、时间边界和长滚轮的渲染窗口，并构建 Android 与 iOS 的预览脚本。设备截图使用固定编号。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
