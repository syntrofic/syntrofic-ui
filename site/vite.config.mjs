import { readFileSync } from 'node:fs'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { Features } from 'lightningcss'
import { defineConfig } from 'vite'
import { reducedMotionCss } from '../scripts/reduced-motion-css.mjs'
import { blogFeed, blogIndex, englishBlogFeed, englishBlogIndex, englishSearchIndex, renderPage, routes, sitemap, searchIndex } from './pages.mjs'
import { retryImports } from './retry-imports.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const outDir = fileURLToPath(new URL('../dist-site/', import.meta.url))
const generated = new Map([
  ['/search-index.json', searchIndex], ['/en/search-index.json', englishSearchIndex],
  ['/blog/feed.json', blogIndex], ['/en/blog/feed.json', englishBlogIndex],
  ['/blog/feed.xml', blogFeed], ['/en/blog/feed.xml', englishBlogFeed],
  ['/design-rules.md', readFileSync(new URL('./guides/design-rules.md', import.meta.url), 'utf8')],
  ['/en/design-rules.md', readFileSync(new URL('./guides/en/design-rules.md', import.meta.url), 'utf8')],
  ['/sitemap.xml', sitemap],
])

function staticPages() {
  let building = false
  return {
    name: 'syntrofic-static-pages',
    configResolved(config) {
      building = config.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        if (generated.has(path)) {
          const contentType = path.endsWith('.md') ? 'text/markdown' : path.endsWith('.xml') ? 'application/xml' : 'application/json'
          response.setHeader('Content-Type', contentType + '; charset=utf-8')
          return response.end(generated.get(path))
        }
        const route = path.endsWith('/') ? path : path + '/'
        if (!routes.has(route) && !/^\/(?:en\/|docs\/|templates\/)/.test(path)) return next()
        const template = await readFile(join(root, 'index.html'), 'utf8')
        response.statusCode = routes.has(route) ? 200 : 404
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(await server.transformIndexHtml(path, renderPage(template, route)))
      })
    },
    async closeBundle() {
      if (!building || this.environment.name !== 'client') return
      const template = await readFile(join(outDir, 'index.html'), 'utf8')
      if (!template.includes('<!-- site-head -->') || !template.includes('<!-- site-body -->')) {
        throw new Error('The built site template is missing its page markers')
      }
      await Promise.all([...routes.keys(), '/404.html'].map(async route => {
        const file = join(outDir, route, route.endsWith('/') ? 'index.html' : '')
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, renderPage(template, route))
      }))
      for (const [path, source] of generated) await writeFile(join(outDir, path), source)
      await cp(new URL('../LICENSES/', import.meta.url), join(outDir, 'licenses'), { recursive: true })
    },
  }
}

export default defineConfig({
  root,
  plugins: [vue(), retryImports(root), staticPages()],
  css: { lightningcss: { exclude: Features.DirSelector }, postcss: { plugins: [reducedMotionCss()] } },
  build: {
    outDir, emptyOutDir: true, license: { fileName: 'licenses/bundled.md' },
    rolldownOptions: { output: { codeSplitting: { groups: [
      // Preview components share Vue DOM helpers without depending on the recoverable bootstrap chunk.
      { name: 'site-vue-dom', test: /\/@vue\/runtime-dom\//, includeDependenciesRecursively: false },
    ] } } },
  },
})
