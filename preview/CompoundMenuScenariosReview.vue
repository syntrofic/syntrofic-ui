<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SBadge, SContextMenu, SContextMenuItem, SDropdown, SKbd, SMenuCheckboxItem, SMenuItem,
  SMenuRadioGroup, SMenuRadioItem, SMenuSection, SSeparator, SMotionText,
} from '../src'

defineProps<{ kind: 'context' | 'dropdown' }>()
const result = ref('')
const mode = ref('balanced')
const notify = ref(true)
const retry = ref(false)
const modes = [
  { value: 'quick', label: '快速核对' },
  { value: 'balanced', label: '常规复核' },
  { value: 'deep', label: '完整检查' },
]
const summary = computed(() => (modes.find(option => option.value === mode.value)?.label ?? '')
  + (notify.value ? ' · 完成后通知' : '') + (retry.value ? ' · 失败时重试' : ''))
</script>

<template>
  <section v-if="kind === 'context'" class="compound-menu-scenarios" aria-label="带描述的版本操作">
    <SContextMenu label="版本记录操作" trigger-label="交付记录版本">
      <template #trigger>
        <div class="compound-menu-scenarios__target">
          <strong>交付记录 v2</strong>
          <p>右键或按 Shift + F10 打开操作。</p>
        </div>
      </template>
      <SContextMenuItem label="打开修改记录" description="查看版本修改人与提交时间。" icon="clock"
        @select="result = '已打开修改记录'" />
      <SContextMenuItem label="建立记录副本" description="将当前版本复制到发布工作区。" icon="copy"
        @select="result = '已建立记录副本'">
        <template #end><SKbd keys="mod+d" /></template>
      </SContextMenuItem>
      <SContextMenuItem label="归档当前版本" icon="archive"
        @select="result = '已归档当前版本'" />
      <SContextMenuItem label="删除锁定版本" description="仅管理员可执行。" icon="lock" tone="danger" disabled />
    </SContextMenu>
    <p role="status" aria-label="版本操作结果"><SMotionText :value="result" /></p>
  </section>
  <section v-else class="compound-menu-scenarios" aria-label="分组和可选菜单项">
    <div class="review__row">
      <SDropdown label="交付列表操作">
        <SMenuSection label="查看">
          <SMenuItem label="打开交付摘要" description="查看发布范围和待复核项。" icon="book" @select="result = '已打开交付摘要'" />
          <SMenuItem label="打开资料目录" description="浏览整理好的归档文件。" icon="folder" @select="result = '已打开资料目录'" />
        </SMenuSection>
        <SSeparator />
        <SMenuSection label="输出">
          <SMenuItem label="复制交付链接" icon="link" @select="result = '已复制交付链接'">
            <template #end><SBadge label="内部" /></template>
          </SMenuItem>
        </SMenuSection>
      </SDropdown>
      <SDropdown label="复核运行设置">
        <SMenuSection label="检查模式">
          <SMenuRadioGroup v-model="mode" label="选择检查速度">
            <SMenuRadioItem v-for="option in modes" :key="option.value" :value="option.value" :label="option.label" />
          </SMenuRadioGroup>
        </SMenuSection>
        <SSeparator />
        <SMenuSection label="完成后">
          <SMenuCheckboxItem v-model="notify" label="完成后通知" />
          <SMenuCheckboxItem v-model="retry" label="失败时重试" />
        </SMenuSection>
      </SDropdown>
    </div>
    <p role="status" aria-label="交付菜单操作结果"><SMotionText :value="result" /></p>
    <p role="status" aria-label="复核运行配置"><SMotionText :value="summary" /></p>
  </section>
</template>

<style scoped>
.compound-menu-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.compound-menu-scenarios p { margin: 0; }
.compound-menu-scenarios__target {
  display: grid; gap: var(--sy-space-1); padding: var(--sy-space-3); border-radius: var(--sy-radius-md);
  border: 1px dashed var(--sy-border-strong); background: var(--sy-canvas);
}
</style>
