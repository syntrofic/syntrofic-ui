# 参与 Syntrofic UI

使用仓库的 Issues 报告问题或提议改进。组件问题请附验收编号、版本、平台、复现步骤、期望结果和实际结果。截图请使用示例数据并遮盖账号信息。安全问题请通过所属工作区的私有支持渠道提交。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm check:catalog
pnpm test
```

修改公开 API 时，同步相应工作台场景和文档。涉及键盘、触控、焦点恢复或减少动效的变更，在合并请求里附上验证结果。涉及 Native 时运行 `pnpm check:native`，并注明实际运行过的设备。

## Web 页面切换约束

- 跨页切换前、切换中和切换后，共用顶栏、侧栏和工具栏的屏幕坐标与可用宽度必须一致。整页正文、模板外壳和大块预览首帧直接呈现，导航指示可独立过渡。共享侧栏独立滚动，同组页面导航时在首帧恢复侧栏滚动位置。
- 页内切换时，共享标题、选项卡栏、筛选栏和触发控件必须保持原位。面板或结果改变高度时，只让受影响的区域随主题的非线性曲线调整。选中态保留控件占位，加载占位预留最终布局所需空间。
- 文档视口统一预留传统滚动条空间，所有浮层共用组件库滚动锁。连续切换从当前画面接续，并保留可用的焦点和阅读位置。启用减少动态效果时直接进入最终布局。

页面实现遵守[设计规范](site/guides/design-rules.md)和[切换稳定性规范](docs/web-standard-design.md#切换稳定性)。官网发布必须通过 `pnpm check:site-stability`。[发布流程](site/deploy/README.md)

在 GitHub 上提交问题和拉取请求。[Syntrofic UI](https://github.com/syntrofic/syntrofic-ui)

[路线图与作品展示](docs/community-and-roadmap.md) · [更新记录](CHANGELOG.md)
