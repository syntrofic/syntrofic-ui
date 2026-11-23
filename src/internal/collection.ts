import type { SelectOption } from '../types'

export function groupOptions(options: readonly SelectOption[]) {
  const groups = new Map<string | undefined, SelectOption[]>()
  for (const option of options) {
    const group = groups.get(option.group) ?? []
    group.push(option)
    groups.set(option.group, group)
  }
  return [...groups]
}
