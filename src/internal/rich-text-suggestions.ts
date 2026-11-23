import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion, exitSuggestion, type SuggestionProps } from '@tiptap/suggestion'
import type { RichTextSuggestion } from './rich-text-commands'

export function useRichTextSuggestions(id: string, choices: () => readonly RichTextSuggestion[], enabled: () => boolean) {
  type Menu = SuggestionProps<RichTextSuggestion, RichTextSuggestion>
  const menu = shallowRef<Menu>()
  const host = shallowRef<HTMLElement>()
  const active = ref(0)
  const visible = ref(false)
  const key = new PluginKey('syntrofic-suggestions')
  const items = computed(() => menu.value?.items ?? [])
  let teardown: (() => void) | undefined

  function updateAria() {
    const dom = menu.value?.editor.view.dom
    if (!dom) return
    dom.setAttribute('aria-controls', id)
    dom.setAttribute('aria-autocomplete', 'list')
    if (items.value.length) dom.setAttribute('aria-activedescendant', `${id}-${active.value}`)
    else dom.removeAttribute('aria-activedescendant')
  }

  function cleanup() {
    if (visible.value) return
    teardown?.()
    teardown = undefined
    host.value = undefined
    menu.value = undefined
  }

  function hide() {
    const dom = menu.value?.editor.view.dom
    for (const attribute of ['aria-controls', 'aria-autocomplete', 'aria-activedescendant']) dom?.removeAttribute(attribute)
    visible.value = false
  }

  function choose(index: number) {
    const item = items.value[index]
    if (item) menu.value?.command(item)
  }

  const extension = Extension.create({
    name: 'syntroficSuggestions',
    addProseMirrorPlugins() {
      return [Suggestion<RichTextSuggestion, RichTextSuggestion>({
        editor: this.editor,
        pluginKey: key,
        char: '/',
        startOfLine: true,
        container: `#${id}-container`,
        allow: ({ editor }) => enabled() && editor.isEditable && !editor.isActive('codeBlock'),
        items: ({ query }) => {
          const term = query.trim().toLocaleLowerCase()
          return choices().filter(item => [item.label, item.id, ...(item.keywords ?? [])].some(name => name.toLocaleLowerCase().includes(term)))
        },
        command: ({ editor, range, props }) => {
          editor.commands.deleteRange(range)
          props.run(editor)
          editor.view.focus()
        },
        render: () => ({
          onStart(next) {
            teardown?.()
            const layer = next.editor.view.dom.ownerDocument.createElement('div')
            layer.className = 'sy-rich-text__suggestion-position'
            menu.value = next
            active.value = 0
            host.value = layer
            teardown = next.mount(layer)
            visible.value = true
            updateAria()
          },
          onUpdate(next) {
            const reset = next.query !== menu.value?.query
            menu.value = next
            active.value = reset ? 0 : Math.min(active.value, Math.max(0, next.items.length - 1))
            updateAria()
          },
          onKeyDown({ event, view }) {
            if (event.isComposing) return false
            if (event.key === 'Escape') {
              exitSuggestion(view, key)
              return true
            }
            const count = items.value.length
            if (!count) return false
            if (event.key === 'Enter') {
              choose(active.value)
              return true
            }
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return false
            const next = event.key === 'ArrowDown' ? 1 : -1
            active.value = (active.value + next + count) % count
            updateAria()
            host.value?.ownerDocument.getElementById(`${id}-${active.value}`)?.scrollIntoView({ block: 'nearest' })
            return true
          },
          onExit: hide,
        }),
      })]
    },
  })
  onBeforeUnmount(() => { hide(); cleanup() })
  return { extension, host, visible, active, items, choose, cleanup }
}
