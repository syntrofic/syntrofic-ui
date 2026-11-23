<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { computed, defineComponent, inject, nextTick, provide, shallowReactive, shallowRef, useId, useTemplateRef, watch, type PropType, type Slot } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { dialogContainer } from '../internal/dialog-container'
import { prefersReducedMotion } from '../internal/motion'
import { usePortalTheme } from '../internal/portal-theme'
import { tourContext, type TourDismissSource, type TourEntry, type TourStep } from '../internal/tour'
import SButton from './SButton.vue'
import SCloseButton from './SCloseButton.vue'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

const props = withDefaults(defineProps<{
  steps?: readonly TourStep[]
  previousLabel?: string
  nextLabel?: string
  finishLabel?: string
  dismissLabel?: string
  skipLabel?: string
  showStepCount?: boolean
  stepLabel?: (current: number, total: number) => string
  backdrop?: boolean
}>(), { steps: () => [], previousLabel: 'Previous', nextLabel: 'Next', finishLabel: 'Finish', dismissLabel: 'Close tour' })
const open = defineModel<boolean>('open', { default: false })
const step = defineModel<number>('step', { default: 0 })
const emit = defineEmits<{ finish: []; dismiss: [source: TourDismissSource] }>()
const anchor = useTemplateRef<HTMLSpanElement>('anchor')
const callout = useTemplateRef<HTMLElement>('callout')
const host = inject(dialogContainer, null)
const destination = computed(() => host?.value ?? 'body')
const portalTheme = usePortalTheme(destination, anchor)
const titleId = 'sy-tour-heading-' + useId()
const detailId = titleId + '-details'
const custom = shallowReactive<TourEntry[]>([])
provide(tourContext, entry => {
  custom.push(entry)
  return () => { const index = custom.indexOf(entry); if (index >= 0) custom.splice(index, 1) }
})
const entries = computed(() => props.steps.length ? props.steps : custom.map(entry => entry.step.value))
const position = computed(() => Math.min(entries.value.length - 1, Math.max(0, Math.trunc(step.value) || 0)))
const active = computed(() => entries.value[position.value])
const content = computed(() => props.steps.length ? undefined : custom[position.value]?.content)
const showing = computed(() => open.value && Boolean(active.value))
const target = shallowRef<HTMLElement>()
const bounds = shallowRef<DOMRect>()
const targetInput = computed(() => typeof active.value?.target === 'function' ? active.value.target() : active.value?.target)
const fallback = {
  getBoundingClientRect() {
    const view = anchor.value?.ownerDocument.defaultView
    return new DOMRect((view?.innerWidth ?? 0) / 2, (view?.innerHeight ?? 0) / 2, 0, 0)
  },
}
const side = computed(() => {
  const rtl = anchor.value?.matches(':dir(rtl)')
  return ({ above: 'top', below: 'bottom', start: rtl ? 'right' : 'left', end: rtl ? 'left' : 'right' } as const)[active.value?.placement ?? 'below']
})
const ring = computed(() => bounds.value ? { left: bounds.value.left - 4 + 'px', top: bounds.value.top - 4 + 'px',
  width: bounds.value.width + 8 + 'px', height: bounds.value.height + 8 + 'px' } : undefined)
let previous: HTMLElement | undefined

