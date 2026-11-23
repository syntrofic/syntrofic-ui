import { defineComponent, h, shallowRef, type PropType } from 'vue'
import { focusRoving } from './collection-focus'
import type { CommandItem } from './command'
import SKbd from '../components/SKbd.vue'
import SIcon from '../components/SIcon.vue'
import { useTranslator } from '../rac/locale'

export const SCommandEmpty = defineComponent({
  name: 'SCommandEmpty',
  setup(_, { slots }) { return () => h('div', { class: 'sy-command__empty', role: 'status' }, slots.default?.()) },
})
export const SCommandFooter = defineComponent({
  name: 'SCommandFooter',
  setup(_, { slots }) {
    const translate = useTranslator({ 'command.move': 'Move', 'command.select': 'Select', 'command.dismiss': 'Dismiss' })
    const hints = [{ keys: ['up', 'down'], label: 'command.move' },
      { keys: ['enter'], label: 'command.select' }, { keys: ['escape'], label: 'command.dismiss' }]
    return () => h('div', { class: 'sy-command__footer' }, slots.default?.() ?? hints.map(({ keys, label }) =>
      h('span', { key: label, class: 'sy-command__hint' }, [h(SKbd, { keys, separator: '' }), translate(label)])))
  },
})
export const SCommandList = defineComponent({
  name: 'SCommandList',
  props: { label: String, separators: Boolean, setElement: Function as PropType<(node: HTMLElement | null) => void> },
  setup(props, { slots }) {
    const element = shallowRef<HTMLElement | null>(null)
    const items = () => [...element.value?.querySelectorAll<HTMLElement>('.sy-command__item[role="option"]') ?? []]
    const roving = focusRoving(element, () => !props.setElement, items, item => item)

    function keydown(event: KeyboardEvent) {
      if (props.setElement || event.defaultPrevented || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
      const options = items().filter(roving.canUse)
      if (!options.length) return
      const current = options.indexOf(event.target as HTMLElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      event.preventDefault()
      roving.focus(options[next])
    }
    return () => h('div', {
      class: 'sy-command__list', role: 'listbox', 'aria-label': props.label, 'data-separators': props.separators || undefined,
      'data-standalone': !props.setElement || undefined, onKeydown: keydown, onFocusin: roving.handleFocus,
      ref: (node: unknown) => {
        element.value = node instanceof HTMLElement ? node : null
        props.setElement?.(element.value)
      },
    }, [h('span', { class: 'sy-command__indicator', 'aria-hidden': 'true' }), ...(slots.default?.() ?? [])])
  },
})
export const SCommandGroup = defineComponent({
  name: 'SCommandGroup',
  props: { label: String },
  setup(props, { slots }) {
    return () => h('div', { class: 'sy-command__group', role: 'group', 'aria-label': props.label }, [
      props.label ? h('div', { class: 'sy-command__group-label', 'aria-hidden': 'true' }, slots.label?.() ?? props.label) : null,
      ...(slots.default?.() ?? []),
    ])
  },
})
export const SCommandItem = defineComponent({
  name: 'SCommandItem',
  props: { item: { type: Object as PropType<CommandItem>, required: true }, active: Boolean,
    selected: { type: Boolean, default: undefined }, indicator: Boolean },
  emits: { select: (item: CommandItem) => Boolean(item.id) },
  setup(props, { slots, emit }) {
    function select() { if (!props.item.disabled) emit('select', props.item) }
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return
      event.preventDefault()
      select()
    }
    return () => h('div', {
      class: 'sy-command__item', role: 'option', 'aria-selected': props.selected ?? props.active,
      'aria-disabled': props.item.disabled || undefined, 'data-highlighted': props.active || undefined,
      onClick: select, onKeydown: keydown,
    }, [
      ...(slots.default?.() ?? [
        props.item.icon ? h(SIcon, { name: props.item.icon, size: 'sm' }) : null,
        h('span', { class: 'sy-command__item-copy' }, [h('span', props.item.label), props.item.description ? h('small', props.item.description) : null]),
        props.item.shortcut?.length ? h(SKbd, { keys: props.item.shortcut }) : null,
        props.item.children?.length ? h('span', { class: 'sy-command__submenu', 'aria-hidden': 'true' }) : null,
      ]),
      props.indicator ? h(SIcon, { name: 'check', size: 'sm', class: 'sy-command__check', 'data-selected': props.selected || undefined }) : null,
    ])
  },
})
