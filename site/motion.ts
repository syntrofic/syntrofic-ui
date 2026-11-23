import { observeReducedMotion } from '../src/internal/reduced-motion'
import { createAnimatedLayout, createAnimator, glideOf, prefersReducedMotion,
  startLayoutCompanion } from '../src/internal/motion'
import { holdLayoutSwap, type HeldLayoutSwap } from '../src/internal/layout-content'

const layout = createAnimatedLayout()
const animators = new WeakMap<HTMLElement, ReturnType<typeof createAnimator>>()
const exits = new WeakMap<HTMLElement, { element: HTMLElement; animation: Animation }>()
const textExits = new WeakMap<HTMLElement, { snapshot: HeldLayoutSwap; animation: Animation }>()
const textTiming = { role: 'move', easing: 'cubic-bezier(.22,.74,.26,1)', duration: 155, fill: 'backwards' } as const

function animator(element: HTMLElement) {
  let current = animators.get(element)
  if (!current) {
    current = createAnimator(element)
    animators.set(element, current)
  }
  return current
}

function inView(element: HTMLElement, clip?: HTMLElement) {
  const { top, bottom, height } = element.getBoundingClientRect()
  const bounds = clip?.getBoundingClientRect()
  return height > 0 && bottom >= Math.max(0, bounds?.top ?? 0)
    && top <= Math.min(element.ownerDocument.defaultView?.innerHeight ?? 0, bounds?.bottom ?? Infinity)
}

function cancelDeparture(item: HTMLElement) {
  const exit = exits.get(item)
  if (!exit) return
  exit.element.remove()
  exit.animation.cancel()
  exits.delete(item)
}

export function revealSiteContent(element: HTMLElement, channel = 'reveal', layoutMotion?: { anchor: Animation | null; opacity?: number }) {
  if (typeof element.animate !== 'function' || prefersReducedMotion(element)) return
  const animation = animator(element).animate(channel, [
    { opacity: layoutMotion?.opacity ?? .55, transform: 'translateY(5px)' },
    { opacity: 1, transform: 'none' },
  ], { role: 'enter', easing: 'cubic-bezier(.22,.74,.26,1)', duration: 210, fill: 'backwards' })
  return layoutMotion ? startLayoutCompanion(element, animation, layoutMotion.anchor) : animation
}

function depart(item: HTMLElement, box: DOMRect, opacity: number, anchor: Animation | null, layer?: HTMLElement) {
  const copy = item.cloneNode(true) as HTMLElement
  copy.setAttribute('data-site-departure', '')
  copy.setAttribute('aria-hidden', 'true')
  copy.inert = true
  for (const marker of ['data-component-card', 'data-template-card', 'data-no-templates', 'data-no-components', 'hidden', 'id', 'href']) copy.removeAttribute(marker)
  for (const control of [copy, ...copy.querySelectorAll('[id], [name], [form], [autofocus]')]) {
    for (const attribute of ['id', 'name', 'form', 'autofocus']) control.removeAttribute(attribute)
  }
  const origin = layer?.getBoundingClientRect()
  const scaleX = layer && origin ? origin.width / (layer.offsetWidth || origin.width || 1) : 1
  const scaleY = layer && origin ? origin.height / (layer.offsetHeight || origin.height || 1) : 1
  Object.assign(copy.style, {
    position: layer ? 'absolute' : 'fixed',
    top: ((box.top - (origin?.top ?? 0)) / (scaleY || 1) + (layer ? layer.scrollTop - layer.clientTop : 0)) + 'px',
    left: ((box.left - (origin?.left ?? 0)) / (scaleX || 1) + (layer ? layer.scrollLeft - layer.clientLeft : 0)) + 'px',
    width: box.width / (scaleX || 1) + 'px',
    height: box.height / (scaleY || 1) + 'px',
  })
  const parent = layer ?? item.ownerDocument.body
  parent.append(copy)
  const animation = animator(copy).animate('departure', [
    { opacity, scale: 1 },
    { opacity: 0, scale: .97 },
  ], { role: 'exit', duration: 170, fill: 'backwards' })
  startLayoutCompanion(copy, animation, anchor)
  const current = { element: copy, animation }
  exits.set(item, current)
  const remove = () => { copy.remove(); if (exits.get(item) === current) exits.delete(item) }
  animation.finished.then(remove, remove)
  return animation
}

