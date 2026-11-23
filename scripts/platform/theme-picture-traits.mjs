const pixelLimit = 8_000_000
const regionLimit = 1500
const edgeOffsets = [.36, .43, .5, .57, .64]
const cornerProbes = [0, 1, 2, 3, 5, 8, 12, 18, 27, 40, 60, 90]
const cssPixels = (value, scale) => Math.round(value / scale * 100) / 100
const hex = value => '#' + value.toString(16).padStart(6, '0')
const distance = (a, b) => Math.max(Math.abs((a >> 16) - (b >> 16)),
  Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)), Math.abs((a & 255) - (b & 255)))

function rasterize(image) {
  const { width, height, channelMax } = image
  const colors = new Uint32Array(width * height)
  const rgba = [0, 0, 0, 0]
  for (let y = 0, at = 0; y < height; y++) {
    for (let x = 0; x < width; x++, at++) {
      image.pixel(x, y, rgba)
      const alpha = rgba[3] / channelMax
      const weight = 255 * alpha / channelMax
      const paper = 255 * (1 - alpha)
      colors[at] = Math.round(rgba[0] * weight + paper) << 16 |
        Math.round(rgba[1] * weight + paper) << 8 | Math.round(rgba[2] * weight + paper)
    }
  }
  return colors
}

function flatRegions(colors, width, height, scale) {
  const labels = new Uint32Array(colors.length)
  const queue = new Uint32Array(colors.length)
  const boxes = []
  for (let start = 0; start < colors.length; start++) {
    if (labels[start]) continue
    const label = start + 1
    const paint = colors[start]
    let end = 1
    labels[start] = label
    queue[0] = start
    let left = width, right = -1, top = height, bottom = -1

    function enqueue(at) {
      if (!labels[at] && colors[at] === paint) {
        labels[at] = label
        queue[end++] = at
      }
    }

    for (let next = 0; next < end; next++) {
      const at = queue[next]
      const x = at % width, y = (at - x) / width
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x > 0) enqueue(at - 1)
      if (x + 1 < width) enqueue(at + 1)
      if (y > 0) {
        enqueue(at - width)
        if (x > 0) enqueue(at - width - 1)
        if (x + 1 < width) enqueue(at - width + 1)
      }
      if (y + 1 < height) {
        enqueue(at + width)
        if (x > 0) enqueue(at + width - 1)
        if (x + 1 < width) enqueue(at + width + 1)
      }
    }

    const w = right - left + 1, h = bottom - top + 1
    if (!left || !top || right === width - 1 || bottom === height - 1 || Math.min(w, h) < Math.max(5, 9 * scale) ||
      Math.max(w, h) > 14 * Math.min(w, h) || end < (w + h) * .75) continue
    boxes.push({ label, paint, n: end, left, top, right, bottom, width: w, height: h })
  }
  return { labels, boxes }
}

function edgeRuns(box, getLabel, scale) {
  const { left, right, top, bottom, width, height, label } = box
  const depth = Math.max(1, Math.min(Math.ceil(6 * scale), Math.floor(Math.min(width, height) / 4)))
  const slack = Math.max(1, Math.round(scale / 2))
  const sides = []
  for (const [length, point] of [
    [width, (offset, inset) => [left + offset, top + inset]],
    [width, (offset, inset) => [left + offset, bottom - inset]],
    [height, (offset, inset) => [left + inset, top + offset]],
    [height, (offset, inset) => [right - inset, top + offset]],
  ]) {
    const runs = []
    for (const fraction of edgeOffsets) {
      const offset = Math.round((length - 1) * fraction)
      let first = 0
      while (first <= slack && getLabel(...point(offset, first)) !== label) first++
      if (first > slack) continue
      let last = first + 1
      while (last <= depth && getLabel(...point(offset, last)) === label) last++
      runs.push(last > depth ? null : last - first)
    }
    if (runs.length < 3) return
    sides.push(runs)
  }
  return sides
}

function majority(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0]
}

function surroundingStroke(box, get, scale) {
  const { left, right, top, bottom, width, height, paint } = box
  const limit = Math.ceil(4 * scale)
  const observations = []
  for (const [length, point] of [
    [width, (offset, inset) => [left + offset, top - inset]],
    [width, (offset, inset) => [left + offset, bottom + inset]],
    [height, (offset, inset) => [left - inset, top + offset]],
    [height, (offset, inset) => [right + inset, top + offset]],
  ]) {
    for (const fraction of edgeOffsets) {
      const offset = Math.round((length - 1) * fraction)
      const stroke = get(...point(offset, 1))
      if (stroke === undefined || distance(paint, stroke) < 5) return
      let depth = 2
      while (depth <= limit && get(...point(offset, depth)) === stroke) depth++
      observations.push(`${stroke}:${depth - 1}`)
    }
  }
  const [match, frequency] = majority(observations)
  const [stroke, border] = match.split(':').map(Number)
  if (frequency < observations.length * .85 || border >= limit ||
      get(left - border - 1, top - border - 1) === undefined || get(right + border + 1, bottom + border + 1) === undefined) return
  return { ...box, left: left - border, right: right + border, top: top - border, bottom: bottom + border,
    width: width + 2 * border, height: height + 2 * border, paint: stroke, fill: paint, border }
}

