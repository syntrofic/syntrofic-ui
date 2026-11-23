import { isAndroid, isIOS, ScrollView, type TouchGestureEventData } from '@nativescript/core'

export function lockGestureScroll(event: TouchGestureEventData) {
  if (isAndroid) {
    const parent = event.view.android?.getParent()
    parent?.requestDisallowInterceptTouchEvent(true)
    return () => parent?.requestDisallowInterceptTouchEvent(false)
  }
  if (isIOS) {
    const restored: (() => void)[] = []
    for (let parent = event.view.parent; parent; parent = parent.parent) {
      if (!(parent instanceof ScrollView) || !parent.ios?.scrollEnabled) continue
      const scroll = parent.ios
      scroll.scrollEnabled = false
      restored.push(() => { scroll.scrollEnabled = true })
    }
    return () => { for (const restore of restored) restore() }
  }
}
