<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SMotionText from './SMotionText.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  name?: string
  length?: number
  splitAt?: number
  mode?: 'numeric' | 'alphanumeric'
  mask?: boolean
  readonly?: boolean
}>(), { length: 6, mode: 'numeric' })
const value = defineModel<string>()
const emit = defineEmits<{ complete: [code: string] }>()
const initial = value.value
const input = useTemplateRef<HTMLInputElement>('input')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-otp')
const length = computed(() => Number.isFinite(props.length) ? Math.max(1, Math.floor(props.length)) : 6)
const pattern = computed(() => props.mode === 'numeric' ? '[0-9]' : '[a-zA-Z0-9]')
const code = computed(() => normalize(value.value ?? ''))
const cells = computed(() => Array.from({ length: length.value }, (_, index) => code.value[index]))
const caret = ref(0)
const activeCell = computed(() => Math.min(caret.value, length.value - 1))

function normalize(source: string) {
  return (source.normalize('NFKC').match(new RegExp(pattern.value, 'g')) ?? []).join('').slice(0, length.value)
}

function syncCaret() {
  caret.value = input.value?.selectionStart ?? 0
}

function clickCell(event: MouseEvent) {
  const element = input.value
  if (!element || event.detail !== 1 || event.shiftKey || element.selectionStart !== element.selectionEnd) return
  const cells = [...(element.parentElement?.querySelectorAll('.sy-otp__cell') ?? [])]
  const index = cells.findIndex(cell => {
    const { left, right } = cell.getBoundingClientRect()
    return event.clientX >= left && event.clientX <= right
  })
  if (index < 0) return
  const position = Math.min(index, code.value.length)
  element.setSelectionRange(position, position)
  syncCaret()
}

function update(event: Event) {
  if ((event as InputEvent).isComposing) return
  const element = event.target as HTMLInputElement
  const next = normalize(element.value)
  if (element.value !== next) {
    const position = normalize(element.value.slice(0, element.selectionStart ?? undefined)).length
    element.value = next
    element.setSelectionRange(position, position)
  }
  value.value = next
  syncCaret()
}

watch(code, (next, previous) => {
  if (next.length === length.value && next !== previous) emit('complete', next)
})
onFormReset(() => input.value, () => { value.value = initial })
</script>

<template>
  <div class="sy-field" :data-invalid="invalid">
    <SLabel v-if="label" :for="id">{{ label }}</SLabel>
    <div class="sy-otp" :data-disabled="disabled || undefined">
      <div
        class="sy-otp__cells"
        aria-hidden="true"
        :style="{
          '--sy-otp-count': length,
          '--sy-otp-active': activeCell,
          '--sy-otp-active-split': activeCell === splitAt ? '4px' : '0px',
        }"
      >
        <div
          v-for="(character, index) in cells"
          :key="index"
          class="sy-otp__cell"
          :data-filled="Boolean(character) || undefined"
          :data-split="index === splitAt || undefined"
        ><SMotionText :value="character ? (mask ? '•' : character) : ' '" motion="roll" /></div>
      </div>
      <input
        ref="input"
        v-bind="controlAttrs()"
        :id="id"
        :name="name"
        :value="code"
        :defaultValue.prop="normalize(initial ?? '')"
        class="sy-otp__input"
        :type="mask ? 'password' : 'text'"
        :inputmode="mode === 'numeric' ? 'numeric' : 'text'"
        :pattern="`${pattern}{${length}}`"
        autocomplete="one-time-code"
        autocapitalize="off"
        spellcheck="false"
        :readonly="readonly"
        :disabled="disabled"
        :required="required"
        @input="update"
        @compositionend="update"
        @focus="syncCaret"
        @select="syncCaret"
        @keyup="syncCaret"
        @click="clickCell"
      />
    </div>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
