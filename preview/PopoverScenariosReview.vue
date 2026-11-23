<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, SCheckbox, SIcon, SKbd, SListItem, SMotionText, SPopover, SSheet, SSwitch, useMediaQuery } from '../src'

const compactTouch = useMediaQuery('(max-width: 639px) and (pointer: coarse) and (hover: none)')
const confirmOpen = ref(false)
const filterTrigger = useTemplateRef<{ $el: HTMLElement }>('filterTrigger')
let continueToFilters = false
const assigned = ref(true)
const draftsOnly = ref(false)
const email = ref(true)
const changes = ref(false)
const result = ref('')
const actions = [
  { glyph: 'user', title: '选择负责人', description: '把交付任务分配给团队成员。' },
  { glyph: 'file', title: '补充标签', description: '按主题整理当前资料。' },
  { glyph: 'calendar', title: '设置日期', description: '安排下一次复核。' },
]

function apply(close: () => void) {
  const filters = [assigned.value ? '有负责人' : '', draftsOnly.value ? '仅草稿' : ''].filter(Boolean)
  result.value = filters.length ? '已应用 · ' + filters.join('、') : '已清除筛选'
  close()
}

function removeDraft(close: () => void) {
  result.value = '草稿已移入回收站'
  continueToFilters = true
  close()
}

function afterRemove() {
  if (!continueToFilters) return
  continueToFilters = false
  filterTrigger.value?.$el.focus({ preventScroll: true })
}
</script>

<template>
  <section class="popover-review" aria-label="浮层使用示例">
    <div class="review__row">
      <SPopover v-model:open="confirmOpen" label="移除交付草稿" align="start" modal @hide="afterRemove">
        <template #trigger><SButton size="sm" variant="secondary">移除草稿</SButton></template>
        <template #default="{ close }">
          <div class="popover-review__body">
            <strong>移除交付草稿？</strong><p>你仍可在回收站中找回它。</p>
            <div class="review__row">
              <SButton size="sm" variant="secondary" @click="close">保留草稿</SButton>
              <SButton size="sm" variant="danger" @click="removeDraft(close)">确认移除</SButton>
            </div>
          </div>
        </template>
      </SPopover>
      <SPopover label="交付筛选">
        <template #trigger><SButton ref="filterTrigger" size="sm" variant="secondary">筛选交付记录</SButton></template>
        <template #default="{ close }">
          <div class="popover-review__body">
            <SCheckbox v-model="assigned" label="有负责人" />
            <SCheckbox v-model="draftsOnly" label="仅草稿" />
            <div class="review__row">
              <SButton size="sm" variant="ghost" @click="assigned = false; draftsOnly = false">重置</SButton>
              <SButton size="sm" @click="apply(close)">应用筛选</SButton>
            </div>
          </div>
        </template>
      </SPopover>
      <SPopover label="通知选项">
        <template #trigger><SButton size="sm" variant="secondary">通知选项</SButton></template>
        <div class="popover-review__body"><SSwitch v-model="email">邮件摘要</SSwitch><SSwitch v-model="changes">交付变更</SSwitch></div>
      </SPopover>
      <SPopover label="交付快捷键">
        <template #trigger><SButton size="sm" variant="ghost">查看快捷键</SButton></template>
        <ul class="popover-review__keys"><li>搜索资料 <SKbd :keys="['command', 'K']" /></li><li>关闭浮层 <SKbd :keys="['escape']" /></li></ul>
      </SPopover>
      <component :is="compactTouch ? SSheet : SPopover" v-bind="compactTouch
        ? { title: '资料快捷操作', height: 'hug', dismissLabel: '关闭资料操作' }
        : { label: '资料快捷操作' }">
        <template #trigger><SButton size="sm" variant="secondary">资料快捷操作</SButton></template>
        <template #default="{ close }">
          <ul class="popover-review__actions">
            <SListItem v-for="action in actions" :key="action.title" as="li" :label="action.title" :description="action.description" interactive
              @activate="close(); result = action.title">
              <template #start><SIcon :name="action.glyph" /></template>
            </SListItem>
          </ul>
        </template>
      </component>
    </div>
    <p><SMotionText :value="result" announce /></p>
  </section>
</template>

<style scoped>
.popover-review { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.popover-review p, .popover-review__body p { margin: 0; color: var(--sy-text-muted); font-size: .85rem; }
.popover-review__body { display: grid; gap: var(--sy-space-2); }
.popover-review__actions, .popover-review__keys { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.popover-review__keys li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
</style>
