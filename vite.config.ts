import vue from '@vitejs/plugin-vue'
import { Features } from 'lightningcss'
import { defineConfig } from 'vite'
import { reducedMotionCss } from './scripts/reduced-motion-css.mjs'

const libraryEntries = {
  index: 'src/index.ts',
  variants: 'src/platform/variants.ts',
  map: 'src/map.ts',
  'color-input-group': 'src/components/SColorInputGroup.vue',
  rac: 'src/rac/index.ts',
  'rich-text-editor': 'src/components/SRichTextEditor.vue',
  markdown: 'src/markdown.ts',
  'code-block': 'src/components/SCodeBlock.vue',
  'number-stepper': 'src/components/SNumberStepper.vue',
  'calendar-year-picker': 'src/components/SCalendarYearPicker.vue',
  'date-input-group': 'src/components/SDateInputGroup.vue',
  'empty-state': 'src/components/SEmptyState.vue',
  'header': 'src/components/SHeader.vue',
  'list-box-item': 'src/components/SListBoxItem.vue',
  'list-box-section': 'src/components/SListBoxSection.vue',
  'menu': 'src/components/SMenu.vue',
  'menu-item': 'src/components/SMenuItem.vue',
  'menu-section': 'src/components/SMenuSection.vue',
  'radio': 'src/components/SRadio.vue',
  'switch-group': 'src/components/SSwitchGroup.vue',
  'tag': 'src/components/STag.vue',
}

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  base: './',
  define: mode === 'theme-sheet' ? { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' } : undefined,
  experimental: mode === 'library' ? {
    renderBuiltUrl(filename, { hostType }) {
      // Library CSS and its font files are emitted in the same directory.
      if (hostType === 'css' && filename.endsWith('.woff2')) return `./${filename}`
    },
  } : undefined,
  css: {
    // Preserve direction inherited from a local dir attribute in production CSS.
    lightningcss: { exclude: Features.DirSelector },
    postcss: {
      plugins: [reducedMotionCss(), {
        postcssPlugin: 'syntrofic-font-assets',
        Once(root) {
          root.walkDecls('src', declaration => {
            if (!declaration.source?.input.file?.includes('@fontsource-variable')) return
            declaration.value = declaration.value.replace(/\.woff2(?=[)'"])/g, '.woff2?no-inline')
          })
        },
      }],
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/core', '@tiptap/pm/state', '@tiptap/vue-3', '@tiptap/vue-3/menus',
      '@tiptap/extensions', '@tiptap/starter-kit', '@tiptap/suggestion', 'markdown-it', 'lowlight', 'embla-carousel', 'maplibre-gl',
    ],
  },
  build: mode === 'library'
    ? {
        license: { fileName: 'licenses/bundled.md' },
        lib: {
          entry: libraryEntries,
          formats: ['es'],
          fileName: (_, entryName) => `${entryName}.js`,
          cssFileName: 'style',
        },
        rolldownOptions: { external: id => ['vue', 'reka-ui', '@tanstack/vue-virtual', '@internationalized/date', 'markdown-it', 'lowlight', 'embla-carousel', 'maplibre-gl', 'vega-embed', 'three'].includes(id) || id.startsWith('three/') || id.startsWith('@tiptap/') },
      }
    : mode === 'theme-sheet'
      ? {
          outDir: 'dist/theme-sheet',
          emptyOutDir: true,
          license: { fileName: 'licenses/bundled.md' },
          lib: { entry: 'preview/theme-sheet.ts', name: 'SyntroficThemeSheet', formats: ['iife'], fileName: () => 'sheet.js', cssFileName: 'sheet' },
          assetsInlineLimit: Infinity,
        }
      : { outDir: 'dist-preview' },
}))
