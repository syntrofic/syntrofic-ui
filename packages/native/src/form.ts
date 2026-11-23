import type { AccessibilityRole, CoreTypes } from '@nativescript/core'

export interface NativeInputOptions {
  placeholder?: string
  label?: string
  accessibilityRole?: AccessibilityRole
  hint?: string
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  secure?: boolean
  secureWithoutAutofill?: boolean
  keyboardType?: CoreTypes.KeyboardInputType
  returnKeyType?: CoreTypes.ReturnKeyButtonType
  autocapitalizationType?: CoreTypes.AutocapitalizationInputType
  autofillType?: CoreTypes.AutofillType
  autocorrect?: boolean
  maxLength?: number
  variant?: 'outline' | 'filled'
}

export interface NativeTextFieldOptions extends Omit<NativeInputOptions, 'hint'> {
  label: string
  description?: string
  error?: string
  required?: boolean
  requiredLabel?: string
  requiredMessage?: string
  validate?: (value: string) => string | undefined
}
