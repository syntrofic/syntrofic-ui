import { Application, View } from '@nativescript/core'
import { install, type BottomSheetOptions } from '@nativescript-community/ui-bottomsheet'
import { createNativeView, defineComponent, onBeforeUnmount, onMounted, ref, watch, type Ref, type VNode } from 'nativescript-vue'
import { provideNativeUIContext, useNativeUI } from './context'
import { topNativeOverlay, type NativeDialogCloseReason, type NativeRestoreFocus } from './modal'
import { createSheetPlatform, type SheetSize } from './sheet-platform'
import { provideNativeToast, useOptionalNativeToast } from './toast'

type SheetOptions = Omit<BottomSheetOptions, 'view' | 'closeCallback' | 'onDetentChange' | 'onChangeState'>
type SheetDriver = ReturnType<typeof createSheetPlatform>

interface SheetSession {
  view: View
  ready: boolean
  closed: boolean
  reasons?: NativeDialogCloseReason
  close: (reason: NativeDialogCloseReason, force?: boolean) => void
  settled: Promise<void>
}

interface SheetControls {
  present: (index?: number, focus?: NativeRestoreFocus) => void
  resize: (index: number) => void
  dismiss: (reason?: NativeDialogCloseReason) => void
  dismissStack: () => Promise<void>
}

interface SheetContent {
  ready: () => void
  measure: (size: SheetSize) => void
  shown: Ref<boolean>
  height: Ref<number | undefined>
}

const stack: SheetSession[] = []
const names = new Map<string, SheetControls[]>()

export function getNativeBottomSheet(name: string) {
  return names.get(name)?.at(-1)
}

function register(name: string, controls: SheetControls) {
  names.set(name, [...(names.get(name) ?? []), controls])
  return () => {
    const active = names.get(name)?.filter(item => item !== controls)
    if (active?.length) names.set(name, active)
    else names.delete(name)
  }
}

