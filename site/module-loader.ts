const modules = new Map<string, { attempts: number; request?: Promise<unknown> }>()
const styles = new Map<string, { link: HTMLLinkElement; attempts: number; request?: Promise<void> }>()

function loadModule(path: string, base: string, load: () => Promise<unknown>) {
  const url = new URL(path, base)
  const key = url.href
  let entry = modules.get(key)
  if (!entry) {
    entry = { attempts: 0 }
    modules.set(key, entry)
  }
  if (entry.request) return entry.request
  const attempt = entry
  if (attempt.attempts) url.searchParams.set('site-retry', String(attempt.attempts))
  attempt.request = (attempt.attempts ? import(/* @vite-ignore */ url.href) : load()).then(module => {
    if (!attempt.attempts) modules.delete(key)
    return module
  }, error => {
    attempt.attempts++
    attempt.request = undefined
    throw error
  })
  return attempt.request
}

export function installSiteModuleLoader() {
  Object.assign(globalThis, { [Symbol.for('syntrofic.site.import')]: loadModule })
  document.addEventListener('error', event => {
    const link = event.target
    if (!(link instanceof HTMLLinkElement) || link.rel !== 'stylesheet') return
    const url = new URL(link.href)
    if (url.origin !== location.origin || url.searchParams.has('site-retry')) return
    styles.set(link.href, { link, attempts: 0 })
  }, true)
}

export function retrySiteStylesheet(error: unknown) {
  if (!(error instanceof Error)) return
  // Vite's preload error includes the URL of the failed stylesheet.
  const match = [...styles].find(([href]) => error.message.endsWith(href))
  if (!match) return
  const [href, style] = match
  if (style.request) return style.request
  const url = new URL(href)
  url.searchParams.set('site-retry', String(++style.attempts))
  const link = style.link.cloneNode() as HTMLLinkElement
  link.href = url.href
  style.request = new Promise<void>((resolve, reject) => {
    link.addEventListener('load', () => {
      style.link.remove()
      styles.delete(href)
      resolve()
    }, { once: true })
    link.addEventListener('error', () => {
      link.remove()
      style.request = undefined
      reject(error)
    }, { once: true })
    style.link.after(link)
  })
  return style.request
}
