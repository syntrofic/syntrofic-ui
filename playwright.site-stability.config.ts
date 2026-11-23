import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'site-stability.spec.ts',
  workers: 1,
  projects: [{
    name: 'site-classic-scrollbar',
    use: {
      browserName: 'chromium',
      launchOptions: {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
        ignoreDefaultArgs: ['--hide-scrollbars'],
        args: ['--disable-features=OverlayScrollbar'],
      },
    },
  }],
  webServer: {
    command: 'pnpm preview:site --host 127.0.0.1 --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188',
  },
})
