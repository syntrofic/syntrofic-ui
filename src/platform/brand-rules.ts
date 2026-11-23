import { readColor } from '../internal/color'
import { resolveTone } from '../internal/theme-color'
import type { BrandMode, BrandTheme } from './theme-workspace'

type ValueKind = 'color' | 'paint' | 'image' | 'size' | 'length' | 'space' | 'border' | 'border-style' | 'shadow' | 'font' | 'weight' | 'number' | 'line-height' | 'text-transform' | 'button-style' | 'hide' | 'type-size' | 'align'
const paint = { background: 'paint', 'background-color': 'color', 'background-image': 'image', color: 'color', 'border-color': 'color' } as const
const box = { ...paint, 'border-radius': 'size', border: 'border', 'border-width': 'size', 'border-style': 'border-style', 'box-shadow': 'shadow',
  height: 'size', 'min-height': 'size', padding: 'space', 'padding-block': 'space', 'padding-inline': 'space',
  'padding-block-start': 'size', 'padding-block-end': 'size', 'padding-inline-start': 'size', 'padding-inline-end': 'size',
  'padding-top': 'size', 'padding-right': 'size', 'padding-bottom': 'size', 'padding-left': 'size' } as const
const type = { color: 'color', 'font-family': 'font', 'font-weight': 'weight', 'font-size': 'size', 'letter-spacing': 'size', 'line-height': 'line-height' } as const
const textSize = { 'font-size': 'size' } as const
const controlStates = {
  hover: ':hover:not(:disabled, [aria-disabled="true"], [data-disabled])',
  active: ':is(:active, [data-sy-press="held"]):not(:disabled, [aria-disabled="true"], [data-disabled])',
  'focus-visible': ':focus-visible',
  disabled: ':is(:disabled, [aria-disabled="true"], [data-disabled])',
}
const childControlStates = (selector: string) => Object.fromEntries(Object.entries(controlStates).map(([name, state]) =>
  [name, `:where(${selector}${state} *)`]))
const combinedStates = (persistent: readonly string[], interaction: readonly string[]) =>
  persistent.flatMap(state => interaction.map(other => [state, ...other.split('+')].sort().join('+')))
const toggleGestureCombinations = ['active+focus-visible', 'active+hover', 'active+focus-visible+hover', 'focus-visible+hover']
const toggleStates = { ...controlStates, disabled: ':disabled', loading: '[aria-busy="true"]',
  pressed: '[aria-pressed="true"]', unpressed: '[aria-pressed="false"]', grouped: '[data-sy-toggle-member]' }
const toggleInteractions = ['active', 'disabled', 'focus-visible', 'hover', 'loading', ...toggleGestureCombinations]
const togglePressCombinations = combinedStates(['pressed', 'unpressed'], toggleInteractions)
const selectIndicatorState = (expanded: boolean) => `:where(.sy-select__control[aria-expanded="${expanded}"] > *)`
const dialogCloseIcon = ':is(.sy-dialog__close-icon, .sy-dialog-hero__close .sy-close-button__icon)'
const dialogCloseControl = ':is(.sy-dialog__close, .sy-dialog-hero__close .sy-close-button, .sy-dialog-hero__close.sy-close-button)'
const fieldStates = { ...controlStates, invalid: ':is([aria-invalid="true"], [data-invalid])', loading: '[aria-busy="true"]' }
const containerStates = { hover: ':hover', 'focus-visible': ':focus-visible' }
const selectionStates = { ...controlStates, selected: ':is([aria-selected="true"], [aria-checked="true"], [data-state="checked"], [data-state="active"], [data-selected])' }
const optionStates = { ...selectionStates, highlighted: '[data-highlighted]:not([aria-disabled="true"], [data-disabled])' }
const optionText = { label: '--sy-option-label-color', description: '--sy-option-description-color' } as const
const fieldKinds = ['text', 'search', 'email', 'password', 'tel', 'url', 'number'] as const
const buttonVariants = ['primary', 'secondary', 'ghost', 'danger']
const controlSizes = ['sm', 'md', 'lg'] as const
const fieldSizes = { size: { attribute: 'data-size', values: controlSizes } }
const selectSize = { values: controlSizes, selector: (size: string) => `:where(.sy-select__control[data-size="${size}"] > *)` }
const paginationVariants = ['pages', 'compact', 'count', 'dots', 'input', 'none'] as const
const paginationSelector = '.sy-pagination'
const paginationListSelector = '.sy-pagination__controls'
const paginationCorners = { 'border-top-left-radius': 'size', 'border-top-right-radius': 'size',
  'border-bottom-left-radius': 'size', 'border-bottom-right-radius': 'size' } as const
const paginationSides = ['top', 'right', 'bottom', 'left'] as const
const paginationBox = { ...box, ...paginationCorners, 'border-top': 'border', 'border-right': 'border',
  'border-bottom': 'border', 'border-left': 'border' } as const
const paginationAxis = (axis: string, values: readonly string[]) => ({ values,
  selector: (value: string) => `:where(${paginationSelector}[data-${axis}="${value}"] *)` })
const tabListAxis = (axis: string, values: readonly string[]) => ({ values,
  selector: (value: string) => `:where(.sy-tabs__list[data-${axis}="${value}"] *)` })
const progressBar = '.sy-measure[role="progressbar"]'
const progressTrack = `${progressBar} > .sy-measure__track`
const progressFill = `${progressTrack} > .sy-measure__fill`
const progressSweep = `${progressTrack} > .sy-measure__sweep > span`
const progressAxis = (axis: string, values: readonly string[]) => ({ values,
  selector: (value: string) => `:where(${progressBar}[data-${axis}="${value}"] *)` })
