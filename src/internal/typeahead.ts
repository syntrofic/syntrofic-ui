import { onScopeDispose, toValue, type MaybeRefOrGetter } from 'vue'
import { editable } from './collection-focus'

export interface TypeaheadOptions {
  getItemLabels: () => readonly (string | null | undefined)[]
  onMatch: (index: number) => void
  getCurrentIndex?: () => number
  resetMs?: number
  isDisabled?: (index: number) => boolean
}

const stroked: Record<string, string> = { đ: 'd', ł: 'l', ø: 'o', ħ: 'h', ŧ: 't', ƀ: 'b', ı: 'i' }
const exact = (value: string) => value.normalize('NFC').toLowerCase()
const folded = (value: string) => exact(value).normalize('NFD').replace(/\p{Mark}/gu, '').replace(/[đłøħŧƀı]/g, letter => stroked[letter])

export function useTypeahead(input: MaybeRefOrGetter<TypeaheadOptions>) {
  let buffer = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  function reset() {
    buffer = ''
    clearTimeout(timer)
  }
  onScopeDispose(reset, true)
  function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey && !event.getModifierState('AltGraph')
      || editable(event.target) || Array.from(event.key).length !== 1 || event.key === ' ' && !buffer) return false
    const { getItemLabels, getCurrentIndex, onMatch, isDisabled, resetMs = 750 } = toValue(input)
    const labels = getItemLabels()
    const key = exact(event.key)
    const cycle = buffer.length > 0 && buffer === key && key !== ' '
    buffer = cycle ? key : buffer + key
    const prefix = folded(buffer)
    const from = getCurrentIndex?.() ?? -1
    const current = Number.isInteger(from) && from >= 0 && from < labels.length ? from : -1
    const first = Math.max(0, cycle || buffer === key ? current + 1 : current)
    let match = -1
    for (let offset = 0; offset < labels.length; offset++) {
      const index = (first + offset) % labels.length
      const label = labels[index]?.trimStart()
      if (!label || isDisabled?.(index)) continue
      if (exact(label).startsWith(buffer) && prefix !== buffer) { match = index; break }
      if (match < 0 && folded(label).startsWith(prefix)) match = index
    }
    if (match >= 0) onMatch(match)
    clearTimeout(timer)
    timer = setTimeout(reset, Number.isFinite(resetMs) ? Math.max(0, resetMs) : 750)
    event.preventDefault()
    return true
  }
  return { onKeyDown, reset }
}
