# Native Pro 操作按钮

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 196 | `SNativeFAB` 浮动操作按钮 | 单动作、展开操作菜单、禁用项、模糊遮罩。 |
| 197 | `SNativeMorphButton` 展开式按钮 | 两种展开方向、从右到左布局、表单设置和关闭后返回触发入口。 |
| 198 | `SNativeProgressButton` 进度按钮 | 按住确认、提前松手、自动复位、受控导出进度和失败重试。 |
| 199 | `SNativeSlideButton` 滑动确认 | 未达阈值复位、完成、RTL 反向滑动和辅助操作。 |
| 200 | `SNativeSocialAuthButton` 社交登录 | 服务商名称、加载、连接失败、重试和禁用。 |
| 201 | `SNativeToggleButton` 切换按钮 | 默认选中、受控开关、透明变体与禁用。 |
| 202 | `SNativeToggleButtonGroup` 切换按钮组 | 横向单选、保持至少一项、纵向多选与方向键。 |

`SNativeFAB` 放在页面的叠放布局中，通过 `position` 在安全区内选择角落。传入 `actions` 后，按钮会展开菜单，支持指定方位、逐项入场、可选关闭和背景材质。`SNativeMorphButton` 从触发按钮的相对边角展开到测量后的内容尺寸，支持八个逻辑方向、RTL、受控开关和复原焦点。[FAB](https://heroui.pro/docs/native/components/fab) · [MorphButton](https://heroui.pro/docs/native/components/morph-button)

`SNativeProgressButton` 支持按住确认和应用驱动的受控进度，可配置不同状态的文字、完成后的复位和失败重试。`SNativeSlideButton` 只在从滑块一侧拖动并达到阈值后提交动作，取消手势会复位。两者都有原生按钮的辅助激活入口，且以固定轨道绘制状态。[ProgressButton](https://heroui.pro/docs/native/components/progress-button) · [SlideButton](https://heroui.pro/docs/native/components/slide-button)

`SNativeSocialAuthButton` 提供 11 个服务商名称，可通过 `formatLabel` 本地化，或在 `start` 插槽中放入同排标识。应用接收 `authenticate` 后执行登录并更新状态。等待时固定按钮宽度，状态文字逐字更新，旋转提示独立进退场。[SocialAuthButton](https://heroui.pro/docs/native/components/social-auth-button)

`SNativeToggleButton` 用原生按钮的选中状态表达开关，可受控或设为默认选中。`SNativeToggleButtonGroup` 支持单选、多选和禁用项，面向横向或纵向布局，也可使用分离或全宽排列。Android 硬件方向键采用已有集合导航。[ToggleButton](https://heroui.pro/docs/native/components/toggle-button) · [ToggleButtonGroup](https://heroui.pro/docs/native/components/toggle-button-group)

组件按固定编号加入原生验收工作台。`pnpm check:native` 打包并分别生成 Android 和 iOS 预览脚本，包含进度阈值、RTL 锚点和边界位置的断言。Android 15 模拟器已打开 196–202，并验证短按取消、按住完成、滑动未达阈值和达标确认等交互。17 张 Android 截图已归档。iOS 运行和读屏仍待设备验收。[原生预览](native-foundation.md) · [组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
