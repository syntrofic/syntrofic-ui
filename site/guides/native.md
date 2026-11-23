## 安装

原生组件通过 NativeScript-Vue 渲染，独立包依赖 NativeScript Core 9.1 和 NativeScript-Vue 3.1。当前为开发预览，通过团队配置的包仓库或已获授权的本地打包文件安装。

```sh
pnpm add @syntrofic/ui-native
```

## 配置根节点

`SNativeProvider` 在根节点提供主题、方向、字体和减少动态效果配置。默认采用白色底色；设置 `appearance="system"` 可跟随系统。使用 NativeScript 的 `@tap` 处理手势。

```vue
<script setup lang="ts">
import { SNativeButton, SNativeProvider } from '@syntrofic/ui-native'
import { ref } from 'vue'

const saved = ref(false)
</script>

<template>
  <Page>
    <SNativeProvider>
      <SNativeButton :label="saved ? '已保存' : '保存设置'" @tap="saved = true" />
    </SNativeProvider>
  </Page>
</template>
```

## 运行示例

SNativeHeading 为标题提供原生读屏语义。SNativeHStack 和 SNativeVStack 使用主题间距，可控制对齐、分布和换行。给 SNativeAvatar 传入 `presence` 与 `presence-label`，即可显示并朗读在线状态。

`SNativeIcon` 用与官网、Vue 同一套矢量图形，支持语义颜色和尺寸。用 `<SNativeIcon name="download" />` 显示下载图标。图标字体随 Native 包复制到应用的 `fonts` 目录。自定义构建流程可将包内的 `fonts/SyntroficIcons.ttf` 复制到同一位置。`provideNativeIcons` 仍能为组件子树注册字形或变体。[浏览图标](/icons/)

SNativeItem 用 `marker`、`start` 和 `end` 插槽组合条目内容，尾部按钮保留独立的触控操作。

在项目仓库准备好目标平台的 SDK 和设备或模拟器后，运行对应平台的示例。组件详情页提供例程编号，可在示例应用里定位。

```sh
pnpm --filter @syntrofic/ui-native build
pnpm --filter @syntrofic/native-demo ios
pnpm --filter @syntrofic/native-demo android
```

[Native 组件目录](/docs/native/components/) · [NativeScript 环境配置](https://docs.nativescript.org/setup/)
