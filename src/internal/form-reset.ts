import { onMounted, onBeforeUnmount } from 'vue'

export function onFormReset(
  getControl: () => { form: HTMLFormElement | null; ownerDocument: Document } | null,
  restore: () => void,
) {
  let document: Document | undefined
  let mounted = false

  function reset(event: Event) {
    const control = getControl()
    if (!control?.form || event.target !== control.form) return
    queueMicrotask(() => {
      if (mounted && !event.defaultPrevented) restore()
    })
  }

  onMounted(() => {
    mounted = true
    document = getControl()?.ownerDocument
    document?.addEventListener('reset', reset, true)
  })
  onBeforeUnmount(() => {
    mounted = false
    document?.removeEventListener('reset', reset, true)
  })
}
