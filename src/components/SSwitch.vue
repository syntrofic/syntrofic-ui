<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useChoice } from '../internal/choice-group'
import { rubberBandClamp } from '../internal/motion-physics'
import { createPanGesture } from '../internal/pan-gesture'
import SChoiceField from '../internal/SChoiceField.vue'
import SSpinner from './SSpinner.vue'
import type { ChoiceFieldProps } from '../types'

defineOptions({ inheritAttrs: false })

const props = defineProps<ChoiceFieldProps & { value?: string | number; name?: string }>()
const emit = defineEmits<{ actionError: [error: unknown] }>()
const model = defineModel<boolean>()
const { input, checked, name, defaultChecked, options, controlAttrs } = useChoice('switch', props, model)
const track = useTemplateRef<HTMLSpanElement>('track')
const travel = computed(() => options.value.size === 'sm' ? 12 : 15)
const offset = ref<number>()
const preview = ref<boolean>()
let ignoreClick = false

watch(input, (node, _, cleanup) => {
  if (!node) return
  let start = 0
  let direction = 1
  let origin = 0
  function projected(x: number) { return start + x * direction }
  cleanup(createPanGesture(node, {
    axis: 'horizontal',
    threshold: 5,
    shouldStart(event) {
      const rect = track.value?.getBoundingClientRect()
      if (!rect || node.matches(':disabled,[aria-disabled="true"],[aria-readonly="true"]')) return false
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
      if (inside) origin = event.clientX
      return inside
    },
    onStart() {
      start = checked.value ? travel.value : 0
      direction = track.value?.matches(':dir(rtl)') ? -1 : 1
    },
    onMove({ x }) {
      const position = projected(x)
      offset.value = rubberBandClamp(position, 0, travel.value, 8)
      preview.value = position >= travel.value / 2
    },
    onEnd(_, event, cancelled) {
      offset.value = undefined
      preview.value = undefined
      if (cancelled || node.matches(':disabled,[aria-disabled="true"],[aria-readonly="true"]')) return
      ignoreClick = true
      if ((projected(event.clientX - origin) >= travel.value / 2) !== checked.value) node.click()
    },
  }))
}, { flush: 'post' })

function pointerDown(event: PointerEvent) {
  if (event.isPrimary) ignoreClick = false
}
function pointerClick(event: MouseEvent) {
  if (!event.isTrusted || event.detail <= 0 || !ignoreClick) return
  event.preventDefault()
  event.stopImmediatePropagation()
}
</script>

<template>
  <SChoiceField kind="switch" :options="options" :input="input" :control-attrs="controlAttrs()" @action-error="emit('actionError', $event)">
    <template #default="{ attrs, busy, inactive }">
      <input ref="input" v-bind="attrs" v-model="checked" class="sy-choice__input" type="checkbox" role="switch"
        :name="inactive && options.disabledMessage ? undefined : name" :value="value ?? 'on'" :defaultChecked.prop="defaultChecked"
        @pointerdown="pointerDown" @click.capture="pointerClick" />
      <span ref="track" class="sy-switch__track" :data-size="options.size ?? 'md'" aria-hidden="true" :data-dragging="offset !== undefined || undefined"
        :data-preview="preview" :style="offset === undefined ? undefined : { '--sy-switch-offset': offset + 'px' }">
        <span class="sy-switch__thumb"><Transition name="sy-choice-spinner"><SSpinner v-if="busy" size="sm" decorative /></Transition></span>
      </span>
    </template>
    <template v-if="$slots.default" #label><slot /></template>
    <template v-if="$slots.start" #start><slot name="start" /></template>
    <template v-if="$slots.end" #end><slot name="end" /></template>
  </SChoiceField>
</template>
