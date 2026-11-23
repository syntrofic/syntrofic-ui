<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useId, watch } from 'vue'
import { groupCommandItems, searchCommands, type CommandGroup, type CommandItem } from '../internal/command'
import { SCommandEmpty, SCommandFooter, SCommandGroup, SCommandItem, SCommandList } from '../internal/command-parts'
import { commandInputContext } from '../internal/command-input'
import { matchesShortcut } from '../internal/keyboard-shortcut'
import { useShellMeasurement } from '../internal/shell-layout'
import { useAnimatedLayout } from '../internal/motion'
import { useQueryResults, type QuerySource } from '../internal/query-results'
import SButton from './SButton.vue'
import SDialog from './SDialog.vue'
import SCommandInput from './SCommandInput.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  title: string
  groups?: readonly CommandGroup[]
  items?: readonly CommandItem[]
  search?: QuerySource<CommandItem>
  searchDelay?: number
  picker?: boolean
  inputLabel?: string
  placeholder?: string
  emptyText?: string
  bootstrapText?: string
  loadingText?: string
  errorText?: string
  clearLabel?: string
  backLabel?: string
  dismissLabel?: string
  listLabel?: string
  defaultOpen?: boolean
  defaultQuery?: string
  size?: 'sm' | 'md' | 'lg'
  backdrop?: 'opaque' | 'transparent' | 'blur'
  shortcut?: string | false
  autoFocus?: boolean
  inline?: boolean
  loading?: boolean
  closeOnBackdrop?: boolean
  closeOnSelect?: boolean
  resetOnClose?: boolean
  showSeparators?: boolean
  hideFooter?: boolean
  filter?: (item: CommandItem, query: string) => boolean
}>(), {
  inputLabel: 'Search commands', placeholder: 'Search commands…', emptyText: 'No commands found.',
  clearLabel: 'Clear', backLabel: 'Back', dismissLabel: 'Close', listLabel: 'Commands', defaultQuery: '',
  size: 'md', backdrop: 'opaque', shortcut: 'mod+k', autoFocus: true, closeOnBackdrop: true,
  closeOnSelect: true, resetOnClose: true, searchDelay: 140,
  loadingText: 'Searching…', errorText: 'Search failed. Edit the query to try again.',
})

const openModel = defineModel<boolean | undefined>('open', { default: undefined })
const queryModel = defineModel<string>('query')
const pickedValue = defineModel<string>()
const open = computed({
  get: () => props.inline || (openModel.value ?? props.defaultOpen ?? false),
  set: value => { openModel.value = value },
})
const query = computed({
  get: () => queryModel.value ?? props.defaultQuery,
  set: value => { queryModel.value = value },
})
const emit = defineEmits<{ select: [item: CommandItem]; pageChange: [item: CommandItem | null]; searchError: [error: unknown] }>()
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const rail = ref<HTMLElement | null>(null)
const height = useShellMeasurement(rail, element => element.offsetHeight)
const listId = `sy-command-${useId()}`
const history = ref<{ group: string; item: string; query: string; remoteItem?: CommandItem }[]>([])
const active = ref<string>()
const rootGroups = computed(() => props.groups ?? groupCommandItems(props.items ?? []))
const page = computed(() => {
  let groups = rootGroups.value
  let item: CommandItem | null = null
  for (const entry of history.value) {
    const next = entry.remoteItem ?? groups.find(group => group.id === entry.group)?.items.find(option => option.id === entry.item)
    if (!next?.children?.length) break
    item = next
    groups = next.children
  }
  return { groups, item }
})
const remoteSearch = computed(() => props.search && !page.value.item && query.value.trim())
const { results: remote, pending, failed } = useQueryResults({
  query: () => remoteSearch.value || '', source: () => props.search, active: open, delay: () => props.searchDelay,
  onError: error => emit('searchError', error),
})
const busy = computed(() => pending.value || Boolean(props.loading))
const groups = computed(() => (remoteSearch.value ? groupCommandItems(remote.value)
  : searchCommands(page.value.groups, query.value, props.filter)).map(group => ({
  ...group,
  items: group.items.map(item => ({ item, nodeId: `${listId}-${encodeURIComponent(group.id)}:${encodeURIComponent(item.id)}`, group: group.id })),
})))
const enabled = computed(() => groups.value.flatMap(group => group.items).filter(entry => !entry.item.disabled))
const selected = computed(() => enabled.value.find(entry => entry.nodeId === active.value)
  ?? (props.picker ? enabled.value.find(entry => entry.item.id === pickedValue.value) : undefined) ?? enabled.value[0])
