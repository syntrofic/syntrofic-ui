import { computed, getCurrentInstance, inject, shallowRef, type InjectionKey, type Ref } from 'vue'
import {
  colorToString, convertToHsb, convertToHsl, convertToRgb, getChannelValue, parseColor as parseRekaColor, setChannelValue,
  type Color, type ColorChannel, type ColorFormat, type ColorSpace,
} from 'reka-ui'

export type ColorValue = Color | string
export const defaultColor = '#859589'

const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
const wrapHue = (value: number) => value === 360 ? 360 : ((value % 360) + 360) % 360

function readNumber(text: string) {
  if (!numberPattern.test(text) || !Number.isFinite(Number(text))) throw new Error('Invalid color channel')
  return Number(text)
}

function readScale(text: string, max: number) {
  const percent = text.endsWith('%')
  return clamp(percent ? readNumber(text.slice(0, -1)) * max / 100 : readNumber(text), max)
}

function readHue(text: string) {
  const unit = /(turn|grad|rad|deg)$/.exec(text)?.[0]
  const value = readNumber(unit ? text.slice(0, -unit.length) : text)
  const factor = unit === 'turn' ? 360 : unit === 'grad' ? .9 : unit === 'rad' ? 180 / Math.PI : 1
  const degrees = value * factor
  if (!Number.isFinite(degrees)) throw new Error('Invalid hue')
  return wrapHue(degrees)
}

export function parseColor(source: string): Color {
  const text = source.trim().toLowerCase()
  if (text === 'transparent') return { space: 'rgb', r: 0, g: 0, b: 0, alpha: 0 }
  const hex = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.exec(text)?.[1]
  if (hex) return parseRekaColor('#' + (hex.length === 4 ? hex.replace(/./g, digit => digit + digit) : hex))

  const functional = /^(rgb|rgba|hsl|hsla|hsb|hsba|hsv|hsva)\(([^()]+)\)$/.exec(text)
  if (!functional) throw new Error('Invalid color format')
  const channelText = functional[2].trim()
  const slash = channelText.split('/')
  const legacy = channelText.includes(',')
  const channels = legacy ? channelText.split(',').map(value => value.trim()) : slash[0].trim().split(/\s+/)
  const alpha = legacy && channels.length === 4 ? channels.pop() : slash[1]?.trim()
  if (channels.length !== 3 || slash.length > 2 || (legacy && slash.length !== 1)) throw new Error('Invalid color format')
  const a = alpha === undefined ? 1 : readScale(alpha, 1)
  const [x, y, z] = channels
  if (functional[1].startsWith('rgb')) {
    return { space: 'rgb', r: readScale(x, 255), g: readScale(y, 255), b: readScale(z, 255), alpha: a }
  }
  const h = readHue(x)
  const s = y.endsWith('%') ? clamp(readNumber(y.slice(0, -1)), 100) : clamp(readNumber(y), 100)
  const coordinate = z.endsWith('%') ? clamp(readNumber(z.slice(0, -1)), 100) : clamp(readNumber(z), 100)
  return functional[1].startsWith('hsl')
    ? { space: 'hsl', h, s, l: coordinate, alpha: a }
    : { space: 'hsb', h, s, b: coordinate, alpha: a }
}

export function readColor(value?: ColorValue | null): Color | undefined {
  if (typeof value === 'string') {
    try { return parseColor(value) } catch { return undefined }
  }
  if (!value || typeof value !== 'object' || !Number.isFinite(value.alpha)) return undefined
  const alpha = clamp(value.alpha, 1)
  if (value.space === 'rgb' && [value.r, value.g, value.b].every(Number.isFinite)) {
    return { space: 'rgb', r: clamp(value.r, 255), g: clamp(value.g, 255), b: clamp(value.b, 255), alpha }
  }
  if (value.space === 'hsl' && [value.h, value.s, value.l].every(Number.isFinite)) {
    return { space: 'hsl', h: wrapHue(value.h), s: clamp(value.s, 100), l: clamp(value.l, 100), alpha }
  }
  if (value.space === 'hsb' && [value.h, value.s, value.b].every(Number.isFinite)) {
    return { space: 'hsb', h: wrapHue(value.h), s: clamp(value.s, 100), b: clamp(value.b, 100), alpha }
  }
  return undefined
}

export function relativeLight({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => value / 255 <= .04045 ? value / 255 / 12.92 : ((value / 255 + .055) / 1.055) ** 2.4
  return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b)
}

