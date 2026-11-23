import { createApp, h, nextTick, ref, Suspense, type Component } from 'vue'
import SBrandTheme from '../src/components/SBrandTheme.vue'
import { settleInitialStyles } from '../src/internal/initial-styles'
import type { BrandMode, BrandTheme } from '../src/platform/theme-workspace'
import { templateDemos } from '../site/template-demos'
import { setSiteDisclosure, setSiteText } from '../site/motion'
import ReviewExample from './ReviewExample.vue'
import ThemeOverlaySpecimens from './ThemeOverlaySpecimens.vue'
import './review.css'

const source = document.getElementById('theme-sheet-definition')
if (source?.textContent) {
  const theme = JSON.parse(source.textContent) as BrandTheme
  const appearance = ref<BrandMode | 'system'>('system')
  const sync = () => {
    const mode = document.body.dataset.syTheme
    appearance.value = mode === 'light' || mode === 'dark' ? mode : 'system'
  }
  sync()
  new MutationObserver(sync).observe(document.body, { attributeFilter: ['data-sy-theme'] })

  const overlays = document.querySelector<HTMLElement>('[data-theme-overlays]')
  if (overlays) {
    const app = createApp({
      render: () => h(SBrandTheme, { theme, mode: appearance.value }, { default: () => h(ThemeOverlaySpecimens) }),
    })
    app.config.idPrefix = 'theme-overlays'
    overlays.dataset.syInitializing = ''
    app.mount(overlays)
    void nextTick(() => {
      settleInitialStyles(overlays)
      overlays.removeAttribute('aria-busy')
    })
  }

  async function visit(detail: HTMLDetailsElement, retry = false) {
    const canvas = detail.querySelector<HTMLElement>('[data-theme-example], [data-theme-template]')
    const key = canvas?.dataset.themeExample ?? canvas?.dataset.themeTemplate
    if (!detail.open || !canvas || !key || canvas.dataset.ready && !(retry && canvas.dataset.ready === 'failed')) return
    const previous = [...canvas.childNodes]
    const returnFocus = retry && canvas.contains(document.activeElement)
    canvas.dataset.ready = 'pending'
    canvas.setAttribute('aria-busy', 'true')
    if (retry) {
      canvas.querySelector('button')?.setAttribute('aria-disabled', 'true')
      const status = canvas.querySelector<HTMLElement>('[role="status"]')
      if (status) setSiteText(status, '正在重试…')
    }
    let app: ReturnType<typeof createApp> | undefined
    let failed = false
    const fail = (error: unknown) => {
      if (failed) return
      failed = true
      console.error(error)
      void nextTick(() => {
        const restore = canvas.contains(document.activeElement)
        const failure = document.createElement('div')
        const status = document.createElement('span')
        const button = document.createElement('button')
        failure.className = 'theme-example__failure'
        status.setAttribute('role', 'status')
        status.textContent = '此示例无法打开。'
        button.type = 'button'
        button.textContent = '重新加载示例'
        button.addEventListener('click', () => { void visit(detail, true) })
        failure.append(status, button)
        try {
          canvas.replaceChildren(failure)
          canvas.dataset.ready = 'failed'
          canvas.removeAttribute('aria-busy')
          if (detail.open && restore) button.focus({ preventScroll: true })
        } finally { app?.unmount() }
      })
    }
    try {
      const island = canvas.dataset.themeTemplateIsland as keyof typeof templateDemos | undefined
      const load = island && Object.hasOwn(templateDemos, island) ? templateDemos[island] : undefined
      if (canvas.dataset.themeTemplate && !load) throw new Error('Missing theme template: ' + key)
      const component: Component = load ? (await load()).default : ReviewExample
      const props = load ? { kind: key, ...(island === 'identity-template' && { theme }) } : { id: key }
      const host = document.createElement('div')
      host.dataset.themeHost = 'pending'
      host.dataset.syInitializing = ''
      host.inert = true
      host.setAttribute('aria-hidden', 'true')
      canvas.append(host)
      const ready = () => {
        void nextTick(() => {
          if (failed || canvas.dataset.ready !== 'pending') return
          const restore = returnFocus && previous.some(node => node.contains(document.activeElement))
          for (const node of previous) node.parentNode?.removeChild(node)
          host.dataset.themeHost = 'ready'
          host.inert = false
          host.removeAttribute('aria-hidden')
          canvas.dataset.ready = 'true'
          canvas.removeAttribute('aria-busy')
          if (detail.open && restore) canvas.focus({ preventScroll: true })
          settleInitialStyles(host)
        })
      }
      app = createApp({
        render: () => h(Suspense, { onResolve: ready }, { default: () =>
          h(SBrandTheme, { theme, mode: appearance.value }, { default: () => h(component, props) }) }),
      })
      app.config.idPrefix = 'theme-' + (load ? 'page-' : '') + key.replace(/[^a-z0-9-]/gi, '-')
      app.config.errorHandler = fail
      app.mount(host)
    } catch (error) { fail(error) }
  }

  const panelSelector = 'details:is([data-theme-example-panel], [data-theme-template-panel])'
  const disclosureSelector = panelSelector + ', details[data-theme-variant-panel]'
  document.addEventListener('click', event => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return
    const summary = event.target.closest('summary')
    const detail = summary?.parentElement
    if (!(detail instanceof HTMLDetailsElement) || !detail.matches(disclosureSelector)) return
    event.preventDefault()
    setSiteDisclosure(detail, !detail.open)
  })
  document.addEventListener('toggle', event => {
    const detail = event.target
    if (detail instanceof HTMLDetailsElement && detail.matches(panelSelector)) void visit(detail)
  }, true)
  for (const detail of document.querySelectorAll<HTMLDetailsElement>(panelSelector + '[open]')) void visit(detail)
}
