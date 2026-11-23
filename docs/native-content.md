# Native 导航与内容组件

编号 112–120 对应原生示例中的导航项。组件从 `@syntrofic/ui-native` 导入，沿用共享主题、浅色与深色配置及系统减少动效设置。[Native 安装与预览](native-foundation.md) · [思源组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 组件 | 接入与验收场景 |
| --- | --- | --- |
| 112 | `SNativeAccordion` | 通过 `items` 和 `v-model` 管理展开项，支持单开、多开、禁用和至少保留一项。面板过渡实际内容高度，箭头随展开状态转动。 |
| 113 | `SNativeListGroup` | 默认使用紧凑的无框列表。行可带说明、时间、可选分隔线与单选或多选。尾部按钮拥有独立触达区域。可通过插槽组合 `SNativeListItem`。 |
| 114 | `SNativeTabs` | 以 `v-model` 管理选项，支持横向与纵向布局、可滚动选项栏、色块与线条两种标记。切换选项时同一标记按实际位置和尺寸移动。可配置延迟挂载及保留已访问的面板。 |
| 115 | `SNativeTagGroup` | 通过 `v-model:items` 和 `v-model:selected` 管理标签，支持单选、多选和移除。移除时标签先收拢，随后将焦点移至相邻可用项。 |
| 116 | `SNativeChip` | 行内状态标签，支持三种尺寸、柔色底、实色底和描边。起始及末尾的插槽与文字共享颜色参数。 |
| 117 | `SNativeSkeleton` | 支持圆形、圆角和胶囊占位，支持扫光、呼吸或静态效果。加载期间保留真实内容的布局空间。 |
| 118 | `SNativeSkeletonGroup` | 同组占位共用加载状态和动画时钟，可用插槽组合行、头像和文字。减少动效时显示静态占位。 |
| 119 | `SNativeAvatar` | 接受原生 `ImageSource`、资源路径、数据 URI 和远程图片。图片加载完成后进入原有边界，加载失败时保留姓名缩写。 |
| 120 | `SNativeScrollShadow` | 在横向或纵向滚动区的可滚动边缘显示渐变。到顶、到底或内容容纳得下时，相应提示强度归零。嵌入色块时可用 `color` 对齐底色。 |

```vue
<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeTabs, SNativeText } from '@syntrofic/ui-native'

const section = ref('summary')
const sections = [
  { id: 'summary', label: '概览', description: '品牌资源库' },
  { id: 'files', label: '文件', description: '标识和配色规范' },
]
</script>

<template>
  <SNativeTabs v-model="section" :items="sections" label="项目信息" scrollable>
    <template #default="{ item }">
      <SNativeText :text="item.description" />
    </template>
  </SNativeTabs>
</template>
```

`pnpm check:native` 验证禁用选项回退、移除标签后的焦点目标、滚动端点计算，以及独立安装后的 iOS 和 Android 脚本构建。设备验收时逐项核对实际触摸与滚动、快速切换、读屏顺序、长文本换行和减少动效，再把截图补到对应编号。滚动手势和边缘提示还需覆盖 RTL 布局。[HeroUI Native 组件目录](https://heroui.com/en/docs/native/components)
