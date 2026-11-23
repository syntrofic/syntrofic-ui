import { inject, type InjectionKey, type Ref } from 'vue'
import type { EmblaCarouselType } from 'embla-carousel'

export interface CarouselSlide {
  id: string
  label?: string
  src?: string
  alt?: string
  thumbnail?: string
}

export interface CarouselControls {
  api: Readonly<Ref<EmblaCarouselType | undefined>>
  selectedIndex: Readonly<Ref<number>>
  scrollSnapCount: Readonly<Ref<number>>
  canScrollPrevious: Readonly<Ref<boolean>>
  canScrollNext: Readonly<Ref<boolean>>
  playing: Readonly<Ref<boolean>>
  previous: () => void
  next: () => void
  goTo: (index: number) => void
  play: () => void
  pause: () => void
}

export const carouselContext: InjectionKey<CarouselControls> = Symbol('carousel')

export function useCarousel() {
  return inject(carouselContext, null)
}
