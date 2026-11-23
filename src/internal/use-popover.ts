import { defineComponent, h, readonly, ref, shallowRef } from 'vue'
import SPopover from '../components/SPopover.vue'

export type UsePopoverOptions = Omit<InstanceType<typeof SPopover>['$props'], 'open' | 'onUpdate:open'>

export function usePopover(options: UsePopoverOptions = {}) {
  const open = ref(false)
  const target = shallowRef(options.anchor)
  function show(anchor?: UsePopoverOptions['anchor']) {
    if (anchor !== undefined) target.value = anchor
    open.value = true
  }
  function hide() { open.value = false }
  function toggle() { if (open.value) hide(); else show() }
  const element = defineComponent({
    name: 'SManagedPopover',
    setup(_, { slots }) {
      return () => h(SPopover, { ...options, anchor: target.value, open: open.value, 'onUpdate:open': value => { open.value = Boolean(value) } }, slots)
    },
  })
  return { show, hide, toggle, isOpen: readonly(open), element }
}
