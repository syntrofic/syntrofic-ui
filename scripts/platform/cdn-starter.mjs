import { readFile } from 'node:fs/promises'

export async function cdnStarter() {
  const styles = await Promise.all(['tokens.css', 'components.css', 'measurement.css'].map(file =>
    readFile(new URL('../../src/styles/' + file, import.meta.url), 'utf8')))
  return `<!doctype html>
<html lang="zh-CN" data-sy-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Syntrofic UI · 交付工作台</title>
  <style>
    @layer syntrofic.tokens, syntrofic.components;
    ${styles.join('\n')}
    body { margin: 0; background: var(--sy-canvas); color: var(--sy-text); font-family: var(--sy-font); }
    main { display: grid; gap: var(--sy-space-4); padding-inline: var(--sy-space-4); width: min(26rem, calc(100% - 2rem)); box-sizing: border-box; margin: 4rem auto; }
    h1 { font-size: 1.5rem; margin: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: var(--sy-space-2); }
    main .sy-measure__fill { transition: --sy-measure-fraction var(--sy-motion-replace) var(--sy-ease-settle); }
  </style>
</head>
<body>
  <div id="app"><main><h1>交付工作台</h1><p role="status">正在加载示例…</p></main></div>
  <script type="module">
    import('https://cdn.jsdelivr.net/npm/vue@3.5.45/dist/vue.esm-browser.prod.js').then(({ createApp, h, ref }) => createApp({
      setup() {
        const progress = ref(56)
        const button = (label, variant, onClick) => h('button', { type: 'button', class: 'sy-button', 'data-variant': variant, onClick }, label)
        return () => h('main', [
          h('h1', '交付工作台'),
          h('div', {
            class: 'sy-measure', role: 'progressbar', 'aria-label': '归档进度',
            'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress.value,
            style: { '--sy-arc-target': progress.value / 100 },
          }, [
            h('div', { class: 'sy-measure__caption', 'aria-hidden': 'true' }, [
              h('span', '归档进度'),
              h('span', { class: 'sy-measure__value' }, progress.value + '%'),
            ]),
            h('div', { class: 'sy-measure__track', 'aria-hidden': 'true' }, h('div', { class: 'sy-measure__fill' })),
          ]),
          h('div', { class: 'actions' }, [
            button('更新进度', 'primary', () => { progress.value = Math.min(100, progress.value + 8) }),
            button('重置', 'secondary', () => { progress.value = 56 }),
          ]),
        ])
      },
    }).mount('#app')).catch(() => {
      const status = document.querySelector('#app [role="status"]')
      if (status) status.textContent = '暂时无法加载示例。请刷新页面重试。'
    })
  </script>
</body>
</html>
`
}
