# Agent UI 与页面区块

Agent UI 的编号为 249–305，页面区块的编号为 306–339。工作台提供每个条目的独立预览。

`SAgentUI` 接收 `version: 1` 的结构化文档。文档由组件类型、标识、文本、数据、表单字段、动作与子节点组成。渲染前会验证类型、唯一标识、层数、数组长度和媒体地址。可用类型通过 `agentNodeKinds` 查询。

```vue
<SAgentUI :document="document" @action="onAction" />
```

组件使用 `action` 事件交付节点标识、动作标识和输入值。宿主应用决定如何处理动作。图表带数据明细，表单保留键盘输入与浏览器校验。示例使用原创内容及模拟数据。

页面区块组合现有控件，包含图表、应用页面、对话、营销与电商场景。登录和结算示例在本地演示，不连接账号或支付服务。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc) · [Agent UI 对标资料](https://heroui.pro/docs/agents/components/data-visualization)
