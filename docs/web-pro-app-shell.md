# Web Pro 应用布局与导航

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 153 | `SAppLayout` | 双侧窗格、桌面折叠轨道、拖动与键盘调宽、窄屏抽屉、焦点回位。 |
| 154 | `SNavbar` | 顶部入口、当前页、移动菜单、键盘关闭、菜单锁滚动。 |
| 155 | `SSidebar` | 分组收展、子项、当前入口、分区切换、轨道与移动抽屉。 |

`SAppLayout` 通过 `navbar`、`sidebar`、`aside`、默认内容及 `footer` 插槽组装应用。`sidebarMode` 提供轨道、收起和始终展开三种桌面模式。`variant` 决定区域是否内嵌或分开摆放，`sidebarSide` 可沿书写方向换侧。窄屏响应组件本身的宽度。导航默认切换为抽屉，详情区可切换为抽屉或隐藏。需要不同内容时可用 `mobileSidebar`、`mobileAside`。四个开启状态分别可用 `v-model:sidebarOpen`、`v-model:asideOpen`、`v-model:mobileSidebarOpen`、`v-model:mobileAsideOpen` 控制。[HeroUI Pro App Layout](https://heroui.pro/docs/react/components/app-layout)

设定 `resizeSidebar` 或 `resizeAside` 后，可用指针拖动或在分隔条上按方向键调宽。设置 `storageKey` 后，桌面开启状态和宽度会存入本地。移动抽屉使用当前页面状态。默认快捷键随平台使用 Command+B 或 Ctrl+B，可用 `toggleShortcut` 替换。若需要固定顶栏并在内容区内滚动，可设定 `scrollMode="content"` 和 `height`；默认使用页面滚动。

`SNavbar` 提供品牌、起始区域、导航项、操作区和移动菜单插槽。支持紧凑与舒展尺寸、静态或吸顶定位，以及浮动色块。`hideOnScroll` 可让导航随滚动方向收起和返回。移动菜单靠近触发位置展开，按钮尺寸保持稳定。Escape 关闭菜单并回到触发按钮。需要固定背景滚动时启用 `lockScroll`。[HeroUI Pro Navbar](https://heroui.pro/docs/react/components/navbar)

`SSidebar` 接收 `groups` 与可嵌套的 `items`。多分区时传入 `pages` 并使用 `v-model:page`，切换分区时页面横向滑动。折叠轨道用 `shortLabel` 或标签首字符，接入图标可用 `rail` 插槽。单独使用时可配置 `trigger`、`breakpoint`、`mode`、`storageKey` 和 `toggleShortcut`。放入应用布局时，沿用布局对侧栏和窄屏抽屉的控制。[HeroUI Pro Sidebar](https://heroui.pro/docs/react/components/sidebar)

两个导航入口通过 `v-model` 维护选中项，或用 `currentPath` 依据路由设置 `aria-current`。传入 `href` 会渲染链接。`SAppLayout` 可传入 `navigate` 和 `useHref` 接入客户端路由。支持普通链接、修饰键打开链接和独立页面导航。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