export function changeSiteItems(items: readonly HTMLElement[], update: () => void, arrivals: () => readonly HTMLElement[] = () => items,
  options: { departures?: boolean; layer?: HTMLElement; clip?: HTMLElement } = {}) {
  const first = items[0] ?? options.layer
  if (!first || prefersReducedMotion(first)) { update(); return null }
  const previous = items.filter(item => !item.hidden && inView(item, options.clip))
  const boxes = options.departures ? previous.map(item => ({ item, box: item.getBoundingClientRect(),
    opacity: Number(item.ownerDocument.defaultView?.getComputedStyle(item).opacity ?? 1) })) : []
  const past = new Set(previous)
  const play = layout(previous)
  update()
  play()
  let anchor = previous.map(glideOf).find(animation => animation !== null) ?? null
  const next = arrivals()
  if (options.departures) {
    const alive = new Set(next)
    for (const { item, box, opacity } of boxes) {
      if ((!alive.has(item) || item.hidden) && typeof item.animate === 'function') {
        const animation = depart(item, box, opacity, anchor, options.layer)
        anchor ??= animation
      }
    }
  }
  for (const item of next) {
    const exit = exits.get(item)
    if (item.hidden) continue
    const opacity = exit && Number(item.ownerDocument.defaultView?.getComputedStyle(exit.element).opacity ?? .55)
    cancelDeparture(item)
    if (!past.has(item) && inView(item, options.clip)) {
      const animation = revealSiteContent(item, 'reveal', { anchor, opacity })
      anchor ??= animation ?? null
    }
  }
  return anchor
}

export function setSiteText(element: HTMLElement, text: string, anchor?: Animation | null) {
  if (element.textContent === text) return
  const previous = textExits.get(element)
  const canAnimate = typeof element.animate === 'function' && !prefersReducedMotion(element) && inView(element)
  const snapshot = canAnimate ? holdLayoutSwap(element) : undefined
  const channel = animators.get(element)
  channel?.cancel('text')
  element.textContent = text
  if (!canAnimate) {
    previous?.snapshot.dispose()
    previous?.animation.cancel()
    return
  }
  const opacity = snapshot ? Number(snapshot.copy.style.opacity) : 0
  const earlierOpacity = previous ? Number(getComputedStyle(previous.snapshot.copy).opacity) : 0
  // During a rapid replacement, keep the strongest outgoing label and its current opacity.
  const outgoing = previous && earlierOpacity > opacity ? previous.snapshot : snapshot
  if (previous && previous.snapshot !== outgoing) previous.snapshot.dispose()
  if (snapshot && snapshot !== outgoing) snapshot.dispose()
  if (outgoing) {
    const { copy } = outgoing
    for (const attribute of Array.from(copy.attributes)) {
      if (attribute.name.startsWith('data-') || attribute.name === 'role' || attribute.name === 'aria-live') copy.removeAttribute(attribute.name)
    }
    copy.dataset.siteTextCopy = ''
    const strength = Math.max(opacity, earlierOpacity)
    const fade = animator(copy).animate('text', [{ opacity: strength }, { opacity: 0 }], textTiming)
    startLayoutCompanion(copy, fade, anchor)
    const departure = { snapshot: outgoing, animation: fade }
    textExits.set(element, departure)
    const remove = () => {
      // A replacement can reuse the same copy while its first effect is canceled.
      if (textExits.get(element)?.snapshot === outgoing && textExits.get(element) !== departure) return
      outgoing.dispose()
      if (textExits.get(element) === departure) textExits.delete(element)
    }
    fade.finished.then(remove, remove)
    anchor ??= fade
  }
  if (previous?.snapshot !== outgoing) previous?.animation.cancel()
  const incoming = animator(element).animate('text', [{ opacity: outgoing ? 0 : .45 }, { opacity: 1 }], textTiming)
  return startLayoutCompanion(element, incoming, anchor)
}

