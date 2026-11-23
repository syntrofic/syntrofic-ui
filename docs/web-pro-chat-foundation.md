# Web Pro 对话基础组件

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 184 | `SChainOfThought` 活动摘要 | [活动摘要示例](../?component=WP.chain-of-thought) |
| 185 | `SChatAttachment` 对话附件 | [对话附件示例](../?component=WP.chat-attachment) |
| 186 | `SChatConversation` 对话消息流 | [对话消息流示例](../?component=WP.chat-conversation) |
| 187 | `SChatListView` 会话列表 | [会话列表示例](../?component=WP.chat-list-view) |
| 188 | `SChatLoader` 对话加载 | [对话加载示例](../?component=WP.chat-loader) |
| 189 | `SChatMessage` 对话消息 | [对话消息示例](../?component=WP.chat-message) |

## 活动与附件

`SChainOfThought` 展示由应用提供的可见活动步骤。支持受控展开、处理状态和按位更新的耗时，并允许自定义触发按钮内容、步骤和补充信息。组件复用折叠面板和时间线。

`SChatAttachment` 通过文件名和 MIME 类型推断格式，支持媒体预览、文件大小、上传进度、错误、移除和重试。通过本地 `File` 生成的预览地址会在替换文件或卸载时回收。 `SChatAttachmentGroup` 能把附件组织成语义列表，也可替换每一项的布局。重试和移除事件由业务应用处理。

## 会话与消息

`SChatConversation` 在滚动视口中提供消息日志。停在底部附近时，新增回复和流式增量会继续跟随。向上阅读时保留可见消息的相对位置，向前加载历史时也保持阅读位置。回到最新消息支持键盘、平滑滚动和系统减少动效偏好。可用 `data-chat-anchor` 为自定义消息内容标出可保持位置的区域。

`SChatListView` 使用分组、短预览、时间和未读数展示会话。支持受控选择、原生链接、禁用状态、方向键和首尾导航，以及尾部操作。过滤后保留选中键。未读数和时间用独立数字位过渡。

`SChatMessage` 支持用户、助手和系统角色，也支持正文、自定义头像、附件、操作与页脚。纯文本允许按字更新，Markdown 复用现有安全渲染路径。业务应用处理重试事件。 `SChatLoader` 提供跳点、脉冲、旋转和骨架占位，可分别调整可见提示和读取名称，尊重减少动效偏好。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc) · [活动摘要](https://heroui.pro/docs/react/components/chain-of-thought) · [附件](https://heroui.pro/docs/react/components/chat-attachment) · [消息流](https://heroui.pro/docs/react/components/chat-conversation) · [会话列表](https://heroui.pro/docs/react/components/chat-list-view) · [加载](https://heroui.pro/docs/react/components/chat-loader) · [消息](https://heroui.pro/docs/react/components/chat-message)