function boxStyle(box, sides, get, scale) {
  const { left, top, width, height, paint } = box
  const fillSamples = [.17, .26, .74, .83].flatMap(x => [.3, .5, .7].map(y =>
    get(left + Math.floor(x * width), top + Math.floor(y * height))))
  const [fill, matching] = majority(fillSamples)
  const allRuns = sides.flat()
  const [edge, count] = majority(allRuns)
  const border = edge && count >= allRuns.length * .6 && sides.every(side => side.includes(edge)) &&
    fill !== paint && matching >= fillSamples.length / 2 && distance(fill, paint) >= 5 ? edge : undefined
  if (!border && box.n < width * height * .42) return
  const style = border ? { ...box, border, fill } : surroundingStroke(box, get, scale) ?? { ...box, fill: paint }
  return { ...style, radius: cornerRadius(style, get, scale) }
}

function cornerRadius(box, get, scale) {
  const { left, top, right, bottom, width, height, paint } = box
  const maxX = Math.min(Math.floor(width / 2), Math.ceil(96 * scale))
  const maxY = Math.min(Math.floor(height / 2), Math.ceil(96 * scale))
  const across = [], down = []
  for (const [x, y, sx, sy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]]) {
    const backdrop = get(x - sx, y - sy)
    if (distance(backdrop, paint) < 5) return
    const covered = (dx, dy) => {
      const color = get(x + dx * sx, y + dy * sy)
      return distance(color, paint) < distance(color, backdrop)
    }
    for (const index of cornerProbes) {
      const offset = Math.round(index * scale)
      if (offset < maxY) {
        let inset = 0
        while (inset <= maxX && !covered(inset, offset)) inset++
        if (inset <= maxX) across.push([offset, inset])
      }
      if (offset < maxX) {
        let inset = 0
        while (inset <= maxY && !covered(offset, inset)) inset++
        if (inset <= maxY) down.push([offset, inset])
      }
    }
  }
  if (across.filter(([offset]) => offset === 0).length !== 4 || down.filter(([offset]) => offset === 0).length !== 4) return
  const minX = Math.max(...across.map(([, inset]) => inset)), minY = Math.max(...down.map(([, inset]) => inset))
  if (!minX && !minY) return { horizontal: 0, vertical: 0 }
  const clampX = Math.min(maxX, Math.ceil(minX * 2.6 + 4))
  const clampY = Math.min(maxY, Math.ceil(minY * 2.6 + 4))
  const insetAt = (a, b, offset) => {
    const delta = (b - offset - .5) / b
    return delta > 0 ? Math.max(0, Math.ceil(a * (1 - Math.sqrt(1 - delta ** 2)) - .5)) : 0
  }
  const residual = (samples, a, b) => samples.reduce((total, [offset, inset]) => total + Math.abs(insetAt(a, b, offset) - inset), 0)
  let best = Infinity
  let radius
  for (let horizontal = Math.max(1, minX - 1); horizontal <= clampX; horizontal++) {
    for (let vertical = Math.max(1, minY - 1); vertical <= clampY; vertical++) {
      const error = residual(across, horizontal, vertical) + residual(down, vertical, horizontal)
      // A circular curve is the simplest explanation when several fits agree within a pixel.
      const rank = error + Math.abs(horizontal - vertical) * .012
      if (rank >= best) continue
      best = rank
      radius = { horizontal, vertical }
    }
  }
  if (best <= (across.length + down.length) * Math.max(.75, scale / 2)) return radius
}

function labelAlignment(box, get, scale) {
  const { left, top, right, bottom, width, height, fill, border = 0, radius } = box
  const padX = Math.max(Math.ceil(3 * scale), border + 1, Math.ceil((radius?.horizontal ?? 0) * .65))
  const padY = Math.max(Math.ceil(height * .22), border + 1)
  let start = right, end = left, first = bottom, last = top, ink = 0
  for (let y = top + padY; y <= bottom - padY; y++) {
    for (let x = left + padX; x <= right - padX; x++) {
      if (distance(fill, get(x, y)) < 38) continue
      start = Math.min(start, x)
      end = Math.max(end, x)
      first = Math.min(first, y)
      last = Math.max(last, y)
      ink++
    }
  }
  if (end - start < 5 * scale || last - first < 4 * scale || ink > (right - left) * (last - first + 1) * .75) return
  const center = (start + end - 2 * left) / (2 * width)
  if (Math.abs(center - .5) <= .12) return 'center'
  if (center <= .44 || center >= .56) return 'start-or-end'
}

