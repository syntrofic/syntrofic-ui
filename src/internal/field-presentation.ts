import { computed, defineComponent, onScopeDispose, shallowRef, useId, watch, type InputHTMLAttributes, type Ref } from 'vue'
import { joinIds } from './field'
import { onFormReset } from './form-reset'
import { useTooltip } from './tooltip'

export type FieldSize = 'sm' | 'md' | 'lg'

export interface FieldAppearance {
  width?: string | number
  hideLabel?: boolean
  optional?: boolean
  labelTooltip?: string
  labelTooltipLabel?: string
  labelIcon?: string
  startIcon?: string
  disabledMessage?: string
}

export interface TextWorkOptions extends FieldAppearance {
  loading?: boolean
  changeAction?: (value: string, event: Event, signal: AbortSignal) => void | PromiseLike<void>
}

export function useFieldPresentation(options: FieldAppearance, control: () => HTMLInputElement | HTMLTextAreaElement | null, disabled: Ref<boolean | undefined>) {
  const noteId = 'sy-field-disabled-' + useId()
  const disabledReason = computed(() => disabled.value ? options.disabledMessage : undefined)
  const nativeDisabled = computed(() => disabled.value && !disabledReason.value || undefined)
  const inlineSize = computed(() => typeof options.width === 'number' ? options.width + 'px' : options.width)
  const tooltip = useTooltip(() => ({ delay: 180, hideDelay: 120, isEnabled: Boolean(disabledReason.value) }))
  watch([control, disabledReason], ([element, reason]) => tooltip.ref(reason ? element : null), { flush: 'post' })
  const DisabledTip = defineComponent(() => () => disabledReason.value ? tooltip.renderTooltip(disabledReason.value, { offset: 5 }) : null)
  return { nativeDisabled, disabledReason, noteId, inlineSize, DisabledTip }
}

export function useTextWork(options: TextWorkOptions, control: () => HTMLInputElement | HTMLTextAreaElement | null, onError: (error: unknown) => void) {
  const pending = shallowRef<AbortController>()
  const busy = computed(() => Boolean(options.loading || pending.value))
  function cancel() {
    const previous = pending.value
    pending.value = undefined
    previous?.abort()
  }
  onFormReset(control, cancel)
  onScopeDispose(cancel)
  async function run(value: string, event: Event) {
    if (!options.changeAction || event.defaultPrevented) return
    const previous = pending.value
    const request = new AbortController()
    pending.value = request
    previous?.abort()
    if (request.signal.aborted) return
    try {
      const result = options.changeAction(value, event, request.signal)
      if (result) await result
    } catch (error) {
      if (!request.signal.aborted) onError(error)
    } finally {
      if (pending.value === request) pending.value = undefined
    }
  }
  function edit(event: Event) {
    const element = event.currentTarget as (HTMLInputElement | HTMLTextAreaElement) & { composing?: boolean }
    if (!(event as InputEvent).isComposing && !element.composing) void run(element.value, event)
  }
  return { busy, run, edit }
}

export function editableFieldAttrs(attrs: Record<string, unknown>, reason: string | undefined, id: string, busy?: boolean): InputHTMLAttributes {
  return { ...attrs, ...(reason && { name: undefined, readonly: true, 'aria-disabled': true }),
    'aria-describedby': joinIds(attrs['aria-describedby'], reason && id), 'aria-busy': busy || attrs['aria-busy'] as InputHTMLAttributes['aria-busy'] }
}
