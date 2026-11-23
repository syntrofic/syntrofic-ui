<script setup lang="ts">
import { AccessibilityState, type ScrollView } from '@nativescript/core'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { matchesNativeOption, nextNativeOptionIndex, type NativeOptionFieldEvents, type NativeOptionFieldOptions, type NativeOptionItem } from '../option-field'
import { isSelected, toggleCollectionSelection, type NativeCollectionKey } from '../collection-state'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import type { NativeSelectValue } from '../menu-state'
import SNativeButton from './SNativeButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<NativeOptionFieldOptions & { kind: 'autocomplete' | 'combobox' }>(), {
  items: () => [], debounce: 180, minimumCharacters: 0, clearable: true, openOnFocus: true,
  clearLabel: 'Clear', triggerLabel: 'Options', closeLabel: 'Close',
  emptyText: 'No matching options', loadingText: 'Loading options', errorText: 'Could not load options', minimumText: 'Keep typing to find options',
})
const emit = defineEmits<NativeOptionFieldEvents>()
const selected = defineModel<NativeSelectValue>({ default: null })
const query = defineModel<string>('query', { default: '' })
const opened = defineModel<boolean>('open', { default: false })
defineSlots<{ option(props: { item: NativeOptionItem; selected: boolean; active: boolean }): unknown }>()
const input = useTemplateRef<InstanceType<typeof SNativeInput>>('input')
const scroll = useTemplateRef<{ nativeView: ScrollView }>('scroll')
const { theme, direction } = useNativeUI()
const focused = ref(false)
const active = ref<NativeCollectionKey>()
const results = shallowRef<readonly NativeOptionItem[]>([])
const loading = ref(false)
const failure = ref(false)
const browseAll = ref(false)
const picked = new Map<NativeCollectionKey, NativeOptionItem>()
const entries = computed(() => Array.isArray(selected.value) ? selected.value : selected.value === null ? [] : [selected.value])
const threshold = computed(() => Number.isFinite(props.minimumCharacters) ? Math.max(0, Math.floor(props.minimumCharacters)) : 0)
const search = computed(() => browseAll.value ? '' : query.value)
const ready = computed(() => Array.from(search.value.trim()).length >= threshold.value)
const absent = computed(() => props.disabled || props.readonly)
const visible = computed(() => opened.value && !absent.value)
const hasTrigger = computed(() => props.kind === 'combobox' || props.showTrigger)
const rtl = computed(() => direction.value === 'rtl')
const matches = computed(() => {
  if (!ready.value || loading.value || failure.value) return []
  if (props.loadOptions) return results.value
  const filter = props.filter ?? matchesNativeOption
  return props.items.filter(item => filter(item, search.value))
})
const enabled = computed(() => matches.value.filter(item => !item.disabled))
const selectionText = computed(() => {
  const options = entries.value.flatMap(key => {
    const item = picked.get(key) ?? props.items.find(value => Object.is(value.id, key))
    return item ? [item] : []
  })
  return props.formatSelection?.(options) ?? options.map(item => item.label).join(' · ')
})
const status = computed(() => !ready.value ? props.minimumText : loading.value ? props.loadingText
  : failure.value ? props.errorText : matches.value.length ? '' : props.emptyText)

watch([search, visible, () => props.loadOptions, ready], ([term, isOpen, load, eligible], _, onCleanup) => {
  results.value = []
  failure.value = false
  loading.value = Boolean(isOpen && load && eligible)
  if (!isOpen || !load || !eligible) return
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined
  let current = true
  const wait = Number.isFinite(props.debounce) ? Math.max(0, props.debounce) : 180
  const timer = setTimeout(async () => {
    try {
      const options = await load(term, controller?.signal)
      if (current) results.value = options
    } catch (error) {
      if (!current) return
      failure.value = true
      emit('loadError', error)
    } finally {
      if (current) loading.value = false
    }
  }, wait)
  onCleanup(() => {
    current = false
    clearTimeout(timer)
    controller?.abort()
  })
}, { immediate: true })

watch(matches, options => {
  if (!options.some(item => !item.disabled && Object.is(item.id, active.value))) active.value = undefined
})
watch(selected, (next, previous) => {
  for (const key of picked.keys()) if (!entries.value.some(value => Object.is(value, key))) picked.delete(key)
  if (props.kind !== 'combobox' || props.multiple || focused.value) return
  const item = props.items.find(option => Object.is(option.id, next)) ?? picked.get(next as NativeCollectionKey)
  if (item) query.value = item.label
  else if (next === null && previous !== undefined) query.value = ''
}, { immediate: true })

