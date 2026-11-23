import { onMounted, readonly, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { contentUrl } from './content-url'
import { colorInSpace, readColor, relativeLight } from './color'

export type ImageMode = 'light' | 'dark'
export interface ImageSampleRegion { x: number; y: number; width: number; height: number }
export interface ImageModeOptions { region?: ImageSampleRegion; threshold?: number; fallback?: ImageMode | null }
const clamp = (value: number, fallback: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
const lightness = (r: number, g: number, b: number) => .2126729 * (r / 255) ** 2.4 + .7151522 * (g / 255) ** 2.4 + .072175 * (b / 255) ** 2.4

export function useImageMode(source: MaybeRefOrGetter<string | null | undefined>, settings: MaybeRefOrGetter<ImageModeOptions> = {}) {
  const ready = ref(false)
  const mode = ref<ImageMode | null>(toValue(settings).fallback ?? null)
  onMounted(() => { ready.value = true })
  watch(() => ({ ready: ready.value, source: toValue(source), options: toValue(settings) }), ({ ready, source, options }, _, cleanup) => {
    mode.value = options.fallback ?? null
    const url = contentUrl(source, true)
    if (!ready || !url) return
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const sample = options.region
      const x = clamp(sample?.x ?? 0, 0)
      const y = clamp(sample?.y ?? 0, 0)
      const width = Math.min(1 - x, clamp(sample?.width ?? 1, 1)) * image.naturalWidth
      const height = Math.min(1 - y, clamp(sample?.height ?? 1, 1)) * image.naturalHeight
      if (width < 1 || height < 1) return
      try {
        const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(24, 24) : document.createElement('canvas')
        canvas.width = canvas.height = 24
        const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d', { willReadFrequently: true })
          : canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(image, x * image.naturalWidth, y * image.naturalHeight, width, height, 0, 0, 24, 24)
        const pixels = ctx.getImageData(0, 0, 24, 24).data
        let weighted = 0
        let opacity = 0
        for (let at = 0; at < pixels.length; at += 4) {
          const alpha = pixels[at + 3] / 255
          weighted += alpha * lightness(pixels[at], pixels[at + 1], pixels[at + 2])
          opacity += alpha
        }
        if (opacity) mode.value = (weighted / opacity) ** .56 <= clamp(options.threshold ?? .5, .5) ? 'dark' : 'light'
      } catch { /* A cross-origin image can be displayed without permitting reads. */ }
    }
    cleanup(() => { image.onload = null })
    image.src = url
  }, { immediate: true })
  return readonly(mode)
}

type Rgba = { r: number; g: number; b: number; alpha: number }
function channels(value: string): Rgba | undefined {
  const srgb = /^color\(\s*srgb\s+(.+)\)$/i.exec(value)?.[1]
  let source = value
  if (srgb) {
    const [components, alpha] = srgb.split('/')
    const scaled = components.trim().split(/\s+/).map(value => value.endsWith('%') ? value : Number(value) * 100 + '%')
    source = `rgb(${scaled.join(' ')}${alpha ? ' / ' + alpha.trim() : ''})`
  }
  const color = readColor(source)
  if (!color) return
  const rgb = colorInSpace(color, 'rgb')
  return rgb.space === 'rgb' ? rgb : undefined
}

function composite(front: Rgba, back: Rgba): Rgba {
  const ratio = back.alpha * (1 - front.alpha)
  const alpha = front.alpha + ratio
  if (!alpha) return front
  return { r: (front.r * front.alpha + back.r * ratio) / alpha, g: (front.g * front.alpha + back.g * ratio) / alpha,
    b: (front.b * front.alpha + back.b * ratio) / alpha, alpha }
}

export function useSurfaceMode(root: Readonly<Ref<HTMLElement | null>>, state: () => { enabled: boolean; light: string; dark: string }) {
  const mode = ref<ImageMode | 'off'>()
  watch(() => ({ element: root.value, ...state() }), ({ element, enabled, light, dark }, _, cleanup) => {
    const view = element?.ownerDocument.defaultView
    if (!view || !element || !enabled) { mode.value = undefined; return }
    let frame = 0
    const ancestors: HTMLElement[] = []
    for (let node: HTMLElement | null = element; node; node = node.parentElement) ancestors.push(node)
    const lightInk = channels(light)
    const darkInk = channels(dark)
    function measure() {
      frame = 0
      let surface: Rgba = { r: 0, g: 0, b: 0, alpha: 0 }
      for (const node of ancestors) {
        const style = view!.getComputedStyle(node)
        if (style.backgroundImage !== 'none' || style.opacity !== '1') { mode.value = undefined; return }
        const background = channels(style.backgroundColor)
        if (!background) break
        surface = composite(surface, background)
        if (surface.alpha >= .99) break
      }
      if (surface.alpha < .99) { mode.value = undefined; return }
      const luminance = relativeLight(surface)
      const ambient = channels(view!.getComputedStyle(element!.parentElement ?? element!).color)
      function contrast(ink?: Rgba) {
        if (!ink) return 0
        const other = relativeLight(composite(ink, surface))
        return (Math.max(luminance, other) + .05) / (Math.min(luminance, other) + .05)
      }
      mode.value = contrast(ambient) >= 3 ? 'off' : contrast(darkInk) > contrast(lightInk) ? 'dark' : 'light'
    }
    const update = () => { if (!frame) frame = view.requestAnimationFrame(measure) }
    const Observer = view.MutationObserver
    const changes = typeof Observer === 'function' ? new Observer(update) : undefined
    for (const node of ancestors) changes?.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'data-sy-theme', 'data-sy-brand'] })
    const transition = (event: TransitionEvent) => {
      if (event.target instanceof HTMLElement && ancestors.includes(event.target) && ['background-color', 'color', 'opacity'].includes(event.propertyName)) update()
    }
    view.addEventListener('resize', update)
    view.addEventListener('transitionend', transition, true)
    update()
    cleanup(() => { changes?.disconnect(); view.cancelAnimationFrame(frame); view.removeEventListener('resize', update); view.removeEventListener('transitionend', transition, true) })
  }, { flush: 'post', immediate: true })
  return readonly(mode)
}
