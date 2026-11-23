import type { InjectionKey, Ref } from 'vue'
import type { ButtonSize } from '../types'

export const toolbarContext: InjectionKey<{
  size: Readonly<Ref<ButtonSize>>
  disabled: Readonly<Ref<boolean>>
} | null> = Symbol('Syntrofic toolbar')
