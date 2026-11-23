<script lang="ts">
export interface WizardTask { id: string; title: string; run: (data: FormData, signal: AbortSignal) => string | void | Promise<string | void> }
export interface WizardStep { id: string; title: string; description?: string; tasks?: readonly WizardTask[]; autoSubmit?: boolean }
</script>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, shallowRef, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import SButton from '../components/SButton.vue'
import SForm from '../components/SForm.vue'
import SStepper from '../components/SStepper.vue'
import SFieldError from '../components/SFieldError.vue'
import { useShellMeasurement } from '../internal/shell-layout'

const props = withDefaults(defineProps<{
  steps: readonly WizardStep[]
  label: string
  layout?: 'horizontal' | 'vertical' | 'inline'
  validate?: (step: WizardStep, data: FormData, signal: AbortSignal) => string | void | Promise<string | void>
  validateForwardNavigation?: boolean
  previousLabel?: string
  nextLabel?: string
  finishLabel?: string
  errorLabel?: string
  completeLabel?: string
  pendingLabel?: string
  taskLabel?: string
}>(), { layout: 'horizontal', previousLabel: 'Previous', nextLabel: 'Continue', finishLabel: 'Finish', errorLabel: 'This step could not be saved.',
  completeLabel: 'Complete', pendingLabel: 'Upcoming', taskLabel: 'Step checks' })
const emit = defineEmits<{ finish: [data: ReadonlyMap<string, FormData>]; 'step-change': [step: WizardStep] }>()
const model = defineModel<string>()
const activeIndex = computed(() => Math.max(0, props.steps.findIndex(step => step.id === model.value)))
const active = computed(() => props.steps[activeIndex.value])
const stepper = computed(() => props.steps.map(step => ({ value: step.id, label: step.title, description: step.description })))
const completed = shallowRef<string[]>([])
const pending = shallowRef(false)
const errors = shallowRef<Record<string, string>>({})
const error = computed(() => active.value ? errors.value[active.value.id] : undefined)
const taskStates = shallowRef<Record<string, Record<string, 'running' | 'complete' | 'error'>>>({})
const root = useTemplateRef<HTMLElement>('root')
const heading = shallowRef<HTMLHeadingElement | null>(null)
const form = shallowRef<InstanceType<typeof SForm> | null>(null)
const visited = shallowRef<string[]>([])
const lastReachable = computed(() => {
  const lastVisited = props.steps.findIndex(step => step.id === visited.value.at(-1))
  const limit = props.validateForwardNavigation ? activeIndex.value + 1 : props.steps.length - 1
  return props.steps[Math.min(Math.max(activeIndex.value, lastVisited), limit)]?.id
})
const field = shallowRef<string>()
const width = useShellMeasurement(root, node => node.clientWidth)
const columns = computed(() => props.layout === 'vertical' && (width.value ?? 800) >= 570)
const guidance = computed(() => columns.value && (width.value ?? 800) >= 780)
const data = new Map<string, FormData>()
let controller: AbortController | undefined

function setHeading(node: Element | ComponentPublicInstance | null) {
  heading.value = node && 'tagName' in node && node.tagName === 'H2' ? node as HTMLHeadingElement : null
}
function setForm(node: Element | ComponentPublicInstance | null) {
  form.value = node && 'form' in node ? node as InstanceType<typeof SForm> : null
}

function change(index: number) {
  const step = props.steps[index]
  if (!step || pending.value) return
  model.value = step.id
  emit('step-change', step)
}
function navigate(id: string | undefined) {
  const index = props.steps.findIndex(step => step.id === id)
  if (index < 0 || pending.value) return
  if (index <= activeIndex.value) { change(index); return }
  if (!visited.value.includes(props.steps[index].id)) return
  if (!props.validateForwardNavigation) { change(index); return }
  if (index === activeIndex.value + 1) form.value?.form?.requestSubmit()
}
watch(() => active.value?.id, id => {
  controller?.abort()
  controller = undefined
  pending.value = false
  field.value = undefined
  if (!id) return
  if (!visited.value.includes(id)) visited.value = [...visited.value, id]
  void nextTick(() => {
    if (active.value?.id !== id) return
    heading.value?.focus({ preventScroll: true })
    if (active.value?.autoSubmit && active.value.tasks?.length && !completed.value.includes(id)) form.value?.form?.requestSubmit()
  })
}, { flush: 'post' })
onScopeDispose(() => controller?.abort())

function focus(event: FocusEvent) {
  const node = event.target as HTMLInputElement | null
  if (!node?.matches('input, select, textarea, [role="combobox"]')) return
  field.value = node.getAttribute('name') || node.getAttribute('aria-label') || node.labels?.[0]?.textContent?.trim()
}
function task(step: string, id: string, value: 'running' | 'complete' | 'error') {
  taskStates.value = { ...taskStates.value, [step]: { ...taskStates.value[step], [id]: value } }
}
function fail(id: string, message: string) {
  errors.value = { ...errors.value, [id]: message }
  completed.value = completed.value.filter(value => value !== id)
}

