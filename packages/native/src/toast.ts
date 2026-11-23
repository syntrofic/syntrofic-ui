import { inject, provide, type ComputedRef, type InjectionKey } from 'nativescript-vue'
import type { NativeToastControls, NativeToastPlacement, NativeToastView } from './toast-queue'

interface ToastLayer {
  toast: NativeToastControls
  isToastVisible: ComputedRef<boolean>
  groups: ComputedRef<Record<NativeToastPlacement, NativeToastView[]>>
  overlay: ComputedRef<symbol | undefined>
  settings: { closeLabel: string; inset: number }
  activate: (key: symbol) => () => void
  entered: (id: string) => void
  exited: (id: string) => void
  pause: (id: string, key: string, paused: boolean) => void
  error: (error: unknown) => void
}

const nativeToast: InjectionKey<ToastLayer> = Symbol('Native toast')

export function provideNativeToast(manager: ToastLayer) {
  provide(nativeToast, manager)
}

export function useOptionalNativeToast() {
  return inject(nativeToast, undefined)
}

export function useNativeToast() {
  const manager = useOptionalNativeToast()
  if (!manager) throw new Error('useNativeToast requires an SNativeToastProvider')
  return { toast: manager.toast, isToastVisible: manager.isToastVisible }
}
