import type { InjectionKey, Ref, Slot } from 'vue'

export interface TourStep {
  id: string
  title: string
  description?: string
  target?: string | HTMLElement | (() => string | HTMLElement | null | undefined)
  placement?: 'above' | 'below' | 'start' | 'end'
  alignment?: 'start' | 'center' | 'end'
}
export type TourDismissSource = 'backdrop' | 'escape' | 'close' | 'skip' | 'complete'
export interface TourEntry { step: Ref<TourStep>; content?: Slot }
export const tourContext: InjectionKey<(entry: TourEntry) => () => void> = Symbol('Syntrofic Tour')
