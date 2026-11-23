import { inject, type InjectionKey, type Ref } from 'vue'

export interface NavigationScreen {
  id: string
  title: string
  backTitle?: string
  titleDisplayMode?: 'large' | 'inline'
}

export interface NavigationStackApi<Screen extends NavigationScreen = NavigationScreen> {
  push: (screen: Screen, opener?: HTMLElement) => void
  back: () => void
  popToRoot: () => void
  depth: Readonly<Ref<number>>
}

export const navigationStackKey: InjectionKey<NavigationStackApi<never>> = Symbol('SNavigationStack')

export function useNavigationStack<Screen extends NavigationScreen = NavigationScreen>() {
  const stack = inject(navigationStackKey)
  if (!stack) throw new Error('useNavigationStack must be used inside SNavigationStack')
  return stack as NavigationStackApi<Screen>
}
