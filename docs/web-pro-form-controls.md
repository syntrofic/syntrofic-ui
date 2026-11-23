# Web Pro 表单操作

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 143 | `SCheckboxButtonGroup` | 网格卡片、组合选择、必选验证、描述、禁用与表单重置。 |
| 144 | `SRadioButtonGroup` | 卡片和胶囊布局、互斥选择、自定义指示符、方向键移动焦点及表单提交。 |
| 145 | `SNumberStepper` | 增减、文本输入、长按重复、边界、格式化、反向布局、禁用和按位变化。 |
| 146 | `SDropZone` | 拖放和键盘选择共用校验，显示文件、进度、拒绝、失败、重试和移除。 |

按钮式复选组使用字符串数组，单选组使用一个字符串。两者接收 `options` 数组并复用原生表单、选择控件和移动焦点框。可用 `layout` 选择换行、响应式网格或纵向布局，用 `appearance` 选择卡片或胶囊。可访问名称取自每项的内容槽。可按需提供与名称同行的 `icon`、自定义 `indicator` 或禁用指示符。插槽可读取选中与禁用状态。[HeroUI Pro Checkbox Button Group](https://heroui.pro/docs/react/components/checkbox-button-group) · [HeroUI Pro Radio Button Group](https://heroui.pro/docs/react/components/radio-button-group)

数字步进器沿用数字输入的鼠标、键盘、表单和本地化逻辑。`reserve` 为步进值预留字符宽度，变化按位过渡。可以用方向键或长按按钮增减，点击读数可直接输入。可设置边界和小数步长，并自定义两侧按钮的内容或左右排列。支持根导出与 `@syntrofic/ui/number-stepper` 子路径。使用子路径时引入 `@syntrofic/ui/style.css`。[HeroUI Pro Number Stepper](https://heroui.pro/docs/react/components/number-stepper)

文件拖放区的 `v-model` 保存 `File[]`，配置 `accept`、`maxSize`、`maxFiles` 和 `multiple` 约束新文件。大小上限以字节为单位。组件提供接受、拒绝、移除和重试事件，设置 `name` 会把接受的文件带入原生表单。上传由业务发起，通过 `getFileState` 提供进度和结果。预览用本地模拟操作展示失败和重试。[HeroUI Pro Drop Zone](https://heroui.pro/docs/react/components/drop-zone)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
