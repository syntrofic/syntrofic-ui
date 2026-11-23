export function installThemeTextContrast() {
  const colorProbe = document.createElement('span')
  colorProbe.hidden = true
  document.body.append(colorProbe)
  const colors = new Map()
  function rgba(value) {
    if (colors.has(value)) return colors.get(value)
    const rgb = /^rgba?\(([\d.e+\-,\s]+)\)$/.exec(value)
    let result
    if (rgb && rgb[1].includes(',')) {
      result = rgb[1].split(',').map(Number)
      if (result.length === 3) result.push(1)
    } else {
      colorProbe.style.removeProperty('color')
      colorProbe.style.color = `color(from ${value} srgb r g b / alpha)`
      const canonical = colorProbe.style.color && getComputedStyle(colorProbe).color
      const match = /^color\(srgb ([^/]+?)(?:\s*\/\s*([\d.e+-]+))?\)$/.exec(canonical)
      if (match) result = [...match[1].trim().split(/\s+/).map(channel => Math.max(0, Math.min(255, Number(channel) * 255))), Number(match[2] ?? 1)]
    }
    const valid = result?.length === 4 && result.every(Number.isFinite) ? result : null
    colors.set(value, valid)
    return valid
  }
  function over(front, back) {
    const alpha = front[3] + back[3] * (1 - front[3])
    return alpha ? [0, 1, 2].map(i => (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / alpha).concat(alpha)
      : [0, 0, 0, 0]
  }
  const transparent = [0, 0, 0, 0]
  function gradientStops(style) {
    const gradient = /^(?:repeating-)?(?:linear|radial|conic)-gradient\((.+)\)$/.exec(style.backgroundImage)
    if (!gradient || style.backgroundBlendMode !== 'normal') return
    // Only legacy opaque sRGB stops (or an explicit sRGB interpolation) have
    // a channel-wise envelope given by their stops.
    const values = gradient[1].split(/,(?![^()]*\))/).map(stop => stop.trim())
    if (!/^rgba?\(/.test(values[0])) {
      const prelude = values.shift()
      if (!/^(?:(?:at|to|from|in|circle|ellipse|closest-(?:side|corner)|farthest-(?:side|corner))\b|[-+\d.])/.test(prelude)) return
      const space = /\bin\s+([\w-]+)/.exec(prelude)?.[1]
      if (space && space !== 'srgb') return
    }
    const stops = values.map(value => {
      const stop = /^(rgba?\([\d.e+,\s-]+\))(?:\s+-?[\d.]+(?:%|px|deg|turn)){0,2}$/.exec(value)
      return stop && rgba(stop[1])
    })
    if (stops.length < 2 || stops.some(stop => !stop || stop[3] !== 1)) return
    const bound = fn => [0, 1, 2].map(channel => fn(...stops.map(stop => stop[channel]))).concat(1)
    return [bound(Math.min), bound(Math.max), ...stops]
  }
  function contrast(element, text, pseudo, fill) {
    if (element.matches(':disabled, [aria-disabled="true"], [data-disabled]') || element.closest('[data-theme-state~="disabled"], .sy-dialog:not([data-visible])')) {
      return { status: 'inactive' }
    }
    const ink = getComputedStyle(text, pseudo)
    const fontSize = parseFloat(ink.fontSize)
    const minimum = fill || fontSize >= 24 || fontSize >= 14 * 4 / 3 && Number(ink.fontWeight) >= 700 ? 3 : 4.5
    if (fill && (!Number(ink.opacity) || !text.getBoundingClientRect().width || !text.getBoundingClientRect().height)) return { status: 'inactive' }
    if (fill && ink.backgroundImage !== 'none') return { status: 'unmeasured', reason: 'indicator-image' }
    const foreground = fill && fill !== 'stroke' ? getSurface(ink, true) : rgba(ink.color)
    if (!foreground || typeof foreground === 'string') return { status: 'unmeasured', reason: foreground ?? 'color' }
    const initial = fill ? [...foreground.slice(0, 3), foreground[3] * Number(ink.opacity)] : foreground
    let paths = [{ foreground: initial, background: transparent }]
    let gradient = false
    function getSurface(style, exposed) {
      if (style.filter !== 'none' || style.backdropFilter !== 'none' || style.mixBlendMode !== 'normal' || style.maskImage !== 'none') return 'effects'
      if (exposed && style.backgroundClip === 'text') return 'effects'
      const shadows = style.boxShadow?.replace(/(?:[a-z]+)\([^)]*\)/gi, color => rgba(color)?.[3] === 0 ? '' : 'visible') ?? ''
      if (exposed && shadows.split(',').some(shadow => shadow.includes('inset') && shadow.includes('visible'))) return 'inset-shadow'
      return rgba(style.backgroundColor) ?? 'color'
    }
    function addSurface(style, overlay) {
      const exposed = paths[0].background[3] < 1
      if (exposed && overlay && overlay.backgroundImage !== 'none') return 'background-image'
      const top = overlay ? getSurface(overlay, exposed) : transparent
      if (typeof top === 'string') return top
      const topFill = [...top.slice(0, 3), top[3] * Number(overlay?.opacity ?? 1)]
      const seeBottom = exposed && topFill[3] < 1
      const bottom = getSurface(style, seeBottom)
      if (typeof bottom === 'string') return bottom
      const opacity = Number(style.opacity)
      function composite(path, surface) {
        const fill = over(topFill, surface)
        const result = { foreground: over(path.foreground, fill), background: over(path.background, fill) }
        result.foreground[3] *= opacity
        result.background[3] *= opacity
        return result
      }
      if (seeBottom && style.backgroundImage !== 'none') {
        const stops = !gradient && gradientStops(style)
        if (!stops) return 'background-image'
        paths = stops.map(stop => composite(paths[0], stop))
        gradient = true
      } else paths = paths.map(path => composite(path, bottom))
    }
    let reason = pseudo && !fill ? addSurface(ink) : undefined
    for (let node = fill && !pseudo ? text.parentElement : text; node && !reason; node = node.parentElement) {
      const overlay = node.matches('.sy-select__list[data-highlighted]') ? getComputedStyle(node, '::before') : undefined
      reason = addSurface(getComputedStyle(node), overlay)
    }
    if (reason || paths.some(path => path.background[3] !== 1)) return { status: 'unmeasured', reason: reason ?? 'transparent-canvas' }
    const css = channels => `rgb(${channels.slice(0, 3).join(', ')})`
    const pairs = paths.map(path => ({ foreground: css(path.foreground), background: css(path.background) }))
    return { status: 'measured', minimum, ...(gradient
      ? { method: 'gradient-bounds', bounds: pairs.slice(0, 2), stops: pairs.slice(2) } : pairs[0]) }
  }
  globalThis.themeTextContrast = contrast
}

