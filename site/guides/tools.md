## 创建项目

安装 `@syntrofic/ui` 后可通过 `pnpm exec syntrofic` 调用 CLI。用 `--source` 指定团队包仓库中的版本或本地包文件。

```sh
pnpm exec syntrofic init vue --out ./web
pnpm exec syntrofic init nuxt --out ./nuxt
pnpm exec syntrofic init --native --out ./native
pnpm exec syntrofic doctor --native --out ./native
pnpm exec syntrofic template list
pnpm exec syntrofic template dashboard-progress --skeleton
pnpm exec syntrofic template payment-form ./src/pages/Payment.vue
pnpm exec syntrofic template --cdn ./demo.html
pnpm exec syntrofic template add incident-console --out ./incident-app
pnpm exec syntrofic build 'dashboard progress' --json
pnpm exec syntrofic build "交付轨迹 仪表盘" --dry-run
```

只传模板名会输出 Vue 源码。传入 `--skeleton` 可查看组件层级和布局属性。指定页面文件或目录时，模板会连同其引用的局部组件和资源一起生成。

在已有项目中运行 `syntrofic init` 可同步项目内的工具说明。`--features theme,template` 会生成主题描述并列出模板命令。`--all` 同时开启这三项，`--remove` 移除工具生成的说明区块。用 `--agent-docs-path docs/ui.md` 指定项目内的说明文件，或用 `--to skills` 安装到项目的技能目录。`--to ./review --once` 可生成一份独立的工作说明。

`build` 提供页面构建指引，传入描述会推荐起始页面以及相关模板、片段、组件和组合函数。使用 `--out` 指定生成位置，或用 `--dry-run` 预览文件清单。`template --list --type block` 可浏览可复用片段。

官网的[可复用片段](/templates/blocks/)可以按场景查找现有组件示例。配送地址、优惠码和演示付款方式也可以分别用 `template add --type block` 生成独立的 Vue 示例。

`--cdn` 会生成一份可直接用浏览器打开的 HTML。页面内嵌 Syntrofic 样式，从 CDN 加载 Vue。

## 查找组件和参考资料

```sh
pnpm exec syntrofic search chart --json
pnpm exec syntrofic search dashboard progress --type template --limit 5
pnpm exec syntrofic discover @syntrofic/ui/SButton --json
pnpm exec syntrofic discover --type component --installed
pnpm exec syntrofic component --category Buttons
pnpm exec syntrofic component SButton SBadge --props --json
pnpm exec syntrofic component @syntrofic/ui/SButton --source
pnpm exec syntrofic hook useAnimatedLayout --params
pnpm exec syntrofic manifest --json
pnpm exec syntrofic info NP.bar-chart
pnpm exec syntrofic coverage motion --json
pnpm exec syntrofic gap-report --list-categories
pnpm exec syntrofic gap-report SButton --category missing_variant --reason '需要更紧凑的按钮' --dry-run
pnpm exec syntrofic docs export --out ./reference
pnpm exec syntrofic docs standard-design --index
pnpm exec syntrofic docs cli --depth 2 --detail compact
pnpm exec syntrofic doctor --built dist
```

`search` 会对组件、组合函数、文档、模板和主题排序，每条结果附带查看命令。`discover` 可按安装状态和贡献类型筛选。已安装的集成从包内读取 `syntrofic.integration.json`。项目还可用 `syntrofic.discover.json` 声明可用的包、版本和贡献项。

`component` 按输入顺序解析一项或多项组件，可查看 props、源码、生成的 Vue 用法和插槽。使用 `@syntrofic/ui/组件名` 可查看内置组件，即使项目安装了对应的替代项。

`doctor` 会读取应用依赖、主题与图标注册表和项目说明，并提示可能缺少动作绑定的按钮。传入 `--built` 可一并检查构建结果，`--strict` 将警告计入失败条件。

差距报告按组件归属选择接收方。用 `--dry-run` 查看草稿和接收地址。项目可在 `syntrofic.gap-report.json` 配置处理模块，集成包可在贡献清单里提供 `gapReportHandlers`。公开发送需要同时明确提供 `--confirm-public`。

## 在项目中管理主题

```sh
pnpm exec syntrofic theme list --json
pnpm exec syntrofic theme add studio --preset stone
pnpm exec syntrofic theme use studio
pnpm exec syntrofic theme build studio ./branding
pnpm exec syntrofic theme build studio ./branding --check
pnpm exec syntrofic theme targets button
pnpm exec syntrofic theme palette generate '#425849'
pnpm exec syntrofic theme palette generate ./branding/palette.json --out ./branding/palette.ts --preview ./branding/palette.html
```

主题列表保存在项目中的 `syntrofic.themes.json`。构建导出 Web CSS、Native Token 和主题清单。在应用里加载 `branding/theme.css`，并在局部容器设置 `data-sy-brand="studio"` 和 `data-sy-theme="light"`。使用 `theme add --source` 可从已有主题清单创建本地版本。

构建同时导出 ESM 和 TypeScript 声明。`--check` 比对源码与生成文件，有差异时返回非零状态。可将多套主题合到一个 CSS 中，通过属性切换，例如 `theme build neutral,stone ./branding --family --family-key day-family`。配色生成器支持自定义色阶位置，保留指定锚点，并可导出独立打开的 HTML 预览。

`theme build ./themes/studio.ts --watch` 会监听主题描述和它读取的本地静态导入。编辑时若遇到暂时无效的内容，预览可继续使用上次成功编译的文件。用 `--icons-specifier ./icons.mjs` 可以让生成的 ESM 同时导出 `icons`，路径相对于该 ESM。可用 `theme add ./themes/studio.mjs` 把已编译主题加入项目注册表。