watch([showing, targetInput, anchor], ([visible, input, node], _, cleanup) => {
  target.value = undefined
  bounds.value = undefined
  if (!visible || !node) return
  const document = node.ownerDocument
  const view = document.defaultView
  if (!view) return
  const viewport = view
  let frame = 0
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : undefined
  function measure() {
    frame = 0
    let element: HTMLElement | null | undefined
    try { element = typeof input === 'string' ? document.querySelector<HTMLElement>(input) : input }
    catch { return }
    const found = element instanceof viewport.HTMLElement && element.isConnected ? element : undefined
    if (target.value !== found) {
      observer?.disconnect()
      target.value = found
      if (found) {
        observer?.observe(found)
        found.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion(found) ? 'instant' : 'smooth' })
      }
    }
    bounds.value = found?.getBoundingClientRect()
  }
  function schedule() { if (!frame) frame = viewport.requestAnimationFrame(measure) }
  const mutation = new view.MutationObserver(schedule)
  mutation.observe(document.body, { subtree: true, childList: true })
  view.addEventListener('scroll', schedule, { capture: true, passive: true })
  view.addEventListener('resize', schedule, { passive: true })
  measure()
  cleanup(() => {
    observer?.disconnect()
    mutation.disconnect()
    view.removeEventListener('scroll', schedule, true)
    view.removeEventListener('resize', schedule)
    if (frame) view.cancelAnimationFrame(frame)
  })
}, { flush: 'post' })
watch(showing, (visible, wasVisible) => {
  if (visible) {
    const current = anchor.value?.ownerDocument.activeElement
    if (!previous && current instanceof HTMLElement) previous = current
  } else if (wasVisible) {
    step.value = 0
    const last = previous
    previous = undefined
    void nextTick(() => { if (last?.isConnected) last.focus({ preventScroll: true }) })
  }
})
watch([showing, position, callout], ([visible, , node]) => {
  if (visible) node?.focus({ preventScroll: true })
}, { flush: 'post' })
function dismiss(reason: TourDismissSource) {
  if (!open.value) return
  open.value = false
  emit('dismiss', reason)
  if (reason === 'complete') emit('finish')
}
function next() { if (position.value < entries.value.length - 1) step.value = position.value + 1; else dismiss('complete') }
function back() { if (position.value > 0) step.value = position.value - 1 }
function show(event?: MouseEvent) {
  if (event?.currentTarget instanceof HTMLElement) previous = event.currentTarget
  step.value = 0
  open.value = true
}
const StepContent = defineComponent({
  props: { render: Function as PropType<Slot> },
  setup: item => () => item.render?.(),
})
defineExpose({ show, next, back, complete: () => dismiss('complete'), dismiss: () => dismiss('close') })
const collisionPadding = useLayerCollisionPadding(12)
</script>

<template>
  <span ref="anchor" hidden />
  <slot name="trigger" :open="show" />
  <slot name="steps" />
  <Teleport v-if="showing" :to="destination">
    <SThemePortalScope :theme="portalTheme">
      <div class="sy-tour__spotlight" :data-backdrop="backdrop || undefined" :data-unanchored="!ring || undefined"
        aria-hidden="true" @click.prevent="backdrop && dismiss('backdrop')">
        <div v-if="ring" class="sy-tour__ring" :style="ring" />
      </div>
    </SThemePortalScope>
  </Teleport>
  <PopoverRoot :open="showing" :modal="false">
    <PopoverAnchor :reference="target ?? fallback" />
    <PopoverPortal :to="destination">
      <SThemePortalScope :theme="portalTheme">
        <PopoverContent v-if="active" as-child :side="side" :align="active.alignment ?? 'start'" :side-offset="12" :collision-padding="collisionPadding"
          update-position-strategy="always" @open-auto-focus.prevent @close-auto-focus.prevent @pointer-down-outside.prevent @focus-outside.prevent
          @escape-key-down.prevent="dismiss('escape')">
          <section ref="callout" class="sy-tour sy-floating-panel" role="region" tabindex="-1"
            :aria-labelledby="titleId" :aria-describedby="active.description ? detailId : undefined">
            <header><h2 :id="titleId">{{ active.title }}</h2><SCloseButton :label="dismissLabel" @click="dismiss('close')" /></header>
            <p v-if="active.description" :id="detailId">{{ active.description }}</p>
            <StepContent v-if="content" :render="content" />
            <slot v-else :step="active" :index="position" />
            <footer>
              <span v-if="showStepCount" class="sy-tour__position" aria-live="polite">{{ stepLabel?.(position + 1, entries.length) ?? (position + 1) + ' / ' + entries.length }}</span>
              <SButton v-if="skipLabel" variant="ghost" size="sm" @click="dismiss('skip')">{{ skipLabel }}</SButton>
              <SButton v-if="position > 0" variant="secondary" size="sm" @click="back">{{ previousLabel }}</SButton>
              <SButton size="sm" @click="next">{{ position === entries.length - 1 ? finishLabel : nextLabel }}</SButton>
            </footer>
          </section>
        </PopoverContent>
      </SThemePortalScope>
    </PopoverPortal>
  </PopoverRoot>
</template>
