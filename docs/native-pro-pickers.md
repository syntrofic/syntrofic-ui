# Native Pro 单选按钮和滚轮选择

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 209 | `SNativeRadioButtonGroup` 单选按钮组 | 卡片选项、说明、禁用项、互斥选择与必填校验。 |
| 210 | `SNativeWheelPicker` 滚轮选择器 | 拖动惯性、居中吸附、跳过禁用项、点选与程序定位。 |
| 211 | `SNativeWheelPickerGroup` 滚轮选择器组 | 各列独立滚动、共用选中带、联合值和停稳提交。 |

单选按钮组复用原生单选的受控值和表单校验。可以传入 `items`，也可以用 `SNativeRadioButtonItem` 自行排列内容、背景或指示器。每个选项以原生单选按钮语义报告状态。组内的选中和按压采用主题色块，选项占用空间保持稳定。[RadioButtonGroup](https://heroui.pro/docs/native/components/radio-button-group)

单列滚轮通过 `v-model` 或 `defaultValue` 设置当前值。滚动时更新可选项，停稳后居中，`commit` 提供最终值。可通过 `scrollToIndex` 和 `scrollToValue` 定位，也能设置行高、可见行数、边缘强调和选中带。滚轮的槽位可定制选项、选中带和边缘遮罩。减少动效时，点选和程序定位直接到达目标。[WheelPicker](https://heroui.pro/docs/native/components/wheel-picker)

多列按 `name` 合并值，可用 `columns` 声明或通过插槽组合。`change` 提供实时联合值，最后一列滚动停止后发出一次 `commit`。共用选中带跨越各列，列宽和禁用状态可以分别设置。[WheelPickerGroup](https://heroui.pro/docs/native/components/wheel-picker-group)

`pnpm check:native` 包含行高、奇数可见行、禁用项目跳过和居中的状态断言，并构建两端的预览脚本。设备截图使用固定编号。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
