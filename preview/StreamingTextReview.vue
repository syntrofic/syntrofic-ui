<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { SButton, SCard, useStreamingText, type StreamingTextSpeed } from '../src'

const first = '核对交付 👩🏽‍💻，记录状态。'.repeat(42)
const second = '更新成果 👨‍👩‍👧‍👦，保留历史。'.repeat(24)
const text = ref('')
const running = ref(false)
const speed = ref<StreamingTextSpeed>('natural')
const shown = useStreamingText(text, running, () => ({ speed: speed.value }))
function begin(value: string) {
  running.value = true
  text.value = value
}
const chunks = ['复核已完成。', ' 交付包包含组件说明、图标与浅色主题。', ' 请核对发布范围后归档。']
const incoming = ref('')
const responding = ref(false)
const reply = useStreamingText(incoming, responding)
let timer: ReturnType<typeof setTimeout> | undefined
function regenerate() {
  clearTimeout(timer)
  responding.value = true
  incoming.value = ''
  let next = 0
  function deliver() {
    if (next === chunks.length) { responding.value = false; return }
    incoming.value += chunks[next++]
    timer = setTimeout(deliver, 320)
  }
  timer = setTimeout(deliver, 120)
}
onScopeDispose(() => clearTimeout(timer))
</script>

<template>
  <section class="review__stack streaming-review" aria-label="流式文字">
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="begin(first)">发送文字流</SButton>
      <SButton size="sm" variant="secondary" @click="begin(second)">更换文字流</SButton>
      <SButton size="sm" variant="ghost" @click="running = false">结束文字流</SButton>
      <label>播放速度
        <select v-model="speed"><option value="natural">正常</option><option value="fast">快速</option><option value="instant">即时</option></select>
      </label>
    </div>
    <p class="streaming-review__text" :aria-busy="running" aria-label="文字流内容">{{ shown }}</p>
  </section>
  <section class="review__stack streaming-review" aria-label="可重新生成的流式回复">
    <SCard>
      <template #header><strong>交付复核回复</strong></template>
      <p class="streaming-review__reply" :aria-busy="responding || undefined" aria-label="回复正文">{{ reply }}</p>
      <span class="sy-visually-hidden" aria-live="polite">{{ responding ? '' : reply }}</span>
      <template #footer><SButton size="sm" variant="secondary" @click="regenerate">重新生成回复</SButton></template>
    </SCard>
  </section>
</template>

<style scoped>
.streaming-review__text {
  min-block-size: 6em;
  max-block-size: 8em;
  margin: 0;
  overflow: auto;
  overflow-wrap: anywhere;
  padding: 8px 10px;
  border-radius: var(--sy-radius-sm);
  background: var(--sy-surface-muted);
}
.streaming-review__reply { margin: 0; min-block-size: 3.5em; overflow-wrap: anywhere; }
</style>
