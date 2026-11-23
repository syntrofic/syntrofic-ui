export const isEnglish = typeof document !== 'undefined' && document.documentElement.lang === 'en'
export const siteText = (chinese: string, english: string) => isEnglish ? english : chinese

export function siteCount(count: number, chinese: string, english: string) {
  return siteText(`${count} 个${chinese}`, `${count} ${english}`)
}
