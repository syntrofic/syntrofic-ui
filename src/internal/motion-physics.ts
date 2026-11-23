export interface SpringSpec { mass: number; stiffness: number; damping: number }
export interface SpringResponse { response: number; dampingRatio: number }
export interface SpringBounce { duration: number; bounce: number }
export interface MotionSample { value: number; velocity: number }
export type SpringDescription = SpringSpec | SpringResponse | SpringBounce
export type SpringCurve = ((seconds: number) => MotionSample) & {
  value(seconds: number): number
  velocity(seconds: number): number
  settleTime(threshold: number): number
}

/** The response is the undamped period, in seconds. */
export function springFromResponse({ response, dampingRatio }: SpringResponse): SpringSpec {
  const frequency = 2 * Math.PI / response
  const spring = { mass: 1, stiffness: frequency ** 2, damping: 2 * frequency * dampingRatio }
  if (response <= 0 || !Number.isFinite(spring.stiffness) || spring.stiffness <= 0 || !Number.isFinite(spring.damping) || dampingRatio < 0) {
    throw new RangeError('Expected a positive response and a nonnegative damping ratio')
  }
  return spring
}

export function springFromDurationBounce({ duration, bounce }: SpringBounce): SpringSpec {
  if (!Number.isFinite(bounce)) throw new RangeError('Expected finite bounce')
  const bounded = Math.min(1, Math.max(-.999999, bounce))
  return springFromResponse({ response: duration, dampingRatio: bounded < 0 ? 1 / (1 + bounded) : 1 - bounded })
}

export function springFromPhysics({ mass = 1, stiffness, damping, allowOverdamping = false }: Omit<SpringSpec, 'mass'> & {
  mass?: number; allowOverdamping?: boolean
}): SpringSpec {
  if (![mass, stiffness, damping].every(Number.isFinite) || mass <= 0 || stiffness <= 0 || damping < 0) {
    throw new RangeError('Expected valid spring parameters')
  }
  const criticalDamping = 2 * Math.sqrt(stiffness) * Math.sqrt(mass)
  return { mass, stiffness, damping: allowOverdamping ? damping : Math.min(damping, criticalDamping) }
}

export function responseDampingOf({ mass, stiffness, damping }: Readonly<SpringSpec>): SpringResponse {
  const frequency = Math.sqrt(stiffness / mass)
  return { response: 2 * Math.PI / frequency, dampingRatio: damping / mass / (2 * frequency) }
}

export function durationBounceOf(spring: Readonly<SpringSpec>): SpringBounce {
  const { response, dampingRatio } = responseDampingOf(spring)
  return { duration: response, bounce: dampingRatio > 1 ? 1 / dampingRatio - 1 : 1 - dampingRatio }
}

export function normalizeSpring(description: Readonly<SpringDescription>): SpringSpec {
  if ('stiffness' in description) return { ...description }
  return 'bounce' in description ? springFromDurationBounce(description) : springFromResponse(description)
}

export function relativeVelocity(velocity: number, from: number, to: number) { return velocity / (to - from) }
export function absoluteVelocity(velocity: number, from: number, to: number) { return velocity * (to - from) }

const springPreset = (response: number, dampingRatio: number) => Object.freeze(springFromResponse({ response, dampingRatio }))

export const motionSprings = Object.freeze({
  settle: Object.freeze({ mass: 1, stiffness: 250, damping: 29 }),
  press: springPreset(.23, 1),
  quickChange: springPreset(.24, .94),
  emphasis: springPreset(.42, .68),
  fingerTracking: springPreset(.23, .88),
  stateChange: springPreset(.34, .89),
  directChange: springPreset(.28, .86),
  timedChange: springPreset(.34, 1),
  viewChange: springPreset(.41, .89),
  navigation: springPreset(.34, 1),
  navigationPush: springPreset(.35, 1),
  navigationPop: springPreset(.32, 1),
  navigationInteractivePopFinish: springPreset(.32, .88),
  navigationBarElements: springPreset(.28, 1),
  sheet: springPreset(.39, .84),
  sheetPresent: springPreset(.4, .9),
  sheetDismiss: springPreset(.34, 1),
  sheetDetent: springPreset(.33, 1),
  sheetReleaseFast: springPreset(.38, .82),
  sheetDismissSwipe: springPreset(.35, .85),
  alertPresent: springPreset(.35, .78),
  alertDismiss: springPreset(.28, 1),
  actionSheetPresent: springPreset(.37, .85),
  actionSheetDismiss: springPreset(.32, 1),
  menu: springPreset(.27, .92),
  menuOpen: springPreset(.29, .85),
  menuClose: springPreset(.24, 1),
  subMenuOpen: springPreset(.32, .92),
  subMenuBack: springPreset(.29, .95),
  contextMenuLift: springPreset(.32, .81),
  contextMenuDismiss: springPreset(.27, 1),
  contextMenuMorph: springPreset(.38, .88),
  menuReducedMotion: springPreset(.25, 1),
  switchThumbMove: springPreset(.26, .84),
  keyboard: springPreset(.36, 1),
  banner: springPreset(.34, .94),
  sliderRelease: springPreset(.35, .84),
  sliderLift: springPreset(.28, .82),
  sliderDrop: springPreset(.32, .78),
})

