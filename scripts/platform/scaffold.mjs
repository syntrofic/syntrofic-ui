import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

const webScene = `<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SProgressBar } from '@syntrofic/ui'
const value = ref(56)
</script>
<template>
  <main style="max-width:26rem;margin:4rem auto;display:grid;gap:1rem">
    <h1>交付工作台</h1>
    <SProgressBar label="归档进度" :value="value" />
    <SButton @click="value = Math.min(100, value + 5)">更新进度</SButton>
  </main>
</template>
`
const nativeScene = `<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeButton, SNativeProgressBar, SNativeProvider } from '@syntrofic/ui-native'
const value = ref(56)
</script>
<template>
  <Page>
    <ActionBar title="交付工作台" />
    <SNativeProvider>
      <StackLayout padding="16">
        <SNativeProgressBar label="归档进度" :value="value" />
        <SNativeButton label="更新进度" marginTop="7" @tap="value = Math.min(100, value + 5)" />
      </StackLayout>
    </SNativeProvider>
  </Page>
</template>
`
const nativeFiles = [
  'App_Resources/Android/src/main/AndroidManifest.xml',
  'App_Resources/Android/src/main/res/values/syntrofic-theme.xml',
  'App_Resources/iOS/Info.plist',
  'App_Resources/iOS/LaunchScreen.storyboard',
  'webpack.config.js',
  'tsconfig.json',
  'vue-shim.d.ts',
]
const starter = Object.fromEntries(await Promise.all(nativeFiles.map(async file => [
  file === 'vue-shim.d.ts' ? 'src/vue-shim.d.ts' : file,
  await readFile(new URL('./native-starter/' + file, import.meta.url), 'utf8'),
])))
export function scaffold(type, name, source) {
  const native = type === 'native'
  const nuxt = type === 'nuxt'
  const manifest = {
    name, private: true, ...(native ? {} : { type: 'module' }), scripts: native ? { android: 'ns run android', ios: 'ns run ios', 'bundle:android': 'webpack --env android --env production' }
      : nuxt ? { dev: 'nuxt dev', build: 'nuxt build' } : { dev: 'vite', build: 'vite build' },
    dependencies: native ? { '@syntrofic/ui-native': source, '@nativescript/core': '^9.1.0', 'nativescript-vue': '^3.1.3' }
      : { '@syntrofic/ui': source, vue: '^3.5.0', ...(nuxt ? { nuxt: '^4.0.0' } : {}) },
    devDependencies: native ? { nativescript: '^9.1.0', '@nativescript/webpack': '5.0.41', webpack: '5.112.2', 'webpack-cli': '6.0.1', typescript: '^5.9.0' }
      : { typescript: '^5.9.0', ...(!nuxt && { vite: '^8.0.0', '@vitejs/plugin-vue': '^6.0.0' }) },
  }
  const packageJson = JSON.stringify(manifest, null, 2) + '\n'
  if (native) return {
    ...starter,
    'package.json': JSON.stringify({ ...manifest, main: 'src/main.ts' }, null, 2) + '\n',
    'src/App.vue': nativeScene, 'src/main.ts': "import { createApp } from 'nativescript-vue'\nimport App from './App.vue'\ncreateApp(App).start()\n",
    'nativescript.config.ts': "export default { id: 'org.syntrofic.starter', appPath: 'src', appResourcesPath: 'App_Resources' }\n",
  }
  if (nuxt) return { 'package.json': packageJson, 'app/app.vue': webScene,
    'nuxt.config.ts': "export default defineNuxtConfig({ css: ['@syntrofic/ui/style.css'], build: { transpile: ['@syntrofic/ui'] } })\n" }
  return { 'package.json': packageJson, 'src/App.vue': webScene,
    'src/main.ts': "import { createApp } from 'vue'\nimport '@syntrofic/ui/style.css'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n",
    'index.html': '<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/src/main.ts"></script></html>\n',
    'vite.config.ts': "import vue from '@vitejs/plugin-vue'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [vue()] })\n",
  }
}

export async function emitFiles(directory, files, overwrite = false) {
  const mapped = Object.entries(files).map(([key, value]) => [resolve(directory, key), value])
  if (!overwrite) {
    for (const [file] of mapped) {
      let existing = true
      try { await access(file) } catch (error) { if (error.code === 'ENOENT') existing = false; else throw error }
      if (existing) throw new Error('File already exists: ' + file)
    }
  }
  for (const [file, content] of mapped) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content, { flag: overwrite ? 'w' : 'wx' })
  }
}
