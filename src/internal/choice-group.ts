import { computed, inject, useAttrs, useTemplateRef, type InjectionKey, type Ref } from 'vue'
import type { ChoiceFieldProps, ChoiceListProps, MultipleChoiceListProps } from '../types'
import { onFormReset } from './form-reset'

type ChoiceKind = 'checkbox' | 'switch'
type ChoicePresentation = Pick<ChoiceListProps, 'disabled' | 'disabledMessage' | 'readOnly' | 'size'>

interface ChoiceSettings {
  presentation: Ref<ChoicePresentation>
}

export interface ChoiceGroupContext extends ChoiceSettings {
  value: Ref<readonly string[]>
  initial: readonly string[]
  name: Ref<string | undefined>
  action: Ref<MultipleChoiceListProps['changeAction']>
}

export interface RadioGroupContext extends ChoiceSettings {
  value: Ref<string | undefined>
  initial: string | undefined
  name: Ref<string>
  required: Ref<boolean>
}

export const radioGroup: InjectionKey<RadioGroupContext> = Symbol('Syntrofic radio group')
export const checkboxGroup: InjectionKey<ChoiceGroupContext> = Symbol('Syntrofic checkbox group')
export const switchGroup: InjectionKey<ChoiceGroupContext> = Symbol('Syntrofic switch group')

export function useChoiceOptions(props: ChoiceFieldProps, group: ChoiceSettings | null, action?: () => ChoiceFieldProps['changeAction']) {
  const attrs = useAttrs()
  const options = computed(() => {
    const context = group?.presentation.value
    return { ...props, readOnly: props.readOnly || context?.readOnly, size: props.size ?? context?.size,
      disabledMessage: context?.disabled ? context.disabledMessage ?? props.disabledMessage : props.disabledMessage,
      changeAction: props.changeAction ?? action?.() }
  })
  function controlAttrs() {
    return { ...attrs, ...(group?.presentation.value.disabled && options.value.disabledMessage && { disabled: true }) }
  }
  return { options, controlAttrs }
}

export function useChoice(
  kind: ChoiceKind,
  props: ChoiceFieldProps & { value?: string | number; name?: string },
  model: Ref<boolean | undefined>,
) {
  const group = inject(kind === 'checkbox' ? checkboxGroup : switchGroup, null)
  const input = useTemplateRef<HTMLInputElement>('input')
  const initial = Boolean(model.value)
  const key = computed(() => props.value === undefined ? undefined : String(props.value))
  const name = computed(() => props.name ?? group?.name.value)
  const checked = computed({
    get: () => group && key.value !== undefined ? group.value.value.includes(key.value) : Boolean(model.value),
    set(value: boolean) {
      if (!group || key.value === undefined) {
        model.value = value
        return
      }

      const next = new Set(group.value.value)
      if (value) next.add(key.value)
      else next.delete(key.value)
      group.value.value = [...next]
    },
  })
  const defaultChecked = computed(() => group && key.value !== undefined ? group.initial.includes(key.value) : initial)
  onFormReset(() => input.value, () => {
    if (!group || key.value === undefined) model.value = initial
  })
  const presentation = useChoiceOptions(props, group, () => {
    const action = group?.action.value
    return action && ((_, event, signal) => action(group.value.value, event, signal))
  })
  return { input, name, checked, defaultChecked, ...presentation }
}
