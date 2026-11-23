# Web 浮层与反馈

工作台编号为 069–079。截图包含抽屉边位、面板吸附和嵌套、轻提示队列、横纵滑块以及不确定进度。[组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 入口 | 接入方式 |
| --- | --- | --- |
| 069 | `SDrawer` | `side` 支持四个屏幕边缘和随阅读方向定位的 `start`、`end`。默认从 `end` 打开。用 `extent` 设置宽度，可提供像素数或 `%`、`rem` 等长度。正文单独滚动，`header-start` 和 `header-end` 可放置标题两侧的内容。 |
| 070 | `SSheet` | 支持 `height`、`detached`、吸附档位、可选顺序换档和 `v-model:snap-point`。可在父面板内打开子面板，底部位置跟随键盘改变后的可视视口。 |
| 071 | `SToast` 与 `SToastProvider` | 管理多条通知和逾时、撤销操作、关闭、指针滑动、键盘访问、六种位置以及 Promise 状态。 |
| 072 | `SSlider` | 数字绑定单滑块，数组绑定范围。支持横纵方向、RTL、步进、刻度和独立标记。`status` 关联校验说明，错误状态会标记滑块无效。提交最终值时触发 `commit`。 |
| 073 | `SMeter` | 表示存储或容量读数，公开 `meter` 语义。使用 `min`、`max` 和 `formatOptions` 定义范围与读数格式。 |
| 074 | `SProgressBar` | 带进度条语义的线性进度。未传有效数值或开启 `indeterminate` 时显示不确定态。`formatValue(value, max, min)` 同时格式化可见数值和读屏文案。 |
| 075 | `SProgressCircle` | 环形进度，支持尺寸、环宽、色调、内部数值和不确定态。 |
| 076 | `SAvatarGroup` | 支持重叠和网格排布，用 `max` 限制可见数量，`total` 表示已知总数，溢出提示提供可访问文字。可用插槽定制头像与计数。 |
| 077 | `SKbd` | 单个键或组合键使用原生 `kbd` 语义。可用命名键、文字或自定的可访问标签。 |
| 078 | `STypography` | 支持六级标题、正文、导语、小字、代码和富文本。通过 `as` 选择语义元素，通过 `variant` 选择排版规格。 |
| 079 | `SScrollShadow` | 在纵向、横向或双向可滚动区域标示还有内容的边缘。可设置提示厚度、滚动偏移和需要显示的边缘，内容或视口变化时重新计算。 |

滑出面板以所在方向的可用视口为尺寸基准。吸附档位支持比例、像素数，以及带有 `%`、`px` 或 `rem` 的长度字符串。`snapPoint` 为 `null` 时展开至当前大小档位允许的最大范围。用手柄点按可循环换档，方向键可切换相邻档位，Home 与 End 到达首尾。嵌套面板关闭后焦点回到父面板的触发按钮。

SSheet 的 `height="hug"` 按内容确定高度，`capped` 限制在可用高度的六成，`tall` 使用全部可用高度。也可传入具体长度。使用 `height` 和吸附档位时，若最低档不超过完全展开高度的四分之一，收起时会保留上一档的内容布局，将面板滑至低位并减淡遮罩。使用 `:modal="false"` 可打开并列操作的无罩面板。

SDrawer、SSheet 和 SDialog 的 `purpose` 可设为 `info`、`form` 或 `required`。表单默认保留 Escape 关闭，并保护正在编辑的内容免受遮罩点击和向外拖拽干扰。必读确认由应用提供明确的完成操作。可按场景覆盖 `closeOnBackdrop`、`closeOnEscape` 和面板的拖拽关闭行为。

SDialog 的 `variant="fullscreen"` 让对话框覆盖视口。标准对话框可用 `width` 和 `maxHeight` 设置尺寸，超出高度时只滚动正文。SAdaptiveDialog 公用内容和页脚插槽，默认居中，`touchPresentation` 可为宽度不超过 1024 像素的粗指针、无悬停设备指定全屏或底部面板，`presentation` 可覆盖媒体条件。一次打开期间保留原有展示和表单焦点。

轻提示队列可以用 `createToastQueue()` 创建，传给 `SToastProvider` 的 `queue`。组件树内也可以用 `useToastQueue()` 取得最近的队列。用 `add`、`update`、`close` 或 `promise` 操作。`useToast` 可为相同的 `uniqueID` 选择覆盖或忽略，`endContent` 支持按钮或链接，返回的函数可关闭提示。普通提示默认五秒后关闭，错误提示保留至手动关闭。悬停、通知区内聚焦、窗口失焦期间暂停计时。超出可见上限的提示在重新显示时开始计时。可通过 F8 或自行设置的快捷键将焦点移到通知区。

```vue
<script setup lang="ts">
import { SButton, SToastProvider, createToastQueue } from '@syntrofic/ui'
import '@syntrofic/ui/style.css'

const queue = createToastQueue()
</script>

<template>
  <SToastProvider :queue="queue" placement="bottom-end" dismiss-label="关闭提示">
    <SButton @click="queue.add({ title: '已保存', status: 'success' })">保存</SButton>
  </SToastProvider>
</template>
```

滑块拖拽时直接跟随指针，键盘调整时用非线性过渡。进度条从当前绘制位置缓动到新目标，等待与确定进度在原轨道内交叉淡入淡出。度量和进度的数字逐位更新。减少动态效果模式使用原位淡化和提示脉冲，并保留数值、轨道、键盘焦点和操作反馈。
