const selector = 'a[href], area[href], button, input, select, textarea, summary, audio[controls], video[controls], [tabindex], [contenteditable]:not([contenteditable="false"])'

export function documentFocus(document: Document) {
  let element = document.activeElement
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement
  return element ?? undefined
}

export function parentAcrossShadow(element: Element) {
  const root = element.getRootNode()
  return element.parentElement ?? ('host' in root ? (root as ShadowRoot).host : null)
}

export function focusWithin(root: Element | undefined, element: Element | undefined) {
  if (!root) return false
  for (let node = element; node; node = parentAcrossShadow(node) ?? undefined) {
    if (root.contains(node)) return true
  }
  return false
}

export function focusable(element: Element, allowAriaDisabled = false): element is HTMLElement {
  const window = element.ownerDocument.defaultView
  return Boolean(window && element instanceof window.HTMLElement && element.isConnected
    && !element.matches(':disabled, input[type="hidden"]') && (allowAriaDisabled || element.getAttribute('aria-disabled') !== 'true')
    && !element.closest('[inert], [hidden], [aria-hidden="true"]')
    && element.getClientRects().length && window.getComputedStyle(element).visibility === 'visible')
}

export function tabOrder(root: HTMLElement) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(node => node.tabIndex >= 0 && focusable(node, true))
  const radios = new Map<HTMLFormElement | null, Map<string, HTMLInputElement>>()
  const input = root.ownerDocument.defaultView?.HTMLInputElement
  const isRadio = (node: HTMLElement): node is HTMLInputElement => Boolean(input && node instanceof input && node.type === 'radio' && node.name)
  for (const node of nodes.filter(isRadio)) {
    const group = radios.get(node.form) ?? new Map<string, HTMLInputElement>()
    if (!group.has(node.name) || node.checked) group.set(node.name, node)
    radios.set(node.form, group)
  }
  const radioOrder = nodes.filter(node => !isRadio(node) || radios.get(node.form)?.get(node.name) === node)
  const order = (node: HTMLElement) => node.tabIndex || Infinity
  return radioOrder.sort((left, right) => order(left) - order(right))
}