export function useNativeSheet(
  open: Ref<boolean>,
  options: () => SheetOptions,
  driver: (view: View, size: () => SheetSize) => SheetDriver,
  content: (state: SheetContent) => VNode,
  callbacks: {
    name: () => string | undefined
    index: () => number
    resize: (index: number) => void
    change: (index: number) => void
    opened: () => void
    closed: (reason: NativeDialogCloseReason) => void
    error: (error: unknown) => void
  },
) {
  const ui = useNativeUI()
  const toast = useOptionalNativeToast()
  let mounted = false
  let restore: NativeRestoreFocus | undefined
  let reason: NativeDialogCloseReason | undefined
  let current: SheetSession | undefined
  let refreshCurrent: (() => void) | undefined
  let restoreTimer: ReturnType<typeof setTimeout> | undefined

  function show() {
    if (!mounted || current || !open.value || restoreTimer !== undefined) return
    const anchor = topNativeOverlay() ?? Application.getRootView()
    if (!(anchor instanceof View) || !anchor.isLoaded) {
      open.value = false
      callbacks.error(new Error('No loaded NativeScript view could present the bottom sheet'))
      return
    }
    const shown = ref(false)
    const height = ref<number>()
    let dimensions: SheetSize = { chrome: 96, body: 128 }
    let platform: SheetDriver
    let defer: ReturnType<typeof setTimeout> | undefined
    let closing: NativeDialogCloseReason | undefined
    let finish: () => void = () => {}
    const settled = new Promise<void>(resolve => { finish = resolve })
    const overlay = defineComponent({
      name: 'SyntroficNativeBottomSheet',
      setup() {
        provideNativeUIContext(ui)
        if (toast) provideNativeToast(toast)
        return () => content({ ready, measure, shown, height })
      },
    })
    const renderer = createNativeView<View>(overlay)
    renderer.mount()
    const view = renderer.nativeView
    platform = driver(view, () => dimensions)
    const session: SheetSession = {
      view, ready: false, closed: false, settled,
      close(nextReason, force) {
        if (session.closed || closing) return
        if (force && open.value) open.value = false
        session.reasons = nextReason
        if (!session.ready) return
        closing = nextReason
        view.closeBottomSheet()
      },
    }
    current = session
    stack.push(session)
    refreshCurrent = refresh

    function refresh() {
      if (session.closed || closing || !session.ready || defer !== undefined) return
      defer = setTimeout(() => {
        defer = undefined
        if (session.closed || closing) return
        platform.sync()
        height.value = platform.visibleHeight()
      }, 0)
    }

    function measure(next: SheetSize) {
      if (dimensions.chrome === next.chrome && dimensions.body === next.body) return
      dimensions = next
      refresh()
    }

    function ready() {
      session.ready = true
      if (!mounted || !open.value || session.reasons) {
        session.close(session.reasons ?? reason ?? 'programmatic')
        return
      }
      shown.value = true
      refresh()
      callbacks.opened()
    }

    function done(error?: unknown) {
      if (session.closed) return
      session.closed = true
      if (defer !== undefined) clearTimeout(defer)
      const index = stack.indexOf(session)
      if (index >= 0) stack.splice(index, 1)
      if (current === session) {
        current = undefined
        refreshCurrent = undefined
      }
      // On Android the plugin calls closeCallback immediately before removing its DialogFragment.
      restoreTimer = setTimeout(() => {
        restoreTimer = undefined
        renderer.unmount()
        finish()
        if (!mounted) return
        if (open.value) show()
        else {
          const focus = restore
          restore = undefined
          focus?.()
        }
      }, 0)
      if (!mounted) return
      if (!closing || error !== undefined) open.value = false
      if (error !== undefined) callbacks.error(error)
      else callbacks.closed(closing ?? 'system')
    }

    try {
      install()
      anchor.showBottomSheet({
        ...options(),
        context: {},
        view,
        initialDetentIndex: callbacks.index(),
        closeCallback: done,
        onDetentChange(index) {
          if (!shown.value || session.closed || closing) return
          callbacks.change(platform.detentFromNative(index))
        },
        onChangeState() {
          if (!session.closed && !closing) height.value = platform.visibleHeight()
        },
      })
      if (!session.closed && !view._getRootModalViews().includes(view)) {
        done(new Error('The NativeScript host refused to present the bottom sheet'))
      }
    } catch (error) {
      const views = view._getRootModalViews()
      const index = views.indexOf(view)
      if (index >= 0) views.splice(index, 1)
      done(error)
    }
  }

  async function closeAbove(session: SheetSession) {
    const index = stack.indexOf(session)
    if (index < 0) return
    for (const child of stack.slice(index + 1).reverse()) {
      child.close('programmatic', true)
      await child.settled
    }
  }

  async function dismissStack() {
    if (current) await closeAbove(current)
  }

  function dismiss(next: NativeDialogCloseReason = 'programmatic') {
    if (!open.value) return
    reason = next
    open.value = false
  }

  function present(index?: number, focus?: NativeRestoreFocus) {
    if (index !== undefined) callbacks.resize(index)
    if (open.value) return
    restore = focus ?? restore
    reason = undefined
    open.value = true
  }

  const controls = { present, dismiss, dismissStack, resize: callbacks.resize }
  watch(open, async visible => {
    if (visible) {
      reason = undefined
      show()
    } else if (current) {
      const session = current
      await closeAbove(session)
      if (!open.value && session === current) session.close(reason ?? 'programmatic')
    }
  }, { flush: 'post' })
  watch(callbacks.name, (name, _, cleanup) => {
    if (name) cleanup(register(name, controls))
  }, { immediate: true })
  onMounted(() => {
    mounted = true
    show()
  })
  onBeforeUnmount(() => {
    mounted = false
    restore = undefined
    const session = current
    if (session) void closeAbove(session).then(() => session.close('programmatic'))
  })
  return { ...controls, refresh: () => refreshCurrent?.() }
}
