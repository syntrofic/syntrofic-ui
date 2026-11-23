# Native Pro 数值显示与反馈

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 227 | `SNativeNumberValue` 数值显示 | 金额跨位、紧凑记数和同排单位。 |
| 228 | `SNativeProgressBar` 线性进度条 | 有界进度、等待响应、完成和保留进度的失败状态。 |
| 229 | `SNativeProgressCircle` 环形进度 | 双尺寸呈现、等待、完成及减少动效。 |
| 230 | `SNativeRating` 评分 | 半星触碰、重复触碰清空、可调整控件与只读评分。 |
| 231 | `SNativeTrendChip` 趋势标签 | 正、负与零，同排方向符号及端点宽度。 |

数值按右侧位数对齐，用 `reserveFor` 预留预期最大值所需的空间。变化的字形单独滚动，货币符号随首位平滑移动，尾部单位保持对齐。格式化支持小数、货币、百分比、紧凑记数、科学记数和自定义格式。复杂的自定义布局可用数值、前缀和后缀插槽。[NumberValue](https://heroui.pro/docs/native/components/number-value)

线性和环形进度共用取值范围、格式化、语义与非线性缓动。等待阶段朗读状态，完成和失败同时给出状态与数值。减少动效时停止等待循环并保留静态指示。环形组件可设直径、线宽和中心内容。线性组件可配置可见标签、轨道色与渐变填充。[ProgressBar](https://heroui.pro/docs/native/components/progress-bar) · [ProgressCircle](https://heroui.pro/docs/native/components/progress-circle)

评分支持 `v-model`、任意至多十个评分项、自定义标记与步长，使用系统可调整控件提供辅助操作。只读模式按实际小数比例裁切符号。趋势标签可由变化量推断方向，也可直接指定，符号与数值同排并使用同一块底色。[Rating](https://heroui.pro/docs/native/components/rating) · [TrendChip](https://heroui.pro/docs/native/components/trend-chip)

`pnpm check:native` 验证取值范围、圆弧边界、评分步长和趋势阈值，并构建 Android 与 iOS 预览脚本。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
