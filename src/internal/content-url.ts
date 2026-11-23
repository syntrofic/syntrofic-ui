export function contentUrl(value: unknown, image = false): string | undefined {
  if (typeof value !== 'string') return undefined
  const url = value.trim()
  if (!url || /[\u0000-\u0020\u007f]/u.test(url) || url.includes('\\')) return undefined
  const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(url)?.[0].toLowerCase()
  const allowed = image ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:', 'tel:']
  return !scheme || allowed.includes(scheme) ? url : undefined
}
