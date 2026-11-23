## 语义 Token

Syntrofic UI 使用 CSS 自定义属性描述表面、文字、状态、圆角和动画。设置 `--sy-accent`、`--sy-accent-hover` 和 `--sy-accent-on` 可以调整主要操作色及其交互状态。

```css
[data-sy-theme='light'] {
  --sy-accent: #425849;
  --sy-accent-hover: #354b3c;
  --sy-accent-on: #fffdf9;
}
```

[打开主题实验室](/themes/)调整颜色和圆角，并预览按钮、表单和进度控件。

主题实验室提供中性灰、岩灰蓝、抹茶绿、可可棕、奶油黄、墨蓝紫和复古粉。七种预设的浅色模式均使用白色底色。通过 `standardBrandPresets` 读取预设 ID，再用 `createBrandTheme` 和 `brandThemeStyle` 将主题应用到局部容器。

SBrandTheme 可将完整主题和图标集应用到一个 Vue 子树。SMediaTheme 可根据图片亮度或指定模式调整遮罩上的控件配色。SSyntaxTheme 为代码块设置关键字、字符串、数字、名称及注释颜色。

浮层挂到共享容器或页面根部时，会继承来源区域的明暗模式和 CSS 自定义属性，同时应用浮层自身的组件规则。支持 SBrandTheme、SMediaTheme，以及加载编译 CSS 后使用 `data-sy-brand` 和 `data-sy-theme` 标记的局部容器。主题实验室的「局部浮层主题」可对照两种接入方式并在浮层打开时切换明暗。

`registerIcons(icons)` 可注册全局语义图标。传入 `{ theme: 'studio' }` 后，图标会随该品牌启用。SBrandTheme 的 `icons` 可覆盖当前子树的图标。图标条目接受路径、SVG 组件或按尺寸和变体返回图形的函数。SIcon 与 `useIcon` 共用注册表，并从内置图标补齐缺少的名称。

在 Canvas、SVG 或非 CSS 插件中，用 `useTheme().token('--sy-accent')` 读取当前模式的语义颜色。也可在 Vue 外用 `resolveThemeTokens(theme, { mode })` 获取同一套默认值与主题覆盖。主题的 `motion` 可设置非线性曲线风格和交互节奏。

`resolveThemeToken(theme, '--sy-canvas', { mode: 'light' })` 可单独解析一个值，并展开 CSS 变量和主题生成的 sRGB 混色。`tokenVar('--sy-canvas')` 与 `tokenVars['--sy-canvas']` 可把该语义变量传给其他 CSS 工具。

### 图表数据配色

`dataColorVars` 提供 10 个分类色、1 个中性色和 9 组五级顺序色。分类色区分系列，`--sy-data-neutral` 标注参考数据，顺序色用 `1` 到 `5` 表示由弱到强。数据颜色与白色画布分别设置。

```ts
const svgFill = dataColorVars['--sy-data-categorical-sage']
const { token } = useTheme()
const canvasFill = computed(() => token('--sy-data-categorical-sage'))
```

SVG 或 DOM 可直接使用 `svgFill`。Canvas 或 Vega 配置接收解析后的颜色，主题变化时用新颜色重绘。`SBrandTheme` 的 `modes.light` 和 `modes.dark` 可覆盖单个颜色，例如 `{ 'data-categorical-sage': '#546b98' }`。内置图表和 `SVegaChart` 默认采用同一组分类色，显式的系列颜色和 Vega 配置优先。原有 `--sy-chart-*` 颜色仍可覆盖。主题实验室的「图表数据配色」可以试用同一份数据的 SVG 和 Canvas 渲染。

### 语法配色与媒体主题

用 `defineSyntaxTheme({ name, tokens })` 定义语法配色。每个颜色可写成单值或 `[浅色值, 深色值]`，并能独立设置差异行和标记颜色。区域级配色用 SSyntaxTheme，单独的代码块或差异视图可传入 `syntaxTheme`。`useSyntaxTheme` 提供当前语法主题名称和适用于绘制的已解析颜色。

`syntaxThemes` 提供十套深浅模式配色，覆盖关键字、函数、类型、属性等语义。主题实验室的「代码配色」可以试用这些预设，并在生成的 CSS 中复制对应 Token。

SMediaTheme 的自动模式会检查实际背景和文字对比度。图片背景可同时传入 `src` 和归一化的 `region`，用文字覆盖区域取样。主题可分别设置浅色、深色媒体表面的颜色和组件样式。使用 `mode="off"` 时，内容继续沿用周围主题。

## 深色与局部主题

标准主题默认采用白色底色。设置 `data-sy-theme="system"` 可以跟随系统颜色设置。在根元素或局部容器设置 `data-sy-theme="light"` 或 `data-sy-theme="dark"`，即可给整个页面或特定区域指定模式。

```html
<section data-sy-theme="dark">
  <!-- 组件继承此区域的深色样式。 -->
</section>
```

## 按平台接入

Web 应用可用 `@syntrofic/ui/style.css` 加载完整样式，或用 `@syntrofic/ui-styles` 读取 Token、独立样式和 Tailwind 映射。Native 主题从 `@syntrofic/ui-native/theme` 获取，运行时通过 `SNativeProvider` 注入配色、字体和间距。
