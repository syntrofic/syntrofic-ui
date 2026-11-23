import type { AccessibilityRole } from '@nativescript/core'

export type NativeButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type NativeButtonSize = 'sm' | 'md' | 'lg'

export interface NativeButtonOptions {
  label: string
  icon?: string
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
  accessibilityValue?: string
  variant?: NativeButtonVariant
  size?: NativeButtonSize
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  pressed?: boolean
  fullWidth?: boolean
}
