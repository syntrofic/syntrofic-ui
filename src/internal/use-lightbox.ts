import { computed, defineComponent, h, readonly, ref, toValue, type MaybeRefOrGetter } from 'vue'
import SLightbox from '../components/SLightbox.vue'

export type UseLightboxOptions = Omit<InstanceType<typeof SLightbox>['$props'], 'open' | 'index' | 'onUpdate:open' | 'onUpdate:index'>

export function useLightbox(options: MaybeRefOrGetter<UseLightboxOptions>) {
  const state = ref(false)
  const position = ref(0)
  function open(index = 0) {
    const media = toValue(options).media
    const length = Array.isArray(media) ? media.length : 1
    if (!length) return
    position.value = Math.max(0, Math.min(length - 1, Math.trunc(index) || 0))
    state.value = true
  }
  function close() { state.value = false }
  function getTriggerProps(index = 0) {
    return {
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': state.value,
      onClick(event: MouseEvent) {
        if (event.defaultPrevented) return
        if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
        open(index)
      },
    }
  }
  const element = defineComponent({
    name: 'SManagedLightbox',
    setup: () => () => h(SLightbox, {
      ...toValue(options), open: state.value, index: position.value,
      'onUpdate:open': value => { state.value = Boolean(value) },
      'onUpdate:index': value => { position.value = value },
    }),
  })
  return { open, close, isOpen: readonly(state), index: readonly(position), element, getTriggerProps,
    triggerProps: computed(() => getTriggerProps()) }
}