function surfaceLuminance(library, color) {
  return (library.colorContrast('#000000', color) - 1) * .05
}

function boundRatio(light, dark) {
  return light >= dark ? (light + .05) / (dark + .05) : 1
}

export function textContrastRatio(library, reading, color) {
  if (reading.method !== 'gradient-bounds') return library.colorContrast(color ?? reading.foreground, reading.background)
  const [low, high] = reading.bounds
  const lowerInk = surfaceLuminance(library, color ?? low.foreground)
  const upperInk = surfaceLuminance(library, color ?? high.foreground)
  const lowerFill = surfaceLuminance(library, low.background)
  const upperFill = surfaceLuminance(library, high.background)
  return Math.max(boundRatio(lowerInk, upperFill), boundRatio(lowerFill, upperInk))
}

export function measuredTextContrast(library, samples) {
  return Object.fromEntries(Object.entries(samples ?? {}).map(([part, reading]) => {
    if (reading.status !== 'measured') return [part, reading]
    const ratio = textContrastRatio(library, reading)
    if (reading.method !== 'gradient-bounds') return [part, { ...reading, ratio }]
    const { stops, ...bound } = reading
    const worst = stops.map(stop => ({ ...stop, ratio: library.colorContrast(stop.foreground, stop.background) }))
      .reduce((first, next) => next.ratio < first.ratio ? next : first)
    return [part, { ...bound, foreground: worst.foreground, background: worst.background, worstStopRatio: worst.ratio, ratio }]
  }))
}

export function lowTextContrast(reading) {
  return reading?.status === 'measured' && (reading.worstStopRatio ?? reading.ratio) < reading.minimum
}