const capture = useAnimatedLayout()
const message = computed(() => busy.value ? props.loadingText : failed.value ? props.errorText
  : !groups.value.length ? (!query.value && props.bootstrapText || props.emptyText) : undefined)
provide(commandInputContext, {
  query, busy,
  state: computed(() => ({ label: props.inputLabel, placeholder: props.placeholder, controls: listId,
    activeId: selected.value?.nodeId, expanded: open.value, autofocus: !props.inline && props.autoFocus })),
  bind(node) { input.value = node }, keydown: keyboard,
})
let owner: Document | undefined

function activate(entry: (typeof enabled.value)[number]) {
  if (entry.item.disabled || busy.value && Boolean(remoteSearch.value)) return
  if (entry.item.children?.length) {
    history.value = [...history.value, {
      group: entry.group, item: entry.item.id, query: query.value, remoteItem: remoteSearch.value ? entry.item : undefined,
    }]
    query.value = ''
    active.value = undefined
    emit('pageChange', entry.item)
    input.value?.focus({ preventScroll: true })
    return
  }
  if (props.picker) pickedValue.value = entry.item.id
  if (props.closeOnSelect && !props.inline) open.value = false
  emit('select', entry.item)
}

function back() {
  const previous = history.value.at(-1)
  if (!previous) return
  history.value = history.value.slice(0, -1)
  query.value = previous.query
  active.value = groups.value.flatMap(group => group.items)
    .find(entry => entry.group === previous.group && entry.item.id === previous.item)?.nodeId
  emit('pageChange', page.value.item)
  input.value?.focus({ preventScroll: true })
}

function clear() {
  query.value = ''
  input.value?.focus({ preventScroll: true })
}

function keyboard(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Backspace' && !query.value && history.value.length) {
    event.preventDefault()
    back()
    return
  }
  if (event.key === 'Enter' && selected.value) {
    event.preventDefault()
    activate(selected.value)
    return
  }
  const { key, ctrlKey, metaKey } = event
  const end = (ctrlKey || metaKey) && (key === 'Home' || key === 'End')
  if (!enabled.value.length || (!end && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(key))) return
  event.preventDefault()
  const current = enabled.value.indexOf(selected.value)
  const max = enabled.value.length - 1
  let index = current
  switch (key) {
    case 'Home': index = 0; break
    case 'End': index = max; break
    case 'ArrowUp': index = current <= 0 ? max : current - 1; break
    case 'ArrowDown': index = current >= max ? 0 : current + 1; break
    case 'PageUp': index = Math.max(0, current - 5); break
    case 'PageDown': index = Math.min(max, current + 5); break
  }
  active.value = enabled.value[index]?.nodeId
  void nextTick(() => owner?.getElementById(active.value ?? '')?.scrollIntoView({ block: 'nearest' }))
}

function escape(event: KeyboardEvent) {
  if (event.isComposing || !history.value.length) return
  event.preventDefault()
  event.stopPropagation()
  back()
}

function measure() {
  const surface = rail.value
  const option = owner?.getElementById(selected.value?.nodeId ?? '')
  if (!surface || !option || !surface.contains(option) || !option.offsetHeight) {
    surface?.removeAttribute('data-active')
    return
  }
  surface.style.setProperty('--sy-command-highlight-y', `${option.offsetTop}px`)
  surface.style.setProperty('--sy-command-highlight-height', `${option.offsetHeight}px`)
  surface.setAttribute('data-active', '')
}

function hotkey(event: KeyboardEvent) {
  if (!owner || !matchesShortcut(event, props.shortcut, owner)) return
  const anotherModal = owner.querySelector(':modal')
  if (anotherModal && !anotherModal.contains(input.value)) return
  event.preventDefault()
  if (props.inline) input.value?.focus()
  else open.value = !open.value
}

