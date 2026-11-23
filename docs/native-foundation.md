# Native 基础组件

Native 线使用 Vue 3 和 TypeScript，由 NativeScript-Vue 渲染平台原生控件。独立包为 `@syntrofic/ui-native`，示例应用在 `apps/native-demo`。包入口提供编译后的 ESM 与类型，`@syntrofic/ui-native/theme` 可以独立读取默认配色、间距、圆角和动效参数。调色板和尺寸与 Web 同源，每次构建核对两端 token。

浅色模式使用纯白页面底色。`SNativeCard` 默认用与 Web 同源的微灰底区分内容，`SNativeSurface` 的默认内边距为 12 个设备无关像素。卡片描述和表单辅助文字与正文同号。按钮和单行输入使用胶囊形状，iOS 内容表面使用连续圆角，Android 内容表面使用原生背景绘制。中文使用随包分发的思源黑体 SC，纯英文在 iOS 优先用 Arial、在 Android 用随包分发的 Arimo。`SNativeProvider` 的 `fontFamily` 属性支持覆盖。NativeScript Webpack 构建会把两种字体和开源授权文件复制到应用包的 `fonts/` 目录。

Android 正文和单行输入使用 15 sp，按钮的三档字号为 14、15、17 sp。Android 8 及以上为随包字体显式指定正文 400 和强调文字 600 的字重，较旧版本使用系统无衬线字体。按钮行按实际内容和最小高度布局，文字、图标及加载指示器在行内垂直居中。

## 打包与预览

```sh
pnpm install --frozen-lockfile
pnpm check:native
```

该命令打包 Native 库，在独立目录安装产物、检查 TypeScript，并编译 iOS 和 Android 两套 NativeScript 脚本。示例目录按固定编号导航，每个页面提供明暗色和减少动效的控制。已安装目标平台 SDK 和设备时，可从工作区启动示例应用。[NativeScript 环境配置](https://docs.nativescript.org/setup/) · [NativeScript-Vue](https://github.com/nativescript-vue/nativescript-vue)

```sh
pnpm --filter @syntrofic/ui-native build
pnpm --filter @syntrofic/native-demo ios
pnpm --filter @syntrofic/native-demo android
```

## 第一批评审

| 编号 | 组件 | 评审场景 |
| --- | --- | --- |
| 088 | `SNativeButton` | 操作层级、禁用、加载时文字让位、指示器进退场 |
| 089 | `SNativeCloseButton` | 紧凑关闭动作、触达面积与可访问名称 |
| 090 | `SNativeLinkButton` | 链接语义、系统链接与应用内导航回调 |
| 091 | `SNativePressableFeedback` | 原生激活、触摸取消和背景色过渡 |
| 092 | `SNativeInput` | 输入法、键盘类型、自动填充、两个字段共用焦点框 |
| 093 | `SNativeTextField` | 标签、提示、必填和校验、错误动效 |
| 094 | `SNativeLabel` | 必填提示、点标签聚焦 |
| 095 | `SNativeDescription` | 安静的字段辅助说明 |
| 096 | `SNativeFieldError` | 错误文字、实时播报和出入场 |
| 097 | `SNativeText` | 标题、正文、系统字号，以及通过 `SNativeMotionText` 逐位更新数字 |
| 098 | `SNativeSurface` | 独立圆角表面与莫兰迪色块 |
| 099 | `SNativeSeparator` | 横向或纵向分隔，按需设置可访问标签 |
| 100 | `SNativeCard` | 媒体、标题、内容与操作区的插槽 |
| 101 | `SNativeSpinner` | 等待语义、大小和减少动效时的静态状态 |
| 102 | `SNativeAlert` | 通知色调、说明、动作与播报级别 |

`SNativeProvider` 放在页面内容根节点，支持系统主题、自定义明暗色、方向、字体和减少动态效果。`SNativeFocusGroup` 管理组内输入框的同一个焦点框。用 `SNativeMotionText :reserve="3"` 预留数字位，位数处于预留范围内时保持控件宽度。

Native 包已通过类型检查、打包和双平台脚本构建。Android 15 模拟器已安装工作台并打开 088–102 的验收场景，截图按编号归档。iOS 运行、辅助读屏、系统字号和键盘输入仍待各平台设备验收。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

## 上游版本复核

Native 开源目录仍为 39 项。v1.1.1 的差异已补入验收清单，包括系统原生 BottomSheet、可固定的头尾和可滚动正文、Select、Menu、Popover 共用底部面板、Toast 的快速入队和最大可见数，以及按滚动位置变化的边缘提示。继续核对首批组件的组合变体，包括 PressableFeedback 的触点扩散和容器组合。[HeroUI Native 组件目录](https://heroui.com/en/docs/native/components) · [v1.1.1 发布说明](https://heroui.com/en/docs/native/releases/v1-1-1) · [PressableFeedback](https://heroui.com/en/docs/native/components/pressable-feedback)