export type MotionSpringName = keyof typeof motionSprings
export type MotionSpring = MotionSpringName | Readonly<SpringDescription>

export const scrollMotion = Object.freeze({ normalRate: .998, fastRate: .99, rubberBandCoefficient: .55, toStartRate: .99035, contentTouchDelayMs: 150 })
export const pickerMotion = Object.freeze({
  rowHeight: 32, height: 216, rubberBandDimension: 291, minimumSpeed: .25, snapRate: 11, tapDurationMs: 300,
  edgeSpring: springPreset(.5, 1),
})

export function motionSpringToken(name: MotionSpringName) {
  return '--sy-spring-' + name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
}

export function resolveMotionSpring(element: Element | null | undefined, spring: MotionSpring = 'settle') {
  if (typeof spring !== 'string') return normalizeSpring(spring)
  if (!Object.hasOwn(motionSprings, spring)) return motionSprings.settle
  const raw = element?.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue(motionSpringToken(spring)).trim()
  if (raw) {
    const parts = raw.split(/\s+/).map(Number)
    if (parts.length === 3) {
      const [mass, stiffness, damping] = parts
      if (parts.every(Number.isFinite) && mass > 0 && stiffness > 0 && damping >= 0) return { mass, stiffness, damping }
    }
  }
  return motionSprings[spring]
}

function springCurve(sample: (seconds: number) => MotionSample, bound: (seconds: number) => number, peak = 0, decay = true): SpringCurve {
  return Object.assign(sample, {
    value: (seconds: number) => sample(seconds).value,
    velocity: (seconds: number) => sample(seconds).velocity,
    settleTime(threshold: number) {
      if (bound(peak) <= threshold) return 0
      if (!(threshold > 0) || !decay) return Infinity
      let lower = peak
      let upper = Math.max(1, peak * 2)
      while (bound(upper) > threshold && Number.isFinite(upper)) { lower = upper; upper *= 2 }
      if (!Number.isFinite(upper)) return Infinity
      for (let step = 0; step < 52; step++) {
        const middle = lower + (upper - lower) / 2
        if (bound(middle) > threshold) lower = middle
        else upper = middle
      }
      return upper
    },
  })
}

/** Position and velocity at a time in seconds. Release velocity is in units per second. */
export function solveSpring({ from, to, velocity = 0, spring = motionSprings.settle }: {
  from: number; to: number; velocity?: number; spring?: Readonly<SpringDescription>
}): SpringCurve {
  const { mass, stiffness, damping } = normalizeSpring(spring)
  if (mass <= 0 || stiffness <= 0 || damping < 0 || ![mass, stiffness, damping, from, to, velocity].every(Number.isFinite)) {
    throw new RangeError('Expected finite endpoints and valid spring parameters')
  }
  const displacement = from - to
  const frequency = Math.sqrt(stiffness / mass)
  const friction = damping / (2 * mass)
  if (Math.abs(friction - frequency) <= frequency * 1e-6) {
    const slope = velocity + friction * displacement
    const amplitude = Math.abs(displacement)
    const climb = Math.abs(slope)
    const peak = climb ? Math.max(0, 1 / friction - amplitude / climb) : 0
    return springCurve(seconds => {
      const time = Math.max(0, seconds)
      const decay = Math.exp(-friction * time)
      const curve = displacement + slope * time
      return { value: to + decay * curve, velocity: decay * (slope - friction * curve) }
    }, time => Math.exp(-friction * time) * (amplitude + climb * time), peak)
  }
  if (friction < frequency) {
    const angle = Math.sqrt((frequency - friction) * (frequency + friction))
    const slope = (velocity + friction * displacement) / angle
    const amplitude = Math.hypot(displacement, slope)
    return springCurve(seconds => {
      const time = Math.max(0, seconds)
      const decay = Math.exp(-friction * time)
      const cosine = Math.cos(angle * time)
      const sine = Math.sin(angle * time)
      const curve = displacement * cosine + slope * sine
      return { value: to + decay * curve, velocity: decay * (angle * (slope * cosine - displacement * sine) - friction * curve) }
    }, time => amplitude * Math.exp(-friction * time), 0, friction > 0)
  }
  const spread = Math.sqrt((friction - frequency) * (friction + frequency))
  const fast = -friction - spread
  const slow = frequency ** 2 / fast
  const divisor = slow - fast
  const first = (velocity - fast * displacement) / divisor
  const second = (slow * displacement - velocity) / divisor
  return springCurve(seconds => {
    const time = Math.max(0, seconds)
    const a = first * Math.exp(slow * time)
    const b = second * Math.exp(fast * time)
    return { value: to + a + b, velocity: slow * a + fast * b }
  }, time => Math.abs(first) * Math.exp(slow * time) + Math.abs(second) * Math.exp(fast * time))
}

