<script setup lang="ts">
import { computed, getCurrentInstance, inject, onMounted, shallowRef, watch, type ComponentPublicInstance } from 'vue'
import { commandInputContext } from '../internal/command-input'
import { useTranslator } from '../rac/locale'
import SIcon from './SIcon.vue'
import SSpinner from './SSpinner.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  label?: string; placeholder?: string; controls?: string; activeId?: string; expanded?: boolean; autofocus?: boolean
  loading?: boolean; loadingDelay?: number
  setElement?: (node: HTMLInputElement | null) => void
}>(), { expanded: undefined, autofocus: undefined, loading: undefined, loadingDelay: 150 })
const emit = defineEmits<{ keydown: [event: KeyboardEvent] }>()
const instance = getCurrentInstance()
const command = inject(commandInputContext, undefined)
const translate = useTranslator({ 'command.search': 'Search commands', 'command.placeholder': 'Search…' })
const model = defineModel<string>()
const field = shallowRef<HTMLInputElement | null>(null)
const own = () => Object.hasOwn(instance?.vnode.props ?? {}, 'modelValue') || Object.hasOwn(instance?.vnode.props ?? {}, 'onUpdate:modelValue')
const query = computed({
  get: () => own() ? model.value ?? '' : command?.query.value ?? model.value ?? '',
  set: next => { if (command && !own()) command.query.value = next; else model.value = next },
})
const name = computed(() => props.label ?? command?.state.value.label ?? translate('command.search'))
const hint = computed(() => props.placeholder ?? command?.state.value.placeholder ?? translate('command.placeholder'))
const controls = computed(() => props.controls ?? command?.state.value.controls)
const active = computed(() => props.activeId ?? command?.state.value.activeId)
const expanded = computed(() => props.expanded ?? command?.state.value.expanded ?? false)
const focus = computed(() => props.autofocus ?? command?.state.value.autofocus ?? true)
const busy = computed(() => props.loading ?? command?.busy.value ?? false)
const spinner = shallowRef(false)
watch([busy, field, () => props.loadingDelay], ([pending, node, delay], _, cleanup) => {
  spinner.value = false
  if (!pending || !node) return
  const timer = setTimeout(() => { spinner.value = true }, Math.max(0, delay))
  cleanup(() => clearTimeout(timer))
}, { flush: 'post' })

function bind(element: Element | ComponentPublicInstance | null) {
  const node = element instanceof HTMLInputElement ? element : null
  field.value = node
  if (props.setElement) props.setElement(node)
  else command?.bind(node)
}
onMounted(() => {
  if (focus.value && !field.value?.closest('dialog:not([open])')) field.value?.focus({ preventScroll: true })
})

function keydown(event: KeyboardEvent) {
  emit('keydown', event)
  if (!event.defaultPrevented) command?.keydown(event)
}
</script>

<template>
  <div class="sy-command__input-group">
    <slot name="start"><SIcon icon="search" size="sm" color="secondary" /></slot>
    <input :ref="bind" v-model="query" v-bind="$attrs" type="text" :role="controls ? 'combobox' : 'searchbox'"
      autocomplete="off" spellcheck="false" :autofocus="focus" :placeholder="hint" :aria-label="name" :aria-busy="busy || undefined"
      :aria-autocomplete="controls ? 'list' : undefined" :aria-expanded="controls ? expanded : undefined" :aria-controls="controls"
      :aria-activedescendant="active" @keydown="keydown">
    <Transition name="sy-command-spinner">
      <SSpinner v-if="spinner" decorative size="sm" class="sy-command__spinner" />
    </Transition>
    <slot name="end" />
  </div>
</template>