const progressTones = ['accent', 'success', 'warning', 'danger', 'neutral'] as const
const progressSizes = { size: progressAxis('size', controlSizes), tone: progressAxis('tone', progressTones) }
const surfacePaint = { background: 'paint', 'background-color': 'color', 'background-image': 'image', 'border-radius': 'size' } as const
const rangeCalendar = '.sy-calendar[data-sy-calendar-selection="range"]'
const rangeEdges = ':is([data-selection-start], [data-selection-end])'
const calendarRangeStates = {
  'in-range': `:where(${rangeCalendar} *)[data-selected]:not(${rangeEdges})`,
  'range-start': '[data-selection-start]', 'range-end': '[data-selection-end]',
  highlighted: '[data-highlighted]:not([data-selected])',
}
const fullControl = (property: string) => ({ property, sizes: controlSizes })
const mediumControl = (property: string) => ({ property, sizes: ['md'] as const })
export const brandControlHeightParts = Object.freeze({
  button: fullControl('--sy-button-height'),
  'button-primary': fullControl('--sy-button-height'),
  'button-secondary': fullControl('--sy-button-height'),
  'button-ghost': fullControl('--sy-button-height'),
  'button-danger': fullControl('--sy-button-height'),
  input: fullControl('--sy-input-height'),
  'input-group': fullControl('--sy-input-group-height'),
  select: fullControl('--sy-select-control-height'),
  'date-input': mediumControl('--sy-date-control-height'),
  'number-input': fullControl('--sy-number-field-height'),
  typeahead: mediumControl('--sy-typeahead-height'),
  combobox: mediumControl('--sy-combo-height'),
  'file-input': mediumControl('--sy-file-field-height'),
})
const choiceSizes = { size: { attribute: 'data-size', values: ['sm', 'md'] } }
const checkboxChecked = ':where(.sy-choice__input:checked:not(:indeterminate) + *)'
const checkboxMixed = ':where(.sy-choice__input:indeterminate + *)'
const switchVisualState = (checked: boolean) => `:where(.sy-choice__input:${checked ? 'checked' : 'not(:checked)'} + .sy-switch__track:not([data-preview="${!checked}"]) *, .sy-switch__track[data-preview="${checked}"] *)`
const switchThumbSize = { size: { values: choiceSizes.size.values, selector: (value: string) => `:where(.sy-choice[data-size="${value}"] *)` } }
const elevation = { attribute: 'data-elevation', values: ['none', 'low', 'med', 'high'] }
const badgeTones = ['neutral', 'accent', 'success', 'warning', 'danger', 'info', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'gray']
const bannerTones = ['info', 'success', 'warning', 'danger']
const bannerVariants = {
  tone: { values: bannerTones, selector: (value: string) => `:where(.sy-banner[data-tone="${value}"] *)` },
  variant: { values: ['card', 'section'], selector: (value: string) => `:where(.sy-banner[data-variant="${value}"] *)` },
}
const toastTones = ['neutral', 'success', 'warning', 'danger', 'loading']
const cardVariants = ['default', 'transparent', 'muted', 'blue', 'cyan', 'gray', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow']
const tableRow = '.sy-table__grid > tbody > tr[data-sy-row-parity]'
const tableCell = { ...type, ...paint, 'text-transform': 'text-transform', padding: 'space', 'padding-inline': 'space', 'padding-block': 'space' } as const
const tableRowStates = { hover: ':hover', selected: '[data-selected]', striped: '[data-stripe]' }
const menuSurfaceParts = ['dropdown-menu', 'context-menu', 'selector-popup', 'multi-selector-popup', 'typeahead-dropdown'] as const
const menuSurfaceColors = ['canvas', 'surface', 'surface-muted', 'text', 'text-muted']
const menuSurfaceProperties = { ...box, ...type } as const
const menuSurfaceTokens = { '--sy-radius-md': ['border-radius'] }
const menuDivider = ':is(.sy-menu, .sy-menu-sheet) .sy-separator[data-orientation="horizontal"]:not([data-labelled])'
const contextMenuPanels = ':is(.sy-context-menu__panel, .sy-context-menu__sheet)'
const separatorVariant = { attribute: 'data-tone', values: ['subtle', 'strong'] as const }
const separatorColors = { '--sy-border': ['background-color'], '--sy-border-strong': ['background-color'] } as const
const openSurface = { open: '[data-state="open"]' }
const brandInputFocusHosts = Object.freeze({
  input: 'input.sy-field__control:not(:where(.sy-input-group *, .sy-combo > *))',
  textarea: ':is(textarea.sy-field__control:not(:where(.sy-input-group *, .sy-field__status-control[data-footer] > *)), .sy-field__status-control[data-footer]:has(> .sy-textarea))',
  select: '.sy-select__control', 'input-group': '.sy-input-group',
  'date-input': '.sy-date-control', 'number-input': '.sy-stepped-field',
  typeahead: '.sy-base-typeahead__input', combobox: '.sy-combo', 'complex-selector': '.sy-complex-select__trigger',
})
const invalidFocusHost = ':is([aria-invalid="true"], [data-invalid]:not([data-invalid="false"]), .sy-field[data-invalid="true"] *, :has([aria-invalid="true"]))'
function inputFocusStatus(status: string) {
  if (status === 'error') return invalidFocusHost
  const statusHost = (kind: string) => `:where(.sy-field[data-field-status="${kind}"] *, [data-field-status="${kind}"])`
  if (status === 'default') return `:not(${invalidFocusHost}, ${statusHost('warning')}, ${statusHost('success')}, ${statusHost('info')})`
  return `${statusHost(status)}:not(${invalidFocusHost})`
}
const selectorPanel = (multiple: boolean) => {
  const selection = multiple ? 'multiple' : 'single'
  return `:is(.sy-select__popup${multiple ? '[data-multiple]' : ':not([data-multiple])'}, .sy-popover:has(> .sy-select-choices[data-menu-selection="${selection}"]), .sy-select-sheet--${selection})`
}
const selectPresentation = { values: ['dropdown', 'popover', 'sheet'], selector: (variant: string) =>
  variant === 'dropdown' ? '.sy-select__popup' : variant === 'popover' ? '.sy-popover' : '.sy-select-sheet' }
const layoutHeader = '.sy-layout__header:not(:has(> .sy-layout__region-body > .sy-layout-header))'
const headerRoutes = [
  { part: 'app-shell-header', bar: '.sy-app-layout__navbar', frame: '' },
  { part: 'layout-header', bar: layoutHeader, frame: '.sy-layout__region-body' },
  { part: 'layout-header', bar: '.sy-layout-header:not([data-scrollable])', frame: '' },
  { part: 'layout-header', bar: '.sy-layout-header[data-scrollable]', frame: '.sy-layout__region-content' },
] as const
const headerParts = ['app-shell-header', 'layout-header'] as const
const navigationStateMotion = /^(?:height|min-height|padding(?:-.+)?|font-size|line-height|letter-spacing|border-width)$/
const buttonColors: Readonly<Record<string, readonly string[]>> = {
  primary: ['accent', 'accent-on', 'accent-hover', 'accent-text', 'accent-soft', 'focus', 'text'],
  secondary: ['surface-muted', 'border', 'text', 'focus'],
  ghost: ['text', 'surface-muted', 'focus'],
  danger: ['danger', 'danger-on', 'danger-hover', 'focus', 'text'],
}
const fieldColors = ['control', 'text', 'text-muted', 'focus', 'danger']
const optionColors = ['text', 'text-muted', 'accent-text', 'accent-soft']
const choiceColors = ['control', 'accent', 'accent-on', 'text', 'text-muted', 'border-strong', 'focus']
const surfaceColors = ['surface', 'text', 'border', 'border-strong']
const dropColors = ['canvas', 'surface-muted', 'text', 'text-muted', 'border', 'border-strong', 'focus', 'accent', 'accent-soft', 'accent-text', 'danger']
const localColors: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(menuSurfaceParts.map(part => [part, menuSurfaceColors])),
  field: [...fieldColors, 'field-placeholder-color'], input: [...fieldColors, 'surface-muted', 'field-placeholder-color'],
  textarea: [...fieldColors, 'surface-muted', 'field-placeholder-color'],
  select: [...fieldColors, 'surface-muted'], 'date-input': fieldColors, 'number-input': fieldColors,
  'input-group': [...fieldColors, 'input-group-prefix-color'], typeahead: fieldColors, combobox: [...fieldColors, 'surface', 'border-strong', 'surface-muted'],
  tokenizer: [...fieldColors, 'surface', 'border-strong', 'surface-muted'], 'complex-selector': fieldColors,
  'file-input': dropColors, 'drop-zone': dropColors,
  checkbox: [...choiceColors, 'danger'], radio: [...choiceColors, 'surface', 'danger'], switch: [...choiceColors, 'surface-muted', 'danger'],
  card: [...surfaceColors, 'control', 'surface-subtle', 'surface-muted', 'surface-blue', 'surface-sage', 'surface-clay', 'surface-lavender', 'accent-soft', 'warning-soft', 'danger-soft'],
  dialog: [...surfaceColors, 'text-muted'], 'dialog-header': ['text', 'text-muted'],
  popover: ['canvas', 'text'], tooltip: ['text', 'canvas'],
  lightbox: ['lightbox-caption-color', 'text-muted'],
  'lightbox-caption-panel': ['lightbox-caption-panel-color', 'text', 'canvas'],
  toast: ['toast-surface', 'toast-text', 'surface-muted', 'surface-blue', 'text', 'success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft'],
  banner: ['banner-bg', 'banner-ink', 'surface-blue', 'text', 'success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft'],
  badge: ['canvas', 'surface-muted', 'text-muted', 'accent', 'accent-on', 'accent-soft', 'accent-text', 'success', 'success-soft',
    'warning', 'warning-soft', 'danger', 'danger-on', 'danger-soft', 'info', 'info-soft'],
  'menu-item': [...optionColors, 'surface-muted', 'danger', 'danger-soft'], 'selector-option-row': optionColors,
  'typeahead-option': optionColors, 'combobox-option': optionColors, 'listbox-option': optionColors,
  tab: ['text', 'surface-muted', 'accent', 'accent-text', 'accent-soft', 'focus'],
  'tab-indicator': ['accent-soft', 'accent-text'],
  'table-row': ['text', 'accent-soft', 'surface-subtle', 'surface-muted', 'border'],
  'table-header-cell': ['text', 'text-muted', 'accent-text', 'surface-muted'], 'table-cell': ['text', 'text-muted', 'surface-subtle'],
  'app-shell-header': ['canvas', 'surface-muted', 'text'], 'layout-header': ['canvas', 'surface-muted', 'text'], 'top-nav': ['surface-muted', 'surface-sage', 'text'],
  'resize-handle': ['border', 'accent-soft', 'focus'], 'resize-handle-pill': ['border-strong', 'focus'],
  'top-nav-item': ['text', 'surface-muted', 'accent-text', 'accent-soft', 'focus'],
  'side-nav-item': ['text', 'text-muted', 'accent-text', 'accent-soft', 'focus'],
  body: ['text', 'text-muted'], code: ['text', 'surface-muted'], heading: ['text'],
}
export const brandFontRoleTokens = Object.freeze({ body: '--sy-font-body', heading: '--sy-font-heading', code: '--sy-font-code' } as const)
export const brandShadowTokens = ['--sy-shadow-low', '--sy-shadow-med', '--sy-shadow-high'] as const
export const brandFieldHoverRingToken = '--sy-field-hover-ring-color'
const elevationTokens = Object.fromEntries(brandShadowTokens.map(token => [token, ['box-shadow']]))

const displayHeadingTypes = ['display-1', 'display-2', 'display-3'] as const
const displayHeadingTokens = Object.fromEntries(displayHeadingTypes.map(role => [`--sy-${role}-size`, ['font-size'] as const]))

export const brandTypedTokens: Readonly<Record<string, ValueKind>> = Object.freeze({
  '--sy-font': 'font', '--sy-font-size': 'size', '--sy-border-width': 'length', '--sy-shadow': 'shadow',
  ...Object.fromEntries(brandShadowTokens.map(token => [token, 'shadow' as const])),
  ...Object.fromEntries(Object.values(brandFontRoleTokens).map(token => [token, 'font' as const])),
  '--sy-radius-sm': 'size', '--sy-radius-md': 'size', '--sy-radius-lg': 'size', '--sy-radius-pill': 'size',
  '--sy-motion-tempo': 'number',
  '--sy-control-height-sm': 'length', '--sy-control-height-md': 'length', '--sy-control-height-lg': 'length',
  ...Object.fromEntries(Object.keys(displayHeadingTokens).map(token => [token, 'type-size' as const])),
  ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => ['--sy-space-' + (index + 1), 'size'])),
})

type Axis = { values: readonly string[] } & ({ attribute: string } | { selector: (value: string) => string })
type ThemeRole = 'button-like' | 'overlays' | 'option-rows' | 'selected-items' | 'accent-fills' | 'inset-fields' | 'status-surfaces' | 'overlay-headers'
interface Target {
  selector: string
  properties: Readonly<Record<string, ValueKind>>
  components: readonly string[]
  states?: Readonly<Record<string, string>>
  combinations?: readonly string[]
  stateAliases?: Readonly<Record<string, string>>
  variants?: Readonly<Record<string, Axis>>
  textSize?: { token: string; child?: string }
  optionText?: typeof optionText
  tokenProperties?: Readonly<Record<string, readonly string[]>>
  roles?: Partial<Record<ThemeRole, true | { state?: string; when?: Readonly<Record<string, string>> }>>
  family: string
}

const topNavTitle = 'sy-navbar__brand-title'
const sideNavTitle = 'sy-side-nav-heading__title'
const topNavTextSize = { token: '--sy-top-nav-title-size' }
const sideNavTextSize = { token: '--sy-side-nav-title-size' }
const tabTextSize = { token: '--sy-tab-label-size' }
const smallCorners = { '--sy-radius-sm': ['border-radius'] } as const
const mediumCorners = { '--sy-radius-md': ['border-radius'] } as const
const pillCorners = { '--sy-radius-pill': ['border-radius'] } as const
const fontToken = { '--sy-font': ['font-family'] } as const
const borderToken = { '--sy-border-width': ['border-width'] } as const
const fieldTokens = { ...mediumCorners, ...borderToken, '--sy-space-3': ['padding-inline'] } as const
const buttonTokens = {
  ...pillCorners, ...fontToken, ...borderToken, ...elevationTokens, '--sy-font-size': ['font-size'],
  '--sy-space-3': ['padding-inline'], '--sy-space-4': ['padding-inline'], '--sy-space-5': ['padding-inline'],
} as const
const buttonProperties = { ...box, ...type, 'button-style': 'button-style' } as const

