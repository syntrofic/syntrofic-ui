# 主题工作台和开发工具

工作台通过 `?platform=all` 浏览平台目录。品牌主题可切换明暗、创建副本、应用颜色建议和查阅修订。浏览器保存当前主题，检测其他窗口保存的版本，支持撤销与重做。主题导出包括 Web CSS、Native 主题 JSON、组件清单、`DESIGN.md` 和 `PRODUCT.md`。Native 主题 JSON 的颜色、字体和间距参数可传给 `SNativeProvider`。

## 创建项目

```sh
syntrofic init vue --out ./web
syntrofic init nuxt --out ./nuxt
syntrofic init --native --out ./native
syntrofic doctor --native --out ./native
```

使用 `--source` 选择私有包版本或本地打包文件，例如 `--source file:/path/to/ui.tgz`。安装、卸载和更新支持 pnpm、npm、yarn、bun。需要先看改动时加 `--dry-run`。Vue 和 Nuxt 项目导入 `@syntrofic/ui/style.css`，无框架的 HTML 页面可引用构建后的样式文件，并使用对应组件类名。

## 文档服务

```sh
syntrofic search chart --json
syntrofic info NP.bar-chart
syntrofic docs export --out ./reference
node scripts/platform/docs-server.mjs
node scripts/platform/mcp.mjs
```

本地 HTTP 服务提供目录搜索、单项查询与 OpenAPI 文件。标准输入输出 MCP 服务提供目录查询和生成文档。所有入口共用同一个目录。[MCP 工具协议](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

## 旧组件迁移

| 旧入口 | Vue 对应组件 | 示例 |
| --- | --- | --- |
| Code | `SCode` | `<SCode>pnpm check:catalog</SCode>` |
| Image | `SImage` | `<SImage src="/cover.png" alt="交付封面" :width="320" />` |
| Snippet | `SSnippet` | `<SSnippet value="pnpm build" copy-label="复制" />` |
| Spacer | `SSpacer` | `<SSpacer :size="16" />` |
| User | `SUser` | `<SUser name="林舟" description="品牌规范" />` |

[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

## 单独样式、变体和原生布局

`@syntrofic/ui-styles` 提供完整 CSS、Token 文件、按主题和组件类型拆分的文件，以及 Tailwind 色彩和尺度映射。静态发布可以使用同包的 `cdn.css` 入口。TypeScript 变体工具由 `@syntrofic/ui/variants` 导出，支持默认值、组合条件、插槽、继承、响应式类及类名冲突合并。[Tailwind Merge](https://github.com/dcastil/tailwind-merge/blob/main/README.md)

用 `syntrofic migrate ./src/legacy.vue --dry-run` 查看报告。加 `--write` 会更新 Syntrofic 旧组件的导入，保留原有 Vue 绑定名。HeroUI 和 NextUI 的导入会得到 Vue 组件映射及 JSX 移植提示。

Native 保留 Provider 配置层。可以用 `SNativeScope` 设置局部主题，用 `SNativeSafeArea` 给指定边缘留出设备安全区。作为 `SNativePortalHost` 后代的 `SNativePortal` 会把内容挂到当前宿主的根层。

## 品牌协作与预览

主题工作台可以从允许读取的 HTTPS 网站或粘贴的样式推断颜色，经确认后应用。品牌资产记录链接、标签和授权信息。可把主题快照保存到授权工作区，通过快照 API 与 MCP 读取。编辑代理建议使用与手动编辑共用的版本化补丁，过期修订会被拒绝。输入手机可访问的工作台地址后，可生成主题预览二维码。Native 预览入口可粘贴导出的主题 JSON。

`syntrofic figma --id <Figma 开发插件 ID> --out ./figma-plugin` 输出开发插件。插件从主题清单同步颜色和尺寸变量，建立浅深模式，并列出需要在文件内设置的字体和阴影。[Figma 变量 API](https://developers.figma.com/docs/plugins/api/figma-variables/)

Figma 开发插件同时生成 `design-kit.json`。其中 230 个组件编号映射到对应代码与验收编号。导入组件套件后，插件会建立四条发行线的可编辑组件页，纳入基础结构、Auto Layout 与浅深变体。完整设计状态仍需在 Figma 中逐项验收。
