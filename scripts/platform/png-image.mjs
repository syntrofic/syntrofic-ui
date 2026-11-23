import * as zlib from 'node:zlib'

export const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const crcTable = zlib.crc32 ? undefined : Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  return value
})

// Older supported Node releases do not provide the native checksum.
export function pngChecksum(bytes) {
  if (zlib.crc32) return zlib.crc32(bytes)
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255]
  return (crc ^ 0xffffffff) >>> 0
}

const colorTypes = {
  0: { channels: 1, depths: [1, 2, 4, 8, 16] },
  2: { channels: 3, depths: [8, 16] },
  3: { channels: 1, depths: [1, 2, 4, 8] },
  4: { channels: 2, depths: [8, 16] },
  6: { channels: 4, depths: [8, 16] },
}
const adam7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]

export function pngHeader(bytes) {
  if (!bytes.subarray(0, 8).equals(pngSignature)) throw new Error('Only PNG images can be inspected')
  if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Missing PNG image header')
  }
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  const [depth, type, compression, filter, interlace] = bytes.subarray(24, 29)
  const format = colorTypes[type]
  if (!width || !height || !format?.depths.includes(depth) || compression || filter || interlace > 1) {
    throw new Error('Invalid PNG dimensions or pixel format')
  }
  const limit = depth === 16 ? 20_000_000 : 40_000_000
  if (width > limit / height) throw new Error(`PNG dimensions exceed ${limit.toLocaleString('en-US')} pixels`)
  return { width, height, depth, type, channels: format.channels, interlace }
}

function imageChunks(bytes, { type, depth }) {
  let imageData, firstData, compressedLength = 0
  let startedData = false, endedData = false
  let palette, transparency, density
  for (let start = 8; start + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(start)
    const name = bytes.toString('latin1', start + 4, start + 8)
    const payload = start + 8
    const checksumAt = payload + length
    if (length > 0x7fffffff || checksumAt + 4 > bytes.length) throw new Error(`Incomplete PNG chunk ${name}`)
    if (!/^[A-Za-z]{4}$/.test(name) || pngChecksum(bytes.subarray(start + 4, checksumAt)) !== bytes.readUInt32BE(checksumAt)) {
      throw new Error(`Invalid PNG chunk or checksum (${JSON.stringify(name)})`)
    }
    const data = bytes.subarray(payload, checksumAt)
    if (startedData && name !== 'IDAT') endedData = true
    switch (name) {
      case 'IHDR':
        if (start !== 8) throw new Error('Repeated PNG image header')
        break
      case 'PLTE':
        if (palette || transparency || startedData || type === 0 || type === 4 ||
            !length || length % 3 || length > 3 * (type === 3 ? 2 ** depth : 256)) throw new Error('Invalid PNG palette')
        palette = data
        break
      case 'tRNS': {
        const allowed = type === 0 && length === 2 || type === 2 && length === 6 ||
          type === 3 && palette && length && length <= palette.length / 3
        if (transparency || startedData || !allowed) throw new Error('Invalid PNG transparency data')
        transparency = data
        break
      }
      case 'pHYs':
        if (!startedData && length === 9 && data[8] === 1) {
          density = { x: data.readUInt32BE(0), y: data.readUInt32BE(4) }
        }
        break
      case 'IDAT':
        if (endedData || type === 3 && !palette) throw new Error('PNG image data is out of order')
        startedData = true
        if (!length) break
        if (!firstData) firstData = data
        else {
          if (!imageData) {
            imageData = Buffer.allocUnsafe(bytes.length)
            compressedLength = firstData.copy(imageData)
          }
          compressedLength += data.copy(imageData, compressedLength)
        }
        break
      case 'IEND':
        if (length || !firstData) throw new Error('Invalid PNG image trailer')
        return { palette, transparency, density, compressed: imageData?.subarray(0, compressedLength) ?? firstData }
      default:
        if (name[0] < 'a') throw new Error(`Unsupported critical PNG chunk ${name}`)
    }
    start = checksumAt + 4
  }
  throw new Error('Missing PNG image trailer')
}

function paeth(left, above, diagonal) {
  const estimate = left + above - diagonal
  const dl = Math.abs(estimate - left), da = Math.abs(estimate - above), dd = Math.abs(estimate - diagonal)
  return dl <= da && dl <= dd ? left : da <= dd ? above : diagonal
}

