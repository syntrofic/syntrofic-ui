import { nextTick, onScopeDispose, watch, type Ref } from 'vue'
import { holdLayoutSwap, playLayoutSwap, type HeldLayoutSwap } from './layout-content'
import { createAnimator, glideOf, prefersReducedMotion, startLayoutCompanion, useAnimatedLayout } from './motion'

interface ContentMotionOptions {
  items?: () => readonly unknown[]
  content?: (frame: HTMLElement) => HTMLElement | null
  capture?: (content: HTMLElement, frame: HTMLElement) => HeldLayoutSwap | undefined
  itemRows?: (content: HTMLElement) => HTMLElement[]
  captureLeaving?: (content: HTMLElement, frame: HTMLElement, indices: readonly number[]) => HeldLayoutSwap | undefined
  animateItems?: () => boolean
  blockSize?: (frame: HTMLElement) => number | undefined
  clip?: boolean
  animateContent?: boolean
}
const noItems: readonly unknown[] = []

/** Keep a collection's viewport and its content on the same clock during a result update. */
export function useCollectionContentMotion(frame: Ref<HTMLElement | null>, state: () => string, {
  items = () => noItems,
  content: findContent = element => element.querySelector<HTMLElement>(':scope > .sy-collection-content__body'),
  capture = holdLayoutSwap,
  itemRows,
  captureLeaving,
  animateItems = () => true,
  blockSize = element => parseFloat(getComputedStyle(element).blockSize),
  clip = true,
  animateContent = true,
}: ContentMotionOptions = {}) {
  const glide = useAnimatedLayout()
  let generation = 0
  let stop: (() => void) | undefined
  onScopeDispose(() => { generation++; stop?.() })

  watch([frame, state, items], ([element, current, nextItems], [last, previous, previousItems]) => {
    const content = element && findContent(element)
    if (!element || element !== last || !content || typeof element.animate !== 'function' || prefersReducedMotion(element)) {
      generation++
      stop?.()
      stop = undefined
      return
    }
    const switching = current !== previous
    if (!switching && nextItems.length === previousItems.length && nextItems.every((item, index) => item === previousItems[index])) return
    if (!switching && !animateItems()) return
    const from = blockSize(element)
    const nextKeys = itemRows && !switching ? new Set(nextItems) : undefined
    const oldKeys = nextKeys && new Set(previousItems)
    const departing = nextKeys ? previousItems.flatMap((key, index) => nextKeys.has(key) ? [] : [index]) : []
    let copy: HeldLayoutSwap | undefined
    if (animateContent) {
      if (switching) copy = capture(content, element)
      else if (departing.length) copy = captureLeaving?.(content, element, departing)
    }
    const rows = switching ? [] : itemRows?.(content) ?? [...content.querySelectorAll<HTMLElement>('[role="option"]')]
    const play = switching ? undefined : glide(rows)
    stop?.()
    stop = undefined

    const transaction = ++generation
    void nextTick(() => {
      if (transaction !== generation || !element.isConnected || frame.value !== element) { copy?.dispose(); return }
      const to = blockSize(element)
      play?.()
      const swap = switching ? playLayoutSwap(copy, content) : undefined
      const entry = switching && animateContent && !swap ? createAnimator(content).animate('enter', [{ opacity: .25 }, { opacity: 1 }],
        { role: 'enter', fill: 'backwards' }) : undefined
      if (entry) startLayoutCompanion(content, entry)
      let anchor = swap?.incoming ?? entry ?? rows.map(glideOf).find(animation => animation !== null)
      const exit = !switching && copy ? startLayoutCompanion(copy.copy, createAnimator(copy.copy).animate('exit', [
        { opacity: copy.copy.style.opacity || 1 }, { opacity: 0 },
      ], { role: 'exit', fill: 'backwards' }), anchor) : undefined
      if (exit && copy) {
        exit.finished.then(copy.dispose, copy.dispose)
        anchor ??= exit
      }
      if (itemRows && oldKeys && animateContent) {
        for (const [index, row] of itemRows(content).entries()) {
          if (index >= nextItems.length || oldKeys.has(nextItems[index])) continue
          const appear = createAnimator(row).animate('row-enter', [{ opacity: .2 }, { opacity: 1 }], { role: 'enter', fill: 'backwards' })
          startLayoutCompanion(row, appear, anchor)
          anchor ??= appear
        }
      }
      const overflow = clip ? { overflow: 'clip' } : {}
      const resize = from !== undefined && to !== undefined && Math.abs(to - from) > 1 ? createAnimator(element).animate('height', [
        { blockSize: from + 'px', ...overflow },
        { blockSize: to + 'px', ...overflow },
      ], { role: 'move', fill: 'backwards' }) : undefined
      if (resize) startLayoutCompanion(element, resize, anchor)
      stop = () => {
        resize?.cancel()
        entry?.cancel()
        swap?.incoming.cancel()
        swap?.outgoing.cancel()
        exit?.cancel()
        copy?.dispose()
      }
    })
  })
}
