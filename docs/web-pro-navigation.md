# Web Pro 导航控件

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 150 | `SSegment` | 单选、可清空、禁用、水平与垂直、指示框移动、键盘、表单重置。 |
| 151 | `SStepper` | 当前、已完成、暂不可达、部分进度、键盘前后切换和只读时间线。 |
| 152 | `SContextMenu` | 右键、键盘、触屏长按、复选与单选菜单项、子菜单、焦点回位、禁用和受控打开。 |

`SSegment` 通过 `v-model` 绑定单个选项。选择框跟随按钮位置和大小，新增选择时收缩淡入，已有选择之间沿非线性曲线移动。指定 `allowEmpty` 后可再次按下当前选项并清空选择。可选择三种尺寸、透明底或默认底、方向和分隔线。按方向键切换焦点，按 Space 或 Enter 确认选择。[HeroUI Pro Segment](https://heroui.pro/docs/react/components/segment)

`SStepper` 用 `v-model` 指定当前步骤，开启 `interactive` 可在可达步骤间跳转。用 `maxReachable` 限制可点击范围，用 `completed` 指定已经完成的步骤，用每一步的 `progress` 表示其后连接线的部分进度。默认可用数字或圆点，也可以用插槽配置标记、标题、说明和连接区。[HeroUI Pro Stepper](https://heroui.pro/docs/react/components/stepper)

`SContextMenu` 复用菜单的分组、禁用、子菜单与选择状态。桌面支持右键、菜单键、Shift + F10 和 Control + Enter，触屏支持静止长按。动作项执行后关闭菜单，复选与单选项可连续调整。可通过 `v-model:open` 控制打开，通过 `v-model:selected` 读取选择。弹层会避让视口。键盘关闭或执行动作后恢复到触发区。[HeroUI Pro Context Menu](https://heroui.pro/docs/react/components/context-menu)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
