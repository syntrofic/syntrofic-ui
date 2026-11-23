<script lang="ts">
export interface TabBarItem {
  value: string
  label: string
  icon: string
  selectedIcon?: string
  panelId?: string
  badge?: string | number
  badgeLabel?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { prefersReducedMotion } from '../internal/motion'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  items: readonly TabBarItem[]
  label?: string
  moreValue?: string
  moreLabel?: string
  morePanelId?: string
  inline?: boolean
}>(), { label: 'Tabs', moreValue: 'more', moreLabel: 'More' })
const selected = defineModel<string>()
const emit = defineEmits<{ reselect: [value: string] }>()
const root = useTemplateRef<HTMLElement>('tabs')
const finger = ref<number>()
const preview = ref<number>()
let touchCommit = false
const overflow = computed(() => props.items.length > 5)
const visible = computed<TabBarItem[]>(() => overflow.value
  ? [...props.items.slice(0, 4), { value: props.moreValue, label: props.moreLabel, panelId: props.morePanelId, icon: 'more' }]
  : [...props.items])
const active = computed(() => {
  if (overflow.value && props.items.slice(4).some(item => item.value === selected.value)) return 4
  return visible.value.findIndex(item => item.value === selected.value)
})
const focusIndex = computed(() => active.value >= 0 ? active.value : visible.value.findIndex(item => !item.disabled))
const lens = computed(() => preview.value ?? active.value)

function buttons() { return [...(root.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])] }
function resetScroll(item: TabBarItem) {
  const panel = item.panelId ? root.value?.ownerDocument.getElementById(item.panelId) : null
  if (!panel) return
  const area = panel.scrollHeight > panel.clientHeight ? panel : panel.querySelector<HTMLElement>('.sy-scrollable-area') ?? panel
  area.scrollTo({ top: 0, behavior: prefersReducedMotion(area) ? 'instant' : 'smooth' })
}
function choose(index: number) {
  const item = visible.value[index]
  if (!item || item.disabled) return
  if (active.value === index) {
    resetScroll(item)
    emit('reselect', item.value)
  }
  if (selected.value !== item.value) selected.value = item.value
}
function key(event: KeyboardEvent, index: number) {
  const rtl = root.value?.matches(':dir(rtl)') ? -1 : 1
  const direction = event.key === 'ArrowRight' ? rtl : event.key === 'ArrowLeft' ? -rtl : 0
  const enabled = visible.value.map((item, at) => item.disabled ? -1 : at).filter(at => at >= 0)
  if (!enabled.length) return
  let target: number | undefined
  if (event.key === 'Home') target = enabled[0]
  else if (event.key === 'End') target = enabled.at(-1)
  else if (direction > 0) target = enabled.find(at => at > index) ?? enabled[0]
  else if (direction < 0) target = [...enabled].reverse().find(at => at < index) ?? enabled.at(-1)
  if (target === undefined) return
  event.preventDefault()
  buttons()[target]?.focus()
}
function under(event: PointerEvent) {
  const index = buttons().findIndex(button => {
    const box = button.getBoundingClientRect()
    return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
  })
  return index >= 0 && !visible.value[index].disabled ? index : undefined
}
function down(event: PointerEvent) {
  touchCommit = false
  if (event.pointerType !== 'touch' || !event.isPrimary || !root.value) return
  finger.value = event.pointerId
  preview.value = under(event)
  root.value.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (finger.value === event.pointerId) preview.value = under(event)
}
function up(event: PointerEvent) {
  if (finger.value !== event.pointerId) return
  const index = event.type === 'pointerup' ? under(event) : undefined
  touchCommit = index !== undefined
  finger.value = preview.value = undefined
  if (index !== undefined) choose(index)
}
</script>

<template>
  <div v-if="visible.length" ref="tabs" class="sy-tab-bar" role="tablist" :aria-label="label" :data-inline="inline || undefined"
    :data-tracking="finger !== undefined || undefined" :style="{ '--sy-tab-bar-count': visible.length, '--sy-tab-bar-index': lens }"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up">
    <span v-if="lens >= 0" class="sy-tab-bar__lens" aria-hidden="true" />
    <button v-for="(item, index) in visible" :key="item.value" role="tab" type="button" class="sy-tab-bar__item"
      :aria-selected="active === index" :tabindex="focusIndex === index ? 0 : -1" :aria-controls="item.panelId" :aria-disabled="item.disabled || undefined"
      :aria-label="item.badge !== undefined && item.badge !== '' ? `${item.label}, ${item.badgeLabel ?? item.badge}` : item.label"
      :data-preview="preview === index || undefined" @keydown="key($event, index)" @click="(!$event.detail || !touchCommit) && choose(index)">
      <span class="sy-tab-bar__icon">
        <slot name="icon" :item="item" :active="active === index">
          <SIcon :name="active === index ? item.selectedIcon ?? item.icon : item.icon" size="1.25rem" />
        </slot>
        <span v-if="item.badge !== undefined && item.badge !== ''" class="sy-tab-bar__badge" aria-hidden="true">{{ item.badge }}</span>
      </span>
      <span class="sy-tab-bar__label">{{ item.label }}</span>
    </button>
  </div>
</template>
