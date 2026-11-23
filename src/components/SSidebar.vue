<script setup lang="ts">
import { computed, provide, ref, useId, watch } from 'vue'
import SDrawer from './SDrawer.vue'
import SSidebarContents from '../internal/SSidebarContents.vue'
import {
  parseShellBoolean, sidebarControls, useAppLayout, useShellCompact, useShellPreference, useShellShortcut,
  type NavigationItem, type SidebarGroup, type SidebarPage,
} from '../internal/shell-layout'

const props = withDefaults(defineProps<{
  label?: string
  groups?: readonly SidebarGroup[]
  pages?: readonly SidebarPage[]
  defaultPage?: string
  defaultCurrent?: string
  currentPath?: string
  defaultOpen?: boolean
  breakpoint?: number
  mode?: 'rail' | 'offcanvas' | 'none'
  side?: 'start' | 'end'
  storageKey?: string
  toggleShortcut?: string | false
  showToggle?: boolean
  toggleLabel?: string
  expandLabel?: string
  dismissLabel?: string
  density?: 'compact' | 'comfortable'
}>(), {
  label: 'Sidebar navigation',
  groups: () => [],
  pages: () => [],
  defaultOpen: true,
  breakpoint: 480,
  mode: 'rail',
  side: 'start',
  toggleShortcut: 'mod+b',
  toggleLabel: 'Navigation',
  expandLabel: 'Submenu:',
  dismissLabel: 'Close',
  density: 'compact',
})

const selected = defineModel<string>()
const page = defineModel<string>('page')
const open = defineModel<boolean | undefined>('open', { default: undefined })
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false })
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const app = useAppLayout()
const root = ref<HTMLElement | null>(null)
const drawerSide = ref<'left' | 'right'>('left')
const localCompact = useShellCompact(root, () => props.breakpoint)
const compact = computed(() => !app && localCompact.value)
const desktopOpen = useShellPreference(root, () => props.storageKey && `${props.storageKey}:sidebar`, open, () => props.defaultOpen, parseShellBoolean)
const opened = computed(() => compact.value ? mobileOpen.value : props.mode === 'none' || desktopOpen.value)
const rail = computed(() => app?.sidebarCollapsed.value ?? (!compact.value && props.mode === 'rail' && !opened.value))
const id = useId()
provide(sidebarControls, {
  open: computed(() => app?.sidebarOpen.value ?? opened.value),
  disabled: computed(() => Boolean(compact.value || app?.compact.value || !app && props.mode === 'none')),
  controls: computed(() => app?.sidebarId.value ?? (!compact.value ? id : undefined)),
  toggle,
})

function isCurrent(item: NavigationItem) {
  return props.currentPath !== undefined ? props.currentPath === item.href : item.id === (selected.value ?? props.defaultCurrent)
}

function activate(item: NavigationItem, event: MouseEvent) {
  emit('activate', item, event)
  if (event.defaultPrevented) return
  if (props.currentPath === undefined) selected.value = item.id
  if (compact.value) mobileOpen.value = false
  if (app?.compact.value && app.sidebarOpen.value) app.toggleSidebar()
}

function updateDrawerSide() {
  const element = root.value
  const rtl = element && element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl'
  drawerSide.value = (props.side === 'start') !== !!rtl ? 'left' : 'right'
}

function toggle() {
  if (app) {
    app.toggleSidebar()
  } else if (compact.value) {
    updateDrawerSide()
    mobileOpen.value = !mobileOpen.value
  } else if (props.mode !== 'none') {
    desktopOpen.value = !desktopOpen.value
  }
}

watch([root, compact, () => props.side], updateDrawerSide, { flush: 'post' })
watch(compact, narrow => {
  if (!narrow) mobileOpen.value = false
})
useShellShortcut(root, () => app ? false : props.toggleShortcut, toggle)
</script>

<template>
  <div
    ref="root" class="sy-sidebar" :class="`sy-sidebar--${density}`"
    :data-embedded="!!app || undefined" :data-rail="rail || undefined" :data-closed="(!app && !opened && !rail) || undefined"
  >
    <div v-if="!app && (compact || showToggle || $slots.trigger)" class="sy-sidebar__tools">
      <slot name="trigger" :toggle="toggle" :open="opened" :collapsed="rail" :compact="compact" :controls="compact ? (opened ? `${id}-drawer` : undefined) : id">
        <button
          type="button" class="sy-sidebar__toggle" :aria-expanded="opened" :aria-controls="compact ? (opened ? `${id}-drawer` : undefined) : id"
          @click="toggle"
        >{{ toggleLabel }}</button>
      </slot>
    </div>
    <div
      v-if="!compact" :id="id" class="sy-sidebar__panel"
      :data-open="(!!app || opened || rail) || undefined" :inert="!app && !opened && !rail"
    >
      <div class="sy-sidebar__panel-inner">
        <SSidebarContents
          :label="label" :groups="groups" :pages="pages" :page="page ?? defaultPage" :rail="rail"
          :is-current="isCurrent" :expand-label="expandLabel" @activate="activate"
        >
          <template v-if="$slots.start" #start="scope"><slot name="start" v-bind="scope" /></template>
          <template v-if="$slots.end" #end="scope"><slot name="end" v-bind="scope" /></template>
          <template v-if="$slots.group" #group="scope"><slot name="group" v-bind="scope" /></template>
          <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
          <template v-if="$slots['item-end']" #item-end="scope"><slot name="item-end" v-bind="scope" /></template>
          <template v-if="$slots['item-actions']" #item-actions="scope"><slot name="item-actions" v-bind="scope" /></template>
          <template v-if="$slots.rail" #rail="scope"><slot name="rail" v-bind="scope" /></template>
        </SSidebarContents>
      </div>
    </div>
    <SDrawer
      v-if="!app" :open="compact && mobileOpen" @update:open="mobileOpen = $event" :side="drawerSide" :title="label"
      :dismiss-label="dismissLabel" :draggable="false" size="sm" class="sy-app-layout__drawer"
    >
      <div :id="`${id}-drawer`" class="sy-sidebar" :class="`sy-sidebar--${density}`">
        <SSidebarContents
          :label="label" :groups="groups" :pages="pages" :page="page ?? defaultPage" :rail="false"
          :is-current="isCurrent" :expand-label="expandLabel" @activate="activate"
        >
          <template v-if="$slots.start" #start="scope"><slot name="start" v-bind="scope" /></template>
          <template v-if="$slots.end" #end="scope"><slot name="end" v-bind="scope" /></template>
          <template v-if="$slots.group" #group="scope"><slot name="group" v-bind="scope" /></template>
          <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
          <template v-if="$slots['item-end']" #item-end="scope"><slot name="item-end" v-bind="scope" /></template>
          <template v-if="$slots['item-actions']" #item-actions="scope"><slot name="item-actions" v-bind="scope" /></template>
        </SSidebarContents>
      </div>
    </SDrawer>
  </div>
</template>