function classify(box, imageWidth, scale, get) {
  const { width, height, radius } = box
  if (width <= 25 * scale && height <= 25 * scale && Math.abs(width - height) <= scale &&
      radius && Math.max(radius.horizontal, radius.vertical) <= width * .34) return 'checkbox-like'
  if (height >= 68 * scale && width >= 116 * scale) return 'containers'
  if (height < 18 * scale || height > 64 * scale || width < height * 1.22 || width > imageWidth * .94) return
  const alignment = labelAlignment(box, get, scale)
  if (alignment === 'center') return 'button-like'
  if (alignment === 'start-or-end' || box.border && width / height > 3.5) return 'inputs'
  return 'controls'
}

function anInnerFace(inner, outer, slack) {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom &&
    inner.left - outer.left <= slack && outer.right - inner.right <= slack && inner.top - outer.top <= slack && outer.bottom - inner.bottom <= slack
}

function findBoxes(colors, width, height, scale) {
  const { labels, boxes } = flatRegions(colors, width, height, scale)
  const get = (x, y) => x >= 0 && x < width && y >= 0 && y < height ? colors[y * width + x] : undefined
  const getLabel = (x, y) => labels[y * width + x]
  const found = []
  boxes.sort((a, b) => b.width * b.height - a.width * a.height)
  for (const box of boxes.slice(0, regionLimit)) {
    if (found.some(outer => anInnerFace(box, outer, Math.ceil(4 * scale)))) continue
    const sides = edgeRuns(box, getLabel, scale)
    if (!sides) continue
    const styles = boxStyle(box, sides, get, scale)
    if (!styles) continue
    const group = classify(styles, width, scale, get)
    if (group) found.push({ ...styles, group })
  }
  return { found, truncated: boxes.length > regionLimit }
}

function agreement(boxes, read, close) {
  const readings = boxes.flatMap(box => {
    const value = read(box)
    return value === undefined ? [] : [{ value, box }]
  })
  let best = []
  for (const reading of readings) {
    const nearby = readings.filter(other => close(reading.value, other.value))
    if (nearby.length > best.length) best = nearby
  }
  if (best.length >= 2 && best.length >= boxes.length * .67) return best
}

function bounds({ left: x, top: y, width, height }) {
  return { x, y, width, height }
}

function textLines(box, get, scale) {
  const { left, right, top, bottom, fill, radius } = box
  const inset = Math.max(box.border ?? 0, Math.ceil(4 * scale))
  const marginX = Math.max(inset, Math.ceil((radius?.horizontal ?? 0) * .72))
  const marginY = Math.max(inset, Math.ceil((radius?.vertical ?? 0) * .72))
  const bands = []
  let band
  for (let y = top + marginY; y <= bottom - marginY; y++) {
    let start = right, end = left, ink = 0, runs = 0, lastInk = -Infinity
    for (let x = left + marginX; x <= right - marginX; x++) {
      if (distance(fill, get(x, y)) < 42) continue
      start = Math.min(start, x)
      end = Math.max(end, x)
      ink++
      if (x - lastInk > 1) runs++
      lastInk = x
    }
    if (ink < 3 * scale) continue
    if (!band || y - band.bottom > Math.ceil(scale) + 1) {
      band = { left: start, right: end, top: y, bottom: y, ink: 0, runs: 0 }
      bands.push(band)
    }
    band.left = Math.min(band.left, start)
    band.right = Math.max(band.right, end)
    band.bottom = y
    band.ink += ink
    band.runs = Math.max(band.runs, runs)
  }
  return bands.map(band => ({ ...band, height: band.bottom - band.top + 1, width: band.right - band.left + 1 }))
    .filter(band => band.height >= 6 * scale && band.height <= 28 * scale && band.width >= 55 * scale &&
      band.runs >= 6 && band.ink >= band.width * band.height * .08 && band.ink <= band.width * band.height * .65)
}

function lineIntervals(boxes, get, scale) {
  const intervals = []
  for (const box of boxes) {
    const lines = textLines(box, get, scale)
    for (let i = 0; i + 2 < lines.length; i++) {
      const [first, second, third] = lines.slice(i, i + 3)
      const pitch = second.top - first.top
      const height = Math.max(first.height, second.height, third.height)
      const indent = Math.max(first.left, second.left, third.left) - Math.min(first.left, second.left, third.left)
      if (indent > 4 * scale || height - Math.min(first.height, second.height, third.height) > 4 * scale ||
          pitch < height * 1.1 || pitch > height * 2.6 || Math.abs(third.top - second.top - pitch) > 2 * scale) continue
      intervals.push({ ...first, pitch }, { ...second, pitch: third.top - second.top })
      i++
    }
  }
  return intervals
}

