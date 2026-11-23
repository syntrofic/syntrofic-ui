<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SMotionText, useLocale, useTranslator } from '../src'
import { useCollator } from '../src/rac'

const { locale } = useLocale()
const collator = useCollator({ sensitivity: 'base' })
const translate = useTranslator()
const issued = new Date(Date.UTC(2026, 10, 2))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(issued))
const amount = computed(() => new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'USD' }).format(1234.5))
const names = ['Åsa', 'Zara', 'Östen', 'Émile', 'anna']
const attendees = computed(() => [...names].sort(collator.value.compare))
const projects = ['版式审核', '组件登记', '版本签发', '权限检查', '资源归档', '发布通知', '目录复核', '站点验收', '交接记录']
const visible = ref(3)
const count = computed(() => {
  const format = new Intl.NumberFormat(locale.value)
  return translate('project.visible', { visible: format.format(visible.value), total: format.format(projects.length) })
})
function loadMore() { visible.value = Math.min(visible.value + 3, projects.length) }
</script>

<template>
  <dl class="locale-hook-fields__invoice" aria-label="发票日期与金额">
    <div><dt>开票日期</dt><dd><SMotionText :value="date" wrap /></dd></div>
    <div><dt>结算金额</dt><dd><SMotionText :value="amount" wrap /></dd></div>
  </dl>
  <ul class="locale-hook-fields__people" role="list" aria-label="按当前语言排序的成员">
    <TransitionGroup name="locale-person">
      <li v-for="person in attendees" :key="person">{{ person }}</li>
    </TransitionGroup>
  </ul>
  <div class="locale-hook-fields__records">
    <ul aria-label="发布任务" role="list">
      <TransitionGroup name="locale-person">
        <li v-for="project in projects.slice(0, visible)" :key="project">{{ project }}</li>
      </TransitionGroup>
    </ul>
    <output aria-label="任务显示数量"><SMotionText :value="count" wrap /></output>
    <SButton size="sm" variant="secondary" :aria-disabled="visible === projects.length || undefined"
      @click="loadMore"><SMotionText :value="translate('project.loadMore')" /></SButton>
  </div>
</template>

<style scoped>
.locale-hook-fields__invoice { display: flex; gap: var(--sy-space-4); flex-wrap: wrap; margin: 0; }
.locale-hook-fields__invoice dd { margin: 0; font-weight: 600; }
.locale-hook-fields__invoice dt { color: var(--sy-text-muted); }
.locale-hook-fields__people, .locale-hook-fields__records ul {
  margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: var(--sy-space-2);
}
.locale-hook-fields__people li, .locale-hook-fields__records li {
  padding: var(--sy-space-1) var(--sy-space-2); border-radius: var(--sy-radius-md); background: var(--sy-surface-muted);
}
.locale-hook-fields__records { display: grid; gap: var(--sy-space-2); justify-items: start; }
.locale-person-move, .locale-person-enter-active {
  transition: transform var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle);
}
.locale-person-enter-from { opacity: 0; transform: translateY(4px); }
</style>
