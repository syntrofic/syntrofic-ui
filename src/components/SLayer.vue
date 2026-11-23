<script setup lang="ts">
import { computed, createCommentVNode, defineComponent, inject, onMounted, ref, shallowRef, useTemplateRef, watch, watchEffect, type ComponentPublicInstance, type CSSProperties } from 'vue'
import { dialogContainer } from '../internal/dialog-container'
import { layerViewportPadding, useLayerTarget } from '../internal/layer-context'
import { findLayerHost, positionLayer } from '../internal/layer-position'
import { useLayerFocus } from '../internal/layer-focus'
import { usePortalTheme } from '../internal/portal-theme'
import type { LayerAlignment, LayerController, LayerPlacement } from '../internal/layer'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  layer: LayerController
  label?: string
  ariaHidden?: boolean
  placement?: LayerPlacement
  align?: LayerAlignment
  positioning?: 'auto' | 'custom'
  offset?: number | string
  x?: number
  y?: number
  resolveHost?: boolean
}>(), { placement: 'below', align: 'start', positioning: 'auto' })
const host = useLayerTarget()
const viewportPadding = inject(layerViewportPadding, undefined)
const dialog = inject(dialogContainer, null)
const marker = useTemplateRef<ComponentPublicInstance>('marker')
const LayerMarker = defineComponent(() => () => createCommentVNode('sy-layer-anchor'))
const origin = computed(() => (marker.value?.$el as Comment | undefined)?.parentElement)
const panel = useTemplateRef<HTMLElement>('panel')
const spacing = useTemplateRef<HTMLElement>('spacing')
const scopedHost = shallowRef<HTMLElement>()
const mounted = ref(false)
const direction = ref<CSSProperties['direction']>()
const writingMode = ref<CSSProperties['writingMode']>()
const side = ref<string>()
const context = computed(() => props.layer.mode === 'context')
const resolves = computed(() => props.resolveHost && context.value)
const open = computed(() => props.layer.open.value)
const focus = useLayerFocus({ open, surface: () => panel.value, origin: () => props.layer.anchor.value ?? origin.value,
  anchor: () => props.layer.anchor.value, autofocus: () => false })
const shown = computed(() => (!resolves.value || mounted.value) && (!props.layer.lazyMount || !context.value || open.value))
const target = computed(() => resolves.value ? scopedHost.value : dialog?.value ?? host?.value)
const portalTheme = usePortalTheme(target, origin)
const offset = computed(() => props.offset ?? props.layer.offset ?? (props.resolveHost ? 0 : 6))
const position = computed(() => {
  const inherited = { direction: direction.value, writingMode: writingMode.value }
  if (context.value && props.positioning === 'custom') return { ...inherited, positionAnchor: props.layer.anchorId }
  const padding = context.value ? viewportPadding?.value : undefined
  const { x, y } = props.layer.position.value
  return {
    ...inherited, left: x + 'px', top: y + 'px',
    '--sy-layer-inset-top': padding ? padding.top + 'px' : undefined,
    '--sy-layer-inset-right': padding ? padding.right + 'px' : undefined,
    '--sy-layer-inset-bottom': padding ? padding.bottom + 'px' : undefined,
    '--sy-layer-inset-left': padding ? padding.left + 'px' : undefined,
  }
})
onMounted(() => { mounted.value = true })
watchEffect(() => {
  const parent = origin.value
  if (!parent) { scopedHost.value = undefined; return }
  const next = findLayerHost(parent)
  scopedHost.value = next === parent ? undefined : next
  const inherited = parent.ownerDocument.defaultView?.getComputedStyle(parent)
  direction.value = inherited?.direction as CSSProperties['direction']
  writingMode.value = inherited?.writingMode as CSSProperties['writingMode']
}, { flush: 'post' })

function measure(node: HTMLElement, layer: LayerController) {
  const view = node.ownerDocument.defaultView
  if (!view) return
  const parent = origin.value
  const inherited = view.getComputedStyle(parent ?? node)
  if (parent) {
    direction.value = inherited.direction as CSSProperties['direction']
    writingMode.value = inherited.writingMode as CSSProperties['writingMode']
  }
  if (context.value && props.positioning === 'custom') return
  const point = layer.point.value
  if (point) { layer.updatePosition(point.x, point.y); return }
  if (!context.value) {
    layer.updatePosition(props.x ?? layer.position.value.x, props.y ?? layer.position.value.y)
    return
  }
  if (!layer.anchor.value || !spacing.value) return
  const insets = view.getComputedStyle(spacing.value)
  const clearance = typeof offset.value === 'number' ? offset.value : parseFloat(insets.marginLeft)
  const result = positionLayer(node, layer.anchor.value, insets, Number.isFinite(clearance) ? clearance : 0,
    props.placement, props.align, inherited.direction, inherited.writingMode)
  layer.updatePosition(result.x, result.y)
  side.value = result.side
}

watch(() => [panel.value, open.value, props.layer, props.layer.anchor.value, marker.value] as const,
  ([node, active, layer, anchor], _, cleanup) => {
  if (!active) focus.finish()
  if (!node) return
  if (typeof node.showPopover === 'function') {
    if (active && !node.matches(':popover-open')) node.showPopover()
    if (!active && node.matches(':popover-open')) node.hidePopover()
  }
  if (!active) return
  const view = node.ownerDocument.defaultView
  if (!view) return
  const reposition = () => measure(node, layer)
  reposition()
  const unobserve = layer.observePosition(reposition)
  const listeners = new AbortController()
  const options = { signal: listeners.signal, passive: true, capture: true }
  view.addEventListener('resize', reposition, options)
  view.addEventListener('scroll', reposition, options)
  view.visualViewport?.addEventListener('resize', reposition, options)
  view.visualViewport?.addEventListener('scroll', reposition, options)
  const sizes = new ResizeObserver(reposition)
  sizes.observe(node)
  if (anchor) sizes.observe(anchor)
  const contextStyles = new MutationObserver(reposition)
  for (let ancestor = origin.value ?? node.parentElement; ancestor; ancestor = ancestor.parentElement) {
    contextStyles.observe(ancestor, { attributes: true, attributeFilter: ['dir', 'style', 'class'] })
  }
  cleanup(() => { unobserve(); listeners.abort(); sizes.disconnect(); contextStyles.disconnect() })
}, { flush: 'post' })
watch(() => [offset.value, props.placement, props.align, props.positioning, props.x, props.y, viewportPadding?.value], () => {
  if (panel.value && open.value) measure(panel.value, props.layer)
}, { flush: 'post' })

function sync(event: Event) {
  if ((event as Event & { newState?: string }).newState === 'closed' && !panel.value?.matches(':popover-open')) {
    props.layer.hide()
    focus.finish()
  }
}
</script>

<template>
  <LayerMarker v-if="resolves || target" ref="marker" />
  <Teleport v-if="shown" :to="target ?? 'body'" :disabled="!target">
    <SThemePortalScope :theme="portalTheme">
      <div v-bind="$attrs" :id="layer.id" ref="panel" class="sy-floating-panel sy-layer"
        :aria-label="label" :aria-hidden="ariaHidden || undefined" :popover="layer.popover.value"
        :data-side="side" :hidden="!open" :style="position" @toggle="sync">
        <span v-if="context && positioning === 'auto'" ref="spacing" class="sy-layer__spacing"
          :style="{ marginLeft: typeof offset === 'string' ? offset : undefined }" aria-hidden="true" />
        <slot :close="layer.hide" />
      </div>
    </SThemePortalScope>
  </Teleport>
</template>
