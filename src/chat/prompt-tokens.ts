export interface PromptTextSegment {
  type: 'text'
  text: string
}

export interface PromptTokenSegment {
  type: 'token'
  id: string
  value: string
  label?: string
  expandedText?: string
}

export type PromptSegment = PromptTextSegment | PromptTokenSegment

export interface PromptTokenSuggestion {
  id: string
  value: string
  label: string
  trigger?: string
  description?: string
  keywords?: readonly string[]
  disabled?: boolean
}

export interface PromptTriggerRange {
  trigger: string
  query: string
  from: number
  to: number
}

export const segmentText = (segment: PromptSegment) => segment.type === 'text' ? segment.text : segment.value
export const promptText = (segments: readonly PromptSegment[]) => segments.map(segmentText).join('')

export function promptTokenAttributes(token: Pick<PromptTokenSegment, 'id' | 'value' | 'label' | 'expandedText'>) {
  return { 'data-prompt-token-id': token.id, 'data-prompt-token-value': token.value, 'data-prompt-token-label': token.label,
    'data-prompt-token-expanded': token.expandedText }
}

export function normalizePromptSegments(segments: readonly PromptSegment[]) {
  const result: PromptSegment[] = []
  for (const segment of segments) {
    if (!segmentText(segment)) continue
    const previous = result.at(-1)
    if (segment.type === 'text' && previous?.type === 'text') previous.text += segment.text
    else result.push({ ...segment })
  }
  return result
}

export function samePromptSegments(previous: readonly PromptSegment[], next: readonly PromptSegment[]) {
  return previous.length === next.length && previous.every((segment, index) => {
    const counterpart = next[index]
    if (segment.type === 'text') return counterpart.type === 'text' && counterpart.text === segment.text
    return counterpart.type === 'token' && counterpart.id === segment.id && counterpart.value === segment.value
      && counterpart.label === segment.label && counterpart.expandedText === segment.expandedText
  })
}

function splitAt(segments: readonly PromptSegment[], offset: number, edge: 'start' | 'end' | 'nearest') {
  let start = 0
  for (const segment of segments) {
    const end = start + segmentText(segment).length
    if (segment.type === 'token' && start < offset && offset < end) {
      if (edge === 'nearest') return offset - start < end - offset ? start : end
      return edge === 'start' ? start : end
    }
    start = end
  }
  return Math.min(Math.max(0, offset), start)
}

function segmentSlice(segments: readonly PromptSegment[], from: number, to: number) {
  let start = 0
  const result: PromptSegment[] = []
  for (const segment of segments) {
    const end = start + segmentText(segment).length
    if (start >= to) break
    if (end > from) {
      if (segment.type === 'token') result.push(segment)
      else result.push({ type: 'text', text: segment.text.slice(Math.max(0, from - start), to - start) })
    }
    start = end
  }
  return result
}

export function replacePromptRange(segments: readonly PromptSegment[], from: number, to: number, replacement: readonly PromptSegment[]) {
  const first = Math.min(from, to)
  const last = Math.max(from, to)
  const start = splitAt(segments, first, first === last ? 'nearest' : 'start')
  const end = first === last ? start : splitAt(segments, last, 'end')
  const parts = normalizePromptSegments([...segmentSlice(segments, 0, start), ...replacement, ...segmentSlice(segments, end, Infinity)])
  return { parts, caret: start + promptText(replacement).length }
}

const triggerBoundary = /[\s\p{Ps}"'“‘：:]/u
const stopQuery = /[\s\p{Pe},，、。!?！？]/u

export function findPromptTrigger(
  segments: readonly PromptSegment[],
  caret: number,
  triggers: readonly string[],
  allowsSpaces = false,
): PromptTriggerRange | undefined {
  let start = 0
  for (const segment of segments) {
    const end = start + segmentText(segment).length
    if (caret > end) {
      start = end
      continue
    }
    if (segment.type === 'token' || caret <= start) return undefined
    const offset = caret - start
    const beforeCaret = segment.text.slice(0, offset)
    const eligible = triggers.filter(Boolean).sort((left, right) => right.length - left.length)
    let match: PromptTriggerRange | undefined
    for (const trigger of eligible) {
      const index = beforeCaret.lastIndexOf(trigger)
      if (index < 0 || index > 0 && !triggerBoundary.test(beforeCaret[index - 1])) continue
      const query = beforeCaret.slice(index + trigger.length)
      if (/[\r\n]/u.test(query) || !allowsSpaces && stopQuery.test(query)) continue
      const suffix = allowsSpaces ? '' : segment.text.slice(offset).split(stopQuery, 1)[0]
      if (match && start + index <= match.from) continue
      match = { trigger, query, from: start + index, to: caret + suffix.length }
    }
    return match
  }
}

export function filterPromptSuggestions(options: readonly PromptTokenSuggestion[], range: PromptTriggerRange) {
  const query = range.query.toLocaleLowerCase().trim()
  return options.filter(option => {
    if (option.trigger && option.trigger !== range.trigger) return false
    return !query || [option.label, option.value, ...(option.keywords ?? [])].some(value => value.toLocaleLowerCase().includes(query))
  })
}
