import type { NativeCarouselScroll } from './carousel-scroll'
import { prefersReducedMotion, themeTempo } from './motion'
import { movePaging, releasePage } from './paging-motion'
import { createPanGesture } from './pan-gesture'
import type { SnapPaging } from './snap-paging'

export function attachCarouselPager(scroll: NativeCarouselScroll, capability: SnapPaging) {
  const { node } = scroll
  const view = node.ownerDocument.defaultView!
  let frame = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let gesture: { index: number; offset: number; distance: number; velocity: number; last: number; pages: 'view' | 'item'; input: 'pointer' | 'wheel' } | undefined

  function endMotion() {
    view.cancelAnimationFrame(frame)
    frame = 0
  }
  function step(index: number, direction: number, pages: 'view' | 'item') {
    const stops = scroll.stops()
    const neighbor = Math.max(0, Math.min(stops.length - 1, index + direction))
    if (pages === 'item' || neighbor === index) return neighbor
    const near = scroll.closest(stops[index] + direction * scroll.length())
    return Math.abs(near - index) < 1 ? neighbor : near
  }
  function begin(input: 'pointer' | 'wheel') {
    clearTimeout(timer)
    endMotion()
    const offset = scroll.read()
    scroll.hold(true)
    gesture = { index: scroll.closest(offset), offset, distance: 0, velocity: 0, last: 0, pages: capability.pages.value, input }
  }
  function move(distance: number, velocity: number) {
    const current = gesture
    if (!current) return
    const stops = scroll.stops()
    const low = stops[step(current.index, -1, current.pages)] ?? 0
    const high = stops[step(current.index, 1, current.pages)] ?? low
    current.distance = distance
    current.velocity = velocity
    scroll.write(Math.min(high, Math.max(low, current.offset + distance)))
  }
  function settle(cancelled = false) {
    const current = gesture
    gesture = undefined
    clearTimeout(timer)
    if (!current) return
    const stops = scroll.stops()
    const from = scroll.read()
    const distance = from - (stops[current.index] ?? from)
    const travel = step(current.index, Math.sign(distance || current.velocity || 1), current.pages)
    const size = Math.max(1, Math.abs((stops[travel] ?? from) - (stops[current.index] ?? from)))
    const velocity = cancelled ? 0 : current.velocity
    const change = cancelled ? 0 : releasePage(0, distance / size, velocity)
    const target = change ? step(current.index, change, current.pages) : current.index
    const destination = stops[target] ?? from
    scroll.select(target)
    if (prefersReducedMotion(node) || Math.abs(from - destination) < 1) {
      scroll.hold(false)
      scroll.go(target, false)
      return
    }

    let motion = { position: from, velocity: Math.max(-3, Math.min(3, velocity)) }
    let last = view.performance.now()
    const tempo = themeTempo(node)
    function animate(now: number) {
      const next = movePaging(motion, destination, (now - last) / tempo)
      last = now
      motion = next
      scroll.write(next.position)
      if (next.settled) {
        frame = 0
        scroll.hold(false)
        scroll.go(target, false)
      } else frame = view.requestAnimationFrame(animate)
    }
    frame = view.requestAnimationFrame(animate)
  }
  function passWheel() {
    if (gesture?.input === 'pointer') return
    clearTimeout(timer)
    gesture = undefined
    endMotion()
    scroll.hold(false)
  }
  function wheel(event: WheelEvent) {
    if (gesture?.input === 'pointer') return
    const along = scroll.vertical() ? event.deltaY : event.deltaX
    const across = scroll.vertical() ? event.deltaX : event.deltaY
    const legacy = event as WheelEvent & { wheelDeltaX?: number; wheelDeltaY?: number }
    const quantized = scroll.vertical() ? legacy.wheelDeltaY : legacy.wheelDeltaX
    const wheelStep = quantized && Math.abs(quantized) % 120 < .01
    if (event.ctrlKey || event.shiftKey || event.deltaMode !== 0 || !along || Math.abs(along) < Math.abs(across)
      || wheelStep || (!gesture && Math.abs(along) >= 50) || !event.cancelable || scroll.stops().length < 2) {
      passWheel()
      return
    }
    event.preventDefault()
    if (!gesture) begin('wheel')
    const current = gesture!
    const delta = along * scroll.sign()
    const elapsed = current.last ? Math.max(12, event.timeStamp - current.last) : 16
    const speed = delta / elapsed
    current.last = event.timeStamp
    move(current.distance + delta, .5 * current.velocity + .5 * speed)
    clearTimeout(timer)
    timer = setTimeout(settle, 105)
  }
  node.addEventListener('wheel', wheel, { passive: false })
  const disconnect = createPanGesture(node, {
    axis: scroll.vertical() ? 'vertical' : 'horizontal',
    shouldStart(event) {
      return event.pointerType !== 'mouse' && scroll.stops().length > 1
        && !(event.target instanceof Element && event.target.closest('a, button, input, select, textarea, [contenteditable], video'))
    },
    onStart() { begin('pointer') },
    onMove(position) {
      const along = scroll.vertical() ? position.y : position.x
      const velocity = scroll.vertical() ? position.velocityY : position.velocityX
      move(-along * scroll.sign(), -velocity * scroll.sign())
    },
    onEnd(position, _, cancelled) {
      if (gesture) {
        const velocity = scroll.vertical() ? position.velocityY : position.velocityX
        gesture.velocity = -velocity * scroll.sign()
      }
      settle(cancelled)
    },
  })
  function cancel() {
    clearTimeout(timer)
    endMotion()
    gesture = undefined
    scroll.hold(false)
  }
  return { cancel, destroy() { cancel(); disconnect(); node.removeEventListener('wheel', wheel) } }
}
