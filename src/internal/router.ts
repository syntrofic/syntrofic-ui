import type { InjectionKey } from 'vue'

export interface RouterConfig {
  navigate: (href: string, event: MouseEvent) => unknown
  useHref?: (href: string) => string
  isEnabled?: () => boolean
}
export const routerContext: InjectionKey<Readonly<RouterConfig>> = Symbol('link-router')

export function navigateLink(router: Readonly<RouterConfig> | null, href: string | undefined, event: MouseEvent) {
  if (!router || router.isEnabled?.() === false || !href || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
  const link = event.currentTarget as HTMLAnchorElement
  if (link.hasAttribute('download') || (link.target && link.target !== '_self') || href.startsWith('#')) return
  let actual: URL
  try { actual = new URL(link.href, link.ownerDocument.baseURI) } catch { return }
  if (!['http:', 'https:'].includes(actual.protocol) || actual.origin !== link.ownerDocument.location?.origin) return
  event.preventDefault()
  router.navigate(href, event)
}
