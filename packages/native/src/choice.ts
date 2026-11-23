import type { InjectionKey } from 'nativescript-vue'
import type { NativeRadioValue } from './control-state'

export interface NativeChoiceOptions {
  label: string
  description?: string
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  error?: string
  indicatorPlacement?: 'start' | 'end'
  hideLabel?: boolean
}

export const nativeRadioGroup: InjectionKey<{
  selected: () => NativeRadioValue | undefined
  select: (value: NativeRadioValue) => void
  disabled: () => boolean
  readonly: () => boolean
  invalid: () => boolean
}> = Symbol('Native radio group')
