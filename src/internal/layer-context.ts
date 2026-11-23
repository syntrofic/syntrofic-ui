import { computed, inject, type InjectionKey, type Ref } from 'vue'

export const layerTarget: InjectionKey<Ref<HTMLElement | null>> = Symbol('syntrofic layer host')
export function useLayerTarget() { return inject(layerTarget, null) }

export interface LayerInset {
  blockStart?: number | string
  blockEnd?: number | string
  inlineStart?: number | string
  inlineEnd?: number | string
}
export interface LayerToastConfig {
  position?: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
  maxVisible?: number
  inset?: LayerInset
  viewportLabel?: string
}
type PhysicalInset = Record<'top' | 'right' | 'bottom' | 'left', number>
export const layerViewportInset: InjectionKey<Readonly<Ref<LayerInset>>> = Symbol('syntrofic layer viewport inset')
export const layerViewportPadding: InjectionKey<Readonly<Ref<PhysicalInset | undefined>>> = Symbol('syntrofic layer viewport padding')
export const layerLength = (value?: number | string) => typeof value === 'number' ? Math.max(0, value) + 'px' : value

export function useLayerCollisionPadding(normal: number) {
  const padding = inject(layerViewportPadding, undefined)
  return computed(() => {
    const edges = padding?.value
    return edges ? { top: normal + edges.top, right: normal + edges.right, bottom: normal + edges.bottom, left: normal + edges.left } : normal
  })
}
