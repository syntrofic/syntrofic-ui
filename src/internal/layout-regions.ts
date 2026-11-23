import { computed, defineComponent, h, inject, onBeforeUnmount, provide, watch, type InjectionKey, type PropType, type Ref } from 'vue'
import { layoutPadding, layoutPaddingContext, layoutSize, type LayoutSize } from './layout-spacing'
import { createAnimator, prefersReducedMotion, startLayoutCompanion } from './motion'
import { useScrollableArea } from './scroll-layout'
import { attachResizePane, resizePaneState, resizeReleaseMotion } from './resize-pane'
import type { ResizableControl } from './use-resizable'

export const layoutDividers: InjectionKey<Readonly<Ref<boolean>>> = Symbol('layout dividers')

type ResizeConfig = ResizableControl['props']['value']

function usePaneMotion(viewport: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>, resize: Readonly<Ref<ResizeConfig | undefined>>) {
  let before: { shown: number; contentSize: number } | undefined
  let motion: { effect: Animation; target: number; property: 'inlineSize' | 'blockSize' } | undefined
  const change = () => {
    const config = resize.value
    const state = resizePaneState(config)
    const property = config?.axis === 'vertical' ? 'blockSize' : 'inlineSize'
    return [state && config?.value, property, state?.dragging.value] as const
  }
  function clear(node: HTMLElement) {
    node.removeAttribute('data-sy-pane-motion')
    node.style.removeProperty('--sy-pane-content-size')
  }
  const state = computed(() => resizePaneState(resize.value))
  watch([viewport, state], ([node, bound], _, cleanup) => {
    if (node && bound) cleanup(attachResizePane(node, bound))
  }, { flush: 'post' })
  watch(change, ([target, property, dragging], [, , wasDragging]) => {
    const node = viewport.value
    const view = node?.ownerDocument.defaultView
    if (target === undefined || !node || !view || before || dragging && wasDragging || prefersReducedMotion(node)) return
    const body = content.value
    before = { shown: parseFloat(view.getComputedStyle(node)[property]),
      contentSize: body ? parseFloat(view.getComputedStyle(body)[property]) : 0 }
  }, { flush: 'sync' })
  watch(change, ([target, property, dragging]) => {
    const node = viewport.value
    const previous = before
    before = undefined
    if (!node) return
    // Keep an unrelated update from restarting an in-progress slide.
    if (motion && motion.target === target && motion.property === property && !dragging && motion.effect.playState !== 'idle') return
    motion?.effect.cancel()
    motion = undefined
    clear(node)
    if (!previous || target === undefined || dragging || Math.abs(target - previous.shown) < .5
      || !Number.isFinite(previous.shown) || typeof node.animate !== 'function' || prefersReducedMotion(node)) return
    node.setAttribute('data-sy-pane-motion', property === 'inlineSize' ? 'inline' : 'block')
    node.style.setProperty('--sy-pane-content-size', Math.max(target, previous.shown, previous.contentSize || 0) + 'px')
    const animation = createAnimator(node).animate('resize-pane', [
      { [property]: previous.shown + 'px' }, { [property]: target + 'px' },
    ], { role: 'move', fill: 'backwards', ...resizeReleaseMotion(node) })
    motion = { effect: startLayoutCompanion(node, animation), target, property }
    const finish = () => { if (motion?.effect === animation) { motion = undefined; clear(node) } }
    animation.finished.then(finish, finish)
  }, { flush: 'post' })
  onBeforeUnmount(() => motion?.effect.cancel())
}

