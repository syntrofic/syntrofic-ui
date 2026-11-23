import { parseAgentDocument, type AgentDocument } from '../agent-ui/schema'
import { exportBrandTheme, type BrandTheme } from './theme-workspace'

export interface BuilderRevision {
  id: string
  prompt: string
  createdAt: string
  document: AgentDocument
  theme: BrandTheme
}
export interface BuilderRequest {
  prompt: string
  theme: BrandTheme
  signal?: AbortSignal
  report?: (phase: 'planning' | 'rendering' | 'validating') => void
}
export type BuilderGenerator = (request: BuilderRequest) => Promise<unknown> | unknown

export async function generateWorkspace(request: BuilderRequest, generator: BuilderGenerator): Promise<BuilderRevision> {
  const prompt = request.prompt.trim().slice(0, 8000)
  if (!prompt) throw new TypeError('Enter a workspace description')
  request.signal?.throwIfAborted()
  request.report?.('planning')
  const theme = JSON.parse(JSON.stringify(request.theme)) as BrandTheme
  const source = await generator({ ...request, prompt, theme })
  request.signal?.throwIfAborted()
  request.report?.('validating')
  return { id: globalThis.crypto.randomUUID(), prompt, createdAt: new Date().toISOString(), document: parseAgentDocument(source), theme }
}

const quoted = (input: unknown) => JSON.stringify(input, null, 2).replaceAll('<', '\\u003c')
export function exportWorkspace(revision: BuilderRevision, packageSource = '^0.1.0') {
  const theme = exportBrandTheme(revision.theme)
  const pkg = { name: 'syntrofic-workspace', private: true, type: 'module',
    scripts: { dev: 'vite', build: 'vite build' }, dependencies: { '@syntrofic/ui': packageSource, vue: '^3.5.0' },
    devDependencies: { vite: '^8.0.0', '@vitejs/plugin-vue': '^6.0.0', typescript: '^5.9.0' } }
  return {
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    'index.html': '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/src/main.ts"></script></html>\n',
    'vite.config.ts': "import vue from '@vitejs/plugin-vue'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [vue()] })\n",
    'src/main.ts': "import { createApp } from 'vue'\nimport '@syntrofic/ui/style.css'\nimport './theme.css'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n",
    'src/App.vue': `<script setup lang="ts">
import { SAgentUI } from '@syntrofic/ui'
import { config } from './document'
</script>
<template><main data-sy-theme="light" data-sy-brand="${revision.theme.id}" style="max-width:64rem;margin:2rem auto;padding:1rem"><SAgentUI :document="config" /></main></template>
`,
    'src/document.ts': `export const config = ${quoted(revision.document)} as const\n`,
    'src/theme.css': theme['theme.css'],
    'DESIGN.md': theme['DESIGN.md'],
    'README.md': '# Syntrofic 工作台\n\n运行 pnpm install 后，使用 pnpm dev 预览，或 pnpm build 构建。\n',
  }
}
