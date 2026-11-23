# 更新记录

## 0.1.0 开发预览

Web 和 Native 公开组件、Pro 对标组件、Agent UI 和页面区块已接入编号工作台。品牌主题、应用模板和开发工具可独立试用。

刷新 Web 与 Native 默认主题。浅色模式改用白色页面底色和低饱和分区，操作控件采用胶囊圆角，内置中英文字体回退。紧凑日期分段和固定符号位保持编辑及更新时的布局稳定。[Web 基础组件](docs/web-foundation.md) · [Native 基础组件](docs/native-foundation.md)

修正 Web 复选框勾选和半选标记的居中。按钮默认全圆角，输入框使用 9 px，代码块使用 14 px，代码栏复制按钮使用 12 px。开发约定明确了跨页和页内切换时共享区域的位置、宽度和滚动约束。[开发约定](CONTRIBUTING.md#web-页面切换约束)

修正 Android 可变字体的字重和按钮垂直对齐，小号按钮使用 14 sp。日期输入框的日历与清除按钮保持紧凑，也保留各自的点击区域。

旧的 Code、Image、Snippet、Spacer、User 导入可以通过迁移命令更新，原有模板绑定保留。HeroUI React 代码可用同一命令查看 Vue 组件映射。[开发工具和迁移示例](docs/platform-tools.md)

工作台新增邮件出箱、会前资料、客户管线和移动支持收件箱。工作区服务提供连接器授权、Remote MCP 工具权限与审批、模型分流及额度接口。[工作台接入说明](docs/productivity-workspace.md)
