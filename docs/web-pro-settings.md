# Web Pro 设置控件

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 137 | `SCellColorPicker` | 通过预设、调色区或颜色代码编辑。应用后提交，取消、按 Escape 或点击外部保留原值。 |
| 138 | `SCellSelect` | 选项分组、禁用项、自定义字体和值、选择与取消后的焦点回位。 |
| 139 | `SCellSlider` | 通过指针和键盘调整，验证数值步长、边界、禁用和按位读数。 |
| 140 | `SCellSwitch` | 全行点击、键盘切换、描述、布尔值提交与表单重置。 |
| 141 | `SInlineSelect` | 句内单选、多选、自定义指示符、上下浮层，以及长文本的宽度约束。 |
| 142 | `SNativeSelect` | 系统下拉、标签与描述、选项分组、禁用、必填校验及表单提交和重置。 |

`SCellColorPicker` 打开时复制当前值，编辑中的预览保留在面板内。有效颜色通过应用按钮或颜色输入框的 Enter 提交。外部值在编辑期间更新时，只有用户实际改过颜色才会提交草稿。配置 `colors` 可提供预设，`showAlpha` 控制透明度工具。附带 `name` 时以十六进制格式提交表单。[HeroUI Pro Cell Color Picker](https://heroui.pro/docs/react/components/cell-color-picker)

`SCellSelect` 复用弹层选择器的键盘、分组、禁用和焦点逻辑。用 `value` 插槽可以预览字体或提供更适合场景的值显示。颜色、滑块、选择和开关可直接组成设置组，并用 `variant="secondary"` 区分同组内的次要项。[HeroUI Pro Cell Select](https://heroui.pro/docs/react/components/cell-select)

`SCellSlider` 用 `v-model` 给出实时读数，使用 `commit` 处理操作结束后的保存。范围、步长、禁用以及表单名称与基础滑块一致。`SCellSwitch` 通过原生复选框提供开关语义，可以设置可访问描述，监听交互产生的 `change`，或随表单重置。[HeroUI Pro Cell Slider](https://heroui.pro/docs/react/components/cell-slider) · [HeroUI Pro Cell Switch](https://heroui.pro/docs/react/components/cell-switch)

`SInlineSelect` 支持句内单选和多选，并通过 `width` 预留选择结果的空间。用 `side` 和 `align` 设置浮层位置，用 `indicator` 定义指示符。`SNativeSelect` 让浏览器打开系统选择界面，支持分组、禁用项、必填校验和原生表单。[HeroUI Pro Inline Select](https://heroui.pro/docs/react/components/inline-select) · [HeroUI Pro Native Select](https://heroui.pro/docs/react/components/native-select)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
