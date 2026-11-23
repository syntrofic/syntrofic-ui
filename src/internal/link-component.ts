import { computed, defineComponent, h, inject, mergeProps, toValue, type Component, type InjectionKey, type MaybeRefOrGetter, type PropType, type Ref } from 'vue'
import { navigateLink, routerContext } from './router'

export type LinkDestination = string | Readonly<Record<string, unknown>>
export type LinkComponent = string | Component
export const linkComponentContext: InjectionKey<Readonly<Ref<LinkComponent>>> = Symbol('syntrofic link component')

function normalized(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
}

function validLink(value: string) {
  const address = normalized(value)
  return !/^(?:javascript|vbscript):/i.test(address) && !/^data:\s*text\/html(?:[\s;,]|$)/i.test(address)
}

export function validLinkDestination(destination?: LinkDestination) {
  if (destination === undefined) return true
  if (typeof destination === 'string') return validLink(destination)
  if (typeof destination !== 'object' || !destination || Array.isArray(destination)) return false
  const protocol = destination.protocol
  if (protocol !== undefined && (typeof protocol !== 'string' || !validLink(protocol.replace(/:$/, '') + ':'))) return false
  for (const key of ['href', 'path', 'pathname', 'fullPath', 'hash', 'search']) {
    const value = destination[key]
    if (value === undefined) continue
    if (typeof value !== 'string' || !validLink(value)) return false
    if (typeof protocol === 'string' && !validLink(protocol.replace(/:$/, '') + ':' + value)) return false
  }
  return true
}

function linkAddress(destination?: LinkDestination): string | undefined {
  if (typeof destination === 'string') return normalized(destination)
  if (!destination) return
  const value = destination.href ?? destination.fullPath ?? destination.path ?? destination.pathname
  if (typeof value === 'string') return normalized(value)
}

export function useLinkComponent(as?: MaybeRefOrGetter<LinkComponent | undefined>) {
  const provided = inject(linkComponentContext, null)
  const router = inject(routerContext, null)
  const component = computed(() => toValue(as) ?? provided?.value ?? 'a')
  return defineComponent({
    name: 'SyntroficLink',
    inheritAttrs: false,
    props: {
      href: [String, Object] as PropType<LinkDestination>,
      to: [String, Object] as PropType<LinkDestination>,
      disabled: Boolean,
      target: String,
      rel: String,
    },
    setup(props, { attrs, slots }) {
      const blocked = computed(() => props.disabled || !validLinkDestination(props.href) || !validLinkDestination(props.to))
      const resolvedAddress = computed(() => {
        const address = linkAddress(props.href ?? props.to)
        return address === undefined || component.value !== 'a' ? address : router?.useHref?.(address) ?? address
      })
      function inert(event: Event) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      return () => {
        const unavailable = blocked.value || !validLinkDestination(resolvedAddress.value)
        const native = component.value === 'a'
        const rel = props.rel?.split(/\s+/).filter(Boolean) ?? []
        if (props.target === '_blank' && !rel.some(value => /^(noopener|noreferrer)$/i.test(value))) rel.push('noopener')
        if (unavailable) return h('a', mergeProps({ onClickCapture: inert }, attrs,
          { role: attrs.role ?? 'link', tabindex: -1, 'aria-disabled': true }), slots.default?.())
        const navigation = native ? {
          href: resolvedAddress.value, onClick: (event: MouseEvent) => navigateLink(router, linkAddress(props.href ?? props.to), event),
        } : { href: props.href, to: props.to ?? props.href }
        const attributes = mergeProps(attrs, { ...navigation, target: props.target, rel: rel.join(' ') || undefined })
        return typeof component.value === 'string' ? h(component.value, attributes, slots.default?.()) : h(component.value, attributes, slots)
      }
    },
  })
}
