import { records } from './catalog.mjs'
const targets = new Set(['web','web-pro','native','native-pro'])
function shape(entry) {
  const name = entry.name.toLowerCase()
  if (/calendar|date picker/.test(name)) return 'calendar'
  if (/chart|meter|progress/.test(name)) return 'chart'
  if (/input|textarea|switch|checkbox|select|field|otp/.test(name)) return 'field'
  if (/table|list|menu|accordion|timeline|step/.test(name)) return 'collection'
  if (/button|link|tag|chip|badge|spinner/.test(name)) return 'action'
  return 'surface'
}
export function designKit() {
  const styles = records.filter(entry => targets.has(entry.track) && !entry.id.includes('.export.'))
  return {
    version: 1, kind: 'syntrofic-design-kit',
    components: styles.map(entry => ({ id: entry.id, name: entry.name, track: entry.track, shape: shape(entry),
      code: entry.implementation?.component, reviewNumber: entry.implementation?.reviewNumber })),
  }
}
