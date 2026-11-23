import { toValue, type MaybeRefOrGetter } from 'vue'
import { useClickableContainer } from './element-behavior'

export interface InputContainerOptions {
  containerRef: MaybeRefOrGetter<HTMLElement | null | undefined>
  inputRef: MaybeRefOrGetter<HTMLElement | null | undefined>
  disabled?: MaybeRefOrGetter<boolean>
}

const textTypes = new Set(['text', 'search', 'email', 'password', 'tel', 'url', 'number', 'date', 'datetime-local', 'time', 'month', 'week'])

export function useInputContainer(options: InputContainerOptions) {
  return useClickableContainer(() => {
    const input = toValue(options.inputRef)
    const container = toValue(options.containerRef)
    const disabled = toValue(options.disabled) || !input || !container?.contains(input)
      || input.matches(':disabled, [aria-disabled="true"]')
    return {
      container,
      disabled,
      onClick() {
        if (input instanceof HTMLInputElement && !textTypes.has(input.type)) input.click()
        else input?.focus()
      },
    }
  })
}
