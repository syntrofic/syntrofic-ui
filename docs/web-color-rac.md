# Web 颜色与 Vue 辅助入口

颜色组件和辅助入口的工作台编号为 080–087。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 入口 | 接入方式 |
| --- | --- | --- |
| 080 | `SColorArea` | 支持 RGB、HSL 和 HSB，可分设两个轴的通道、名称和表单字段。用指针拖动，或聚焦任一轴以方向键操作。 |
| 081 | `SColorField` | `format` 控制文本格式，`channel` 控制单个通道。无效输入会保留原文并阻止提交，成功时以规范 HEX 或 HEXA 提交。 |
| 082 | `SColorPicker` | 内联和锚定浮层两种形态。默认组合调色区、通道滑块、颜色输入和可选色板，支持自定义内容及触发器。 |
| 083 | `SColorSlider` | 支持色相、饱和度、明度、亮度、RGB 通道和透明度，提供横纵方向、步进、可访问标签和键盘操作。 |
| 084 | `SColorSwatch` | 用色块表示实色、半透明、完全透明或空值。支持尺寸、圆形或圆角方形和可访问名称。 |
| 085 | `SColorSwatchPicker` | 可按网格或列表显示预设色样，保留键盘、禁用、选中和色样名称。 |
| 086 | `SColorInputGroup` | 独立输入组，使用 `start` 和 `end` 放置色样、格式或操作。可与 `STextField` 一起提供验证和提示。 |
| 087 | `@syntrofic/ui/rac` | Vue 本地化、集合、虚拟布局、加载、路由、交互和颜色工具的独立入口。 |

接受有或无井号的 HEX、HEXA，RGB、HSL 与 HSB/HSV 函数形式以及 `transparent`。函数形式支持逗号分隔、空格分隔与斜线透明度。绑定字符串时输出规范 HEX 或 HEXA，绑定颜色对象时保留对象形式。同一取色器内先调色相再调整灰色的饱和度时，保留所选色相。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SColorPicker, type ColorValue } from '@syntrofic/ui'
import '@syntrofic/ui/style.css'

const color = ref<ColorValue | null>('#859589')
</script>

<template>
  <SColorPicker v-model="color" label="选择品牌色" locale="zh-CN" />
</template>
```

## Vue 辅助入口

- `I18nProvider` 将语言和方向同步到 DOM 与组件上下文。`isRTL`、`useLocale` 和 `useFilter` 可供业务组件使用。`getLocalizationScript` 生成可放进 HTML 的初始化脚本，`readLocalization` 读取初始化数据，服务端和客户端使用一致的语言参数。
- 将内置 `frFR` 消息包传入 SInternationalizationProvider 的 `messages` 或 I18nProvider 的 `catalogs`，即可为使用消息目录的控件启用法语。`overrides` 可以调整指定语言的消息，例如 `select.placeholder`。单个 SSelect 的 `placeholder` 优先于目录。提供 `as="div"` 时，SInternationalizationProvider 也会将 `lang` 和 `dir` 写到容器。
- 自定义内容可以用 `useLocale` 把当前语言传给 Intl 日期和数字格式器，用 `useCollator` 比较名称。通过 `useTranslator` 读取业务消息，并用命名参数填入数量等数据。
- `Collection` 为业务集合提供键类型和插槽渲染。`Virtualizer` 暴露 TanStack 的 Vue 虚拟化组合式函数。`ListLayout` 封装行项目、滚动元素、测量估算及稳定键。`TableLayout` 使用自有表格布局，需要 `viewport` 和 `header` 的模板引用。
- `ListBoxLoadMoreItem` 可放在列表后，用按钮或可见性监听驱动下一页。请求进行中合并重复触发，传入的函数可用 `AbortSignal` 处理卸载。
- `RouterProvider` 向 `SLink` 提供同站路由，保留外链、下载、原生锚点和带修饰键的浏览器操作。
- `Pressable` 提供按下状态和键盘激活。`Focusable` 暴露原生元素并支持初始聚焦。`useOverlayTriggerState` 和 `useDisclosureState` 可在 `SPopover` 和 `SDisclosure` 内读写开关状态。
- `parseColor`、`formatColor` 供业务校验、格式转换与服务端打印。 `@syntrofic/ui/color-input-group` 提供独立的默认导出，与包根的命名导出指向同一组件。