async function submit(_: SubmitEvent, values: FormData) {
  const step = active.value
  if (!step || pending.value) return
  const transaction = new AbortController()
  controller = transaction
  pending.value = true
  errors.value = { ...errors.value, [step.id]: '' }
  taskStates.value = { ...taskStates.value, [step.id]: {} }
  const valid = () => !transaction.signal.aborted && controller === transaction && active.value?.id === step.id
  try {
    const reason = await props.validate?.(step, values, transaction.signal)
    if (!valid()) return
    if (reason) { fail(step.id, reason); return }
    for (const check of step.tasks ?? []) {
      task(step.id, check.id, 'running')
      let failure: string | void
      try { failure = await check.run(values, transaction.signal) } catch { failure = props.errorLabel }
      if (!valid()) return
      task(step.id, check.id, failure ? 'error' : 'complete')
      if (failure) { fail(step.id, failure); return }
    }
  } catch {
    if (valid()) fail(step.id, props.errorLabel)
    return
  } finally {
    if (controller === transaction) {
      controller = undefined
      pending.value = false
    }
  }
  data.set(step.id, values)
  if (!completed.value.includes(step.id)) completed.value = [...completed.value, step.id]
  if (activeIndex.value === props.steps.length - 1) emit('finish', new Map(data))
  else change(activeIndex.value + 1)
}
</script>

<template>
  <section ref="root" class="sy-form-wizard" :data-layout="layout" :data-columns="columns || undefined" :data-guide="guidance && Boolean($slots.guide) || undefined" :aria-label="label">
    <SStepper v-if="active && layout !== 'inline'" class="sy-form-wizard__steps" :label="label" :steps="stepper" :model-value="active.id" :completed="completed"
      :orientation="columns ? 'vertical' : 'horizontal'" :disabled="pending" size="sm" :max-reachable="lastReachable" interactive
      @update:model-value="navigate">
      <template #title="{ step }"><span>{{ step.label }}</span><small v-if="errors[step.value]" class="sy-form-wizard__issue">{{ errors[step.value] }}</small></template>
    </SStepper>
    <template v-if="active">
      <template v-for="(entry, index) in layout === 'inline' ? steps : [active]" :key="entry.id">
        <SForm v-if="entry.id === active.id" :ref="setForm" class="sy-form-wizard__form" :aria-busy="pending" @submit="submit" @focusin="focus">
          <header>
            <h2 :ref="setHeading" tabindex="-1">{{ active.title }}</h2>
            <p v-if="active.description">{{ active.description }}</p>
          </header>
          <slot :step="active" :index="activeIndex" :saved="data.get(active.id)" />
          <ol v-if="active.tasks?.length" class="sy-form-wizard__checks" :aria-label="taskLabel">
            <li v-for="check in active.tasks" :key="check.id" :data-status="taskStates[active.id]?.[check.id]">
              <span aria-hidden="true">{{ taskStates[active.id]?.[check.id] === 'complete' ? '✓' : taskStates[active.id]?.[check.id] === 'error' ? '!' : '○' }}</span>
              {{ check.title }}<span v-if="taskStates[active.id]?.[check.id] === 'complete'" class="sy-visually-hidden">{{ completeLabel }}</span>
            </li>
          </ol>
          <SFieldError v-if="error" role="alert">{{ error }}</SFieldError>
          <footer>
            <SButton v-if="activeIndex > 0" :disabled="pending" variant="secondary" @click="change(activeIndex - 1)">{{ previousLabel }}</SButton>
            <SButton type="submit" :loading="pending">{{ activeIndex === steps.length - 1 ? finishLabel : nextLabel }}</SButton>
          </footer>
        </SForm>
        <div v-else class="sy-form-wizard__collapsed">
          <SButton variant="ghost" size="sm" :disabled="pending || index > activeIndex && (!visited.includes(entry.id) || validateForwardNavigation && index > activeIndex + 1)" @click="navigate(entry.id)">{{ entry.title }}</SButton>
          <small v-if="errors[entry.id]" class="sy-form-wizard__issue">{{ errors[entry.id] }}</small>
          <small v-else-if="completed.includes(entry.id)"><slot name="summary" :step="entry" :saved="data.get(entry.id)">{{ completeLabel }}</slot></small>
          <small v-else>{{ pendingLabel }}</small>
        </div>
      </template>
      <aside v-if="guidance && $slots.guide" class="sy-form-wizard__guide"><slot name="guide" :step="active" :field="field" /></aside>
    </template>
    <slot v-else name="empty" />
  </section>
</template>
