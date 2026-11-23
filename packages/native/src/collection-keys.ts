import { isAndroid, type View } from '@nativescript/core'

export type NativeCollectionNavigation = 'previous' | 'next' | 'first' | 'last' | 'left' | 'right' | 'escape'

const navigation = new Map<number, NativeCollectionNavigation>([
  [19, 'previous'], [20, 'next'], [21, 'left'], [22, 'right'],
  [111, 'escape'], [122, 'first'], [123, 'last'],
])

type KeyListener = {
  onKey: (view: unknown, code: number, event: { getAction: () => number }) => boolean
}
type FocusListener = { onFocusChange: (view: unknown, focused: boolean) => void }

const platform = globalThis as typeof globalThis & {
  android?: { view: { View: {
    OnKeyListener: new (listener: KeyListener) => KeyListener
    OnFocusChangeListener: new (listener: FocusListener) => FocusListener
  } } }
}

export function installCollectionKeys(view: View, handle: (key: NativeCollectionNavigation) => boolean, focus?: (focused: boolean) => void) {
  const type = platform.android?.view.View
  if (!isAndroid || !type || !view.android) return
  const widget = view.android
  if (focus) widget.setOnFocusChangeListener(new type.OnFocusChangeListener({ onFocusChange: (_, focused) => focus(focused) }))
  widget.setOnKeyListener(new type.OnKeyListener({
    onKey(_, code, event) {
      const key = navigation.get(code)
      return Boolean(key && event.getAction() === 0 && handle(key))
    },
  }))
  return () => {
    widget.setOnKeyListener(null)
    if (focus) {
      widget.setOnFocusChangeListener(null)
      focus(false)
    }
  }
}
