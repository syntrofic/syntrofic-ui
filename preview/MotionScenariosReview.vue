<script setup lang="ts">
import { ref } from 'vue'
import { SSwitch } from '../src'
import DeckMotionReview from './DeckMotionReview.vue'
import SnapCardMotionReview from './SnapCardMotionReview.vue'
import PanTilesMotionReview from './PanTilesMotionReview.vue'

const rtl = ref(false)
</script>

<template>
  <section class="motion-scenarios" aria-label="拖动、弹回与甩出">
    <h3>拖动、弹回与甩出</h3>
    <PanTilesMotionReview />
    <div class="motion-scenarios__grid">
      <DeckMotionReview api="usePanGesture" />
      <DeckMotionReview api="useAnimator" />
      <DeckMotionReview api="createAnimator" />
    </div>
  </section>
  <section class="motion-scenarios" aria-label="吸附卡片">
    <h3>吸附卡片</h3>
    <SSwitch v-model="rtl" label="从右往左排列卡片" />
    <div class="motion-scenarios__grid">
      <SnapCardMotionReview api="useDragToSnapPoints" :direction="rtl ? 'rtl' : 'ltr'" />
      <SnapCardMotionReview api="createDragToSnapPoints" :direction="rtl ? 'rtl' : 'ltr'" />
    </div>
  </section>
</template>

<style scoped>
.motion-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.motion-scenarios h3 { font-size: 1rem; margin: 0; }
.motion-scenarios__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr)); gap: var(--sy-space-3); }
</style>
