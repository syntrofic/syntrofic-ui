<script setup lang="ts">
import { Comment, Fragment, computed, inject, onBeforeUnmount, onBeforeUpdate, onUpdated, provide, useSlots, useTemplateRef, type VNode } from 'vue'
import { layoutPadding, layoutPaddingContext, layoutSize, type LayoutPadding, type LayoutSize } from '../internal/layout-spacing'
import { layoutDividers } from '../internal/layout-regions'
import { hasAnimatedBrandHeader } from '../internal/brand-navigation-motion'
import { createAnimator, prefersReducedMotion, startLayoutCompanion } from '../internal/motion'
import { resizeReleaseMotion } from '../internal/resize-pane'

const props = withDefaults(defineProps<LayoutPadding & {
  height?: LayoutSize | 'auto' | 'fill'
  startWidth?: LayoutSize
  endWidth?: LayoutSize
  contentWidth?: LayoutSize
  label?: string
  defaultHasDividers?: boolean
  animate?: boolean
}>(), { startWidth: 'min(16rem, 28%)', endWidth: 'min(16rem, 28%)', defaultHasDividers: undefined, animate: true })
const parentInsets = inject(layoutPaddingContext, undefined)
const parentDividers = inject(layoutDividers, undefined)
const insets = computed(() => layoutPadding(props, parentInsets?.value ?? layoutPadding({ padding: 'var(--sy-inset)' })))
const dividers = computed(() => props.defaultHasDividers ?? parentDividers?.value ?? false)
const css = computed(() => ({
  blockSize: props.height === 'fill' ? '100%' : layoutSize(props.height),
  '--sy-layout-start': layoutSize(props.startWidth),
  '--sy-layout-end': layoutSize(props.endWidth),
  '--sy-layout-width': layoutSize(props.contentWidth),
  '--sy-layout-frame-width': typeof props.contentWidth === 'string' && /^(?:auto|none|stretch|min-content|max-content|fit-content)/.test(props.contentWidth) ? '100%' : layoutSize(props.contentWidth),
  '--sy-layout-padding-start': insets.value.paddingInlineStart,
  '--sy-layout-padding-end': insets.value.paddingInlineEnd,
  '--sy-layout-padding-top': insets.value.paddingBlockStart,
  '--sy-layout-padding-bottom': insets.value.paddingBlockEnd,
}))
provide(layoutPaddingContext, insets)
provide(layoutDividers, dividers)

const slots = useSlots()
function hasContent(nodes: readonly VNode[]): boolean {
  return nodes.some(node => node.type !== Comment && (node.type !== Fragment || !Array.isArray(node.children) || hasContent(node.children as VNode[])))
}
const shown = (name: string) => hasContent(slots[name]?.() ?? [])
const root = useTemplateRef<HTMLDivElement>('root')
let animator: ReturnType<typeof createAnimator> | undefined
let before: ReturnType<typeof readTracks>

function readTracks(node: HTMLElement | null) {
  if (!node?.getClientRects().length) return
  const style = node.ownerDocument.defaultView?.getComputedStyle(node)
  if (style?.display !== 'grid') return
  return { gridTemplateColumns: style.gridTemplateColumns, gridTemplateRows: style.gridTemplateRows }
}

onBeforeUpdate(() => { before = props.animate ? readTracks(root.value) : undefined })
onUpdated(() => {
  const node = root.value
  if (!node) return
  animator?.cancel('tracks')
  if (!props.animate || prefersReducedMotion(node)) return
  const from = before
  const after = readTracks(node)
  if (!from || !after) return
  const keys = hasAnimatedBrandHeader(node) ? ['gridTemplateColumns'] as const : ['gridTemplateColumns', 'gridTemplateRows'] as const
  const changed = keys.filter(key => from[key] !== after[key])
  if (!changed.length) return
  const frames = [from, after].map(tracks => Object.fromEntries(changed.map(key => [key, tracks[key]])))
  animator ??= createAnimator(node)
  startLayoutCompanion(node, animator.animate('tracks', frames, { role: 'move', fill: 'backwards', ...resizeReleaseMotion(node) }))
})
onBeforeUnmount(() => animator?.dispose())

function disableLeaving(node: Element) { (node as HTMLElement).inert = true }
</script>

<template>
  <div ref="root" class="sy-layout" :style="css" :aria-label="label" :data-frame="contentWidth !== undefined || undefined"
    :data-start="shown('start') || undefined" :data-end="shown('end') || undefined" :data-animated="animate || undefined">
    <Transition name="sy-layout-region" :css="animate" @before-leave="disableLeaving">
      <div v-if="shown('header')" class="sy-layout__header"><div class="sy-layout__region-body"><slot name="header" /></div></div>
    </Transition>
    <Transition name="sy-layout-region" :css="animate" @before-leave="disableLeaving">
      <div v-if="shown('start')" class="sy-layout__start"><div class="sy-layout__region-body"><slot name="start" /></div></div>
    </Transition>
    <div class="sy-layout__content"><div class="sy-layout__region-body"><slot name="content"><slot /></slot></div></div>
    <Transition name="sy-layout-region" :css="animate" @before-leave="disableLeaving">
      <div v-if="shown('end')" class="sy-layout__end"><div class="sy-layout__region-body"><slot name="end" /></div></div>
    </Transition>
    <Transition name="sy-layout-region" :css="animate" @before-leave="disableLeaving">
      <div v-if="shown('footer')" class="sy-layout__footer"><div class="sy-layout__region-body"><slot name="footer" /></div></div>
    </Transition>
  </div>
</template>
