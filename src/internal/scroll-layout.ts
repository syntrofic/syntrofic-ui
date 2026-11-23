import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

export type ScrollEdge = 'top' | 'bottom' | 'start' | 'end'
type ElementSource = MaybeRefOrGetter<HTMLElement | null | undefined>
export interface ScrollOverflowOptions {
  orientation?: 'vertical' | 'horizontal' | 'both'
  threshold?: number
  edges?: readonly ScrollEdge[]
  content?: ElementSource
}
export interface ScrollableAreaOptions {
  axis?: 'inline' | 'block' | 'both'
  keyboardOwner?: 'viewport' | 'content' | 'content-or-viewport'
  overscroll?: 'allow' | 'contain'
  stickyContainment?: 'when-scrollable' | 'always'
}

export function observeLayout(viewport: HTMLElement, content: HTMLElement | undefined, measure: () => void, scroll = false) {
  const view = viewport.ownerDocument.defaultView
  if (!view) return () => {}
  const box = content ?? viewport
  let frame = 0
  const schedule = () => {
    if (!frame) frame = view.requestAnimationFrame(() => { frame = 0; measure() })
  }
  const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : undefined
  function observe() {
    resize?.disconnect()
    resize?.observe(viewport)
    if (content) resize?.observe(content)
    for (const item of box.children) resize?.observe(item)
  }
  const mutation = new view.MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) observe()
    schedule()
  })
  mutation.observe(box, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'dir', 'hidden', 'tabindex', 'disabled'] })
  if (content && content !== viewport) mutation.observe(viewport, { attributes: true, attributeFilter: ['style', 'class', 'dir', 'hidden'] })
  if (scroll) viewport.addEventListener('scroll', schedule, { passive: true })
  box.addEventListener('load', schedule, true)
  view.addEventListener('resize', schedule)
  observe()
  measure()
  return () => {
    resize?.disconnect()
    mutation.disconnect()
    viewport.removeEventListener('scroll', schedule)
    box.removeEventListener('load', schedule, true)
    view.removeEventListener('resize', schedule)
    if (frame) view.cancelAnimationFrame(frame)
  }
}

const dimensions = (node: HTMLElement) => ({ width: node.scrollWidth - node.clientWidth, height: node.scrollHeight - node.clientHeight })

export function useScrollOverflow(target?: ElementSource, options: MaybeRefOrGetter<ScrollOverflowOptions> = {}) {
  const attached = shallowRef<HTMLElement | null>(null)
  const viewport = computed(() => target === undefined ? attached.value : toValue(target))
  const content = computed(() => toValue(toValue(options).content))
  const visible = shallowRef<ScrollEdge[]>([])
  const scrollable = shallowRef(false)
  function measure() {
    const node = viewport.value
    if (!node) return
    const { orientation = 'horizontal', threshold = 1, edges } = toValue(options)
    const tolerance = Number.isFinite(threshold) ? Math.max(1, threshold) : 1
    const vertical = orientation !== 'horizontal'
    const horizontal = orientation !== 'vertical'
    const top = Math.max(0, node.scrollTop)
    const start = Math.max(0, (node.matches(':dir(rtl)') ? -1 : 1) * node.scrollLeft)
    const { width, height } = dimensions(node)
    const next: ScrollEdge[] = []
    if (vertical && top > tolerance) next.push('top')
    if (vertical && height - top > tolerance) next.push('bottom')
    if (horizontal && start > tolerance) next.push('start')
    if (horizontal && width - start > tolerance) next.push('end')
    const allowed = edges ? next.filter(edge => edges.includes(edge)) : next
    scrollable.value = (vertical && height > 1) || (horizontal && width > 1)
    if (visible.value.join(' ') !== allowed.join(' ')) visible.value = allowed
  }
  watch([viewport, content], ([node, box], _, cleanup) => {
    if (node) cleanup(observeLayout(node, box ?? undefined, measure, true))
    else { visible.value = []; scrollable.value = false }
  }, { immediate: true, flush: 'post' })
  watch(() => toValue(options), measure, { deep: true, flush: 'post' })
  return { scrollRef: (node: HTMLElement | null) => { attached.value = node }, edges: visible, hasOverflow: scrollable,
    overflowStart: computed(() => visible.value.includes('start')), overflowEnd: computed(() => visible.value.includes('end')), measure }
}

export function useScrollableArea(options: MaybeRefOrGetter<ScrollableAreaOptions> = {}) {
  const viewport = shallowRef<HTMLElement | null>(null)
  const content = shallowRef<HTMLElement | null>(null)
  const state = shallowRef({ inline: false, block: false, inlineStart: false, inlineEnd: false, blockStart: false, blockEnd: false, delegated: false })
  function measure() {
    const node = viewport.value
    const view = node?.ownerDocument.defaultView
    if (!node || !view) return
    const { axis = 'block', keyboardOwner = 'viewport' } = toValue(options)
    const style = view.getComputedStyle(node)
    const vertical = /^(vertical|sideways)/.test(style.writingMode)
    const rtl = style.direction === 'rtl'
    const { width, height } = dimensions(node)
    const inlineExtent = vertical ? height : width
    const blockExtent = vertical ? width : height
    const inlinePosition = Math.max(0, (vertical ? node.scrollTop : node.scrollLeft) * (rtl ? -1 : 1))
    const blockPosition = Math.max(0, vertical ? node.scrollLeft * (style.writingMode.endsWith('-rl') ? -1 : 1) : node.scrollTop)
    const inline = axis !== 'block' && inlineExtent > 1
    const block = axis !== 'inline' && blockExtent > 1
    const first = keyboardOwner === 'content-or-viewport' ? [...(content.value?.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex], [contenteditable]') ?? [])]
      .find(control => control.tabIndex >= 0 && !control.matches(':disabled') && !control.closest('[hidden], [inert]') && control.getClientRects().length) : undefined
    const delegated = Boolean(first?.matches('a[href],button') && !first.closest('[role="menu"],[role="listbox"],[role="grid"],[role="tree"]'))
    const next = { inline, block, inlineStart: inline && inlinePosition > 1, inlineEnd: inline && inlineExtent - inlinePosition > 1,
      blockStart: block && blockPosition > 1, blockEnd: block && blockExtent - blockPosition > 1, delegated }
    if ((Object.keys(next) as (keyof typeof next)[]).some(key => state.value[key] !== next[key])) state.value = next
  }
  watch([viewport, content], ([node, box], _, cleanup) => {
    if (node) cleanup(observeLayout(node, box ?? undefined, measure, true))
  }, { immediate: true, flush: 'post' })
  watch(() => toValue(options), measure, { deep: true, flush: 'post' })
  const viewportAttrs = computed(() => {
    const { axis = 'block', keyboardOwner = 'viewport', overscroll = 'allow', stickyContainment = 'when-scrollable' } = toValue(options)
    const active = state.value.inline || state.value.block
    return { 'data-axis': axis, 'data-overscroll': overscroll, 'data-inline': state.value.inline || undefined,
      'data-block': state.value.block || undefined, 'data-sticky': stickyContainment,
      tabindex: active && keyboardOwner !== 'content' && !state.value.delegated ? 0 : -1 }
  })
  return { viewport, content, state, viewportAttrs, measure }
}
