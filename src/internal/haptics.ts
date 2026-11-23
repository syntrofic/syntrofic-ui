export const hapticPatterns = Object.freeze({
  selection: [5],
  impactLight: [8],
  impactMedium: [12],
  impactHeavy: [18],
  impactSoft: [10],
  impactRigid: [6],
  notificationSuccess: [8, 60, 12],
  notificationWarning: [12, 80, 12],
  notificationError: [12, 50, 12, 50, 18],
} as const)
export type HapticFeedbackKind = keyof typeof hapticPatterns
const previousSelection = new WeakMap<Document, number>()

export function playHaptic(kind: HapticFeedbackKind, element: Element) {
  const document = element.ownerDocument
  const view = document.defaultView
  const pattern = hapticPatterns[kind]
  if (!view || !pattern || document.visibilityState === 'hidden' || typeof view.navigator.vibrate !== 'function') return false
  if (view.navigator.userActivation?.hasBeenActive === false) return false
  if (kind === 'selection') {
    const now = view.performance.now()
    if (now - (previousSelection.get(document) ?? -Infinity) < 40) return false
    previousSelection.set(document, now)
  }
  return view.navigator.vibrate([...pattern])
}
