<script setup lang="ts">
import { computed, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import { SButton, SCard, SDialog, SSwitch, SMotionText, useAnnounce, useClipboard, useHotkeys } from '../src'

const query = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const topics = ['品牌手册', '品牌图形', '交付清单', '图标资源', '发布日志']
const matches = computed(() => topics.filter(topic => topic.includes(query.value.trim())))
const countLabel = computed(() => matches.value.length ? matches.value.length + ' 项匹配' : '无匹配结果')
const announceResults = useAnnounce(input)
watch(query, (_, __, cleanup) => {
  const timer = setTimeout(() => announceResults(countLabel.value), 500)
  cleanup(() => clearTimeout(timer))
})

const shortcuts = ref(true)
const help = ref(false)
const focusFilter = (event: KeyboardEvent) => { event.preventDefault(); input.value?.focus() }
const showHelp = (event: KeyboardEvent) => { event.preventDefault(); help.value = true }
useHotkeys(() => shortcuts.value && !help.value ? [
  { key: '/', handler: focusFilter },
  { key: '?', shift: true, handler: showHelp },
  { key: '?', handler: showHelp },
] : [])

const share = useTemplateRef<HTMLElement>('share')
const clipboard = useClipboard(share)
const shareState = clipboard.state
const announceShare = useAnnounce(share)
let resetTimer: ReturnType<typeof setTimeout> | undefined
let attempt = 0
const invite = 'https://syntrofic.example/review/brand'
async function copyInvite() {
  const id = ++attempt
  clearTimeout(resetTimer)
  const copied = await clipboard.copy(invite)
  if (id !== attempt) return
  announceShare(copied ? '邀请链接已复制' : '复制失败，可以选中链接手动复制')
  resetTimer = setTimeout(clipboard.reset, 1600)
}
onScopeDispose(() => { attempt++; clearTimeout(resetTimer) })
</script>

<template>
  <section class="interaction-hooks" aria-label="资料筛选与全局快捷键">
    <label class="interaction-hooks__filter">
      搜索品牌资料
      <input ref="input" v-model="query" type="search" class="sy-field__control" aria-keyshortcuts="/" />
    </label>
    <p class="interaction-hooks__count"><SMotionText :value="countLabel" /></p>
    <ul role="list" aria-label="筛选到的资料">
      <TransitionGroup name="interaction-topic">
        <li v-for="topic in matches" :key="topic">{{ topic }}</li>
      </TransitionGroup>
    </ul>
    <div class="review__row">
      <SSwitch v-model="shortcuts" label="启用单键快捷键" />
      <SButton size="sm" variant="secondary" aria-keyshortcuts="?" @click="help = true">查看快捷键</SButton>
    </div>
    <SDialog v-model:open="help" title="资料筛选快捷键" dismiss-label="关闭快捷键" show-close-button>
      <dl><div><dt><kbd>/</kbd></dt><dd>聚焦搜索</dd></div><div><dt><kbd>?</kbd></dt><dd>打开快捷键帮助</dd></div></dl>
    </SDialog>
  </section>
  <section ref="share" class="interaction-hooks" aria-label="分享复核邀请">
    <SCard>
      <template #header><strong>复核邀请</strong></template>
      <code class="interaction-hooks__address">{{ invite }}</code>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="copyInvite">
          <SMotionText :value="shareState === 'copied' ? '已复制链接' : shareState === 'error' ? '重试复制链接' : '复制邀请链接'" />
        </SButton>
      </template>
    </SCard>
  </section>
</template>

<style scoped>
.interaction-hooks, .interaction-hooks__filter { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.interaction-hooks__filter { max-inline-size: 24rem; }
.interaction-hooks__filter input { min-inline-size: 0; }
.interaction-hooks__count { margin: 0; color: var(--sy-text-muted); }
.interaction-hooks ul { position: relative; display: flex; flex-wrap: wrap; gap: var(--sy-space-2); margin: 0; padding: 0; list-style: none; }
.interaction-hooks li { padding: .25rem .5rem; border-radius: var(--sy-radius-sm); background: var(--sy-surface-muted); }
.interaction-topic-enter-active, .interaction-topic-leave-active, .interaction-topic-move {
  transition: transform var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle);
}
.interaction-topic-enter-from, .interaction-topic-leave-to { transform: translateY(5px); opacity: 0; }
.interaction-topic-leave-active { pointer-events: none; }
.interaction-hooks__address { overflow-wrap: anywhere; }
</style>
