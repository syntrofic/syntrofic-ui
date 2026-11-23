<script setup lang="ts">
import { nextTick, onBeforeUpdate, onUpdated, provide, toRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import { listDensityContext, type ListDensity } from '../internal/list-context'
import { useAnimatedLayout } from '../internal/motion'
import { createReorderable, type ReorderMove } from '../internal/reorderable'

const props = withDefaults(defineProps<{
  label?: string
  header?: string
  density?: ListDensity
  listStyle?: 'none' | 'disc' | 'decimal'
  start?: number
  dividers?: boolean
  edge?: 'padded' | 'flush' | 'outset' | 'bleed'
  reorderable?: boolean
  canMove?: (move: ReorderMove) => boolean
}>(), { density: 'balanced', listStyle: 'none', start: 1, edge: 'padded' })
const emit = defineEmits<{ reorder: [move: ReorderMove] }>()
provide(listDensityContext, toRef(props, 'density'))
const slots = useSlots()
const heading = 'sy-list-heading-' + useId()
const list = useTemplateRef<HTMLElement>('list')
const capture = useAnimatedLayout({ scope: list })
let play: (() => void) | undefined
onBeforeUpdate(() => { play = capture() })
onUpdated(() => { play?.(); play = undefined })
watch([list, () => props.reorderable], ([element, reorderable], _, cleanup) => {
  if (element && reorderable) cleanup(createReorderable(element, {
    canMove: move => props.canMove?.(move) ?? true,
    onMove: move => {
      const document = element.ownerDocument
      const focused = move.input === 'keyboard' ? document.activeElement : null
      emit('reorder', move)
      if (focused instanceof HTMLElement && element.contains(focused)) void nextTick(() => {
        if (focused.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true })
      })
    },
  }))
}, { flush: 'post' })
</script>

<template>
  <div class="sy-list" :data-marker="listStyle" :data-density="density" :data-dividers="dividers || undefined" :data-edge="edge">
    <div v-if="header || slots.header" :id="heading" class="sy-list__header"><slot name="header">{{ header }}</slot></div>
    <component :is="listStyle === 'decimal' ? 'ol' : 'ul'" ref="list" class="sy-list__items" role="list"
      :start="listStyle === 'decimal' ? start : undefined" :style="{ '--sy-list-start': start - 1 }"
      :aria-label="label" :aria-labelledby="!label && (header || slots.header) ? heading : undefined">
      <slot />
    </component>
  </div>
</template>
