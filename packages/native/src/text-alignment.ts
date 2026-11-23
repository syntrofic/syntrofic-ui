import { isAndroid, type EventData, type Label, type TextField } from '@nativescript/core'

export function centerNativeText(event: EventData) {
  if (!isAndroid) return
  const view = (event.object as Label | TextField).android
  // Android includes extra ascent and descent for the entire font by default.
  view?.setIncludeFontPadding(false)
}
