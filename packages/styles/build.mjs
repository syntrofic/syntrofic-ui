import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const source = new URL('../../src/styles/', import.meta.url)
const output = new URL('./dist/', import.meta.url)
const pieces = new URL('components/', output)
const fontFiles = new URL('fonts/', output)
const input = await readFile(new URL('index.css', source), 'utf8')
const entries = [...input.matchAll(/@import '\.\/([\w.-]+\.css)';/g)].map(match => match[1])
if (!entries.length) throw new Error('CSS entry list is empty')
const styles = await Promise.all(entries.map(name => readFile(new URL(name, source), 'utf8')))
const fonts = [...input.matchAll(/@import '(@fontsource-variable\/[\w-]+)';/g)].map(match => match[1])
const require = createRequire(import.meta.url)
await Promise.all([mkdir(pieces, { recursive: true }), mkdir(fontFiles, { recursive: true })])
const fontStyles = await Promise.all(fonts.map(async name => {
  const packageRoot = dirname(require.resolve(name + '/package.json'))
  const css = await readFile(join(packageRoot, 'index.css'), 'utf8')
  const assets = [...new Set([...css.matchAll(/url\(\.\/files\/([\w.-]+\.woff2)\)/g)].map(match => match[1]))]
  await Promise.all([
    ...assets.map(asset => copyFile(join(packageRoot, 'files', asset), new URL(asset, fontFiles))),
    copyFile(join(packageRoot, 'LICENSE'), new URL(name.split('/')[1] + '-OFL.txt', fontFiles)),
  ])
  return css.replaceAll('url(./files/', 'url(./fonts/')
}))
await Promise.all(styles.map((css, index) => writeFile(new URL(entries[index], pieces), css)))
await writeFile(new URL('style.css', output), [...fontStyles, ...styles].join('\n'))
await writeFile(new URL('tokens.css', output), [...fontStyles, styles[entries.indexOf('tokens.css')]].join('\n'))
await writeFile(new URL('tailwind.css', output), `@import './tokens.css';
@theme inline {
  --color-sy-canvas: var(--sy-canvas);
  --color-sy-surface: var(--sy-surface);
  --color-sy-text: var(--sy-text);
  --color-sy-accent: var(--sy-accent);
  --color-sy-border: var(--sy-border);
  --font-sy: var(--sy-font);
  --radius-sy: var(--sy-radius-md);
}
`)
