import { defineComponent, h, readonly, ref, shallowRef, type VNodeChild } from 'vue'
import SAlertDialog from '../components/SAlertDialog.vue'
import SDialog from '../components/SDialog.vue'

type DialogContent = VNodeChild | ((close: () => void) => VNodeChild)
type DialogProps = InstanceType<typeof SDialog>['$props']
type AlertProps = InstanceType<typeof SAlertDialog>['$props']
export type ImperativeDialogOptions = Omit<DialogProps, 'open' | 'onUpdate:open'>
export type ImperativeAlertOptions = Omit<AlertProps, 'open' | 'onUpdate:open'> & { content?: DialogContent }

function renderContent(content: DialogContent | undefined, hide: () => void) {
  return content === undefined ? undefined : { default: () => typeof content === 'function' ? content(hide) : content }
}

export function useImperativeDialog() {
  const open = ref(false)
  const request = shallowRef<{ content: DialogContent; options?: ImperativeDialogOptions }>()
  function show(content: DialogContent, options?: ImperativeDialogOptions) {
    request.value = { content, options }
    open.value = true
  }
  function hide() { open.value = false }
  const element = defineComponent({
    name: 'SImperativeDialog',
    setup: () => () => {
      const config = request.value
      if (!config) return null
      return h(SDialog, {
        title: 'Dialog', ...config.options, open: open.value, 'onUpdate:open': value => { open.value = Boolean(value) },
      }, renderContent(config.content, hide))
    },
  })
  return { show, hide, isOpen: readonly(open), element }
}

export function useImperativeAlertDialog() {
  const open = ref(false)
  const request = shallowRef<ImperativeAlertOptions>()
  function show(options: ImperativeAlertOptions) {
    request.value = options
    open.value = true
  }
  function hide() { open.value = false }
  const element = defineComponent({
    name: 'SImperativeAlertDialog',
    setup: () => () => {
      const config = request.value
      if (!config) return null
      const { content, ...settings } = config
      return h(SAlertDialog, { ...settings, open: open.value, 'onUpdate:open': value => { open.value = Boolean(value) } }, renderContent(content, hide))
    },
  })
  return { show, hide, isOpen: readonly(open), element }
}
