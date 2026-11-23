import { computed, inject, ref, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue'

export const disclosureGroup: InjectionKey<{
  isOpen: (value: string) => boolean
  setOpen: (value: string, open: boolean) => void
  isDisabled: () => boolean
}> = Symbol('Syntrofic disclosure group')

export interface CollapsibleConfig {
  defaultIsOpen?: boolean
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export interface CollapsibleOptions {
  isCollapsible?: boolean | CollapsibleConfig
  value?: string
}

export function useCollapsible(options: MaybeRefOrGetter<CollapsibleOptions> = {}) {
  const group = inject(disclosureGroup, null)
  const settings = computed(() => toValue(options))
  const config = computed(() => typeof settings.value.isCollapsible === 'object' ? settings.value.isCollapsible : undefined)
  const isEnabled = computed(() => Boolean(settings.value.isCollapsible))
  const local = ref(config.value?.isOpen ?? config.value?.defaultIsOpen ?? true)
  const isGroupItem = computed(() => Boolean(group && settings.value.value !== undefined))
  const disabled = computed(() => Boolean(group?.isDisabled()))
  const isOpen = computed(() => isGroupItem.value ? group!.isOpen(settings.value.value!) : config.value?.isOpen ?? local.value)
  function setOpen(next: boolean) {
    if (isGroupItem.value && disabled.value || !isEnabled.value || next === isOpen.value) return
    if (isGroupItem.value) group!.setOpen(settings.value.value!, next)
    else {
      if (config.value?.isOpen === undefined) local.value = next
      config.value?.onOpenChange?.(next)
    }
  }
  return { isEnabled, isOpen, disabled, setOpen, toggle: () => setOpen(!isOpen.value) }
}
