import { shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { TocItem } from '../components/SFloatingToc.vue'

export function useOutlineFromDOM(container: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const items = shallowRef<readonly TocItem[]>([])
  watch(() => toValue(container), (node, _, cleanup) => {
    if (!node) {
      items.value = []
      return
    }
    const content = node
    function read() {
      const next = [...content.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')].flatMap(heading => {
        const id = heading.id.trim()
        const label = heading.textContent?.trim()
        return id && label ? [{ id, label, level: Number(heading.tagName.slice(1)) }] : []
      })
      if (next.length === items.value.length && next.every((item, index) => {
        const previous = items.value[index]
        return previous.id === item.id && previous.label === item.label && previous.level === item.level
      })) return
      items.value = next
    }
    read()
    const Observer = node.ownerDocument.defaultView?.MutationObserver
    if (!Observer) return
    const observer = new Observer(read)
    observer.observe(node, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['id'] })
    cleanup(() => observer.disconnect())
  }, { flush: 'post', immediate: true })
  return items
}