export const brandRuleTargets = {
  button: { roles: { 'button-like': true, 'accent-fills': { when: { variant: 'primary' } } }, selector: '.sy-button', properties: buttonProperties, tokenProperties: buttonTokens, components: ['SButton'], states: { ...controlStates, loading: '[data-loading]' },
    variants: { variant: { attribute: 'data-variant', values: buttonVariants }, ...fieldSizes, elevation }, family: 'actions' },
  'toggle-button': {
    roles: { 'button-like': true, 'selected-items': { state: 'pressed' } },
    selector: '.sy-toggle', properties: { ...surfacePaint, ...type, 'box-shadow': 'shadow' }, components: ['SToggleButton', 'SToggleButtonGroup'],
    family: 'actions', states: toggleStates,
    stateAliases: { 'aria-pressed': 'pressed', isPressed: 'pressed' },
    combinations: [...toggleGestureCombinations, ...togglePressCombinations,
      ...combinedStates(['grouped'], ['pressed', 'unpressed', ...toggleInteractions, ...togglePressCombinations])],
    variants: { tone: { values: ['accent', 'info', 'warning', 'danger'],
      selector: value => value === 'accent' ? ':is([data-pressed-tone="accent"], :not([data-pressed-tone]))' : `[data-pressed-tone="${value}"]` } },
  },
  'toggle-button-group': { selector: '.sy-toggle-group', properties: { ...box, gap: 'size' }, components: ['SToggleButtonGroup'],
    states: { ...containerStates, 'focus-visible': ':has(:focus-visible)', disabled: '[data-disabled]' },
    tokenProperties: { '--sy-space-1': ['gap'] },
    variants: { orientation: { attribute: 'data-orientation', values: ['horizontal', 'vertical'] }, ...fieldSizes }, family: 'actions' },
  'button-group': { selector: '.sy-button-group', properties: box, components: ['SButtonGroup'], states: containerStates,
    tokenProperties: { ...mediumCorners, ...elevationTokens, '--sy-space-1': ['padding'] },
    variants: { orientation: { attribute: 'data-orientation', values: ['horizontal', 'vertical'] }, elevation }, family: 'actions' },
  'button-primary': { selector: '.sy-button[data-variant="primary"]', properties: buttonProperties, tokenProperties: buttonTokens, components: ['SButton'], variants: fieldSizes, states: controlStates, family: 'actions' },
  'button-secondary': { selector: '.sy-button[data-variant="secondary"]', properties: buttonProperties, tokenProperties: buttonTokens, components: ['SButton'], variants: fieldSizes, states: controlStates, family: 'actions' },
  'button-ghost': { selector: '.sy-button[data-variant="ghost"]', properties: buttonProperties, tokenProperties: buttonTokens, components: ['SButton'], variants: fieldSizes, states: controlStates, family: 'actions' },
  'button-danger': { selector: '.sy-button[data-variant="danger"]', properties: buttonProperties, tokenProperties: buttonTokens, components: ['SButton'], variants: fieldSizes, states: controlStates, family: 'actions' },
  'code-block-copy-button': { selector: '.sy-code-block__copy', properties: { ...surfacePaint, ...type, display: 'hide' },
    components: ['SCodeBlock'], family: 'data' },
  field: { roles: { 'inset-fields': true }, selector: ':is(.sy-field__control, .sy-date-control, .sy-stepped-field, .sy-select__control)', properties: box,
    tokenProperties: { ...fieldTokens, ...pillCorners },
    components: ['SInput', 'STextField', 'STextArea', 'SSelect', 'SDatePicker', 'SNumberField'],
    states: { ...fieldStates, 'focus-visible': ':is(:focus-visible, :has(:focus-visible))' }, family: 'inputs' },
  'input-focus-ring': { selector: `:is(${Object.values(brandInputFocusHosts).join(', ')})`,
    properties: { 'outline-color': 'color', 'outline-width': 'length', 'outline-style': 'border-style' },
    components: ['SInput', 'STextArea', 'SSelect', 'SInputGroup', 'SDateField', 'SNumberField', 'SBaseTypeahead', 'SComboBox', 'SComplexSelector'],
    states: { 'focus-visible': ':is(:focus-visible, :has(:focus-visible))' }, family: 'inputs',
    variants: { kind: { values: Object.keys(brandInputFocusHosts), selector: value => `:where(${brandInputFocusHosts[value as keyof typeof brandInputFocusHosts]})` },
      status: { values: ['default', 'error', 'warning', 'success', 'info'], selector: inputFocusStatus } },
  },
  input: { selector: 'input.sy-field__control', properties: box, tokenProperties: fieldTokens, components: ['SInput', 'STextField'], states: fieldStates,
    variants: { type: { attribute: 'type', values: fieldKinds }, ...fieldSizes }, family: 'inputs' },
  'input-group': { roles: { 'inset-fields': true }, selector: '.sy-input-group', properties: box, tokenProperties: { ...pillCorners, ...borderToken }, components: ['SInputGroup'], variants: fieldSizes,
    states: { ...fieldStates, 'focus-visible': ':has(:focus-visible)' }, family: 'inputs' },
  textarea: { selector: 'textarea.sy-field__control', properties: box, tokenProperties: fieldTokens, components: ['STextArea'], states: fieldStates, variants: fieldSizes, family: 'inputs' },
  select: { selector: '.sy-select__control', properties: box, tokenProperties: fieldTokens, components: ['SSelect'], variants: { ...fieldSizes,
    variant: { values: ['input', 'ghost'], selector: variant => `:where(.sy-select[data-variant="${variant}"] > *)` } },
    states: { ...fieldStates, open: '[aria-expanded="true"]' }, family: 'inputs' },
  'selector-indicator-icon': { selector: '.sy-select__control > .sy-select__arrow', properties: { color: 'color' },
    components: ['SSelect', 'SInlineSelect'], family: 'inputs',
    variants: { size: selectSize, variant: { values: ['input', 'ghost'], selector: value => `:where(.sy-select[data-variant="${value}"] *)` } },
    states: { ...childControlStates('.sy-select__control'), expanded: selectIndicatorState(true), collapsed: selectIndicatorState(false) } },
  'selector-option-row': { roles: { 'option-rows': true, 'selected-items': { state: 'selected' } }, selector: '.sy-select__option', properties: box, components: ['SSelect'],
    states: optionStates, optionText, family: 'inputs' },
  'complex-selector': { roles: { 'inset-fields': true }, selector: '.sy-complex-select__trigger', properties: box, tokenProperties: { ...smallCorners, ...borderToken }, components: ['SComplexSelector'],
    states: { ...fieldStates, open: '[aria-expanded="true"]' }, family: 'inputs' },
  typeahead: { roles: { 'inset-fields': true }, selector: '.sy-base-typeahead__input', properties: box, tokenProperties: smallCorners, components: ['SBaseTypeahead'], states: fieldStates, family: 'inputs' },
  'typeahead-option': { roles: { 'option-rows': true }, selector: '.sy-base-typeahead__options > .sy-collection__option', properties: box, components: ['SBaseTypeahead'],
    states: optionStates, optionText, family: 'inputs' },
  combobox: { roles: { 'inset-fields': true }, selector: '.sy-combo', properties: box, tokenProperties: { ...mediumCorners, ...borderToken }, components: ['SAutocomplete', 'SComboBox', 'STokenizer'],
    states: { ...fieldStates, 'focus-visible': ':has(:focus-visible)' }, family: 'inputs' },
  'combobox-option': { roles: { 'option-rows': true, 'selected-items': { state: 'selected' } }, selector: '.sy-candidates .sy-collection__option', properties: box, components: ['SAutocomplete', 'SComboBox', 'STokenizer'],
    states: optionStates, optionText, family: 'inputs' },
  'listbox-option': { roles: { 'option-rows': true, 'selected-items': { state: 'selected' } }, selector: '.sy-listbox .sy-collection__option', properties: box, components: ['SListBox', 'SListBoxItem'],
    states: optionStates, optionText, family: 'selection' },
  tokenizer: { selector: '.sy-tokenizer .sy-combo', properties: box, tokenProperties: { ...mediumCorners, ...borderToken }, components: ['STokenizer'],
    states: { ...fieldStates, 'focus-visible': ':has(:focus-visible)' }, family: 'inputs' },
  'file-input': { roles: { 'inset-fields': { when: { mode: 'field' } } }, selector: '.sy-file-input > .sy-drop-zone__area', properties: box, tokenProperties: borderToken, components: ['SFileInput'],
    variants: { mode: { values: ['field', 'dropzone'], selector: mode => `:where(.sy-file-input[data-mode="${mode}"] > *)` } },
    states: { ...fieldStates, dragging: '[data-dragging]' }, family: 'inputs' },
  'drop-zone': { selector: '.sy-drop-zone:not(.sy-file-input) > .sy-drop-zone__area', properties: box, tokenProperties: borderToken, components: ['SDropZone'],
    states: { ...fieldStates, dragging: '[data-dragging]' }, family: 'inputs' },
  'date-input': { selector: '.sy-date-control', properties: box, tokenProperties: { ...pillCorners, ...borderToken }, components: ['SDateField', 'SDatePicker', 'SDateRangePicker', 'SDateTimeInput', 'STimeField'],
    states: { ...controlStates, invalid: ':is([data-invalid], [aria-invalid="true"], :has([aria-invalid="true"]))', 'focus-visible': ':has(:focus-visible)' }, family: 'inputs' },
  'number-input': { selector: '.sy-stepped-field', properties: box, tokenProperties: { ...pillCorners, ...borderToken }, components: ['SNumberField'], variants: fieldSizes,
    states: { ...controlStates, disabled: ':is([data-disabled], [data-semantic-disabled])', invalid: ':has([aria-invalid="true"])',
      'focus-visible': ':has(:focus-visible)' }, family: 'inputs' },
  card: { selector: '.sy-card', properties: { ...box, ...type },
    tokenProperties: { ...fontToken, ...elevationTokens, '--sy-border-width': ['border-width', 'outline-width'], '--sy-radius-lg': ['border-radius'], '--sy-shadow': ['box-shadow'] },
    components: ['SCard'], states: containerStates,
    variants: { variant: { attribute: 'data-variant', values: cardVariants }, elevation }, family: 'containers' },
  dialog: { roles: { overlays: true }, selector: '.sy-dialog__panel', properties: { ...box, gap: 'size' }, tokenProperties: { '--sy-space-2': ['gap'], '--sy-shadow-high': ['box-shadow'] },
    components: ['SDialog', 'SAlertDialog'], states: { open: ':where(.sy-dialog[data-visible] *)' }, family: 'overlays' },
  'dialog-header': { roles: { 'overlay-headers': true }, selector: '.sy-dialog__header', properties: box, components: ['SDialog', 'SAlertDialog'], family: 'overlays' },
  'dialog-header-title-block': {
    selector: ':is(.sy-dialog__header, .sy-dialog-hero__heading) > .sy-dialog__title',
    properties: type, components: ['SDialog', 'SAlertDialog', 'SDialogHeroHeader'], family: 'overlays',
    variants: { variant: { values: ['header', 'hero'],
      selector: value => `:where(${value === 'header' ? '.sy-dialog__header' : '.sy-dialog-hero__heading'} > *)` } },
  },
  'dialog-header-close-icon': { selector: dialogCloseIcon, properties: { color: 'color' }, family: 'overlays',
    components: ['SDialog', 'SDialogHeroHeader'],
    variants: { variant: { values: ['header', 'hero'], selector: value => value === 'header' ? '.sy-dialog__close-icon' : '.sy-close-button__icon' } },
    states: childControlStates(dialogCloseControl) },
  lightbox: { selector: '.sy-lightbox__caption', properties: { ...paint, ...type }, components: ['SLightbox'], family: 'overlays',
    tokenProperties: { '--sy-lightbox-caption-color': ['color'] } },
  'lightbox-caption-panel': { selector: '.sy-lightbox__caption-panel', properties: { ...box, ...type },
    tokenProperties: { '--sy-lightbox-caption-panel-color': ['color'], ...mediumCorners }, components: ['SLightbox'], family: 'overlays' },
  badge: { selector: '.sy-badge', properties: { ...box, 'font-family': 'font' },
    tokenProperties: { ...fontToken, '--sy-border-width': ['box-shadow'] }, components: ['SBadge'], states: containerStates,
    variants: { tone: { attribute: 'data-tone', values: badgeTones } }, family: 'feedback' },
  toast: { roles: { 'status-surfaces': true }, selector: '.sy-toast', properties: { ...box, ...type }, components: ['SToast'], family: 'overlays',
    tokenProperties: { ...mediumCorners, '--sy-toast-surface': ['background-color'], '--sy-toast-text': ['color'] },
    variants: { tone: { attribute: 'data-tone', values: toastTones } }, states: { open: '[data-state="open"]' } },
  'toast-close': { selector: '.sy-toast > .sy-toast__close', components: ['SToast'], family: 'overlays', states: controlStates,
    properties: { color: 'color', 'background-color': 'color', 'border-radius': 'size', 'box-shadow': 'shadow' },
    variants: { tone: { values: toastTones, selector: value => `:where(.sy-toast[data-tone="${value}"] > *)` } } },
  banner: { roles: { 'status-surfaces': true }, selector: '.sy-banner__header', properties: { ...paint, padding: 'space', 'padding-inline': 'space', 'padding-block': 'space' },
    components: ['SBanner'], family: 'feedback', tokenProperties: { '--sy-banner-bg': ['background-color'], '--sy-banner-ink': ['color'], '--sy-space-3': ['padding'] },
    variants: bannerVariants },
  'banner-icon': { selector: '.sy-banner__icon', properties: { ...surfacePaint, color: 'color', display: 'hide' },
    components: ['SBanner'], family: 'feedback', variants: bannerVariants },
  tooltip: { roles: { overlays: true }, selector: '.sy-tooltip', properties: box, tokenProperties: smallCorners, components: ['STooltip'], states: { open: ':is([data-state="instant-open"], [data-state="delayed-open"])' }, family: 'overlays' },
  popover: { roles: { overlays: true }, selector: '.sy-popover:not([data-bare])', properties: { ...box, 'font-family': 'font' }, tokenProperties: { ...mediumCorners, ...fontToken }, components: ['SPopover'], states: { open: '[data-state="open"]' }, family: 'overlays' },
  'dropdown-menu': { roles: { overlays: true }, selector: '.sy-menu:not(.sy-context-menu__panel)', properties: menuSurfaceProperties, tokenProperties: menuSurfaceTokens,
    components: ['SMenu', 'SMenuSubmenu'], states: openSurface, family: 'overlays',
    variants: { variant: { values: ['root', 'submenu'], attribute: 'data-menu-variant' } } },
  'dropdown-menu-divider': {
    selector: menuDivider, properties: { 'background-color': 'color', height: 'length' }, family: 'overlays',
    tokenProperties: { ...separatorColors, '--sy-border-width': ['height'] },
    components: ['SDropdown', 'SMenu', 'SMenuSubmenu', 'SContextMenu', 'SSeparator'],
    variants: { variant: separatorVariant,
      context: { values: ['dropdown', 'context'], selector: value => value === 'context'
        ? `:where(${contextMenuPanels} *)` : `:not(:where(${contextMenuPanels} *))` },
      presentation: { values: ['popover', 'sheet'], selector: value => value === 'sheet'
        ? ':where(.sy-menu-sheet *)' : ':not(:where(.sy-menu-sheet *))' },
    },
  },
  'context-menu': { roles: { overlays: true }, selector: ':is(.sy-context-menu__panel, .sy-menu-sheet)', properties: menuSurfaceProperties,
    components: ['SContextMenu', 'SMenuSubmenu'], states: openSurface, family: 'overlays',
    variants: { variant: { values: ['popover', 'submenu', 'sheet'], selector: variant =>
      variant === 'sheet' ? '.sy-menu-sheet' : `[data-menu-variant="${variant}"]` } } },
  'selector-popup': { roles: { overlays: true }, selector: selectorPanel(false), properties: menuSurfaceProperties, tokenProperties: menuSurfaceTokens,
    components: ['SSelect'], variants: { variant: selectPresentation }, states: openSurface, family: 'overlays' },
  'multi-selector-popup': { roles: { overlays: true }, selector: selectorPanel(true), properties: menuSurfaceProperties, tokenProperties: menuSurfaceTokens,
    components: ['SSelect'], variants: { variant: selectPresentation }, states: openSurface, family: 'overlays' },
  'typeahead-dropdown': { roles: { overlays: true }, selector: ':is(.sy-popover:has(> .sy-base-typeahead__results), .sy-candidates)', properties: menuSurfaceProperties,
    tokenProperties: menuSurfaceTokens, components: ['SBaseTypeahead', 'SComboBox', 'STokenizer'], states: openSurface, family: 'overlays',
    variants: { variant: { values: ['search', 'candidates'], selector: variant => variant === 'search' ? '.sy-popover' : '.sy-candidates' } } },
  'menu-item': { roles: { 'option-rows': true }, selector: '.sy-menu__item', properties: box, tokenProperties: smallCorners, components: ['SMenuItem', 'SMenuCheckboxItem', 'SMenuRadioItem', 'SContextMenuItem'],
    states: optionStates, variants: { tone: { values: ['neutral', 'danger'],
      selector: tone => tone === 'danger' ? '[data-tone="danger"]' : ':not([data-tone="danger"])' } }, optionText, family: 'overlays' },
  checkbox: { selector: '.sy-checkbox__box', properties: { ...paint, 'border-radius': 'size', border: 'border', 'border-width': 'size',
    'box-shadow': 'shadow', width: 'length', height: 'length' },
    tokenProperties: borderToken, components: ['SCheckbox'], states: { ...choiceStates('checkbox'), mixed: ':where(.sy-choice__input:indeterminate + *)' }, variants: choiceSizes, family: 'selection' },
  radio: { selector: '.sy-radio__ring', properties: { ...paint, 'border-radius': 'size', border: 'border', 'box-shadow': 'shadow' },
    tokenProperties: borderToken, components: ['SRadio'], states: choiceStates('radio'), variants: choiceSizes, family: 'selection' },
  switch: { selector: '.sy-switch__track', properties: { ...paint, 'border-radius': 'size', border: 'border', 'box-shadow': 'shadow' },
    tokenProperties: borderToken, components: ['SSwitch'], states: choiceStates('checkbox'), variants: choiceSizes, family: 'selection' },
  'checkbox-indicator': { selector: '.sy-checkbox__box', properties: { color: 'color', 'background-color': 'color' }, components: ['SCheckbox'], family: 'selection',
    variants: { ...choiceSizes, checked: { values: ['checked', 'indeterminate'], selector: value => value === 'checked' ? checkboxChecked : checkboxMixed } },
    states: { checked: checkboxChecked, selected: checkboxChecked, mixed: checkboxMixed,
      disabled: choiceStates('checkbox').disabled, 'focus-visible': choiceStates('checkbox')['focus-visible'] },
    combinations: combinedStates(['checked', 'selected', 'mixed'], ['disabled', 'focus-visible']) },
  'radio-indicator-dot': { selector: '.sy-radio__ring', properties: { 'background-color': 'color' }, components: ['SRadio'], family: 'selection',
    variants: choiceSizes, states: { selected: choiceStates('radio').selected, disabled: choiceStates('radio').disabled,
      'focus-visible': choiceStates('radio')['focus-visible'] },
    combinations: combinedStates(['selected'], ['disabled', 'focus-visible']) },
  'switch-thumb': { selector: '.sy-switch__thumb', properties: { 'background-color': 'color', 'border-radius': 'size', 'box-shadow': 'shadow' },
    components: ['SSwitch'], family: 'selection', variants: switchThumbSize,
    states: { selected: switchVisualState(true), unchecked: switchVisualState(false),
      dragging: ':where(.sy-switch__track[data-dragging] *)', loading: ':where(.sy-choice[data-loading] *)',
      disabled: ':where(.sy-choice__input:is(:disabled, [data-choice-disabled]) + .sy-switch__track *)',
      'focus-visible': ':where(.sy-choice__input:focus-visible + .sy-switch__track *)' },
    combinations: combinedStates(['selected', 'unchecked'], ['disabled', 'dragging', 'focus-visible', 'loading']) },
  'tab-list': {
    selector: '.sy-tabs__list', properties: textSize, components: ['STabs'], textSize: { ...tabTextSize, child: ':scope > .sy-tabs__trigger' },
    variants: { ...fieldSizes, orientation: { attribute: 'data-orientation', values: ['horizontal', 'vertical'] } }, family: 'navigation',
  },
  tab: {
    roles: { 'selected-items': { state: 'selected' } },
    selector: '.sy-tabs__trigger', properties: { ...box, ...textSize }, components: ['STabs', 'STabMenu'],
    states: selectionStates, textSize: tabTextSize, family: 'navigation',
  },
  'tab-indicator': {
    selector: '.sy-tabs__indicator', properties: { background: 'paint', 'background-color': 'color', 'background-image': 'image',
      width: 'length', height: 'length', 'border-radius': 'size', display: 'hide' }, components: ['STabs'], family: 'navigation',
    variants: { size: tabListAxis('size', controlSizes), orientation: tabListAxis('orientation', ['horizontal', 'vertical']),
      variant: tabListAxis('tab-indicator', ['surface', 'line']) },
  },
  pagination: { selector: paginationSelector, properties: paginationBox, components: ['SPagination'], family: 'navigation',
    states: { hover: ':hover', 'focus-visible': ':has(:focus-visible)' },
    variants: { variant: { attribute: 'data-variant', values: paginationVariants }, ...fieldSizes } },
  'pagination-list': { selector: paginationListSelector, properties: paginationBox, components: ['SPagination'], family: 'navigation',
    states: { hover: ':hover', 'focus-visible': ':has(:focus-visible)' },
    variants: { variant: paginationAxis('variant', paginationVariants), size: paginationAxis('size', controlSizes) } },
  'pagination-item': { roles: { 'selected-items': { state: 'selected' } }, selector: '.sy-pagination__item', properties: paginationBox,
    components: ['SPagination'], family: 'navigation', states: { ...controlStates, selected: '[aria-current="page"]' },
    variants: { variant: paginationAxis('variant', paginationVariants), size: paginationAxis('size', controlSizes) } },
  'table-row': { roles: { 'selected-items': { state: 'selected' } }, selector: tableRow, properties: { ...paint, height: 'size', 'min-height': 'size' }, components: ['STable'],
    tokenProperties: { '--sy-border': ['box-shadow'] }, states: tableRowStates,
    variants: { parity: { attribute: 'data-sy-row-parity', values: ['odd', 'even'] } }, family: 'data' },
  'table-header-cell': { selector: '.sy-table__grid > thead > tr > th[data-table-column-key]', properties: tableCell,
    states: { hover: ':hover', 'focus-visible': ':is(:focus-visible, :has(:focus-visible))', sorted: '[aria-sort]' }, components: ['STable'], family: 'data' },
  'table-cell': { selector: `${tableRow} > [data-table-column-key]`, properties: tableCell,
    states: Object.fromEntries(Object.entries(tableRowStates).map(([name, state]) => [name, `:where(tr${state} > *)`])),
    variants: { parity: { values: ['odd', 'even'], selector: value => `:where(tr[data-sy-row-parity="${value}"] > *)` } },
    components: ['STable'], family: 'data' },
  'progress-bar-track': { roles: { 'inset-fields': true }, selector: progressTrack, properties: { ...surfacePaint, height: 'length' },
    states: { indeterminate: `:where(${progressBar}[data-indeterminate] *)` },
    variants: progressSizes, components: ['SProgressBar'], family: 'feedback' },
  'progress-bar-fill': { roles: { 'accent-fills': { when: { tone: 'accent' } } }, selector: progressFill, properties: surfacePaint,
    variants: progressSizes, components: ['SProgressBar'], family: 'feedback' },
  'progress-bar-sweep': { selector: progressSweep, properties: surfacePaint,
    variants: progressSizes, components: ['SProgressBar'], family: 'feedback' },
  'calendar-day': {
    roles: { 'selected-items': { state: 'selected' } },
    selector: '.sy-calendar__day', components: ['SCalendar', 'SRangeCalendar', 'SDatePicker', 'SDateRangePicker'], family: 'inputs',
    properties: { ...surfacePaint, ...type, 'outline-color': 'color', 'outline-width': 'length', 'outline-style': 'border-style' },
    states: {
      hover: ':hover:not([data-disabled], [data-unavailable])', 'focus-visible': ':focus-visible',
      selected: `:is(${rangeEdges}, [data-selected]:not(:where(${rangeCalendar} *)))`, ...calendarRangeStates,
      today: '[data-today]', disabled: '[data-disabled]', unavailable: '[data-unavailable]', 'outside-view': '[data-outside-view]',
    },
    variants: {
      variant: { values: ['single', 'multiple', 'range'], selector: value => `:where(.sy-calendar[data-sy-calendar-selection="${value}"] *)` },
      context: { values: ['inline', 'picker'], selector: value => value === 'picker'
        ? ':where(.sy-calendar-popup *)' : ':not(:where(.sy-calendar-popup *))' },
    },
  },
  'resize-handle': { selector: '.sy-shell-resize', components: ['SResizeHandle', 'SResizable'],
    properties: { ...paint, border: 'border', 'border-radius': 'size', 'box-shadow': 'shadow' }, family: 'containers',
    states: { ...controlStates, active: ':is([data-dragging], :active):not([aria-disabled="true"])' },
    variants: { direction: { attribute: 'data-resize-axis', values: ['horizontal', 'vertical'] } } },
  'resize-handle-pill': { selector: '.sy-shell-resize__pill', components: ['SResizeHandle'], family: 'containers',
    properties: { ...paint, width: 'size', height: 'size', border: 'border', 'border-radius': 'size', 'box-shadow': 'shadow' },
    tokenProperties: { ...pillCorners, ...borderToken, '--sy-space-6': ['width', 'height'] },
    states: {
      hover: ':where(.sy-shell-resize:hover:not([aria-disabled="true"]) > *)',
      active: ':where(.sy-shell-resize:is([data-dragging], :active):not([aria-disabled="true"]) > *)',
      'focus-visible': ':where(.sy-shell-resize:focus-visible > *)',
      disabled: ':where(.sy-shell-resize[aria-disabled="true"] > *)',
    },
    variants: { direction: { values: ['horizontal', 'vertical'],
      selector: direction => `:where(.sy-shell-resize[data-resize-axis="${direction}"] > *)` } } },
  divider: {
    selector: `.sy-separator:not(:where(${menuDivider}))`, components: ['SSeparator'], family: 'containers',
    properties: { 'background-color': 'color' },
    tokenProperties: { ...separatorColors, '--sy-border-width': ['min-height', 'min-width'] },
    variants: { variant: separatorVariant, orientation: { attribute: 'data-orientation', values: ['horizontal', 'vertical'] } },
  },
  'app-shell-header': { selector: '.sy-app-layout__navbar', properties: box, components: ['SAppLayout', 'SNavbar'], family: 'navigation' },
  'layout-header': { selector: `:is(${layoutHeader}, .sy-layout-header)`, properties: box, components: ['SLayout', 'SLayoutHeader'], family: 'navigation' },
  'top-nav': { selector: '.sy-navbar > .sy-navbar__bar', properties: { ...box, ...type }, components: ['SNavbar'], family: 'navigation' },
  'top-nav-heading': {
    selector: '.sy-navbar__brand', properties: textSize, components: ['SNavbar'],
    textSize: { ...topNavTextSize, child: '.' + topNavTitle }, family: 'navigation',
  },
  'top-nav-heading-title': {
    selector: '.' + topNavTitle, properties: textSize, components: ['SNavbar'], textSize: topNavTextSize, family: 'navigation',
  },
  'side-nav-heading': {
    selector: '.sy-side-nav-heading', properties: textSize, components: ['SSideNavHeading'],
    textSize: { ...sideNavTextSize, child: '.' + sideNavTitle }, family: 'navigation',
  },
  'side-nav-heading-title': {
    selector: '.' + sideNavTitle, properties: textSize, components: ['SSideNavHeading'], textSize: sideNavTextSize, family: 'navigation',
  },
  'top-nav-item': {
    selector: '.sy-navbar__desktop > li > .sy-navigation-link', properties: { ...box, ...type, 'line-height': 'line-height' },
    tokenProperties: { ...smallCorners, ...fontToken },
    components: ['SNavbar'], states: { ...controlStates, selected: '[aria-current]:not([aria-current="false"])' }, family: 'navigation',
  },
  'side-nav-item': {
    roles: { 'selected-items': { state: 'selected' } },
    selector: '.sy-side-nav-item > .sy-sidebar__row > .sy-navigation-link', properties: { ...box, ...type, 'line-height': 'line-height' },
    tokenProperties: { ...smallCorners, ...fontToken }, components: ['SSideNavItem'], family: 'navigation',
    variants: { size: { values: controlSizes, selector: value => `:where(.sy-side-nav-item[data-size="${value}"] *)` } },
    states: { ...controlStates, selected: '[aria-current="page"]' },
  },
  heading: { selector: ':is(h1, h2, h3, h4, h5, h6, [role="heading"][aria-level], .sy-dialog__title)',
    properties: { ...type, 'font-size': 'type-size', 'text-align': 'align' },
    tokenProperties: { '--sy-font-heading': ['font-family'], ...displayHeadingTokens }, components: ['SHeading', 'SDialog', 'STypography', 'SCard'],
    variants: {
      level: { values: ['1', '2', '3', '4', '5', '6'], selector: level =>
        `:is(h${level}, [role="heading"][aria-level="${level}"]):where(:not([data-heading-level]), [data-heading-level="${level}"])` },
      type: { values: ['standard', ...displayHeadingTypes], selector: role => role === 'standard'
        ? ':not(.sy-type[data-type^="display-"])' : `.sy-type[data-type="${role}"]` },
    },
    family: 'containers' },
  code: { selector: ':is(code, pre, kbd)', properties: type, tokenProperties: { '--sy-font-code': ['font-family'] },
    components: ['SCodeBlock', 'SKbd'], family: 'data' },
  body: { selector: ':is(.sy-card__body, .sy-dialog__description, .sy-typography)', properties: type, components: ['STypography', 'SCard'], family: 'containers' },
} satisfies Record<string, Target>

