import './style.css'
import { installIconDirectory } from './icons-page'

import { observeNavigationReflow } from '../src/internal/navigation-reflow'
import { observeResize } from '../src/internal/resize-observer'
import { showModalWithScrollLock } from '../src/internal/document-scroll'
import { copyText } from './clipboard'
import { installSiteModuleLoader, retrySiteStylesheet } from './module-loader'
import { changeSiteHeight, changeSiteItems, installSiteNavigation, setSiteDisclosure, setSiteText, showIslandError } from './motion'
import { installPreviewImages } from './preview-images'
import { siteCount, siteText } from './locale'

const root = document.documentElement
installSiteModuleLoader()
installSiteNavigation()
installPreviewImages(document)
installIconDirectory(document)
const themeMenu = document.querySelector<HTMLDetailsElement>('.theme-menu')!
const themeButton = themeMenu.querySelector<HTMLElement>('summary')!
const themeChoices = themeMenu.querySelectorAll<HTMLInputElement>('input[name="site-theme"]')
const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
const prefersDark = matchMedia('(prefers-color-scheme: dark)')
const themeStorageKey = 'syntrofic-site-theme'
type SiteTheme = 'light' | 'dark' | 'system'
function themePreference(value?: string | null): SiteTheme {
  return value === 'light' || value === 'dark' ? value : 'system'
}
let preference = themePreference(root.dataset.siteThemePreference)
function applyTheme(next: SiteTheme, restoring = false) {
  const theme = next === 'system' ? (prefersDark.matches ? 'dark' : 'light') : next
  if (restoring && theme !== root.dataset.syTheme) {
    // Resume cached pages in the current palette without animating the old palette out.
    root.dataset.siteThemeRestoring = ''
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => { delete root.dataset.siteThemeRestoring }))
  }
  preference = next
  root.dataset.siteThemePreference = next
  root.dataset.syTheme = theme
  colorScheme?.setAttribute('content', theme)
  for (const choice of themeChoices) choice.checked = choice.value === next
}
function syncStoredTheme(restoring = false, event?: StorageEvent) {
  let next = preference
  try {
    const storage = window.localStorage
    if (event && event.storageArea !== storage) return
    next = themePreference(storage.getItem(themeStorageKey))
  } catch {}
  applyTheme(next, restoring)
}
themeMenu.addEventListener('change', event => {
  if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'site-theme') return
  const next = themePreference(event.target.value)
  applyTheme(next)
  try {
    if (next === 'system') localStorage.removeItem(themeStorageKey)
    else localStorage.setItem(themeStorageKey, next)
  } catch {}
})
themeMenu.addEventListener('toggle', () => themeButton.setAttribute('aria-expanded', String(themeMenu.open)))
document.addEventListener('pointerdown', event => {
  if (themeMenu.open && !themeMenu.contains(event.target as Node)) setSiteDisclosure(themeMenu, false)
})
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.key !== 'Escape' || !themeMenu.open) return
  event.preventDefault()
  setSiteDisclosure(themeMenu, false)
  themeButton.focus({ preventScroll: true })
})
prefersDark.addEventListener('change', () => {
  if (preference === 'system') applyTheme(preference)
})
syncStoredTheme()
window.addEventListener('storage', event => {
  if (event.key === themeStorageKey || event.key === null) syncStoredTheme(false, event)
})
window.addEventListener('pageshow', event => {
  if (event.persisted) syncStoredTheme(true)
})

const dialog = document.querySelector<HTMLDialogElement>('.search-dialog')!
const search = document.querySelector<HTMLInputElement>('#site-search')!
const results = document.querySelector<HTMLElement>('[data-search-results]')!
const searchScroll = document.querySelector<HTMLElement>('.search-scroll')!
const searchButton = document.querySelector<HTMLButtonElement>('[data-search-open]')
const searchMotion = { departures: true, layer: results, clip: searchScroll }
type SearchResult = [title: string, href: string, category: string, keywords: string]
let index: SearchResult[] | undefined
let loading: Promise<void> | undefined
let searchOpener: HTMLElement | undefined
let unlockSearchScroll: (() => void) | undefined
const resultItems = () => [...results.querySelectorAll<HTMLElement>(':scope > :not([data-site-departure])')]
const resultLinks = () => [...results.querySelectorAll<HTMLAnchorElement>(':scope > a[href]')]

