import { installThemeTextContrast, lowTextContrast, measuredTextContrast } from './theme-text-contrast.mjs'
import { editorGroups, themeEditorModes } from './theme-editor.mjs'
import { readFile } from 'node:fs/promises'
import { resolveThemeFonts } from './theme-fonts.mjs'
import { prepareThemeLightbox, themeMediaPalette, themePartProbes, themePartSlots } from './theme-part-probes.mjs'
import { withThemeBrowser } from './theme-pictures.mjs'
import { embedFonts } from './theme-sheet.mjs'

async function measurePart({ properties, selectors, slots, mainText, optionText, comparison, contrastParts = [] }) {
  if (typeof CSSScopeRule !== 'function') throw new Error('Theme inspection requires a browser with CSS @scope support.')
  if (comparison !== 'paint') await document.fonts.ready
  const sides = ['top', 'right', 'bottom', 'left']
  const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
  const boxSides = property => sides.map(side => property + '-' + side)
  const borderParts = (kind, chosen = sides) => chosen.map(side => 'border-' + side + '-' + kind)
  const padding = boxSides('padding')
  const border = ['width', 'style', 'color'].flatMap(kind => borderParts(kind))
  const shorthands = {
    background: ['color', 'image', 'position-x', 'position-y', 'size', 'repeat', 'origin', 'clip', 'attachment'].map(name => 'background-' + name),
    border, 'border-width': borderParts('width'), 'border-color': borderParts('color'), 'border-style': borderParts('style'),
    outline: ['outline-width', 'outline-color', 'outline-style'],
    'border-radius': corners.map(corner => 'border-' + corner + '-radius'),
    padding, 'padding-block': [padding[0], padding[2]], 'padding-inline': [padding[3], padding[1]],
    'padding-block-start': [padding[0]], 'padding-block-end': [padding[2]],
    'padding-inline-start': [padding[3]], 'padding-inline-end': [padding[1]],
    'block-size': ['height'], 'min-block-size': ['min-height'],
    'inline-size': ['width'], 'min-inline-size': ['min-width'],
    font: ['font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'line-height'],
  }
  for (const side of sides) shorthands['border-' + side] = ['width', 'style', 'color'].map(kind => 'border-' + side + '-' + kind)
  const expanded = name => Object.hasOwn(shorthands, name) ? shorthands[name] : [name]
  const slotProperties = Object.values(slots).flatMap(({ properties, aliases }) => [
    ...(properties ?? ['color']), ...Object.values(aliases ?? {}),
  ])
  const observed = new Set([...properties, ...slotProperties].flatMap(expanded))
  const inherited = new Set(['color', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height', 'text-transform'])
  const tag = property => '--theme-lookup-origin-' + property
  const registered = new Set()
  function register(property) {
    if (registered.has(property)) return
    CSS.registerProperty({ name: tag(property), syntax: '*', inherits: false, initialValue: '0' })
    registered.add(property)
  }

  const reference = new Set()
  const declarations = [undefined]
  const sourcePriority = { core: 0, base: 1, theme: 2 }
  const states = /:(focus-visible|focus-within|focus|hover|active)(?![\w-])/g
  function walk(rules, source, scope = []) {
    for (const rule of rules) {
      if (rule.cssRules) {
        // The prelude identifies media, layer, and scope conditions without their child declarations.
        const prelude = rule.cssText.slice(0, rule.cssText.indexOf('{')).trim()
        walk(rule.cssRules, source, [...scope, prelude])
      }
      if (!('selectorText' in rule) || !rule.style) continue
      const selector = rule.selectorText
      if (source !== 'base') {
        rule.selectorText = selector.replace(states, (_, state) => state === 'focus-within'
          ? ':is(:focus-within,[data-theme-focus-within])'
          : `:is(:${state},[data-theme-state~="${state}"])`)
      }
      if (comparison) continue
      const items = [...rule.style.cssText.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map(([, name]) => name)
      for (const property of items) {
        const token = property.startsWith('--sy-')
        const watched = token ? [property] : expanded(property).filter(name => observed.has(name))
        if (!watched.length) continue
        const value = rule.style.getPropertyValue(property).trim()
        const priority = rule.style.getPropertyPriority(property)
        if (!value) continue
        const identity = JSON.stringify([scope, selector, property, value, priority])
        if (source === 'base') { reference.add(identity); continue }
        const origin = source === 'theme' && reference.has(identity) ? 'base' : source
        const entry = declarations.push({ property, value, selector, source: origin }) - 1
        for (const name of watched) {
          register(name)
          const marker = tag(name)
          if (priority || !rule.style.getPropertyPriority(marker)) rule.style.setProperty(marker, String(entry), priority)
        }
      }
    }
  }
  for (const source of ['base', 'core', 'theme']) {
    const sheet = document.querySelector(`style[data-lookup-origin="${source}"]`).sheet
    if (!comparison || source !== 'base') walk(sheet.cssRules, source)
  }
  for (const focused of document.querySelectorAll('[data-theme-state~="focus"]')) {
    for (let owner = focused; owner && !owner.hasAttribute('data-theme-focus-within'); owner = owner.parentElement) {
      owner.setAttribute('data-theme-focus-within', '')
    }
  }
  for (const node of document.querySelectorAll('[data-lookup-indeterminate]')) node.indeterminate = true
  for (const list of document.querySelectorAll('.sy-select__list[data-highlighted]')) {
    const row = list.querySelector('[data-highlighted]')
    if (!row) continue
    list.style.setProperty('--sy-option-height', row.offsetHeight + 'px')
    list.style.setProperty('--sy-option-y', row.offsetTop + 'px')
  }

  const instances = [...document.querySelectorAll('[data-lookup-sample]')].map((sample, index) => {
    const selector = selectors[index]
    const state = sample.getAttribute('data-theme-state') ?? ''
    const item = selector === '.sy-pagination__item'
    const element = item && state === 'selected' ? sample.querySelector(selector + '[aria-current="page"]')
      : sample.hasAttribute('data-lookup-wrapper') ? sample.querySelector(selector) : sample
    if (Number(sample.dataset.lookupSample) !== index || !element?.matches(selectors[index])) {
      throw new Error('A specimen does not match its theme selector')
    }
    if (sample.hasAttribute('data-lookup-wrapper')) {
      element.setAttribute('data-theme-state', state)
      if (state.split(' ').includes('focus')) element.setAttribute('data-theme-focus-within', '')
    }
    if (selector === '.sy-pagination' || selector === '.sy-pagination__controls') {
      element.querySelector('.sy-pagination__item')?.setAttribute('data-theme-state', state)
    }
    return element
  })
  function partSlots(element) {
    return Object.entries(slots).flatMap(([name, { selector, pseudo, when, properties, fill, primary, aliases }]) => {
      if (when && !element.matches(when)) return []
      const subject = selector ? element.querySelector(selector) : element
      return subject ? [{ name, subject, pseudo, properties, fill, primary, aliases }] : []
    })
  }
  const primaryPaint = element => partSlots(element).find(slot => slot.primary)
  function textContrast(element, text) {
    const subjects = partSlots(element).filter(({ name }) => contrastParts.includes(name))
    if (contrastParts.includes('text')) subjects.unshift({ name: 'text', subject: text || element })
    return Object.fromEntries(subjects.map(({ name, subject, pseudo, fill }) => [name, globalThis.themeTextContrast(element, subject, pseudo, fill)]))
  }
  if (comparison === 'paint') {
    const paint = ['background-color', 'background-image', 'color', ...borderParts('color'),
      ...properties, 'box-shadow']
    const paintValue = (style, name) => name === 'outline-color' && style.outlineStyle === 'none' ? '' : style.getPropertyValue(name)
    return instances.map(element => {
      const main = primaryPaint(element)
      const style = getComputedStyle(main?.subject ?? element, main?.pseudo)
      const paintValues = Object.fromEntries([...paint.map(name => [name, style.getPropertyValue(main?.aliases?.[name] ?? name)]), ['outline-color', paintValue(style, 'outline-color')],
        ...partSlots(element).flatMap(({ name, subject, pseudo, properties = ['color'] }) => {
          const style = getComputedStyle(subject, pseudo)
          return properties.map(property => [name + '.' + property, paintValue(style, property)])
        })])
      return { values: paintValues, contrast: textContrast(element) }
    })
  }
  if (comparison === 'font-size') return instances.map(element => {
    const text = mainText ? element.querySelector(mainText) : element
    if (!text) throw new Error('A specimen is missing its primary text')
    return { values: { 'font-size': getComputedStyle(text).fontSize } }
  })
  if (comparison === 'height') {
    function sizes(element, prefix = '') {
      const style = getComputedStyle(element)
      return [[prefix + 'height', style.height], [prefix + 'min-height', style.minHeight]]
    }
    return instances.map(element => ({ values: Object.fromEntries([...sizes(element),
      ...partSlots(element).flatMap(({ name, subject }) => name === 'input' ? sizes(subject, 'input.') : [])]) }))
  }
  if (comparison === 'styles') return instances.map(element => {
    const read = (subject, names, prefix = '', pseudo) => {
      const style = getComputedStyle(subject, pseudo)
      return names.map(property => [prefix + property, style.getPropertyValue(property)
        || expanded(property).map(name => style.getPropertyValue(name)).join(' ')])
    }
    return { values: Object.fromEntries([...read(element, properties), ...partSlots(element).flatMap(slot =>
      read(slot.subject, properties.filter(property => slot.properties?.includes(property)), slot.name + '.', slot.pseudo))]) }
  })
  const computed = new WeakMap()
  function valueOf(element, property, pseudo) {
    if (!computed.has(element)) computed.set(element, new Map())
    const styles = computed.get(element)
    if (!styles.has(pseudo)) styles.set(pseudo, getComputedStyle(element, pseudo))
    return styles.get(pseudo).getPropertyValue(property).trim()
  }
  function originOf(element, property, pseudo) {
    // Inherited custom properties resolve var() where they are declared.
    const inherits = property.startsWith('--') || inherited.has(property)
    if (pseudo) {
      const declaration = declarations[Number(valueOf(element, tag(property), pseudo))]
      if (declaration && declaration.value !== 'inherit' && !(inherits && declaration.value === 'unset')) return { owner: element, pseudo, declaration }
      if (!inherits && declaration?.value !== 'inherit') return
    }
    for (let owner = element; owner; owner = owner.parentElement) {
      const declaration = declarations[Number(valueOf(owner, tag(property)))]
      if (declaration?.value === 'inherit' || inherits && declaration?.value === 'unset') continue
      if (declaration) return { owner, declaration }
      if (!inherits) return
    }
  }
  function measure(element, properties, pseudo, aliases) {
    const cache = new Map()
    function tokens({ owner, declaration, pseudo: context }) {
      if (cache.has(declaration)) return cache.get(declaration)
      const read = new Map()
      const visited = new WeakMap()
      function follow(expression, element, pseudo) {
        if (!visited.has(element)) visited.set(element, new Set())
        const visitedHere = visited.get(element)
        const calls = /var\(\s*(--[\w-]+)/g
        for (let match; (match = calls.exec(expression));) {
          const [full, name] = match
          const start = match.index + full.length
          let end = start
          let fallback
          let depth = 1
          for (; end < expression.length && depth; end++) {
            const char = expression[end]
            if (char === '(') depth++
            else if (char === ')') depth--
            else if (char === ',' && depth === 1 && fallback === undefined) fallback = end + 1
          }
          calls.lastIndex = end
          const value = valueOf(element, name, pseudo)
          const visit = (pseudo ?? '') + name
          if (!visitedHere.has(visit)) {
            visitedHere.add(visit)
            const selected = originOf(element, name, pseudo)
            if (!read.has(name)) read.set(name, { name, value: value || null,
              ...(selected && { source: selected.declaration.source, declaration: selected.declaration.value }) })
            if (value && selected) follow(selected.declaration.value, selected.owner, selected.pseudo)
          }
          if (!value && fallback !== undefined) follow(expression.slice(fallback, end - 1), element, pseudo)
        }
      }
      follow(declaration.value, owner, context)
      const entries = [...read.values()]
      cache.set(declaration, entries)
      return entries
    }
    return Object.fromEntries(properties.map(key => {
      const property = aliases?.[key] ?? (key === 'button-style' ? '--sy-button-style' : key)
      const origins = [...new Map(expanded(property).map(name => originOf(element, name, pseudo)).filter(Boolean).map(item => [item.declaration, item])).values()]
      const declarations = origins.map(item => item.declaration)
      const references = [...new Map(origins.flatMap(tokens).map(token => [token.name, token])).values()]
      const sources = [...declarations.map(declaration => declaration.source),
        ...references.filter(token => token.value && token.source).map(token => token.source)]
      const source = sources.reduce((winner, candidate) => sourcePriority[candidate] > sourcePriority[winner] ? candidate : winner, 'core')
      const value = valueOf(element, property, pseudo)
      return [key, { value: value || null, source, declarations, tokens: references,
        ...(!value && expanded(property).length > 1 && { longhands: Object.fromEntries(expanded(property).map(name => [name, valueOf(element, name, pseudo)])) }) }]
    }))
  }
  return instances.map(element => {
    const text = mainText && element.querySelector(mainText)
    if (mainText && !text) throw new Error('A specimen is missing its primary text')
    const parts = Object.fromEntries(partSlots(element).map(({ name, subject, pseudo, properties }) =>
      [name, measure(subject, properties ?? (name === 'input' ? ['color', 'height', 'min-height'] : ['color']), pseudo)]))
    if (optionText && !parts.description) throw new Error('A specimen is missing its option description')
    const contrast = textContrast(element, text)
    const main = primaryPaint(element)
    return { styles: measure(main?.subject ?? (text || element), properties, main?.pseudo, main?.aliases), ...(Object.keys(parts).length && { parts }),
      ...(Object.keys(contrast).length && { contrast }),
      ...(optionText && { description: parts.description.color }) }
  })
}

export function themeContrastParts(library, part) {
  const target = library.brandRuleTargets[part]
  const slots = Object.entries(themePartSlots(part))
  const childText = slots.filter(([name, { properties, text, fill }]) =>
    fill || name !== 'trigger' && name !== 'status' && text !== false && (!properties || properties.includes('color'))).map(([name]) => name)
  if (target.optionText || editorGroups.menus.includes(part) || ['input-group', 'combobox', 'tokenizer', 'table-row'].includes(part)) return childText
  if (['button-group', 'checkbox', 'radio', 'switch', 'toast-close'].includes(part) || part.startsWith('resize-handle')
    || slots.some(([, slot]) => slot.primary) || !Object.hasOwn(target.properties, 'color') && !target.textSize) return childText
  return ['text', ...childText]
}

export async function documentFor({ style, comparison = '', palette, markup, mode, theme, fonts, cached }) {
  const css = text => text.replace(/<\/style/gi, '<\\/style')
  const core = await embedFonts(style, markup, cached)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <style data-lookup-origin="base" media="not all">${css(comparison)}</style>
    <style data-lookup-origin="core">${css(core)}\nbody{background:var(--sy-canvas);color:var(--sy-text);font-family:var(--sy-font)}</style>
    <style data-lookup-origin="theme">${css(fonts.css + '\n' + palette)}</style>
    <style>.lookup-frame{display:flow-root;padding:4px 16px}.sy-dialog,.sy-menu,.sy-tooltip,.sy-popover{position:relative}
      *,*::before,*::after,*::placeholder{transition:none!important;animation:none!important}</style>
    </head><body data-sy-brand="${theme}" data-sy-theme="${mode}">${markup}</body></html>`
}

export async function themePartReport(directory, library, theme, base, part, scope = {}) {
  const target = library.brandRuleTargets[part]
  const properties = scope.properties ?? [...new Set([...Object.keys(target.properties), ...Object.values(target.tokenProperties ?? {}).flat()])]
  const [{ cases, markup }, style, fonts] = await Promise.all([
    themePartProbes(library, part, { when: scope.when }, scope.state, true), readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8'),
    resolveThemeFonts(directory, [theme]),
  ])
  if (!cases.length) throw new Error('No rendered variants of ' + part + ' match that scope')
  const css = library.exportBrandTheme(theme)['theme.css']
  const baselineRules = Object.fromEntries(Object.entries(base.rules ?? {}).map(([key, rule]) => [key, { ...rule,
    declarations: Object.fromEntries(Object.entries(rule.declarations).filter(([property]) => !theme.rules?.[key]?.authored?.[property])),
  }]))
  const baselineTheme = { ...base, id: theme.id, rules: baselineRules }
  const baseline = library.exportBrandTheme(baselineTheme)['theme.css']
  const hasMedia = cases.some(sample => sample.surface === 'media')
  const cached = new Map()
  const { modes, media } = await withThemeBrowser(directory, { timeout: 60000, timeoutMessage: 'Theme inspection exceeded 60 seconds.',
    missingBrowser: 'Install Playwright Chromium or Google Chrome to inspect computed theme styles.' }, async renderer => {
    const modes = {}
    const media = {}
    const pageModes = themeEditorModes(theme)
    for (const mode of scope.mode ? [scope.mode] : hasMedia ? ['light', 'dark'] : pageModes) {
      const palette = hasMedia ? css + themeMediaPalette(library, theme, mode) : css
      const comparison = hasMedia ? baseline + themeMediaPalette(library, baselineTheme, mode) : baseline
      const html = await documentFor({ style, comparison, palette, markup, mode, theme: theme.id, fonts, cached })
      await renderer.load({ mode, html })
      if (part === 'lightbox') await renderer.evaluate(prepareThemeLightbox)
      await renderer.evaluate(installThemeTextContrast)
      const measured = await renderer.evaluate(measurePart, {
        properties, selectors: cases.map(sample => library.brandRuleTargets[sample.part].selector),
        slots: themePartSlots(part), mainText: target.textSize?.child, optionText: Boolean(target.optionText), contrastParts: themeContrastParts(library, part),
      })
      if (measured.length !== cases.length) throw new Error('Theme inspection could not measure every variant')
      const entries = cases.map(({ when, state, field, placement, surface }, index) => {
        const { contrast, ...styles } = measured[index]
        return { when, state, ...(field && { field }), ...(placement && { placement }), ...(surface && { surface }), ...styles,
          ...(contrast && { contrast: measuredTextContrast(library, contrast) }) }
      })
      if (pageModes.includes(mode)) modes[mode] = entries.filter(sample => !sample.surface)
      if (hasMedia) media[mode] = entries.filter(sample => sample.surface === 'media')
    }
    return { modes, media }
  })
  return {
    theme: theme.id, name: theme.name, part, selector: target.selector, components: target.components,
    context: { viewport: { width: 1200, height: 960 }, direction: 'ltr' },
    modes, ...(hasMedia && { media }),
  }
}

export async function measureThemeAppearances(directory, library, theme, part, conditions, modes, properties) {
  const [specimens, style, fonts] = await Promise.all([
    Promise.all(conditions.map(when => themePartProbes(library, part, { when }))),
    readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8'),
    resolveThemeFonts(directory, [theme]),
  ])
  const palette = library.exportBrandTheme(theme)['theme.css']
  const cached = new Map()
  return withThemeBrowser(directory, { timeout: 60000, timeoutMessage: 'Measuring the rendered theme exceeded 60 seconds.',
    missingBrowser: 'Install Playwright Chromium or Google Chrome to measure the rendered theme.' }, async renderer => {
    const results = []
    for (const { cases, markup } of specimens) {
      if (!cases.length) throw new Error('The scope contains no rendered specimens')
      const readings = []
      for (const mode of modes) {
        const html = await documentFor({ style, palette, markup, mode, theme: theme.id, fonts, cached })
        await renderer.load({ mode, html })
        if (part === 'lightbox') await renderer.evaluate(prepareThemeLightbox)
        const values = await renderer.evaluate(measurePart, { comparison: 'styles', properties,
          selectors: cases.map(sample => library.brandRuleTargets[sample.part].selector), slots: {} })
        if (values.length !== cases.length) throw new Error('Theme inspection could not measure every state and size')
        readings.push(...cases.map((sample, index) => ({ ...sample, mode, values: values[index].values })))
      }
      results.push(readings)
    }
    return results
  })
}

async function measureRuleChanges(renderer, library, { rule, token, style, stylesByTheme, theme, cached, comparison }) {
  const { target: part } = rule
  const specimenPart = part.startsWith('button-') && part !== 'button-group' ? 'button' : part
  const scope = specimenPart === part ? rule : { ...rule, when: { ...rule.when, variant: part.slice(7) } }
  const pageModes = themeEditorModes(stylesByTheme.at(-1).theme)
  const includeMedia = comparison === 'paint' || Boolean(rule.mode && !pageModes.includes(rule.mode))
  const { cases, markup } = await themePartProbes(library, specimenPart, scope, undefined, includeMedia)
  const hasMedia = cases.some(sample => sample.surface === 'media')
  const modes = rule.mode ? [rule.mode] : hasMedia ? ['light', 'dark'] : pageModes
  const selectors = cases.map(sample => library.brandRuleTargets[sample.part].selector)
  const properties = comparison === 'styles' ? library.brandRuleTargets[part].tokenProperties?.[token] ?? [token]
    : token === 'button-style' ? ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'] : []
  const options = { properties, selectors, slots: themePartSlots(specimenPart), comparison,
    mainText: library.brandRuleTargets[specimenPart].textSize?.child,
    contrastParts: comparison === 'paint' ? themeContrastParts(library, specimenPart) : [] }
  const reaches = []
  const mediaReaches = []
  const warnings = new Map()
  let unmeasured = 0
  for (const mode of modes) {
    const snapshots = []
    for (const { theme: rendered, palette: primary, fonts } of stylesByTheme) {
      const palette = hasMedia ? primary + themeMediaPalette(library, rendered, mode) : primary
      const html = await documentFor({ style, comparison: '', palette, markup, mode, theme, fonts, cached })
      await renderer.load({ mode, html })
      if (specimenPart === 'lightbox') await renderer.evaluate(prepareThemeLightbox)
      if (comparison === 'paint') await renderer.evaluate(installThemeTextContrast)
      const measured = await renderer.evaluate(measurePart, options)
      if (!cases.length || measured.length !== cases.length) throw new Error('Theme inspection could not measure every matching variant')
      snapshots.push(measured)
    }
    const [previous, next] = snapshots
    const groups = new Map()
    for (const [index, { when, state, interaction, placement, field, surface }] of cases.entries()) {
      if (!surface && !pageModes.includes(mode)) continue
      const beforeValues = previous[index].values
      const afterValues = next[index].values
      const properties = Object.keys(afterValues).filter(key => beforeValues[key] !== afterValues[key])
      const values = comparison === 'paint' ? undefined : Object.fromEntries(properties.map(property =>
        [property, { before: beforeValues[property], after: afterValues[property] }]))
      const label = interaction ? 'focus-visible+hover' : state
      const qualifiers = Object.fromEntries(Object.entries(when).filter(([axis]) => axis === 'variant' || axis === 'tone' || Object.hasOwn(scope.when ?? {}, axis)))
      const key = JSON.stringify([qualifiers, label, placement, field, surface])
      const group = groups.get(key) ?? { when: qualifiers, state: label, placement, field, surface, samples: [] }
      group.samples.push({ when, properties, ...(values && { values }) })
      groups.set(key, group)
      if (comparison !== 'paint') continue
      const before = measuredTextContrast(library, previous[index].contrast)
      for (const [text, result] of Object.entries(measuredTextContrast(library, next[index].contrast))) {
        if (result.status === 'unmeasured') { unmeasured++; continue }
        const baseline = before[text]
        if (!lowTextContrast(result) || !baseline || baseline.status === 'inactive'
          || (result.worstStopRatio ?? result.ratio) >= (baseline.worstStopRatio ?? baseline.ratio)) continue
        const warning = { text, when, state: label, mode, ...(field && { field }), ...(placement && { placement }), ...(surface && { surface }),
          ...result, previousRatio: baseline.ratio ?? null }
        warnings.set(JSON.stringify(warning), warning)
      }
    }
    for (const { when, state, placement, field, surface, samples } of groups.values()) {
      const [first] = samples
      const uniform = samples.every(sample => sample.properties.join() === first.properties.join()
        && JSON.stringify(sample.values) === JSON.stringify(first.values))
      for (const sample of uniform ? [{ ...first, when }] : samples) {
        if (sample.properties.length) (surface === 'media' ? mediaReaches : reaches).push({
          ...sample, state, mode, ...(placement && { placement }), ...(field && { field }),
        })
      }
    }
  }
  return { reaches, ...(hasMedia && { mediaReaches }),
    ...(comparison === 'paint' && { contrast: [...warnings.values()], ...(unmeasured && { unmeasured }) }) }
}

export async function themePartChanges(directory, library, before, after, rules, token, comparison) {
  const style = await readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8')
  const stylesByTheme = await Promise.all([before, after].map(async theme => ({
    theme,
    palette: library.exportBrandTheme(theme)['theme.css'],
    fonts: comparison === 'paint' ? { css: '' } : await resolveThemeFonts(directory, [theme]),
  })))
  const cached = new Map()
  try {
    return await withThemeBrowser(directory, { timeout: 60000, timeoutMessage: 'Theme inspection exceeded 60 seconds.',
      missingBrowser: 'Install Playwright Chromium or Google Chrome to check computed component styles.' }, async renderer => {
      const checked = []
      for (const rule of rules) {
        const measured = await measureRuleChanges(renderer, library, { rule, token, style, stylesByTheme, theme: after.id, cached, comparison })
        checked.push({ part: rule.target, token, status: 'measured', ...measured })
      }
      return checked
    })
  } catch (error) {
    if (error.code !== 'ERR_THEME_BROWSER_REQUIRED') throw error
    return rules.map(rule => ({ part: rule.target, token, status: 'browser-unavailable' }))
  }
}

export function formattedThemePart(report) {
  const lines = [report.name + ' · ' + report.part]
  for (const frame of report.paginationFrames ?? []) {
    const scope = [frame.mode, ...Object.entries(frame.when ?? {}).map(pair => pair.join(':')), frame.state].filter(Boolean)
    lines.push(`  ${frame.property} → ${frame.part}${scope.length ? ' · ' + scope.join(' · ') : ''}`)
  }
  for (const [mode, entries] of Object.entries(report.media ?? {})) {
    const reading = entries[0]?.contrast
    const pairs = Object.entries(reading ?? {}).filter(([, record]) => record.status === 'measured')
    if (pairs.length) lines.push(mode + ' media · ' + pairs.map(([part, record]) => part + ' ' + record.ratio.toFixed(2) + ':1').join(' · '))
  }
  const styleEntries = sample => [...Object.entries(sample.styles), ...Object.entries(sample.parts ?? {}).flatMap(([part, values]) =>
    Object.entries(values).map(([property, details]) => [part + ' ' + property, details]))]
  for (const [mode, cases] of Object.entries(report.modes)) {
    if (mode === 'dark' && JSON.stringify(cases) === JSON.stringify(report.modes.light)) continue
    const [rest] = cases
    lines.push('', mode + ' · ' + rest.state)
    const initial = new Map(styleEntries(rest))
    for (const [property, details] of initial) {
      const value = details.value ?? Object.entries(details.longhands ?? {}).map(([name, value]) => name + ' ' + value).join(', ')
      lines.push('  ' + property + '  ' + value + '  [' + details.source + ']')
    }
    for (const [part, reading] of Object.entries(rest.contrast ?? {})) {
      if (reading.status === 'measured') lines.push(`  ${part} contrast  ${reading.ratio.toFixed(2)}:1 (minimum ${reading.minimum}:1)`)
      else if (reading.status === 'unmeasured') lines.push(`  ${part} contrast  unmeasured (${reading.reason})`)
    }
    const lowContrast = cases.flatMap(sample => Object.values(sample.contrast ?? {}))
      .filter(reading => reading.status === 'measured' && reading.ratio < reading.minimum).length
    if (lowContrast) lines.push(`  ${lowContrast} samples below their contrast minimum`)
    const differences = cases.slice(1).flatMap(test => {
      const changes = styleEntries(test).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial.get(key)))
      return changes.length ? [{ test, changes }] : []
    })
    lines.push('  ' + differences.length + ' variants or states differ')
    for (const { test, changes } of differences.slice(0, 4)) {
      const label = [test.field, test.placement, ...Object.entries(test.when).map(pair => pair.join(':')), test.state].filter(Boolean).join(' · ')
      lines.push('  ' + label + '  ' + changes.map(([name, value]) => name + '=' + (value.value ?? 'mixed')).join(', '))
    }
  }
  return lines.join('\n')
}
