<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { SButton, SChatComposerInput, SInput, SMotionText, SNumberField, SScrollableArea, STextArea } from '../src'

const open = ref(false)
const launcher = useTemplateRef<HTMLDivElement>('launcher')
const recipient = ref('')
const message = ref('')
const sent = ref('')

function send() {
  const text = message.value.trim()
  if (!text) return
  sent.value = recipient.value.trim() ? `${recipient.value.trim()} · ${text}` : text
  message.value = ''
}
function close() {
  open.value = false
  void nextTick(() => launcher.value?.querySelector('button')?.focus({ preventScroll: true }))
}
</script>

<template>
  <SScrollableArea class="keyboard-reveal-review" role="region" label="软键盘避让表单" :height="224" :padding="2" overscroll="contain">
    <div class="keyboard-reveal-review__fields">
      <SInput label="交付标题" />
      <SNumberField label="交付份数" :min="1" integer-only />
      <STextArea label="交付说明" />
      <SInput label="接收邮箱" type="email" />
      <SInput label="复核人" />
    </div>
  </SScrollableArea>
  <div ref="launcher">
    <SButton size="sm" variant="secondary" :aria-expanded="open" @click="open = true">打开底部消息输入区</SButton>
  </div>
  <Teleport to="body">
    <Transition name="keyboard-review-dock">
      <section v-if="open" class="keyboard-review-dock" aria-label="底部消息输入区" @keydown.esc="close">
        <SInput v-model="recipient" label="接收人" />
        <SChatComposerInput v-model="message" label="交付消息" :max-rows="2" @submit="send" />
        <div class="keyboard-review-dock__actions">
          <output><SMotionText :value="sent" truncate /></output>
          <SButton size="sm" variant="ghost" @click="close">关闭</SButton>
          <SButton size="sm" :disabled="!message.trim()" @click="send">发送</SButton>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.keyboard-reveal-review {
  inline-size: min(100%, 24rem);
  background: var(--sy-surface-subtle);
  border-radius: var(--sy-radius-md);
}
.keyboard-reveal-review__fields { display: grid; gap: var(--sy-space-3); }
.keyboard-review-dock {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  gap: var(--sy-space-2);
  box-sizing: border-box;
  inline-size: min(100% - 1rem, 30rem);
  margin-inline: auto;
  padding: var(--sy-inset);
  border-start-start-radius: var(--sy-radius-md);
  border-start-end-radius: var(--sy-radius-md);
  background: var(--sy-surface-subtle);
  color: var(--sy-text);
  box-shadow: var(--sy-shadow-med);
}
.keyboard-review-dock__actions { display: flex; align-items: center; gap: var(--sy-space-2); }
.keyboard-review-dock__actions output { flex: 1; min-inline-size: 0; }
.keyboard-review-dock-enter-active, .keyboard-review-dock-leave-active { transition: opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.keyboard-review-dock-enter-from, .keyboard-review-dock-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .keyboard-review-dock-enter-active, .keyboard-review-dock-leave-active { transition: none; }
}
</style>