`theme add` 也可读取含 `manifest.json` 的主题文件夹，或读取本地和 HTTPS 上的 `.tgz` 主题包。CLI 只解析包中的主题数据，再通过本项目的主题注册表应用它。

派生主题可用 `extends: './base.ts'` 继承本地调色、组件样式和动效设置，只声明要改动的值。把一组相连的描述文件传给 `theme build --family --family-key studio-family`，可生成共用的 CSS 和主题模块。

在 Vue 应用中也可以使用 `defineBrandTheme({ id: 'studio', base: 'stone', radius: 12 })`，并把返回的主题交给 `SBrandTheme`。编译器支持读取这种静态声明，包括从本地导入的基础主题。

```sh
pnpm exec syntrofic experimental theme editor set studio accent '#447854' --mode light
pnpm exec syntrofic experimental theme editor set studio border-radius 12px --on card
pnpm exec syntrofic experimental theme editor set studio background '#253d60' --on button --when variant:secondary --mode dark
pnpm exec syntrofic experimental theme editor set studio background-color '#e2dfee' --on button --when variant:ghost+size:sm --state hover --mode light
pnpm exec syntrofic experimental theme editor set studio --sy-accent-hover '#344d64' --on button --when variant:primary --state hover --mode light
pnpm exec syntrofic experimental theme editor set studio --sy-text-muted '#624d73' --on input-group --mode light
pnpm exec syntrofic experimental theme editor set studio border '1px solid #aab4a5' --on inputs
pnpm exec syntrofic experimental theme editor set studio height 48px --on controls
pnpm exec syntrofic experimental theme editor set studio height 56px --on select --only
pnpm exec syntrofic experimental theme editor set studio padding '24px 20px' --on select --only
pnpm exec syntrofic experimental theme editor set studio padding-top 24px --on file-input --when mode:dropzone
pnpm exec syntrofic experimental theme editor set studio background-color '#eee7ff' --on table-row --when parity:odd
pnpm exec syntrofic experimental theme editor set studio background-color 'rgba(66, 88, 73, 0.16)' --on input-group --mode light
pnpm exec syntrofic experimental theme editor set studio badges outline
pnpm exec syntrofic experimental theme editor show studio --section actions --png
pnpm exec syntrofic experimental theme editor show studio --on badge --json
pnpm exec syntrofic experimental theme editor show studio --on input-group --json
pnpm exec syntrofic experimental theme editor undo studio
pnpm exec syntrofic experimental theme editor undo studio background --on button --when variant:secondary --mode dark
pnpm exec syntrofic experimental theme preview app studio-preview --theme studio
```

`theme editor set` 会检查目标部件支持的属性、变体和状态。用 `--when` 组合尺寸和变体，用 `--mode` 限定颜色模式。`--on inputs` 会同时设置输入控件，`--on select --only` 可单独设置选择器。用 `theme editor how --list parts` 查询部件。组合规则使用 CSS `@scope` 保持嵌套主题独立，需要支持该特性的浏览器。

`theme editor show` 生成离线可用的 `sheet.html`。展开「变体与状态」下的部件，即可并排查看变体和交互状态。用 `--section inputs` 等命令生成分类样张时，对照已默认展开。独立的组件和模板示例可以操作，加载时从白底骨架缓动过渡到内容。样张支持键盘操作及系统的减少动效设置。

`theme editor how` 也接受中英文请求。用问句读取当前样式，或说明部件、属性和值来获取可执行的修改命令。用分号连接多个修改，前置的颜色模式会应用到后续分句。结果列出每条命令的作用域和校验方式，互相冲突的写法作为备选返回。查询过程只读。

```sh
pnpm exec syntrofic theme editor how '把次要按钮悬停时的底色改成 #f5f5f5；卡片圆角设为 12px' --theme studio
pnpm exec syntrofic theme editor how 'what is the padding of primary medium buttons in light mode' --theme studio
pnpm exec syntrofic theme editor how 'make primary buttons as round as cards' --theme studio
pnpm exec syntrofic theme editor how '让幽灵按钮看起来像默认按钮' --theme studio
pnpm exec syntrofic theme editor how border --list=properties
```

`copy-style` 可复制同一组件的变体外观。编辑器会实测当前主题中的背景、文字、边框、阴影、内边距和其他可编辑样式，校验可用的深浅模式、尺寸和交互状态。用 `--when size:sm` 可限定尺寸。检查匹配后才保存一次主题修订，可按同一作用域撤销。复制得到的是当前测量值，可在主题里继续编辑。

```sh
pnpm exec syntrofic theme editor set studio copy-style variant:primary --on button --when variant:ghost --dry-run
pnpm exec syntrofic theme editor set studio copy-style variant:primary --on button --when variant:ghost
pnpm exec syntrofic theme editor undo studio copy-style --on button --when variant:ghost
```

用 `--except` 可在调整主题时保留指定部件的可编辑样式。可以按组件、变体、尺寸或交互状态限定例外，颜色例外也可以限定深浅模式。编辑器用浏览器核对调整前后的样式，将主题调整和保留规则保存在同一次修订中。

```sh
pnpm exec syntrofic theme editor how '让整体圆角更大，除了卡片和按钮' --theme studio
pnpm exec syntrofic theme editor set studio corners more --except card --except button
pnpm exec syntrofic theme editor set studio spacing compact --except 'button/variant:primary+size:sm' --dry-run
pnpm exec syntrofic theme editor set studio background-color '#425849' --on button --except 'button/variant:primary+appearance:dark'
pnpm exec syntrofic theme editor undo studio corners --except card --except button
```

