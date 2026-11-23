import type { InjectionKey, Ref } from 'vue'

export interface CommandInputContext {
  query: Ref<string>
  busy: Readonly<Ref<boolean>>
  state: Readonly<Ref<{
    label: string
    placeholder: string
    controls: string
    expanded: boolean
    activeId?: string
    autofocus: boolean
  }>>
  bind(node: HTMLInputElement | null): void
  keydown(event: KeyboardEvent): void
}

export const commandInputContext: InjectionKey<CommandInputContext> = Symbol('command palette input')
