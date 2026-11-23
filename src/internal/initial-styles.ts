/** Let the first styled frame paint before enabling subsequent CSS transitions. */
export function settleInitialStyles(scope: Element) {
  if (!scope.hasAttribute('data-sy-initializing')) return
  const view = scope.ownerDocument.defaultView
  const enable = () => scope.removeAttribute('data-sy-initializing')
  // WebKit may still report native control metrics during the mount task, even after a layout read.
  if (view) view.requestAnimationFrame(() => view.requestAnimationFrame(enable))
  else enable()
}
