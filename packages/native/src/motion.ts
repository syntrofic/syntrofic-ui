import { Animation, CoreTypes, type AnimationDefinition, type View } from '@nativescript/core'
import { onBeforeUnmount } from 'nativescript-vue'
import { useNativeUI } from './context'

type MotionTarget = AnimationDefinition & { target: View }

function apply({ target, opacity, translate, scale, backgroundColor, width, height, rotate }: MotionTarget) {
  if (opacity !== undefined) target.opacity = opacity
  if (width !== undefined) target.width = width
  if (height !== undefined) target.height = height
  if (typeof rotate === 'number') target.rotate = rotate
  if (translate) {
    target.translateX = translate.x
    target.translateY = translate.y
  }
  if (scale) {
    target.scaleX = scale.x
    target.scaleY = scale.y
  }
  if (backgroundColor !== undefined) target.backgroundColor = backgroundColor
}

export function useNativeMotion() {
  const { theme, reducedMotion } = useNativeUI()
  let active: Animation | undefined
  let generation = 0
  let pending = Promise.resolve()
  let mounted = true
  onBeforeUnmount(() => {
    mounted = false
    active?.cancel()
  })

  function run(
    frames: () => MotionTarget[],
    phase: 'enter' | 'exit' | 'replace' | 'state',
    done?: () => void,
  ) {
    const current = ++generation
    pending = pending.then(async () => {
      if (!mounted || current !== generation) return
      const definitions = frames()
      const settings = theme.value.motion
      const duration = phase === 'enter' ? settings.motionEnter
        : phase === 'exit' ? settings.motionExit
          : phase === 'replace' ? settings.motionReplace : settings.duration
      if (reducedMotion.value || !definitions.length) {
        definitions.forEach(apply)
      } else {
        const [x1, y1, x2, y2] = phase === 'exit' ? settings.exit : settings.settle
        const curve = CoreTypes.AnimationCurve.cubicBezier(x1, y1, x2, y2)
        try {
          const animation = new Animation(definitions.map(frame => ({ duration, curve, ...frame })))
          active = animation
          await animation.play()
        } catch {
          if (mounted) definitions.forEach(apply)
        } finally {
          active = undefined
        }
      }
      if (mounted && current === generation) done?.()
    }).catch(() => {
      if (mounted && current === generation) done?.()
    })
    return pending
  }

  return run
}
