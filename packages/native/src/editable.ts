import type { EditableTextBase, EventData, View } from '@nativescript/core'
import { computed, inject, onBeforeUnmount, ref, type InjectionKey } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from './context'
import { nativeFocusGroup } from './focus'
import type { NativeInputOptions } from './form'

export const nativeInputGroup: InjectionKey<{
  anchor: () => View | undefined
  disabled: () => boolean
  readonly: () => boolean
  focus: (active: boolean) => void
}> = Symbol('Native input group')

export function useNativeEditable(
  props: NativeInputOptions,
  view: () => EditableTextBase | undefined,
  read: () => string,
  write: (value: string) => void,
  announce: (focused: boolean) => void,
  multiline = false,
) {
  const { theme, fontFamily, direction } = useNativeUI()
  const group = inject(nativeInputGroup, undefined)
  const focusGroup = inject(nativeFocusGroup, undefined)
  const focused = ref(false)
  const disabled = computed(() => props.disabled || group?.disabled())
  const borderColor = computed(() => {
    const colors = theme.value.colors
    if (props.invalid) return colors.danger
    if (focused.value && !focusGroup) return colors.focus
    return props.variant === 'outline' ? colors.borderStrong : 'transparent'
  })
  const appearance = computed(() => ({
    color: theme.value.colors.text,
    backgroundColor: group ? 'transparent' : props.variant === 'outline' ? theme.value.colors.surface : theme.value.colors.control,
    placeholderColor: theme.value.colors.textMuted,
    borderColor: borderColor.value,
    borderWidth: group ? 0 : 1,
    borderRadius: group ? 0 : multiline ? theme.value.geometry.radiusMd : 22,
    cornerShape: multiline ? 'squircle' as const : 'round' as const,
    minHeight: 44,
    padding: group ? theme.value.geometry.space2 : theme.value.geometry.space3,
    opacity: disabled.value && !group ? 0.55 : 1,
    style: nativeTextStyle((read() || props.placeholder) ?? '', fontFamily.value),
    fontSize: 15,
    iosAccessibilityAdjustsFontSize: true,
    direction: direction.value,
    textAlignment: direction.value === 'rtl' ? 'right' : 'left',
    androidElevation: 0,
  }))

  function edit(event: EventData) {
    const text = (event.object as EditableTextBase).text
    if (text !== read()) write(text)
  }

  let focusAnchor: View | undefined
  function updateFocus(active: boolean) {
    focused.value = active
    group?.focus(active)
    if (active) {
      focusAnchor = group?.anchor() ?? view()
      if (focusAnchor) focusGroup?.focus(focusAnchor)
    } else if (focusAnchor) {
      focusGroup?.blur(focusAnchor)
      focusAnchor = undefined
    }
    announce(active)
  }

  onBeforeUnmount(() => {
    if (!focused.value) return
    group?.focus(false)
    if (focusAnchor) focusGroup?.blur(focusAnchor)
  })
  return {
    appearance, disabled, edit, updateFocus,
    readonly: computed(() => props.readonly || group?.readonly()),
    focus: () => !disabled.value && (view()?.focus() ?? false),
    dismissKeyboard: () => view()?.dismissSoftInput(),
  }
}
