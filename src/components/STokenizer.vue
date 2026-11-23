<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch, watchPostEffect } from 'vue'
import type { SelectOption } from '../types'
import { useCollator } from '../rac/locale'
import SAutocomplete from './SAutocomplete.vue'
import SButton from './SButton.vue'
import SChip from './SChip.vue'
import SFieldLabel from './SFieldLabel.vue'
import SMotionText from './SMotionText.vue'
import SPopover from './SPopover.vue'
import SSheet from './SSheet.vue'
import { setChoiceValidity } from '../internal/choice-validity'
import { onFormReset } from '../internal/form-reset'
import { useMenuPresentation } from '../internal/menu-presentation'
import { useAnimatedLayout } from '../internal/motion'
import { useOverflow } from '../internal/overflow-layout'
import type { FieldStatus } from '../internal/status-icon'

const props = withDefaults(defineProps<{
  options: readonly SelectOption[]
  label: string
  name?: string
  form?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  requiredMessage?: string
  description?: string
  status?: FieldStatus
  startIcon?: string
  openOnFocus?: boolean
  remote?: boolean
  loading?: boolean
  maxEntries?: number
  limitText?: string
  clearable?: boolean
  clearLabel?: string
  dismissLabel?: string
  creatable?: boolean
  createLabel?: (value: string) => string
  removeLabel?: (label: string) => string
  emptyText?: string
  tokenOverflowBehavior?: 'none' | 'unfocusedInline' | 'unfocusedLayer'
  moreLabel?: (count: number) => string
}>(), {
  clearLabel: 'Clear all', tokenOverflowBehavior: 'none', requiredMessage: 'Select at least one option.',
  createLabel: (value: string) => 'Add ' + value, moreLabel: (count: number) => '+' + count + ' more',
})
const model = defineModel<string[]>({ default: () => [] })
const query = defineModel<string>('query', { default: '' })
const emit = defineEmits<{ select: [option: SelectOption]; remove: [value: string]; clear: [values: string[]] }>()
const uid = 'sy-tokenizer-' + useId()
const root = useTemplateRef<HTMLDivElement>('root')
const controls = useTemplateRef<HTMLDivElement>('controls')
const more = useTemplateRef<HTMLButtonElement>('more')
const overflowList = useTemplateRef<HTMLUListElement>('overflowList')
const open = ref(false)
const layerOpen = ref(false)
const clearOpen = ref(false)
const clearPresentation = useMenuPresentation('adaptive', clearOpen)
const focused = ref(false)
const initial = [...model.value]
const configured = computed(() => new Map(props.options.map(option => [option.value, option])))
const picked = new Map<string, SelectOption>()
const tokens = computed(() => model.value.map(value => configured.value.get(value) ?? picked.get(value) ?? { value, label: value }))
const remaining = computed(() => props.options.filter(option => !model.value.includes(option.value)))
const full = computed(() => props.maxEntries !== undefined && model.value.length >= props.maxEntries)
const locked = computed(() => props.disabled || props.readonly)
const layer = computed(() => props.tokenOverflowBehavior === 'unfocusedLayer')
const inline = computed(() => props.tokenOverflowBehavior === 'unfocusedInline')
const { container, visibleCount } = useOverflow(() => inline.value || layer.value ? model.value.length : 0, { gap: 8 })
const hiddenCount = computed(() => Math.max(0, model.value.length - visibleCount.value))
const collapsed = computed(() => layer.value || inline.value && !focused.value)
const collator = useCollator({ sensitivity: 'base', usage: 'search' })
const createCandidate = computed((): SelectOption | undefined => {
  const term = query.value.trim()
  if (!props.creatable || !term || props.loading) return
  const duplicate = (item: SelectOption) => item.value === term || collator.value.compare(item.label, term) === 0
  if (props.options.some(duplicate) || tokens.value.some(duplicate)) return
  return { value: term, label: term, description: props.createLabel(term) }
})
const suggestions = computed(() => createCandidate.value ? [...remaining.value, createCandidate.value] : remaining.value)
const input = () => root.value?.querySelector<HTMLInputElement>('input[role="combobox"]') ??
  root.value?.querySelector<HTMLInputElement>('input:not([type=hidden])') ?? null
