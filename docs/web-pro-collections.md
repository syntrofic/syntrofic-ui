# Web Pro 网格、文件树与目录

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 162 | `SDataGrid` | 排序、过滤、选中、批量操作、单元格编辑、拖动、固定列、层级展开、虚拟滚动和异步加载。 |
| 163 | `SFileTree` | 分组、多级目录、禁用项、多选、键盘导航及文件移动。 |
| 164 | `SFloatingToc` | 跟随文档滚动、定位标题、鼠标悬停或点击展开、键盘操作、长目录虚拟渲染。 |

`SDataGrid` 复用开源表格的排序、格式化和虚拟滚动。列可设 `pinned: 'start' | 'end'`、初始和最小最大宽度，使用 `v-model:widths` 控制实时尺寸。分隔条支持指针和方向键。`stickyHeader` 可固定表头，`virtual` 设置滚动区域和预估行高。`hasMore` 启用尾部哨兵，进入视口时触发 `loadMore`。也可用尾部按钮手动加载。[HeroUI Pro Data Grid](https://heroui.pro/docs/react/components/data-grid)

排序可在客户端完成，或用 `sortMode="manual"` 交给数据源。传 `query` 或 `filter` 筛选时保留匹配子级的父路径。`getChildren` 开启层级行，`withChildren` 供层级排序拖动时生成新行。`v-model:selected` 可接批量操作栏。启用 `editable` 的列可双击、Enter 或 F2 进入编辑，Enter 提交、Escape 取消。键盘用方向键移动单元格，未排序时按 Command+Enter 或 Ctrl+Enter 拾起行，上下键指定位置，Enter 提交。

`SFileTree` 接收 `items` 或带标题的 `sections`。可控制展开与选择，支持单选、多选、Shift 范围选择、方向键进出目录与按字查找。可通过插槽添加行标题、说明、图标、展开标记和操作。启用 `draggable` 后可将一组已选文件移到夹内或相邻位置，`move` 事件返回移动后的数据。键盘用 Command+Enter 或 Ctrl+Enter 拾起，上下键移动目标，展开方向键指定夹内，Enter 提交。禁用项和自身后代保留移动限制。[HeroUI Pro File Tree](https://heroui.pro/docs/react/components/file-tree)

`SFloatingToc` 使用条目 ID 查找文档标题，可跟踪页面或独立滚动容器。可用 `v-model:active` 读取当前章节，`v-model:open` 控制展开。支持点击或带延时的悬停、左右放置、嵌套条目和虚拟长目录。选取条目滚动到标题，键盘选取也会将焦点移到标题。Escape 退出目录并回到触发按钮。需要同步地址栏时设置 `history`。[HeroUI Pro Floating TOC](https://heroui.pro/docs/react/components/floating-toc)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
