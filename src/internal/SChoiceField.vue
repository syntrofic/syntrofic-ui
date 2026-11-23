<script setup lang="ts">
import { computed, defineComponent, mergeProps, nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import SFieldStatus from '../components/SFieldStatus.vue'
import SInfoTip from '../components/SInfoTip.vue'
import SMotionText from '../components/SMotionText.vue'
import { useTranslator } from '../rac/locale'
import type { ChoiceFieldProps } from '../types'
import { setChoiceValidity } from './choice-validity'
import { joinIds } from './field'
import { onFormReset } from './form-reset'
import { useAnimatedLayout } from './motion'
import { useInputStatusIcon } from './status-icon'
import { useTooltip } from './tooltip'

const props = defineProps<{
  options: ChoiceFieldProps
  kind: 'checkbox' | 'radio' | 'switch'
  input: HTMLInputElement | null
  controlAttrs: Record<string, unknown>
}>()
const emit = defineEmits<{ actionError: [error: unknown] }>()
const translate = useTranslator({ 'choice.optional': 'Optional' })
const id = 'sy-choice-' + useId()
const descriptionId = id + '-description'
const disabledId = id + '-disabled'
const inputId = computed(() => typeof props.controlAttrs.id === 'string' ? props.controlAttrs.id : id)
const pending = shallowRef<AbortController>()
const field = useTemplateRef<HTMLDivElement>('field')
const capture = useAnimatedLayout()
const busy = computed(() => Boolean(props.options.loading || pending.value))
const disabled = computed(() => props.controlAttrs.disabled === '' || Boolean(props.controlAttrs.disabled))
const reason = computed(() => disabled.value ? props.options.disabledMessage : undefined)
const blocked = computed(() => disabled.value || busy.value || Boolean(props.options.readOnly))
const { id: statusId, status, variant, statusIcon, describedBy } = useInputStatusIcon(() => props.options.status)
const error = computed(() => status.value?.type === 'error' ? status.value.message : undefined)
const tooltip = useTooltip(() => ({ delay: 200, hideDelay: 100, isEnabled: Boolean(reason.value) }))
const DisabledTip = defineComponent(() => () => reason.value ? tooltip.renderTooltip(reason.value, { offset: 5 }) : null)
watch([() => props.input, reason], ([element, message]) => tooltip.ref(message ? element : null), { flush: 'post' })
watch([() => props.options.labelPosition, () => props.options.labelSpacing, () => props.options.size, () => props.options.width], () => {
  const row = field.value
  if (!row) return
  const landmarks = row.querySelectorAll<HTMLElement>(':scope > .sy-choice__label, :scope > .sy-switch__track, :scope > .sy-checkbox__box, :scope > .sy-radio__ring')
  const play = capture([row, ...landmarks])
  void nextTick(play)
}, { flush: 'pre' })
watch([() => props.input, error, disabled], ([input, message, unavailable], previous) => {
  if (previous?.[0] && previous[0] !== input) setChoiceValidity(previous[0], 'status')
  if (input) setChoiceValidity(input, 'status', unavailable ? undefined : message)
}, { flush: 'post' })
function cancelChange() {
  pending.value?.abort()
  pending.value = undefined
}
onFormReset(() => props.input ?? field.value?.querySelector('input') ?? null, cancelChange)
onBeforeUnmount(() => {
  cancelChange()
  if (props.input) setChoiceValidity(props.input, 'status')
})

function preventActivation(event: MouseEvent) {
  if (!blocked.value) return
  event.preventDefault()
  event.stopImmediatePropagation()
}

function preventRadioNavigation(event: KeyboardEvent) {
  if (props.kind !== 'radio' || !blocked.value || !event.key.startsWith('Arrow')) return
  event.preventDefault()
  event.stopImmediatePropagation()
}

async function change(event: Event) {
  const action = props.options.changeAction
  const input = event.currentTarget as HTMLInputElement
  if (!action || blocked.value || event.defaultPrevented) return
  const checked = input.checked
  const control = new AbortController()
  pending.value = control
  try {
    const result = action(checked, event, control.signal)
    if (result) await result
  } catch (error) {
    if (!control.signal.aborted) emit('actionError', error)
  } finally {
    if (pending.value === control) pending.value = undefined
  }
}

function attrs() {
  const raw = props.controlAttrs as HTMLAttributes
  return {
    ...mergeProps({ onClickCapture: preventActivation, onKeydownCapture: preventRadioNavigation }, props.controlAttrs, { onChange: change }),
    id: inputId.value,
    disabled: disabled.value && !reason.value || undefined,
    required: !disabled.value && !props.options.readOnly && props.options.required || undefined,
    'aria-busy': busy.value || raw['aria-busy'],
    'aria-disabled': busy.value || Boolean(reason.value) || raw['aria-disabled'],
    'data-choice-disabled': disabled.value || undefined,
    'aria-readonly': props.options.readOnly || raw['aria-readonly'],
    'aria-invalid': status.value?.type === 'error' || raw['aria-invalid'],
    'aria-describedby': joinIds(raw['aria-describedby'], props.options.description && descriptionId, describedBy.value, reason.value && disabledId),
  }
}
</script>

<template>
  <div ref="field" class="sy-choice" :data-kind="kind" :data-size="options.size ?? 'md'" :data-loading="busy || undefined"
    :data-unavailable="disabled || undefined" :data-label-position="options.labelPosition" :data-label-spacing="options.labelSpacing"
    :data-details="Boolean(options.description || status || $slots.end || options.labelTooltip) || undefined"
    :data-status="status?.type" :style="{ inlineSize: typeof options.width === 'number' ? options.width + 'px' : options.width }">
    <slot :attrs="attrs()" :busy="busy" :blocked="blocked" :inactive="disabled || options.readOnly" />
    <label v-if="options.label || $slots.label" :for="inputId" class="sy-choice__label" :class="{ 'sy-visually-hidden': options.hideLabel }">
      <span v-if="$slots.start" class="sy-choice__leading" aria-hidden="true"><slot name="start" /></span><slot name="label">{{ options.label }}</slot>
      <span v-if="options.required && !options.readOnly" class="sy-choice__required" aria-hidden="true">*</span>
      <span v-else-if="options.optional" class="sy-choice__optional" aria-hidden="true">{{ translate('choice.optional') }}</span>
    </label>
    <span v-if="$slots.end || options.labelTooltip || variant === 'tooltip' && statusIcon" class="sy-choice__end">
      <slot name="end" />
      <SInfoTip v-if="options.labelTooltip" :text="options.labelTooltip" />
      <component :is="statusIcon" v-if="variant === 'tooltip' && statusIcon" />
    </span>
    <Transition name="sy-choice-feedback">
      <span v-if="options.description" :id="descriptionId" class="sy-choice__description"><SMotionText :value="options.description" /></span>
    </Transition>
    <Transition name="sy-choice-feedback">
      <SFieldStatus v-if="status && variant !== 'tooltip'" v-bind="status" :id="statusId" class="sy-choice__status" />
    </Transition>
    <span v-if="reason" :id="disabledId" class="sy-visually-hidden">{{ reason }}</span>
    <DisabledTip />
  </div>
</template>
