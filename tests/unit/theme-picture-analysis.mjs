import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { cliMcpCommands } from '../../scripts/platform/mcp-command-tools.mjs'
import { pngChecksum, pngSignature } from '../../scripts/platform/png-image.mjs'

const cli = fileURLToPath(new URL('../../scripts/platform/cli.mjs', import.meta.url))

function chunk(type, data) {
  const bytes = Buffer.alloc(data.length + 12)
  bytes.writeUInt32BE(data.length)
  bytes.write(type, 4)
  Buffer.from(data).copy(bytes, 8)
  bytes.writeUInt32BE(pngChecksum(bytes.subarray(4, -4)), bytes.length - 4)
  return bytes
}

function picture({ width, height, depth = 8, type = 6, interlace = 0, rows, palette, alpha }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(height, 4)
  header.set([depth, type, 0, 0, interlace], 8)
  const image = deflateSync(Buffer.from(rows))
  return Buffer.concat([pngSignature, chunk('IHDR', header), ...(palette ? [chunk('PLTE', palette)] : []),
    ...(alpha ? [chunk('tRNS', alpha)] : []), chunk('IDAT', image.subarray(0, 4)), chunk('IDAT', image.subarray(4)), chunk('IEND', [])])
}

function invoke(directory, args, experimental = false) {
  const command = spawnSync(process.execPath, [cli, ...(experimental ? ['experimental'] : []), 'theme', 'editor', 'how', ...args, '--json'],
    { cwd: directory, encoding: 'utf8' })
  if (command.error) throw command.error
  return command
}

