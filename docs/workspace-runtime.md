# 界面生成、工作区与嵌入

界面生成入口通过 `generateWorkspace` 接收结构化生成器，支持进度、取消、JSON 校验与失败恢复。预览使用内置的规则生成器和示例数据。生成版本记录提示词、结构化组件文档及所选主题的快照。通过 `exportWorkspace` 获得可构建的 Vue 和 TypeScript 项目文件。

Web 应用可以使用 `SAgentPanel` 组件，也可通过 `mountAgentPanel` 嵌入现有页面。浮动入口与侧栏支持开关、主题、字体和事件回调。宿主可直接处理经过验证的组件动作。Nuxt 可在客户端插件中调用挂载方法。

本地工作区 API 通过 `node scripts/platform/workspace-server.mjs` 启动。配置独立的 `SYNTROFIC_IDENTITY_KEY` 和 `SYNTROFIC_WORKSPACE_ADMIN_KEY` 后，授权方可签发限定站点、工作区、Agent、权限和时效的令牌。操作校验参数，按规则放行或进入审批，保留审计记录并按幂等键去重。本地服务的数据保存在当前服务进程，可与外部持久化适配器结合。

生成文件可以保存为带标识的快照。读取文件时只返回授权工作区内的指定条目。MCP 使用 `SYNTROFIC_WORKSPACE_ADDRESS` 和 `SYNTROFIC_WORKSPACE_TOKEN` 访问清单或文件。配置额度后，服务按工作区和周期记账，成功时确认消耗，取消或失败时释放预留。

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

## Agent 工作室与运行接口

平台预览可维护 Agent、系统指令、模型标识与会话。运行接口接收可替换的异步模型适配器，处理流式文本、校验后的界面文档、终止和运行日志。工作室使用本地演示适配器，浏览器可用时提供语音输入。知识库支持授权可读网页与本地文本，记录来源并检索片段。项目提供 13 个场景样例，可试用读操作和需要批准的模拟写操作。

工作区 HTTP 服务提供 Agent 管理、用量及审计查询。配置 `SYNTROFIC_WORKSPACE_WEBHOOK` 和 `SYNTROFIC_WORKSPACE_WEBHOOK_KEY` 可接收经过 HMAC 签名的审批状态事件。事件按标识去重，暂时失败会重试。

## Pro 分发

使用 `node scripts/platform/pro-registry.mjs` 运行私有分发服务。启动参数 `SYNTROFIC_PRO_MANIFEST` 指向版本清单，`SYNTROFIC_PRO_ACCESS` 指向工作区、权益与个人或 CI 凭证配置。归档从清单目录读取并验证 SHA-256。使用 `syntrofic install-pro ui-pro 0.1.0 --ci` 安装具体版本。客户端读取 `SYNTROFIC_PRO_ADDRESS` 与 `SYNTROFIC_PRO_CI_TOKEN`，个人安装读取 `SYNTROFIC_PRO_TOKEN`。

权益服务支持 Web、Mobile、Bundle，允许更新席位、邀请、角色、用量及授权窗口。下载后持有的版本可在取消后继续使用，成员移除会撤销该成员的读取或安装权限。服务记录额度与权益状态，支付渠道可单独接入。
