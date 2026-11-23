import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4177'

export default defineConfig({
  testDir: './tests',
  use: { baseURL },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: [
    { command: 'pnpm build:preview && pnpm preview --host 127.0.0.1 --port 4177 --strictPort', url: baseURL },
    { command: 'pnpm build:site && pnpm preview:site --host 127.0.0.1 --port 4188 --strictPort', url: 'http://127.0.0.1:4188' },
  ],
})
