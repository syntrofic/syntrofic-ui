import type { GlobalToastManager } from 'reka-ui'
import type { InjectionKey, Ref, VNodeChild } from 'vue'

export const toastQueueContext: InjectionKey<Readonly<Ref<GlobalToastManager>>> = Symbol('Syntrofic toast queue')
export const toastContent = Symbol('Syntrofic toast content')
export interface ToastContent {
  body: VNodeChild
  endContent?: VNodeChild
  custom?: () => VNodeChild
  markManual: () => void
}
