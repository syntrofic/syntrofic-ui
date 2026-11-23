import type { NativeCalendarOptions } from './calendar-state'
import type { NativePopoverOptions } from './popover-state'
import type { NativeSheetDetent } from './sheet-state'

export interface NativeDatePickerOptions extends NativeCalendarOptions {
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
  required?: boolean
  requiredLabel?: string
  requiredMessage?: string
  error?: string
  closeOnSelect?: boolean
  calendarLabel?: string
  doneLabel?: string
  clearable?: boolean
  clearLabel?: string
  overlay?: NativePopoverOptions
  detents?: readonly NativeSheetDetent[]
}

export function nativePopupCalendar(props: NativeDatePickerOptions): NativeCalendarOptions {
  return {
    label: props.calendarLabel, locale: props.locale, weekStartsOn: props.weekStartsOn, fixedWeeks: props.fixedWeeks,
    defaultMonth: props.defaultMonth, readonly: props.readonly, minDate: props.minDate, maxDate: props.maxDate,
    isDateDisabled: props.isDateDisabled, isDateUnavailable: props.isDateUnavailable,
    selectOutsideMonth: props.selectOutsideMonth, showOutsideMonth: props.showOutsideMonth, yearPicker: props.yearPicker,
    previousMonthLabel: props.previousMonthLabel, nextMonthLabel: props.nextMonthLabel,
    yearPickerLabel: props.yearPickerLabel, closeYearPickerLabel: props.closeYearPickerLabel,
  }
}
