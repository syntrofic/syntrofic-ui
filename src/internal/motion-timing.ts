export type MotionRole = 'press' | 'enter' | 'exit' | 'move'
export type MotionCurve = readonly [number, number, number, number]
export interface MotionTiming { duration?: number; curve?: MotionCurve }

export const motionTimings = {
  press: { highlightInMs: 0, flashMs: 64, highlightOutMs: 185, highlightOutCurve: [.44, .05, .72, .48], scrollBrakeMs: 150, buttonReleaseMs: 170 },
  curves: {
    viewChange: [.23, .7, .24, 1],
    move: [.23, .72, .24, 1],
    exit: [.44, .05, .72, .48],
    entrance: [.23, .72, .24, 1],
  },
  navigationBarHideShowMs: 220,
  keyboardNotificationMs: 360,
  stateChangeMs: 220,
  reducedMotionCrossFadeMs: 80,
} as const

export const motionDurationTokens: Readonly<Record<MotionRole, string>> = {
  press: '--sy-duration', enter: '--sy-motion-enter', exit: '--sy-motion-exit', move: '--sy-motion-replace',
}

export function motionCurveCSS(points: MotionCurve) {
  if (!Array.isArray(points) || points.length !== 4 || !points.every(Number.isFinite)
    || points[0] < 0 || points[0] > 1 || points[2] < 0 || points[2] > 1) throw new RangeError('Expected a cubic Bézier curve')
  return 'cubic-bezier(' + points.join(', ') + ')'
}

const defaults: Record<MotionRole, number> = {
  press: motionTimings.press.buttonReleaseMs, enter: 255,
  exit: motionTimings.press.highlightOutMs, move: motionTimings.stateChangeMs,
}

export function resolveMotionTiming(element: Element | null | undefined, role: MotionRole) {
  const style = element?.ownerDocument.defaultView?.getComputedStyle(element)
  const time = style?.getPropertyValue(motionDurationTokens[role]).trim() ?? ''
  const duration = /^(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)$/.test(time)
    ? parseFloat(time) * (time.endsWith('ms') ? 1 : 1000) : defaults[role]
  const easing = style?.getPropertyValue('--sy-ease-' + role).trim()
    || style?.getPropertyValue(role === 'exit' ? '--sy-ease-exit' : '--sy-ease-settle').trim()
    || motionCurveCSS(role === 'exit' ? motionTimings.curves.exit : motionTimings.curves.move)
  return { duration, easing }
}
