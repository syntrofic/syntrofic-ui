import { motionSprings, pickerMotion, scrollMotion } from './motion-physics'
import { motionTimings } from './motion-timing'

export const gestureMotion = Object.freeze({
  tap: { travel: 9, holdMs: 280, doubleTapMs: 300, doubleTapTravel: 24 },
  longPress: { delayMs: 500, travel: 10 },
  pan: { threshold: 8, touchThreshold: 10, endStillnessMs: 90 },
  pinch: { threshold: 8 },
  rotation: { threshold: Math.PI / 36 },
  screenEdgePan: { inset: 28, releaseTravel: 15, releaseVelocity: .5 },
  press: { contentTouchDelayMs: scrollMotion.contentTouchDelayMs, rapidTapMs: motionTimings.press.flashMs },
})
export const reorderMotion = Object.freeze({ claimDelayMs: scrollMotion.contentTouchDelayMs, tickMs: 20, edgeInset: 8 })
export const motionDefaults = Object.freeze({
  springs: motionSprings,
  timing: motionTimings,
  gestures: gestureMotion,
  picker: pickerMotion,
  scroll: scrollMotion,
  reorder: reorderMotion,
  navigation: { push: motionSprings.navigationPush, pop: motionSprings.navigationPop, interactive: motionSprings.navigationInteractivePopFinish },
  slider: { release: motionSprings.sliderRelease, lift: motionSprings.sliderLift, drop: motionSprings.sliderDrop },
  switch: { thumb: motionSprings.switchThumbMove },
  sheet: { present: motionSprings.sheetPresent, dismiss: motionSprings.sheetDismiss, detent: motionSprings.sheetDetent },
  alert: { present: motionSprings.alertPresent, dismiss: motionSprings.alertDismiss },
  menu: { open: motionSprings.menuOpen, close: motionSprings.menuClose, subMenuOpen: motionSprings.subMenuOpen, subMenuBack: motionSprings.subMenuBack },
})
