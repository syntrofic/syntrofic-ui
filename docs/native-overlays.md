# Native 浮层与通知

编号 122–128 对应原生应用的验收页面。[Native 安装与预览](native-foundation.md) · [思源组件截图与验收](https://kb.syntrofic.com/?id=20261120170405-zcmv5nc)

| 编号 | 组件 | 验收场景 |
| --- | --- | --- |
| 122 | `SNativeDialog` | 用紧凑的归档确认演示两个打开入口、取消、确认过程中的加载态和按入口恢复焦点。用名称编辑演示关闭按钮、初始输入焦点和键盘下的布局。 |
| 123 | `SNativeToastProvider`、`SNativeToast` | 连续发送四条通知，最多同时显示两条，退出后补位。核对顶部提醒、持久通知、撤销操作和一键清除。可从对话框内触发通知。 |
| 124 | `SNativeBottomSheet` | 在交付素材中切换预览高度、半屏和展开三档，滚动正文并核对固定操作区。在上层说明面板测试键盘与堆栈返回。 |
| 125 | `SNativePopover` | 从屏幕右侧触发气泡，核对左右翻转、点按外部关闭和焦点恢复。用原生底部面板打开同类内容。 |
| 126 | `SNativeMenu` | 检查普通动作、危险动作、长按入口、不可用项、组选中指示和子菜单返回。 |
| 127 | `SNativeSelect` | 检查分组单选、清除、占位文字、底部面板多选、禁用和完成操作。 |
| 128 | `@syntrofic/ui-native/sub-menu` | 从独立入口导入并叠加在气泡上。关闭子菜单后，焦点返回父气泡的按钮。 |

## 对话框

`v-model:open` 管理打开状态。`triggerLabel` 提供默认入口，自定义入口可以使用 `#trigger`，也可以调用组件的 `show(returnFocus)`。内容和底部操作插槽接收 `close(reason)`，`closed` 在原生窗口关闭后返回原因。

对话框用原生模态窗口阻断背景交互。正文支持滚动，标题和底部操作保留在各自的布局行。入场时面板轻微收拢并显现，关闭时先过渡再释放原生窗口。打开后可用 `initialFocus` 选定初始焦点，关闭后恢复触发入口。点按外部、Android 返回键和从标题区向下拖动均可独立配置。

```vue
<SNativeDialog triggerLabel="归档项目" title="归档项目？" description="归档后可恢复。">
  <template #footer="{ close }">
    <SNativeButton label="取消" variant="secondary" size="sm" @tap="close('cancel')" />
    <SNativeButton label="确认归档" variant="danger" size="sm" @tap="close('confirm')" />
  </template>
</SNativeDialog>
```

## 通知

用 `SNativeToastProvider` 包裹页面区域，从默认插槽或子组件的 `useNativeToast()` 取得管理器。传入字符串显示简短通知，也可传配置指定标题、说明、级别、位置、操作和持续时间。`render` 可渲染自定义内容，重复使用同一 `id` 会返回已有通知的编号。

通知按提交顺序排队。计时从入场结束后开始，处理动作、内容受触摸、读屏焦点停留及应用进入后台时暂停。处于退场的通知仍占用名额，退场结束再显示队首。设置 `duration: 'persistent'` 可以让通知等待手动关闭。库内对话框开启时，通知区域切换到当前模态窗口。

```ts
const { toast } = useNativeToast()
toast.show({
  label: '项目已归档',
  duration: 'persistent',
  actionLabel: '撤销',
  onAction({ dismiss }) {
    restoreProject()
    dismiss()
  },
})
```

`pnpm check:native` 覆盖队列容量、重复编号、后台与触摸同时暂停、剩余时间恢复、退场后补位和清除队列，并在独立安装后构建 iOS 和 Android 示例脚本。设备验收仍需核对键盘、系统返回、拖动、读屏、原生窗口背景以及从对话框触发通知，再补截图。对话框默认使用实色调暗遮罩，可选择 iOS 系统模糊。[Native 材质与背景](native-materials.md) · [HeroUI Native Dialog](https://heroui.com/en/docs/native/components/dialog) · [HeroUI Native Toast](https://heroui.com/en/docs/native/components/toast)

## 底部面板

`SNativeBottomSheet` 通过 NativeScript 插件接入 UIKit 的 `UISheetPresentationController` 和 Android 的 Material 底部面板。默认按正文与头尾内容计算高度。`detents` 从小到大传入最多三个停靠位，`'peek'` 按固定头尾计算，`'auto'` 按内容计算，数字表示可用高度的比例。标题与操作区各占独立布局行，长正文由中间的原生滚动区承载。[HeroUI Native BottomSheet](https://heroui.com/en/docs/native/components/bottom-sheet) · [NativeScript 底部面板插件](https://github.com/nativescript-community/ui-native-components)

`v-model:open` 管理打开状态，`v-model:detent` 管理停靠索引。组件引用提供 `present(index, returnFocus)`、`resize(index)`、`dismiss(reason)` 和 `dismissStack()`。设置 `name` 后可通过 `getNativeBottomSheet(name)` 从另一个入口取得同一组方法。

```vue
<SNativeBottomSheet title="交付素材" triggerLabel="选择素材" :detents="['peek', 0.48, 0.86]">
  <SNativeListGroup :items="assets" separators />
  <template #footer="{ resize, dismiss }">
    <SNativeButton label="展开" size="sm" variant="ghost" @tap="resize(2)" />
    <SNativeButton label="确认" size="sm" @tap="dismiss('confirm')" />
  </template>
</SNativeBottomSheet>
```

自定义停靠位需要 iOS 16 及以上，iOS 15 映射到系统的中型和大型面板。Android 示例使用 Material 3 主题，最低 API 23。构建检查覆盖安装产物中的原生插件、双平台脚本与停靠计算。拖动、系统键盘、安全区、堆栈退场和不同停靠位的截图仍需要在设备上核对。[UIKit 系统面板](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller) · [Android Material 1.14](https://github.com/material-components/material-components-android/releases/tag/1.14.0)

## 气泡、菜单和选择器

`SNativePopover` 支持上下左右四侧、逻辑起点与终点对齐、偏移和边缘留白。宽度可以按触发按钮、内容、可用区或指定值计算。开启避让时，放不下的面板优先向对侧展开，并在可用范围内滚动正文。同一个组件设置 `presentation="bottom-sheet"` 后使用原生底部面板。[HeroUI Native Popover](https://heroui.com/en/docs/native/components/popover)

`SNativeMenu` 可通过 `items` 或 `sections` 提供动作和选择项。选中状态支持单选和多选，分组可以单独指定选择方式。子菜单可用 `children` 在同一面板进入下一层，也可通过独立入口 `@syntrofic/ui-native/sub-menu` 叠加呈现。Android 硬件方向键可移动到下一个可用项，Home 与 End 可到达首尾，Escape 与系统返回可离开。iOS 使用原生可聚焦控件，设备上的硬件键盘和读屏顺序需要复核。[HeroUI Native Menu](https://heroui.com/en/docs/native/components/menu)

`SNativeSelect` 的单选值为条目 ID 或 `null`，多选值使用 ID 数组。清除按钮预留触达区域，选中内容按字过渡。可通过 `formatValue` 自定义简写，通过 `#item` 和 `#value` 自定义条目和当前值。[HeroUI Native Select](https://heroui.com/en/docs/native/components/select)

`pnpm check:native` 覆盖气泡翻转、空间不足时的高度限制、RTL 对齐、禁用项跳过，以及安装后的独立子菜单入口。面板位置、动画和焦点还需要在设备上验收并补截图。
