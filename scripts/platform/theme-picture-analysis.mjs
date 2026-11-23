import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import { resolve } from 'node:path'
import { decodePng, pngHeader } from './png-image.mjs'
import { inspectPictureTraits } from './theme-picture-traits.mjs'

const sampleBudget = 4_000_000
const fileLimit = 200 * 1024 ** 2
const pictureSuffix = /\.(?:png|apng|jpe?g|webp|gif|bmp|tiff?|svg|avif|heic)$/i
const error = (code, message, cause) => Object.assign(new Error(message, { cause }), { code })
const percent = (count, total) => total ? Math.round(10000 * count / total) / 100 : 0

async function readBytes(handle, size) {
  const bytes = Buffer.allocUnsafe(size)
  let offset = 0
  while (offset < size) {
    const { bytesRead } = await handle.read(bytes, offset, size - offset, offset)
    if (!bytesRead) throw new Error('The image ended before all bytes could be read')
    offset += bytesRead
  }
  return bytes
}

async function loadPicture(file, explicit) {
  let handle
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK)
    const stat = await handle.stat()
    if (!stat.isFile()) {
      if (!explicit) return
      throw new Error('Choose a regular PNG file')
    }
    pngHeader(await readBytes(handle, Math.min(stat.size, 33)))
    if (stat.size > fileLimit) throw new Error('PNG file exceeds 200 MiB')
    return decodePng(await readBytes(handle, stat.size))
  } catch (cause) {
    if (!explicit && ['ENOENT', 'ENOTDIR', 'ENAMETOOLONG', 'EINVAL'].includes(cause.code)) return
    throw error('ERR_THEME_PICTURE', `${file}: ${cause.message}`, cause)
  } finally {
    await handle?.close()
  }
}

function readPoints(values, { width, height }) {
  return values.flatMap(value => {
    if (!/^\s*\d+\s*,\s*\d+(?:(?:\s*[,;]\s*|\s+)\d+\s*,\s*\d+)*\s*$/.test(value)) {
      throw error('ERR_INVALID_ARGUMENT', 'Give whole pixel coordinates as x,y, for example --at "40,20;300,180"')
    }
    return Array.from(value.matchAll(/(\d+)\s*,\s*(\d+)/g), ([, rawX, rawY]) => {
      const x = Number(rawX), y = Number(rawY)
      if (x >= width || y >= height) throw error('ERR_INVALID_ARGUMENT', `Pixel ${rawX},${rawY} is outside ${width} × ${height}`)
      return { x, y }
    })
  })
}

function color(red, green, blue) {
  const packed = (Math.round(red) << 16) | (Math.round(green) << 8) | Math.round(blue)
  return `#${packed.toString(16).padStart(6, '0')}`
}

function picturePoints(image, coordinates) {
  const rgba = [0, 0, 0, 0]
  const { channelMax } = image
  const scale = 255 / channelMax
  return coordinates.map(({ x, y }) => {
    image.pixel(x, y, rgba)
    const [r, g, b, a] = rgba
    return { at: `${x},${y}`, x, y, color: color(r * scale, g * scale, b * scale), alpha: a / channelMax,
      samples: { red: r, green: g, blue: b, alpha: a, max: channelMax } }
  })
}

