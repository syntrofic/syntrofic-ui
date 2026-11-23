import { nextTick, onScopeDispose, watch, type Ref } from 'vue'
import { holdLayoutSwap, type HeldLayoutSwap } from './layout-content'
import { createAnimator, prefersReducedMotion, startLayoutCompanion, useAnimatedLayout } from './motion'

type Pane = { key: string; visible: readonly { id: string }[] }
const rowsIn = (node: HTMLElement) => [...node.querySelectorAll<HTMLElement>('[data-transfer-id]:not([data-layout-swap-copy])')]

function inPane(row: HTMLElement) {
  const list = row.closest('ul')
  if (!list) return false
  const bounds = list.getBoundingClientRect()
  const box = row.getBoundingClientRect()
  return box.bottom > bounds.top && box.top < bounds.bottom
}

export function useTransferMotion(root: Ref<HTMLElement | null>, panes: () => readonly Pane[], enabled: () => boolean) {
  const glide = useAnimatedLayout({ scope: root })
  const held = new Set<HeldLayoutSwap>()
  const arrivals = new Set<Animation>()
  let revision = 0

  function clear() {
    for (const copy of held) copy.dispose()
    for (const animation of arrivals) animation.cancel()
    held.clear()
    arrivals.clear()
  }

  watch(panes, (next, prior) => {
    const node = root.value
    if (!enabled() || !node || prefersReducedMotion(node) || typeof node.animate !== 'function') return
    if (next.every((pane, index) => pane.visible.length === prior[index]?.visible.length
      && pane.visible.every((item, offset) => item === prior[index].visible[offset]))) return
    const target = new Map(next.flatMap(pane => pane.visible.map(item => [item.id, pane.key] as const)))
    const source = new Map(prior.flatMap(pane => pane.visible.map(item => [item.id, pane.key] as const)))
    const rows = rowsIn(node)
    const layout = glide(rows)
    const transaction = ++revision
    clear()
    const moves = new Map<string, HeldLayoutSwap>()
    for (const row of rows) {
      const id = row.dataset.transferId!
      if (!target.has(id) || target.get(id) === source.get(id) || !inPane(row)) continue
      const copy = holdLayoutSwap(row, node)
      if (copy) { held.add(copy); moves.set(id, copy) }
    }

    void nextTick(() => {
      if (transaction !== revision || root.value !== node) return
      layout()
      if (!moves.size) return
      const current = new Map(rowsIn(node).map(row => [row.dataset.transferId, row]))
      for (const [id, copy] of moves) {
        const row = current.get(id)
        const finish = () => { held.delete(copy); copy.dispose() }
        if (!row || !inPane(row)) { finish(); continue }
        const before = copy.copy.getBoundingClientRect()
        const after = row.getBoundingClientRect()
        const ratioX = node.offsetWidth ? node.getBoundingClientRect().width / node.offsetWidth : 1
        const ratioY = node.offsetHeight ? node.getBoundingClientRect().height / node.offsetHeight : 1
        const x = (after.left - before.left) / ratioX
        const y = (after.top - before.top) / ratioY
        const old = createAnimator(copy.copy).animate('transfer', [
          { opacity: 1, translate: '0px 0px' }, { opacity: .88, translate: `${x * .75}px ${y * .75}px`, offset: .62 },
          { opacity: 0, translate: `${x}px ${y}px` },
        ], { role: 'move', fill: 'backwards' })
        const arrival = createAnimator(row).animate('transfer', [{ opacity: 0 }, { opacity: .14, offset: .48 }, { opacity: 1 }],
          { role: 'move', fill: 'backwards' })
        arrivals.add(arrival)
        startLayoutCompanion(copy.copy, old)
        startLayoutCompanion(row, arrival, old)
        void old.finished.then(finish, finish)
        const release = () => { arrivals.delete(arrival) }
        void arrival.finished.then(release, release)
      }
    })
  })

  onScopeDispose(() => { revision++; clear() })
}
