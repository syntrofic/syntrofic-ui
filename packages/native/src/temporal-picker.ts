import type { NativePopoverOptions } from './popover-state'
import type { NativeSheetDetent } from './sheet-state'
import type { NativeHourFormat, NativeTimePeriod } from './time-state'
import type { NativeWheelMotion } from './wheel-state'

export type NativeTemporalOverlayOptions = Omit<NativePopoverOptions, 'presentation'> & {
  presentation?: NativePopoverOptions['presentation'] | 'dialog'
}
export type NativeTemporalColumn = 'date' | 'hour' | 'minute' | 'period'

export interface NativeTemporalPickerOptions {
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  requiredLabel?: string
  requiredMessage?: string
  invalidMessage?: string
  error?: string
  clearable?: boolean
  clearLabel?: string
  doneLabel?: string
  closeOnSelect?: boolean
  overlay?: NativeTemporalOverlayOptions
  detents?: readonly NativeSheetDetent[]
}

export interface NativeTimeWheelOptions {
  label?: string
  locale?: string
  hourFormat?: NativeHourFormat
  periodLabels?: Partial<Record<NativeTimePeriod, string>>
  dayLabel?: string
  hourLabel?: string
  minuteLabel?: string
  periodLabel?: string
  columnOrder?: readonly NativeTemporalColumn[]
  itemHeight?: number
  visibleCount?: number
  disabled?: boolean
  mask?: boolean
  motion?: NativeWheelMotion
}

export function nativeTemporalField(props: NativeTemporalPickerOptions) {
  return {
    label: props.label, description: props.description, required: props.required, requiredLabel: props.requiredLabel,
    disabled: props.disabled, readonly: props.readonly, clearable: props.clearable, clearLabel: props.clearLabel,
    overlay: props.overlay, detents: props.detents,
  }
}
