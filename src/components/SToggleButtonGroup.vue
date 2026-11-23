<script setup lang="ts" generic="Multiple extends boolean = false">
import { computed, nextTick, provide, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import { ToggleGroupRoot } from 'reka-ui'
import type { ButtonSize, ToggleItem } from '../types'
import { useMenuPress } from '../internal/menu-press'
import { useAnimatedLayout } from '../internal/motion'
import { toggleButtonGroupContext } from '../internal/toggle-button-group'
import SToggleButton from './SToggleButton.vue'

const props = withDefaults(defineProps<{
  items?: readonly ToggleItem[]
  label: string
  multiple?: Multiple & boolean
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  loop?: boolean
  size?: ButtonSize
  dragSelection?: boolean
}>(), { items: () => [], orientation: 'horizontal', loop: true, size: 'md', dragSelection: true })

type Selection = Multiple extends true ? string[] : string
const selected = defineModel<Selection>()
provide(toggleButtonGroupContext, { selected, disabled: computed(() => props.disabled), size: computed(() => props.size) })

const root = useTemplateRef<ComponentPublicInstance>('root')
const element = () => root.value?.$el?.nodeType === 1 ? root.value.$el as HTMLElement : null
const captureLayout = useAnimatedLayout({ scope: element })
watch([() => props.orientation, () => props.direction, () => props.items.map(item => item.value)], () => {
  const play = captureLayout(element()?.querySelectorAll<HTMLElement>('[data-sy-toggle-member]'))
  void nextTick(play)
})
let previewed: HTMLElement | null = null
function preview(next: HTMLElement | null) {
  previewed?.removeAttribute('data-sy-toggle-preview')
  previewed = next
  previewed?.setAttribute('data-sy-toggle-preview', '')
}
const gesture = useMenuPress({
  menu: element,
  itemSelector: '[data-sy-toggle-member]',
  acceptItem: item => item.closest('[data-sy-toggle-group]') === element(),
  enabled: () => props.dragSelection && !props.disabled,
  activateOnRelease: true,
  onStart: preview,
  onHighlight: preview,
  onEnd: () => preview(null),
})
watch(() => props.dragSelection && !props.disabled, enabled => { if (!enabled) gesture.cancel() })
function pointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') gesture.menuProps.onPointerdown(event)
}
function update(value: unknown) {
  const normalized = props.multiple
    ? Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
    : typeof value === 'string' ? value : undefined
  selected.value = normalized as Selection | undefined
}
</script>

<template>
  <ToggleGroupRoot
    ref="root"
    class="sy-toggle-group"
    data-sy-toggle-group
    :data-sy-menu-press="dragSelection ? '' : undefined"
    :data-orientation="orientation"
    :data-size="size"
    :data-disabled="disabled ? '' : undefined"
    :aria-label="label"
    :type="multiple ? 'multiple' : 'single'"
    :model-value="selected"
    :orientation="orientation"
    :dir="direction"
    :disabled="disabled"
    :loop="loop"
    @pointerdown="pointerDown"
    @update:model-value="update"
  >
    <slot>
      <SToggleButton v-for="item in items" :key="item.value" :value="item.value" :label="$slots.item ? undefined : item.label"
        :disabled="item.disabled" :size="item.size" :elevation="item.elevation" :icon="item.icon">
        <template v-if="$slots.item" #default><slot name="item" :item="item" /></template>
      </SToggleButton>
    </slot>
  </ToggleGroupRoot>
</template>
