# Web 导航与集合组件

每个组件都有工作台独立入口和思源截图编号。接口名称、能力对标与示例网址记录在 [实现清单](../catalog/implementation.json)。

| 用途 | 组件 | 接入方式 |
| --- | --- | --- |
| 链接与路径 | SLink、SBreadcrumbs、SPagination | 用原生锚点导航。面包屑最后一项表示当前页。分页接受 `total` 和页码 `v-model`，省略项可跳到省略区间的中部。 |
| 切换与工具栏 | SToggleButton、SToggleButtonGroup、SToolbar | 单按钮使用布尔值，按钮组支持字符串单选或字符串数组多选。工具栏以 `action` 事件返回操作 ID。组内方向键移动焦点。 |
| 展开区 | SAccordion、SDisclosure、SDisclosureGroup | Accordion 接收数据条目和内容插槽。Disclosure 可独立控制 `v-model:open`，放进 DisclosureGroup 时用唯一 `value` 关联组状态。 |
| 菜单 | SMenu、SMenuItem、SMenuSection、SDropdown | SMenu 提供自定义触发和内容插槽。SDropdown 接受命令、复选、单选组、分组和子菜单组成的数据。普通命令发出 `action`，复选与单选保留菜单以便继续操作。 |
| 浮层 | SPopover、SAlertDialog | Popover 锚定触发控件，可嵌套在 Modal 内。AlertDialog 将焦点放在取消操作上，并提供确认和取消事件。 |
| 集合 | SListBox、SListBoxItem、SListBoxSection、SHeader、SEmptyState | 列表支持按键查找、分组和禁用项。向平面集合传入 `virtual` 可按视口挂载条目。标题和空态可独立嵌入其他集合。 |
| 搜索与选择 | SComboBox、SAutocomplete | ComboBox 的选中值与搜索文字分开，可选配 `v-model:query`。Autocomplete 的 `v-model` 保存输入文字，可选配建议项。两者均支持外部结果、加载及空结果状态。 |
| 标签 | STag、STagGroup | 标签可按压选择或移除。调用方通过 `remove` 更新条目。移除当前标签后，焦点移到相邻操作。 |

## 截图与编号

思源中的组件编号按首次收录顺序保留。新增后继续追加编号，关联截图所对应的 GitLab 提交。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
