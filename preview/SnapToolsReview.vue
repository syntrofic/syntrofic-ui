<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, useDragToSnapPoints } from '../src'

const target = useTemplateRef<HTMLElement>('target')
const expanded = ref(false)
const vertical = ref(false)
const status = ref('')
const { settleTo } = useDragToSnapPoints(target, () => ({
  axis: vertical.value ? 'y' : 'x',
  snapPoints: expanded.value ? [128, 0, 64] : [96, 0, 48],
  onSettle: index => { status.value = `${expanded.value ? '宽间距' : '标准间距'} · 位置 ${index + 1}` },
}))
</script>

<template>
  <section class="review__stack" aria-label="像素吸附工具">
    <div class="snap-tools-review__track">
      <div ref="target" class="snap-tools-review__target" aria-label="拖动指示块" role="img">↔</div>
    </div>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="settleTo(1)">吸附中位</SButton>
      <SButton size="sm" variant="secondary" @click="settleTo(2)">吸附末位</SButton>
      <SButton size="sm" variant="ghost" @click="expanded = !expanded">调整吸附间距</SButton>
      <SButton size="sm" variant="ghost" @click="vertical = !vertical">切换拖动方向</SButton>
    </div>
    <output>{{ status }}</output>
  </section>
</template>

<style scoped>
.snap-tools-review__track {
  min-inline-size: 0;
  min-block-size: 176px;
  padding: 8px;
  border-radius: var(--sy-radius-md);
  background: var(--sy-surface-muted);
}
.snap-tools-review__target {
  display: grid;
  inline-size: 44px;
  block-size: 32px;
  place-items: center;
  touch-action: none;
  user-select: none;
  cursor: grab;
  border-radius: var(--sy-radius-pill);
  background: var(--sy-accent-soft);
  color: var(--sy-accent);
}
</style>