function change(next: NativeSelectValue) {
  selected.value = next
  emit('change', next)
}
function choose(item: NativeOptionItem) {
  if (absent.value || item.disabled) return
  const next = props.multiple ? toggleCollectionSelection(entries.value, item.id, 'multiple') : [item.id]
  if (isSelected(next, item.id)) picked.set(item.id, item)
  else picked.delete(item.id)
  change(props.multiple ? next : item.id)
  emit('select', item, isSelected(next, item.id))
  if (props.multiple) {
    query.value = ''
  } else {
    query.value = item.label
    if (!props.keepOpenOnSelect) opened.value = false
    input.value?.dismissKeyboard()
  }
}
function clear() {
  if (absent.value) return
  active.value = undefined
  query.value = ''
  picked.clear()
  change(props.multiple ? [] : null)
  emit('clear')
}
function focus() { return input.value?.focus() ?? false }
function show() { if (!absent.value) opened.value = true }
function hide() {
  opened.value = false
  browseAll.value = false
  active.value = undefined
  input.value?.dismissKeyboard()
}
function edit(text: string) {
  browseAll.value = false
  query.value = text
  active.value = undefined
  show()
}
function submit() {
  const current = enabled.value.find(item => Object.is(item.id, active.value))
    ?? enabled.value.find(item => item.label.toLocaleLowerCase() === query.value.trim().toLocaleLowerCase())
  if (current && visible.value) choose(current)
  else if (props.allowCustomValue) {
    emit('submit', query.value)
    hide()
  }
}
function navigate(key: NativeCollectionNavigation) {
  if (absent.value) return false
  if (key === 'escape' && visible.value) { hide(); return true }
  if (key !== 'previous' && key !== 'next' && key !== 'first' && key !== 'last') return false
  if (!visible.value && key !== 'next' && key !== 'previous') return false
  show()
  const index = enabled.value.findIndex(item => Object.is(item.id, active.value))
  const next = enabled.value[nextNativeOptionIndex(index, enabled.value.length, key)]
  if (next) {
    active.value = next.id
    const offset = matches.value.indexOf(next) * 51
    const view = scroll.value?.nativeView
    if (view && (offset < view.verticalOffset || offset + 51 > view.verticalOffset + view.getActualSize().height))
      view.scrollToVerticalOffset(offset, true)
  }
  return true
}
defineExpose({ focus, show, hide, clear })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="label" marginBottom="4" @tap="focus" />
    <GridLayout :columns="rtl ? `${hasTrigger ? 58 : 0},${clearable ? 54 : 0},*` : `*,${clearable ? 54 : 0},${hasTrigger ? 58 : 0}`" direction="ltr">
      <SNativeInput ref="input" :col="rtl ? 2 : 0" :model-value="query" :label="label" :placeholder="placeholder"
        :disabled="disabled" :readonly="readonly" :invalid="invalid" :navigate="navigate" :hint="description"
        :autocorrect="false" returnKeyType="done"
        @update:model-value="edit" @submit="submit"
        @focus="focused = true; openOnFocus && show()" @blur="focused = false" />
      <SNativeButton v-if="clearable" col="1" :label="clearLabel" variant="ghost" size="sm" fullWidth
        :disabled="absent || !query && !entries.length" @tap="clear" />
      <SNativeButton v-if="hasTrigger" :col="rtl ? 0 : 2" :label="visible ? closeLabel : triggerLabel" variant="ghost" size="sm"
        :disabled="absent" :pressed="visible" fullWidth @tap="visible ? hide() : (browseAll = true, show())" />
    </GridLayout>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeMotionText v-if="multiple && selectionText" :value="selectionText" :size="12" :color="theme.colors.accentText" marginTop="4" />
    <SNativeReveal :open="visible" :transition-key="visible ? status || Math.min(5, matches.length) : 0">
      <GridLayout :backgroundColor="theme.colors.surface" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" padding="4" marginTop="5">
        <SNativeText v-if="status" :text="status" :color="failure ? theme.colors.danger : theme.colors.textMuted" margin="5" />
        <ScrollView v-else ref="scroll" :height="Math.min(5, matches.length) * 51">
          <StackLayout>
            <SNativePressableFeedback v-for="item in matches" :key="item.id"
              :label="item.label" :accessibilityHint="item.description" :disabled="item.disabled"
              :accessibilityState="isSelected(entries, item.id) ? AccessibilityState.Selected : undefined"
              :fill="Object.is(item.id, active) || isSelected(entries, item.id) ? theme.colors.accentSoft : theme.colors.surfaceMuted"
              :pressFill="theme.colors.surfaceSage" height="48" :minHeight="48" marginBottom="3" @tap="choose(item)">
              <slot name="option" :item="item" :selected="isSelected(entries, item.id)" :active="Object.is(item.id, active)">
                <StackLayout verticalAlignment="middle">
                  <SNativeText :text="item.label" />
                  <SNativeText v-if="item.description" :text="item.description" size="caption" />
                </StackLayout>
              </slot>
            </SNativePressableFeedback>
          </StackLayout>
        </ScrollView>
      </GridLayout>
    </SNativeReveal>
  </StackLayout>
</template>
