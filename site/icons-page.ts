import './icons.css'

import { siteCount } from './locale'

export function installIconDirectory(document: Document) {
  const directory = document.querySelector<HTMLElement>('[data-icon-directory]')
  if (!directory) return
  const tools = directory.querySelector<HTMLElement>('[data-icon-tools]')!
  const search = directory.querySelector<HTMLInputElement>('[data-icon-search]')!
  const category = directory.querySelector<HTMLSelectElement>('[data-icon-category]')!
  const count = directory.querySelector<HTMLOutputElement>('[data-icon-count]')!
  const empty = directory.querySelector<HTMLElement>('[data-icon-empty]')!
  const entries = [...directory.querySelectorAll<HTMLElement>('[data-icon-entry]')].map(element => ({
    element, category: element.dataset.iconGroup, keywords: element.dataset.iconKeywords!.toLowerCase(),
  }))

  function filter() {
    const terms = search.value.toLowerCase().trim().split(/\s+/)
    let shown = 0
    for (const entry of entries) {
      const matches = (!category.value || category.value === entry.category) && terms.every(term => entry.keywords.includes(term))
      entry.element.hidden = !matches
      if (matches) shown++
    }
    count.value = siteCount(shown, '图标', shown === 1 ? 'icon' : 'icons')
    empty.hidden = shown > 0
  }

  search.addEventListener('input', filter)
  category.addEventListener('change', filter)
  document.defaultView?.addEventListener('pageshow', filter)
  tools.hidden = false
  filter()
}
