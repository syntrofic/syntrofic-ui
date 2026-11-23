<script lang="ts">
import type { PanelSnapPoint, SheetOptions } from '../internal/panel'

export interface BottomSheetStep {
  id: string
  title: string
  description?: string
  size?: SheetOptions['size']
  snapPoints?: readonly PanelSnapPoint[]
  initialSnapPoint?: PanelSnapPoint | null
  purpose?: 'info' | 'form' | 'required'
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import SMotionText from './SMotionText.vue'
import SSheet from './SSheet.vue'

const props = withDefaults(defineProps<{
  steps: readonly BottomSheetStep[]
  hasScrim?: boolean
  detached?: boolean
  dismissLabel?: string
  resizeLabel?: string
}>(), { hasScrim: true })
const activeSheet = defineModel<string | null>('activeSheet', { default: null })
const snapPoint = ref<PanelSnapPoint | null>()
const nodes = new Map<string, HTMLElement>()
const last = shallowRef<BottomSheetStep>()
const active = computed(() => props.steps.find(step => step.id === activeSheet.value))
const panel = computed(() => active.value ?? last.value ?? props.steps[0])
const open = computed({ get: () => Boolean(active.value), set: value => { if (!value) activeSheet.value = null } })
const direction = ref<'forward' | 'back'>('forward')

function activate(id: string) {
  if (props.steps.some(step => step.id === id)) activeSheet.value = id
}
function close() { activeSheet.value = null }
function attach(id: string, node: unknown) {
  if (node instanceof HTMLElement) nodes.set(id, node)
  else nodes.delete(id)
}
watch(active, (step, previous) => {
  if (!step) return
  last.value = step
  snapPoint.value = step.initialSnapPoint
  if (!previous || previous.id === step.id) return
  direction.value = props.steps.indexOf(step) < props.steps.indexOf(previous) ? 'back' : 'forward'
  void nextTick(() => {
    if (active.value?.id !== step.id) return
    const node = nodes.get(step.id)
    const target = node?.querySelector<HTMLElement>('[autofocus]:not(:disabled)') ?? node
    target?.focus({ preventScroll: true })
  })
}, { immediate: true })
defineExpose({ activate, close })
</script>

<template>
  <SSheet v-if="panel" v-model:open="open" v-model:snap-point="snapPoint" :title="panel.title" :description="panel.description" side="bottom"
    :size="panel.size ?? 'full'" :modal="hasScrim" :detached="detached" :dismiss-label="dismissLabel" :resize-label="resizeLabel"
    :snap-points="panel.snapPoints" :initial-snap-point="panel.initialSnapPoint" :close-on-backdrop="!panel.purpose || panel.purpose === 'info'"
    :close-on-escape="panel.purpose !== 'required'" :dismiss-on-drag="!panel.purpose || panel.purpose === 'info'">
    <template #title><span aria-hidden="true"><SMotionText :value="panel.title" /></span></template>
    <template v-if="panel.description" #description><SMotionText :value="panel.description" /></template>
    <div class="sy-sheet-switcher" :data-direction="direction">
      <Transition v-for="step in steps" :key="step.id" name="sy-sheet-swap">
        <section v-show="panel.id === step.id" :ref="node => attach(step.id, node)" class="sy-sheet-switcher__step" :data-sheet-step="step.id"
          :aria-label="step.title" :inert="panel.id !== step.id" tabindex="-1">
          <slot :step="step" :activate="activate" :close="close" :active="active?.id === step.id" />
        </section>
      </Transition>
    </div>
    <template v-if="$slots.footer" #footer><slot name="footer" :step="panel" :activate="activate" :close="close" /></template>
  </SSheet>
</template>
