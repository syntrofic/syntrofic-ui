import { computed, toValue, watch, watchEffect, type MaybeRefOrGetter, type Ref } from 'vue'
import { useTranslator } from '../rac/locale'
import { createResizeHandleGesture, useResizeMaximum } from './resize-handle-gesture'
import { resizeHandleState } from './resize-pane'
import type { ResizableControl } from './use-resizable'

export interface NativeResizeHandleOptions {
  handleRef?: MaybeRefOrGetter<HTMLElement | null | undefined>
  controls?: string
  label?: string
  edge?: 'start' | 'end'
  step?: number
  disabled?: boolean
}

function resizeAttributes(element: HTMLElement) {
  const changes = new Map<string, { original: string | null; latest: string | null }>()
  function write(name: string, value: string | number | undefined) {
    const current = element.getAttribute(name)
    const change = changes.get(name)
    if (change && change.latest !== current) return
    const latest = value === undefined ? null : String(value)
    if (latest === current) return
    changes.set(name, { original: change ? change.original : current, latest })
    if (latest === null) element.removeAttribute(name)
    else element.setAttribute(name, latest)
  }
  function restore() {
    for (const [name, { original, latest }] of changes) {
      if (element.getAttribute(name) !== latest) continue
      if (original === null) element.removeAttribute(name)
      else element.setAttribute(name, original)
    }
  }
  return { write, restore }
}

export function bindNativeResizeHandle(settings: () => NativeResizeHandleOptions, model: Readonly<Ref<ResizableControl['props']['value']>>) {
  const handle = computed(() => toValue(settings().handleRef))
  const state = computed(() => resizeHandleState(model.value.readDragSize))
  const maximum = useResizeMaximum(handle, () => ({
    ...model.value, min: state.value?.minimum.value ?? model.value.min, measuredExtent: state.value?.measuredExtent.value,
  }))
  const translate = useTranslator({ 'resize.handle': 'Resize handle', 'resize.collapsed': 'Collapsed' })

  watch(handle, (node, _, cleanup) => {
    if (!node) return
    const attributes = resizeAttributes(node)
    const ownRole = node.hasAttribute('role')
    const ownTabStop = node.hasAttribute('tabindex')
    const ownName = node.hasAttribute('aria-label') || node.hasAttribute('aria-labelledby')
    const ownControls = node.hasAttribute('aria-controls')
    const style = node.style
    let touchAction: { value: string; priority: string } | undefined
    const gesture = createResizeHandleGesture(node, () => ({
      ...model.value, edge: settings().edge ?? 'start', step: settings().step ?? 8,
      disabled: settings().disabled, accessibleMaximum: maximum.value,
    }))

    function allowTouchDrag(enabled: boolean) {
      if (enabled && !touchAction) {
        touchAction = { value: style.getPropertyValue('touch-action'), priority: style.getPropertyPriority('touch-action') }
        style.setProperty('touch-action', 'none')
      } else if (!enabled && touchAction) {
        if (style.getPropertyValue('touch-action') === 'none' && !style.getPropertyPriority('touch-action')) {
          style.setProperty('touch-action', touchAction.value, touchAction.priority)
        }
        touchAction = undefined
      }
    }

    const stopAttributes = watchEffect(() => {
      const { disabled, controls, edge, label } = settings()
      if (disabled) gesture.dispose()
      const { axis, min, value } = model.value
      const collapsed = state.value?.collapsed.value
      if (!ownRole) attributes.write('role', 'separator')
      if (!ownTabStop) attributes.write('tabindex', 0)
      if (!ownName) attributes.write('aria-label', label ?? translate('resize.handle'))
      if (!ownControls) attributes.write('aria-controls', controls)
      attributes.write('aria-orientation', axis === 'horizontal' ? 'vertical' : 'horizontal')
      attributes.write('aria-valuemin', min)
      attributes.write('aria-valuemax', maximum.value)
      attributes.write('aria-valuenow', value)
      attributes.write('aria-valuetext', collapsed ? state.value?.collapsedLabel.value ?? translate('resize.collapsed') : undefined)
      attributes.write('aria-disabled', disabled ? 'true' : undefined)
      attributes.write('data-resize-axis', axis)
      attributes.write('data-resize-edge', edge ?? 'start')
      attributes.write('data-dragging', gesture.dragging.value ? '' : undefined)
      allowTouchDrag(!disabled)
    }, { flush: 'post' })

    const listeners = {
      pointerdown: gesture.pointerDown,
      pointermove: gesture.pointerMove,
      pointerup: gesture.stop,
      pointercancel: gesture.stop,
      lostpointercapture: gesture.stop,
      keydown: gesture.keyboard,
      dblclick: gesture.toggle,
    } satisfies { [Event in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[Event]) => void }
    for (const [type, listener] of Object.entries(listeners)) node.addEventListener(type, listener as EventListener)
    cleanup(() => {
      stopAttributes()
      for (const [type, listener] of Object.entries(listeners)) node.removeEventListener(type, listener as EventListener)
      gesture.dispose()
      attributes.restore()
      allowTouchDrag(false)
    })
  }, { flush: 'post', immediate: true })
}
