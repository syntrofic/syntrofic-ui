## 安装

Syntrofic UI 使用 Vue 3.5 或更高版本。当前为开发预览，通过团队配置的包仓库或已获授权的本地打包文件安装。

```sh
pnpm add @syntrofic/ui
```

如果使用本地包，将安装目标替换为团队提供的 `./syntrofic-ui-0.1.0.tgz`。

## 引入样式

在应用入口引入样式。Nuxt 项目可以把同一个样式入口加到 `nuxt.config.ts` 的 `css` 数组。

```ts
import '@syntrofic/ui/style.css'
```

## 添加第一个组件

```vue
<script setup lang="ts">
import { SButton } from '@syntrofic/ui'
import { ref } from 'vue'

const saved = ref(false)
</script>

<template>
  <SButton @click="saved = true">
    {{ saved ? '已保存' : '保存设置' }}
  </SButton>
</template>
```

## 继续探索

[Vue 组件目录](/docs/vue/components/) · [主题与样式](/docs/theming/) · [CLI 与 MCP](/docs/tools/)
