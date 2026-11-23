# Native Pro 搜索和数字输入

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 203 | `SNativeAutocomplete` 自动补全 | 异步查找、选中候选、无匹配和加载失败。 |
| 204 | `SNativeComboBox` 组合选择框 | 已选时浏览全部选项、改选、清除和多选。 |
| 205 | `SNativeNumberField` 数字输入框 | 金额和百分比、原生键盘编辑、步长与范围。 |
| 206 | `SNativeNumberPad` 数字键盘 | 阶段性小数、删除、最大位数和禁用。 |
| 207 | `SNativeNumberStepper` 数字步进器 | 点按、长按连增减和上下限。 |
| 208 | `SNativePhoneNumberField` 电话号码输入框 | 搜索区号、识别国际号码、验证和 E.164 输出。 |

两个选择框共享可搜索列表，支持本地和异步选项。应用可通过 `v-model:query` 和 `v-model:open` 管理查询和展开状态。组件会在查询改变或关闭时取消等待，忽略过期响应，并让禁用项留在结果里供浏览。组合选择框可浏览全部选项，也可以限制为列表内的选项。[Autocomplete](https://heroui.pro/docs/native/components/autocomplete) · [ComboBox](https://heroui.pro/docs/native/components/combo-box)

`SNativeNumberField` 编辑时保留小数点与符号，提交后根据区域格式显示，可用 `min`、`max`、`step` 约束。`SNativeNumberPad` 的值保持为字符串，应用可用自定义布局、十进制分隔符和输入位数。`SNativeNumberStepper` 用固定空间显示数值，每个字符独立过渡，长按可重复操作。[NumberField](https://heroui.pro/docs/native/components/number-field) · [NumberPad](https://heroui.pro/docs/native/components/number-pad) · [NumberStepper](https://heroui.pro/docs/native/components/number-stepper)

电话输入框通过 `v-model:country` 控制区号，默认根据设备所提供的国际化能力显示地区名称。应用可传入允许的地区列表和 `formatCountry` 为地区命名。`change` 和 `submit` 事件提供地区、区号、国别号码、E.164、格式化文本和验证结果。[PhoneNumberField](https://heroui.pro/docs/native/components/phone-number-field) · [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js)

`pnpm check:native` 包含输入状态断言，并验证发布包的 Android 和 iOS 预览脚本。设备验收按固定编号记录。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
