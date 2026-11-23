const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined

/** Counts user-perceived characters for the textarea counter. */
export function characterCount(text: string): number {
  if (!segmenter) return Array.from(text).length
  let count = 0
  for (const _ of segmenter.segment(text)) count++
  return count
}
