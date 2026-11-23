import assert from 'node:assert/strict'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { crc32 } from 'node:zlib'
import { decodePng } from '../../scripts/platform/png-image.mjs'

test('local Chrome expands and paginates theme examples without Playwright', {
  skip: !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'syntrofic-chrome-renderer-'))
  try {
    await Promise.all(['theme-pictures.mjs', 'theme-picture-chrome.mjs', 'png-image.mjs'].map(file =>
      copyFile(new URL('../../scripts/platform/' + file, import.meta.url), join(directory, file))))
    const { captureThemePictures } = await import(pathToFileURL(join(directory, 'theme-pictures.mjs')).href)
    const panels = Array.from({ length: 9 }, (_, index) => `
      <div data-theme-variant-row style="height:400px">Example ${index + 1}</div>
    `).join('')
    const html = `<!doctype html><style>
      @keyframes loading { 0%, 100% { background: #d00 } 40%, 60% { background: #090 } }
      @media (prefers-reduced-motion: no-preference) { #loading { animation: loading 10s linear infinite } }
    </style><body style="margin:0">
      <div id="loading" style="height:12px"></div>
      <select id="theme-appearance"><option value="light">Light</option><option value="dark">Dark</option></select>
      <details data-theme-example-panel><summary>Examples</summary>${panels}</details>
      <script>document.querySelector('select').addEventListener('change', event => { document.body.dataset.syTheme = event.target.value })</script>
    </body>`
    const result = await captureThemePictures(directory, [
      { html, file: 'sheet-actions-dark.png', mode: 'dark', expand: true },
      { html: '<title>Missing theme picker</title>', file: 'broken.png', mode: 'light' },
    ])
    assert.match(result.note, /missing its appearance controls/)
    assert.ok(result.files.length > 1)
    let totalHeight = 0
    for (const [index, { file, expected }] of result.files.entries()) {
      assert.equal(file, 'sheet-actions-' + (index + 1) + '-dark.png')
      assert.equal(expected.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      const text = Buffer.from('tEXtSoftware\0Syntrofic Theme Editor')
      const metadata = -16 - text.length
      assert.ok(expected.subarray(metadata, -16).equals(text))
      assert.equal(expected.readUInt32BE(expected.length + metadata - 4), text.length - 4)
      assert.equal(expected.readUInt32BE(expected.length - 16), crc32(text))
      const height = expected.readUInt32BE(20)
      assert.ok(height <= 1600)
      const picture = decodePng(expected)
      assert.equal(picture.height, height)
      if (!index) {
        const rgba = new Uint16Array(4)
        picture.pixel(8, 5, rgba)
        assert.deepEqual([...rgba], [0, 153, 0, 255])
      }
      totalHeight += height
    }
    assert.ok(totalHeight >= 3600)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
})
