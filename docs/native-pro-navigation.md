# Native Pro 导航

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 222 | `SNativeMorphTabs` 变形标签页 | 点击、滑动、标签展开、程序定位和减少动效。 |
| 223 | `SNativeSegment` 分段选择 | 单选、禁用选项、滑动选中条和长选项横向滚动。 |
| 224 | `SNativeSplitView` 可拖动分栏 | 吸附位置、选择保留和程序切换。 |
| 225 | `SNativeStepper` 步骤条 | 顺序推进、完成、不可达步骤和横竖布局。 |
| 226 | `SNativeSwipeableTabs` 滑动标签页 | 点击与滑动同步、嵌套纵向滚动、禁用和边界。 |

两种可滑动标签页共用原生横向分页和连续页位置。滑动时，选中条在相邻标签间移动，变形标签页会同时调整各标签的宽度。应用可控制选中项，也可用 `goTo` 定位。可延迟挂载页面并保留已访问页面的内容。标签默认使用文字，也能在触发器插槽中提供同排内容。[MorphTabs](https://heroui.pro/docs/native/components/morph-tabs) · [SwipeableTabs](https://heroui.pro/docs/native/components/swipeable-tabs)

分段选择共用标签轨道的测量、选中条动效和 Android 硬件键盘导航。可以控制布局密度、分隔线和当前选项的对齐位置。[Segment](https://heroui.pro/docs/native/components/segment)

分栏的 `snapPoints` 支持容器比例和设备独立像素，保留分栏内的内容状态。可拖动分隔条、触碰切换位置，或绑定 `v-model:snapIndex`。步骤条支持由应用控制当前及已完成项，线性流程可在完成当前步骤后解锁下一步。连接线随进度变化，禁用项保留文字和状态。[SplitView](https://heroui.pro/docs/native/components/split-view) · [Stepper](https://heroui.pro/docs/native/components/stepper)

`pnpm check:native` 检查横向分页、从右到左映射、选中条插值和分栏吸附，同时构建 Android 与 iOS 预览脚本。设备截图使用固定编号。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