test('how reads a screenshot by signature from the caller folder and reports exact colors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-picture-'))
  try {
    await mkdir(join(directory, 'screens'))
    await writeFile(join(directory, 'package.json'), '{"name":"screenshot-review"}')
    const image = picture({ width: 3, height: 2, rows: [
      0, 255, 255, 255, 255, 66, 88, 73, 255, 0, 0, 0, 128,
      2, 0, 0, 0, 0, 0, 0, 0, 0, 20, 30, 40, 128,
    ] })
    await writeFile(join(directory, 'screens', 'Review Capture.data'), image)
    const cwd = join(directory, 'screens')
    const input = 'Review Capture.data'
    const report = invoke(cwd, [input, '3'], true)
    assert.equal(report.status, 0, report.stderr)
    const summary = JSON.parse(report.stdout)
    assert.equal(summary.sampled, 6)
    assert.equal(summary.transparent, 1)
    assert.deepEqual(summary.pureWhite, { pixels: 2, share: 33.33 })
    assert.deepEqual(summary.colors.map(({ color, share }) => [color, share]), [['#ffffff', 40], ['#425849', 40], ['#7f7f7f', 20]])
    const coordinates = invoke(cwd, [input, '--at', '0,0; 1,0 2,0', '--at', '2,1,0,1'])
    assert.equal(coordinates.status, 0, coordinates.stderr)
    assert.deepEqual(JSON.parse(coordinates.stdout).points.map(({ at, color, samples }) => [at, color, samples.alpha]), [
      ['0,0', '#ffffff', 255], ['1,0', '#425849', 255], ['2,0', '#000000', 128], ['2,1', '#141e28', 0], ['0,1', '#ffffff', 255],
    ])
    const named = invoke(cwd, [input, '--at', '1,0', '--theme', 'morandi'])
    assert.equal(named.status, 0, named.stderr)
    assert.equal(JSON.parse(named.stdout).theme, 'morandi')
    assert.match(invoke(cwd, [input, '--at', '1,0', '--theme', 'unknown-theme']).stderr, /^ERR_UNKNOWN_THEME:/)
    assert.match(invoke(cwd, [input, '--at', '1,0', '--theme=']).stderr, /^ERR_INVALID_ARGUMENT:/)
    const mcp = await cliMcpCommands(directory)
    assert.equal(mcp.tools.filter(tool => tool.name === 'theme_editor_how').length, 1)
    const inspected = await mcp.invoke('theme_editor_how', { filter: 'screens/Review Capture.data', at: ['1,0'] })
    assert.equal(JSON.parse(inspected.text).points[0].color, '#425849')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('PNG inspection retains indexed Adam7 transparency and original 16-bit samples', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-picture-depth-'))
  try {
    const indexed = picture({ width: 2, height: 2, depth: 2, type: 3, interlace: 1,
      rows: [0, 0, 0, 0x40, 0, 0xb0], palette: [255, 255, 255, 66, 88, 73, 255, 0, 0, 0, 0, 255], alpha: [0, 128] })
    const highDepth = picture({ width: 1, height: 1, depth: 16, rows: [0, 0x12, 0x34, 0x56, 0x78, 0xab, 0xcd, 0x80, 0x01] })
    const trueColor = picture({ width: 2, height: 1, type: 2,
      rows: [0, 66, 88, 73, 255, 255, 255], alpha: [0, 66, 0, 88, 0, 73] })
    await Promise.all([writeFile(join(directory, 'indexed.png'), indexed), writeFile(join(directory, 'deep.png'), highDepth),
      writeFile(join(directory, 'transparent.png'), trueColor)])
    const indices = invoke(directory, ['indexed.png', '--at', '0,0;1,0;0,1;1,1'])
    assert.equal(indices.status, 0, indices.stderr)
    assert.deepEqual(JSON.parse(indices.stdout).points.map(({ color, samples }) => [color, samples.alpha]), [
      ['#ffffff', 0], ['#425849', 128], ['#ff0000', 255], ['#0000ff', 255],
    ])
    const deep = invoke(directory, ['deep.png', '--at=0,0'])
    assert.equal(deep.status, 0, deep.stderr)
    const point = JSON.parse(deep.stdout).points[0]
    assert.equal(point.color, '#1256ab')
    assert.equal(point.alpha, 0x8001 / 0xffff)
    assert.deepEqual(point.samples, { red: 0x1234, green: 0x5678, blue: 0xabcd, alpha: 0x8001, max: 0xffff })
    const keyed = invoke(directory, ['transparent.png', '--at=0,0;1,0'])
    assert.equal(keyed.status, 0, keyed.stderr)
    assert.deepEqual(JSON.parse(keyed.stdout).points.map(({ color, alpha }) => [color, alpha]), [['#425849', 0], ['#ffffff', 1]])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('PNG inspection rejects invalid coordinates, payloads and oversized dimensions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-picture-errors-'))
  try {
    const valid = picture({ width: 1, height: 1, rows: [0, 255, 255, 255, 255] })
    const corrupt = Buffer.from(valid)
    corrupt[corrupt.length - 1] ^= 1
    await Promise.all(Object.entries({ 'ok.png': valid, 'broken.png': corrupt,
      'short.png': picture({ width: 2, height: 1, rows: [0, 255, 255, 255, 255] }),
      'overflow.png': picture({ width: 1, height: 1, rows: new Array(8192).fill(0) }),
      'oversized.png': picture({ width: 20_000_001, height: 1, depth: 16, rows: [] }),
      'picture.jpg': Buffer.from([255, 216, 255, 224]),
    }).map(([path, bytes]) => writeFile(join(directory, path), bytes)))
    for (const [args, message] of [
      [['ok.png', '--at', '0,1'], /outside 1 × 1/],
      [['ok.png', '--at=-1,0'], /whole pixel coordinates/],
      [['ok.png', '--at', '1.5,0'], /whole pixel coordinates/],
      [['ok.png', '3', '--at', '0,0'], /instead of a palette size/],
      [['ok.png', '0'], /Choose 1 to 256 colors/],
      [['--at', '0,0'], /with one PNG file/],
      [['broken.png'], /checksum/], [['short.png'], /pixel data/], [['overflow.png'], /compressed PNG pixel data/],
      [['oversized.png'], /20,000,000 pixels/], [['picture.jpg'], /Only PNG/], [['missing.png'], /ENOENT/],
    ]) {
      const result = invoke(directory, args)
      assert.equal(result.status, 1, args.join(' '))
      assert.match(result.stderr, message)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('screenshot measurements agree at different pixel densities and validate scoped theme commands', {
  skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-picture-geometry-'))
  const { chromium } = await import('@playwright/test')
  const { createBrandTheme } = await import('@syntrofic/ui')
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  const html = `<!doctype html><style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: white; color: #252525; font: 15px/22px system-ui; }
    .row { display: flex; gap: 16px; margin-bottom: 18px; }
    button { width: 150px; height: 40px; border: 0; border-radius: 20px; background: #425849; color: white; font: inherit; }
    .input { display: flex; align-items: center; width: 280px; height: 36px; padding-inline: 12px; border: 2px solid #898f89; border-radius: 8px; }
    .check { width: 22px; height: 22px; border: 1px solid #626d64; border-radius: 4px; }
    .panel { width: 325px; padding: 20px; border: 1px solid #c8ceca; border-radius: 14px / 10px; }
    </style>
    <div class="row"><button>Save project</button><button>View records</button><button>Update content</button></div>
    <div class="row"><div class="input">Email address</div><div class="input">Project name</div></div>
    <div class="row"><div class="check"></div><div class="check"></div><div class="check"></div></div>
    <div class="row"><div class="panel">Find the white surfaces in this project.<br>Check the width and shape of each border.<br>Keep the text comfortable to read.</div>
      <div class="panel">Review the reference before editing.<br>Copy the color from a specific location.<br>Apply the change in the right scope.</div></div>`
  try {
    const registry = join(directory, 'syntrofic.themes.json')
    const state = { version: 1, active: 'studio', themes: [createBrandTheme('studio', 'Studio')] }
    await writeFile(registry, JSON.stringify(state))
    await writeFile(join(directory, 'package.json'), '{"name":"picture-geometry"}')
    const reference = [
      ['button-like', 'height', 40], ['button-like', 'corners', { horizontal: 20, vertical: 20 }], ['button-like', 'accent-fill', '#425849'],
      ['inputs', 'height', 36], ['inputs', 'border-width', 2], ['checkbox-like', 'box-size', 22], ['checkbox-like', 'box-width', 22],
      ['containers', 'corners', { horizontal: 14, vertical: 10 }], ['containers', 'border-width', 1], ['containers', 'surface', 'outlined'],
      ['panel-text', 'line-spacing', 22],
    ]
    for (const scale of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 800, height: 480 }, deviceScaleFactor: scale })
      await page.setContent(html)
      const screenshot = await page.screenshot()
      await page.close()
      const density = Buffer.alloc(9)
      density.writeUInt32BE(Math.round(72 * scale / .0254))
      density.writeUInt32BE(density.readUInt32BE(0), 4)
      density[8] = 1
      const path = `reference-${scale}.png`
      await writeFile(join(directory, path), Buffer.concat([screenshot.subarray(0, 33), chunk('pHYs', density), screenshot.subarray(33)]))
      const requested = invoke(directory, [path, '2', '--theme', 'studio'])
      assert.equal(requested.status, 0, requested.stderr)
      const { measurements, theme } = JSON.parse(requested.stdout)
      assert.equal(theme, 'studio')
      assert.deepEqual(measurements.ratio, { value: scale, source: 'png-density' })
      for (const [on, trait, value] of reference) {
        const reading = measurements.traits.find(item => item.trait === trait && item.on === on)
        assert.deepEqual(reading?.value, value, `${on} ${trait} at ${scale}×`)
        assert.ok(reading.evidence.length >= 2)
      }
      const radius = measurements.traits.find(item => item.trait === 'corners' && item.on === 'containers').setting
      assert.equal(radius.command, "syntrofic theme editor set studio border-radius '14px / 10px' --on containers")
      const checkbox = measurements.traits.find(item => item.trait === 'box-width').setting
      assert.equal(checkbox.command, 'syntrofic theme editor set studio width 22px --on checkbox --only')
      const overridden = invoke(directory, [path, '1', '--pixel-ratio', String(scale)])
      assert.deepEqual(JSON.parse(overridden.stdout).measurements.ratio, { value: scale, source: 'option' })
    }

    const page = await browser.newPage({ viewport: { width: 520, height: 180 } })
    await page.setContent('<body style="margin:20px"><button style="width:160px;height:28px">Save project</button> <button style="width:160px;height:56px">View records</button></body>')
    await page.screenshot({ path: join(directory, 'mixed.png') })
    await page.close()
    const conflict = JSON.parse(invoke(directory, ['mixed.png']).stdout).measurements
    assert.ok(conflict.unsure.some(item => item.trait === 'height' && item.reason === 'not-enough-agreeing-boxes'))
    assert.ok(!conflict.traits.some(item => item.trait === 'height'))
    assert.equal(await readFile(registry, 'utf8'), JSON.stringify(state))
    assert.deepEqual((await readdir(directory)).sort(), ['mixed.png', 'package.json', 'reference-1.png', 'reference-2.png', 'syntrofic.themes.json'])
  } finally {
    await browser.close()
    await rm(directory, { recursive: true, force: true })
  }
})
