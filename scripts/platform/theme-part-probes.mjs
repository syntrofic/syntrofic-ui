import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { editorGroups, themePartSupportsMedia } from './theme-editor.mjs'

const defaults = { variant: 'primary', size: 'md', elevation: 'none', orientation: 'horizontal', type: 'text',
  tone: 'neutral', parity: 'odd', level: '2', direction: 'horizontal', mode: 'field' }
const tableRow = 'table-row'
const sharedParts = new Set(['field', 'button-primary', 'button-secondary', 'button-ghost', 'button-danger'])
const optionPanels = {
  'selector-option-row': 'sy-select__popup', 'typeahead-option': 'sy-base-typeahead__options',
  'combobox-option': 'sy-floating-panel sy-candidates', 'listbox-option': 'sy-listbox',
}
const fields = ['input', 'textarea', 'select', 'date-input', 'number-input']
const choices = { checkbox: 'sy-checkbox__box', radio: 'sy-radio__ring', switch: 'sy-switch__track' }
const choiceIndicators = { 'checkbox-indicator': 'checkbox', 'radio-indicator-dot': 'radio', 'switch-thumb': 'switch' }
const placementsByPart = {
  'top-nav': ['standalone', 'app-shell-header', 'layout-header', 'layout-header-scrollable', 'layout-region'],
  'layout-header': ['standalone', 'layout-header-scrollable', 'layout-region'],
  select: ['value', 'description', 'placeholder'],
  'selector-option-row': ['popup', 'choices'],
  'table-row': ['none', 'rows'],
  checkbox: ['unchecked', 'checked', 'mixed'], radio: ['unchecked', 'checked'], switch: ['unchecked', 'checked'],
  'calendar-day': ['month', 'period'],
  divider: ['plain', 'labelled'],
  'checkbox-indicator': ['checked', 'mixed'], 'radio-indicator-dot': ['checked'],
  'switch-thumb': ['unchecked', 'checked', 'dragging-on', 'dragging-off'],
}
const inputSelector = ':scope .sy-field__control'
const placeholder = (selector = null) => ({ selector, pseudo: '::placeholder' })
const optionSlots = { label: { selector: '.sy-selector-option__label' }, description: { selector: '.sy-selector-option__copy > small' } }
const comboSlots = { input: { selector: inputSelector }, placeholder: placeholder(inputSelector), trigger: { selector: '.sy-combo__action' } }
const dialogSlots = { title: { selector: '.sy-dialog__title' }, description: { selector: '.sy-dialog__description' } }
const dropSlots = {
  description: { selector: '.sy-drop-zone__description' }, icon: { selector: '.sy-drop-zone__icon', text: false },
  validation: { selector: '.sy-drop-zone__validation[data-show]' }, action: { selector: '.sy-button', properties: ['color', 'outline-color'] },
}
const navSlots = { link: { selector: '.sy-navigation-link' } }
const choiceSpinner = { selector: '.sy-spinner', text: false }
const checkmark = { pseudo: '::after', when: '.sy-choice:not([data-loading]) > .sy-choice__input:checked:not(:indeterminate) + *', properties: ['border-right-color'] }
const mixedMark = { pseudo: '::before', when: '.sy-choice:not([data-loading]) > .sy-choice__input:indeterminate + *', properties: ['border-bottom-color'] }
const radioDot = { pseudo: '::after', when: '.sy-choice:not([data-loading]) > .sy-choice__input:checked + *', properties: ['background-color'] }
const checkboxInk = { primary: true, aliases: { 'background-color': 'color' }, fill: 'stroke' }
const controlIcon = { primary: true, fill: 'stroke', properties: ['color'] }
const choiceRestPlacements = { rest: 'unchecked', selected: 'checked', mixed: 'mixed' }
const mediaBrand = 'theme-inspection-media'
const paginationFrame = { selector: ':scope > .sy-pagination__controls', text: false, properties: [
  'border', 'border-width', 'border-color', 'border-radius', 'box-shadow', 'background-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
] }
const separatorLine = { when: '[data-labelled]', text: false, properties: ['background-color', 'min-height', 'min-width'] }
const slots = {
  button: { startIcon: { selector: '.sy-button__start > .sy-icon', properties: ['color'], fill: 'stroke' },
    endIcon: { selector: '.sy-button__end > .sy-icon', properties: ['color'], fill: 'stroke' } },
  input: { placeholder: placeholder() }, textarea: { placeholder: placeholder() },
  select: { ...optionSlots, placeholder: { selector: ':scope[data-placeholder] > .sy-select__value' } },
  'selector-indicator-icon': { icon: { ...controlIcon, properties: ['color', 'border-bottom-color'] } },
  'input-group': { input: { selector: inputSelector }, placeholder: placeholder(inputSelector), prefix: { selector: '.sy-input-group__affix' },
    status: { selector: '.sy-field-status-icon' } },
  combobox: comboSlots, tokenizer: comboSlots,
  'file-input': dropSlots, 'drop-zone': dropSlots,
  card: { header: { selector: '.sy-card__header' }, body: { selector: '.sy-card__body' } },
  dialog: dialogSlots, 'dialog-header': dialogSlots,
  'dialog-header-close-icon': { icon: controlIcon },
  toast: { title: { selector: '.sy-toast__title' }, description: { selector: '.sy-toast__description' } },
  'toast-close': { icon: { selector: '.sy-toast__close-icon', fill: 'stroke', properties: ['color'] } },
  banner: { title: { selector: '.sy-banner__message > strong' }, description: { selector: '.sy-banner__message > p' } },
  'resize-handle': { divider: { pseudo: '::before', properties: ['background-color'] },
    pill: { selector: '.sy-shell-resize__pill', properties: ['background-color'] } },
  checkbox: { checkmark, mixedMark, spinner: choiceSpinner },
  radio: { dot: radioDot, spinner: choiceSpinner },
  switch: { thumb: { selector: '.sy-switch__thumb', properties: ['background-color'] }, spinner: choiceSpinner },
  'checkbox-indicator': { checkmark: { ...checkmark, ...checkboxInk }, mixedMark: { ...mixedMark, ...checkboxInk } },
  'radio-indicator-dot': { indicator: { ...radioDot, primary: true, fill: true } },
  'switch-thumb': { indicator: { properties: ['background-color'], fill: true } },
  'top-nav': navSlots, 'app-shell-header': navSlots, 'layout-header': navSlots,
  'menu-item': { label: { selector: '.sy-menu__copy > span' }, description: { selector: '.sy-menu__copy > small' } },
  'table-row': { cell: { selector: ':scope > td', properties: ['color', 'box-shadow'] } },
  'table-header-cell': { label: { selector: '.sy-table__sort', properties: ['color', 'font-size', 'font-weight', 'text-transform'] } },
  'progress-bar-track': { indicator: { fill: true, properties: ['background-color'],
    selector: ':is(.sy-measure:not([data-indeterminate]) .sy-measure__fill, .sy-measure[data-indeterminate] .sy-measure__sweep > span)' } },
  'progress-bar-fill': { indicator: { fill: true, properties: ['background-color'] } },
  'progress-bar-sweep': { indicator: { fill: true, properties: ['background-color'] } },
  divider: { start: { ...separatorLine, pseudo: '::before' }, end: { ...separatorLine, pseudo: '::after' } },
  pagination: { controls: paginationFrame },
}

