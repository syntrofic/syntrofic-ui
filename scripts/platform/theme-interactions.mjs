// Preserve the real selectors, cascade and specificity while displaying several states at once.
export function projectThemeInteractions() {
  const pseudo = /:(focus-visible|focus-within|focus|hover|active)(?![\w-])/g
  function visit(rules) {
    for (const rule of rules) {
      if (rule.selectorText) {
        const selector = rule.selectorText.replace(pseudo, (_, name) => name === 'focus-within'
          ? ':is(:focus-within,[data-theme-focus-within])'
          : ':is(:' + name + ',[data-theme-state~="' + name + '"])')
        if (selector !== rule.selectorText) rule.selectorText = selector
      }
      if (rule.cssRules) visit(rule.cssRules)
    }
  }
  for (const style of document.querySelectorAll('head style')) visit(style.sheet.cssRules)
  for (const specimen of document.querySelectorAll('[data-theme-variant-selector]')) {
    const sample = specimen.querySelector('[data-lookup-sample]')
    if (!sample) continue
    const selector = specimen.dataset.themeVariantSelector
    const state = sample.dataset.themeState
    if (sample.hasAttribute('data-lookup-wrapper')) {
      const subject = state === 'selected' && selector === '.sy-pagination__item' ? selector + '[aria-current="page"]' : selector
      const target = sample.querySelector(subject)
      if (target) target.dataset.themeState = state
    }
    if (selector === '.sy-pagination' || selector === '.sy-pagination__controls') {
      const item = sample.querySelector('.sy-pagination__item')
      if (item) item.dataset.themeState = state
    }
    for (const focused of specimen.querySelectorAll('[data-theme-state~="focus"]')) {
      for (let owner = focused; owner && owner !== specimen; owner = owner.parentElement) {
        owner.setAttribute('data-theme-focus-within', '')
      }
    }
    for (const input of specimen.querySelectorAll('[data-lookup-indeterminate]')) input.indeterminate = true
  }
}
