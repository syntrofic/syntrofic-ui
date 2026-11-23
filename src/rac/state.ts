import { inject, type InjectionKey, type Ref } from 'vue'

export interface OpenState {
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
}

export function openState(value: Readonly<Ref<boolean>>, setOpen: (open: boolean) => void): OpenState {
  return { open: value, setOpen, toggle: () => setOpen(!value.value), close: () => setOpen(false) }
}

export const OverlayTriggerStateContext: InjectionKey<OpenState> = Symbol('overlay-trigger-state')
export const DisclosureStateContext: InjectionKey<OpenState> = Symbol('disclosure-state')
export const useOverlayTriggerState = () => inject(OverlayTriggerStateContext, null)
export const useDisclosureState = () => inject(DisclosureStateContext, null)