export function themeMediaCases(part, cases) {
  return themePartSupportsMedia(part) ? cases.map(sample => ({ ...sample, surface: 'media' })) : []
}

export function themeMediaFixture(sample, body, id = mediaBrand, mode = 'system') {
  return sample.surface === 'media' ? h('div', {
    'data-sy-brand': id, 'data-sy-theme': mode, class: 'sy-media-theme',
    style: { background: 'var(--sy-canvas)', color: 'var(--sy-text)', fontFamily: 'var(--sy-font)', display: 'flow-root' },
  }, [body]) : body
}

export function themeMediaPalette(ui, theme, mode, id = mediaBrand) {
  return ui.exportBrandTheme({ ...ui.resolveBrandMediaTheme(theme, mode), id })['theme.css']
}

export function prepareThemeLightbox() {
  for (const dialog of document.querySelectorAll('[data-lookup-lightbox] > dialog.sy-lightbox')) {
    dialog.setAttribute('open', '')
    dialog.setAttribute('data-visible', '')
    dialog.setAttribute('data-settled', '')
  }
}

export function themePartSlots(part) {
  if (part.startsWith('button-') && sharedParts.has(part)) return slots.button
  if (editorGroups.menus.includes(part)) return { entry: { selector: '.sy-menu__item, .sy-select__option, .sy-collection__option, .sy-menu-sheet__action' } }
  return slots[part] ?? (Object.hasOwn(optionPanels, part) ? optionSlots : {})
}

export function distinctThemeParts(ui) {
  return Object.entries(ui.brandRuleTargets).filter(([part]) => !sharedParts.has(part))
}

