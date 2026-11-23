# Native 表单与选择控件

编号 103–111 和 121 对应原生示例应用的导航项。组件沿用 NativeScript-Vue、共享主题与动效参数。[Native 安装与预览](native-foundation.md) · [思源组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 入口 | 接入和评审场景 |
| --- | --- | --- |
| 103 | `SNativeInputGroup` | 用 `prefix`、`suffix` 放行内前后缀或动作。默认输入可直接使用 `v-model`。放在 `SNativeFocusGroup` 中时，焦点框按整组边界移动。 |
| 104 | `SNativeSearchField` | 键盘搜索发出 `search`，清除发出 `clear` 并把焦点交还输入。清除按钮沿用固定宽度，内容改变时只过渡按钮本身。 |
| 105 | `SNativeInputOTP` | 用一个原生字段接收输入、粘贴、软键盘和验证码填充。支持数字和字母数字、长度、分组及掩码。保留前导零，将全角和其他十进制数字统一转为 ASCII，输入完整时发出 `complete`。 |
| 106 | `SNativeTextArea` | 使用原生多行输入，支持固定行高或自增长范围、字符上限、只读和禁用。 |
| 107 | `SNativeCheckbox` | `v-model` 支持 `true`、`false`、`mixed`。激活半选项会进入选中态，指示符在原有空间内过渡。 |
| 108 | `SNativeSwitch` | 布尔开关，可附说明，控制区保持同一触达范围，滑块在内部移动。 |
| 109 | `SNativeControlField` | 将整行设为一个原生按钮目标，按复选框、开关或单选项播报。提供标签、说明和指示器插槽，以及错误提示。 |
| 110 | `SNativeRadioGroup` | 单选组接受 `items` 或插槽里的单选组件，并提供禁用、只读、必填和 `check()`。支持横排和纵排。 |
| 111 | `@syntrofic/ui-native/radio` | 直接导入单选项，在组内以 `optionValue` 参与互斥选择，独立使用时通过布尔 `v-model` 管理状态。 |
| 121 | `SNativeSlider` | 数值 `v-model` 用于单滑块，数组用于范围和多滑块。支持小数步长、最短间隔、轨道点按、横竖方向、反向、刻度和标记。读数沿用逐字动效。 |

```vue
<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeRadioGroup } from '@syntrofic/ui-native'
import SNativeRadio from '@syntrofic/ui-native/radio'

const format = ref('design')
</script>

<template>
  <SNativeRadioGroup v-model="format" label="交付包" orientation="horizontal">
    <SNativeRadio optionValue="design" label="设计" />
    <SNativeRadio optionValue="source" label="源文件" />
  </SNativeRadioGroup>
</template>
```

`pnpm check:native` 验证验证码字符归一化、选择状态、独立单选入口的类型声明，以及安装后的 iOS 和 Android 示例脚本构建。设备验收仍需核对实际粘贴与验证码填充、输入法和文本增长、硬件焦点、VoiceOver 与 TalkBack，再按原编号追加截图。[HeroUI Native InputOTP](https://heroui.com/en/docs/native/components/input-otp) · [HeroUI Native InputGroup](https://heroui.com/en/docs/native/components/input-group) · [HeroUI Native ControlField](https://heroui.com/en/docs/native/components/control-field)

滑块通过 `change` 连续发送调整值，拖拽、点按或系统调节完成后发送 `commit`。设置 `thumbLabels` 可以分别命名范围两端，`locale` 和 `formatOptions` 控制读数格式。每个滑块由原生可调控件接入系统操作。状态测试覆盖非整步长端点、重合滑块、最短间隔和空值回退。模拟器或设备需要核对语音调节、硬件键盘以及滑块与外层滚动之间的手势交接。[HeroUI Native Slider](https://heroui.com/en/docs/native/components/slider)