const animate = useAnimatedLayout()
let ignoreLayerFocus = false
watch([tokens, collapsed, visibleCount], () => {
  if (root.value) void nextTick(animate.around(root.value))
})
watch(hiddenCount, count => { if (!count) layerOpen.value = false })
watchPostEffect(() => {
  const field = input()
  if (!field) return
  setChoiceValidity(field, 'group', props.required && !model.value.length ? props.requiredMessage : undefined)
  setChoiceValidity(field, 'status', props.status?.type === 'error' ? props.status.message : undefined)
})

function focus() {
  void nextTick(() => {
    ignoreLayerFocus = true
    const target = full.value
      ? root.value?.querySelector<HTMLElement>('li:not([inert]) .sy-chip__remove:not(:disabled)') ?? root.value
      : input()
    target?.focus({ preventScroll: true })
    ignoreLayerFocus = false
  })
}
function add(option: SelectOption) {
  if (locked.value || full.value || option.disabled || model.value.includes(option.value)) return
  picked.set(option.value, option)
  model.value = [...model.value, option.value]
  emit('select', option)
  void nextTick(() => {
    query.value = ''
    open.value = false
    if (full.value) focus()
  })
}
function remove(value: string) {
  if (locked.value) return
  model.value = model.value.filter(key => key !== value)
  emit('remove', value)
  focus()
}
function clear(restore = true) {
  if (locked.value) return
  const previous = [...model.value]
  model.value = []
  emit('clear', previous)
  if (restore) focus()
}
function requestClear() {
  if (clearPresentation.value !== 'bottom-sheet') { clear(); return }
  const target = full.value ? root.value : input()
  target?.focus({ preventScroll: true })
  open.value = false
  layerOpen.value = false
  clearOpen.value = true
}
function enter(event: KeyboardEvent) {
  if (event.target !== input() || event.defaultPrevented || event.isComposing || event.keyCode === 229 || !createCandidate.value) return
  event.preventDefault()
  add(createCandidate.value)
}
function backspace(event: KeyboardEvent) {
  const last = model.value.at(-1)
  if (event.target === input() && !event.isComposing && !query.value && last && !locked.value) {
    event.preventDefault()
    remove(last)
  }
}
function focusWithin(event: FocusEvent) {
  if (event.target !== more.value) focused.value = true
  if (layer.value && hiddenCount.value && !ignoreLayerFocus && event.target === input()) layerOpen.value = true
}
function blurWithin(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return
  focused.value = false
}
function toggleOverflow() {
  if (!layer.value) { focus(); return }
  layerOpen.value = !layerOpen.value
  if (layerOpen.value) void nextTick(() => {
    const target = overflowList.value?.querySelector<HTMLElement>('button:not(:disabled)') ?? overflowList.value
    target?.focus({ preventScroll: true })
  })
}
function closeLayer(event: KeyboardEvent) {
  if (event.defaultPrevented || !layerOpen.value) return
  event.preventDefault()
  event.stopPropagation()
  layerOpen.value = false
  const target = more.value
  void nextTick(() => target?.focus({ preventScroll: true }))
}
onFormReset(input, () => { model.value = [...initial]; query.value = ''; open.value = false; layerOpen.value = false })
</script>

