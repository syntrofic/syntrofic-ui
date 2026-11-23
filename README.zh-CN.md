# Syntrofic UI

[English](README.md) · 简体中文

Syntrofic UI 是面向 Vue 3 和 NativeScript-Vue 的 MIT 开源组件库，包含基础组件、表单、数据表格、图表、页面模板和 Agent UI 渲染器。

[官网](https://ui.syntrofic.com/) · [Vue 组件](https://ui.syntrofic.com/docs/vue/components/) · [Native 组件](https://ui.syntrofic.com/docs/native/components/) · [模板](https://ui.syntrofic.com/templates/) · [标准设计](https://ui.syntrofic.com/docs/standard-design/)

按[设计规范](site/guides/design-rules.md)复刻白底、圆角和交互默认值。运行 `pnpm exec syntrofic init --features agents` 可把设计约束写入项目的 AI 工作说明。

## Vue

```sh
pnpm add @syntrofic/ui
```

```vue
<script setup lang="ts">
import { SButton } from '@syntrofic/ui'
import '@syntrofic/ui/style.css'
</script>

<template>
  <SButton>保存更改</SButton>
</template>
```

## NativeScript-Vue

```sh
pnpm add @syntrofic/ui-native
```

在应用根节点使用 `SNativeProvider` 设置主题、排版方向、字体和减少动效选项。[Native 快速开始](https://ui.syntrofic.com/docs/native/quick-start/)

## 本地开发

```sh
pnpm install --frozen-lockfile
pnpm dev:site
```

运行 `pnpm dev` 打开组件工作台。运行 `pnpm build` 构建组件库，或用 `pnpm build:site` 将官网构建到 `dist-site/`。

```sh
pnpm typecheck
pnpm check:catalog
pnpm exec playwright install chromium firefox webkit
pnpm test
```

可以用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定本机 Chromium 路径。[贡献指南](CONTRIBUTING.md)

## 许可证

Syntrofic UI 采用 [MIT 许可证](LICENSE)。第三方许可见 [LICENSES](LICENSES/)。