export function changeSiteHeight(element: HTMLElement, update: () => Animation | null, maxHeight = Infinity) {
  if (typeof element.animate !== 'function' || prefersReducedMotion(element)) {
    animators.get(element)?.cancel('height')
    return update()
  }
  const height = () => Math.min(maxHeight, parseFloat(getComputedStyle(element).height))
  const from = height()
  const channel = animator(element)
  channel.cancel('height')
  const anchor = update()
  const to = height()
  if (!inView(element) || !(Math.abs(to - from) > 1)) return anchor
  const expansion = channel.animate('height', [
    { height: from + 'px', overflow: 'clip' },
    { height: to + 'px', overflow: 'clip' },
  ], { role: 'move', duration: 265, easing: 'cubic-bezier(.22,.74,.26,1)', fill: 'backwards' })
  startLayoutCompanion(element, expansion, anchor)
  // Let the browser scroll a newly focused control into its final viewport.
  const finishForFocus = () => expansion.cancel()
  element.addEventListener('focusin', finishForFocus, { once: true })
  const cleanup = () => element.removeEventListener('focusin', finishForFocus)
  expansion.finished.then(cleanup, cleanup)
  return anchor ?? expansion
}

export function setSiteDisclosure(details: HTMLDetailsElement, open: boolean, animate = true) {
  const shell = details.parentElement
  const panel = details.querySelector<HTMLElement>(':scope > [data-site-disclosure-panel]')
  const update = () => {
    if (!open && panel?.contains(details.ownerDocument.activeElement)) details.querySelector('summary')?.focus({ preventScroll: true })
    details.open = open
  }
  if (!panel || !shell) { update(); return }
  if (!animate || prefersReducedMotion(shell)) {
    animators.get(shell)?.cancel('height')
    animators.get(panel)?.cancel('reveal')
    cancelDeparture(panel)
    update()
    return
  }
  if (details.open === open) return
  // Keep the native open state in sync. Only the visual snapshot outlives a close.
  const change = () => changeSiteItems(details.open ? [panel] : [], update, () => open ? [panel] : [], { departures: true, layer: shell })
  if (details.dataset.siteDisclosure === 'popup') change()
  else {
    // Long tables can extend naturally beyond the viewport once the visible part has moved.
    const viewport = shell.ownerDocument.defaultView?.innerHeight ?? Infinity
    changeSiteHeight(shell, change, Math.max(0, viewport - shell.getBoundingClientRect().top))
  }
  if (!open) animators.get(panel)?.cancel('reveal')
}

export function showIslandError(island: HTMLElement, retry: () => void, restoreFocus = false) {
  const existing = island.querySelector<HTMLElement>(':scope > .island-error')
  island.dataset.islandState = 'error'
  island.removeAttribute('aria-busy')
  if (existing) {
    const message = existing.querySelector<HTMLElement>('[role="status"]')!
    const button = existing.querySelector<HTMLButtonElement>('[data-island-retry]')!
    const refresh = existing.querySelector<HTMLButtonElement>('[data-island-refresh]')!
    const anchor = setSiteText(message, '互动示例仍未载入。')
    button.removeAttribute('aria-disabled')
    setSiteText(button.querySelector<HTMLElement>('[data-site-action-label]')!, '重新加载示例', anchor)
    if (refresh.hidden) {
      changeSiteHeight(island, () => changeSiteItems([], () => { refresh.hidden = false }, () => [refresh], { layer: island }))
    }
    return
  }
  changeSiteHeight(island, () => {
    const message = document.createElement('div')
    const status = document.createElement('span')
    const retryButton = document.createElement('button')
    const label = document.createElement('span')
    const refresh = document.createElement('button')
    message.className = 'island-error'
    status.setAttribute('role', 'status')
    status.textContent = '互动示例加载失败。'
    retryButton.type = refresh.type = 'button'
    retryButton.dataset.islandRetry = refresh.dataset.islandRefresh = ''
    label.dataset.siteActionLabel = ''
    label.textContent = '重新加载示例'
    retryButton.append(label)
    refresh.textContent = '刷新网页'
    refresh.hidden = true
    refresh.addEventListener('click', () => location.reload())
    retryButton.addEventListener('click', () => {
      if (island.dataset.islandState !== 'error') return
      island.dataset.islandState = 'loading'
      island.setAttribute('aria-busy', 'true')
      retryButton.setAttribute('aria-disabled', 'true')
      const anchor = setSiteText(status, '正在重新加载互动示例…')
      setSiteText(label, '正在重试…', anchor)
      retry()
    })
    message.append(status, retryButton, refresh)
    island.replaceChildren(message)
    if (restoreFocus) retryButton.focus({ preventScroll: true })
    return null
  })
}

