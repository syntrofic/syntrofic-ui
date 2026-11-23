import { computed, inject, useAttrs, useId, type ComputedRef, type InjectionKey } from 'vue'
import { toolbarContext } from './toolbar-context'

export interface FieldContext {
  id: ComputedRef<string>
  describedBy: ComputedRef<string | undefined>
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
}

export interface TextControlProps {
  id?: string
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

export const fieldContext: InjectionKey<FieldContext> = Symbol('Syntrofic field')

export function joinIds(...values: unknown[]) {
  const ids = new Set(values.flatMap(value => typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean) : []))
  return [...ids].join(' ') || undefined
}

export function useTextControl(props: TextControlProps, prefix: string) {
  const inherited = inject(fieldContext, null)
  const toolbar = inject(toolbarContext, null)
  const unique = `${prefix}-${useId()}`
  const hintId = `${unique}-hint`
  const errorId = `${unique}-error`
  const attrs = useAttrs()
  const id = computed(() => props.id ?? inherited?.id.value ?? unique)
  const disabled = computed(() => props.disabled || inherited?.disabled.value || toolbar?.disabled.value || undefined)
  const required = computed(() => props.required || inherited?.required.value || undefined)
  const invalid = computed(() => Boolean(props.error || inherited?.invalid.value))

  function controlAttrs() {
    return {
      ...attrs,
      ...(invalid.value ? { 'aria-invalid': true as const } : {}),
      'aria-describedby': joinIds(
        attrs['aria-describedby'],
        inherited?.describedBy.value,
        props.description && hintId,
        props.error && errorId,
      ),
    }
  }

  return { id, hintId, errorId, disabled, required, invalid, controlAttrs }
}
