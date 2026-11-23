import { createToastManager, type GlobalToastManager } from 'reka-ui'
import { createApp, getCurrentInstance, h, inject, type VNodeChild } from 'vue'
import SToastProvider from '../components/SToastProvider.vue'
import { toastContent, toastQueueContext, type ToastContent } from './toast-context'

export interface ToastOptions {
  body: VNodeChild
  title?: string
  type?: 'info' | 'error'
  isAutoHide?: boolean
  autoHideDuration?: number
  endContent?: VNodeChild
  uniqueID?: string
  collisionBehavior?: 'overwrite' | 'ignore'
  onHide?: (reason: 'auto' | 'manual') => void
  renderContent?: (options: ToastOptions & { dismiss: () => void }) => VNodeChild
}

const fallback = new WeakMap<Document, GlobalToastManager>()
const active = new WeakMap<GlobalToastManager, Map<string, () => void>>()
const noop = () => {}

function managerFor(document: Document) {
  const existing = fallback.get(document)
  if (existing) return existing
  if (!document.body) return
  const queue = createToastManager()
  const host = document.createElement('div')
  host.className = 'sy-toast-fallback'
  document.body.append(host)
  if (import.meta.env.DEV) console.warn('[Syntrofic UI] useToast mounted a fallback viewport. Use SLayerProvider to configure its placement and insets.')
  createApp({ render: () => h(SToastProvider, { queue, placement: 'bottom-end', maxVisible: 5, topLayer: true }) }).mount(host)
  fallback.set(document, queue)
  return queue
}

export function useToast() {
  const injected = inject(toastQueueContext, undefined)
  const instance = getCurrentInstance()
  return (options: ToastOptions) => {
    const document = instance?.proxy?.$el?.ownerDocument ?? globalThis.document
    const manager = injected?.value ?? (document && managerFor(document))
    if (!manager) return noop
    const entries = active.get(manager) ?? new Map<string, () => void>()
    active.set(manager, entries)
    if (options.uniqueID && options.collisionBehavior === 'ignore' && entries.has(options.uniqueID)) return noop
    const autoHide = options.isAutoHide ?? options.type !== 'error'
    const duration = autoHide ? Math.max(1, Number.isFinite(options.autoHideDuration) ? options.autoHideDuration ?? 5000 : 5000) : Infinity
    let reason: 'auto' | 'manual' = autoHide ? 'auto' : 'manual'
    let id: string
    let closing = false
    function markManual() { reason = 'manual' }
    function dismiss() {
      if (closing || entries.get(id) !== dismiss) return
      markManual()
      manager!.close(id)
    }
    const data: ToastContent = { body: options.body, endContent: options.endContent, markManual,
      custom: options.renderContent && (() => options.renderContent?.({ ...options, dismiss })) }
    id = manager.add({ id: options.uniqueID, title: options.title ?? (typeof options.body === 'string' ? options.body : undefined),
      duration, status: options.type === 'error' ? 'error' : undefined, data: { [toastContent]: data },
      onClose() {
        if (closing || entries.get(id) !== dismiss) return
        closing = true
        options.onHide?.(reason)
      },
      onRemove() { if (entries.get(id) === dismiss) entries.delete(id) },
    })
    entries.set(id, dismiss)
    return dismiss
  }
}
