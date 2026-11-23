# 生产力工作台

Web 示例入口为 `?platform=S-01` 至 `?platform=S-09`。移动验收应用的入口为 `386 移动工作台`。邮件、日历、客服、待办、笔记和客户使用独立示例数据。Web 浏览器本地存储保留修改，移动客服示例使用应用设置保存指派。邮件发送队列在页面打开时运行，默认延迟十秒，撤回后保留记录。定时器仅处理示例出箱，不发送到邮件服务。会前资料列出引用，通过明确批准更新本地日程。

## 工作区服务

```sh
node scripts/platform/workspace-server.mjs
```

设置不同的 `SYNTROFIC_IDENTITY_KEY` 和 `SYNTROFIC_WORKSPACE_ADMIN_KEY`，以及 `SYNTROFIC_WORKSPACE_CLIENT_ORIGIN`。服务默认监听 `127.0.0.1:4481`。通过管理员端点 `POST /identity` 签发限期工作区令牌。由调用方环境、安全存储或密钥管理系统提供密钥。服务状态和令牌保存在进程内，重启会清空。配置生产租户前应接入部署方存储、身份提供方、HTTPS 和备份。

`SYNTROFIC_WORKSPACE_CONFIG` 指向仅服务端可读的 JSON 文件，可含下列字段。

| 字段 | 内容 |
| --- | --- |
| `connectors` | 按 `gmail`、`calendar`、`contacts`、`plain`、`granola`、`cal` 配置。Google 项需要 `clientId`、`clientSecret` 和指向本服务 `/connectors/callback` 的 `callback`。其他服务设空配置以启用预设，可覆盖服务地址和分页映射。 |
| `mcp` | `resource` 指向实际 `/mcp` URL，`issuer` 与 `introspection` 指向 OAuth 服务，另设资源服务器的 `clientId` 和 `clientSecret`。 |
| `mcp.members` | 以外部稳定的 OAuth `sub` 映射到 `workspace`、`subject` 和 `scopes`，同一令牌还需携带相应的 `workspace.*` 范围。 |
| `mcp.ssoResource` | 可选的独立 UI 认证 audience，配合 `workspace.sso` 和受信页面 Origin 使用短期工作区凭证。 |
| `models` | 例如 `fast`、`balanced` 各配置 `id`、`label`、`endpoint`、可选 `token`。适配端点接收模型 ID 和消息数组，返回含 `text` 的 JSON。 |
| `teams` | 按工作区配置成员及角色，对应路由要求 `team` 权限。 |
| `releases` | 每项提供 `version`、`platform`、`changes`、`url`，版本下载使用 HTTPS。 |

连接器使用 `connect` 范围。OAuth 请求用单次 state 和 PKCE，成功后在服务端保存访问及刷新凭证。断开连接会删除本地凭证，支持令牌撤回的供应商会收到撤回请求。同步先验证工作区、成员及账号，处理翻页和增量游标，过期游标允许重新同步。浏览器工作台调用 API 时输入工作区令牌，供应商令牌不进入 Web 本地存储。

Remote MCP 通过 `/.well-known/oauth-protected-resource/mcp` 发布元数据。外部客户端在身份提供方完成授权码和 PKCE，调用 `POST /mcp`。服务校验 OAuth scope、issuer、audience、用户和撤回状态。读取立即执行，写入返回审批请求 ID，删除记录被拒绝。管理端以 `approve` 权限决定写入，以 `audit` 权限读取活动。`GET /mcp` 返回 405，采用 JSON 响应的 Streamable HTTP 模式。

模型端点需要 `infer` 范围和已配置的工作区额度。失败或断开会释放预留额度。同一工作区、成员和请求号去重。Free、Plus、Pro、Team 用量和下载列表随工作区返回。实际模型由部署方配置，账单结算需连接部署方计费系统。

## 邮件和日程写入

Google 账户默认以只读权限连接。部署方启用某供应商的 `write` 并设置明确的写入 scope 后，提交 `POST /actions`。`schedule_mail` 需要 `to`、`subject`、`text`，可选 `scheduledAt` 为毫秒时间戳。 `reschedule_event` 需要事件 `id`、带时区的 `start` 和 `end`、同步得到的 `etag`，可选 `calendar`。Gmail 使用 `gmail.send`，Calendar 使用 `calendar.events`。

审批人通过 `GET /actions/pending` 查阅内容，再调用 `POST /actions/decide`。邮件批准后至少保留十秒撤回时间，提交者可在 `GET /deliveries` 查看等待中的邮件并通过 `POST /deliveries/cancel` 撤回。日程写入校验原事件的版本。通过 `GET /deliveries/activity` 查看写入审计。

## 待联调环境

第三方连接器、企业身份和托管模型需要部署方测试账号、预注册客户端及其授予的权限。工作台已提供本地操作、权限和失败路径；供应商真实投递和日程写入、多人同时操作和 iPhone 实机仍待接入环境验证。

- [Gmail 同步](https://developers.google.com/workspace/gmail/api/guides/sync)
- [Gmail 发送](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
- [Google Calendar 更新事件](https://developers.google.com/workspace/calendar/api/v3/reference/events/patch)
- [Google Calendar 增量同步](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Google Contacts 同步](https://developers.google.com/people/api/rest/v1/people.connections/list)
- [Plain 支持工作台示例](https://github.com/team-plain/example-headless-support-app)
- [Granola API](https://www.granola.ai/blog/granola-api-for-enterprise-audit-api-usage-analytics-and-compliance-archives)
- [Cal.com 预约列表](https://cal.com/docs/api-reference/v2/bookings/get-all-bookings)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) · [MCP 授权](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
