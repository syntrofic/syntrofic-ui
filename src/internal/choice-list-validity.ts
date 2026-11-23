import { onBeforeUnmount, onMounted, watchPostEffect } from 'vue'
import { setChoiceValidity } from './choice-validity'

export function useChoiceListValidity(
  fieldset: () => HTMLFieldSetElement | null,
  kind: 'checkbox' | 'radio',
  settings: () => { error?: string; requiredMessage?: string; disabled?: boolean; readOnly?: boolean },
) {
  let current: HTMLInputElement | undefined
  let observer: MutationObserver | undefined

  function sync() {
    const group = fieldset()
    const { error, requiredMessage, disabled, readOnly } = settings()
    const inputs = Array.from(group?.querySelectorAll<HTMLInputElement>(`input[type="${kind}"]`) ?? [])
      .filter(input => input.closest('fieldset') === group && !input.matches(':disabled, [data-choice-disabled]'))
    const next = !disabled && !readOnly && (error || requiredMessage)
      ? inputs.find(input => input.getAttribute('aria-readonly') !== 'true') : undefined
    if (current && current !== next) setChoiceValidity(current, 'group')
    current = next
    if (next) setChoiceValidity(next, 'group', error || (inputs.some(input => input.checked) ? undefined : requiredMessage))
  }

  watchPostEffect(sync)
  onMounted(() => {
    const group = fieldset()
    const view = group?.ownerDocument.defaultView
    if (!group || !view) return
    observer = new view.MutationObserver(sync)
    observer.observe(group, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-readonly', 'data-choice-disabled'] })
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    if (current) setChoiceValidity(current, 'group')
  })
}
