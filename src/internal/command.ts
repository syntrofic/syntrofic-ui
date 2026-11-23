export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: string
  group?: string
  keywords?: readonly string[]
  shortcut?: readonly string[]
  disabled?: boolean
  children?: readonly CommandGroup[]
}

export interface CommandGroup {
  id: string
  label?: string
  items: readonly CommandItem[]
}

export function groupCommandItems(items: readonly CommandItem[]): CommandGroup[] {
  const groups = new Map<string | undefined, CommandItem[]>()
  for (const item of items) {
    const group = groups.get(item.group) ?? []
    group.push(item)
    groups.set(item.group, group)
  }
  return [...groups].map(([label, entries]) => ({ id: label === undefined ? 'flat' : 'section:' + label, label, items: entries }))
}

function fold(text: string) {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '').toLocaleLowerCase()
}

function scoreTerm(source: string, term: string) {
  if (source === term) return 0
  if (source.startsWith(term)) return 1
  const index = source.indexOf(term)
  if (index >= 0) return 2 + Math.min(index / 100, 1)

  let last = -1
  let gaps = 0
  for (const character of term) {
    const next = source.indexOf(character, last + 1)
    if (next < 0) return Infinity
    gaps += next - last - 1
    last = next
  }
  return 4 + Math.min(gaps / 100, 1)
}

export function searchCommands(groups: readonly CommandGroup[], query: string, filter?: (item: CommandItem, query: string) => boolean) {
  const terms = fold(query).split(/[\s,，]+/u).filter(Boolean)
  if (!terms.length) return groups.filter(group => group.items.length)
  return groups.map(group => {
    const items = filter ? group.items.filter(item => filter(item, query)) : group.items.map(item => {
      const fields = [item.label, ...(item.keywords ?? []), item.description ?? ''].map(fold)
      const score = terms.reduce((sum, term) => sum + Math.min(...fields.map(field => scoreTerm(field, term))), 0)
      return { item, score }
    }).filter(match => Number.isFinite(match.score)).sort((a, b) => a.score - b.score).map(match => match.item)
    return { ...group, items }
  }).filter(group => group.items.length)
}