const filters = [null, left => left, (_, above) => above, (left, above) => (left + above) >>> 1, paeth]

function unpackRows(rows, passes, pixelBytes) {
  for (const pass of passes) {
    const { offset, rowBytes, rows: height } = pass
    const stride = rowBytes + 1
    for (let y = 0, cursor = offset; y < height; y++, cursor += stride) {
      const filter = filters[rows[cursor]]
      if (filter === undefined) throw new Error('Invalid PNG scanline filter')
      if (!filter) continue
      const start = cursor + 1
      for (let i = 0; i < rowBytes; i++) {
        const pos = start + i
        const left = i >= pixelBytes
        rows[pos] += filter(left ? rows[pos - pixelBytes] : 0, y ? rows[pos - stride] : 0,
          y && left ? rows[pos - stride - pixelBytes] : 0)
      }
    }
  }
}

export function decodePng(bytes) {
  const header = pngHeader(bytes)
  const { width, height, depth, type, channels, interlace } = header
  const { palette, transparency, density, compressed } = imageChunks(bytes, header)
  const pixelBits = depth * channels
  let expected = 0
  const passes = []
  for (const [x, y, stepX, stepY] of interlace ? adam7 : [[0, 0, 1, 1]]) {
    const columns = Math.ceil((width - x) / stepX)
    const rows = Math.ceil((height - y) / stepY)
    if (columns <= 0 || rows <= 0) continue
    const rowBytes = Math.ceil(columns * pixelBits / 8)
    passes.push({ x, y, stepX, stepY, offset: expected, rowBytes, columns, rows })
    expected += rows * (1 + rowBytes)
  }
  let data
  try { data = zlib.inflateSync(compressed, { maxOutputLength: expected }) }
  catch (cause) { throw new Error('Invalid compressed PNG pixel data', { cause }) }
  if (data.length !== expected) throw new Error('PNG pixel data does not match the image dimensions')
  unpackRows(data, passes, Math.ceil(pixelBits / 8))

  const channelMax = type === 3 ? 255 : 2 ** depth - 1
  const transparent = transparency && type !== 3
    ? Array.from({ length: transparency.length / 2 }, (_, i) => transparency.readUInt16BE(i * 2)) : []
  const sample = depth === 16 ? at => data.readUInt16BE(at >>> 3) : depth === 8 ? at => data[at >>> 3]
    : at => (data[at >>> 3] >>> (8 - depth - (at % 8))) & ((1 << depth) - 1)

  if (type === 3 && palette.length < 3 * 2 ** depth) {
    for (const { offset, rowBytes, rows, columns } of passes) {
      for (let row = 0; row < rows; row++) {
        const start = (offset + row * (rowBytes + 1) + 1) * 8
        for (let column = 0; column < columns; column++) {
          if (sample(start + column * depth) * 3 >= palette.length) throw new Error('PNG pixel has an invalid palette index')
        }
      }
    }
  }

  function pixel(x, y, rgba) {
    const pass = passes.length === 1 ? passes[0] : passes.find(pass => x >= pass.x && y >= pass.y &&
      (x - pass.x) % pass.stepX === 0 && (y - pass.y) % pass.stepY === 0)
    const row = (y - pass.y) / pass.stepY
    const start = (pass.offset + row * (pass.rowBytes + 1) + 1) * 8 + (x - pass.x) / pass.stepX * pixelBits
    const first = sample(start)
    if (type === 3) {
      const index = first * 3
      rgba[0] = palette[index]
      rgba[1] = palette[index + 1]
      rgba[2] = palette[index + 2]
      rgba[3] = transparency?.[first] ?? channelMax
    } else if (type === 0 || type === 4) {
      rgba[0] = rgba[1] = rgba[2] = first
      rgba[3] = type === 4 ? sample(start + depth) : first === transparent[0] ? 0 : channelMax
    } else {
      rgba[0] = first
      rgba[1] = sample(start + depth)
      rgba[2] = sample(start + depth * 2)
      rgba[3] = type === 6 ? sample(start + depth * 3)
        : first === transparent[0] && rgba[1] === transparent[1] && rgba[2] === transparent[2] ? 0 : channelMax
    }
  }

  return { width, height, depth, channelMax, pixel, density }
}
