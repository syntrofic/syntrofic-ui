# Web 基础组件

工作台的「组件验收」提供独立示例。每个示例通过 `?component=W.<id>` 定位，完整 ID 和组件出口见 [实现清单](../catalog/implementation.json)。

## 默认视觉与动效

浅色模式使用白色页面底色。中性表面、灰绿选中状态、灰蓝列表和灰紫设置区用色块分组。轮廓保留给键盘焦点、错误和需要明确边界的控件。按钮默认使用全圆角，输入框默认使用 9 px 圆角。代码块默认使用 14 px 圆角，代码栏的复制按钮使用 12 px。可分别用 `--sy-button-radius`、`--sy-radius-field` 和 `--sy-radius-code` 调整，代码栏复制按钮随代码块圆角变化。

英文优先使用 Arial，再回退到包内的 Arimo。中文优先使用微软雅黑，再回退到包内的思源黑体 SC。加载按钮保留外框尺寸，文字让位与指示器出入场用非线性过渡。数值逐位更新，日期和时间的分隔符贴近相邻数字。窄屏下，内容列按空间自动换行。响应系统减少动态效果设置。

`STabs` 切换不同高度的面板时，选项卡栏保持原位，下方内容随高度缓动。连续切换从当前显示的高度接续。组件与页面共用同一套切换验收要求。[切换稳定性](web-standard-design.md#切换稳定性)

## 接入方式

| 用途 | 组件 | 接入方式 |
| --- | --- | --- |
| 操作 | SButton、SButtonGroup、SCloseButton | 按钮使用原生 `type` 和 `disabled`。按钮组提供 `size`、`variant` 和 `disabled` 的默认值。加载时焦点保留在按钮上，事件会被拦截直到加载结束。 |
| 文本字段 | SInput、STextArea、STextField、SInputGroup、SLabel、SDescription、SFieldError | 输入使用 `v-model`，原生 `name`、`autocomplete`、`pattern` 和 `form` 转发给控件。STextField 可接收标题、说明和错误的属性或插槽，并为内嵌输入控件建立关联。SInputGroup 的 `start` 与 `end` 插槽承载前缀和动作。STextArea 支持 `autoGrow`、`rows` 和 `maxRows`。 |
| 表单 | SForm、SFieldset、SErrorMessage | SForm 的 `submit` 事件提供原始事件与原生 FormData，`native` 启用浏览器提交。重置恢复控件挂载时的值。SFieldset 提供原生分组及整体禁用。用 `announce` 让 SErrorMessage 播报动态错误。 |
| 选择控件 | SCheckbox、SCheckboxGroup、SRadio、SRadioGroup、SSwitch、SSwitchGroup | 单个复选框和开关使用布尔 `v-model`。多选组使用字符串数组，单选组使用单个字符串。组内每个成员设置唯一的 `value`。有 `name` 的组通过原生表单提交。 |
| 浮层和导航 | SDialog、STooltip、STabs、SSelect | Dialog 和 Tooltip 支持 `v-model:open`。Tooltip 的 `trigger` 插槽接收一个可聚焦元素，提示内容通过 `text` 或默认插槽提供。Tabs 支持方向、手动激活和懒挂载，通过 `panel` 插槽接收当前面板条目。Select 的 `multiple` 使用数组，`clearable` 保留清除按钮的空间。 |
| 展示 | SCard、SSurface、SBadge、SChip、SSeparator | 卡片有 `header`、默认和 `footer` 插槽。Surface 的 `tone` 控制表面颜色。Chip 的 `remove` 事件由调用方处理。纯装饰分隔线设置 `decorative`。 |
| 反馈 | SAlert、SSkeleton、SSpinner | Alert 可用 `announcement` 设置播报级别，操作通过 `actions` 插槽提供。Skeleton 保留内容占位，加载期间子内容不可操作。Spinner 支持 `size` 和 `label`，纯装饰用 `decorative`。 |
| 表格 | STable | 使用稳定的 `rowKey`，支持排序、分页、跨页勾选和 `cell` 插槽。用 `:virtual="{ height: 310, estimatedRowHeight: 39, minWidth: 415 }"` 挂载可见行及邻近行。行高变化会重新测量，正在使用的单元格保持挂载。 |

## 按钮、图标操作与按钮组

`SButton` 的 `start` 和 `end` 插槽可放置前导图标和末尾徽标。用 `icon-only` 呈现方形图标按钮，默认插槽中的文字仍作为可访问名称。`elevation` 支持 `none`、`low`、`med` 和 `high`。`SButtonGroup` 可用 `joined` 将按钮连接成一个操作面，浮起深度由按钮组设置。

将返回 Promise 的操作传给 `:click-action`，按钮会在等待期间显示加载状态并保留焦点。`interruptible` 允许再次点击并中止上一次操作。回调的第二个参数是 `AbortSignal`，可传给 `fetch` 等支持取消的操作。未取消的失败通过 `@action-error` 报告。

## 复选框、开关与单选

`SCheckbox`、`SSwitch` 和 `SRadio` 支持 `label`、`description` 与 `status`。先用 `description` 说明选项的作用，再用 `status` 显示错误、警告或成功。错误状态会阻止原生表单提交。`start` 和 `end` 插槽可以放置图标、价格与徽标，控件的可访问名称由标签提供。

用 `indeterminate` 表达组内只选中一部分的状态。`SCheckbox` 的勾和半选横线在标记框内居中，切换状态时保持标记框尺寸。`SCheckboxGroup` 的 `v-model` 是被选条目的值数组，全选时可一次更新这个数组。`SRadioGroup` 使用单个值，支持横向排列，以及由 `required` 和 `required-message` 控制的原生表单校验。

`SSwitch` 可用 `label-position` 和 `label-spacing` 排列开关及文字。`disabled-message` 会为禁用控件保留键盘焦点，以便读取禁用原因。`change-action` 在保存时保持本次选中状态并显示加载动画。多选组传入 `change-action` 时，只有刚刚变化的选项进入加载状态。

## 文本、数字、日期与文件输入

`SInput` 和 `STextArea` 可设置 `size`、`start-icon`、`label-tooltip` 和 `status-variant`。`hide-label` 隐藏视觉标签并保留可访问名称。`SInput` 的 `clearable` 清空内容后保留输入焦点。`change-action` 期间输入仍可编辑，后续输入会通过 `AbortSignal` 取消上一项操作。处理当前操作的失败可监听 `@action-error`。

`STextArea` 的 `max-length` 按可见字符显示字数提示，超过后仍可输入。`html-max-length` 使用浏览器的 UTF-16 长度上限。可用 `characterCount` 获取与计数器一致的字数。`auto-grow` 可搭配 `rows` 和 `max-rows`，高度随内容平滑调整。

`SNumberField` 支持 `min`、`max`、`step`、`integer-only`、`units` 和 `format-value`。回车或失焦时提交可解析的数字。无法提交的草稿仍可编辑，使用 `@entry-error-change` 可读取失败原因。`SDatePicker` 的 `format` 支持 `date`、`date_long`、`date_weekday`、`system_date` 和自定义函数。聚焦日期字段时会显示可逐段编辑的输入控件，清除后焦点回到首段。

`SFileInput` 使用 `accept` 和 `max-size` 限制文件类型和字节数。单文件模式用有效的新选择替换当前文件，启用 `multiple` 后可使用 `max-files` 限制数量。文件可通过选择按钮或拖放添加。

`SInputGroup` 的 `label` 标记整组，`description` 会关联组内的输入控件。把 `SInputGroupText` 放入 `start` 或 `end` 插槽显示货币、单位或网址片段。组内输入可用 `hide-label` 保留自己的可访问名称。

`STimeField` 使用 `hour-cycle` 和 `granularity` 控制时间格式，`step` 控制各段的键盘步进。`presentation="adaptive-native"` 在触屏上使用浏览器的时间选择器。越界的时刻会显示校验反馈，可在原处继续修改。`SDateTimeInput` 的日历和时刻编辑器共用一个日期时间值，默认在细指针设备上使用浮层，在粗指针设备上使用含日期和时刻选项卡的底部面板。

`SDateRangePicker` 的 `presentation="button"` 使用单按钮打开日历。通过 `presets` 提供 `id`、`label` 和 `getRange`，打开时计算日期范围，超出当前约束的预设不可选。`number-of-months` 控制并排显示的月份数。

## 日历、计时器与时间戳

`SCalendar` 与 `SRangeCalendar` 可通过 `min-value`、`max-value` 和日期判断函数配置可选范围。双月范围视图可以保留跨月高亮。自定义日历可用 `useCalendarDays` 生成星期和日期网格，用 `useCalendarConstraints` 判断可选日期，并在 `useCalendarNavigation` 更新 `pendingFocus` 后把键盘焦点移到新月份的目标格。

`STimer` 的 `start-time` 使用 Unix 毫秒，省略时从组件挂载开始。`format="clock"` 精确到秒，`format="elapsed"` 在满一小时后显示小时和分钟。用 `type="inherit"` 和 `color="inherit"` 将计时器嵌在正文中。

`STimestamp` 的数值使用 Unix 秒，也接受 ISO 字符串或 `Date`。`format="auto"` 根据 `auto-threshold` 在相对时间和绝对时间之间切换。`show-time-zone` 在面向读者的时刻格式中附上时区。通过 `tooltip-entries` 可以并排查看其他时区，并为指定行启用复制。

## 表格样式、筛选与批量操作

`STable` 支持 `striped`、`highlight-on-hover` 和 `dividers`。`density="compact"` 可配合 `dividers="grid"` 显示紧凑网格。`column-header` 和 `cell` 插槽可组合复选框、头像、链接与状态标记。

通过 `useTableFiltering` 创建列筛选控件，使用同一份筛选状态在 `popover` 和 `inline` 之间切换。`useTableSortableState` 可把排序状态与外部读数同步。行列虚拟化适用于容器尺寸受限的长表格，固定列可通过 `useTableStickyColumns` 配置。

将 `useTableSelectionState` 返回的 `selectionState` 传给 `STableSelectionToolbar`，以同步跨页计数和清除全部选择。操作可由 `actions` 提供，也可通过插槽组合。操作条的流式摆放和悬浮位置由外层布局控制。

## 卡片与横幅

`SCard`、`SClickableCard` 和 `SSelectableCard` 共享 `variant`、`elevation`、`padding` 和尺寸属性。数值宽高使用像素，内边距数值使用间距刻度。卡片允许在窄布局内收缩。可选卡片保留选中边框和浮起阴影，也可通过 `name` 和 `value` 参与表单提交和重置。

`SBanner` 的 `variant="section"` 适用于通栏，`elevation` 设置浮起层级。`actions` 插槽可以放链接或按钮。`v-model:expanded` 管理详情区域，`:collapsible="false"` 可让详情保持显示。`dismissible` 启用关闭按钮，`v-model:open` 管理关闭后是否恢复横幅。

## 文本与截断

`SText` 通过 `type` 区分正文、标签、辅助文本和代码。文本样式可以和标题的 `accessibility-level` 分开设置。`max-lines` 定义截断行数，`word-break` 和 `text-wrap` 调整换行。`useTruncationState` 接收目标元素并返回响应式的 `isTruncated` 和 `fullText`，可为自定义表格单元格显示完整路径。

## 头像、成员组与缩略图

`SAvatar` 依次尝试主图、`fallback-src`、姓名缩写和默认人物图标。使用 `alt=""` 将头像标为装饰。默认提示显示姓名，`tooltip` 接受自定义文本或 `false`。通过 `href` 打开资料页，或使用 `actionable` 和 `activate` 执行操作。用 `status-label` 为内置状态提供可访问的名称。通过插槽嵌入的 `SAvatarStatusDot` 会将自己的 `label` 补充到头像名称中。

`SAvatarGroup` 用 `max` 控制展示数量，`total` 可填入服务端返回的完整人数。带个人链接或操作的组只占一个 Tab 停靠点，用方向键切换成员。设置 `overflow-interactive` 后，超额计数发出 `overflow` 事件。可用 `count` 插槽调整计数文案。

`SThumbnail` 用 `loading` 展示图片上的上传进度或空框中的骨架屏。移除按钮可根据图片角落亮度调整配色，`remove-tone` 可显式指定方案。设置 `disabled` 后，打开和移除操作保留键盘焦点并标记为不可用。

`SStatusDot` 支持五种语义状态。与状态文本并列时可省略 `label`。独立使用时通过 `label` 描述状态，用 `pulse` 强调需要留意的变化。系统启用减少动态效果时，圆点维持静态。

## 交互验收

组件示例同时用于 320 px 宽度的加载检查。自动化用例覆盖原生表单校验与重置、单选与多选提交、Tabs 手动激活、Tooltip 键盘关闭、加载时的按钮尺寸、跨字段焦点、批量归档和恢复，以及 2,000 行虚拟表格的编辑、焦点和选中状态。
