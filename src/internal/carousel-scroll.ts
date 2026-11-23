import { prefersReducedMotion } from './motion'

export interface NativeCarouselPosition {
  selected: number
  count: number
  visible: readonly number[]
}

export function createCarouselScroll(node: HTMLElement, options: {
  axis: () => 'x' | 'y'
  initial: () => number
  update: (position: NativeCarouselPosition, settled: boolean) => void
  interact: () => void
}) {
  const view = node.ownerDocument.defaultView!
  const track = node.firstElementChild
  let stops: readonly number[] = []
  let selected = options.initial()
  let suspended = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let initialized = false
  const vertical = () => options.axis() === 'y'
  const sign = () => !vertical() && view.getComputedStyle(node).direction === 'rtl' ? -1 : 1
  const length = () => vertical() ? node.clientHeight : node.clientWidth
  const maximum = () => Math.max(0, (vertical() ? node.scrollHeight : node.scrollWidth) - length())
  const read = () => (vertical() ? node.scrollTop : node.scrollLeft) * sign()
  function write(position: number, smooth = false) {
    const value = Math.min(maximum(), Math.max(0, position)) * sign()
    node.scrollTo({ [vertical() ? 'top' : 'left']: value, behavior: smooth && !prefersReducedMotion(node) ? 'smooth' : 'instant' })
  }
  function slides() { return track ? Array.from(track.children) : [] }
  function closest(position: number) {
    let target = 0
    for (let index = 1; index < stops.length; index++) {
      if (Math.abs(position - stops[index]) < Math.abs(position - stops[target])) target = index
    }
    return target
  }
  function visible() {
    const area = node.getBoundingClientRect()
    const along = vertical()
    const start = along ? area.top + node.clientTop : area.left + node.clientLeft
    const end = start + length()
    return slides().flatMap((slide, index) => {
      const box = slide.getBoundingClientRect()
      const from = along ? box.top : box.left
      const to = along ? box.bottom : box.right
      const overlap = Math.min(end, to) - Math.max(start, from)
      return overlap > Math.min(to - from, end - start) * .12 ? [index] : []
    })
  }
  function notify(settled: boolean) {
    options.update({ selected, count: stops.length, visible: visible() }, settled)
  }
  function select(index: number) {
    selected = Math.max(0, Math.min(stops.length - 1, Math.floor(index) || 0))
    notify(true)
  }
  function measure() {
    const area = node.getBoundingClientRect()
    const extent = maximum()
    const direction = sign()
    const along = vertical()
    const offset = read()
    const pins: number[] = []
    for (const slide of slides()) {
      const box = slide.getBoundingClientRect()
      const edge = along ? box.top - area.top - node.clientTop :
        direction > 0 ? box.left - area.left - node.clientLeft : area.left + node.clientLeft + node.clientWidth - box.right
      const next = Math.max(0, Math.min(extent, offset + edge))
      if (!pins.length || next > pins[pins.length - 1] + 1) pins.push(next)
    }
    if (!pins.length && !stops.length) return
    const changed = pins.length !== stops.length || pins.some((position, index) => Math.abs(position - stops[index]) > 1)
    stops = pins
    if (changed || !initialized) {
      initialized = true
      selected = Math.min(selected, Math.max(0, stops.length - 1))
      if (!suspended) write(stops[selected] ?? 0)
      notify(true)
    } else notify(false)
  }
  function measureSoon() {
    if (frame) return
    frame = view.requestAnimationFrame(() => { frame = 0; measure() })
  }
  function settle() {
    clearTimeout(timer)
    if (!suspended && stops.length) select(closest(read()))
  }
  function onScroll() {
    notify(false)
    if (suspended) return
    clearTimeout(timer)
    timer = setTimeout(settle, 135)
  }
  function onInteract() { options.interact() }
  function go(index: number, smooth = true) {
    if (!stops.length) return
    select(index)
    write(stops[selected], smooth)
  }
  function hold(active: boolean) {
    suspended = active
    clearTimeout(timer)
    node.toggleAttribute('data-snap-held', active)
  }
  const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(measureSoon) : undefined
  resize?.observe(node)
  if (track) resize?.observe(track)
  node.addEventListener('scroll', onScroll, { passive: true })
  node.addEventListener('scrollend', settle)
  node.addEventListener('pointerdown', onInteract, { passive: true })
  node.addEventListener('wheel', onInteract, { passive: true })
  measure()

  function destroy() {
    hold(false)
    view.cancelAnimationFrame(frame)
    resize?.disconnect()
    node.removeEventListener('scroll', onScroll)
    node.removeEventListener('scrollend', settle)
    node.removeEventListener('pointerdown', onInteract)
    node.removeEventListener('wheel', onInteract)
  }
  return { go, measure: measureSoon, destroy, hold, read, write, sign, length, closest, select,
    stops: () => stops, vertical, node }
}

export type NativeCarouselScroll = ReturnType<typeof createCarouselScroll>
