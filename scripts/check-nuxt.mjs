import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixture = fileURLToPath(new URL('../fixtures/nuxt/', import.meta.url))
const workspace = await mkdtemp(join(tmpdir(), 'syntrofic-nuxt-'))
const env = { ...process.env, NUXT_TELEMETRY_DISABLED: '1' }
let child
let browser

function run(args, cwd) {
  const result = spawnSync('pnpm', args, { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `pnpm ${args.join(' ')} failed`)
}

async function freePort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const address = probe.address()
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()))
  return address.port
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 75; attempt++) {
    assert.equal(child.exitCode, null, 'Nuxt preview process exited before it was ready')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return await response.text()
    } catch (error) {
      if (!['TypeError', 'TimeoutError'].includes(error.name)) throw error
    }
    await setTimeout(200)
  }
  throw new Error('Nuxt preview did not respond before the timeout')
}

try {
  await cp(fixture, workspace, { recursive: true })
  run(['pack', '--pack-destination', workspace], root)
  const tarball = (await readdir(workspace)).find(file => file.endsWith('.tgz'))
  assert(tarball)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  await writeFile(join(workspace, 'package.json'), JSON.stringify({
    name: 'syntrofic-ui-nuxt-consumer',
    type: 'module',
    private: true,
    dependencies: {
      nuxt: '4.6.4', vue: '3.5.45', '@syntrofic/ui': `file:${tarball}`,
      '@internationalized/date': manifest.dependencies['@internationalized/date'],
    },
  }))
  run(['install', '--prefer-offline', '--ignore-scripts'], workspace)
  run(['exec', 'nuxt', 'build'], workspace)

  const port = await freePort()
  child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: workspace, env: { ...env, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' }, stdio: 'inherit',
  })
  const url = `http://127.0.0.1:${port}/`
  const markup = await waitForServer(url)
  assert.match(markup, /<h1>项目管理<\/h1>/)
  assert.match(markup, /aria-rowcount="101"/)
  assert.match(markup, /aria-colcount="13"/)
  assert.match(markup, /data-table-column-key="cycle-1"/)
  assert.doesNotMatch(markup, /data-table-column-key="cycle-12"/)
  assert.match(markup, /data-table-pin="start"/)
  assert.match(markup, /aria-label="筛选项目名称"/)
  assert.match(markup, /aria-label="打开发布日期日历"/)
  assert.match(markup, /aria-label="发布周历"[^>]*data-view="week"[^>]*dir="rtl"/)
  assert.match(markup, /data-reka-year-picker-cell-trigger/)
  assert.match(markup, /aria-haspopup="dialog"[^>]*>[\s\S]*查看发布设置/)
  assert.match(markup, /lang="zh-CN" dir="ltr"/)
  assert.match(markup, /sy-color-input-group/)
  assert.match(markup, /<table[^>]*>[\s\S]*项目 1/)
  assert.match(markup, /<!--sy-layer-anchor-->/)
  assert.doesNotMatch(markup, /浮层内容在展开时显示/)

  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  const page = await browser.newPage()
  page.setDefaultTimeout(4000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydration.*mismatch|mismatch.*hydration/i.test(message.text())) errors.push(message.text())
  })
  await page.goto(url)
  const releaseAuxiliary = page.getByRole('region', { name: '发布工具' })
  const releaseTrigger = releaseAuxiliary.getByRole('button', { name: '显示发布辅助图层' })
  const releaseLayer = releaseAuxiliary.locator(':scope > [aria-label="发布辅助图层"]')
  await releaseTrigger.press('Enter')
  await releaseLayer.waitFor()
  assert.equal(await releaseTrigger.getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Escape')
  await releaseLayer.waitFor({ state: 'detached' })
  assert.equal(await releaseAuxiliary.locator('p').evaluate(node =>
    Array.from(node.childNodes).filter(child => child.nodeType === Node.COMMENT_NODE && child.data === 'sy-layer-anchor').length), 1)
  const query = page.getByRole('textbox', { name: '查找项目' })
  await query.fill('品牌')
  const tableViewport = page.getByRole('region', { name: '项目列表' })
  await tableViewport.waitFor()
  assert.equal(await tableViewport.evaluate(node => node.clientHeight), 238)
  await tableViewport.evaluate(node => { node.scrollTop = node.scrollHeight; node.scrollLeft = node.scrollWidth })
  await page.getByRole('rowheader', { name: '项目 100', exact: true }).waitFor()
  await page.getByRole('columnheader', { name: '周期 12', exact: true }).waitFor()
  assert.equal(await page.getByRole('columnheader', { name: '周期 12', exact: true }).getAttribute('aria-colindex'), '13')
  await tableViewport.getByRole('button', { name: '筛选项目名称' }).press('Enter')
  const tableFilter = page.getByRole('dialog', { name: '筛选项目名称' })
  await tableFilter.getByRole('textbox').fill('项目 100')
  await tableFilter.getByRole('button', { name: '应用' }).press('Enter')
  await page.getByRole('rowheader', { name: '项目 100', exact: true }).waitFor()
  assert.equal(await tableViewport.getByRole('rowheader').count(), 1)
  await page.getByRole('button', { name: '归档项目' }).click()
  const dialog = page.getByRole('dialog', { name: '归档项目？' })
  await dialog.getByRole('button', { name: '取消' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('combobox', { name: '分类' }).press('ArrowDown')
  await page.getByRole('option', { name: '产品' }).click()
  assert.equal(await page.getByRole('option', { name: '产品' }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '打开发布日期日历' }).click()
  const datePicker = page.getByRole('dialog', { name: '打开发布日期日历' })
  await datePicker.getByRole('grid').waitFor()
  assert.equal(await datePicker.getByRole('gridcell').count(), 5)
  await datePicker.locator('[data-value="2026-11-20"]').click()
  await datePicker.waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('group', { name: '发布日期' }).getByRole('spinbutton', { name: '日', exact: true }).getAttribute('aria-valuenow'), '20')
  const week = page.getByRole('group', { name: '发布周历' })
  assert.equal(await week.getByRole('gridcell').count(), 14)
  assert.equal(await week.locator('[data-value="2026-11-20"]').getAttribute('data-selected'), 'true')
  const drawerTrigger = page.getByRole('button', { name: '查看发布设置' })
  await drawerTrigger.click()
  const drawer = page.getByRole('dialog', { name: '发布设置' })
  assert.equal(await drawer.getByRole('progressbar', { name: '同步进度' }).getAttribute('aria-valuenow'), '72')
  await drawer.getByRole('button', { name: '关闭设置' }).click()
  await drawer.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: '打开品牌色' }).click()
  const colors = page.getByRole('dialog', { name: '打开品牌色' })
  const hex = colors.getByRole('textbox', { name: '品牌色值' })
  await hex.fill('#89AB')
  await hex.press('Enter')
  assert.equal(await hex.inputValue(), '#8899AABB')
  await colors.getByRole('button', { name: '完成取色' }).click()
  await colors.waitFor({ state: 'hidden' })
  assert.equal(await query.inputValue(), '品牌')
  assert.deepEqual(errors, [])
  console.log('Nuxt rendered and hydrated the packed controls without mismatch messages.')
} finally {
  await browser?.close()
  if (child && child.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => {
      child.once('exit', resolve)
      child.kill('SIGTERM')
    })
  }
  await rm(workspace, { recursive: true, force: true })
}
