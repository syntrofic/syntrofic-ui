import { Application, View, isAndroid, isIOS } from '@nativescript/core'
import { $showModal, defineComponent, nextTick, onBeforeUnmount, onMounted, watch, type Ref, type VNode } from 'nativescript-vue'
import { provideNativeUIContext, useNativeUI } from './context'
import { provideNativeToast, useOptionalNativeToast } from './toast'

export type NativeDialogCloseReason = 'programmatic' | 'cancel' | 'confirm' | 'close-button' | 'outside' | 'back' | 'swipe' | 'system'
export type NativeRestoreFocus = () => unknown

interface ModalContent {
  ready: (view: View) => void
  dismiss: () => void
}

interface ModalSession {
  view?: View
  closing?: NativeDialogCloseReason
}

type AndroidWindow = {
  setBackgroundDrawable: (drawable: unknown) => void
  clearFlags: (flags: number) => void
  setWindowAnimations: (resource: number) => void
}

const platform = globalThis as typeof globalThis & {
  android?: { graphics: { drawable: { ColorDrawable: new (color: number) => unknown } } }
  UIModalPresentationStyle?: { OverFullScreen: number }
}

export function topNativeOverlay(): View | undefined {
  const root = Application.getRootView()
  if (!(root instanceof View)) return
  return root._getRootModalViews().slice().reverse().find((view): view is View => view instanceof View && view.isLoaded)
}

function configureWindow(view: View) {
  if (isIOS && view.ios) view.ios.accessibilityViewIsModal = true
  if (!isAndroid) return
  // Core 9.1 makes full-screen DialogFragment windows white immediately before shownModally.
  const native = view as View & { _dialogFragment?: { getDialog: () => { getWindow: () => AndroidWindow } | null } }
  const window = native._dialogFragment?.getDialog()?.getWindow()
  const Drawable = platform.android?.graphics.drawable.ColorDrawable
  if (window && Drawable) {
    window.setBackgroundDrawable(new Drawable(0))
    window.clearFlags(2) // FLAG_DIM_BEHIND, the component animates its own backdrop.
    window.setWindowAnimations(0)
  }
}

export function useNativeModal(
  open: Ref<boolean>,
  content: (events: ModalContent) => VNode,
  callbacks: { closed: (reason: NativeDialogCloseReason) => void; error: (error: unknown) => void },
) {
  const ui = useNativeUI()
  const toast = useOptionalNativeToast()
  let mounted = false
  let lifecycleFrame: ReturnType<typeof setTimeout> | undefined
  let requestedReason: NativeDialogCloseReason | undefined
  let restore: NativeRestoreFocus | undefined
  let current: ModalSession | undefined

  function update() {
    if (!mounted || current || !open.value || lifecycleFrame !== undefined) return
    const session: ModalSession = {}
    current = session
    const events: ModalContent = {
      ready(view) {
        session.view = view
        configureWindow(view)
        if (!mounted) view.closeModal()
      },
      dismiss() {
        if (current !== session || open.value || session.closing || !session.view) return
        session.closing = requestedReason ?? 'programmatic'
        session.view.closeModal()
      },
    }
    const component = defineComponent({
      name: 'SyntroficNativeModal',
      setup() {
        provideNativeUIContext(ui)
        if (toast) provideNativeToast(toast)
        return () => content(events)
      },
    })
    function settle(error?: unknown) {
      if (current !== session) return
      current = undefined
      if (!mounted) return
      if (!session.closing) open.value = false
      requestedReason = undefined
      if (error !== undefined) callbacks.error(error)
      else callbacks.closed(session.closing ?? 'system')
      // The platform can deliver closeCallback before its presentation controller finishes dismissal.
      lifecycleFrame = setTimeout(() => {
        lifecycleFrame = undefined
        if (open.value) update()
        else {
          const focus = restore
          restore = undefined
          focus?.()
        }
      }, 0)
    }
    void $showModal(component, {
      target: topNativeOverlay(),
      fullscreen: true,
      animated: false,
      cancelable: false,
      ios: { presentationStyle: platform.UIModalPresentationStyle?.OverFullScreen ?? 5 },
      android: { windowSoftInputMode: 16 }, // SOFT_INPUT_ADJUST_RESIZE
    }).then(() => settle(), error => settle(error))
  }

  function show(returnFocus?: NativeRestoreFocus) {
    if (open.value) return
    restore = returnFocus ?? restore
    requestedReason = undefined
    open.value = true
  }

  function close(reason: NativeDialogCloseReason = 'programmatic') {
    if (!open.value) return
    requestedReason = reason
    open.value = false
  }

  watch(open, visible => {
    if (!visible) return
    requestedReason = undefined
    update()
  }, { flush: 'post' })
  onMounted(() => {
    mounted = true
    void nextTick(update)
  })
  onBeforeUnmount(() => {
    mounted = false
    if (lifecycleFrame !== undefined) clearTimeout(lifecycleFrame)
    current?.view?.closeModal()
    restore = undefined
  })
  return { show, close }
}
