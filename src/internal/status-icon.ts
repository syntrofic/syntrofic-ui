import { computed, h, inject, toValue, useId, type ComputedRef, type HTMLAttributes, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import SIcon from '../components/SIcon.vue'
import SInputStatusTip from './SInputStatusTip.vue'
import { joinIds } from './field'
import { useIcon, type SemanticIconSize } from './icons'

export type FieldStatusType = 'success' | 'warning' | 'error' | 'info'
export type FieldStatusVariant = 'attached' | 'detached' | 'tooltip'
export type FieldStatusLive = 'off' | 'polite' | 'assertive'
export interface FieldStatus { type: FieldStatusType; message?: string; variant?: FieldStatusVariant; live?: FieldStatusLive; label?: string }
export interface InputStatusIconOptions {
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
  isInGroup?: boolean
  size?: SemanticIconSize | number | string
}

export function useInputStatusIcon(state: MaybeRefOrGetter<FieldStatus | InputStatusIconOptions | undefined>) {
  const id = 'sy-status-' + useId()
  const source = computed(() => toValue(state))
  const legacy = computed(() => Boolean(source.value && 'type' in source.value))
  const options = computed<InputStatusIconOptions>(() => {
    const value = source.value
    return value && 'type' in value ? { status: value } : value ?? {}
  })
  const status = computed(() => options.value.status)
  const variant = computed(() => options.value.statusVariant ?? status.value?.variant ?? 'attached')
  const name = computed(() => status.value?.type)
  const hasTip = computed(() => variant.value === 'tooltip' && Boolean(status.value?.message) && !options.value.isInGroup)
  const statusIcon = computed(() => {
    const current = status.value
    if (!current || variant.value === 'detached' || options.value.isInGroup) return null
    const size = options.value.size ?? 'md'
    if (hasTip.value) return h(SInputStatusTip, { id, status: current, size })
    return h(SIcon, { name: current.type, color: current.type, size, class: 'sy-field-status-icon' })
  })
  const describedBy = computed(() => !options.value.isInGroup && status.value?.message && (legacy.value || hasTip.value) ? id : undefined)
  return { id, name, status, variant, icon: useIcon(name), statusIcon, describedBy }
}

type InputStatusGroup = { status: ComputedRef<FieldStatus | undefined>; describedBy: ComputedRef<string | undefined> }
export const inputStatusGroup: InjectionKey<InputStatusGroup> = Symbol('Syntrofic input group status')

export function useControlStatus<Attrs extends Pick<HTMLAttributes, 'aria-describedby' | 'aria-invalid'>>(
  status: MaybeRefOrGetter<FieldStatus | undefined>, controlAttrs: () => Attrs,
) {
  const group = inject(inputStatusGroup, undefined)
  const own = useInputStatusIcon(() => group?.status.value ? undefined : toValue(status))
  const isInvalid = computed(() => (group?.status.value ?? own.status.value)?.type === 'error')
  function attrs() {
    const base = controlAttrs()
    return { ...base, 'aria-describedby': joinIds(base['aria-describedby'], group?.describedBy.value, own.describedBy.value),
      'aria-invalid': isInvalid.value ? true as const : base['aria-invalid'] }
  }
  return { ...own, isInvalid, attrs }
}