<template>
  <div ref="root" class="sy-tokenizer" role="group" tabindex="-1" :aria-labelledby="uid" :data-overflow="tokenOverflowBehavior"
    @keydown.backspace="backspace" @keydown.enter="enter" @keydown.esc="closeLayer" @focusin="focusWithin" @focusout="blurWithin">
    <SFieldLabel :id="uid" :for="uid + '-input'" :label="label" :required="required" :disabled="disabled" />
    <Transition name="sy-field-feedback">
    <ul ref="container" v-show="model.length" role="list" class="sy-tokenizer__tokens" :aria-label="label">
      <TransitionGroup name="sy-tokenizer-item" @before-leave="node => node.setAttribute('inert', '')">
        <li v-for="(token, index) in tokens" :key="token.value" :data-overflow-item="token.value"
          :data-hidden="collapsed && index >= visibleCount || undefined" :inert="collapsed && index >= visibleCount">
          <SChip :label="token.label" :icon="token.icon" :removable="!locked" :disabled="disabled"
            :remove-label="removeLabel?.(token.label)" @remove="remove(token.value)">
            <slot name="token" :value="token.value" :label="token.label" />
          </SChip>
        </li>
      </TransitionGroup>
      <li v-if="inline || layer" data-overflow-indicator :data-hidden="!collapsed || !hiddenCount || undefined"
        :inert="!collapsed || !hiddenCount">
        <button ref="more" type="button" class="sy-tokenizer__more" :aria-haspopup="layer ? 'dialog' : undefined"
          :aria-expanded="layer ? layerOpen : !collapsed" :aria-controls="layer && layerOpen ? uid + '-overflow' : undefined"
          @click="toggleOverflow">
          <SMotionText :value="moreLabel(hiddenCount)" />
        </button>
      </li>
    </ul>
    </Transition>
    <div ref="controls" class="sy-tokenizer__controls">
      <Transition name="sy-field-feedback">
        <SAutocomplete v-show="!full" :id="uid + '-input'" v-model="query" v-model:open="open" :aria-labelledby="uid"
          :aria-required="required || undefined" :form="form" :options="suggestions" :remote="remote" :loading="loading" :disabled="locked || full"
          :description="description" :status="status" :start-icon="startIcon" :open-on-focus="openOnFocus" :placeholder="placeholder" :empty-text="emptyText"
          @select="add">
          <template v-if="$slots.start" #start><slot name="start" /></template>
        </SAutocomplete>
      </Transition>
      <p v-if="full && limitText" class="sy-tokenizer__limit" role="status">{{ limitText }}</p>
      <SButton v-if="clearable && model.length && !locked" variant="secondary" size="sm"
        :aria-haspopup="clearPresentation === 'bottom-sheet' ? 'dialog' : undefined"
        :aria-expanded="clearPresentation === 'bottom-sheet' ? clearOpen : undefined" @click="requestClear">{{ clearLabel }}</SButton>
      <slot name="end" :values="model" :full="full" :clear="() => clear()" />
    </div>
    <SSheet v-if="clearable && clearPresentation === 'bottom-sheet'" v-model:open="clearOpen"
      :title="label" :dismiss-label="dismissLabel" height="hug">
      <ul class="sy-tokenizer__tokens" role="list">
        <li v-for="token in tokens" :key="token.value"><SChip :label="token.label" :icon="token.icon" /></li>
      </ul>
      <template #footer="{ close }">
        <SButton :disabled="locked || !model.length" variant="danger" @click="clear(false); close()">{{ clearLabel }}</SButton>
      </template>
    </SSheet>
    <SPopover v-if="layer" v-model:open="layerOpen" :anchor="controls" :label="label" :content-id="uid + '-overflow'" side="top" :autofocus="false"
      :restore-focus="false" tab-behavior="pageOrder" :dismiss-on-escape="false">
      <ul ref="overflowList" class="sy-tokenizer__tokens sy-tokenizer__overflow" tabindex="-1" role="list" @keydown.esc="closeLayer">
        <li v-for="token in tokens.slice(visibleCount)" :key="token.value">
          <SChip :label="token.label" :icon="token.icon" :removable="!locked" :disabled="disabled"
            :remove-label="removeLabel?.(token.label)" @remove="remove(token.value)">
            <slot name="token" :value="token.value" :label="token.label" />
          </SChip>
        </li>
      </ul>
    </SPopover>
    <template v-if="name && !disabled">
      <input v-for="value in model" :key="value" type="hidden" :name="name" :value="value" :form="form">
    </template>
  </div>
</template>