function choiceStates(type: 'checkbox' | 'radio') {
  const input = `.sy-choice__input[type="${type}"]`
  return {
    hover: `:where(.sy-choice:hover > ${input}:enabled:not([aria-disabled="true"]) + *)`,
    active: `:where(${input}:active:enabled:not([aria-disabled="true"], [aria-readonly="true"]) + *)`,
    selected: `:where(${input}:checked + *)`,
    'focus-visible': `:where(${input}:focus-visible + *)`,
    disabled: `:where(${input}:is(:disabled, [data-choice-disabled]) + *)`,
    loading: `:where(${input}[aria-busy="true"] + *)`,
    invalid: `:where(${input}[aria-invalid="true"] + *)`,
  }
}

export type BrandRuleTarget = keyof typeof brandRuleTargets
export interface BrandComponentRule {
  target: BrandRuleTarget
  when?: Readonly<Record<string, string>>
  state?: string
  mode?: BrandMode
  declarations: Readonly<Record<string, string>>
  authored?: Readonly<Record<string, true>>
}

const size = /^(?:0|[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|dvh|vh|vw|ch))$/
const named = /^(?:transparent|currentcolor|black|white|red|green|blue|yellow|orange|purple|gray|grey|inherit)$/i
const styles = /^(?:solid|dashed|dotted|double|none)$/
const colorFunctions = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix', 'light-dark', 'var'])
const gradients = new Set(['linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient'])

