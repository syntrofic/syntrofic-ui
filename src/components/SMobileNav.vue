<script setup lang="ts">
import { computed, onMounted, provide, ref, useId, useTemplateRef, watch } from 'vue'
import { mobileNavClose, type NavigationItem } from '../internal/shell-layout'
import SNavigationLink from '../internal/SNavigationLink.vue'
import SDrawer from './SDrawer.vue'

const props = withDefaults(defineProps<{
  title?: string
  label?: string
  width?: number
  side?: 'start' | 'end' | 'auto'
  direction?: 'ltr' | 'rtl'
  controlsId?: string
  items?: readonly NavigationItem[]
  currentId?: string
  dismissLabel?: string
}>(), { width: 320, side: 'auto', dismissLabel: 'Close' })
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const open = defineModel<boolean>('open', { default: false })
provide(mobileNavClose, () => { open.value = false })
const anchor = useTemplateRef<HTMLElement>('anchor')
const id = `sy-mobile-nav-${useId()}`
const accessibleName = computed(() => props.label ?? props.title ?? 'Navigation')
const drawerSide = ref<'left' | 'right'>('left')
const extent = computed(() => Number.isFinite(props.width) && props.width > 0 ? props.width : 320)

function alignDrawer() {
  const element = anchor.value
  const document = element?.ownerDocument
  if (!element || !document) return
  const startsLeft = (props.direction ?? (element.matches(':dir(rtl)') ? 'rtl' : 'ltr')) === 'ltr'
  if (props.side === 'auto') {
    const trigger = document.activeElement?.closest('[aria-haspopup="dialog"], [aria-expanded], button')
    const bounds = trigger?.getBoundingClientRect()
    if (bounds?.width) {
      drawerSide.value = bounds.left + bounds.width / 2 <= document.documentElement.clientWidth / 2 ? 'left' : 'right'
      return
    }
  }
  drawerSide.value = (props.side === 'end' ? !startsLeft : startsLeft) ? 'left' : 'right'
}

function activate(item: NavigationItem, event: MouseEvent) {
  emit('activate', item, event)
  if (!event.defaultPrevented) open.value = false
}

onMounted(alignDrawer)
watch([open, () => props.side, () => props.direction], ([visible]) => {
  if (visible) alignDrawer()
})
</script>

<template>
  <span ref="anchor" hidden />
  <SDrawer v-model:open="open" :side="drawerSide" :direction="direction" :extent="extent" :title="accessibleName" :draggable="false"
    :hide-title="!title && !$slots.header"
    :dismiss-label="dismissLabel" :content-id="controlsId ?? id" content-class="sy-mobile-nav">
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <template v-if="$slots.header || (title && accessibleName !== title)" #title><slot name="header">{{ title }}</slot></template>
    <template #default="{ close }">
      <nav class="sy-mobile-nav__links" :aria-label="accessibleName" :dir="direction">
        <slot :close="close">
          <SNavigationLink v-for="item in items" :key="item.id" :item="item" :current="item.id === currentId"
            @activate="activate">{{ item.label }}</SNavigationLink>
        </slot>
      </nav>
    </template>
  </SDrawer>
</template>
