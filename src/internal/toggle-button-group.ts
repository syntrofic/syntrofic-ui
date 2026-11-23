import type { InjectionKey, Ref } from 'vue'
import type { ButtonSize } from '../types'

export const toggleButtonGroupContext: InjectionKey<{
  selected: Readonly<Ref<string | string[] | undefined>>
  disabled: Readonly<Ref<boolean>>
  size: Readonly<Ref<ButtonSize>>
}> = Symbol('Syntrofic toggle button group')
