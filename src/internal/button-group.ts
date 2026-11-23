import type { InjectionKey } from 'vue'
import type { ButtonSize, ButtonVariant } from '../types'

export const buttonGroup: InjectionKey<{
  readonly size?: ButtonSize
  readonly variant?: ButtonVariant
  readonly disabled?: boolean
} | null> = Symbol('Syntrofic button group')
