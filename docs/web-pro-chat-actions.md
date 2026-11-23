# Web Pro 消息操作、引用和工具调用

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 190 | `SChatMessageActions` 消息操作 | [消息操作示例](../?component=WP.chat-message-actions) |
| 191 | `SChatSource` 与 `SChatSources` 引用来源 | [引用来源示例](../?component=WP.chat-source) |
| 192 | `SChatTool` 与 `SChatToolGroup` 工具调用 | [工具调用示例](../?component=WP.chat-tool) |

## 消息操作

通过 `SChatMessage` 的 `actions` 插槽将操作放在回复下方。`SChatMessageActions` 根据 `actions` 排列复制、反馈、重试和分享。使用 `v-model:feedback` 管理互斥且可撤销的反馈，使用 `retry` 和 `share` 接入业务操作。每个按键的可访问名称可本地化，`action` 和 `end` 插槽可自定义按键及附加动作。复制按钮预留各状态需要的文字宽度，状态通过独立的实时区域播报，反馈保留当前焦点。[HeroUI Pro 消息操作](https://heroui.pro/docs/react/components/chat-message-actions)

## 引用来源

`SChatSource` 支持文本链接和可操作的文档引用。链接经共享的内容 URL 校验，开启新窗口时附加 `noopener noreferrer`。有描述的引用默认提供鼠标悬停、键盘聚焦和长按预览。引用图标可选，放在来源标题旁。可通过 `preview` 插槽自定义详情，通过 `activate` 在应用内打开文档。`SChatSources` 将多项引用放入可展开的语义列表，支持受控展开、自定义标题、格式化计数和可选的来源图标。[HeroUI Pro 引用来源](https://heroui.pro/docs/react/components/chat-source)

在段落中可用 `variant="number"` 和 `number` 显示引文编号。链接和内部参考都保留来源标题，可用 `numberLabel` 本地化读屏名称。资料索引使用默认标题样式，通过 `icon` 或图标插槽标注来源类型。

## 工具调用

`SChatTool` 展示准备参数、等待结果、已完成、失败和等待确认。参数可以是结构化值，也可以是尚未形成完整 JSON 的文本。结果、参数、错误和确认分别有插槽。应用接收 `approve` 或 `reject` 事件后更新状态，确认控件离开时焦点返回工具标题。`SChatToolGroup` 用于展开一组连续的工具调用并提供逐项控制。[HeroUI Pro 工具调用](https://heroui.pro/docs/react/components/chat-tool)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