export function themePartCases(library, part) {
  if (part === 'field') return fields.flatMap(field => themePartCases(library, field).map(sample => ({ ...sample, field })))
  const target = library.brandRuleTargets[part]
  let conditions = [{}]
  for (const [axis, { values }] of Object.entries(target.variants ?? {})) {
    const initial = axis === 'tone' && part.startsWith('progress-bar-') ? 'accent' : defaults[axis]
    const ordered = [initial, ...values.filter(value => value !== initial)].filter(value => values.includes(value))
    conditions = conditions.flatMap(when => ordered.map(value => ({ ...when, [axis]: value })))
  }
  const states = ['rest', ...library.brandRuleStates(part)]
  const placements = placementsByPart[part] ?? [undefined]
  return placements.flatMap(placement => {
    const samples = Object.hasOwn(choices, part)
      ? states.filter(state => !Object.hasOwn(choiceRestPlacements, state) || choiceRestPlacements[state] === placement)
      : states
    return conditions.flatMap(when => samples.filter(state => {
      const names = state.split('+')
      if (part === 'checkbox-indicator') return (when.checked === 'checked') === (placement === 'checked')
        && (!names.includes('mixed') || placement === 'mixed')
        && (!names.some(name => name === 'checked' || name === 'selected') || placement === 'checked')
      if (part === 'switch-thumb') {
        const dragging = placement.startsWith('dragging')
        const on = placement === 'checked' || placement === 'dragging-on'
        return dragging === names.includes('dragging') && (!names.includes('selected') || on) && (!names.includes('unchecked') || !on)
      }
      if (part === 'pagination-item' && state === 'selected') return ['pages', 'dots'].includes(when.variant)
      if (part === 'calendar-day') {
        if (state === 'outside-view') return placement === 'month'
        if (['in-range', 'range-start', 'range-end', 'highlighted'].includes(state)) return when.variant === 'range'
      }
      return state !== 'striped' || when.parity !== 'odd'
    })
      .map(state => ({ part, when, state, ...(placement && { placement }) })))
  })
}

function calendarDaySpecimen(when, state, placement) {
  const range = when.variant === 'range'
  const period = placement === 'period'
  const selected = ['selected', 'in-range', 'range-start', 'range-end'].includes(state)
  const day = h(period ? 'button' : 'div', {
    class: 'sy-calendar__day', role: 'button', type: period ? 'button' : undefined, tabindex: -1,
    'data-selected': selected || undefined,
    'data-selection-start': (state === 'range-start' || range && state === 'selected') || undefined,
    'data-selection-end': state === 'range-end' || undefined,
    'data-highlighted': state === 'highlighted' || undefined,
    'data-today': state === 'today' || undefined, 'data-outside-view': state === 'outside-view' || undefined,
    'data-disabled': state === 'disabled' || undefined, 'data-unavailable': state === 'unavailable' || undefined,
    'aria-disabled': ['disabled', 'unavailable'].includes(state) || undefined,
  }, '24')
  // Match the cell position and the two trigger elements used by the runtime calendars.
  const calendar = h('div', {
    class: ['sy-calendar', period && 'sy-calendar--period'], 'data-sy-calendar-selection': when.variant,
    'data-range': range && period || undefined, style: { padding: 0, width: '112px' },
  }, h('div', { class: period ? 'sy-calendar__stack' : 'sy-calendar__month' },
    h('table', { class: 'sy-calendar__grid' }, h('tbody', h('tr', [
      h('td', { class: 'sy-calendar__cell' }), h('td', { class: 'sy-calendar__cell' }, day), h('td', { class: 'sy-calendar__cell' }),
    ])))))
  return when.context === 'picker' ? h('div', { class: 'sy-floating-panel sy-calendar-popup' }, calendar) : calendar
}

