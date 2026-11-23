type ItemKey = string | number
export type SwipeSide = 'leading' | 'trailing'

export interface SwipeAction<Id extends string = string> {
  id: Id
  label: string
  icon?: string
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  remove?: boolean
  onActivate: (event: { id: Id; itemKey: ItemKey | undefined }) => void
}
export interface SwipeOptions<Id extends string = string> {
  leading?: readonly SwipeAction<Id>[]
  trailing?: readonly SwipeAction<Id>[]
  swipeBehavior?: 'reveal' | 'commit'
}

const swipeOptions = Symbol('Syntrofic swipe options')
const empty = Object.freeze({ leading: Object.freeze([]), trailing: Object.freeze([]), swipeBehavior: 'reveal' as const })
export interface ItemSwipe {
  readonly [swipeOptions]: Readonly<Required<SwipeOptions>>
}

export function createSwipe<Id extends string>(options: SwipeOptions<Id>): ItemSwipe {
  function actions(source: readonly SwipeAction<Id>[] = []): readonly SwipeAction[] {
    const keys = new Set<Id>()
    return Object.freeze(source.flatMap(action => {
      if (!action.id || keys.has(action.id)) return []
      keys.add(action.id)
      return [Object.freeze({
        ...action, onActivate: ({ itemKey }: { itemKey: ItemKey | undefined }) => action.onActivate({ id: action.id, itemKey }),
      })]
    }))
  }
  return Object.freeze({ [swipeOptions]: Object.freeze({
    leading: actions(options.leading), trailing: actions(options.trailing), swipeBehavior: options.swipeBehavior ?? 'reveal',
  }) })
}

export function readSwipe(swipe: ItemSwipe) { return swipe[swipeOptions] ?? empty }

export const swipeClaim = 8

export function swipeOpens(distance: number, velocity: number, width: number) {
  return Math.abs(velocity) >= .05 ? velocity > 0 : distance > width / 2
}

export function swipeConfirmation(width: number, actions: number) {
  const destination = Math.max(actions, width - 28)
  return { destination, threshold: Math.max(actions + 16, actions + (destination - actions) * .69) }
}
