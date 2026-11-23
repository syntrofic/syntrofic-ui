<script setup lang="ts">
import { onScopeDispose, useTemplateRef } from 'vue'
import { SBadge, SBrandTheme, SButton, applyBrandPatch, createAnimator, createBrandTheme, resolveMotionSpring, useAnimator } from '../src'

const theme = applyBrandPatch(createBrandTheme('motion-example', '工作室动效'), {
  revision: 0,
  changes: [{ type: 'part', key: 'button-secondary', value: { background: '#e0ebe1', radius: 11 } },
  { type: 'part', key: 'badge', value: { foreground: '#425849' } }, {
    type: 'settings',
    value: { motion: {
      tempo: 1.25,
      timings: { move: { duration: 310, curve: [.18, .72, .29, 1] } },
      springs: { stateChange: { mass: 1, stiffness: 190, damping: 24 } },
    } },
  }],
})
const nested = createBrandTheme('theme-nested', '默认部件')
const marker = useTemplateRef<HTMLElement>('marker')
const spring = useAnimator(marker)
let animator: ReturnType<typeof createAnimator> | undefined
function play() {
  const element = marker.value
  if (!element) return
  animator ??= createAnimator(element)
  const settings = resolveMotionSpring(element, 'stateChange')
  element.dataset.spring = [settings.mass, settings.stiffness, settings.damping].join(',')
  spring.set({ x: 0 })
  void spring.animate({ x: 54 }, { spring: 'stateChange' })
  animator.animate('appearance', [{ opacity: .4 }, { opacity: 1 }], { role: 'move' })
}
onScopeDispose(() => animator?.dispose())
</script>

<template>
  <SBrandTheme :theme="theme" class="review__row" role="region" aria-label="品牌动效">
    <SButton variant="secondary" size="sm" @click="play">播放品牌过渡</SButton>
    <span class="motion-theme-review__track">
      <span ref="marker" class="motion-theme-review__marker" data-brand-motion-marker aria-hidden="true" />
    </span>
    <SBadge data-theme-demo-badge tone="success">已发布</SBadge>
    <SBrandTheme :theme="nested">
      <SButton variant="secondary" size="sm">默认次级按钮</SButton>
    </SBrandTheme>
  </SBrandTheme>
</template>

<style scoped>
.motion-theme-review__track {
  display: inline-flex;
  align-items: center;
  width: 7rem;
  height: 2rem;
  padding-inline: 7px;
  background: var(--sy-surface);
  border-radius: var(--sy-radius-pill);
}
.motion-theme-review__marker {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--sy-accent);
}
</style>
