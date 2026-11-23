import type { FieldStatus } from './internal/status-icon'

export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonElevation = 'none' | 'low' | 'med' | 'high'
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
export type AnnotationTone = BadgeTone | 'info' | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'cyan' | 'blue' | 'purple' | 'pink' | 'gray'

export interface ChoiceFieldProps {
  label?: string
  description?: string
  status?: FieldStatus
  size?: 'sm' | 'md'
  width?: number | string
  hideLabel?: boolean
  labelPosition?: 'start' | 'end'
  labelSpacing?: 'hug' | 'spread'
  labelTooltip?: string
  loading?: boolean
  readOnly?: boolean
  required?: boolean
  optional?: boolean
  disabledMessage?: string
  changeAction?: (checked: boolean, event: Event, signal: AbortSignal) => void | PromiseLike<void>
}

export interface ChoiceGroupProps {
  name?: string
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  requiredMessage?: string
  orientation?: 'horizontal' | 'vertical'
}

export interface ChoiceListProps extends ChoiceGroupProps {
  status?: FieldStatus
  size?: ChoiceFieldProps['size']
  width?: ChoiceFieldProps['width']
  hideLabel?: boolean
  labelTooltip?: string
  readOnly?: boolean
  disabledMessage?: string
  density?: 'compact' | 'balanced' | 'spacious'
  dividers?: boolean
}

export interface MultipleChoiceListProps extends ChoiceListProps {
  changeAction?: (values: readonly string[], event: Event, signal: AbortSignal) => void | PromiseLike<void>
}

export interface ChoiceButtonOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface ChoiceButtonGroupProps extends ChoiceGroupProps {
  options: readonly ChoiceButtonOption[]
  layout?: 'wrap' | 'grid' | 'stack'
  appearance?: 'card' | 'pill'
  indicator?: boolean
  effect?: 'highlight' | 'ripple' | 'none'
}

export interface TabItem {
  value: string
  label: string
  icon?: string
  selectedIcon?: string
  disabled?: boolean
}

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
  group?: string
  description?: string
  icon?: string
  endLabel?: string
  avatar?: { src?: string; initials?: string }
}

export type TableKey = string | number
export type TableCell = string | number | Date | boolean | null | undefined
export type TableDensity = 'compact' | 'comfortable'
export type TableTextOverflow = 'wrap' | 'truncate'

export interface TableColumn<Row> {
  key: string
  label: string
  value: (row: Row) => TableCell
  filter?: string | import('./internal/table-filtering').TableFilterFieldRef
  compare?: (left: Row, right: Row) => number
  sortable?: boolean
  rowHeader?: boolean
  align?: 'start' | 'end'
  width?: string
  wrap?: boolean
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
}

export interface TableSort {
  key: string
  direction: 'ascending' | 'descending'
}

export interface TableVirtualOptions {
  height: number
  estimatedRowHeight?: number
  overscan?: number
  minWidth?: number
}

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  disabled?: boolean
  current?: boolean
  icon?: string
  target?: string
  actionable?: boolean
  menu?: readonly MenuEntry[]
}

export interface ToggleItem {
  value: string
  label: string
  icon?: string
  disabled?: boolean
  size?: ButtonSize
  elevation?: ButtonElevation
}

export interface AccordionItemData extends ToggleItem {
  description?: string
}

export interface ToolbarItem {
  id: string
  label?: string
  separator?: boolean
  disabled?: boolean
  variant?: ButtonVariant
}

export type MenuEntry =
  | { id: string; kind: 'separator' }
  | { id: string; kind: 'section'; label?: string; items: readonly MenuEntry[] }
  | { id: string; kind: 'submenu'; label: string; disabled?: boolean; items: readonly MenuEntry[] }
  | { id: string; kind: 'radio-group'; label?: string; items: readonly { id: string; label: string; disabled?: boolean }[] }
  | { id: string; kind: 'checkbox'; label: string; disabled?: boolean }
  | { id: string; kind?: 'command'; label: string; icon?: string; disabled?: boolean; tone?: 'neutral' | 'danger' }

export type TagItem = ToggleItem
