type Measure = () => void
const documents = new WeakMap<Document, {
  observer: ResizeObserver
  targets: Map<Element, Set<Measure>>
}>()

export function observeResize(element: HTMLElement, view: Window & typeof globalThis, measure: Measure) {
  const document = element.ownerDocument
  if (typeof view.ResizeObserver !== 'function') {
    view.addEventListener('resize', measure)
    return () => view.removeEventListener('resize', measure)
  }
  let state = documents.get(document)
  if (!state) {
    const targets = new Map<Element, Set<Measure>>()
    const observer = new view.ResizeObserver(entries => {
      const measures = new Set(entries.flatMap(entry => [...(targets.get(entry.target) ?? [])]))
      for (const update of measures) update()
    })
    documents.set(document, state = { observer, targets })
  }
  const { observer, targets } = state
  let updates = targets.get(element)
  if (!updates) {
    targets.set(element, updates = new Set())
    observer.observe(element)
  }
  updates.add(measure)
  return () => {
    updates.delete(measure)
    if (updates.size) return
    targets.delete(element)
    observer.unobserve(element)
  }
}
