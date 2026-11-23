import { onMounted, onScopeDispose, shallowRef, toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

const liveClocks = new Set<(now: number) => void>()
let ticker: ReturnType<typeof setInterval> | undefined

function subscribe(update: (now: number) => void) {
  liveClocks.add(update)
  ticker ??= setInterval(() => {
    const current = Date.now()
    for (const clock of liveClocks) clock(current)
  }, 1000)
  return () => {
    liveClocks.delete(update)
    if (liveClocks.size || ticker === undefined) return
    clearInterval(ticker)
    ticker = undefined
  }
}

export function useClock(live: MaybeRefOrGetter<boolean>) {
  const now = shallowRef<number>()
  const mounted = shallowRef(false)
  onMounted(() => { mounted.value = true })
  const stop = watchEffect(cleanup => {
    if (!mounted.value) return
    now.value = Date.now()
    if (!toValue(live)) return
    cleanup(subscribe(current => { now.value = current }))
  })
  onScopeDispose(stop)
  return now
}

export const relativeUnits = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800],
  ['day', 86_400], ['hour', 3_600], ['minute', 60], ['second', 1],
] as const

export function relativeTime(seconds: number, locale: string | undefined, short: boolean) {
  const [unit, divisor] = relativeUnits.find(([, duration]) => Math.abs(seconds) >= duration) ?? relativeUnits[6]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: short ? 'narrow' : 'long' })
    .format(Math.trunc(seconds / divisor), unit)
}