function picturePalette(image, limit) {
  const { width, height, channelMax } = image
  const scale = Math.max(1, Math.sqrt(width * height / sampleBudget))
  const shortSide = Math.ceil(Math.min(width, height) / scale)
  const longSide = Math.min(Math.max(width, height), Math.floor(sampleBudget / shortSide))
  const [columns, rows] = width <= height ? [shortSide, longSide] : [longSide, shortSide]
  const bins = new Map()
  let white = 0, transparent = 0
  const rgba = [0, 0, 0, 0]
  for (let row = 0; row < rows; row++) {
    const y = Math.floor((row + .5) * height / rows)
    for (let column = 0; column < columns; column++) {
      const x = Math.floor((column + .5) * width / columns)
      image.pixel(x, y, rgba)
      const [red, green, blue, alpha] = rgba
      if (!alpha) { transparent++; continue }
      if (alpha === channelMax && red === channelMax && green === channelMax && blue === channelMax) white++
      const a = alpha / channelMax
      const weight = 255 * a / channelMax
      const background = 255 * (1 - a)
      const r = Math.round(red * weight + background)
      const g = Math.round(green * weight + background)
      const b = Math.round(blue * weight + background)
      // Group neighboring RGB values so antialiasing doesn't split a surface into individual shades.
      const key = (r >>> 3) * 1024 + (g >>> 3) * 32 + (b >>> 3)
      let bin = bins.get(key)
      if (!bin) {
        bin = { count: 0, r: 0, g: 0, b: 0, x: 0, y: 0 }
        bins.set(key, bin)
      }
      bin.count++
      bin.r += r
      bin.g += g
      bin.b += b
      bin.x += x
      bin.y += y
    }
  }
  const sampled = rows * columns
  const visible = sampled - transparent
  const colors = [...bins.values()].sort((a, b) => b.count - a.count).slice(0, limit).map(bin => {
    const { count, r, g, b } = bin
    const center = { x: Math.round(bin.x / count), y: Math.round(bin.y / count) }
    const horizontal = center.x < width * .25 ? '-left' : center.x >= width * .75 ? '-right' : ''
    const vertical = center.y < height * .2 ? 'top' : center.y >= height * .8 ? 'bottom' : 'middle'
    return { color: color(r / count, g / count, b / count), share: percent(count, visible), where: vertical + horizontal, center }
  })
  return { sampled, visible, transparent, pureWhite: { pixels: white, share: percent(white, sampled) }, colors }
}

function pixelRatio(raw, density) {
  if (raw !== undefined) {
    const scale = Number(raw)
    if (!/^\d+(?:\.\d+)?$/.test(raw) || scale < .25 || scale > 8) {
      throw error('ERR_INVALID_ARGUMENT', '--pixel-ratio expects a number from 0.25 to 8')
    }
    return { scale, source: 'option' }
  }
  if (density?.x && Math.abs(density.x - density.y) <= 2) {
    const dpi = density.x * .0254
    const candidates = new Set([72, 96].flatMap(basis => {
      const multiple = Math.round(dpi / basis)
      return multiple >= 1 && multiple <= 8 && Math.abs(dpi - basis * multiple) < .25 ? [multiple] : []
    }))
    if (candidates.size === 1) return { scale: [...candidates][0], source: 'png-density' }
  }
  return { scale: 1, source: 'assumed' }
}

export async function inspectThemePicture(directory, source, extra, options) {
  const at = options.at
  if (at && (!source || options.list)) throw error('ERR_INVALID_ARGUMENT', 'Use --at with one PNG file')
  if (options['pixel-ratio'] !== undefined && (!source || options.list || at)) {
    throw error('ERR_INVALID_ARGUMENT', 'Use --pixel-ratio when measuring a PNG without --at')
  }
  if (!source || options.list) return
  const file = resolve(directory, source)
  const image = await loadPicture(file, Boolean(at) || options['pixel-ratio'] !== undefined || pictureSuffix.test(source))
  if (!image) return
  const { width, height, depth } = image
  const picture = { file, width, height, depth }
  if (at) {
    if (extra.length) throw error('ERR_INVALID_ARGUMENT', 'With --at, give coordinates instead of a palette size')
    return { picture, points: picturePoints(image, readPoints(at, image)) }
  }
  const [count = '14'] = extra
  if (extra.length > 1 || !/^\d+$/.test(count) || +count < 1 || +count > 256) {
    throw error('ERR_INVALID_ARGUMENT', 'Choose 1 to 256 colors after the PNG file name')
  }
  const ratio = pixelRatio(options['pixel-ratio'], image.density)
  return { picture, ...picturePalette(image, Number(count)), measurements: inspectPictureTraits(image, ratio) }
}
