import type { InjectionKey } from 'nativescript-vue'
import type { NativeWheelValue } from './wheel-state'

export const nativeWheelGroup: InjectionKey<{
  itemHeight: () => number
  visibleCount: () => number
  disabled: () => boolean
  animate: () => boolean
  get: (name: string) => NativeWheelValue | undefined
  set: (name: string, value: NativeWheelValue, user?: boolean) => void
  activity: (wheel: symbol, active: boolean) => void
}> = Symbol('Native wheel group')