function layoutRegion(name: string, region: string, tag: string) {
  const canScroll = region === 'content' || region === 'panel'
  const outside = region === 'header' || region === 'footer'
  return defineComponent({
    name,
    props: {
      as: { type: String, default: tag },
      label: String,
      role: String,
      width: [Number, String] as PropType<LayoutSize>,
      height: [Number, String] as PropType<LayoutSize>,
      padding: [Number, String] as PropType<LayoutSize>,
      paddingInline: [Number, String] as PropType<LayoutSize>,
      paddingInlineStart: [Number, String] as PropType<LayoutSize>,
      paddingInlineEnd: [Number, String] as PropType<LayoutSize>,
      paddingBlock: [Number, String] as PropType<LayoutSize>,
      paddingBlockStart: [Number, String] as PropType<LayoutSize>,
      paddingBlockEnd: [Number, String] as PropType<LayoutSize>,
      hasDivider: { type: Boolean, default: undefined },
      scrollable: { type: Boolean, default: canScroll },
      resizable: Object as PropType<ResizableControl | ResizeConfig>,
    },
    setup(props, { slots }) {
      const padding = inject(layoutPaddingContext, undefined)
      const divider = inject(layoutDividers, undefined)
      const insets = computed(() => layoutPadding(props, padding?.value ?? layoutPadding({ padding: 3 })))
      const headerInsets = computed(() => ({
        '--sy-layout-header-padding-start': insets.value.paddingInlineStart,
        '--sy-layout-header-padding-end': insets.value.paddingInlineEnd,
        '--sy-layout-header-padding-top': insets.value.paddingBlockStart,
        '--sy-layout-header-padding-bottom': insets.value.paddingBlockEnd,
      }))
      const { viewport, content, viewportAttrs } = useScrollableArea({ keyboardOwner: 'content-or-viewport' })
      const resize = computed(() => {
        const control = region === 'panel' ? props.resizable : undefined
        return control && ('props' in control ? control.props.value : control)
      })
      const state = computed(() => resizePaneState(resize.value))
      const width = computed(() => resize.value?.axis !== 'vertical' ? resize.value?.value ?? props.width : props.width)
      const height = computed(() => resize.value?.axis === 'vertical' ? resize.value.value : props.height)
      const collapsed = computed(() => state.value?.collapsed.value ?? false)
      const wrap = computed(() => props.scrollable || Boolean(state.value))
      if (region === 'panel') usePaneMotion(viewport, content, resize)
      watch(collapsed, hidden => {
        const node = viewport.value
        if (!hidden || !node?.id || !node.contains(node.ownerDocument.activeElement)) return
        const separators = node.ownerDocument.querySelectorAll<HTMLElement>('[role="separator"][aria-controls]')
        const handle = [...separators].find(candidate => candidate.getAttribute('aria-controls')?.split(/\s+/).includes(node.id))
        handle?.focus({ preventScroll: true })
      })
      provide(layoutPaddingContext, insets)
      return () => h(props.as, {
        ...(props.scrollable ? viewportAttrs.value : {}), ref: viewport, class: `sy-layout-${region}`,
        'data-sy-layout-region': region, 'data-width': width.value === undefined ? undefined : '',
        'data-scrollable': props.scrollable || undefined,
        'data-sy-resize-dragging': state.value?.dragging.value || undefined,
        'data-divider': (props.hasDivider ?? (outside && divider?.value)) || undefined,
        role: props.role,
        'aria-label': props.label,
        'aria-hidden': collapsed.value || undefined,
        inert: collapsed.value || undefined,
        style: { inlineSize: layoutSize(width.value), blockSize: layoutSize(height.value),
          ...(region === 'header' ? headerInsets.value : !wrap.value ? insets.value : {}) },
      }, wrap.value ? h('div', { ref: content, class: 'sy-layout__region-content',
        ...(region !== 'header' && { style: insets.value }) }, slots.default?.()) : slots.default?.())
    },
  })
}

export const SLayoutContent = layoutRegion('SLayoutContent', 'content', 'div')
export const SLayoutHeader = layoutRegion('SLayoutHeader', 'header', 'header')
export const SLayoutFooter = layoutRegion('SLayoutFooter', 'footer', 'footer')
export const SLayoutPanel = layoutRegion('SLayoutPanel', 'panel', 'aside')
