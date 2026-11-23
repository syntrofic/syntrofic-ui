<script setup lang="ts">
import { computed, nextTick, onScopeDispose, useId, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import { Primitive, TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import type { ButtonSize, TabItem } from '../types'
import SIcon from './SIcon.vue'
import STabMenu from './STabMenu.vue'
import SToolbar from './SToolbar.vue'
import { useKeyboardHint } from '../internal/keyboard-hint'
import { createAnimator, prefersReducedMotion, useAnimatedLayout } from '../internal/motion'

const props = withDefaults(defineProps<{
  tabs: readonly TabItem[]
  label: string
  defaultValue?: string
  orientation?: 'horizontal' | 'vertical'
  activation?: 'automatic' | 'manual'
  direction?: 'ltr' | 'rtl'
  lazy?: boolean
  loop?: boolean
  keyboardHint?: string | boolean
  toolbarLabel?: string
  size?: ButtonSize
  layout?: 'fit' | 'fill'
  indicator?: 'surface' | 'line'
  divider?: boolean
  overflow?: { label: string; options: readonly TabItem[] }
}>(), { orientation: 'horizontal', activation: 'automatic', lazy: true, loop: true, keyboardHint: true, layout: 'fit', size: 'md', indicator: 'surface' })

const model = defineModel<string>()
const menuId = `sy-tab-menu-${useId()}`
const extras = computed(() => {
  const seen = new Set(props.tabs.map(tab => tab.value))
  return props.overflow?.options.filter(tab => {
    if (seen.has(tab.value)) return false
    seen.add(tab.value)
    return true
  }) ?? []
})
const entries = computed(() => [...props.tabs, ...extras.value])
const active = computed(() => {
  const desired = model.value ?? props.defaultValue
  return entries.value.find(tab => tab.value === desired && !tab.disabled)?.value
    ?? entries.value.find(tab => !tab.disabled)?.value
})
const inOverflow = (value?: string) => extras.value.some(tab => tab.value === value)
const root = useTemplateRef<ComponentPublicInstance>('root')
const list = useTemplateRef<ComponentPublicInstance>('list')
let sizeMotion: ReturnType<typeof createAnimator> | undefined
watch(active, async (_, __, cleanup) => {
  const element = root.value?.$el as HTMLElement | undefined
  if (!element || typeof element.animate !== 'function' || prefersReducedMotion(element)) return
  const blockSize = () => parseFloat(element.ownerDocument.defaultView?.getComputedStyle(element).blockSize ?? '')
  const from = blockSize()
  let stale = false
  cleanup(() => { stale = true })
  await nextTick()
  // Reka updates panel presence after the active-state commit and queues another render.
  await Promise.resolve()
  await nextTick()
  if (stale || !element.isConnected) return
  sizeMotion?.cancel('panel-size')
  const to = blockSize()
  if (!(Math.abs(to - from) > 1)) return
  sizeMotion ??= createAnimator(element)
  sizeMotion.animate('panel-size', [
    { blockSize: from + 'px', overflow: 'clip' },
    { blockSize: to + 'px', overflow: 'clip' },
  ], { id: 'sy-tabs-layout', role: 'move', fill: 'backwards' })
})
onScopeDispose(() => sizeMotion?.dispose())
const moveTabs = useAnimatedLayout()
watch(() => props.tabs.map(tab => [tab.value, tab.label] as const), (tabs, previous) => {
  const element = list.value?.$el as HTMLElement | undefined
  if (!element || tabs.length === previous.length && tabs.every(([value, label], index) =>
    value === previous[index]?.[0] && label === previous[index]?.[1])) return
  const play = moveTabs([...element.querySelectorAll<HTMLElement>(':scope > .sy-tabs__trigger')])
  void nextTick(play)
})
const { HintElement, onFocus, onBlur, onKeyDown } = useKeyboardHint(() => ({ orientation: props.orientation,
  isEnabled: props.keyboardHint !== false && entries.value.filter(tab => !tab.disabled).length > 1,
  label: typeof props.keyboardHint === 'string' ? props.keyboardHint : undefined }))
</script>

<template>
  <TabsRoot
    ref="root"
    class="sy-tabs"
    :data-layout="layout"
    :data-divider="divider || undefined"
    :data-size="size"
    :model-value="active"
    :orientation="orientation"
    :activation-mode="activation"
    :dir="direction"
    :unmount-on-hide="lazy"
    @update:model-value="model = String($event)"
  >
    <component :is="$slots.actions ? SToolbar : Primitive" :as-child="$slots.actions ? undefined : true"
      :class="$slots.actions ? 'sy-tabs__header' : undefined" :size="$slots.actions ? size : undefined"
      :label="$slots.actions ? toolbarLabel ?? label : undefined" :keyboard-hint="$slots.actions ? false : undefined">
      <TabsList ref="list" class="sy-tabs__list" :data-size="size" :data-tab-indicator="indicator" :aria-label="label" :loop="loop" data-sy-keyboard-hint-scope @focusin="onFocus" @focusout="onBlur" @keydown="onKeyDown">
        <TabsIndicator class="sy-tabs__indicator-track" :data-hidden="!active || inOverflow(active) || undefined" aria-hidden="true">
          <span class="sy-tabs__indicator" />
        </TabsIndicator>
        <TabsTrigger v-for="tab in tabs" :key="tab.value" class="sy-tabs__trigger" :value="tab.value" :disabled="tab.disabled">
          <slot name="tab" :tab="tab" :active="tab.value === active">
            <span v-if="tab.icon || tab.selectedIcon" class="sy-tabs__icon" aria-hidden="true">
              <Transition name="sy-tab-icon">
                <SIcon :key="(tab.value === active ? tab.selectedIcon : tab.icon) ?? tab.icon ?? ''"
                  :name="(tab.value === active ? tab.selectedIcon : tab.icon) ?? tab.icon" size="sm" />
              </Transition>
            </span>
            <span class="sy-tabs__label">
              <span class="sy-visually-hidden">{{ tab.label }}</span>
              <Transition name="sy-tab-label">
                <span :key="tab.label" aria-hidden="true">{{ tab.label }}</span>
              </Transition>
            </span>
          </slot>
          <slot name="tab-end" :tab="tab" :active="tab.value === active" />
        </TabsTrigger>
        <STabMenu v-if="overflow && extras.length" :id="menuId" :model-value="active" :label="overflow.label"
          :options="extras" :direction="direction" in-tab-list @update:model-value="model = $event" />
        <HintElement />
      </TabsList>
      <template v-if="$slots.actions" #end><slot name="actions" /></template>
    </component>
    <TabsContent v-for="tab in entries" :key="tab.value" :value="tab.value" as-child>
      <div class="sy-tabs__panel" v-bind="inOverflow(tab.value) ? { 'aria-labelledby': menuId } : {}">
        <slot name="panel" :tab="tab" />
      </div>
    </TabsContent>
  </TabsRoot>
</template>
