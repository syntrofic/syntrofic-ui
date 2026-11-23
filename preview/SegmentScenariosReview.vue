<script setup lang="ts">
import { computed, ref } from 'vue'
import { SMotionText, SSegment, type ToggleItem } from '../src'

const views = [
  { value: 'board', label: '看板', icon: 'viewColumns' },
  { value: 'list', label: '列表', icon: 'menu' },
  { value: 'schedule', label: '时间线', icon: 'calendar' },
]
const plain: ToggleItem[] = views.map(({ value, label }) => ({ value, label }))
const report = [
  { value: 'day', label: '每日', icon: 'calendar' },
  { value: 'week', label: '每周', icon: 'book' },
  { value: 'month', label: '每月', icon: 'clock', disabled: true },
]
const view = ref<string | null>('board')
const grouping = ref<string | null>('day')
const description = computed(() => views.find(item => item.value === view.value)?.label ?? '')
</script>

<template>
  <section class="segment-scenarios" aria-label="视图和周期切换">
    <SSegment v-model="view" :items="plain" label="切换任务视图" full-width />
    <div class="review__row">
      <SSegment v-model="view" :items="views" label="视图图标快捷入口" icon-only size="sm" />
      <p role="status" aria-label="当前任务视图"><SMotionText :value="description" /></p>
    </div>
    <SSegment v-model="grouping" :items="report" label="按周期查看交付量" show-separators />
  </section>
</template>

<style scoped>
.segment-scenarios { min-inline-size: 0; display: grid; gap: var(--sy-space-3); }
.segment-scenarios p { margin: 0; }
</style>
