import { generatePalette } from './theme-palette.mjs'

const modes = ['light', 'dark']
const stops = [0, 22, 26, 32, 39, 45, 50, 57, 72, 79, 88, 92, 95, 97, 100]

function normalize(value) {
  if (/^#[a-f\d]{6}$/i.test(value)) return value.toLowerCase()
  if (/^#[a-f\d]{3}$/i.test(value)) return '#' + [...value.slice(1)].map(char => char.toLowerCase().repeat(2)).join('')
  throw new Error('Choose a hexadecimal color')
}

function contrastColor(ui, colors, foreground, background, mode, threshold = 4.5) {
  const meets = value => (ui.colorContrast(value, background) ?? 0) >= threshold
  if (meets(foreground)) return foreground
  const candidates = mode === 'light' ? colors.slice(0, 8).reverse() : colors.slice(6)
  return candidates.find(meets) ?? (meets('#ffffff') ? '#ffffff' : '#000000')
}

function paletteFor(seeds, vibrancy) {
  const families = Object.entries(seeds ?? {}).map(([id, seed]) => ({ id, seed }))
  if (families.length) return generatePalette({ recipe: 'syntrofic-oklch-v2', families, stops, vibrancy })
}

function paletteAssignments(ui, theme, palette) {
  if (!palette) return {}
  return Object.fromEntries(modes.map(mode => {
    const dark = mode === 'dark'
    const canvas = theme.modes[mode].canvas ?? (dark ? '#1d1e1f' : '#ffffff')
    const paint = {}
    for (const { id, modes: paletteModes } of palette.families) {
      const swatches = paletteModes[mode]
      const colors = swatches.map(item => item.color)
      const shades = Object.fromEntries(swatches.map(({ stop, color }) => [stop, color]))
      const soft = dark ? 39 : 92
      const ink = dark ? 88 : 45
      const foreground = contrastColor(ui, colors, shades[ink], shades[soft], mode)
      const use = (token, preferred, value = shades[preferred]) => {
        const shade = preferred !== undefined && value === shades[preferred] ? preferred : swatches.find(item => item.color === value)?.stop
        paint[token] = { family: id, value, shade: shade ?? null,
          ...(preferred !== undefined && value !== shades[preferred] && { preferredShade: preferred, contrastAdjusted: true }) }
      }
      const filled = id === 'accent' || id === 'danger'
      if (id === 'neutral') {
        const text = dark ? 95 : 26
        const muted = dark ? 79 : 50
        use('surface', dark ? 22 : 97)
        use('surface-muted', dark ? 32 : 92)
        use('control', dark ? 39 : 95)
        use('text', text, contrastColor(ui, colors, shades[text], canvas, mode))
        use('text-muted', muted, contrastColor(ui, colors, shades[muted], canvas, mode))
        use('border', dark ? 39 : 88)
        use('border-strong', 57)
      } else if (filled) {
        const background = shades[50]
        use(id, 50)
        use(id + '-hover', dark ? 57 : 45)
        use(id + '-on', undefined, ui.colorContrast('#ffffff', background) >= 4.5 ? '#ffffff' : '#000000')
        use(id + '-soft', soft)
        if (id === 'accent') {
          use('accent-text', ink, foreground)
          use('focus', 50, contrastColor(ui, colors, shades[50], canvas, mode, 3))
        }
      } else {
        use(id, ink, foreground)
        use(id + '-soft', soft)
      }
    }
    return [mode, paint]
  }))
}

const colorValues = assignments => Object.fromEntries(Object.entries(assignments).map(([mode, colors]) => [mode,
  Object.fromEntries(Object.entries(colors).map(([token, color]) => [token, color.value])),
]))

export function generatedThemeColors(ui, theme, seeds = theme.design?.palette?.seeds, vibrancy = theme.design?.palette?.vibrancy ?? 50) {
  return colorValues(paletteAssignments(ui, theme, paletteFor(seeds, vibrancy)))
}

export function themeEditorPalette(ui, theme) {
  const settings = theme.design?.palette
  const vibrancy = settings?.vibrancy ?? 50
  const palette = paletteFor(settings?.seeds, vibrancy)
  if (!palette) return
  const generated = paletteAssignments(ui, theme, palette)
  const assignments = Object.fromEntries(modes.map(mode => {
    const resolved = ui.resolveThemeTokens(theme, { mode })
    const colors = Object.fromEntries(Object.entries(generated[mode]).map(([name, shade]) => {
      const token = '--sy-' + name
      const value = resolved[token] ?? shade.value
      const exact = settings?.exact?.[mode]?.[name]
      return [token, { ...shade, resolved: value, source: exact && normalize(exact) === value ? 'token' : value === shade.value ? 'palette' : 'authored' }]
    }))
    return [mode, colors]
  }))
  return { palette: { ...palette, vibrancy, assignments }, generatedColors: colorValues(generated) }
}

export function changePalette(ui, theme, setting, value) {
  const current = theme.design?.palette ?? {}
  const seeds = { ...current.seeds }
  let vibrancy = current.vibrancy ?? 50
  if (setting === 'vibrancy') {
    if (!Object.keys(seeds).length) throw new Error('Set a palette color before changing vibrancy')
    if (value === 'more' || value === 'less') vibrancy = Math.max(0, Math.min(100, vibrancy + (value === 'more' ? 10 : -10)))
    else {
      if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) > 100) throw new Error('Choose vibrancy from 0 to 100')
      vibrancy = Number(value)
    }
  } else seeds[setting] = normalize(value)
  const generated = generatedThemeColors(ui, theme, seeds, vibrancy)
  const changes = modes.flatMap(mode => Object.entries(generated[mode]).flatMap(([key, value]) =>
    !current.exact?.[mode]?.[key] && theme.modes[mode][key] !== value ? [{ type: 'color', mode, key, value }] : []))
  const palette = setting === 'vibrancy' ? { vibrancy } : { seeds: { [setting]: seeds[setting] } }
  return [...changes, { type: 'settings', value: { design: { palette } } }]
}
