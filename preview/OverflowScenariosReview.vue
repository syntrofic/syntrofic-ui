<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SMotionText, SOverflowList, SSwitch, type AnnotationTone } from '../src'

const actions = [
  { id: 'scan', label: '核对文件' }, { id: 'name', label: '整理名称' }, { id: 'pack', label: '打包交付' },
  { id: 'log', label: '查看日志' }, { id: 'history', label: '查看历史' }, { id: 'backup', label: '保留副本' },
]
const versions = Array.from({ length: 6 }, (_, index) => ({ id: 'r' + index, label: '发布批次 ' + (index + 1) }))
const categories = [
  { id: 'labels', label: '资源命名', tone: 'blue' }, { id: 'review', label: '交付复核', tone: 'orange' },
  { id: 'assets', label: '交互资料', tone: 'purple' }, { id: 'logs', label: '归档日志', tone: 'teal' },
  { id: 'apply', label: '访问申请', tone: 'pink' }, { id: 'history', label: '历史规范', tone: 'gray' },
  { id: 'access', label: '权限设置', tone: 'red' }, { id: 'design', label: '设计系统', tone: 'green' },
] satisfies { id: string; label: string; tone: AnnotationTone }[]
const narrow = ref(true)
const result = ref('')
const hidden = ref(0)
const message = computed(() => result.value ? '已选择' + result.value : '')
</script>

<template>
  <section class="overflow-scenarios" aria-label="工具栏和标签溢出">
    <SOverflowList :items="actions" label="受限工具栏" more-label="其余交付操作" :max-visible-items="3"
      presentation="menu" @select="result = $event.label">
      <template #item="{ item }"><SButton size="sm" variant="secondary" @click="result = item.label">{{ item.label }}</SButton></template>
      <template #indicator="{ count }"><SMotionText :value="'+' + count" motion="roll" /></template>
    </SOverflowList>
    <SOverflowList :items="versions" label="最近发布批次" more-label="较早的发布批次" collapse-from="start" :max-visible-items="2"
      presentation="menu" @select="result = $event.label">
      <template #item="{ item }"><SButton size="sm" variant="secondary" @click="result = item.label">{{ item.label }}</SButton></template>
    </SOverflowList>
    <p role="status" aria-label="溢出操作结果"><SMotionText :value="message" /></p>
    <SSwitch v-model="narrow">缩窄分类栏</SSwitch>
    <div class="overflow-scenarios__resize" :data-narrow="narrow || undefined">
      <SOverflowList :items="categories" label="分类徽标" more-label="另有分类" presentation="count"
        @overflow-change="hidden = $event.length">
        <template #item="{ item }"><SBadge :tone="item.tone" :label="item.label" /></template>
      </SOverflowList>
      <SOverflowList :items="categories" label="双行分类标签" more-label="另有标签" presentation="count" :max-rows="2">
        <template #item="{ item }"><SBadge :tone="item.tone" :label="item.label" /></template>
      </SOverflowList>
    </div>
    <output aria-label="隐藏分类数量"><SMotionText :value="String(hidden)" motion="roll" /></output>
  </section>
</template>

<style scoped>
.overflow-scenarios, .overflow-scenarios__resize { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.overflow-scenarios p { margin: 0; }
.overflow-scenarios__resize { inline-size: min(100%, 34rem); transition: inline-size var(--sy-motion-replace) var(--sy-ease-settle); }
.overflow-scenarios__resize[data-narrow] { inline-size: min(100%, 12rem); }
</style>