全局边框厚度由 `--sy-border-width` 控制，默认为 1 px。卡片、按钮、选择控件和模板外框共用该值。用 `--except inputs` 保留输入控件原有的边框、内边距和高度，主题编辑器会在深浅两种模式下检查结果。

```sh
pnpm exec syntrofic theme editor how '让整体边框更粗，除了输入控件' --theme studio
pnpm exec syntrofic theme editor set studio --sy-border-width 3px --except inputs
pnpm exec syntrofic theme editor show studio --on input --when size:sm --json
```

低、中、高三档阴影可以一起调整，也可以按深浅模式、部件和变体调整。用 `shadow-strength 150%` 将当前阴影的不透明度乘以 1.5，并保留各层的位置、模糊半径和颜色。主题编辑器保存前会核对实际渲染结果。[试用阴影层级](/themes/)

```sh
pnpm exec syntrofic theme editor how '把深色模式的阴影加深 50%' --theme studio
pnpm exec syntrofic theme editor set studio shadow-strength 150% --mode dark
pnpm exec syntrofic theme editor set studio shadow-strength 75% --on dialog --mode light
pnpm exec syntrofic theme editor set studio shadow-strength 125% --except dialog
```

用 `shadow-alpha` 可把现有阴影每一层设为同一个不透明度。输入控件的静止阴影可以独立设置，悬停和错误描边仍会显示在它的上方，键盘焦点仍保留独立的轮廓。指定 `--state hover` 可单独编辑悬停样式。

用 `theme editor show studio --on input-focus-ring --state focus-visible --json` 查看输入控件的焦点轮廓。`--when kind:input+status:error` 可只选择错误状态的文本输入，`--mode dark` 可单独调整深色模式的轮廓宽度与颜色。`theme editor how 'make the input focus ring thinner in dark mode' --theme studio` 会按当前渲染的宽度给出命令。[试用输入焦点环](/themes/)

```sh
pnpm exec syntrofic theme editor how 'make dialog shadows 70% transparent'
pnpm exec syntrofic theme editor set studio shadow-alpha 30% --on dialog
pnpm exec syntrofic theme editor how 'sunken bevel on inputs'
pnpm exec syntrofic theme editor how 'softer shadow on inputs when hovered'
```

同一个问句也可以包含限制。输入控件的保留条件可以放在问句开头或结尾。主文字或次要文字的颜色限制只会为当前命中该颜色的模式生成修改命令，并根据对应底色选择有足够对比度的中性色。

```sh
pnpm exec syntrofic theme editor how 'make everything rounder; never round the inputs' --theme studio
pnpm exec syntrofic theme editor how 'white page, never use pure black for text' --theme studio
```

用 `font --on body`、`font --on heading` 和 `font --on code` 分别设置正文、标题和代码字体。整套主题的 `font` 为正文和标题提供默认字体。精确字体 Token 优先于对应角色设置，`show` 会列出实际使用的字体和来源。单个组件或标题级别可以用 `font-family` 设置。

```sh
pnpm exec syntrofic theme editor set studio font system --on body
pnpm exec syntrofic theme editor how '把标题字体改成 Georgia' --theme studio
pnpm exec syntrofic theme editor set studio font 'JetBrains Mono' --on code
pnpm exec syntrofic theme editor set studio --sy-font-heading 'Georgia, serif'
pnpm exec syntrofic theme editor show studio --on heading --when level:2 --json
```

`theme editor how card` 列出卡片可设的属性、Token、变体和状态。`theme editor how border-radius` 查找支持圆角的部件，`theme editor how spacing` 查找间距设置。`theme editor how --list tokens` 可查询 Token 的类型、默认值、读取它的部件和当前主题值。`theme editor how colors --theme studio` 显示配色、色阶来源和精确覆盖。

用 `motion-tempo` 调整主题动效的时长倍率。用 `motion-character` 切换缓动曲线。设置 `reduced-motion always` 后，主题和离线样张都会启用减少动效。

```sh
pnpm exec syntrofic theme editor how '让动画更快' --theme studio
pnpm exec syntrofic theme editor set studio motion-tempo 0.9
pnpm exec syntrofic theme editor set studio motion-character crisp
pnpm exec syntrofic theme editor set studio reduced-motion always
```

用 `theme editor how` 可以离线检查 PNG 截图。坐标从左上角的 `0,0` 开始。`--at` 返回所选像素的十六进制颜色、透明度和原始通道值，包括 16 位样本。省略 `--at` 时会给出主色及其分布，默认列出 14 种。`pureWhite.share` 表示完全不透明的 `#FFFFFF` 占所读像素的比例。超过 400 万像素的图片使用均匀网格取样，逐点读取仍使用原始像素。

```sh
pnpm exec syntrofic theme editor how screenshot.png --at '40,20;300,180'
pnpm exec syntrofic theme editor how screenshot.png 6
pnpm exec syntrofic theme editor how screenshot@2x.png --pixel-ratio 2 --theme studio
```

`measurements` 会报告重复出现的控件高度、复选框尺寸、横纵圆角、边框宽度、面板样式、主要按钮填色和面板文字行距，并附上截图位置。`unsure` 会列出证据不足的项目。尺寸按截图的像素比例折算，缺少可用密度信息时按 1× 处理。传入已有的本地主题名，可查看在该主题配置中通过校验的 `theme editor set` 命令。测量过程只读。

