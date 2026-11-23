# Web Pro 命令与批量操作

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 156 | `SCommand` | 快捷键、模糊检索与多搜索词、分组、子级命令、禁用与无结果。 |
| 157 | `SResizable` | 横纵布局、拖动与键盘、折叠与恢复、固定像素、刷新后还原。 |
| 158 | `SActionBar` | 从选择启动、清除选择、批量共享与归档、浮动、计数滚动。 |

`SCommand` 接收带标签的 `groups`，条目可附关键词、描述、快捷键提示及子级。匹配按完整词、前缀、子串和顺序字符排序，搜索空格或逗号分隔的词时，每个词都需匹配。可传 `filter` 定制命中。默认 Command+K 或 Ctrl+K 唤起，可传 `shortcut` 更换或禁用。上下箭头移动高亮，Enter 进入子级或执行，Escape 先返回一层，再关面板。插槽可放搜索框前后内容、结果行、详情、空状态及底部提示。支持 `v-model:open`、`v-model:query`、三个尺寸和三种遮罩。[HeroUI Pro Command](https://heroui.pro/docs/react/components/command)

`SResizable` 使用 `panels` 描述面板，默认值、最小和最大尺寸支持百分比、px、em 和 rem。默认保持比例，指定 `resizeBehavior: 'pixel'` 后，容器变宽或变窄时优先保留该面板的像素宽度或高度。分隔条支持鼠标、触屏、方向键、Home 与 End，按住 Shift 加大步进。允许折叠的面板可拖过最小尺寸后折叠，双击或按 Enter 也可折叠或恢复。可以嵌套横向、纵向分组，使用线、拖点、带线圆柄、独立抓手或自定义抓手。[HeroUI Pro Resizable](https://heroui.pro/docs/react/components/resizable)

通过 `v-model` 接收各面板按 ID 索引的百分比，`v-model:collapsed` 接收折叠面板的 ID。设置 `storageKey` 开启本地持久化，也可通过 `storage` 接入自定义存储。若在服务端已知上次布局，将其作为 `defaultLayout` 和 `defaultCollapsed` 提供给首屏。

`SActionBar` 可由 `count` 自动切换，也可通过 `v-model:open` 控制。批量动作、取消和数量区可分别定制。默认浮在视口底部，也可在内容区内联显示，支持横排、纵排和移动端短标签。键盘可用方向键选动作。Escape 或取消触发 `clear`。数量按单字滚动，`countDigits` 为数字预留宽度。操作完成后可借助 `returnFocus` 指定回到列表中的哪个控件。[HeroUI Pro Action Bar](https://heroui.pro/docs/react/components/action-bar)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