export function colorContrast(foreground: ColorValue, background: ColorValue): number | undefined {
  const front = readColor(foreground)
  const back = readColor(background)
  if (!front || !back || back.alpha !== 1) return
  const ink = colorInSpace(front, 'rgb')
  const surface = colorInSpace(back, 'rgb')
  if (ink.space !== 'rgb' || surface.space !== 'rgb') return
  const blend = (channel: 'r' | 'g' | 'b') => ink[channel] * ink.alpha + surface[channel] * (1 - ink.alpha)
  const a = relativeLight({ r: blend('r'), g: blend('g'), b: blend('b') })
  const b = relativeLight(surface)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}

export function formatColor(value: Color, format: ColorFormat = 'hex') {
  const color = format === 'hsl' || format === 'hsb' ? colorInSpace(value, format) : value
  const output = colorToString(color, format)
  return format === 'hex' ? output.toUpperCase() : output
}

export function colorInSpace(color: Color, space: ColorSpace): Color {
  if (color.space === space) return color
  if (space === 'rgb') return convertToRgb(color)
  if (color.space === 'hsl') {
    const lightness = color.l / 100
    const brightness = lightness + color.s / 100 * Math.min(lightness, 1 - lightness)
    const saturation = brightness ? 2 * (1 - lightness / brightness) : 0
    return { space: 'hsb', h: color.h, s: saturation * 100, b: brightness * 100, alpha: color.alpha }
  }
  if (color.space === 'hsb') {
    const brightness = color.b / 100
    const lightness = brightness * (1 - color.s / 200)
    const denominator = Math.min(lightness, 1 - lightness)
    const saturation = denominator ? (brightness - lightness) / denominator : 0
    return { space: 'hsl', h: color.h, s: saturation * 100, l: lightness * 100, alpha: color.alpha }
  }
  return space === 'hsl' ? convertToHsl(color) : convertToHsb(color)
}

export function readChannel(color: Color, channel: ColorChannel) {
  return channel === 'hue' && color.space !== 'rgb' ? color.h : getChannelValue(color, channel)
}

export function writeChannel(color: Color, channel: ColorChannel, value: number): Color {
  if (channel === 'hue' && color.space !== 'rgb') return { ...color, h: clamp(value, 360) }
  return setChannelValue(color, channel, value)
}

export function channelSpace(channel: ColorChannel) {
  if (channel === 'red' || channel === 'green' || channel === 'blue') return 'rgb'
  return channel === 'brightness' ? 'hsb' : 'hsl'
}

const zhLabels: Record<ColorChannel, string> = {
  red: '红', green: '绿', blue: '蓝', hue: '色相', saturation: '饱和度',
  lightness: '明度', brightness: '亮度', alpha: '不透明度',
}

export function channelLabel(channel: ColorChannel, locale?: string) {
  return locale?.toLowerCase().startsWith('zh') ? zhLabels[channel] : channel.charAt(0).toUpperCase() + channel.slice(1)
}

export interface ColorState {
  color: Readonly<Ref<Color>>
  empty: Readonly<Ref<boolean>>
  disabled: Readonly<Ref<boolean>>
  set: (value: Color | null) => void
}

export const colorContext: InjectionKey<ColorState> = Symbol('color-state')

export function useColorState(
  model: Ref<ColorValue | null | undefined>,
  options: { defaultValue?: ColorValue; disabled?: boolean },
  useOwnModel = false,
): ColorState {
  const inherited = inject(colorContext, null)
  const bindings = getCurrentInstance()?.vnode.props ?? {}
  const own = useOwnModel || !inherited || Object.hasOwn(bindings, 'modelValue') || Object.hasOwn(bindings, 'model-value')
  const exact = shallowRef<{ css: string; value: Color }>()
  const base = parseColor(defaultColor)
  const disabled = computed(() => Boolean(options.disabled || (!own && inherited?.disabled.value)))
  const color = computed(() => {
    if (!own && inherited) return inherited.color.value
    const current = model.value === undefined ? options.defaultValue : model.value
    if (exact.value && exact.value.css === current) return exact.value.value
    return readColor(current) ?? base
  })
  const empty = computed(() => !own && inherited ? inherited.empty.value : model.value === null)

  function set(value: Color | null) {
    if (disabled.value) return
    if (!own && inherited) {
      inherited.set(value)
      return
    }
    if (!value) {
      exact.value = undefined
      model.value = null
    } else if (typeof model.value === 'object' && model.value !== null) {
      model.value = value
    } else {
      const css = formatColor(value)
      exact.value = { css, value }
      model.value = css
    }
  }

  return { color, empty, disabled, set }
}