安装 Playwright Chromium 或本机 Chrome 后，编辑器会测量按钮、徽标、常规输入框、输入组、选择器、组合框和选项行的局部颜色 Token。`changes.paint.reaches` 列出发生变化的属性、变体、状态和模式，批量修改时在 `changes.paint.parts` 中分别列出。`prefix.color`、`placeholder.color` 和 `description.color` 分别表示前缀、占位文字和说明文字。用 `show --on input-group` 可以检查各部分的最终颜色和来源。如果目标范围全部经过测量且颜色没有变化，命令会拒绝保存。缺少浏览器时，编辑器继续验证语法和类型，并报告 `browser-unavailable`。[试用输入组辅助文字配色](/themes/)

`show --on … --json` 的 `contrast` 使用浏览器计算的文字颜色和实际底色，半透明颜色先与下层背景叠合。不透明 sRGB 渐变提供整个渐变的保守对比度下限。若局部编辑降低了对比度并低于要求，`changes.paint.contrast` 会报告颜色模式、状态、变体及修改前后的对比度，并附上通过验证的 `fix` 命令。常规文字要求达到 4.5∶1，大字达到 3∶1。禁用控件标记为 `inactive`，无法可靠计算的背景标记为 `unmeasured`。[WCAG 2.2 文字对比度要求](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

`statusVision` 会模拟红色弱、绿色弱、红色盲和绿色盲，按明暗模式检查成功、警告、错误和信息的实色 Token。结果列出可能混淆的色对。可执行的修正只改问题模式的 Token，并保留与底色及本状态淡色表面的对比度。每条修正对应一个色对，应用后可重新检查。完整离线样张和配色样张也会显示模拟色卡。状态应同时用文字或不同图标表达。[色觉模拟模型](https://pubmed.ncbi.nlm.nih.gov/19834201/)

```sh
pnpm exec syntrofic theme editor how '检查红绿色觉差异下的状态色' --theme studio
pnpm exec syntrofic theme editor show studio --section colors
```

为常规按钮或输入控件设置 `height` 会修改所选尺寸档位的共享 Token，省略尺寸时使用 `md`。例如 `--when size:sm` 修改小号控件。`--only` 将高度限定到指定部件，带交互状态或其他变体条件的高度仍使用独立 CSS 规则。共享高度适用于深浅两种模式。选择器有多行内容时可以继续增高。[试用控件高度](/themes/)

选择器、联想输入、标签输入和文件字段保留组件默认的上下内边距。设置 `padding` 时，这些控件采用其中的左右值。文件拖放区使用 `mode="dropzone"`，主题规则可用 `--when mode:dropzone` 指定并调整四边。命令报告会列出各部件实际采用的内边距。[试用多行控件内边距](/themes/)

在 `top-nav-heading` 或 `side-nav-heading` 上设置 `font-size` 或 `text-size` 会修改主标题的字号，辅助文字保留各自的字号。`tab-list` 会调整同一列表内的标签文字，支持 `--when size:sm` 和 `--when orientation:vertical`。`show --on tab-list` 会报告标签文字的计算字号和对应 Token。[试用导航文字字号](/themes/)

对部件设置字号或控件高度 Token 时，编辑器会比较适用变体、状态在浅色和深色模式下的计算尺寸。`--json` 结果中的 `changes.dimensions` 列出有变化的属性及其前后值。若 Token 被更直接的设置覆盖，或换算后的尺寸相同，命令会返回 `ERR_THEME_NO_EFFECT` 并保留现有主题和预览文件。浏览器不可用时，尺寸检查会标记为 `browser-unavailable`。`show --on combobox` 还能追溯内部输入框的高度和最小高度。

`theme editor how --list parts` 的 `tokenProperties` 列出部件读取的字体、圆角、间距和阴影 Token 及其对应属性。例如，`set studio --sy-space-3 20px --on button --when size:sm` 会实测小号按钮的左右内边距，结果写在 `changes.styles`。`show --on button` 可追溯该值的声明来源。字体、字号和尺寸设置同时应用于两种颜色模式。阴影可用 `--mode` 单独设置。

可以用 `set studio border '1px solid #dedede' --on pagination` 为分页控件设置共享边框，再用 `border-radius 16px --on pagination` 调整这一圈的圆角。分页区在设置范围内有底色时，外层承接边框。用 `corners 8px --on pagination` 可单独调整各个控件的圆角。`show studio --on pagination --json` 会报告外层和控件行的计算样式。改变或撤销底色而引起的边框移动会出现在 `changes.paginationFrames`。[试用分页边框和圆角](/themes/)

直接设置部件的内边距、边框、圆角或颜色时，`set` 也会比较变体和状态的计算样式。在根字号为 16 px 时，把已有的 `24px` 改成 `1.5rem` 会返回 `ERR_THEME_NO_EFFECT`、保留现有文件，并给出检查同一范围的 `show` 命令。派生主题仍可显式固定继承的属性值，使后续的通用设置保留该变体。

可用 `set studio --sy-surface-muted '#ededed' --on card --when variant:muted+elevation:low --mode light` 调整浅灰卡片的底色。用 `show studio --on card --when variant:muted+elevation:low --state rest --mode light --json` 查看该外观的计算值和来源。`changes.paint` 也会列出对话框说明、勾选标记和开关滑块等子部件上发生的颜色变化。控件同时选中和禁用时，同等限定的禁用规则优先。[试用卡片变体配色](/themes/)

用 `--on option-rows` 同时调整菜单、选择器、搜索建议、组合框和列表框的选项行。`--state highlighted` 覆盖键盘和鼠标高亮，列表框通过 `highlight-on-hover` 启用鼠标高亮。同行的标题和说明都使用设置的文字色，也可用 `--sy-option-label-color` 和 `--sy-option-description-color` 分别设置。`show --on selector-option-row` 会报告选项行及说明文字的最终颜色。[试用选项行高亮](/themes/)

`how --list groups` 可查看部件分组，`show --on` 可检查组内各部件的实际样式。`selected-items` 默认只匹配选中态，`accent-fills` 只匹配强调色变体，`status-surfaces` 包含横幅和通知。`--when` 可进一步限定范围。

```sh
pnpm exec syntrofic theme editor show studio --on selected-items --when tone:accent --mode light
pnpm exec syntrofic theme editor set studio background-color '#edf1ec' --on status-surfaces --when tone:success --mode light
```

代码块的默认复制按钮、横幅图标和标签页指示可单独隐藏。只容纳复制按钮的代码块页头会收起。用 `undo` 恢复该部件原有的显示方式。[试用可选部件](/themes/)

```sh
pnpm exec syntrofic theme editor how '隐藏代码块复制按钮' --theme studio
pnpm exec syntrofic theme editor set studio display none --on tab-indicator --when variant:line
pnpm exec syntrofic theme editor undo studio display --on tab-indicator --when variant:line
```

应用头部（`app-shell-header`）和布局头部（`layout-header`）可以共享导航行的高度和内边距。两处设置冲突时，各头部保留自身尺寸，结果中的 `navigationReach` 会指出冲突来自高度还是内边距。用 `show --on top-nav --json` 可查看独立导航、应用头部、滚动头部和布局区域中的实际尺寸。用 `--on heading --when level:2` 可以单独设置二级标题。

修改导航尺寸后，`editor set`、`editor show` 和 `editor how repairs` 会检查导航行、标题、链接和窄屏菜单按钮。检查覆盖明暗模式、导航密度、配置中的交互状态和 390 px 窄屏。字号、行高、`rem` 尺寸和实际内边距都参与测量。

`layoutIssues` 显示需要的高度和可用空间。`layoutRepairs` 列出浏览器复测通过的方案。可收紧已设置的上下内边距时优先保留头部高度，必要时给出加高导航行和头部的一组命令。离线导航样张也会展示这些命令。浏览器不可用时，`layoutCheck` 会标明状态，像素设置的估算结果仍可查看。[试用导航行尺寸](/themes/)

可以用 `set studio height 3rem --on top-nav-item --state hover` 单独设置悬停尺寸。导航项进入或离开悬停、键盘焦点和按压等状态时，主题中的高度和内边距会按当前的动效设置过渡。系统偏好减少动态效果时，尺寸直接更新。[试用悬停与键盘焦点](/themes/)

`SNavbar` 的导航项可以设置 `iconOnly` 显示方形图标，读屏名称仍来自 `label`。紧凑菜单显示完整标签。用导航项的 `as` 指定单项链接组件，可以覆盖全局链接组件。切换选中项时指示线平滑移动，改名过程中它会跟随选中项的实时尺寸。[试用导航选中项](/themes/)

通过 `center` 插槽放入搜索框、标签页或其他居中控件。`start-content` 放在品牌标题之后，`end` 放置右侧操作。空间不足时各区域自动换行，低于 `breakpoint` 后居中控件移入紧凑菜单，并保留输入值及组件状态。[试用居中导航与换行](/themes/)

用 `theme editor new studio --like base` 从已有主题创建派生主题。`--like` 可引用本地描述文件，也可配合 `--package` 选择已安装的主题。同一部件的通用设置会覆盖继承来的对应变体值，并保留明确写入的局部设置。命令会在 `lifted` 中列出补写的范围，撤销通用设置后会恢复继承值。[试用主题继承](/themes/)

展示标题有三个字号档位。给整组指定字号时，`how` 会以 `display-1` 为基准，按当前比例生成三条设置命令。只要求相对放大或缩小时，已有响应式字号的档位会保留。`--when level:2` 与 `--when type:display-2` 可同时使用。[试用展示标题](/themes/)

```sh
pnpm exec syntrofic theme editor how '展示标题字号改为 60px' --theme studio
pnpm exec syntrofic theme editor set studio --sy-display-2-size 'clamp(28px, 4vw, 44px)'
pnpm exec syntrofic theme editor show studio --on heading --when type:display-2
```

徽标支持柔和（`soft`）、实心（`solid`）和描边（`outline`）三种样式。可以在主题实验室切换并查看生成的 CSS。

用 `theme editor set studio button-style outline --on button --when variant:danger` 只给危险按钮应用描边，用 `button-style default` 恢复该变体原有外观。`--mode` 可限定明暗模式。`theme editor show studio --on button --when variant:danger --json` 可查看外观、边缘和各状态的实测颜色。[试用按钮状态配色](/themes/)

进度条分别使用 `progress-bar-track`、`progress-bar-fill` 和 `progress-bar-sweep` 设置轨道、完成区和加载条。轨道的 `height` 在两种模式下共用，配色可以按明暗、尺寸和语义色单独设置。`show --on progress-bar-track` 会报告常规及进度未定时的实际厚度，以及指示区与轨道之间的对比度。编辑降低对比度且低于 3∶1 时，命令会报告受影响的范围，并列出实际渲染验证通过的修正。[试用进度条样式](/themes/)

```sh
pnpm exec syntrofic theme editor set studio height 4px --on progress-bar-track
pnpm exec syntrofic theme editor set studio background-color '#365975' --on progress-bar-fill --when tone:accent --mode light
pnpm exec syntrofic theme editor show studio --on progress-bar-track
```

用 `calendar-day` 调整日期单元格。`--when context:picker` 对应日期选择浮层，`context:inline` 对应内联日历。`selected` 对应单选、多选和范围端点，`in-range` 对应已提交的范围内部。`range-start`、`range-end`、`highlighted`、`today` 和 `focus-visible` 可单独设置。`show` 会检查月历与周／日视图。用 `--on selected-items --state selected` 可同时修改支持该属性的选中项。[试用日历日期样式](/themes/)

```sh
pnpm exec syntrofic theme editor set studio background-color '#365975' --on calendar-day --when context:picker --state selected --mode light
pnpm exec syntrofic theme editor set studio background-color '#eceff2' --on calendar-day --when variant:range --state in-range --mode light
pnpm exec syntrofic theme editor show studio --on calendar-day --when context:picker --state selected
```

`dropdown-menu-divider` 可单独调整菜单分隔线。用 `context:dropdown` 或 `context:context` 选择下拉或右键菜单，用 `presentation:popover` 或 `presentation:sheet` 选择浮层或底部面板。将高度设为 `0px` 时，分组仍有留白。普通 `divider` 支持按方向和 `variant:subtle`、`variant:strong` 设置，带标签分隔线的两侧也会使用该配色。[试用菜单面板](/themes/)

```sh
pnpm exec syntrofic theme editor set studio height 0px --on dropdown-menu-divider --when context:dropdown
pnpm exec syntrofic theme editor set studio --sy-border-strong '#909090' --on divider --when variant:strong --mode light
pnpm exec syntrofic theme editor show studio --on dropdown-menu-divider --when presentation:sheet
```

`checkbox-indicator`、`radio-indicator-dot` 和 `switch-thumb` 分别控制复选标记、单选圆点和开关滑块。复选框的勾与横杠可分别用 `--state checked` 和 `--when checked:indeterminate` 设置。开关的选中与未选配色会随拖动预览切换。`show` 支持查看这些部位的计算颜色及其相对于底色的对比度。[试用选择控件标记](/themes/)

```sh
pnpm exec syntrofic theme editor set studio color '#fff0c0' --on checkbox-indicator --state checked --mode light
pnpm exec syntrofic theme editor set studio background-color '#365975' --on radio-indicator-dot --mode light
pnpm exec syntrofic theme editor show studio --on switch-thumb --state dragging
```

用 `+` 指定同时生效的状态。组合规则优先于同一部件的单状态规则。`toggle-button` 的 `pressed` 表示切换后的按下状态，`active` 表示指针或按键正在操作。[试用组合状态](/themes/)

```sh
pnpm exec syntrofic theme editor set studio background-color '#eae1f0' --on toggle-button --state 'pressed+hover'
pnpm exec syntrofic theme editor show studio --on checkbox-indicator --state 'checked+disabled'
pnpm exec syntrofic theme editor show studio --on switch-thumb --state 'dragging+selected'
```

用 `toggle-button-group` 调整容器的间距。`grouped+pressed` 匹配组内选中的切换按钮。

```sh
pnpm exec syntrofic theme editor set studio gap 6px --on toggle-button-group
pnpm exec syntrofic theme editor set studio background-color '#e6ede7' --on toggle-button --state 'grouped+pressed' --mode light
```

下拉框箭头、对话框关闭图标和通知关闭按钮可分别设置。箭头支持展开和收起状态，对话框支持普通标题和媒体标题，通知支持按类型区分样式。[试用控件图标](/themes/)

```sh
pnpm exec syntrofic theme editor set studio color '#624d73' --on selector-indicator-icon --state expanded
pnpm exec syntrofic theme editor set studio color '#775149' --on dialog-header-close-icon --when variant:header
pnpm exec syntrofic theme editor show studio --on toast-close --when tone:success --state hover
```

按钮的首尾图标可用 `--sy-button-icon-color` 配色，适用于使用 `currentColor` 或继承颜色的图标。`show --on button` 会报告两个图标的实际颜色及对比度。对话框标题可分别设置普通标题和媒体标题的字号、字重和颜色。

```sh
pnpm exec syntrofic theme editor set studio --sy-button-icon-color '#365975' --on button --when variant:secondary --state hover
pnpm exec syntrofic theme editor set studio font-weight 800 --on dialog-header-title-block --when variant:header
```

`theme editor show` 会解析两种模式的 Token，报告文字对比度低于 4.5∶1 的配色，并指出规则对应的部件、变体和状态。`themes/studio/sheet.html` 包含可离线操作的 Web 组件示例和按钮状态对照。用 `--section overlays` 查看默认展开的菜单、悬浮卡、对话框、抽屉和底部面板，用 `--section pages` 试用页面模板。`--png` 通过 Playwright Chromium 或本机 Chrome 生成截图，较长的样张会在组件或模板之间分页。截图记录在 `themes/studio/studio.pictures.json`，主题外观变化时会清理过期的生成截图。

用 `theme editor show studio --on badge` 可以只读检查单个部件。命令用 Playwright Chromium 或本机 Chrome 测量浅深两种模式的属性，并追溯 CSS 声明、读取的 Token 和来源。`--json` 包含所有受支持的变体和状态。编辑器主题查询读取已保存的设置，项目中的主题文件、生成文件和日志保持原样。

`settings` 列出设置的来源、部件、颜色模式和状态条件。手工覆盖带有 `authored` 标记。`wiring` 提供主题模块路径和编译命令。`set` 和 `show` 会在样张生成后一起写入相关文件。样张生成失败时保留原文件。浏览器测量不可用时，合法的设置仍可保存，结果会标记 `ERR_THEME_NOT_CHECKED`。

指定品牌色后，构建会生成 `palette.json`，其中包括深浅色阶、对比度校正及每个颜色 Token 的来源。`theme editor show studio --section colors` 可在离线样张中查看配色。命令结果的 `introducedContrast` 列出相对基础主题新增或加重的文字对比度问题。

`theme editor show studio --json` 在支持的颜色模式中对照实际渲染。`unreached` 列出仍沿用基础底色或文字色的部件，`paintCoverage` 包含按模式的结果和颜色样本。已生效的部件级配色会单独标记。新建派生主题以分支时保存的父主题为基准。可在「配色覆盖」样张查看结果，或用 `show studio --on toast` 检查单个部件。

`theme editor how repairs --theme studio` 只读列出浏览器已验证的修正命令。对比度建议只改文字颜色，按部件、变体、状态和明暗模式限定。浏览器重测该范围并检查其他可测文字。`theme editor show studio --section colors` 在「可应用修正」中展示修改前后的对比度和命令。应用命令后可重新检查。

用 `theme editor show studio --on lightbox --json` 检查图片查看器的说明文字，展开后的说明面板可用 `--on lightbox-caption-panel` 单独编辑。即使页面只启用一种模式，仍可用 `--mode dark` 或 `--mode light` 检查和修改按钮、图片说明及说明面板在媒体区域里的配色。局部检查的 `media` 列出媒体区域的结果。若一条修正经复测同时适用，建议会使用两种模式共用的命令。浮层样张会展示媒体配色和修正建议。[试用媒体文字配色](/themes/)

用 `theme editor set studio padding '2px 8px' --on table-cell` 收紧数据单元格，用 `--on table-header-cell` 单独调整表头。表头可设置 `text-transform uppercase`，并可用 `--state sorted` 只修改排序列的颜色。用 `theme editor set studio --sy-border '#dedede' --on table-row` 设置行分隔线颜色。`theme editor show studio --on table-row --json` 提供开启和关闭分隔线时的实测样式。[试用表格间距](/themes/)

用 `theme editor show studio --on tab-indicator --json` 查看选中指示的尺寸和底色。横向选项卡用 `height` 调节线条厚度，纵向用 `width`。`theme editor how 'tabs with a 2px black underline when selected' --theme studio` 会生成横向指示条的尺寸和配色命令。用 `--when variant:line` 可限定细线样式。[试用标签页选中指示](/themes/)

`--on menus` 可一起调整下拉菜单、右键菜单、单双选面板和搜索候选浮层。用 `--on menu-item` 单独调整菜单项。`theme editor set studio border-radius '0 0 6px 6px' --on dropdown-menu` 可独立设置四个角。加 `--when variant:submenu` 可将设置限定到子菜单。[试用菜单面板](/themes/)

可以在 `themes/studio/studio.theme.ts` 导出局部主题配置。`theme editor show` 和主题构建会将其中声明的字段应用到 CLI 设置上，再更新 `src/themes/studio/` 的生成文件。通过 `theme preview add` 添加的预览路由会同步配色页。主题引用本地安装的 Fontsource 字体时，构建会把字体嵌入 CSS 和离线样张。缺失字体的安装命令列在 `fontNotes`。

独立预览包含概览、可搜索的组件参考和深浅两套语义色。进入 `studio-preview` 安装依赖后，用 `pnpm dev` 打开。可从预览应用目录运行 `theme preview add --template dashboard-progress`，把排期与进度示例加入导航。

## 校验集成包

在包含 `package.json` 的项目目录下运行这些命令。组件、模板、文档、迁移脚本和主题记录在 `syntrofic.integration.json`。`verify` 根据 npm 打包文件列表检查每项贡献是否会随包分发。

组件可在清单的 `props` 中记录名称、类型、必填状态和说明。`integration check` 汇总清单、组件、模板和文档的检查，核对可直接比较的 Vue 属性。`--strict` 会把警告和跳过的比较计入失败条件。

用 `integration add doc review --extends standard-design` 为已有文档追加说明，或用 `--parent design` 归入集成包自己的章节。运行 `integration add codemod review-status --to 0.1.0` 可新增版本迁移脚本，已安装的应用可以通过 `upgrade --from 0.0.9 --integration <package>` 预览它。

`syntrofic.config.json` 的 `integrations` 声明额外加载的集成包。`skills.to` 设置项目说明的默认位置，`discover` 指向项目内的发现清单，`issuesUrl` 设置核心组件问题的报告地址。给 `debug` 指定项目内的 `.ndjson` 文件可以记录命令名、耗时及退出状态。`hooks.postCodemod` 接受 `{ name, command, args }` 形式的命令，`args` 中的 `{files}` 展开为改动文件。钩子在 `upgrade --apply` 写入文件后执行。

```sh
pnpm exec syntrofic integration add component TeamScorecard
pnpm exec syntrofic integration add template ProgressReview --type page --replaces dashboard-progress
pnpm exec syntrofic template dashboard-progress --package @syntrofic/ui
pnpm exec syntrofic doctor integration components
pnpm exec syntrofic integration check --strict
pnpm exec syntrofic integration verify --json
```

集成包可提供页面和区块模板。安装后可在 `template --list` 中查看。声明 `--replaces` 的集成模板会接替同类型的内置模板。用 `--package @syntrofic/ui` 可查看原版。

## 配置语义图标

```sh
pnpm exec syntrofic experimental icon new-set studio
pnpm exec syntrofic experimental icon add mark --path-data 'M3 12l6 6 12-12'
pnpm exec syntrofic experimental icon new-definition approved --words yes,accepted
pnpm exec syntrofic experimental icon map approved mark
pnpm exec syntrofic experimental icon use studio --json
```

通过 `syntroficThemePlugin` 从 `virtual:syntrofic-icons` 导入所选图标集，再传给 `SBrandTheme` 或 `provideIcons`。可用 `--from` 读取模块中可用的图标导出，并用 `--backup` 和 `--variant` 选择备用图标集与样式。

依赖包可以随包提供 `syntrofic.icons.json`。`experimental icon --list` 会列出这些图标集，可用 `experimental icon use @team/icons/studio --backup office` 选择包内图标并保留本地备用集。包需要导出清单引用的模块。

使用 `syntrofic experimental theme preview add` 创建预览页配置。可传入描述与 `--top 2` 来选择两组匹配的示例。独立应用会读取配置并渲染所选模板。在已有 Vue 应用中，用 `--route src/ThemePreview.vue` 生成可注册到路由的预览组件。Nuxt 项目已有 `app/pages` 或 `pages` 时，会在其中生成预览页。也可以把配置交给 SThemePreview，通过 `page` 插槽补充自己的页面。`preview list` 和 `preview remove` 可管理配置。

对用编辑器创建的主题运行 `syntrofic experimental theme compile studio`，会生成主题文件和 `src/themes/studio/` 中可导入的副本。`--check` 同时检查两处，`--out` 则仅编译到指定位置。

## 导出交互页面

在已安装 Vite 和 Vue 插件的项目中，可以把 Vue 页面、脚本、样式及本地资源一并打包到 HTML。将 HTML 导入新目录时，CLI 校验嵌入文件的哈希并还原源文件。

```sh
pnpm exec syntrofic experimental export src/App.vue --out preview.html
pnpm exec syntrofic experimental import preview.html --out restored-page
```

导出的 HTML 可直接打开。支持服务端渲染的页面会先显示静态布局，脚本启动后接管交互。导入会校验并还原本地源文件，若 HTML 中的预览被修改，会在结果中提示。

静态 HTTPS 图片会尝试内嵌到 HTML，命令结果列出成功内嵌的地址和无法内嵌的原因。

指定 `--out ./Review.vue` 时，CLI 会生成可直接导入的 Vue 入口，把原文件留在同目录的 `Review-sources/`。没有嵌入源码的 Syntrofic HTML 也可还原成静态布局骨架。

## 构建与定制

在 Vite 配置中引入 `@syntrofic/ui/vite` 的 `syntroficThemePlugin({ manifests: ['./branding/manifest.json'] })`，再从应用入口导入 `virtual:syntrofic-theme.css`。

插件也读取 `syntrofic.themes.json`。从 `virtual:syntrofic-theme` 导入 `defaultTheme` 可取得 `theme use` 选中的主题，同时加载对应 CSS。使用 `<SBrandTheme :theme="defaultTheme">` 将该主题应用到局部容器。

在项目的 `vite-env.d.ts` 中加入 `/// <reference types="@syntrofic/ui/vite/client" />`，即可为主题和图标虚拟模块启用 TypeScript 类型检查。

已有 PostCSS 构建流程时，可把 `syntroficThemePostcss()` 从 `@syntrofic/ui/postcss` 加入插件列表，再在样式表中写入 `@syntrofic-theme;`。插件读取同一个主题注册表，可放在项目自己的 CSS 层中。

```sh
pnpm exec syntrofic swizzle SButton --out ./local-ui
pnpm exec syntrofic swizzle --list
pnpm exec syntrofic blog standard-design
```

`swizzle` 会复制组件和它引用的本地模块，并记录外部依赖及源文件基线。复制后的组件可继续使用 `@syntrofic/ui/style.css`。应用的设计更新见[更新记录](/blog/)。

若项目的集成包替代了某个内置组件，`swizzle` 默认复制替代项及其本地资源。用 `--package @syntrofic/ui` 仍可复制内置版本。

## 文档 MCP

`pnpm exec syntrofic mcp` 通过标准输入输出提供 CLI 工具。例如，`theme build` 对应 `theme_build`。客户端可用 `tools/list` 查看各工具支持的参数。工具默认在启动 MCP 时的目录执行，可以传入 `cwd` 切换到该目录下的子目录。调用结果保留 CLI 的 JSON 内容。

`syntrofic blog` 从官网读取更新记录，断网时使用随包发布的快照。传入文章 ID 可查看正文。用 `--source http://127.0.0.1:4244/blog/feed.json` 可以检查本地官网预览的订阅数据。

运行 `pnpm exec syntrofic mcp --docs-only` 可向共享客户端提供只读文档工具。在项目仓库运行 `node scripts/platform/docs-server.mjs` 可使用同一目录的本地 HTTP 服务。

## 迁移和设计工具

```sh
pnpm exec syntrofic migrate ./src/legacy.vue --dry-run
pnpm exec syntrofic upgrade --list
pnpm exec syntrofic upgrade --from 0.0.9 --path ./src
pnpm exec syntrofic upgrade --registry
pnpm exec syntrofic figma --id YOUR_FIGMA_PLUGIN_ID --out ./figma-plugin
```

`migrate` 可报告旧组件和 HeroUI 导入的 Vue 对应关系。`upgrade --from` 根据已安装版本预览源文件迁移，加入 `--apply` 才写入。当受保护的文件需要迁移时，命令会列出这些文件并停止写入。`upgrade --registry` 检查复制的组件，加入 `--apply` 后应用兼容更新。可以合并的本地修改会保留，冲突会列在结果中。Figma 工具可导出颜色、尺寸变量及组件设计清单。
