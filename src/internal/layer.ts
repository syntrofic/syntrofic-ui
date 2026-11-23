import { computed, h, onScopeDispose, readonly, ref, shallowReadonly, shallowRef, useId, type ComponentPublicInstance, type HTMLAttributes, type VNodeChild } from 'vue'
import SLayer from '../components/SLayer.vue'

export { layerTarget, useLayerTarget } from './layer-context'
export type LayerPlacement = 'above' | 'below' | 'start' | 'end'
export type LayerAlignment = 'start' | 'center' | 'end'

export interface LayerOptions {
  mode?: 'context' | 'fixed'
  x?: number
  y?: number
  offset?: number | string
  lightDismiss?: boolean
  lazyMount?: boolean
  onShow?: () => void
  onHide?: () => void
}

export interface LayerRenderProps extends HTMLAttributes {
  [attribute: `data-${string}`]: unknown
  placement?: LayerPlacement
  align?: LayerAlignment
  positioning?: 'auto' | 'custom'
  offset?: number | string
  x?: number
  y?: number
  label?: string
  ariaHidden?: boolean
}

export function useLayer(options: LayerOptions = {}) {
  const id = 'sy-layer-' + useId().replace(/[^\w-]/g, '-')
  const anchorId = '--' + id
  const anchor = shallowRef<Element | null>(null)
  const open = ref(false)
  const point = shallowRef<{ x: number; y: number }>()
  const position = ref({ x: options.x ?? 0, y: options.y ?? 0 })
  const isOpen = readonly(open)
  const mode = options.mode ?? 'context'
  let measure: (() => void) | undefined
  let removeAnchorName: (() => void) | undefined
  const setAnchor = (node: Element | ComponentPublicInstance | null) => {
    const element = node && '$el' in node ? node.$el as Element | null : node
    const next = element && element.nodeType === 1 ? element : null
    if (anchor.value === next) return
    removeAnchorName?.()
    anchor.value = next
    if (!next || !('style' in next)) return
    const style = (next as HTMLElement).style
    const names = () => style.getPropertyValue('anchor-name').split(',').map(name => name.trim()).filter(Boolean)
    style.setProperty('anchor-name', [...names().filter(name => name !== 'none'), anchorId].join(', '))
    removeAnchorName = () => {
      const remaining = names().filter(name => name !== anchorId)
      if (remaining.length) style.setProperty('anchor-name', remaining.join(', '))
      else style.removeProperty('anchor-name')
      removeAnchorName = undefined
    }
  }
  onScopeDispose(() => removeAnchorName?.(), true)
  function updatePosition(x: number, y: number) {
    if (x !== position.value.x || y !== position.value.y) position.value = { x, y }
  }
  function reposition() {
    if (measure) { measure(); return }
    if (point.value) { updatePosition(point.value.x, point.value.y); return }
    if (mode === 'fixed' || !anchor.value) return
    const bounds = anchor.value.getBoundingClientRect()
    updatePosition(bounds.left, bounds.bottom + (typeof options.offset === 'number' ? options.offset : 6))
  }
  function show(at?: { x: number; y: number }) {
    point.value = at
    reposition()
    if (!open.value) { open.value = true; options.onShow?.() }
  }
  function hide() {
    if (open.value) { open.value = false; options.onHide?.() }
  }
  const layer = {
    id, mode, anchorId, anchor: shallowReadonly(anchor), ref: setAnchor, open: isOpen, isOpen, point: readonly(point),
    offset: options.offset, lazyMount: options.lazyMount === true,
    position: readonly(position), popover: computed(() => options.lightDismiss ? 'auto' as const : 'manual' as const),
    reposition, show, hide, updatePosition,
    observePosition(calculate: () => void) {
      measure = calculate
      return () => { if (measure === calculate) measure = undefined }
    },
    render(children: VNodeChild | (() => VNodeChild), props: LayerRenderProps = {}) {
      return h(SLayer, { ...props, layer, resolveHost: true }, { default: typeof children === 'function' ? children : () => children })
    },
  }
  return layer
}

export type LayerController = ReturnType<typeof useLayer>
