import { createApp, h, nextTick, Suspense } from 'vue'
import type { Component } from 'vue'
import { settleInitialStyles } from '../src/internal/initial-styles'
import '../src/styles/index.css'
import { templateDemos } from './template-demos'

const demos: Record<string, () => Promise<{ default: Component }>> = {
  hero: () => import('./HeroDemo.vue'),
  sample: () => import('./SampleDemo.vue'),
  component: () => import('./ComponentDemo.vue'),
  'layout-motion': () => import('../preview/LayoutToolsReview.vue'),
  theme: () => import('./ThemeDemo.vue'),
  ...templateDemos,
  'checkout-block': () => import('./CheckoutBlockTemplate.vue'),
  agent: () => import('./AgentDemo.vue'),
}

export async function mount(island: HTMLElement, index: number, report: (error: unknown, restoreFocus?: boolean) => void) {
  let app: ReturnType<typeof createApp> | undefined
  let host: HTMLElement | undefined
  let failed = false
  function fail(error: unknown) {
    if (failed) return
    failed = true
    void nextTick(() => {
      const restoreFocus = host?.contains(island.ownerDocument.activeElement)
      try { report(error, restoreFocus) }
      finally {
        app?.unmount()
        host?.remove()
      }
    })
  }
  try {
    const load = demos[island.dataset.island ?? '']
    if (!load) throw new Error('Unknown example ' + island.dataset.island)
    const { default: component } = await load()
    const { component: id, template: kind } = island.dataset
    const props = { ...(id !== undefined && { id }), ...(kind !== undefined && { kind }) }
    const previous = [...island.childNodes]
    const pending = document.createElement('div')
    host = pending
    pending.dataset.islandHost = 'pending'
    pending.dataset.syInitializing = ''
    pending.setAttribute('aria-hidden', 'true')
    pending.inert = true
    island.append(pending)
    function ready() {
      void nextTick(() => {
        if (failed || island.dataset.islandState === 'ready') return
        const active = island.ownerDocument.activeElement
        const restoreFocus = active && previous.some(node => node.contains(active))
        for (const node of previous) node.parentNode?.removeChild(node)
        pending.dataset.islandHost = 'ready'
        pending.removeAttribute('aria-hidden')
        pending.inert = false
        island.dataset.islandState = 'ready'
        island.removeAttribute('aria-busy')
        if (restoreFocus) {
          island.tabIndex = -1
          island.focus({ preventScroll: true })
        }
        settleInitialStyles(pending)
      })
    }
    app = createApp({ render: () => h(Suspense, { onResolve: ready }, { default: () => h(component, props) }) })
    app.config.idPrefix = 'site-' + index
    app.config.errorHandler = fail
    app.mount(pending)
  } catch (error) {
    fail(error)
  }
}
