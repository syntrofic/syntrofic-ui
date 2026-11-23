# Contabo 静态发布

官网由 Contabo 上的共享 Caddy 提供服务。DNSPod 的 `ui` A 记录指向 Contabo，由 Caddy 管理 HTTPS 证书。所有页面在构建阶段生成，服务器直接读取静态文件。

## 发布

在项目根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build:site
./site/deploy/publish.sh contabo-fr
curl -fsS https://ui.syntrofic.com/healthz
```

发布脚本先在启用传统滚动条的 Chromium 中检查构建产物。下拉框、模态浮层或组件目录切换影响共享页面坐标时，检查会阻止上传。也可单独运行 `pnpm check:site-stability`。

检查通过后，脚本把构建产物上传到 `/var/www/syntrofic-ui/releases/`，按指纹追加静态资源，最后原子切换 `current` 软链。各次发布共用 `/var/www/syntrofic-ui/assets/`，已打开页面仍可加载上一个版本的指纹资源。

首次启用站点时，将本目录的 `Caddyfile` 装到 `/etc/caddy/syntrofic-ui.caddy`，在主配置中添加 `import /etc/caddy/syntrofic-ui.caddy`。用 `caddy validate --config /etc/caddy/Caddyfile` 验证后运行 `systemctl reload caddy`。日常更新运行发布命令即可。

## 回滚

在 Contabo 的 `/var/www/syntrofic-ui/` 中查看 `readlink current` 和 `ls releases`。确认目标版本后原子切换：

```sh
cd /var/www/syntrofic-ui
flock .publish.lock sh -c 'ln -s "releases/$1" .rollback && mv -Tf .rollback current' sh <release>
```

用首页、文档深链接和 `/healthz` 检查回滚结果。
