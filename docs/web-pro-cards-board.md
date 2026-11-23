# Web Pro 互动卡片与看板

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 165 | `SHoloCard` | 鼠标跟随、触屏倾斜、分层纹理、静态和系统减少动效。 |
| 166 | `SHoverCard` | 延时打开、跨越触发区到卡片、连续切换、键盘、触屏长按。 |
| 167 | `SKanban` | 多列、排序、拖放、键盘、多选、移动端单列和新增动作。 |

`SHoloCard` 提供圆角卡面、可选背景图、纹理、光照、描边和内容层。卡面跟随鼠标，离开后由回位弹簧收敛。可分别设定跟随与回位弹簧、倾斜角度、视差和光照强度。`activateOnHover` 适合网格中的轻量卡面，`tiltOnTouch` 控制触摸或笔的倾斜。系统偏好减少动效时使用静态卡面，触屏可继续滚动页面。[HeroUI Pro Holo Card](https://heroui.pro/docs/react/components/holo-card)

`SHoverCard` 使用 `trigger` 插槽提供链接或按钮，通过 `v-model:open` 控制打开。悬停和关闭延时可配置。从触发区向预览卡斜向移动时会延长保持时间。相邻预览可共用打开时间，切换时减去重复等待。键盘聚焦触发器打开，Tab 或方向下键进入预览，Escape 回到触发器。移动端也可通过长按进入预览。可设置定位、对齐、箭头和弹层目标。[HeroUI Pro Hover Card](https://heroui.pro/docs/react/components/hover-card)

`SKanban` 用 `columns` 描述列，通过 `v-model:items` 维护任务。可定制列标题、计数、列操作、任务内容和空状态，提供横向滚动或堆叠布局。拖动任务到其他列或列内位置会触发 `move`，返回源位置、目标位置和新的顺序。键盘可用 Command+Enter 或 Ctrl+Enter 拾起任务，方向键选择目标位置，Enter 放下，Escape 取消。触屏使用任务的移动按钮拖动。可用 `isDisabled` 和 `canMove` 管理移动权限，使用 `useKanban` 管理新增、删除、更新和移动。[HeroUI Pro Kanban](https://heroui.pro/docs/react/components/kanban)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