function changeSearchResults(next: HTMLElement[]) {
  changeSiteHeight(dialog, () => {
    const update = () => {
      const focused = resultLinks().find(link => link === document.activeElement)
      const top = focused?.getBoundingClientRect().top ?? 0
      const keep = new Set(next)
      for (const child of resultItems()) if (!keep.has(child)) child.remove()
      for (const [index, child] of next.entries()) {
        const at = resultItems()[index]
        if (child !== at) results.insertBefore(child, at ?? null)
      }
      if (focused && keep.has(focused)) {
        if (focused !== document.activeElement) focused.focus({ preventScroll: true })
        searchScroll.scrollTop += focused.getBoundingClientRect().top - top
      } else {
        if (focused && dialog.open) search.focus({ preventScroll: true })
        searchScroll.scrollTop = 0
      }
    }
    if (!dialog.open) { update(); return null }
    // The panel and its rows share one start time, including the loading handoff.
    return changeSiteItems(resultItems(), update, () => next, searchMotion)
  })
}
function showSearchMessage(message: string, busy = false) {
  const paragraph = document.createElement('p')
  paragraph.textContent = message
  paragraph.toggleAttribute('data-search-loading', busy)
  changeSearchResults([paragraph])
}
function searchResults() {
  if (!index) return
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matching = index.filter(([title, href, type, keywords]) =>
    terms.every(term => [title, href, type, keywords].join(' ').toLowerCase().includes(term)))
  const query = terms.join(' ')
  matching.sort(([a], [b]) => {
    const rank = (title: string) => title.toLowerCase() === query ? 0 : title.toLowerCase().startsWith(query) ? 1 : 2
    return rank(a) - rank(b)
  })
  if (!matching.length) return showSearchMessage(siteText('没有匹配的结果。', 'No matching results.'))
  const previous = resultLinks()
  const links = matching.slice(0, 12).map(([title, url, category]) => {
    const current = previous.find(link => link.getAttribute('href') === url && link.dataset.title === title)
    if (current) return current
    const anchor = document.createElement('a')
    const type = document.createElement('span')
    type.className = 'search-category'
    anchor.href = url
    anchor.dataset.title = title
    type.textContent = category
    anchor.append(title, type)
    return anchor
  })
  if (previous.length === links.length && links.every((link, at) => link === previous[at])) return
  changeSearchResults(links)
}
function openSearch(trigger?: HTMLElement) {
  if (!dialog.open) {
    const focused = document.activeElement
    searchOpener = trigger ?? (focused instanceof HTMLElement && focused !== document.body ? focused : searchButton ?? undefined)
    if (unlockSearchScroll) dialog.showModal()
    else unlockSearchScroll = showModalWithScrollLock(dialog)
  }
  search.focus({ preventScroll: true })
  if (index) return searchResults()
  if (loading) return
  results.setAttribute('aria-busy', 'true')
  const placeholder = window.setTimeout(() => showSearchMessage(siteText('正在加载搜索索引…', 'Loading the search index…'), true), 140)
  loading = fetch(siteText('/search-index.json', '/en/search-index.json'))
    .then(async response => {
      if (!response.ok) throw new Error('Search index unavailable')
      index = await response.json() as SearchResult[]
      searchResults()
    })
    .catch(() => showSearchMessage(siteText('搜索暂不可用。关闭窗口后可重新试一次。', 'Search is unavailable. Close this window and try again.')))
    .finally(() => {
      window.clearTimeout(placeholder)
      loading = undefined
      results.removeAttribute('aria-busy')
    })
}
searchButton?.addEventListener('click', () => openSearch(searchButton))
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
})
search.addEventListener('input', searchResults)
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close()
})
dialog.addEventListener('close', () => {
  if (dialog.open) return
  unlockSearchScroll?.()
  unlockSearchScroll = undefined
  if (searchOpener?.isConnected) searchOpener.focus({ preventScroll: true })
  searchOpener = undefined
})
dialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault()
    dialog.close()
    return
  }
  const links = resultLinks()
  const at = links.indexOf(document.activeElement as HTMLAnchorElement)
  if (event.key === 'ArrowDown' && links.length) {
    event.preventDefault()
    links[(at + 1) % links.length].focus()
  }
  if (event.key === 'ArrowUp' && at >= 0) {
    event.preventDefault()
    if (at === 0) search.focus()
    else links[at - 1].focus()
  }
  if (event.key === 'Enter' && event.target === search && links.length) {
    event.preventDefault()
    links[0].click()
  }
})

