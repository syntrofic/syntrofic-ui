import type { ChatAttachmentKind } from './types'

const types: readonly [ChatAttachmentKind, RegExp, RegExp][] = [
  ['image', /^image\//i, /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|webp)$/i],
  ['video', /^video\//i, /\.(avi|m4v|mkv|mov|mp4|mpeg|ogv|webm)$/i],
  ['audio', /^audio\//i, /\.(aac|aif|flac|m4a|mp3|oga|ogg|opus|wav)$/i],
  ['spreadsheet', /(?:spreadsheet|ms-excel|csv|tab-separated)/i, /\.(csv|ods|tsv|xlsx?)$/i],
  ['archive', /(?:zip|tar|x-7z-compressed|x-bzip|rar)/i, /\.(7z|bz2|gz|rar|tar|xz|zip)$/i],
  ['code', /(?:javascript|typescript|json|xml|x-python|x-shellscript)/i, /\.(css|go|html?|js|json|jsx|mjs|py|rs|sh|sql|toml|tsx?|vue|xml|ya?ml)$/i],
  ['document', /(?:pdf|word|presentation|powerpoint|^text\/plain)/i, /\.(docx?|md|odt|pdf|pptx?|rtf|txt)$/i],
]

export function inferChatAttachmentKind(mime?: string, name?: string): ChatAttachmentKind {
  const detected = types.find(([, pattern]) => pattern.test(mime?.split(';', 1)[0].trim() ?? ''))
  if (detected) return detected[0]
  return types.find(([, , pattern]) => pattern.test(name?.trim() ?? ''))?.[0] ?? 'other'
}

export function formatChatAttachmentSize(bytes?: number, locale = 'en'): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: index ? 1 : 0 }).format(value)
  return `${number} ${units[index]}`
}
