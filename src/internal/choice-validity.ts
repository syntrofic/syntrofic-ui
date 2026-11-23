const messages = new WeakMap<HTMLInputElement, { group?: string; status?: string }>()

export function setChoiceValidity(input: HTMLInputElement, source: 'group' | 'status', message?: string) {
  const current = messages.get(input) ?? {}
  if (current[source] === message) return
  current[source] = message
  const error = current.status ?? current.group
  if (error) messages.set(input, current)
  else messages.delete(input)
  input.setCustomValidity(error ?? '')
}
