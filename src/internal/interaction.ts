import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { writeClipboard } from './clipboard'

export function useMediaQuery(query: MaybeRefOrGetter<string>, initial = false) {
  const matches = shallowRef(initial)
  const mounted = shallowRef(false)
  onMounted(() => { mounted.value = true })
  watch(() => [mounted.value, toValue(query)] as const, ([ready, condition], _, cleanup) => {
    if (!ready) return
    const media = window.matchMedia(condition)
    const update = () => { matches.value = media.matches }
    update()
    media.addEventListener('change', update)
    cleanup(() => media.removeEventListener('change', update))
  }, { flush: 'sync' })
  return matches
}

export function useClipboard(target?: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const state = shallowRef<'idle' | 'copied' | 'error'>('idle')
  let attempt = 0
  onScopeDispose(() => { attempt++ })
  async function copy(text: string) {
    const document = toValue(target)?.ownerDocument ?? globalThis.document
    if (!document) return false
    const id = ++attempt
    try {
      await writeClipboard(text, document)
      if (id === attempt) state.value = 'copied'
      return true
    } catch {
      if (id === attempt) state.value = 'error'
      return false
    }
  }
  return { copy, state, reset() { attempt++; state.value = 'idle' } }
}

export function useAnnounce(source?: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  let region: HTMLElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  function announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
    const element = toValue(source)
    const document = element?.ownerDocument ?? globalThis.document
    const container = element?.closest('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]') ?? document?.body
    if (!document || !container) return
    if (!region || region.parentElement !== container || region.getAttribute('aria-live') !== politeness) {
      region?.remove()
      region = document.createElement('div')
      region.className = 'sy-visually-hidden'
      region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status')
      region.setAttribute('aria-live', politeness)
      region.setAttribute('aria-atomic', 'true')
      container.append(region)
    }
    clearTimeout(timer)
    const node = region
    node.textContent = ''
    timer = setTimeout(() => { node.textContent = message }, 35)
  }
  onScopeDispose(() => { clearTimeout(timer); region?.remove() })
  return announce
}

export interface Hotkey {
  key: string
  alt?: boolean
  control?: boolean
  meta?: boolean
  shift?: boolean
  inEditable?: boolean
  repeat?: boolean
  handler(event: KeyboardEvent): void
}

export function useHotkeys(keys: MaybeRefOrGetter<readonly Hotkey[]>, target?: MaybeRefOrGetter<HTMLElement | Window | null | undefined>) {
  const mounted = shallowRef(false)
  onMounted(() => { mounted.value = true })
  watch(() => [mounted.value, toValue(target)] as const, ([ready, element], _, cleanup) => {
    if (!ready || element === null) return
    const node = element ?? window
    function onKey(input: Event) {
      const event = input as KeyboardEvent
      if (event.defaultPrevented || event.isComposing) return
      const editing = event.composedPath().some(item => item instanceof HTMLElement &&
        (item.isContentEditable || item.matches('input, textarea, select, [role="textbox"]')))
      const key = toValue(keys).find(entry => entry.key.toLowerCase() === event.key.toLowerCase() &&
        Boolean(entry.alt) === event.altKey && Boolean(entry.control) === event.ctrlKey &&
        Boolean(entry.meta) === event.metaKey && Boolean(entry.shift) === event.shiftKey &&
        (!editing || entry.inEditable) && (!event.repeat || entry.repeat))
      key?.handler(event)
    }
    node.addEventListener('keydown', onKey)
    cleanup(() => node.removeEventListener('keydown', onKey))
  }, { flush: 'post' })
}

export function useTruncation(target: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  return useTruncationState(target).isTruncated
}

export function useTruncationState(target: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const isTruncated = shallowRef(false)
  const fullText = shallowRef('')
  watch(() => toValue(target), (node, _, cleanup) => {
    if (!node) { isTruncated.value = false; fullText.value = ''; return }
    const win = node.ownerDocument.defaultView
    if (!win) return
    const measure = () => { isTruncated.value = node.scrollWidth - node.clientWidth > 1 || node.scrollHeight - node.clientHeight > 1 }
    const read = () => { fullText.value = node.textContent?.trim() ?? ''; measure() }
    const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(measure) : undefined
    if (resize) resize.observe(node)
    else win.addEventListener('resize', measure)
    const mutation = typeof win.MutationObserver === 'function' ? new win.MutationObserver(read) : undefined
    mutation?.observe(node, { subtree: true, childList: true, characterData: true })
    const fonts = node.ownerDocument.fonts
    fonts?.addEventListener('loadingdone', measure)
    let active = true
    void fonts?.ready.then(() => { if (active) measure() })
    read()
    cleanup(() => {
      active = false
      if (resize) resize.disconnect()
      else win.removeEventListener('resize', measure)
      mutation?.disconnect()
      fonts?.removeEventListener('loadingdone', measure)
    })
  }, { flush: 'post', immediate: true })
  return { isTruncated, fullText }
}
