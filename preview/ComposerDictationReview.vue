<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import {
  SButton, SChatComposerInput, SChatDictationButton, SMotionText, SPromptInput, SSegment, useChatDictation, useSpeechRecognition,
} from '../src'

defineProps<{ includeStates?: boolean }>()
const input = useTemplateRef<InstanceType<typeof SChatComposerInput>>('input')
const message = ref('')
const result = ref('')
const sent = ref('')
const voice = useChatDictation({
  lang: 'zh-CN', inputRef: input, transformTranscript: text => text.trim(),
  onResult(text) { result.value = text },
  onRecognitionError(error) { result.value = error.error },
})
const states = [
  { value: 'idle', label: '待命' }, { value: 'listening', label: '正在听' }, { value: 'speaking', label: '检测到声音' },
]
const sample = ref<string | null>('idle')
const exampleVoice = {
  supported: computed(() => true),
  state: computed(() => sample.value === 'idle' ? 'idle' as const : 'listening' as const),
  isSpeaking: computed(() => sample.value === 'speaking'),
  bands: computed(() => sample.value === 'speaking' ? [.35, .6, .95, .72, .4] : [.16, .27, .21, .31, .17]),
  start() { sample.value = 'listening'; return true },
  stop() { sample.value = 'idle' },
}
const voiceStatus = computed(() => !voice.supported.value ? '当前浏览器无法听写' : voice.isSpeaking.value ? '检测到声音'
  : ({ starting: '正在连接麦克风', listening: '正在听写', stopping: '正在收尾', idle: '听写待命' })[voice.state.value])
const plainTranscript = ref('')
const speech = useSpeechRecognition({
  lang: 'zh-CN', measureAudio: false,
  transformTranscript: text => text.trim(),
  onResult: text => { plainTranscript.value = [plainTranscript.value, text].filter(Boolean).join(' ') },
})
const speechText = computed(() => [plainTranscript.value, speech.interimTranscript.value].filter(Boolean).join(' '))
</script>

<template>
  <section class="review__stack" aria-label="在消息编辑器中听写">
    <SPromptInput v-model="message" label="听写草稿" :labels="{ send: '发送听写草稿' }" :allow-attachments="false"
      :get-input-segments="() => input?.getSegments()" @submit="payload => sent = payload.text">
      <template #input="{ value, update, send, label, disabled, readonly, invalid, describedBy }">
        <SChatComposerInput ref="input" :model-value="value" :label="label" placeholder="输入消息或使用听写"
          :disabled="disabled" :readonly="readonly" :invalid="invalid" :described-by="describedBy"
          @update:model-value="update" @submit="send" />
      </template>
      <template #sendActions>
        <SChatDictationButton :dictation="voice" :hide-when-unsupported="false"
          label="在编辑器中开始听写" stop-label="在编辑器中停止听写" unavailable-label="编辑器听写不可用" />
      </template>
      <template #footer>
        <p class="composer-dictation-review__status"><SMotionText :value="voiceStatus" announce /></p>
      </template>
    </SPromptInput>
    <output aria-label="听写结果">{{ result }}</output>
    <output v-if="sent" aria-label="听写草稿发送结果"><SMotionText :value="sent" wrap /></output>
  </section>
  <section class="review__stack" aria-label="独立语音识别">
    <SButton size="sm" variant="secondary" :disabled="!speech.supported.value" :aria-pressed="speech.isListening.value" @click="speech.toggle">
      <SMotionText :value="!speech.supported.value ? '语音识别不可用' : speech.isListening.value ? '暂停语音识别' : '启动语音识别'" />
    </SButton>
    <output aria-label="语音实时转写"><SMotionText :value="speechText" wrap /></output>
  </section>
  <section v-if="includeStates" class="review__stack" aria-label="听写尺寸与状态预览">
    <h3>听写尺寸与状态</h3>
    <SSegment v-model="sample" label="模拟听写状态" :items="states" />
    <div class="review__row">
      <SChatDictationButton :dictation="exampleVoice" size="sm" label="小号开始听写" stop-label="小号停止听写" />
      <SChatDictationButton :dictation="exampleVoice" size="md" label="中号开始听写" stop-label="中号停止听写" />
      <output aria-label="模拟听写状态说明"><SMotionText :value="states.find(item => item.value === sample)?.label ?? ''" /></output>
    </div>
  </section>
</template>

<style scoped>
h3, .composer-dictation-review__status { margin: 0; }
.composer-dictation-review__status { color: var(--sy-text-muted); font-size: .85rem; }
</style>
