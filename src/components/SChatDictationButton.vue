<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSpeechRecognition, type SpeechRecognitionControls } from '../internal/speech'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  locale?: string
  label?: string
  stopLabel?: string
  unavailableLabel?: string
  disabled?: boolean
  continuous?: boolean
  size?: 'sm' | 'md'
  hideWhenUnsupported?: boolean
  meter?: boolean
  dictation?: Pick<SpeechRecognitionControls, 'state' | 'supported' | 'bands' | 'isSpeaking' | 'start' | 'stop'>
}>(), { label: 'Start dictation', stopLabel: 'Stop dictation', unavailableLabel: 'Dictation is unavailable', size: 'md', hideWhenUnsupported: true, meter: true })
const emit = defineEmits<{ transcript: [text: string, final: boolean]; error: [code: string]; 'listening-change': [listening: boolean] }>()
const local = useSpeechRecognition({
  locale: () => props.locale, continuous: () => props.continuous, measureAudio: () => props.meter && !props.disabled,
  onTranscript: (text, final) => emit('transcript', text, final), onError: code => emit('error', code),
})
const recognition = computed(() => props.dictation ?? local)
const state = computed(() => recognition.value.state.value)
const supported = computed(() => recognition.value.supported.value)
const listening = computed(() => state.value === 'listening' || state.value === 'stopping')
const audioLevels = computed(() => recognition.value.bands.value)
watch(listening, value => emit('listening-change', value))
watch(() => props.disabled, disabled => { if (disabled && !props.dictation && state.value !== 'idle') local.abort() })
function toggle() {
  if (props.disabled) return
  if (state.value === 'listening') recognition.value.stop()
  else recognition.value.start()
}
</script>

<template>
  <SButton v-if="supported || !hideWhenUnsupported" :size="size" variant="ghost" class="sy-dictation-button"
    :aria-label="!supported ? unavailableLabel : listening ? stopLabel : label"
    :data-speaking="listening && recognition.isSpeaking.value || undefined"
    :aria-pressed="listening" :loading="state === 'starting' || state === 'stopping'"
    :disabled="disabled || !supported" @click="toggle">
    <span class="sy-dictation-button__visual" aria-hidden="true">
      <Transition name="sy-chat-control">
        <span v-if="listening && meter" class="sy-dictation-button__meter">
          <span v-for="(level, index) in audioLevels" :key="index" :style="{ '--sy-dictation-level': level }" />
        </span>
        <SIcon v-else :key="listening ? 'stop' : 'microphone'" :name="listening ? 'stop' : 'microphone'" :size="18" />
      </Transition>
    </span>
  </SButton>
</template>