onMounted(() => {
  owner = root.value?.ownerDocument
  owner?.addEventListener('keydown', hotkey)
  measure()
})
onBeforeUnmount(() => owner?.removeEventListener('keydown', hotkey))
watch(query, () => { active.value = undefined }, { flush: 'sync' })
watch(groups, () => {
  if (rail.value) void nextTick(capture(rail.value.querySelectorAll<HTMLElement>('[role="option"]')))
})
watch([open, selected, height, groups], measure, { flush: 'post' })
function resetAfterClose() {
  if (!open.value && props.resetOnClose) {
    history.value = []
    query.value = props.defaultQuery
    active.value = undefined
  }
}
const shell = computed(() => props.inline ? { class: 'sy-command__inline', 'aria-label': props.title } : {
  class: 'sy-command__dialog', open: open.value, 'onUpdate:open': (visible: boolean) => { open.value = visible },
  'data-backdrop': props.backdrop, size: props.size, title: props.title, dismissLabel: props.dismissLabel,
  closeOnBackdrop: props.closeOnBackdrop, showCloseButton: true, onClose: resetAfterClose,
})

defineExpose({ show: () => { open.value = true }, close: () => { open.value = false }, back })
</script>

<template>
  <div ref="root" class="sy-command">
    <slot name="trigger" :open="() => { open = true }" :expanded="open" />
    <component :is="inline ? 'section' : SDialog" v-bind="shell" @keydown.esc="escape">
      <slot name="header" :page="page.item" :back="back" />
      <div class="sy-command__page" :data-open="Boolean(page.item) || undefined" :inert="!page.item">
        <div class="sy-command__page-inner">
          <SButton size="sm" variant="ghost" @click="back">{{ backLabel }}</SButton>
          <SMotionText :value="page.item?.label ?? ''" />
        </div>
      </div>
      <slot name="input" :query="query" :clear="clear">
        <SCommandInput>
          <template v-if="$slots.prefix" #start><slot name="prefix" /></template>
          <template #end>
            <div class="sy-command__clear" :data-visible="query !== '' || undefined" :inert="!query">
              <SButton size="sm" variant="ghost" @click="clear">{{ clearLabel }}</SButton>
            </div>
            <slot name="suffix" />
          </template>
        </SCommandInput>
      </slot>
      <div class="sy-command__body" :data-details="Boolean($slots.details) || undefined"
        :style="{ '--sy-command-results-height': `${Math.max(96, height ?? 96)}px` }">
        <div class="sy-command__results">
          <SCommandList :id="listId" :set-element="node => { rail = node }" :label="listLabel" :separators="showSeparators"
            :aria-busy="busy || undefined">
            <SCommandGroup v-for="(group, index) in groups" :key="group.id" :label="group.label">
              <template v-if="$slots.group" #label><slot name="group" :group="group" :index="index" /></template>
              <SCommandItem
                v-for="entry in group.items" :id="entry.nodeId" :key="entry.item.id" :item="entry.item" :active="entry.nodeId === selected?.nodeId"
                :selected="picker ? entry.item.id === pickedValue : undefined" :indicator="picker"
                @pointermove="!entry.item.disabled && ($event.pointerType === 'mouse' || $event.pointerType === 'pen') && (active = entry.nodeId)"
                @mousedown.prevent @click="activate(entry)"
              >
                <template v-if="$slots.item" #default>
                  <slot name="item" :item="entry.item" :active="entry.nodeId === selected?.nodeId" :selected="picker && entry.item.id === pickedValue" />
                </template>
              </SCommandItem>
            </SCommandGroup>
          </SCommandList>
          <Transition name="sy-command-feedback" @before-leave="node => node.setAttribute('aria-hidden', 'true')"
            @before-enter="node => node.removeAttribute('aria-hidden')">
            <SCommandEmpty v-if="message" :key="busy ? 'loading' : failed ? 'error' : 'empty'">
              <slot v-if="busy" name="loading">{{ message }}</slot>
              <slot v-else-if="failed" name="error">{{ message }}</slot>
              <slot v-else name="empty" :query="query">{{ message }}</slot>
            </SCommandEmpty>
          </Transition>
        </div>
        <aside v-if="$slots.details" class="sy-command__details"><slot name="details" :item="selected?.item" /></aside>
      </div>
      <SCommandFooter v-if="!hideFooter">
        <template v-if="$slots.footer" #default><slot name="footer" :query="query" :page="page.item" /></template>
      </SCommandFooter>
    </component>
  </div>
</template>
