# Web Pro 反馈组件

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 131 | `SNumberValue` | 八组数值示例覆盖货币、百分比、紧凑记法、符号、单位、前后缀、关闭动效和大整数。切换 999 与 1,001 检查宽度。 |
| 132 | `STrendChip` | 六组示例覆盖升降、持平、下降为好、三种尺寸、样式和单位。切换方向时箭头旋转，读数按位更新。 |
| 133 | `SPressableFeedback` | 检查高亮、触点扩散、按压位移、按住确认、点按进度和禁用。测试鼠标和键盘按压及系统减少动效。 |
| 134 | `SRating` | 半分编辑、小数只读、替换图形、禁用、键盘、表单提交和重置。 |
| 135 | `SEmojiPicker` | 内联与弹层、中文与英文搜索、类别、最近使用、肤色和长列表键盘导航。 |
| 136 | `SEmojiReactionButton` | 99 到 100 的宽度、选中与撤销、从选择器添加、禁用、只读。 |

`SNumberValue` 使用 `Intl.NumberFormat` 和现有字符动效，支持 `number` 与 `bigint`。用 `formatOptions` 传递币种、工程记法、格式和小数精度等配置。默认插槽可读取 `formatToParts` 结果，前后缀可使用属性或插槽。`reserve` 按字符宽度预留读数区，适合数值会跨数量级的页面。[HeroUI Pro Number Value](https://heroui.pro/docs/react/components/number-value)

`STrendChip` 根据正负值自动选取方向，也可用 `trend` 覆盖。用 `positive="down"` 把下降标为有利，读屏通过 `directionLabels` 取得方向文本。箭头与数字共用同一行。[HeroUI Pro Trend Chip](https://heroui.pro/docs/react/components/trend-chip)

`SPressableFeedback` 默认生成按钮。需要把反馈应用到现有按钮或链接时，使用 `as-child`。反馈状态覆盖指针、键盘、取消和移出，通过 `pressed-change` 通知使用者。按住确认和点按进度支持四向扫过、时长、复位与完成回调，提前松开确认键会取消操作。系统减少动态效果时保留状态反馈和操作时长。[HeroUI Pro Pressable Feedback](https://heroui.pro/docs/react/components/pressable-feedback)

`SRating` 通过 `v-model` 绑定数值，用 `count` 和 `step` 配置图形数量与增量。`name` 和 `form` 接入原生表单，`clearable` 支持再次点击已选值或使用 Delete 清除。只读值支持任意小数。使用 `glyph` 插槽可分别自定义空态和填充态的图形。为读屏本地化时传入 `label` 和 `formatValue`。[HeroUI Pro Rating](https://heroui.pro/docs/react/components/rating)

`SEmojiPicker` 默认使用触发器浮层，`inline` 直接显示面板。使用 `locale` 选择内置中英文词表，或传入 `categories` 替换类别和表情。词表按需加载，网格按可见行渲染。可通过 `v-model:recent` 和 `v-model:tone` 共享最近使用与肤色，设置 `storageKey` 可在当前浏览器保存最近使用。选择事件返回字符与本地化名称。[HeroUI Pro Emoji Picker](https://heroui.pro/docs/react/components/emoji-picker) · [Emojibase 数据](https://emojibase.dev/docs/datasets/)

`SEmojiReactionButton` 通过 `v-model:selected` 和 `v-model:count` 同步当前状态。计数按位滚动，`reserve` 可为预期最大读数留出空间。外层可以组合 `SEmojiPicker` 新增或恢复一条反应。`readonly` 以文本显示统计，`disabled` 保留按钮语义。[HeroUI Pro Emoji Reaction Button](https://heroui.pro/docs/react/components/emoji-reaction-button)

评审图片按编号放在单独的思源子文档。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