export function installSiteNavigation() {
  const browser = window as Window & { navigation?: EventTarget }
  const root = document.documentElement
  const status = document.querySelector<HTMLElement>('[data-site-navigation-status]')
  if (!status) return
  let pending: { href: string } | undefined
  let notice: ReturnType<typeof setTimeout> | undefined
  let anchorDestination: string | undefined
  let anchorScrollTimeout: number | undefined
  const clearAnchorScroll = () => {
    if (!anchorDestination) return
    anchorDestination = undefined
    window.clearTimeout(anchorScrollTimeout)
    delete root.dataset.siteAnchorScroll
  }
  const interruptAnchorScroll = () => {
    if (!anchorDestination) return
    clearAnchorScroll()
    const top = window.scrollY
    // A distinct position also replaces asynchronous scrolls when a no-op would be coalesced.
    window.scrollTo({ left: window.scrollX, top: top >= 1 ? top - 1 : 1, behavior: 'instant' })
  }
  const clearNotice = () => {
    pending = undefined
    clearTimeout(notice)
    delete root.dataset.siteNavigation
    status.textContent = ''
  }
  const startNotice = (href: string) => {
    const current = { href }
    pending = current
    clearTimeout(notice)
    notice = setTimeout(() => {
      if (pending !== current) return
      root.dataset.siteNavigation = 'pending'
      status.textContent = '正在加载页面…'
    }, 180)
    return current
  }
  window.addEventListener('pagehide', () => {
    clearNotice()
    clearAnchorScroll()
  })
  document.addEventListener('scrollend', event => {
    if (event.target !== document || !anchorDestination) return
    const target = document.querySelector<HTMLElement>(':target')
    const scroll = document.scrollingElement
    if (anchorDestination !== location.href || !target || !scroll || prefersReducedMotion(root)) {
      clearAnchorScroll()
      return
    }
    // Lazy previews can grow above a heading while the native scroll is running.
    const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0
    const margin = parseFloat(getComputedStyle(target).scrollMarginBlockStart) || 0
    const desired = scroll.scrollTop + target.getBoundingClientRect().top - padding - margin
    const top = Math.max(0, Math.min(desired, scroll.scrollHeight - scroll.clientHeight))
    if (Math.abs(top - scroll.scrollTop) <= 1) clearAnchorScroll()
    else window.scrollTo({ top, behavior: 'smooth' })
  })
  window.addEventListener('popstate', () => {
    if (anchorDestination !== location.href) clearAnchorScroll()
  })
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    document.addEventListener(event, interruptAnchorScroll, { capture: true, passive: true })
  }
  observeReducedMotion(root, reduced => { if (reduced) interruptAnchorScroll() })
  browser.navigation?.addEventListener('navigate', event => {
    const { destination, signal, navigationType, downloadRequest } = event as Event & {
      destination?: { url: string; sameDocument: boolean }; signal?: AbortSignal; navigationType?: string; downloadRequest?: string | null
    }
    if (!destination || !signal) return
    if (pending && pending.href !== destination.url) clearNotice()
    if (destination.sameDocument || navigationType === 'reload' || downloadRequest != null || new URL(destination.url).origin !== location.origin) return
    const current = pending ?? startNotice(destination.url)
    const onAbort = () => {
      if (pending === current) clearNotice()
    }
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })
  document.addEventListener('keydown', event => {
    if (pending && event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('.search-dialog[open]')) clearNotice()
  })
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.shiftKey || event.metaKey || event.ctrlKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : undefined
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')
      || (anchor.target && anchor.target.toLowerCase() !== '_self')) return
    const next = new URL(anchor.href, location.href)
    if (next.origin !== location.origin || !['http:', 'https:'].includes(next.protocol)) return
    if (next.pathname === location.pathname && next.search === location.search) {
      if (next.hash && !prefersReducedMotion(root)) {
        // The click keeps its native fragment, focus, history and scroll destination.
        anchorDestination = next.href
        root.dataset.siteAnchorScroll = ''
        window.clearTimeout(anchorScrollTimeout)
        anchorScrollTimeout = window.setTimeout(clearAnchorScroll, 1500)
      }
      return
    }
    startNotice(next.href)
  })
}