function terms(value: string, separator: ',' | ' ') {
  let depth = 0
  let start = 0
  const values: string[] = []
  for (const [index, char] of [...value].entries()) {
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === separator && !depth) { values.push(value.slice(start, index).trim()); start = index + 1 }
    if (depth < 0) return []
  }
  return depth === 0 ? [...values, value.slice(start).trim()].filter(Boolean) : []
}

function paintValue(value: string, allowGradient = false): boolean {
  if (allowGradient) {
    const layers = terms(value, ',')
    if (layers.length > 1) return layers.every((layer, index) => {
      const name = /^([a-z-]+)\(/i.exec(layer)?.[1]?.toLowerCase()
      return (index === layers.length - 1 || gradients.has(name ?? '')) && paintValue(layer, true)
    })
  }
  if (named.test(value) || /^#[\da-f]{3,8}$/i.test(value) && [4, 5, 7, 9].includes(value.length)) return true
  const name = /^([a-z-]+)\(/i.exec(value)?.[1]?.toLowerCase()
  if (!name || !value.endsWith(')') || !terms(value, ',').length) return false
  const args = value.slice(name.length + 1, -1)
  if (name === 'var') return /^--sy-[a-z0-9-]+(?:\s*,\s*[^)]+)?$/i.test(args)
  if (['rgb', 'rgba', 'hsl', 'hsla'].includes(name) && !args.includes('var(')) return Boolean(readColor(value))
  if (allowGradient && gradients.has(name)) {
    const stops = terms(args, ',')
    return stops.length > 1 && stops.filter(stop => paintValue(terms(stop, ' ')[0] ?? '')).length >= 2
  }
  if (!colorFunctions.has(name)) return false
  return /^[-\w\s#.,%/+()]+$/.test(args) && (args.match(/[a-z-]+(?=\()/giu) ?? []).every(fn => colorFunctions.has(fn))
    && (name === 'light-dark' ? terms(args, ',').length === 2 && terms(args, ',').every(arg => paintValue(arg)) : /\d|var\(|transparent/i.test(args))
}

const cssFamily = String.raw`(?:"[^"]+"|'[^']+'|[\p{L}_-][\p{L}\p{N}_-]*(?:\s+[\p{L}_-][\p{L}\p{N}_-]*)*)`
const cssFontStack = new RegExp(`^${cssFamily}(?:\\s*,\\s*${cssFamily})*$`, 'u')

function declaration(kind: ValueKind, value: string, property: string): boolean {
  if (!value || value.length > 320 || /[<>{};\\\n\r]|\/\*|!important|url\(/i.test(value)) return false
  if (kind === 'image') {
    const layers = terms(value, ',')
    return layers.length > 0 && layers.every(layer => layer === 'none' ||
      gradients.has(/^([a-z-]+)\(/i.exec(layer)?.[1]?.toLowerCase() ?? '') && paintValue(layer, true))
  }
  if (property === 'border-color' && kind === 'color') {
    const sides = terms(value, ' ')
    return sides.length >= 1 && sides.length <= 4 && sides.every(side => paintValue(side))
  }
  if (kind === 'color' || kind === 'paint') return paintValue(value, kind === 'paint')
  if (kind === 'length') return size.test(value) && !value.startsWith('-') && !value.endsWith('%')
  if (property === 'border-radius') {
    const axes = value.split('/')
    return axes.length <= 2 && axes.every(axis => {
      const corners = terms(axis, ' ')
      return corners.length >= 1 && corners.length <= 4 && corners.every(corner => size.test(corner) && !corner.startsWith('-'))
    })
  }
  if (property === 'border-width' || kind === 'border-style') {
    const sides = terms(value, ' ')
    return sides.length >= 1 && sides.length <= 4 && sides.every(side => kind === 'border-style' ? styles.test(side)
      : size.test(side) && !side.startsWith('-') && !side.endsWith('%'))
  }
  if (kind === 'size') return size.test(value) && (!value.startsWith('-') || property === 'letter-spacing')
    || (property === 'height' || property === 'min-height') && ['auto', 'fit-content', 'max-content', 'min-content'].includes(value)
  if (kind === 'space') {
    const parts = terms(value, ' ')
    return parts.length > 0 && parts.length <= (property === 'padding' ? 4 : 2)
      && parts.every(part => size.test(part) && !part.startsWith('-'))
  }
  if (kind === 'number') return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value))
  if (kind === 'line-height') return value === 'normal' || declaration('size', value, property) || declaration('number', value, property)
  if (kind === 'weight') return /^(?:normal|bold|[1-9]00)$/.test(value)
  if (kind === 'font') return cssFontStack.test(value)
  if (kind === 'text-transform') return ['none', 'uppercase', 'lowercase', 'capitalize'].includes(value)
  if (kind === 'button-style') return value === 'default' || value === 'outline'
  if (kind === 'hide') return value === 'none'
  if (kind === 'align') return ['start', 'center', 'end', 'left', 'right', 'justify'].includes(value)
  if (kind === 'type-size') {
    const length = (text: string) => size.test(text) && !text.startsWith('-')
    if (length(value)) return true
    const match = /^(clamp|min|max)\(([^()]*)\)$/.exec(value)
    if (!match) return false
    const args = terms(match[2]!, ',')
    return (match[1] === 'clamp' ? args.length === 3 : args.length > 0) && args.every(length)
  }
  if (value === 'none') return true
  if (kind === 'border') {
    const parts = terms(value, ' ')
    return parts.length >= 2 && parts.length <= 3 && parts.some(part => styles.test(part))
      && parts.every(part => styles.test(part) || size.test(part) && !part.startsWith('-') || paintValue(part))
      && parts.filter(part => styles.test(part)).length === 1 && parts.filter(part => size.test(part)).length <= 1
  }
  const shadows = terms(value, ',')
  return shadows.length > 0 && shadows.every(shadow => {
    const parts = terms(shadow, ' ')
    const lengths = parts.filter(part => size.test(part))
    return lengths.length >= 2 && lengths.length <= 4 && !lengths[2]?.startsWith('-') && parts.every(part => part === 'inset' || size.test(part) || paintValue(part))
      && parts.filter(part => paintValue(part)).length <= 1
  })
}

function controlRuleTokens(target: BrandRuleTarget, when?: Readonly<Record<string, string>>) {
  if (target === 'file-input' && when?.mode === 'dropzone') return []
  const control = Object.hasOwn(brandControlHeightParts, target) ? brandControlHeightParts[target as keyof typeof brandControlHeightParts] : undefined
  if (!control) return []
  return [control.property, ...control.sizes.filter(size => !when?.size || when.size === size).map(size => `--sy-control-height-${size}`)]
}

export function brandRuleTokens(target: BrandRuleTarget, when?: Readonly<Record<string, string>>) {
  const sizes = controlRuleTokens(target, when)
  const part = brandRuleTargets[target] as Target | undefined
  if (part?.textSize) sizes.push(part.textSize.token)
  const foreground = Object.values(part?.optionText ?? {})
  const typed = Object.keys(part?.tokenProperties ?? {})
  if (target === 'heading' && when?.type) {
    for (const token of Object.keys(displayHeadingTokens)) {
      if (token !== `--sy-${when.type}-size`) typed.splice(typed.indexOf(token), 1)
    }
  }
  if ((target === 'divider' || target === 'dropdown-menu-divider') && when?.variant) {
    const unused = when.variant === 'strong' ? '--sy-border' : '--sy-border-strong'
    typed.splice(typed.indexOf(unused), 1)
  }
  if (fieldShadowParts.has(target)) typed.push(brandFieldHoverRingToken)
  if (target === 'button') {
    const variant = when?.variant
    const colors = variant ? buttonColors[variant] ?? [] : [...new Set(Object.values(buttonColors).flat())]
    return [...colors.map(key => '--sy-' + key), '--sy-button-icon-color', ...sizes, ...typed]
  }
  const colors = target.startsWith('button-') ? buttonColors[target.slice('button-'.length)] : localColors[target]
  if (colors && target.startsWith('button-')) typed.push('--sy-button-icon-color')
  return [...(colors ?? []).map(key => '--sy-' + key), ...sizes, ...foreground, ...typed]
}

export function normalizeBrandToken(token: string, text: string) {
  const kind = Object.hasOwn(brandTypedTokens, token) ? brandTypedTokens[token] : undefined
  const value = typeof text === 'string' ? text.trim() : ''
  if (!kind || !declaration(kind, value, token) || token === '--sy-motion-tempo' && !(Number(value) >= .75 && Number(value) <= 1.5)) {
    throw new TypeError('Invalid value for theme token ' + token)
  }
  return value
}

export function brandRuleStates(target: BrandRuleTarget) {
  const entry: Target = brandRuleTargets[target]
  return [...Object.keys(entry.states ?? {}), ...(entry.combinations ?? [])]
}

function normalizedRuleState(target: BrandRuleTarget, input?: string) {
  if (!input) return
  if (!Object.hasOwn(brandRuleTargets, target)) throw new TypeError('Unknown theme part: ' + target)
  const entry: Target = brandRuleTargets[target]
  const state = input.split('+').map(name => name.trim()).map(name => entry.stateAliases?.[name] ?? name).sort().join('+')
  if (!brandRuleStates(target).includes(state)) throw new TypeError(`Unknown state ${input} on ${target}`)
  return state
}

export function normalizeBrandRule(rule: BrandComponentRule): BrandComponentRule {
  if (!Object.hasOwn(brandRuleTargets, rule.target)) throw new TypeError('Unknown theme part: ' + rule.target)
  const target: Target = brandRuleTargets[rule.target]
  const condition = Object.entries(rule.when ?? {}).sort(([a], [b]) => a.localeCompare(b))
  for (const [key, value] of condition) {
    const axis = target.variants && Object.hasOwn(target.variants, key) ? target.variants[key] : undefined
    if (!axis || !axis.values.includes(value)) throw new TypeError(`Cannot select ${key}:${value} on ${rule.target}`)
  }
  const state = normalizedRuleState(rule.target, rule.state)
  const states = state?.split('+') ?? []
  if (rule.target === 'checkbox-indicator' && rule.when?.checked
    && (states.includes('mixed') && rule.when.checked !== 'indeterminate'
      || (states.includes('checked') || states.includes('selected')) && rule.when.checked !== 'checked')) {
    throw new TypeError(`Cannot combine ${state} with checked:${rule.when.checked}`)
  }
  if (rule.target === 'calendar-day' && rule.state && Object.hasOwn(calendarRangeStates, rule.state) && rule.when?.variant && rule.when.variant !== 'range') {
    throw new TypeError(`${rule.state} requires the range calendar variant`)
  }
  if (rule.target === 'pagination-item' && states.includes('selected') && rule.when?.variant && !['pages', 'dots'].includes(rule.when.variant)) {
    throw new TypeError('The selected state requires page numbers or dots')
  }
  if (rule.mode && !['light', 'dark'].includes(rule.mode)) throw new TypeError('Use --mode light or dark')
  const declarations: Record<string, string> = {}
  const tokens = brandRuleTokens(rule.target, rule.when)
  const heights = controlRuleTokens(rule.target, rule.when)
  for (const [property, raw] of Object.entries(rule.declarations)) {
    const kind = Object.hasOwn(target.properties, property) ? target.properties[property] : property === target.textSize?.token ? 'size'
      : heights.includes(property) ? 'length'
      : tokens.includes(property) ? brandTypedTokens[property] ?? 'color' : undefined
    if (!kind) throw new TypeError(property.startsWith('--sy-') ? `${rule.target} does not read ${property}. Choose ${tokens.join(', ')} or set a property such as background-color.`
      : `${rule.target} does not support ${property}`)
    const focusWidth = rule.target === 'input-focus-ring' && property === 'outline-width'
    if (rule.mode && !focusWidth && !['color', 'paint', 'image', 'shadow', 'button-style'].includes(kind)) throw new TypeError('Mode-specific changes must be colors, background images, shadows or a button style')
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!declaration(kind, value, property)) throw new TypeError(`Invalid ${kind} for ${property}: ${raw}`)
    declarations[property] = value
  }
  const authored = Object.fromEntries(Object.keys(declarations).filter(key => rule.authored?.[key] === true).map(key => [key, true as const]))
  return { target: rule.target, ...(condition.length && { when: Object.fromEntries(condition) }), ...(state && { state }),
    ...(rule.mode && { mode: rule.mode }), declarations, ...(Object.keys(authored).length && { authored }) }
}

export function brandRuleKey(rule: BrandComponentRule) {
  return [rule.target, rule.mode ?? 'both', normalizedRuleState(rule.target, rule.state) ?? 'base', ...Object.entries(rule.when ?? {}).sort().flat()].join('-')
}

export function compareBrandRules(a: BrandComponentRule, b: BrandComponentRule) {
  // A disabled control can stay selected, just as pressing can overlap hover.
  const rangeEdge = (rule: BrandComponentRule) => Number(rule.target === 'calendar-day' && (rule.state === 'range-start' || rule.state === 'range-end'))
  const thumbState = (rule: BrandComponentRule) => rule.target === 'switch-thumb' ? rule.state === 'loading' ? 2 : Number(rule.state === 'dragging') : 0
  return (a.state?.split('+').length ?? 0) - (b.state?.split('+').length ?? 0)
    || Object.keys(a.when ?? {}).length - Object.keys(b.when ?? {}).length
    || Number(Boolean(a.mode)) - Number(Boolean(b.mode))
    || rangeEdge(a) - rangeEdge(b)
    || Number(a.state === 'disabled') - Number(b.state === 'disabled')
    || thumbState(a) - thumbState(b)
    || Number(a.state === 'active') - Number(b.state === 'active')
    || brandRuleKey(a).localeCompare(brandRuleKey(b))
}

const blockPaddings = new Set(['padding-top', 'padding-bottom', 'padding-block', 'padding-block-start', 'padding-block-end'])
export const brandFieldShadowParts = ['field', 'input', 'input-group', 'textarea', 'select', 'complex-selector', 'typeahead',
  'combobox', 'tokenizer', 'file-input', 'drop-zone', 'date-input', 'number-input'] as const
const fieldShadowParts = new Set<BrandRuleTarget>(brandFieldShadowParts)
const inlinePaddingParts = new Set<BrandRuleTarget>(['select', 'typeahead', 'combobox', 'tokenizer'])
const inlinePaddingSelector = '.sy-select__control, .sy-combo > input.sy-field__control, .sy-file-input:not([data-mode="dropzone"]) > .sy-drop-zone__area'

export function brandPaddingPolicy(target: BrandRuleTarget, when?: Readonly<Record<string, string>>) {
  if (inlinePaddingParts.has(target)) return 'inline'
  if (target === 'file-input') return when?.mode === 'dropzone' ? 'full' : when?.mode === 'field' ? 'inline' : 'mixed'
  return target === 'field' || target === 'input' ? 'mixed' : 'full'
}

export function brandPaddingProjection(rule: BrandComponentRule) {
  const policy = brandPaddingPolicy(rule.target, rule.when)
  if (policy === 'full') return
  const adjustments = Object.entries(rule.declarations).flatMap(([property, value]) => {
    if (blockPaddings.has(property)) return [{ property, value, inline: [] }]
    if (property !== 'padding') return []
    const [top, right = top, , left = right] = value.split(/\s+/)
    const inline = left === right ? [{ property: 'padding-inline', value: right! }]
      : [{ property: 'padding-left', value: left! }, { property: 'padding-right', value: right! }]
    return [{ property, value, inline }]
  })
  if (adjustments.length) return { policy, adjustments }
}

export function brandRuleDeclarations(rule: BrandComponentRule) {
  const target: Target = brandRuleTargets[rule.target]
  const values = new Map(Object.entries(rule.declarations).map(([property, value]): [string, string] =>
    [property === 'font-size' && target.textSize ? target.textSize.token : property, value]))
  const color = values.get('color')
  const gap = values.get('gap')
  const focusWidth = rule.target === 'input-focus-ring' && values.get('outline-width')
  if (focusWidth) values.set('outline-offset', `calc(-1 * ${focusWidth})`)
  if (rule.target === 'toggle-button-group' && gap) values.set('--sy-toggle-group-gap', gap)
  if (rule.target === 'checkbox-indicator') {
    for (const [property, value] of values) {
      if (property !== 'color' && property !== 'background-color') continue
      values.delete(property)
      values.set('--sy-checkbox-indicator-ink', value)
    }
  }
  if (rule.target === 'radio-indicator-dot' && values.has('background-color')) {
    values.set('--sy-radio-indicator-ink', values.get('background-color')!)
    values.delete('background-color')
  }
  if (rule.target === 'divider' && values.has('background-color')) {
    values.set('--sy-separator-ink', values.get('background-color')!)
    values.delete('background-color')
  }
  if (rule.target === 'progress-bar-track' && values.has('height')) {
    values.set('--sy-progress-track-height', values.get('height')!)
    values.delete('height')
  }
  if (color && target.optionText) {
    for (const token of Object.values(target.optionText)) {
      if (!values.has(token)) values.set(token, color)
    }
    values.delete('color')
  }
  if (color && rule.target === 'lightbox' && !values.has('--sy-lightbox-caption-color')) {
    values.set('--sy-lightbox-caption-color', color)
  }
  if (color && rule.target === 'table-header-cell') values.set('--sy-table-header-ink', color)
  if (rule.target === 'table-row' && values.has('border-color')) {
    const colors = terms(values.get('border-color')!, ' ')
    values.set('--sy-table-row-divider-color', colors[2] ?? colors[0]!)
  }
  return [...values]
}

const shorthandProperties: Readonly<Record<string, readonly string[]>> = {
  background: ['background-color', 'background-image'],
  border: ['border-width', 'border-color', 'border-style'],
  padding: ['padding-block', 'padding-inline', 'padding-block-start', 'padding-block-end', 'padding-inline-start',
    'padding-inline-end', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'],
  'padding-block': ['padding-block-start', 'padding-block-end', 'padding-top', 'padding-bottom'],
  'padding-inline': ['padding-inline-start', 'padding-inline-end', 'padding-left', 'padding-right'],
}
const overlap = (a: string, b: string) => a === b || shorthandProperties[a]?.includes(b) || shorthandProperties[b]?.includes(a)
const fits = (when: BrandComponentRule['when'], within: BrandComponentRule['when']) =>
  Object.entries(when ?? {}).every(([axis, value]) => within?.[axis] === value)
const paginationFrameProperties = new Set(['border', 'border-width', 'border-color', 'border-radius', 'box-shadow', ...Object.keys(paginationCorners)])
type PaginationFramePart = 'pagination' | 'pagination-list'
type RuleColors = Partial<Record<BrandMode, Readonly<Record<string, string>>>>

function paginationScopeFits(rule: BrandComponentRule, sample: Pick<BrandComponentRule, 'when' | 'mode' | 'state'>) {
  return (!rule.mode || rule.mode === sample.mode) && (!rule.state || rule.state === sample.state) && fits(rule.when, sample.when)
}

function paginationPaint(value: string | undefined, mode: BrandMode, tokens: Record<string, string>, seen = new Set<string>()): boolean {
  if (!value) return false
  const paint = resolveTone(value, mode)
  if (/^var\(/i.test(paint)) {
    const [name, fallback] = terms(paint.slice(4, -1), ',')
    if (!name || seen.has(name)) return paginationPaint(fallback, mode, tokens, seen)
    return paginationPaint(tokens[name] ?? fallback, mode, tokens, new Set([...seen, name]))
  }
  const color = readColor(paint)
  if (color) return color.alpha > 0
  if (paint.startsWith('color-mix(')) {
    const stops = terms(paint.slice('color-mix('.length, -1), ',').slice(1).map(stop => {
      const parts = terms(stop, ' ')
      const percentage = parts.at(-1)?.match(/^(\d+(?:\.\d+)?|\.\d+)%$/)
      return { color: percentage ? parts.slice(0, -1).join(' ') : stop, weight: percentage && Number(percentage[1]) }
    })
    return stops.length === 2 && stops.some((stop, index) =>
      (stop.weight ?? 100 - (stops[1 - index].weight ?? 50)) > 0 && paginationPaint(stop.color, mode, tokens, seen))
  }
  if (gradients.has(paint.slice(0, paint.indexOf('(')))) {
    return terms(paint.slice(paint.indexOf('(') + 1, -1), ',').some(stop => {
      const ink = terms(stop, ' ')[0]
      return ink && paintValue(ink) && paginationPaint(ink, mode, tokens)
    })
  }
  return paint !== 'none' && !/\/\s*0(?:\.0+)?%?\s*\)$/.test(paint)
}

function paginationFill(values: [string, string][], mode: BrandMode, tokens: Record<string, string>) {
  let background: string | undefined
  let image: string | undefined
  for (const [name, value] of values) {
    if (name === 'background') {
      const gradient = gradients.has(value.slice(0, value.indexOf('(')))
      image = gradient ? value : undefined
      background = gradient ? undefined : value
    } else if (name === 'background-color') background = value
  }
  return paginationPaint(background, mode, tokens) || paginationPaint(image, mode, tokens)
}

function paginationEdge(values: [string, string][], mode: BrandMode, palette: Readonly<Record<string, string>> | undefined) {
  const tokens = { ...palette, ...Object.fromEntries(values.filter(([name]) => name.startsWith('--sy-'))) }
  if (paginationFill(values, mode, tokens)) return true
  const sides = paginationSides.map(side => ({ side, width: '0', style: 'solid', color: 'transparent' }))
  let shadow: string | undefined
  for (const [name, value] of values) {
    if (name === 'box-shadow') { shadow = value; continue }
    if (name === 'border-color') { for (const side of sides) side.color = value; continue }
    if (name === 'border-width') { for (const side of sides) side.width = value; continue }
    if (name !== 'border' && !paginationSides.some(side => name === 'border-' + side)) continue
    const parts = terms(value, ' ')
    const width = parts.find(part => size.test(part)) ?? '3px'
    const style = parts.find(part => styles.test(part)) ?? 'none'
    const color = parts.find(part => !styles.test(part) && !size.test(part)) ?? 'currentcolor'
    for (const side of sides) if (name === 'border' || name === 'border-' + side.side) Object.assign(side, { width, style, color })
  }
  return sides.some(({ width, style, color }) => parseFloat(width) > 0 && style !== 'none' && paginationPaint(color, mode, tokens))
    || Boolean(shadow && terms(shadow, ',').some(layer => {
      const parts = terms(layer, ' ')
      const distances = parts.filter(part => size.test(part))
      const ink = parts.find(part => part !== 'inset' && !size.test(part)) ?? 'currentcolor'
      return distances.some(distance => parseFloat(distance) !== 0) && paginationPaint(ink, mode, tokens)
    }))
}

export function brandPaginationFrames(rules?: Readonly<Record<string, BrandComponentRule>>, colors: RuleColors = {}) {
  const pager = Object.values(rules ?? {}).filter(rule => rule.target === 'pagination' || rule.target === 'pagination-list').sort(compareBrandRules)
  const samples = (rule: BrandComponentRule) => (['light', 'dark'] as const).flatMap(mode => paginationVariants.flatMap(variant =>
    controlSizes.map(size => ({ mode, when: { variant, size }, state: rule.state })))).filter(sample => paginationScopeFits(rule, sample))
  const destinations = new Map<BrandComponentRule, PaginationFramePart>()
  for (const rule of pager) {
    if (rule.target !== 'pagination' || !Object.keys(rule.declarations).some(name => paginationFrameProperties.has(name))) continue
    const wider = [...destinations].find(([parent]) => paginationScopeFits(parent, rule))?.[1]
    const filled = !wider && samples(rule).every(sample => {
      const values = pager.filter(item => item.target === 'pagination' && paginationScopeFits(item, sample)).flatMap(brandRuleDeclarations)
      const tokens = { ...colors[sample.mode], ...Object.fromEntries(values.filter(([name]) => name.startsWith('--sy-'))) }
      return paginationFill(values, sample.mode, tokens)
    })
    destinations.set(rule, wider ?? (filled ? 'pagination' : 'pagination-list'))
  }
  return pager.flatMap(rule => {
    const part = rule.target === 'pagination-list' ? 'pagination-list' : destinations.get(rule)
    if (!part) return []
    const properties = Object.keys(rule.declarations).filter(name => paginationFrameProperties.has(name))
    if (!properties.length) return []
    const rounds = properties.some(property => property.endsWith('-radius'))
    const hasEdge = !rounds || samples(rule).every(sample => {
      const values = pager.filter(item => paginationScopeFits(item, sample)).flatMap(item => brandRuleDeclarations(item).filter(([name]) =>
        (paginationFrameProperties.has(name) && destinations.get(item) || item.target) === part))
      return paginationEdge(values, sample.mode, colors[sample.mode])
    })
    return [{ rule, part, properties, hasEdge }]
  })
}

const canonical = (rule: BrandComponentRule): BrandComponentRule => rule.target.startsWith('button-') && rule.target !== 'button-group'
  ? { ...rule, target: 'button', when: { variant: rule.target.slice(7), ...rule.when } } : rule

function intersectRules(a: BrandComponentRule, b: BrandComponentRule) {
  if (a.target !== b.target || a.state !== b.state || a.mode && b.mode && a.mode !== b.mode) return
  const when = { ...a.when, ...b.when }
  if (!fits(a.when, when)) return
  return { target: a.target, when, state: a.state, mode: a.mode ?? b.mode, declarations: {} }
}

export function resolveBrandThemeRules(theme?: BrandTheme) {
  const rules = theme?.rules
  const inherited = theme?.inheritedRules
  const lifted: { part: BrandRuleTarget; when?: BrandComponentRule['when']; state?: string; mode?: BrandMode; property: string; value: string }[] = []
  if (!rules || !inherited) return { rules, lifted }

  const changes: BrandComponentRule[] = []
  const candidates: BrandComponentRule[] = []
  for (const [key, rule] of Object.entries(rules)) {
    const base = inherited[key]?.declarations
    for (const [property, value] of Object.entries(rule.declarations)) {
      const scoped = canonical({ ...rule, declarations: { [property]: value } })
      const entries = rule.authored?.[property] || base?.[property] !== value ? changes : candidates
      entries.push(scoped)
    }
  }
  changes.sort(compareBrandRules)
  const result = { ...rules }
  const applied = new Map<string, typeof lifted[number]>()
  const projections: { scope: BrandComponentRule; source: BrandComponentRule; property: string }[] = []
  function write(scope: BrandComponentRule, property: string, value: string) {
    const key = brandRuleKey(scope)
    const declarations = { ...result[key]?.declarations }
    delete declarations[property]
    declarations[property] = value
    const written = normalizeBrandRule({ ...scope, declarations })
    result[key] = written
    applied.set(key + '/' + property, { part: written.target, when: written.when, state: written.state, mode: written.mode, property, value })
  }
  for (const rule of changes) {
    for (const base of candidates) {
      const combined = intersectRules(rule, base)
      if (!combined || compareBrandRules(base, rule) <= 0) continue
      for (const [property, value] of brandRuleDeclarations(rule)) {
        if (!brandRuleDeclarations(base).some(([name, previous]) => overlap(name, property) && (name !== property || previous !== value))) continue
        const { mode: optionalMode, when } = combined
        const eligible = (['light', 'dark'] as const).filter(mode => (!optionalMode || mode === optionalMode) && !changes.some(local =>
          local.target === rule.target && local.state === rule.state && (!local.mode || local.mode === mode)
          && fits(local.when, when) && compareBrandRules(local, rule) > 0
          && brandRuleDeclarations(local).some(([name]) => overlap(name, property))))
        if (!eligible.length) continue
        const mode = eligible.length === 1 ? eligible[0] : undefined
        const scope = { ...combined, mode }
        write(scope, property, value)
        projections.push({ scope, source: rule, property })
      }
    }
  }
  // Independent axes can intersect, like a dark small button and a secondary button.
  // Extend the more specific local choice only where the inherited variant reaches it.
  for (const local of changes) {
    for (const { scope, source, property } of projections) {
      const combined = intersectRules(local, scope)
      if (!combined || compareBrandRules(local, source) <= 0 || brandRuleKey(combined) === brandRuleKey(scope)) continue
      for (const [name, value] of brandRuleDeclarations(local)) {
        if (overlap(name, property)) write(combined, name, value)
      }
    }
  }
  return { rules: result, lifted: [...applied.values()] }
}

function projectRuleDeclarations(rule: BrandComponentRule, selector: string, frame?: PaginationFramePart) {
  const restingShadow = !rule.state && fieldShadowParts.has(rule.target) && rule.declarations['box-shadow']
  const values = brandRuleDeclarations(rule).filter(([name]) => name !== 'button-style' && (!restingShadow || name !== 'box-shadow'))
  const buttonStyle = rule.declarations['button-style']
  if (buttonStyle) {
    const paint = buttonStyle === 'outline'
    values.push(['--sy-button-style', buttonStyle],
      ['--sy-button-outline-ink', paint ? 'var(--sy-button-outline-tone)' : 'initial'],
      ['--sy-button-outline-fill', paint ? 'transparent' : 'initial'],
      ['--sy-button-outline-hover', paint ? 'color-mix(in srgb, var(--sy-button-outline-ink) 12%, transparent)' : 'initial'],
      ['--sy-button-outline-width', paint ? 'max(1px, var(--sy-border-width))' : 'initial'])
  }
  if (rule.target === 'top-nav-item' && rule.declarations.height) {
    values.push(['--sy-navigation-item-height', rule.declarations.height])
  }
  if ((menuSurfaceParts as readonly string[]).includes(rule.target) && rule.declarations['border-radius']) {
    values.push(['--sy-overlay-clip-radius', rule.declarations['border-radius']])
  }
  const projection = brandPaddingProjection(rule)
  const line = (subject: string, entries: [string, string][]) => {
    const css = entries.map(([key, value]) => `${key}: ${value};`).join(' ')
    return css ? [`  :where(${subject}), :scope:where(${subject}) { ${css} }`] : []
  }
  const hiding = rule.declarations.display === 'none'
  if (hiding) {
    values.push(['opacity', '0'], ['pointer-events', 'none'], ['interactivity', 'inert'])
    if (rule.target === 'banner-icon') values.push(['inline-size', '0'], ['margin-inline-end', '0'])
  }
  const header = hiding && rule.target === 'code-block-copy-button'
    ? line('.sy-code-block__header[data-copy-only]:has(.sy-code-block__copy)', [['grid-template-rows', '0fr'], ['opacity', '0']]) : []
  const shadow = restingShadow ? line(rule.target === 'field'
    ? `${selector}:not(.sy-input-group *, .sy-combo > *)` : selector,
    [['--sy-field-resting-shadow', restingShadow === 'none' ? 'initial' : ', ' + restingShadow]]) : []
  if (rule.target === 'pagination' && frame === 'pagination-list') {
    return [...line(selector, values.filter(([name]) => !paginationFrameProperties.has(name))),
      ...line(`${selector} > ${paginationListSelector}`, values.filter(([name]) => paginationFrameProperties.has(name)))]
  }
  if (!projection) return [...line(selector, values), ...header, ...shadow]
  const changes = new Map(projection.adjustments.map(({ property, inline }) => [property, inline]))
  const inline = values.flatMap(([name, value]): [string, string][] =>
    changes.get(name)?.map(side => [side.property, side.value]) ?? [[name, value]])
  if (projection.policy === 'inline') return [...line(selector, inline), ...shadow]
  return [...line(`${selector}:not(${inlinePaddingSelector})`, values), ...line(`${selector}:is(${inlinePaddingSelector})`, inline), ...shadow]
}

function barMeasurements(declarations: Readonly<Record<string, string>> = {}) {
  let start = '0'
  let end = '0'
  for (const [property, value] of Object.entries(declarations)) {
    if (property === 'padding') {
      const [top, , bottom = top] = value.split(/\s+/)
      start = top!
      end = bottom!
    } else if (property === 'padding-block') {
      const [top, bottom = top] = value.split(/\s+/)
      start = top!
      end = bottom!
    } else if (property === 'padding-block-start' || property === 'padding-top') start = value
    else if (property === 'padding-block-end' || property === 'padding-bottom') end = value
  }
  const length = (value?: string) => {
    if (value === undefined || !size.test(value)) return
    const amount = parseFloat(value)
    return amount === 0 ? '0' : amount + value.replace(/^[+-]?[\d.]+/, '')
  }
  return { height: length(declarations.height), minHeight: length(declarations['min-height']), start: length(start) ?? '0', end: length(end) ?? '0' }
}

export function brandNavigationReach(rules: Readonly<Record<string, BrandComponentRule>> | undefined) {
  const geometry = (part: BrandRuleTarget) => rules?.[brandRuleKey({ target: part, declarations: {} })]?.declarations
  const bars = headerParts.flatMap(part => {
    const measurement = barMeasurements(geometry(part))
    return measurement.height || measurement.minHeight || measurement.start !== '0' || measurement.end !== '0'
      ? [{ part, ...measurement }] : []
  })
  const [first, second] = bars
  if (!first) return
  const conflict = second && (first.height !== second.height || first.minHeight !== second.minHeight ? 'height'
    : first.start !== second.start || first.end !== second.end ? 'padding' : undefined)
  return { bars, item: barMeasurements(geometry('top-nav-item')), ...(conflict ? { conflict } : { reaches: headerParts }) }
}

function headerProjection(reach: NonNullable<ReturnType<typeof brandNavigationReach>>) {
  const [source] = reach.bars
  if (!source || 'conflict' in reach) return ''
  const dimensions = [
    ...(source.height ? ['height: ' + source.height + ';'] : []),
    ...(source.minHeight ? ['min-height: ' + source.minHeight + ';'] : []),
    'padding-block: ' + source.start + ' ' + source.end + ';',
  ].join(' ')
  return headerRoutes.flatMap(({ bar, frame }) => {
    const child = frame ? frame + ':only-child > ' : ''
    const host = bar + ':has(> ' + child + '.sy-navbar:only-child)'
    const navbar = host + ' > ' + child + '.sy-navbar'
    return [
      `  :where(${host}) { box-sizing: border-box; display: grid; grid-template-rows: minmax(0, 1fr); ${dimensions} }`,
      ...(frame ? [`  :where(${host} > ${frame}) { display: grid; grid-template-rows: minmax(0, 1fr); min-block-size: 0; padding-block: 0; inline-size: 100%; }`] : []),
      `  :where(${navbar}) { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-block-size: 0; }`,
      `  :where(${navbar} > .sy-navbar__bar) { align-self: center; block-size: 100%; min-block-size: 0; padding-block: 0; }`,
    ]
  }).join('\n')
}

export function brandRuleStyle(rules: Readonly<Record<string, BrandComponentRule>> | undefined, root?: string, mode?: BrandMode, defaultMode: BrandMode = 'light', colors?: RuleColors) {
  const normalized = Object.values(rules ?? {}).map(normalizeBrandRule).sort(compareBrandRules)
  const scoped = (selector: string | undefined, line: string) => `@scope${selector ? ` (${selector})` : ''} to (:scope [data-sy-brand]) {\n${line}\n}`
  const css: string[] = []
  const frames = new Map(brandPaginationFrames(rules, colors).map(({ rule, part }) => [brandRuleKey(rule), part]))
  const reach = brandNavigationReach(rules)
  const projection = reach && headerProjection(reach)
  if (projection) css.push(scoped(root, projection))
  const navigationMotion = new Set(normalized.flatMap(rule =>
    rule.target === 'top-nav-item' && rule.state && (!mode || !rule.mode || rule.mode === mode)
      ? Object.keys(rule.declarations).filter(name => navigationStateMotion.test(name)) : []))
  if (navigationMotion.size) {
    const geometry = [...navigationMotion].map(name =>
      `${name} calc(var(--sy-motion-replace) * var(--sy-motion-tempo, 1)) var(--sy-ease-move, var(--sy-ease-settle))`)
    const transitions = ['background-color var(--sy-duration) var(--sy-ease-settle)', 'color var(--sy-duration) var(--sy-ease-settle)', ...geometry]
    const height = navigationMotion.has('height') ? '--sy-navigation-item-height-motion: enabled; interpolate-size: allow-keywords; ' : ''
    const selector = `:scope:not([data-sy-navigation-measuring]) :where(${brandRuleTargets['top-nav-item'].selector}):not(:where([data-sy-reduced-motion], [data-sy-reduced-motion] *))`
    css.push(`@media (prefers-reduced-motion: no-preference) {\n${scoped(root,
      `  ${selector} { ${height}transition: ${transitions.join(', ')}; }`)}\n}`)
  }
  for (const rule of normalized) {
    if (mode && rule.mode && rule.mode !== mode) continue
    const target: Target = brandRuleTargets[rule.target]
    const attributes = Object.entries(rule.when ?? {}).map(([key, value]) => {
      const axis = target.variants![key]!
      return 'attribute' in axis ? `[${axis.attribute}="${value}"]` : axis.selector(value)
    }).join('')
    const state = rule.state?.split('+').map(name => target.states![name]).join('') ?? ''
    const selector = `${target.selector}${attributes}${state}`
    const declarations = projectRuleDeclarations(rule, selector, frames.get(brandRuleKey(rule)))
    if (!declarations.length) continue
    if (rule.declarations.background || rule.declarations['background-color']) {
      for (const { part, bar, frame } of headerRoutes) {
        if (part === rule.target) declarations.push(`  :where(${bar} > ${frame ? frame + ' > ' : ''}.sy-navbar) { background: transparent; }`)
      }
    }
    const line = declarations.join('\n')
    if (mode || !root || !rule.mode) {
      css.push(scoped(root, line))
      continue
    }
    const explicit = `${root}[data-sy-theme="${rule.mode}"]`
    css.push(scoped(rule.mode === defaultMode ? `${explicit}, ${root}:not([data-sy-theme])` : explicit, line))
    css.push(`@media (prefers-color-scheme: ${rule.mode}) {\n${scoped(`${root}[data-sy-theme="system"]`, line)}\n}`)
  }
  return css.join('\n')
}
