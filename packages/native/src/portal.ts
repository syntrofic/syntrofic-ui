import { inject, provide, shallowRef, type InjectionKey, type VNode } from 'nativescript-vue'

interface NativePortalEntry {
  id: symbol
  render: () => VNode[] | undefined
}

function portalHost() {
  const entries = shallowRef<NativePortalEntry[]>([])
  function add(entry: NativePortalEntry) {
    entries.value = [...entries.value.filter(item => item.id !== entry.id), entry]
  }
  function remove(id: symbol) {
    if (entries.value.some(entry => entry.id === id)) entries.value = entries.value.filter(entry => entry.id !== id)
  }
  return { entries, add, remove }
}
const portal: InjectionKey<ReturnType<typeof portalHost>> = Symbol('Syntrofic native portal')
export function provideNativePortal() {
  const host = portalHost()
  provide(portal, host)
  return host.entries
}
export function injectNativePortal() { return inject(portal, undefined) }
