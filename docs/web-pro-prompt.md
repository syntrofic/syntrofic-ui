# Web Pro 提示词输入、建议与文字流光

| 编号 | 组件 | 工作台 |
| --- | --- | --- |
| 193 | `SPromptInput`、`SPromptQueue` 提示词输入与队列 | [提示词输入示例](../?component=WP.prompt-input) |
| 194 | `SPromptSuggestion` 提示词建议 | [提示词建议示例](../?component=WP.prompt-suggestion) |
| 195 | `STextShimmer` 文字流光 | [文字流光示例](../?component=WP.text-shimmer) |

## 输入、文件和请求状态

`SPromptInput` 支持上下、同排与自动展开的紧凑排布。紧凑模式遇到换行或附件时展开工具栏并保留当前输入焦点。原生文本框默认随内容增高，应用可限制高度或关闭自动增高。默认按 Enter 发送、Shift+Enter 换行，也可配置 Ctrl 或 Command 与 Enter 发送，或只通过发送按钮提交。输入法合成期间保留候选操作。

`status` 由应用设置为 `ready`、`submitted`、`streaming` 或 `error`。组件通过 `submit` 和 `stop` 发出请求。按钮在发送、停止和重发之间保留尺寸，文字与旋转提示各自过渡。可通过 `lockDuringRun` 配置生成时的输入限制。用 `clearOnSubmit` 决定发送后是否清理输入。

应用可通过 `v-model:files` 读取附件。选择、拖入和剪贴板粘贴共用文件类型、数量和大小限制。文件预览复用对话附件，移除后回到输入区。使用 `filesRejected` 或 `formatFileRejections` 接入本地化校验提示。工具栏、附件、页脚和队列都可通过插槽组合。[HeroUI Pro 提示词输入](https://heroui.pro/docs/react/components/prompt-input)

## 提及与排队

开启 `tokenMode` 后，用 `v-model:tokens` 绑定文字与原子词元组成的序列。候选跟随光标并支持默认的 `@` 与 `/` 触发词。可使用 `tokenTriggers` 配置触发词，使用 `tokenOptions` 和 `tokenOption` 插槽配置候选。用方向键切换候选，Enter 插入词元，Escape 暂时关闭当前触发位置的候选。编辑过程保留非编辑词元，提交时提供字符文本、词元序列和附件。

应用通过 `allowQueue` 允许在生成期间排队，并通过 `v-model:queue` 管理待发送内容。待发送项支持拖动及键盘排序、移除和恢复编辑。恢复旧请求时，输入框里的现有草稿会交换进队列。应用可在 `enqueue` 后调度请求与文件。

## 建议与文字状态

`SPromptSuggestion` 支持紧凑按钮和带说明、标签、附加内容的卡片。选择建议会发出 `select` 事件，应用可将建议写回输入框，保留继续编辑的机会。[HeroUI Pro 提示词建议](https://heroui.pro/docs/react/components/prompt-suggestion)

`STextShimmer` 在短标签上显示局部横向流光。文字和数字通过 `SMotionText` 按字符更新。可设置流光宽度、周期与颜色。系统设为减少动态效果时，显示静态的可读文字。[HeroUI Pro 文字流光](https://heroui.pro/docs/react/components/text-shimmer)

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