const compactViewport = matchMedia('(max-width: 710px)')
const compactDocsViewport = matchMedia('(max-width: 710px), (max-height: 12rem)')
const header = document.querySelector<HTMLElement>('.topbar')
const headerRow = header?.querySelector<HTMLElement>('.topbar-row')
const desktopNav = header?.querySelector<HTMLElement>('.topnav')
const repoLink = header?.querySelector<HTMLAnchorElement>('.repo-link')
const mobileNav = document.querySelector<HTMLDetailsElement>('.mobile-nav')
const compactNav = document.querySelector<HTMLDetailsElement>('.docs-nav details')
const docsFooter = document.querySelector<HTMLElement>('.docs-layout + .site-footer')
if (docsFooter) {
  const syncFooterOffset = () => {
    root.style.setProperty('--site-footer-offset', docsFooter.getBoundingClientRect().height + 'px')
  }
  observeResize(docsFooter, window, syncFooterOffset)
}
if (header && headerRow) {
  const trackLayout = () => {
    observeNavigationReflow(header, headerRow, {
      start: headerRow.querySelector('.brand'), center: desktopNav ?? null, end: headerRow.querySelector('.top-actions'),
    })
    let previous = 0
    const syncOffset = () => {
      const height = header.getBoundingClientRect().height
      if (!height || height === previous) return
      previous = height
      root.style.setProperty('--site-header-offset', height + 'px')
    }
    syncOffset()
    // Read after the reflow observer has installed the header's current animation.
    observeResize(header, window, () => queueMicrotask(syncOffset))
  }
  // The first measurement must use the styled header, including on a cold WebKit load.
  if (getComputedStyle(headerRow).position === 'relative') trackLayout()
  else window.addEventListener('load', trackLayout, { once: true })
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || !(event.target instanceof Element)) return
  const summary = event.target.closest('details[data-site-disclosure] > summary')
  const details = summary?.parentElement
  if (!(details instanceof HTMLDetailsElement)) return
  event.preventDefault()
  setSiteDisclosure(details, !details.open)
})
if (header && desktopNav && mobileNav) {
  const headerToggle = mobileNav.querySelector('summary')
  let lastFocus: HTMLElement | null = null
  header.addEventListener('focusin', event => { lastFocus = event.target as HTMLElement })
  header.addEventListener('focusout', event => {
    // Hiding a focused region can blur it before the media query event arrives.
    if (event.relatedTarget || (event.target as HTMLElement).getClientRects().length) lastFocus = null
  })
  document.addEventListener('pointerdown', event => {
    if (mobileNav.open && !mobileNav.contains(event.target as Node)) setSiteDisclosure(mobileNav, false)
  })
  compactViewport.addEventListener('change', event => {
    const active = document.activeElement
    const focused = active === document.body ? lastFocus : active
    lastFocus = null
    if (event.matches) {
      if (desktopNav.contains(focused) || focused === repoLink) headerToggle?.focus({ preventScroll: true })
      return
    }
    if (mobileNav.contains(focused)) {
      const href = focused?.closest('a[href]')?.getAttribute('href')
      const links = [...desktopNav.querySelectorAll<HTMLAnchorElement>('a[href]'), ...(repoLink ? [repoLink] : [])]
      const next = links.find(link => link.getAttribute('href') === href) ?? desktopNav.querySelector<HTMLElement>('a[aria-current]') ?? links[0]
      next?.focus({ preventScroll: true })
    }
    setSiteDisclosure(mobileNav, false, false)
  })
}
if (compactNav) {
  const syncCompactDocs = () => {
    const compact = compactDocsViewport.matches
    if (compactNav.hasAttribute('data-docs-compact') === compact) return
    compactNav.toggleAttribute('data-docs-compact', compact)
    setSiteDisclosure(compactNav, !compact, false)
  }
  syncCompactDocs()
  compactDocsViewport.addEventListener('change', syncCompactDocs)
}
for (const [menu, viewport] of [[mobileNav, compactViewport], [compactNav, compactDocsViewport]] as const) {
  menu?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open || !viewport.matches) return
    event.preventDefault()
    setSiteDisclosure(menu, false)
    menu.querySelector('summary')?.focus({ preventScroll: true })
  })
}