function reportTraits(boxes, colors, width, scale) {
  const traits = [], unsure = []
  const size = n => cssPixels(n, scale)
  const median = values => values.sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)]
  const tolerance = Math.max(1, scale)
  const similar = (a, b) => Math.abs(a - b) <= tolerance
  const numeric = (trait, on, samples, read, setting, close = similar) =>
    record(trait, on, samples, read, close, values => size(median(values)), setting)

  function record(trait, on, samples, read, close, summarize, setting) {
    if (!samples.length) return
    const agreed = agreement(samples, read, close)
    if (!agreed) {
      unsure.push({ trait, on, reason: 'not-enough-agreeing-boxes', candidates: samples.length })
      return
    }
    const value = summarize(agreed.map(item => item.value))
    const proposed = setting?.(value)
    traits.push({ trait, on, value, matched: agreed.length, candidates: samples.length,
      evidence: agreed.slice(0, 8).map(item => bounds(item.box)), ...(proposed && { setting: proposed }) })
  }

  for (const on of ['button-like', 'inputs', 'controls', 'checkbox-like', 'containers']) {
    const samples = boxes.filter(box => box.group === on)
    if (on !== 'containers') numeric(on === 'checkbox-like' ? 'box-size' : 'height', on, samples,
      box => box.height, value => {
        if (on === 'checkbox-like') return { property: 'height', value: `${value}px`, on: 'checkbox', only: true }
        if (on === 'inputs' || on === 'button-like') return { property: 'height', value: `${value}px`, on: on === 'inputs' ? 'inputs' : 'buttons' }
      })
    if (on === 'checkbox-like') numeric('box-width', on, samples, box => box.width,
      value => ({ property: 'width', value: `${value}px`, on: 'checkbox', only: true }))
    record('corners', on, samples, box => box.radius,
      (a, b) => similar(a.horizontal, b.horizontal) && similar(a.vertical, b.vertical), values => ({
        horizontal: size(median(values.map(value => value.horizontal))), vertical: size(median(values.map(value => value.vertical))),
      }), radius => {
      const part = { inputs: 'inputs', 'button-like': 'buttons', 'checkbox-like': 'checkbox', containers: 'containers' }[on]
      if (!part) return
      const value = radius.horizontal === radius.vertical ? `${radius.horizontal}px` : `${radius.horizontal}px / ${radius.vertical}px`
      return { property: 'border-radius', value, on: part, ...(part === 'checkbox' && { only: true }) }
    })
    numeric('border-width', on, samples.filter(box => box.border !== undefined), box => box.border, value => {
      const part = { inputs: 'inputs', 'button-like': 'button', 'checkbox-like': 'checkbox', containers: 'containers' }[on]
      if (part) return { property: 'border-width', value: `${value}px`, on: part, ...(part === 'checkbox' && { only: true }) }
    }, (a, b) => a === b)
    if (on === 'containers') record('surface', on, samples, box => box.border ? 'outlined' : 'filled',
      (a, b) => a === b, values => values[0])
    if (on === 'button-like') {
      const colorful = samples.filter(({ fill }) => {
        const channels = [fill >> 16, (fill >> 8) & 255, fill & 255]
        return Math.max(...channels) - Math.min(...channels) >= 14
      })
      record('accent-fill', on, colorful, box => box.fill, (a, b) => distance(a, b) <= 6, values => hex(majority(values)[0]))
    }
  }
  const panels = boxes.filter(box => box.group === 'containers')
  const intervals = lineIntervals(panels, (x, y) => colors[y * width + x], scale)
  if (intervals.length) numeric('line-spacing', 'panel-text', intervals, line => line.pitch, undefined,
    (a, b) => Math.abs(a - b) <= 2 * scale)
  else if (panels.length) unsure.push({ trait: 'line-spacing', on: 'panel-text', reason: 'no-repeated-text-lines' })
  if (!boxes.length) unsure.push({ trait: 'geometry', on: 'picture', reason: 'no-enclosed-surfaces' })
  return { traits, unsure }
}

export function inspectPictureTraits(image, { scale = 1, source = 'assumed' } = {}) {
  const { width, height } = image
  const ratio = { value: scale, source }
  if (width * height > pixelLimit) return { ratio, boxes: 0, traits: [],
    unsure: [{ trait: 'geometry', on: 'picture', reason: 'picture-exceeds-measurement-budget', limit: pixelLimit }] }
  const colors = rasterize(image)
  const { found: boxes, truncated } = findBoxes(colors, width, height, scale)
  if (truncated) return { ratio, boxes: boxes.length, traits: [],
    unsure: [{ trait: 'geometry', on: 'picture', reason: 'too-many-regions', limit: regionLimit }] }
  return { ratio, boxes: boxes.length, ...reportTraits(boxes, colors, width, scale) }
}
