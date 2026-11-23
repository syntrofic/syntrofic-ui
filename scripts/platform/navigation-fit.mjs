export function measureNavigationFit(root = document) {
  const px = value => Number.parseFloat(value) || 0
  const box = element => {
    const style = element.ownerDocument.defaultView.getComputedStyle(element)
    const padding = [px(style.paddingBlockStart), px(style.paddingBlockEnd)]
    const border = px(style.borderBlockStartWidth) + px(style.borderBlockEndWidth)
    return {
      height: element.getBoundingClientRect().height,
      cssHeight: px(style.height),
      inset: padding[0] + padding[1] + border,
      padding,
    }
  }
  return [...root.querySelectorAll('[data-navigation-fit]')].flatMap(sample => {
    const bar = sample.dataset.navigationFit
    const navbar = sample.querySelector('.sy-navbar')
    const row = navbar?.querySelector(':scope > .sy-navbar__bar')
    if (!row?.getClientRects().length) return []
    const host = bar === 'app-shell-header' ? navbar.closest('.sy-app-layout__navbar')
      : bar === 'layout-header' ? navbar.closest('.sy-layout-header, .sy-layout__header') : null
    const rowBox = box(row)
    const hostBox = host ? box(host) : rowBox
    let space = hostBox.height
    for (let element = navbar; host && element; element = element.parentElement) {
      space -= box(element).inset
      if (element === host) break
    }
    const available = Math.max(0, space)
    const itemSpace = Math.max(0, Math.min(available, rowBox.height) - rowBox.inset)
    const issues = host && rowBox.height - available > .25
      ? [{ part: 'top-nav', height: rowBox.height, available }] : []
    const candidates = row.querySelectorAll(':scope > .sy-navbar__leading > .sy-navbar__start > .sy-navbar__brand, '
      + ':scope > .sy-navbar__leading > .sy-navbar__desktop-track > .sy-navbar__desktop > li > .sy-navigation-link, '
      + ':scope > .sy-navbar__actions > .sy-navbar__toggle')
    const controls = []
    for (const item of candidates) {
      if (!item.getClientRects().length) continue
      const heading = item.matches('.sy-navbar__brand')
      const trigger = item.matches('.sy-navbar__toggle')
      const part = heading ? 'top-nav-heading' : trigger ? 'top-nav-toggle' : 'top-nav-item'
      const itemBox = box(item)
      const content = item.querySelector('.sy-navbar__brand-text, .sy-navbar__item-label')
      const intrinsic = content ? content.getBoundingClientRect().height + itemBox.inset : itemBox.height
      const clipped = intrinsic - itemBox.height > .25
      const height = Math.max(itemBox.height, intrinsic)
      controls.push({ part, height: itemBox.height })
      if (height - itemSpace <= .25 && !clipped) continue
      const copy = heading ? item.querySelector('.sy-navbar__brand-title') : item
      const label = item.getAttribute('aria-label') || copy?.querySelector('.sy-motion-text > .sy-visually-hidden')?.textContent || copy?.textContent
      issues.push({ part, height, available: clipped ? Math.min(itemSpace, itemBox.height) : itemSpace,
        label: label?.trim(), ...(clipped && { clipped: true }), cssHeight: itemBox.cssHeight, boxHeight: itemBox.height, padding: itemBox.padding })
    }
    return [{ bar, placement: sample.dataset.placement, density: sample.dataset.density, state: sample.dataset.state,
      ...(sample.dataset.viewport && { viewport: sample.dataset.viewport }),
      available, hostHeight: hostBox.cssHeight, rowHeight: rowBox.height, rowCssHeight: rowBox.cssHeight,
      rowInset: rowBox.inset, controls, issues }]
  })
}
