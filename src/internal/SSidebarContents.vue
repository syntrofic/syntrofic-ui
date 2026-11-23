<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import SSidebarItems from './SSidebarItems.vue'
import type { NavigationItem, SidebarGroup, SidebarPage } from './shell-layout'

const props = defineProps<{
  label: string
  groups: readonly SidebarGroup[]
  pages: readonly SidebarPage[]
  page?: string
  rail: boolean
  isCurrent: (item: NavigationItem) => boolean
  expandLabel: string
}>()
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const expanded = ref<Record<string, boolean>>({})
const root = ref<HTMLElement | null>(null)
const reverse = ref(false)
const pageIndex = computed(() => Math.max(0, props.pages.findIndex(page => page.id === props.page)))
const page = computed(() => props.pages[pageIndex.value])
const groups = computed(() => page.value?.groups ?? props.groups)
const id = useId()

function isOpen(group: SidebarGroup) {
  return props.rail || !group.collapsible || (expanded.value[`${page.value?.id ?? ''}/${group.id}`] ?? group.defaultExpanded ?? true)
}

function toggle(group: SidebarGroup) {
  expanded.value[`${page.value?.id ?? ''}/${group.id}`] = !isOpen(group)
}

watch(pageIndex, async (index, previous) => {
  reverse.value = index < previous
  const active = root.value?.ownerDocument.activeElement
  if (!active?.closest('.sy-sidebar__page') || !root.value?.contains(active)) return
  root.value.focus({ preventScroll: true })
  await nextTick()
  root.value?.querySelector<HTMLElement>('.sy-sidebar__page:not([inert]) [aria-current="page"], .sy-sidebar__page:not([inert]) .sy-navigation-link:not([disabled])')?.focus({ preventScroll: true })
})
</script>

<template>
  <nav ref="root" class="sy-sidebar__navigation" :aria-label="label" :data-rail="rail || undefined" tabindex="-1">
    <div v-if="$slots.start" class="sy-sidebar__start"><slot name="start" :rail="rail" /></div>
    <div class="sy-sidebar__pages" :data-reverse="reverse || undefined">
      <Transition name="sy-sidebar-page" @before-leave="node => node.setAttribute('inert', '')">
        <div :key="page?.id ?? ''" class="sy-sidebar__page">
          <section v-for="(group, index) in groups" :key="group.id" class="sy-sidebar__group">
            <button
              v-if="group.collapsible" class="sy-sidebar__group-toggle" type="button"
              :inert="rail" :aria-hidden="rail || undefined"
              :aria-controls="`${id}-${pageIndex}-group-${index}`" :aria-expanded="isOpen(group)" @click="toggle(group)"
            >
              <slot name="group" :group="group">{{ group.label ?? group.id }}</slot><span class="sy-sidebar__chevron" aria-hidden="true" />
            </button>
            <div v-else-if="group.label" class="sy-sidebar__label" :aria-hidden="rail || undefined"><slot name="group" :group="group">{{ group.label }}</slot></div>
            <div
              :id="`${id}-${pageIndex}-group-${index}`" class="sy-sidebar__reveal"
              :data-open="isOpen(group) || undefined" :inert="!isOpen(group)" :aria-hidden="!isOpen(group) || undefined"
            >
              <div class="sy-sidebar__reveal-inner">
                <SSidebarItems :items="group.items" :rail="rail" :is-current="isCurrent" :expand-label="expandLabel" @activate="(item, event) => emit('activate', item, event)">
                  <template #default="scope"><slot name="item" v-bind="scope">{{ scope.item.label }}</slot></template>
                  <template v-if="$slots.rail" #rail="scope"><slot name="rail" v-bind="scope" /></template>
                  <template v-if="$slots['item-end']" #end="scope"><slot name="item-end" v-bind="scope" /></template>
                  <template v-if="$slots['item-actions']" #actions="scope"><slot name="item-actions" v-bind="scope" /></template>
                </SSidebarItems>
              </div>
            </div>
          </section>
        </div>
      </Transition>
    </div>
    <div v-if="$slots.end" class="sy-sidebar__end"><slot name="end" :rail="rail" /></div>
  </nav>
</template>