function trackFilterSelection(buttons: HTMLButtonElement[]) {
  const group = buttons[0]?.parentElement
  if (!group) return () => {}
  const indicator = document.createElement('span')
  indicator.dataset.siteFilterIndicator = ''
  indicator.setAttribute('aria-hidden', 'true')
  indicator.hidden = true
  group.prepend(indicator)
  group.dataset.siteFilterSelection = ''
  function update() {
    const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true')
    indicator.hidden = !selected?.offsetWidth
    if (!selected || indicator.hidden) return
    indicator.style.width = `${selected.offsetWidth}px`
    indicator.style.height = `${selected.offsetHeight}px`
    indicator.style.translate = `${selected.offsetLeft}px ${selected.offsetTop}px`
  }
  for (const target of [group, ...buttons]) observeResize(target, window, update)
  update()
  return update
}

const catalogFilter = document.querySelector<HTMLInputElement>('#component-filter')
if (catalogFilter) {
  const catalog = document.querySelector<HTMLElement>('[data-catalog-results]')!
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-component-card]'))
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-group]'))
  const count = document.querySelector<HTMLElement>('[data-count]')!
  const empty = document.querySelector<HTMLElement>('[data-no-components]')!
  function filterComponents() {
    const terms = catalogFilter!.value.trim().toLowerCase().split(/\s+/)
    const visible = new Set(cards.filter(card => terms.every(term => card.dataset.query!.toLowerCase().includes(term))))
    const anchor = changeSiteHeight(catalog, () => changeSiteItems([...cards, empty], () => {
      for (const card of cards) card.hidden = !visible.has(card)
      for (const group of groups) group.hidden = !group.querySelector('[data-component-card]:not([hidden])')
      empty.hidden = visible.size !== 0
    }, () => [...visible, empty], { departures: true }))
    setSiteText(count, siteCount(visible.size, '组件', 'components'), anchor)
  }
  catalogFilter.addEventListener('input', filterComponents)
}

const templateFilter = document.querySelector<HTMLInputElement>('#template-filter')
if (templateFilter) {
  const catalog = document.querySelector<HTMLElement>('[data-catalog-results]')!
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-template-card]'))
  const categories = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-template-category]'))
  const moveSelection = trackFilterSelection(categories)
  const count = document.querySelector<HTMLElement>('[data-template-count]')!
  const unit = count.dataset.templateUnit ?? '模板'
  const empty = document.querySelector<HTMLElement>('[data-no-templates]')!
  const url = new URL(window.location.href)
  let category = categories.find(button => button.dataset.templateCategory === url.searchParams.get('category'))?.dataset.templateCategory ?? 'all'
  templateFilter.value = url.searchParams.get('q') ?? ''

  function filterTemplates(save = false) {
    const query = templateFilter!.value.trim()
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const visible = new Set(cards.filter(card => (category === 'all' || card.dataset.templateCard === category)
      && terms.every(term => card.dataset.query?.toLowerCase().includes(term))))
    function update() {
      for (const card of cards) card.hidden = !visible.has(card)
      for (const button of categories) button.setAttribute('aria-pressed', String(button.dataset.templateCategory === category))
      moveSelection()
      empty.hidden = visible.size !== 0
    }
    if (save) {
      const anchor = changeSiteHeight(catalog,
        () => changeSiteItems([...cards, empty], update, () => [...visible, empty], { departures: true }))
      setSiteText(count, siteCount(visible.size, unit, unit.toLowerCase()), anchor)
      if (category === 'all') url.searchParams.delete('category')
      else url.searchParams.set('category', category)
      if (query) url.searchParams.set('q', query)
      else url.searchParams.delete('q')
      history.replaceState(history.state, '', url)
    } else {
      update()
      count.textContent = siteCount(visible.size, unit, unit.toLowerCase())
    }
  }
  templateFilter.addEventListener('input', () => filterTemplates(true))
  for (const button of categories) button.addEventListener('click', () => {
    category = button.dataset.templateCategory ?? 'all'
    filterTemplates(true)
  })
  filterTemplates()
  document.querySelector<HTMLElement>('[data-template-tools]')?.removeAttribute('inert')
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.querySelector<HTMLElement>('[data-site-action-label]')!
  let reset: ReturnType<typeof setTimeout> | undefined
  let request = 0
  button.addEventListener('click', async () => {
    const text = button.closest('.code-block')?.querySelector('code')?.textContent
    if (!text) return
    const current = ++request
    clearTimeout(reset)
    const result = await copyText(text)
    if (current !== request) return
    setSiteText(label, result ? siteText('已复制', 'Copied') : siteText('重试复制', 'Try again'))
    reset = setTimeout(() => { setSiteText(label, siteText('复制', 'Copy')) }, 1600)
  })
}

