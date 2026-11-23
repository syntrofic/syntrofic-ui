import { shallowRef, watch, type Ref } from 'vue'
import { observeReducedMotion } from '../internal/reduced-motion'

export function watchChartPalette(root: HTMLElement, tokens: readonly string[], update: (colors: string[]) => void) {
  const palette = observeChartColors(root, update)
  palette.set(tokens.map(name => `var(--sy-${name})`))
  return palette.dispose
}

export function useChartColors(canvas: Readonly<Ref<HTMLCanvasElement | null>>, values: () => readonly string[]) {
  const colors = shallowRef<string[]>([])
  watch(canvas, (node, _, cleanup) => {
    if (!node?.parentElement) return
    const palette = observeChartColors(node.parentElement, next => { colors.value = next }, true)
    const stop = watch(values, palette.set, { immediate: true, flush: 'post' })
    cleanup(() => { stop(); palette.dispose() })
  }, { flush: 'post', immediate: true })
  return colors
}

function observeChartColors(root: HTMLElement, update: (colors: string[]) => void, animate = false) {
  const document = root.ownerDocument
  const window = document.defaultView
  if (!window) return { set: (_values: readonly string[]) => {}, dispose() {} }
  const view = window
  const host = document.createElement('span')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:absolute; width:0; height:0; overflow:hidden; visibility:hidden; pointer-events:none'
  root.append(host)
  const probes: HTMLSpanElement[] = []
  let previous = ''
  let frame = 0
  let reduced = false

  function read() {
    const colors = probes.map(probe => view.getComputedStyle(probe).color)
    const signature = colors.join('|')
    if (signature !== previous) {
      previous = signature
      update(colors)
    }
    if (animate && !frame && !reduced && probes.some(probe => probe.getAnimations().some(
      effect => 'transitionProperty' in effect && effect.transitionProperty === 'color'))) {
      frame = view.requestAnimationFrame(() => { frame = 0; read() })
    }
  }
  function set(values: readonly string[]) {
    while (probes.length > values.length) probes.pop()?.remove()
    values.forEach((value, index) => {
      let probe = probes[index]
      if (!probe) {
        probe = document.createElement('span')
        if (animate) probe.style.transition = 'color var(--sy-chart-palette-duration) var(--sy-ease-settle, cubic-bezier(.23,.72,.24,1))'
        probes.push(probe)
        host.append(probe)
      }
      probe.style.color = ''
      probe.style.color = value
    })
    read()
  }
  const observer = new view.MutationObserver(read)
  for (let ancestor: Element | null = root; ancestor;) {
    observer.observe(ancestor, { attributes: true, attributeFilter: ['data-sy-theme', 'data-sy-brand', 'style', 'class'] })
    const tree = ancestor.getRootNode()
    ancestor = ancestor.parentElement ?? ('host' in tree ? (tree as ShadowRoot).host : null)
  }
  const stopMotion = animate ? observeReducedMotion(root, value => {
    reduced = value
    host.style.setProperty('--sy-chart-palette-duration', value ? '0ms' : 'var(--sy-motion-replace, 220ms)')
    if (value) {
      // A change in transition-duration alone does not stop a running transition.
      probes.forEach(probe => probe.getAnimations().forEach(effect => {
        if ('transitionProperty' in effect && effect.transitionProperty === 'color') effect.cancel()
      }))
    }
    read()
  }) : undefined
  const media = view.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', read)
  return { set, dispose() {
    observer.disconnect()
    stopMotion?.()
    media.removeEventListener('change', read)
    if (frame) view.cancelAnimationFrame(frame)
    host.remove()
  } }
}
