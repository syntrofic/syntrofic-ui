# Web 输入与日期组件

组件按 058–068 编号。工作台提供独立预览，验收文档同时收录验证码输入中、搜索清除、日历换年和选择器展开的截图。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 入口 | 接入方式 |
| --- | --- | --- |
| 058 | `SInputOTP` | `v-model` 接收字符串，保留前导零。支持本机验证码自动填充、粘贴、默认六位和自定义长度。可设置分组间隔、掩码与 `numeric` 或 `alphanumeric` 模式。输入完整时触发 `complete`。 |
| 059 | `SNumberField` | `v-model` 接收数值，`formatOptions` 和 `locale` 控制显示格式。步进按钮和方向键遵守 `min`、`max` 与 `step`，表单提交存储的数值。 |
| 060 | `SSearchField` | `v-model` 即时更新输入，Enter 发出 `search`。清除按钮和 Escape 触发 `clear` 并保留输入焦点。输入法组合期间保留原有行为。 |
| 061 | `SCalendar` | `v-model` 支持单日期或多选数组。支持月、周和日视图、年份导航、日期边界以及不可用日期。可用 `#indicator` 为日期附加状态。 |
| 062 | `SDateField` | 按本地顺序分段编辑日期。通过 `granularity` 指定日期精度或加入时间分段，支持日期边界和表单提交。 |
| 063 | `SDatePicker` | 日期字段与可展开日历共用 `v-model`。支持 `v-model:open`、`v-model:placeholder`、可用日期判定和选中后回焦。 |
| 064 | `SDateRangePicker` | `v-model` 接收含 `start` 和 `end` 的对象。支持跨页选择、区间长度及日期限制，完整区间按 `start/end` 提交。 |
| 065 | `SRangeCalendar` | 使用月、周和日视图选择区间，提供区间预览、端点样式、固定端点和最大跨度。使用 `start-change` 与 `valid-change` 接收过程状态。 |
| 066 | `STimeField` | 支持 12 或 24 小时制，按小时、分钟或秒编辑。可配置步长、时间边界与时区显示。 |
| 067 | `SCalendarYearPicker` | 可独立使用，支持年份分页、方向键以及边界，月历也使用同一部件。 |
| 068 | `SDateInputGroup` | 在日期、日期范围或时间字段的上下文中渲染可编辑分段。使用 `start` 和 `end` 插槽组合前后缀。 |

日期值采用 `CalendarDate`，时间值采用 `Time`。在服务端渲染页面中可显式传入 `locale` 与初始值，让客户端和服务端使用同样的格式。[Adobe Internationalized Date](https://react-aria.adobe.com/internationalized/date/)

```vue
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { SDatePicker } from '@syntrofic/ui'
import '@syntrofic/ui/style.css'
import { shallowRef } from 'vue'

const date = shallowRef(new CalendarDate(2026, 11, 18))
</script>

<template>
  <SDatePicker
    v-model="date"
    name="release"
    label="发布日期"
    locale="zh-CN"
    trigger-text="日历"
    trigger-label="打开发布日期日历"
    year-picker
    required
  />
</template>
```

组件可从包根导入。独立入口使用默认导出，例如 `import SCalendarYearPicker from '@syntrofic/ui/calendar-year-picker'`。同样可从 `@syntrofic/ui/date-input-group` 导入日期输入组。

方向键修改日期或时间时，仅过渡发生变化的数字。验证码用同一个焦点框在格位间移动，清除搜索时输入的尺寸保持稳定。选年份时月视图保留原区域，下面内容不会上下移位。

## 日期视图与翻页

四个日历入口都接受 `visibleDuration`。使用 `{ months: 2 }`、`{ weeks: 2 }`、`{ days: 1 }` 或 `{ days: 5 }` 可显示多月、多周、单日或连续多日。按可见范围翻页时使用 `pageBehavior="visible"`，每次只移动一个单位时使用 `pageBehavior="single"`。已有的 `numberOfMonths` 和 `pagedNavigation` 仍可用。

`selectionAlignment` 可将初始日期放在页面开头、中间或末尾。日期可用方向键移动，Home 和 End 定位同一行的两端，Page Up 和 Page Down 翻页。月视图的 `weeksInMonth` 可以增加固定行数，同时保留当前月的完整日期。焦点框随日期移动，日期数字按位过渡。浏览器中的减少动态效果偏好会关闭位移动画。

范围日历可通过 `isDateUnavailable(date, anchor)` 判断某一天对当前起点是否可用。日期选择器和独立日历使用同一套日期视图。使用 `locale="ar-SA-u-ca-islamic-umalqura"` 和 `dir="rtl"` 可显示从右向左的乌姆库拉历，绑定的日期仍使用输入值的历法。验收截图追加在 061、063、064 和 065 下。[HeroUI Calendar](https://heroui.com/en/docs/react/components/calendar) · [HeroUI RangeCalendar](https://heroui.com/en/docs/react/components/range-calendar)

更多历法组合、年份开合控制和人工读屏仍待验收。当前目录条目保留为实现阶段，验收结果逐项记录。
