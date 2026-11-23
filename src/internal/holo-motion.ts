export interface HoloSpring {
  stiffness?: number
  damping?: number
  mass?: number
}

export interface HoloMotion {
  x: number
  y: number
  intensity: number
}

export const neutralHoloMotion: Readonly<HoloMotion> = { x: 0, y: 0, intensity: 0 }

export function holoLimit(value: number | undefined, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback
}

export function stepHolo(
  value: HoloMotion,
  velocity: HoloMotion,
  target: Readonly<HoloMotion>,
  seconds: number,
  spring: HoloSpring | undefined,
  following: boolean,
) {
  const stiffness = holoLimit(spring?.stiffness, 18, 700, following ? 220 : 150)
  const damping = holoLimit(spring?.damping, 4, 120, following ? 25 : 22)
  const mass = holoLimit(spring?.mass, .2, 8, 1)
  const steps = Math.max(1, Math.ceil(seconds * 120))
  const delta = seconds / steps
  const friction = Math.exp(-damping * delta / mass)

  for (let index = 0; index < steps; index++) {
    for (const key of ['x', 'y', 'intensity'] as const) {
      const force = (target[key] - value[key]) * stiffness / mass
      velocity[key] = (velocity[key] + force * delta) * friction
      value[key] += velocity[key] * delta
    }
  }
  return (['x', 'y', 'intensity'] as const).every(key =>
    Math.abs(value[key] - target[key]) <= .001 && Math.abs(velocity[key]) <= .012)
}