export function settlingDuration(spring: Readonly<SpringDescription>, { initialVelocity = 0, epsilon = .001 } = {}) {
  return solveSpring({ from: 0, to: 1, velocity: initialVelocity, spring }).settleTime(epsilon)
}

export function solveSpringTowardRamp({ spring, from, target, slope, velocity = 0 }: {
  spring: Readonly<SpringDescription>; from: number; target: number; slope: number; velocity?: number
}) {
  const spec = normalizeSpring(spring)
  const lag = spec.damping / spec.stiffness * slope
  const free = solveSpring({ from: from - target + lag, to: 0, velocity: velocity - slope, spring: spec })
  function sample(seconds: number): MotionSample {
    const time = Math.max(0, seconds)
    const point = free(time)
    return { value: target + slope * time - lag + point.value, velocity: slope + point.velocity }
  }
  return Object.assign(sample, { lag, value: (seconds: number) => sample(seconds).value, velocity: (seconds: number) => sample(seconds).velocity })
}

/** A rate between zero and one describes the remaining velocity per millisecond. */
export function solveDecay({ from, velocity, rate = scrollMotion.normalRate }: { from: number; velocity: number; rate?: number }) {
  if (!Number.isFinite(from) || !Number.isFinite(velocity) || !(rate > 0 && rate < 1)) {
    throw new RangeError('Expected finite values and a decay rate between zero and one')
  }
  const friction = -1000 * Math.log(rate)
  const distance = velocity / friction
  const timeUntil = (initial: number, threshold: number) => initial <= threshold ? 0
    : threshold > 0 ? Math.log(initial / threshold) / friction : Infinity
  return {
    from, rate, initialVelocity: velocity, rest: from + distance,
    value: (seconds: number) => from - distance * Math.expm1(-friction * Math.max(0, seconds)),
    velocity: (seconds: number) => velocity * Math.exp(-friction * Math.max(0, seconds)),
    settleTime: (threshold: number) => timeUntil(Math.abs(distance), threshold),
    timeToSpeed: (speed: number) => timeUntil(Math.abs(velocity), speed),
    timeToReach(target: number) {
      if (target === from) return 0
      const progress = (target - from) / distance
      return progress > 0 && progress < 1 ? -Math.log1p(-progress) / friction : null
    },
  }
}

export const decayRestDistance = (velocity: number, rate?: number) => solveDecay({ from: 0, velocity, rate }).rest

export function rubberBand(overflow: number, dimension: number, coefficient: number = scrollMotion.rubberBandCoefficient) {
  if (!(dimension > 0 && coefficient > 0 && Number.isFinite(dimension) && Number.isFinite(coefficient))) return 0
  if (!Number.isFinite(overflow)) return Math.sign(overflow) * dimension
  const distance = Math.abs(overflow) * coefficient
  return Math.sign(overflow) * dimension / (1 + dimension / distance)
}

export function rubberBandInverse(displayed: number, dimension: number, coefficient: number = scrollMotion.rubberBandCoefficient) {
  if (!(dimension > 0 && coefficient > 0 && Number.isFinite(dimension) && Number.isFinite(coefficient))) return 0
  const distance = Math.abs(displayed)
  return distance >= dimension ? Math.sign(displayed) * Infinity : displayed / (coefficient * (1 - distance / dimension))
}

export function rubberBandSlope(overflow: number, dimension: number, coefficient: number = scrollMotion.rubberBandCoefficient) {
  if (!(dimension > 0 && coefficient > 0 && Number.isFinite(dimension) && Number.isFinite(coefficient))) return 0
  return coefficient / (1 + Math.abs(overflow) * coefficient / dimension) ** 2
}

export function rubberBandClamp(value: number, minimum: number, maximum: number, dimension: number, coefficient: number = scrollMotion.rubberBandCoefficient) {
  const edge = Math.max(minimum, Math.min(maximum, value))
  return edge + rubberBand(value - edge, dimension, coefficient)
}

export function rubberBandUnclamp(value: number, minimum: number, maximum: number, dimension: number, coefficient = .55) {
  const edge = Math.max(minimum, Math.min(maximum, value))
  return edge + rubberBandInverse(value - edge, dimension, coefficient)
}
