import type { VNode } from 'nativescript-vue'

export type NativeToastPlacement = 'top' | 'bottom'
export type NativeToastTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
export type NativeToastTarget = string | readonly string[]
export type NativeToastInput = string | NativeToastOptions

export interface NativeToastControls {
  show: (input: NativeToastInput) => string
  hide: (target?: NativeToastTarget) => void
}

export interface NativeToastEntryControls extends NativeToastControls {
  id: string
  dismiss: () => void
}

export interface NativeToastOptions {
  id?: string
  label?: string
  description?: string
  tone?: NativeToastTone
  placement?: NativeToastPlacement
  duration?: number | 'persistent'
  actionLabel?: string
  onAction?: (controls: NativeToastEntryControls) => void | Promise<void>
  render?: (controls: NativeToastEntryControls) => VNode
  dismissible?: boolean
  swipeable?: boolean
  animation?: boolean
  onShow?: () => void
  onHide?: () => void
}

export interface NativeToastView {
  id: string
  options: NativeToastOptions
  phase: 'visible' | 'leaving'
}

interface Entry {
  id: string
  options: NativeToastOptions
  phase: 'queued' | NativeToastView['phase']
  remaining: number
  deadline: number
  timer?: ReturnType<typeof setTimeout>
  pauses: Set<string>
  shown: boolean
}

const clock = { now: Date.now, set: setTimeout, clear: clearTimeout }

export function createNativeToastQueue(
  publish: (entries: NativeToastView[]) => void,
  defaults: () => { duration: number; maxVisible: number },
  time = clock,
) {
  let next = 0
  const items: Entry[] = []
  const globalPauses = new Set<string>()
  let disposed = false

  function find(id: string) { return items.find(item => item.id === id) }

  function stop(entry: Entry) {
    if (entry.timer === undefined) return
    time.clear(entry.timer)
    entry.timer = undefined
    entry.remaining = Math.max(0, entry.deadline - time.now())
  }

  function schedule(entry: Entry) {
    if (entry.timer !== undefined || !entry.shown || entry.phase !== 'visible'
      || entry.pauses.size || globalPauses.size || !Number.isFinite(entry.remaining)) return
    const delay = Math.min(2_147_483_647, entry.remaining)
    entry.deadline = time.now() + entry.remaining
    entry.timer = time.set(() => {
      entry.timer = undefined
      entry.remaining = Math.max(0, entry.deadline - time.now())
      if (entry.remaining) schedule(entry)
      else hide(entry.id)
    }, delay)
  }

  function update() {
    if (disposed) return
    const limit = defaults().maxVisible
    let size = items.reduce((total, entry) => total + Number(entry.phase !== 'queued'), 0)
    const capacity = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 3
    for (const entry of items) {
      if (size >= capacity) break
      if (entry.phase !== 'queued') continue
      entry.phase = 'visible'
      size++
    }
    publish(items.flatMap(entry => entry.phase === 'queued' ? [] : [
      { id: entry.id, options: entry.options, phase: entry.phase },
    ]))
  }

  function remove(entry: Entry) {
    stop(entry)
    items.splice(items.indexOf(entry), 1)
  }

  function show(input: NativeToastInput) {
    const options = typeof input === 'string' ? { label: input } : { ...input }
    let id = options.id
    if (id === undefined) {
      do { id = `native-toast-${++next}` } while (find(id))
    }
    if (disposed || find(id)) return id
    const requested = options.duration ?? defaults().duration
    const remaining = requested === 'persistent' ? Infinity : Number.isFinite(requested) ? Math.max(0, requested) : 4000
    items.push({ id, options, phase: 'queued', remaining, deadline: 0, pauses: new Set(), shown: false })
    update()
    return id
  }

  function hide(target?: NativeToastTarget) {
    const targets = target === 'all' ? items.map(entry => entry.id)
      : typeof target === 'string' ? [target] : target ?? [items.at(-1)?.id]
    let changed = false
    for (const id of targets) {
      const entry = id === undefined ? undefined : find(id)
      if (!entry || entry.phase === 'leaving') continue
      if (entry.phase === 'queued') remove(entry)
      else {
        stop(entry)
        entry.phase = 'leaving'
      }
      changed = true
    }
    if (changed) update()
  }

  function entered(id: string) {
    const entry = find(id)
    if (!entry || entry.shown || entry.phase !== 'visible') return
    entry.shown = true
    schedule(entry)
    entry.options.onShow?.()
  }

  function exited(id: string) {
    const entry = find(id)
    if (!entry || entry.phase !== 'leaving') return
    remove(entry)
    update()
    entry.options.onHide?.()
  }

  function pause(id: string, key: string, paused: boolean) {
    const entry = find(id)
    if (!entry) return
    if (paused) {
      entry.pauses.add(key)
      stop(entry)
    } else {
      entry.pauses.delete(key)
      schedule(entry)
    }
  }

  function pauseAll(key: string, paused: boolean) {
    if (paused) globalPauses.add(key)
    else globalPauses.delete(key)
    for (const entry of items) paused ? stop(entry) : schedule(entry)
  }

  function dispose() {
    disposed = true
    items.forEach(stop)
    items.length = 0
  }

  return { show, hide, entered, exited, pause, pauseAll, update, dispose }
}
