<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { SButton, glideOf, holdLayoutSwap, playLayoutSwap, reportLayoutChange, useAnimatedLayout } from '../src'

const scope = useTemplateRef<HTMLElement>('scope')
const first = useTemplateRef<HTMLElement>('first')
const second = useTemplateRef<HTMLElement>('second')
const last = useTemplateRef<HTMLElement>('last')
const scroller = useTemplateRef<HTMLElement>('scroller')
const expanded = ref(false)
const measured = ref('')
const layout = useAnimatedLayout({ scope })
const changes = [reportLayoutChange(layout, first), reportLayoutChange(layout, second)]
const trailingScroll = ref<string>()
let swap: ReturnType<typeof playLayoutSwap>
let revision = 0
function cancelSwap() {
  swap?.incoming.cancel()
  swap?.outgoing.cancel()
  swap?.edge?.cancel()
  swap = undefined
}
onBeforeUnmount(() => { revision++; cancelSwap() })
async function toggle() {
  const current = ++revision
  const snapshot = first.value && holdLayoutSwap(first.value)
  cancelSwap()
  for (const change of changes) change.measureBefore()
  expanded.value = !expanded.value
  await nextTick()
  if (current !== revision) { snapshot?.dispose(); return }
  for (const change of changes) change.animate()
  queueMicrotask(() => {
    if (current !== revision) { snapshot?.dispose(); return }
    if (snapshot) swap = playLayoutSwap(snapshot, first.value, { edge: 'block-end', anchor: last.value ?? undefined })
    const glide = last.value && glideOf(last.value)
    const effects = [glide, swap?.incoming, swap?.outgoing, swap?.edge].filter(effect => effect != null)
    measured.value = effects.length ? '正在滑动' : '已更新位置'
    if (effects.length) void Promise.allSettled(effects.map(effect => effect.finished)).then(() => {
      if (current === revision) measured.value = '已更新位置'
    })
  })
}
function finish() {
  revision++
  cancelSwap()
  layout.dispose()
  measured.value = '已更新位置'
}
function scrollWithoutLayoutChange() {
  if (!scroller.value || !last.value) return
  const play = layout([last.value])
  scroller.value.scrollTop = scroller.value.scrollTop ? 0 : 32
  play()
  trailingScroll.value = glideOf(last.value) ? '滑动' : '仅滚动'
}
</script>

<template>
  <section class="review__stack" aria-label="布局变化">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-expanded="expanded" @click="toggle">切换两处内容</SButton>
      <SButton size="sm" variant="ghost" @click="finish">完成移动</SButton>
      <SButton size="sm" variant="ghost" @click="scrollWithoutLayoutChange">滚动列表</SButton>
    </div>
    <div ref="scroller" class="layout-tools-review__scroller">
      <div ref="scope" class="layout-tools-review" :style="{ '--sy-motion-tempo': '1.5' }">
        <div ref="first" data-layout-swap-next>调研<span v-if="expanded">核对访谈记录和品牌资产</span></div>
        <div>
          <div ref="second">评审<span v-if="expanded">汇总反馈与交付安排</span></div>
        </div>
        <div ref="last" data-layout-trailing>发布</div>
        <div>交付</div>
      </div>
    </div>
    <output><span v-if="measured" :key="measured" class="layout-tools-review__status">{{ measured }}</span></output>
    <output v-if="trailingScroll" data-scroll-result>{{ trailingScroll }}</output>
  </section>
</template>

<style scoped>
.layout-tools-review { display: grid; gap: var(--sy-space-2); }
.layout-tools-review__scroller { max-height: 7rem; overflow: auto; }
.layout-tools-review > div {
  display: grid;
  gap: var(--sy-space-1);
  padding: var(--sy-space-2) var(--sy-space-3);
  border-radius: var(--sy-radius-sm);
  background: var(--sy-surface);
}
.layout-tools-review > div > div { display: grid; }
.layout-tools-review span { display: block; font-size: .84rem; color: var(--sy-text-muted); }
@media (prefers-reduced-motion: no-preference) {
  .layout-tools-review__status {
    display: inline-block;
    animation: layout-tools-status-in var(--sy-motion-replace) var(--sy-ease-settle) both;
  }
}
@keyframes layout-tools-status-in { from { opacity: .5; translate: 0 3px; } }
</style>
