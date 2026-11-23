<script setup lang="ts">
import { h, ref } from 'vue'
import { SButton, SSwitch, useHoverCard } from '../src'

const enabled = ref(true)
const result = ref('')
const preview = useHoverCard(() => ({
  label: '资源预览', placement: 'below', delay: 120, hideDelay: 180, isEnabled: enabled.value, touchTrigger: 'tap',
}))
const View = () => preview.renderHoverCard(() => [
  h('p', '工作室共用的设计资源。'),
  h(SButton, { size: 'sm', variant: 'secondary', onClick: () => { result.value = '已收藏品牌资源' } }, () => '收藏'),
], { offset: 14 })
const { positionRef, interactionRef, isOpen, describedBy } = preview
</script>

<template>
  <div class="review-hover-tools" role="region" aria-label="自定义悬浮预览">
    <div :ref="positionRef" class="review-hover-tools__anchor" data-preview-anchor>
      <SButton :ref="interactionRef" variant="secondary" size="sm" aria-haspopup="dialog"
        :aria-controls="isOpen ? describedBy : undefined" :aria-expanded="isOpen">品牌资源</SButton>
    </div>
    <SSwitch v-model="enabled">启用预览</SSwitch>
    <output>{{ result }}</output>
    <View />
  </div>
</template>

<style scoped>
.review-hover-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-3); }
.review-hover-tools__anchor { display: flex; inline-size: 9rem; max-inline-size: 100%; justify-content: flex-end; }
.review-hover-tools :deep(.sy-hover-card__panel:not([hidden])) { display: grid; justify-items: start; gap: var(--sy-space-2); padding: var(--sy-space-3); }
.review-hover-tools :deep(.sy-hover-card__panel p) { margin: 0; }
</style>
