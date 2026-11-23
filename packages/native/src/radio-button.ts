import type { ComputedRef, InjectionKey } from 'nativescript-vue'
import type { NativeRadioOption } from './control-state'

export type NativeRadioButtonVariant = 'primary' | 'secondary'

export interface NativeRadioButtonOption extends NativeRadioOption {
  variant?: NativeRadioButtonVariant
}

export const nativeRadioButtonVariant: InjectionKey<ComputedRef<NativeRadioButtonVariant>> = Symbol('Native radio button variant')