const islands = Array.from(document.querySelectorAll<HTMLElement>('[data-island]'))
islands.forEach((island, index) => {
  let failure: unknown
  function report(error: unknown, restoreFocus?: boolean) {
    failure = error
    console.error(error)
    showIslandError(island, load, restoreFocus)
  }
  async function load() {
    try {
      if (failure) await retrySiteStylesheet(failure)
      failure = undefined
      const { mount } = await import('./islands')
      await mount(island, index, report)
    } catch (error) { report(error) }
  }
  island.dataset.islandState = 'loading'
  island.setAttribute('aria-busy', 'true')
  void load()
})

const coverageSelect = document.querySelector<HTMLSelectElement>('#design-coverage-status')
const coverageQuery = document.querySelector<HTMLInputElement>('#design-coverage-query')
const coverageCount = document.querySelector<HTMLElement>('[data-coverage-count]')
const noCoverage = document.querySelector<HTMLElement>('[data-no-coverage]')
if (coverageSelect && coverageQuery && coverageCount && noCoverage) {
  const groups = [...document.querySelectorAll<HTMLDetailsElement>('.design-coverage')].map(group => ({
    group, frame: group.parentElement!, heading: group.querySelector('summary')!, rows: [...group.querySelectorAll<HTMLElement>('[data-coverage]')].map(cell => {
      const row = cell.closest('tr')!
      return { row, status: cell.dataset.coverage, query: row.textContent?.toLowerCase() ?? '' }
    }),
  }))
  let openBeforeFilter: Set<HTMLDetailsElement> | undefined
  coverageSelect.closest<HTMLElement>('[data-coverage-filter]')?.removeAttribute('hidden')
  const filterCoverage = () => {
    const status = coverageSelect.value
    const terms = coverageQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const filtering = Boolean(status || terms.length)
    if (filtering && !openBeforeFilter) openBeforeFilter = new Set(groups.map(item => item.group).filter(group => group.open))
    const moving = groups.flatMap(({ heading, group, rows }) => [heading, ...(group.open ? rows.map(entry => entry.row) : [])])
    let matches = 0
    const anchor = changeSiteItems([...moving, noCoverage], () => {
      for (const { group, frame, rows } of groups) {
        let visible = 0
        for (const entry of rows) {
          const { row } = entry
          row.hidden = Boolean(status && entry.status !== status) || !terms.every(term => entry.query.includes(term))
          if (!row.hidden) visible++
        }
        setSiteDisclosure(group, filtering ? visible > 0 : openBeforeFilter?.has(group) ?? group.open, false)
        frame.hidden = visible === 0
        matches += visible
      }
      if (!filtering) openBeforeFilter = undefined
      noCoverage.hidden = matches !== 0
    }, () => [...groups.filter(({ frame }) => !frame.hidden).flatMap(({ group, heading, rows }) =>
      [heading, ...(group.open ? rows.filter(({ row }) => !row.hidden).map(entry => entry.row) : [])]), noCoverage])
    setSiteText(coverageCount, matches + ' 项', anchor)
  }
  coverageSelect.addEventListener('change', filterCoverage)
  coverageQuery.addEventListener('input', filterCoverage)
}
