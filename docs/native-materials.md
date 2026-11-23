# Native 材质与背景

| 编号 | 入口 | 验收场景 |
| --- | --- | --- |
| 129 | `@syntrofic/ui-native/glass-view` | 常规及通透系统玻璃、原生模糊、模拟实色降级、对话框模糊遮罩。 |
| 130 | `@syntrofic/ui-native/theme-background` | 切换主题背景，验证卡片尺寸、内容状态和其子树的自定义实色背景。 |

`SNativeGlassView` 在 iOS 26 及以上通过 UIKit 显示 Liquid Glass。启用 `effect="blur"` 时使用 UIKit 模糊材质。Android、系统开启降低透明度或设备缺少所选能力时，用当前主题色或指定 `fallbackColor` 填充同一位置。背景层的可访问性与触摸均由前景控件负责，背景切换不占用额外空间。[UIKit Liquid Glass](https://developer.apple.com/documentation/uikit/uiglasseffect) · [UIKit 模糊视图](https://developer.apple.com/documentation/uikit/uivisualeffectview)

`SNativeProvider` 的 `material` 默认为 `solid`。子树显式启用 `glass` 后，`SNativeSurface` 和 `SNativeCard` 使用主题背景。它们也接受 `#background`，按钮可通过同名插槽显式使用自定义背景。直接使用 `SNativeThemeBackground` 时可用 `always` 为实色主题提供背景，或通过插槽使用主题给出的 `material`、`color`、`radius`。[上游可替换背景能力](https://heroui.com/en/docs/native/releases/v1-0-7)

```vue
<script setup lang="ts">
import { SNativeButton } from '@syntrofic/ui-native'
import SNativeThemeBackground from '@syntrofic/ui-native/theme-background'
</script>

<template>
  <SNativeButton label="预览交付" variant="secondary">
    <template #background="{ radius, color }">
      <SNativeThemeBackground :radius="radius" :fallbackColor="color" always />
    </template>
  </SNativeButton>
</template>
```

对话框的 `backdrop="blur"` 使用同一模糊实现。实色调暗层在 Android 和降低透明度时提供回退。底部面板的原生背景继续按平台呈现。独立安装验证覆盖两个入口、能力判断和 iOS 与 Android 脚本构建。系统材质及明暗外观需要在设备上验收，截图按 129 和 130 补入思源。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)
