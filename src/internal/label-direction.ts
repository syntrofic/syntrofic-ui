const rtlLetters = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u
const letter = /\p{Letter}/u

/** Ellipsis follows the label's reading direction. Mixed labels follow their surrounding layout. */
export function labelDirection(label: string | number | undefined): 'ltr' | 'rtl' | undefined {
  if (label === undefined) return
  let rtl = false
  let ltr = false
  for (const character of String(label)) {
    if (letter.test(character)) {
      if (rtlLetters.test(character)) rtl = true
      else ltr = true
    } else if (character === '\u200f' || character === '\u061c') rtl = true
    else if (character === '\u200e') ltr = true
    if (rtl && ltr) return
  }
  return rtl ? 'rtl' : 'ltr'
}
