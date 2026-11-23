# Web Pro 富文本与代码

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 147 | `SRichTextEditor` | 段落和行内格式、选区工具条、斜杠菜单、链接、粘贴、撤销、提交和只读回读。 |
| 148 | `SMarkdown` 与 `SStreamMarkdown` | 表格、任务列表、链接、围栏代码和逐步追加。原始 HTML 以文本显示。 |
| 149 | `SCodeBlock` | 语言标注、常见语言高亮、行号、窄屏横向滚动，以及固定宽度的复制状态。 |

`SRichTextEditor` 使用 Tiptap 的 JSON 文档作为 `v-model`。指定 `name` 可随表单提交 JSON。事件 `change` 同时提供 HTML、纯文本、空状态、字数和字符数。已有文档可回读为只读状态。字符限制按字形簇计算，超过上限的编辑不会写入。可通过插槽替换工具条、选区工具条和空行工具条，添加 Tiptap 扩展，或传入自定义斜杠菜单操作。[HeroUI Pro Rich Text Editor](https://heroui.pro/docs/react/components/rich-text-editor) · [Tiptap Vue 3](https://tiptap.dev/docs/editor/getting-started/install/vue3)

`SMarkdown` 用 Markdown-it 解析，再由 Vue 生成链接、表格和文本等节点。渲染器只输出已知节点和链接协议。`SStreamMarkdown` 使用同一渲染路径，并在追加内容时复用解析结果未变化的顶层区块。两种入口都支持指定围栏代码和表格的可访问名称。[HeroUI Pro Markdown](https://heroui.pro/docs/react/components/markdown)

`SCodeBlock` 使用 lowlight 生成语法高亮节点。未知语言仍显示原始代码，组件可指定折行、行号以及复制反馈。行号只在横向滚动模式下显示。复制使用源字符串，状态文案留有固定空间。[HeroUI Pro Code Block](https://heroui.pro/docs/react/components/code-block) · [lowlight](https://github.com/wooorm/lowlight)

三项支持从包根按需加载，也支持 `@syntrofic/ui/rich-text-editor`、`@syntrofic/ui/markdown` 和 `@syntrofic/ui/code-block` 子路径。使用子路径时引入 `@syntrofic/ui/style.css`。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