export function themePartSpecimen(ui, { part, when, state, placement, interaction, invalid }, index, copy = {}) {
  const names = state.split('+')
  const has = name => names.includes(name)
  const simulated = [...new Set([...names, ...(has('active') && part !== 'toggle-button' ? ['hover'] : []), ...(has('focus-visible') ? ['focus'] : [])])]
  const attrs = { 'data-lookup-sample': index, 'data-theme-state': interaction ?? simulated.join(' ') }
  for (const [axis, value] of Object.entries(when)) {
    const attribute = ui.brandRuleTargets[part].variants?.[axis]?.attribute
    if (attribute) attrs[attribute] = value
  }
  const { label = 'Example', description = 'Supporting text', workspace = 'Workspace', invalidField = 'Invalid field', invalidFile = 'Invalid file',
    openOptions = 'Open options', close = 'Close' } = copy
  const button = attrs => h(ui.SButton, attrs, { default: () => label })
  const node = (tag, classes, extra, children = label) => h(tag, { class: classes, ...attrs, ...extra }, children)
  const wrapped = child => h('div', { ...attrs, 'data-lookup-wrapper': '' }, [child])
  const disabled = has('disabled') || undefined
  const busy = has('loading') || undefined
  const selected = has('selected') || undefined
  const input = { disabled, 'aria-invalid': invalid || state === 'invalid' || undefined, 'aria-busy': busy }
  if (part === 'calendar-day') return wrapped(calendarDaySpecimen(when, state, placement))
  if (part === 'divider') {
    return wrapped(h('div', { style: { display: 'flex', flexDirection: when.orientation === 'vertical' ? 'row' : 'column', minHeight: '2rem' } }, [
      h(ui.SSeparator, { tone: when.variant, orientation: when.orientation, label: placement === 'labelled' ? label : undefined }),
    ]))
  }
  if (part === 'dropdown-menu-divider') {
    const context = when.context === 'context'
    const divider = h(ui.SSeparator, { tone: when.variant, class: 'sy-menu__separator' })
    if (when.presentation === 'sheet') return wrapped(h('div', {
      class: ['sy-menu-sheet', context && 'sy-context-menu__sheet'],
    }, [h('div', { class: 'sy-menu-sheet__items' }, [divider])]))
    return wrapped(h('div', { class: ['sy-floating-panel sy-menu', context && 'sy-context-menu__panel'] }, [divider]))
  }
  if (part.startsWith('progress-bar-')) {
    return wrapped(h(ui.SProgressBar, { size: when.size, tone: when.tone, value: 64, showValue: false,
      indeterminate: part === 'progress-bar-sweep' || state === 'indeterminate', 'aria-label': label }))
  }
  if (part === 'button' || part.startsWith('button-') && part !== 'button-group') {
    return h(ui.SButton, { ...attrs, variant: when.variant ?? part.slice(7), size: when.size, elevation: when.elevation,
      disabled, loading: busy, 'data-sy-press': state === 'active' ? 'held' : undefined }, {
      start: () => h(ui.SIcon, { name: 'plus' }), end: () => h(ui.SIcon, { name: 'chevronRight' }), default: () => label,
    })
  }
  if (part === 'toggle-button') {
    const toggle = extra => h(ui.SToggleButton, { ...extra, label, icon: 'plus', pressedIcon: 'check', pressedTone: when.tone,
      disabled, loading: busy, 'data-sy-press': has('active') ? 'held' : undefined })
    if (has('grouped')) return wrapped(h(ui.SToggleButtonGroup, { modelValue: has('pressed') ? 'sample' : undefined, label }, {
      default: () => toggle({ value: 'sample' }),
    }))
    return toggle({ ...attrs, modelValue: has('pressed') })
  }
  if (part === 'toggle-button-group') {
    return h(ui.SToggleButtonGroup, { ...attrs, label, orientation: when.orientation, size: when.size, disabled, modelValue: 'first',
      items: [{ value: 'first', label }, { value: 'second', label: workspace }] })
  }
  if (part === 'button-group') {
    return h(ui.SButtonGroup, { ...attrs, orientation: when.orientation, elevation: when.elevation }, { default: () => [button({}), button({})] })
  }
  if (part === 'code-block-copy-button') return wrapped(h(ui.SCodeBlock, { code: 'const status = "Ready"', language: 'javascript' }))
  if (part === 'badge') return h(ui.SBadge, { ...attrs, tone: when.tone }, { default: () => label })
  if (part === 'lightbox') return h('div', { ...attrs, 'data-lookup-wrapper': '', 'data-lookup-lightbox': '' }, [
    h(ui.SLightbox, { open: true, label, zoom: false, media: {
      id: 'sample-image', src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E',
      alt: label, caption: description,
    } }),
  ])
  if (part === 'lightbox-caption-panel') return h('figure', { class: 'sy-lightbox__figure', style: { minBlockSize: '9rem' } }, [
    h('figcaption', { class: 'sy-lightbox__caption' },
      node('section', 'sy-lightbox__caption-panel', {}, [h('header', [h('strong', label)]), h('p', description)])),
  ])
  if (part === 'banner' || part === 'banner-icon') return wrapped(h(ui.SBanner, { tone: when.tone, variant: when.variant, title: label, description }))
  if (part === 'toast' || part === 'toast-close') {
    const own = part === 'toast-close'
    return h('div', { ...(!own && attrs), class: 'sy-toast', 'data-tone': when.tone,
      'data-state': own || state === 'open' ? 'open' : 'closed', style: { position: 'relative' } }, [
      h('div', { class: 'sy-toast__copy' }, [
        h('div', { class: 'sy-toast__title' }, label),
        !own && h('div', { class: 'sy-toast__description' }, description),
      ]),
      when.tone === 'loading' && h('div', { class: 'sy-toast__loading', 'data-visible': '', 'aria-hidden': true },
        [h(ui.SSpinner, { size: 'sm', decorative: true })]),
      own && h(ui.SButton, { ...attrs, class: 'sy-toast__close', size: 'sm', variant: 'ghost', disabled, 'aria-label': close }, {
        default: () => h('span', { class: 'sy-toast__close-icon', 'aria-hidden': true }, '×'),
      }),
    ])
  }
  if (part === 'card') return h(ui.SCard, { ...attrs, variant: when.variant, elevation: when.elevation }, {
    header: () => h('strong', label), default: () => description,
  })
  if (part === 'heading') return when.type === 'standard' ? node('h' + when.level, undefined, {})
    : h(ui.SHeading, { ...attrs, level: Number(when.level), type: when.type }, { default: () => label })
  if (part === 'body') return node('div', 'sy-card__body', {})
  if (part === 'code') return node('code', undefined, {})
  if (part === 'input-focus-ring') {
    const error = when.status === 'error'
    return wrapped(h('div', { class: 'sy-field', 'data-field-status': when.status === 'default' ? undefined : when.status,
      'data-invalid': error || undefined }, [themePartSpecimen(ui, {
      part: when.kind, when: { size: 'md', type: 'text', variant: 'input' }, state, interaction, invalid: error,
    }, undefined, copy)]))
  }
  if (part === 'input' || part === 'textarea') {
    return h('div', { class: 'sy-field' }, [
      node(part === 'input' ? 'input' : 'textarea', part === 'input' ? 'sy-field__control' : 'sy-field__control sy-textarea', {
        ...input, placeholder: label, ...(part === 'input' && { type: when.type }),
      }, null),
    ])
  }
  if (part === 'select' || part === 'selector-indicator-icon') {
    const own = part === 'selector-indicator-icon'
    const empty = placement === 'placeholder'
    const open = state === 'open' || state === 'expanded'
    return h('div', { class: 'sy-select', 'data-variant': when.variant }, [
      h('button', { ...(!own && attrs), class: 'sy-field__control sy-select__control', ...input, 'data-size': when.size,
        'data-theme-state': attrs['data-theme-state'], 'aria-expanded': open, 'data-state': open ? 'open' : 'closed',
        'data-description': placement === 'description' || undefined, 'data-placeholder': empty || undefined }, [
        h('span', { class: 'sy-select__value' }, empty ? label : [h(ui.SSelectorOption, { label, description: placement === 'description' ? description : undefined })]),
        h('span', { ...(own && attrs), class: 'sy-select__arrow', 'aria-hidden': 'true' }),
      ]),
    ])
  }
  if (part === 'complex-selector') return node('button', 'sy-complex-select__trigger', { ...input, 'aria-expanded': state === 'open' })
  if (part === 'input-group') return h(ui.SInputGroup, { ...attrs, size: when.size, disabled, 'aria-busy': busy,
    status: state === 'invalid' ? { type: 'error', message: invalidField } : undefined }, {
    start: () => h(ui.SInputGroupText, {}, { default: () => 'PRJ-' }),
    default: () => h(ui.SInput, { label, hideLabel: true, placeholder: label, ...input, 'data-theme-state': attrs['data-theme-state'] }),
  })
  if (part === 'typeahead') return node('input', 'sy-base-typeahead__input', { ...input, value: label }, null)
  if (part === 'combobox' || part === 'tokenizer') {
    const combo = node('div', 'sy-combo', { ...input, disabled: undefined, 'data-disabled': disabled }, [
      h('input', { class: 'sy-field__control', placeholder: label, ...input, 'data-theme-state': attrs['data-theme-state'] }),
      h('button', { class: 'sy-combo__action', 'aria-label': openOptions }, [h('span', { class: 'sy-disclosure__arrow' })]),
    ])
    return part === 'tokenizer' ? h('div', { class: 'sy-tokenizer' }, [combo]) : combo
  }
  if (part === 'file-input' || part === 'drop-zone') return h('div', {
    class: part === 'file-input' ? 'sy-file-input sy-drop-zone' : 'sy-drop-zone',
    'data-mode': when.mode, 'data-compact': when.mode === 'field' || undefined,
  }, [node('div', 'sy-drop-zone__area', { ...input, disabled: undefined, 'aria-disabled': disabled,
    'data-disabled': disabled, 'data-dragging': state === 'dragging' || undefined }, [
    h('span', { class: 'sy-drop-zone__icon', 'aria-hidden': 'true' }, '↥'),
    h('div', { class: 'sy-drop-zone__copy' }, [h('strong', { class: 'sy-drop-zone__label' }, label),
      h('span', { class: 'sy-drop-zone__description' }, description)]),
    button({ size: 'sm', variant: 'secondary', disabled, 'data-theme-state': attrs['data-theme-state'] }),
    ...(state === 'invalid' ? [h('div', { class: 'sy-drop-zone__validation', 'data-show': '' }, [h('div', invalidFile)])] : []),
  ])])
  if (part === 'date-input' || part === 'number-input') {
    const number = part === 'number-input'
    return h('div', { class: 'sy-field', 'data-invalid': state === 'invalid' || undefined }, [
      node('div', number ? 'sy-stepped-field' : 'sy-date-control', { ...input, disabled: undefined, 'data-disabled': disabled }, [
        h('input', { class: number ? 'sy-stepped-field__value' : 'sy-date-control__segment', ...input, 'data-theme-state': attrs['data-theme-state'] }),
      ]),
    ])
  }
  if (Object.hasOwn(choices, part) || Object.hasOwn(choiceIndicators, part)) {
    const kind = choiceIndicators[part] ?? part
    const thumb = part === 'switch-thumb'
    const dragging = thumb && placement.startsWith('dragging')
    const spinner = busy ? [h(ui.SSpinner, { size: 'sm', decorative: true })] : []
    const mark = kind === 'switch' ? [h('span', { class: 'sy-switch__thumb', ...(thumb && attrs) }, spinner)] : spinner
    const surface = { 'aria-hidden': 'true', ...(dragging && { 'data-dragging': '', 'data-preview': placement === 'dragging-on' ? 'true' : 'false' }) }
    return h('label', { class: 'sy-choice', 'data-theme-state': attrs['data-theme-state'], 'data-size': when.size, 'data-loading': busy }, [
      h('input', { class: 'sy-choice__input', type: kind === 'radio' ? 'radio' : 'checkbox', ...input, checked: placement === 'checked' || placement === 'dragging-off',
        role: kind === 'switch' ? 'switch' : undefined,
        'data-theme-state': attrs['data-theme-state'], ...(placement === 'mixed' && { 'data-lookup-indeterminate': '' }) }),
      thumb ? h('span', { class: choices[kind], ...surface }, mark) : node('span', choices[kind], surface, mark),
      h('span', { class: 'sy-choice__label' }, label),
    ])
  }
  if (part === 'tab-list') return wrapped(h(ui.STabs, { tabs: [{ value: 'example', label }], label, ...when }))
  if (part === 'tab-indicator') return h('div', { class: 'sy-tabs', 'data-size': when.size, 'data-orientation': when.orientation }, [
    h('div', { class: 'sy-tabs__list', 'data-size': when.size, 'data-orientation': when.orientation, 'data-tab-indicator': when.variant }, [
      h('div', { class: 'sy-tabs__indicator-track', 'aria-hidden': 'true', style: {
        '--reka-tabs-indicator-size': 'calc(100% - 6px)', '--reka-tabs-indicator-thickness': 'calc(100% - 6px)',
        '--reka-tabs-indicator-position': '3px',
      } }, [node('span', 'sy-tabs__indicator', {}, null)]),
      h('button', { class: 'sy-tabs__trigger', role: 'tab', 'aria-selected': 'true', 'data-state': 'active' }, label),
    ]),
  ])
  if (part === 'tab') return h('div', { class: 'sy-tabs', 'data-size': 'md' }, [
    h('div', { class: 'sy-tabs__list', 'data-size': 'md', 'data-orientation': 'horizontal' }, [
      node('button', 'sy-tabs__trigger', { role: 'tab', 'aria-selected': selected, 'data-state': selected ? 'active' : 'inactive', disabled }),
    ]),
  ])
  if (['pagination', 'pagination-list', 'pagination-item'].includes(part)) {
    const pagination = h(ui.SPagination, { ...(part === 'pagination' ? attrs : {}), size: when.size, variant: when.variant,
      total: 5, defaultPage: 2, disabled, label })
    return part === 'pagination' ? pagination : wrapped(pagination)
  }
  if (part === 'resize-handle' || part === 'resize-handle-pill') {
    const axis = when.direction
    const interaction = { 'data-theme-state': attrs['data-theme-state'], 'data-dragging': state === 'active' || undefined }
    return h('div', { style: { position: 'relative', display: 'flex', minHeight: '72px', padding: '12px' } }, [
      part === 'resize-handle'
        ? h(ui.SResizeHandle, { ...attrs, ...interaction, axis, controls: 'resize-example-' + index, label, disabled,
          position: 'overlay', pillPlacement: 'center', hasDivider: true })
        : h('div', { class: 'sy-shell-resize', 'data-resize-axis': axis, 'aria-disabled': disabled, ...interaction }, [
          node('span', 'sy-shell-resize__grip sy-shell-resize__pill', { 'data-side': 'center' }, null),
        ]),
    ])
  }
  if (part === 'table-header-cell') return wrapped(h(ui.STable, { label, rows: [{ value: description }],
    columns: [{ key: 'value', label, sortable: true, value: row => row.value }], rowKey: row => row.value,
    sort: state === 'sorted' ? { key: 'value', direction: 'ascending' } : undefined,
  }))
  if (part === tableRow || part === 'table-cell') {
    const row = { 'data-sy-row-parity': when.parity, 'data-selected': selected, 'data-stripe': state === 'striped' || undefined,
      'data-theme-state': attrs['data-theme-state'] }
    const cell = { 'data-table-column-key': 'value' }
    return h('div', { class: 'sy-table', 'data-hover-rows': '', 'data-row-details': '', 'data-dividers': placement }, [
      h('div', { class: 'sy-table__scroll' }, [h('table', { class: 'sy-table__grid' }, [h('tbody', [
        part === tableRow ? node('tr', undefined, row, h('td', cell, label)) : h('tr', row, [node('td', undefined, cell)]),
      ])])]),
    ])
  }
  if (part === 'dialog' || part === 'dialog-header') {
    const title = [h('h2', { class: 'sy-dialog__title' }, label), h('p', { class: 'sy-dialog__description' }, description)]
    return h('section', { class: 'sy-dialog', 'data-size': 'md', 'data-visible': (part === 'dialog-header' || state === 'open') || undefined }, [
      part === 'dialog' ? node('div', 'sy-dialog__panel', {}, [h('header', { class: 'sy-dialog__header' }, title), h('div', { class: 'sy-dialog__body' }, label)])
        : h('div', { class: 'sy-dialog__panel' }, [node('header', 'sy-dialog__header', {}, title)]),
    ])
  }
  if (part === 'dialog-header-title-block') {
    return wrapped(h('section', { class: 'sy-dialog', 'data-size': 'sm', 'data-visible': '' }, [
      h('div', { class: 'sy-dialog__panel' }, [
        when.variant === 'hero' ? h(ui.SDialogHeroHeader, { title: label }, {
          media: () => h('div', { style: { minHeight: '32px', background: 'var(--sy-surface-muted)' } }),
        }) : h('header', { class: 'sy-dialog__header' }, [h('h2', { class: 'sy-dialog__title' }, label)]),
      ]),
    ]))
  }
  if (part === 'dialog-header-close-icon') {
    const control = { disabled, 'data-theme-state': attrs['data-theme-state'] }
    return wrapped(h('section', { class: 'sy-dialog', 'data-size': 'sm', 'data-visible': '' }, [
      h('div', { class: 'sy-dialog__panel' }, [
        when.variant === 'hero'
          ? h('header', { class: 'sy-dialog-hero' }, [
            h('div', { class: 'sy-dialog-hero__media', style: { minHeight: '44px', background: 'var(--sy-surface-muted)' } }, [
              h(ui.SCloseButton, { ...control, class: 'sy-dialog-hero__close', label: close }),
            ]),
            h('h2', { class: 'sy-dialog__title' }, label),
          ])
          : h('header', { class: 'sy-dialog__header' }, [
            h('h2', { class: 'sy-dialog__title' }, label),
            h(ui.SButton, { ...control, class: 'sy-dialog__close', variant: 'ghost', size: 'sm' }, {
              start: () => h('span', { class: 'sy-dialog__close-icon', 'aria-hidden': true }, '×'), default: () => close,
            }),
          ]),
      ]),
    ]))
  }
  if (part === 'popover') return node('div', 'sy-floating-panel sy-popover', { 'data-state': state === 'open' ? 'open' : undefined })
  if (part === 'tooltip') return node('div', 'sy-tooltip', { 'data-state': state === 'open' ? 'instant-open' : undefined })
  if (editorGroups.menus.includes(part)) {
    const variant = when.variant
    const open = state === 'open' ? 'open' : undefined
    if (part === 'dropdown-menu' || part === 'context-menu') {
      const sheet = variant === 'sheet'
      return node('div', sheet ? 'sy-panel sy-menu-sheet' : ['sy-floating-panel sy-menu', part === 'context-menu' && 'sy-context-menu__panel'], {
        role: sheet ? 'dialog' : 'menu', 'aria-label': label, 'data-state': open, 'data-menu-variant': sheet ? undefined : variant,
      }, [sheet ? h(ui.SButton, { variant: 'ghost', class: 'sy-menu-sheet__action' }, { default: () => label })
        : h('div', { class: 'sy-menu__item', role: 'menuitem' }, label)])
    }
    const typeahead = part === 'typeahead-dropdown'
    const multi = part === 'multi-selector-popup'
    const selection = multi ? 'multiple' : 'single'
    const native = variant === 'dropdown'
    const candidate = variant === 'candidates'
    const entry = h('div', { role: 'option', class: native ? 'sy-select__option' : 'sy-collection__option' }, label)
    const content = h('div', { role: 'listbox', class: typeahead ? candidate ? undefined : 'sy-base-typeahead__results'
      : native ? 'sy-select__list' : 'sy-select-choices', 'data-menu-selection': !typeahead && !native ? selection : undefined }, [entry])
    const frame = native ? 'sy-select__popup' : variant === 'sheet' ? 'sy-panel sy-select-sheet sy-select-sheet--' + selection
      : candidate ? 'sy-floating-panel sy-candidates' : 'sy-floating-panel sy-popover'
    return node('div', frame, { 'data-state': open, 'data-multiple': native && multi || undefined }, [content])
  }
  if (part === 'menu-item') {
    return h('div', { class: 'sy-menu', role: 'menu' }, [node('div', 'sy-menu__item', {
      role: 'menuitemcheckbox', 'aria-checked': selected, 'aria-disabled': disabled, 'data-highlighted': state === 'highlighted' || undefined,
      'data-tone': when.tone === 'danger' ? 'danger' : undefined,
    }, h('span', { class: 'sy-menu__copy' }, [h('span', label), h('small', description)]))])
  }
  if (Object.hasOwn(optionPanels, part)) {
    const selector = part === 'selector-option-row'
    const row = node('div', selector ? 'sy-select__option' : 'sy-collection__option', {
        role: 'option', 'aria-selected': selected, 'data-state': selected ? 'checked' : 'unchecked',
        'aria-disabled': disabled, 'data-disabled': disabled, 'data-highlighted': state === 'highlighted' || undefined,
      }, h(ui.SSelectorOption, { label, description, disabled }))
    if (!selector) return h('div', { class: optionPanels[part], role: 'listbox' }, [row])
    return placement === 'choices' ? h('div', { class: 'sy-select-choices' }, [h('div', { class: 'sy-select-choices__viewport', role: 'listbox' }, [row])])
      : h('div', { class: 'sy-select__popup' }, [h('div', { class: 'sy-select__list', role: 'listbox',
        'data-highlighted': state === 'highlighted' || undefined }, [row])])
  }
  if (part === 'top-nav-item') {
    return h('nav', { class: 'sy-navbar' }, [h('div', { class: 'sy-navbar__bar' },
      h('ul', { class: 'sy-navbar__desktop' }, [h('li', [
        node('a', 'sy-navigation-link', { href: '#example', 'aria-current': selected ? 'page' : undefined, 'aria-disabled': disabled }),
      ])]))])
  }
  if (part === 'side-nav-item') return wrapped(h('ul', { class: 'sy-sidebar__list' }, [
    h(ui.SSideNavItem, { size: when.size, label, href: '#example', current: selected, disabled }),
  ]))
  if (part === 'top-nav-heading' || part === 'top-nav-heading-title') {
    return wrapped(h(ui.SNavbar, { brand: label, brandHref: '#example', brandDescription: description }))
  }
  if (part === 'side-nav-heading' || part === 'side-nav-heading-title') {
    return wrapped(h(ui.SSideNavHeading, { heading: label, superheading: workspace, subheading: description }))
  }
  const navItems = [h('ul', { class: 'sy-navbar__desktop' }, [h('li', [h('a', { class: 'sy-navigation-link', href: '#example' }, label)])])]
  const nav = h('nav', { class: 'sy-navbar sy-navbar--compact' }, [part === 'top-nav'
    ? node('div', 'sy-navbar__bar', {}, navItems) : h('div', { class: 'sy-navbar__bar' }, navItems)])
  if (part === 'app-shell-header') return node('div', 'sy-app-layout__navbar', {}, [nav])
  if (part === 'layout-header' || part === 'top-nav' && placement !== 'standalone' && placement !== 'app-shell-header') {
    const host = part === 'layout-header' ? node : (tag, className, extra, children) => h(tag, { class: className, ...extra }, children)
    if (placement === 'layout-region') return h('div', { class: 'sy-layout' }, [
      host('div', 'sy-layout__header', {}, [h('div', { class: 'sy-layout__region-body' }, [nav])]),
    ])
    const scrollable = placement === 'layout-header-scrollable'
    return host('header', 'sy-layout-header', { 'data-scrollable': scrollable || undefined },
      scrollable ? [h('div', { class: 'sy-layout__region-content' }, [nav])] : [nav])
  }
  if (part === 'top-nav') {
    if (placement === 'app-shell-header') return h('div', { class: 'sy-app-layout__navbar' }, [nav])
    return nav
  }
  throw new Error('No theme specimen for ' + part)
}

export async function themePartProbes(library, part, scope, viewState, includeMedia = false) {
  let cases = themePartCases(library, part)
  if (scope) {
    cases = cases.filter(({ when }) => Object.entries(scope.when ?? {}).every(([axis, value]) => when[axis] === value))
    if ((scope.state === 'focus-visible' || scope.state === 'hover') && !library.brandRuleStates(part).includes('focus-visible+hover')) {
      const focused = cases.filter(({ state }) => state === scope.state)
      cases.push(...focused.map(sample => ({ ...sample, interaction: 'focus focus-visible hover' })))
    }
  }
  if (viewState) cases = cases.filter(({ state }) => state === viewState)
  if (includeMedia) cases.push(...themeMediaCases(part, cases))
  const app = createSSRApp({ render: () => h('main', cases.map((sample, index) =>
    h('div', { class: 'lookup-frame' }, [themeMediaFixture(sample, themePartSpecimen(library, sample, index))]))) })
  return { cases, markup: await renderToString(app) }
}
