import { expect, test } from '@playwright/test'

test('streaming text reveals grapheme clusters, resets on replacement and flushes on completion', async ({ page }) => {
  await page.goto('/?component=WP.markdown')
  const sample = page.getByRole('region', { name: '流式文字' })
  const output = sample.getByLabel('文字流内容')
  await sample.getByRole('button', { name: '发送文字流' }).click()
  const first = '核对交付 👩🏽‍💻，记录状态。'.repeat(42)
  await expect(output).not.toBeEmpty()
  await expect(output).not.toHaveText(first)
  expect(await output.evaluate(async (node, target) => {
    const boundaries = new Set(Array.from(new Intl.Segmenter().segment(target), entry => entry.index))
    boundaries.add(target.length)
    for (let index = 0; index < 5; index++) {
      await new Promise(resolve => requestAnimationFrame(resolve))
      if (!boundaries.has(node.textContent?.length ?? -1)) return false
    }
    return true
  }, first)).toBe(true)
  await sample.getByRole('button', { name: '更换文字流' }).click()
  await expect(output).toContainText('更新成果')
  await expect(output).not.toContainText('核对交付')
  await sample.getByRole('button', { name: '结束文字流' }).click()
  await expect(output).toHaveText('更新成果 👨‍👩‍👧‍👦，保留历史。'.repeat(24))
  await expect(output).toHaveAttribute('aria-busy', 'false')
})

test('instant and reduced-motion streaming reveal the current target immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?component=WP.markdown')
  const sample = page.getByRole('region', { name: '流式文字' })
  const output = sample.getByLabel('文字流内容')
  await sample.getByRole('button', { name: '发送文字流' }).click()
  expect(await output.textContent()).toBe('核对交付 👩🏽‍💻，记录状态。'.repeat(42))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await sample.getByLabel('播放速度').selectOption('instant')
  await sample.getByRole('button', { name: '更换文字流' }).click()
  expect(await output.textContent()).toBe('更新成果 👨‍👩‍👧‍👦，保留历史。'.repeat(24))
})
