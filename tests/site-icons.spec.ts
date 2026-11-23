import { expect, test } from '@playwright/test'
import { syntroficIcons } from '../src/icons/artwork'

test.use({ baseURL: 'http://127.0.0.1:4188' })

test('the bilingual icon directory searches semantic names and downloads the shared SVG artwork', async ({ page }) => {
  await page.goto('/icons/')
  await expect(page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '图标' })).toHaveAttribute('aria-current', 'page')
  const search = page.getByRole('searchbox', { name: '搜索图标' })
  await expect(page.locator('[data-icon-entry]')).toHaveCount(Object.keys(syntroficIcons).length)
  await search.fill('放大镜')
  const entry = page.locator('[data-icon-entry="search"]')
  await expect(entry).toBeVisible()
  await expect(page.locator('[data-icon-count]')).toHaveText('1 个图标')
  const path = syntroficIcons.search.path
  await expect(entry.locator('svg path')).toHaveAttribute('d', path)
  const download = page.getByRole('link', { name: '下载搜索 SVG' })
  const href = (await download.getAttribute('href'))!
  const response = await page.request.get(href)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/svg+xml')
  expect(await response.text()).toContain(`d="${path}"`)
  const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
  expect(file.suggestedFilename()).toBe('syntrofic-search.svg')

  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/en/icons/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Syntrofic Icons')
  await page.getByRole('combobox', { name: 'Icon category' }).selectOption('navigation')
  const englishSearch = page.getByRole('searchbox', { name: 'Search icons' })
  await englishSearch.fill('not-an-icon')
  await expect(page.getByText('No icons match your search.')).toBeVisible()
  await englishSearch.fill('arrow right')
  await expect(page.locator('[data-icon-entry="arrow-right"]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the header and the Vue icon component use the same SVG as the download', async ({ page }) => {
  await page.goto('/docs/vue/components/icon/')
  const path = syntroficIcons.search.path
  await expect(page.getByRole('button', { name: '搜索官网' }).locator('svg path')).toHaveAttribute('d', path)
  const preview = page.locator('[data-component="W.icon"]')
  const builtin = preview.locator(`.sy-icon path[d="${path}"]`).first()
  await expect(builtin).toBeVisible()
  await expect(builtin).toHaveAttribute('fill', 'currentColor')
})
