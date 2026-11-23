export interface PagingMotion { position: number; velocity: number }

export function movePaging(state: PagingMotion, target: number, elapsedMilliseconds: number) {
  const steps = Math.min(48, Math.max(0, Math.floor(elapsedMilliseconds)))
  let { position, velocity } = state
  for (let index = 0; index < steps; index++) {
    velocity = (velocity + (target - position) * .00028) * .971
    position += velocity
  }
  const settled = Math.abs(target - position) < .5 && Math.abs(velocity) < .05
  return { position: settled ? target : position, velocity: settled ? 0 : velocity, settled }
}

export function releasePage(start: number, progress: number, velocity: number) {
  const direction = Math.abs(velocity) >= .3 ? Math.sign(velocity) : Math.abs(progress) >= .5 ? Math.sign(progress) : 0
  return start + direction
}
