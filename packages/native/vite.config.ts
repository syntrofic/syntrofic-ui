import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as compiler from '@vue/compiler-sfc'
import ts from 'typescript'

compiler.registerTS(() => ts)

export default defineConfig({
  plugins: [vue({ compiler })],
  resolve: { alias: { vue: 'nativescript-vue' } },
  build: {
    minify: false,
    target: 'es2022',
    lib: {
      entry: {
        index: 'src/index.ts',
        theme: 'src/theme.ts',
        radio: 'src/radio.ts',
        'sub-menu': 'src/sub-menu.ts',
        'glass-view': 'src/glass-view.ts',
        'theme-background': 'src/theme-background.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      external: id => id === 'nativescript-vue' || id.startsWith('@nativescript/core') || id === '@nativescript-community/ui-bottomsheet',
    },
  },
})
