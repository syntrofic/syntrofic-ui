import { Application, Color, Utils, isIOS, type View } from '@nativescript/core'
import { supportsGlass } from '@nativescript/core/utils/constants'
import { onBeforeUnmount, onMounted, shallowRef } from 'nativescript-vue'
import type { NativeAppearance } from './theme'
import type { NativeGlassEffect } from './material-state'

type AppleVisualEffect = { interactive?: boolean; tintColor?: unknown }
type NativeEffectView = {
  effect: AppleVisualEffect | null
  frame: unknown
  autoresizingMask: number
  userInteractionEnabled: boolean
  accessibilityElementsHidden: boolean
  clipsToBounds: boolean
  layer: { cornerRadius: number }
  removeFromSuperview: () => void
}

const apple = globalThis as typeof globalThis & {
  UIAccessibilityIsReduceTransparencyEnabled?: () => boolean
  UIAccessibilityReduceTransparencyStatusDidChangeNotification?: string
  UIVisualEffectView?: { alloc: () => { initWithEffect: (value: AppleVisualEffect | null) => NativeEffectView } }
  UIGlassEffect?: { effectWithStyle: (value: number) => AppleVisualEffect }
  UIBlurEffect?: { effectWithStyle: (value: number) => AppleVisualEffect }
  UIView?: { animateWithDurationAnimations: (seconds: number, changes: () => void) => void }
}
const changeEvent = apple.UIAccessibilityReduceTransparencyStatusDidChangeNotification
const opaque = shallowRef(isIOS && apple.UIAccessibilityIsReduceTransparencyEnabled?.() === true)
let users = 0
let observer: unknown

function refreshTransparency() {
  opaque.value = apple.UIAccessibilityIsReduceTransparencyEnabled?.() === true
}

export function useNativeMaterialSupport() {
  if (isIOS) {
    onMounted(() => {
      if (users++ > 0) return
      refreshTransparency()
      if (changeEvent) observer = Application.ios.addNotificationObserver(changeEvent, refreshTransparency)
      Application.on('resume', refreshTransparency)
    })
    onBeforeUnmount(() => {
      if (--users > 0) return
      if (observer && changeEvent) Application.ios.removeNotificationObserver(observer, changeEvent)
      observer = undefined
      Application.off('resume', refreshTransparency)
    })
  }
  return {
    liquid: isIOS && supportsGlass() && Boolean(apple.UIGlassEffect && apple.UIVisualEffectView),
    blur: isIOS && Boolean(apple.UIBlurEffect && apple.UIVisualEffectView),
    opaque,
  }
}

export function createNativeMaterial(host: View) {
  const container = host.ios
  const native = apple.UIVisualEffectView
  if (!isIOS || !container || !native) return
  const layer = native.alloc().initWithEffect(null)
  layer.frame = container.bounds
  layer.autoresizingMask = 18 // UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight
  layer.clipsToBounds = true
  layer.userInteractionEnabled = false
  layer.accessibilityElementsHidden = true
  container.insertSubviewAtIndex(layer, 0)

  return {
    update(variant: NativeGlassEffect | 'solid', appearance: NativeAppearance, radius: number, tint: string | undefined, duration: number) {
      let effect: AppleVisualEffect | undefined
      if (variant === 'blur') {
        // Explicit light/dark materials also follow a provider that overrides the system appearance.
        const style = Utils.ios.MajorVersion >= 13 ? appearance === 'dark' ? 18 : 13 : appearance === 'dark' ? 2 : 1
        effect = apple.UIBlurEffect?.effectWithStyle(style)
      } else if (variant !== 'solid') {
        effect = apple.UIGlassEffect?.effectWithStyle(variant === 'clear' ? 1 : 0)
        if (effect && tint) effect.tintColor = new Color(tint).ios
      }
      layer.layer.cornerRadius = Math.max(0, radius)
      if (duration > 0 && apple.UIView) apple.UIView.animateWithDurationAnimations(duration / 1000, () => { layer.effect = effect ?? null })
      else layer.effect = effect ?? null
    },
    dispose: () => layer.removeFromSuperview(),
  }
}
