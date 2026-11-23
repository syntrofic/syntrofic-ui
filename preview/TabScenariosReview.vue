<script setup lang="ts">
import { ref } from 'vue'
import { SBadge, SButton, SMotionText, SStatusDot, STabs, type TabItem } from '../src'

const tabs: TabItem[] = [
  { value: 'material', label: '资料', icon: 'file', selectedIcon: 'check' },
  { value: 'review', label: '复核', icon: 'book', selectedIcon: 'checkDouble' },
  { value: 'archive', label: '归档', icon: 'archive', selectedIcon: 'folder' },
]
const pages: TabItem[] = [
  { value: 'draft', label: '文稿', icon: 'file' },
  { value: 'media', label: '图片', icon: 'image' },
  { value: 'revision', label: '版本', icon: 'calendar' },
]
const extra = {
  label: '其余资料',
  options: [
    { value: 'records', label: '历史记录', icon: 'clock' },
    { value: 'exports', label: '导出文件', icon: 'archive' },
    { value: 'locked', label: '受限资料', disabled: true },
  ],
}
const lifecycle = ref('material')
const selected = ref('draft')
const pending = ref(2)
const panelBody: Record<string, string> = {
  material: '整理本次发布涉及的源文件。', review: '核对文案、语言和签名。', archive: '提交已审核的最终稿。',
  draft: '查阅文稿与发布注意事项。', media: '浏览封面与发布配图。', revision: '查看当前发布版本。',
  records: '按日期查阅以往的发布。', exports: '下载已生成的交付文件。',
}
</script>

<template>
  <section class="tab-scenarios" aria-label="发布选项卡场景">
    <STabs v-model="lifecycle" label="发布环节" :tabs="tabs" layout="fill" divider>
      <template #panel="{ tab }"><p><SMotionText :value="panelBody[tab.value]" /></p></template>
    </STabs>
    <STabs v-model="selected" label="发布资料与状态" toolbar-label="发布资料操作" size="sm"
      :tabs="pages" :overflow="extra" divider>
      <template #tab-end="{ tab }">
        <SBadge v-if="tab.value === 'draft'" tone="danger" :aria-label="pending + ' 份待复核文稿'"><SMotionText :value="String(pending)" /></SBadge>
        <SBadge v-if="tab.value === 'media'" :label="7" />
        <SStatusDot v-if="tab.value === 'revision'" tone="success" label="版本已同步" />
      </template>
      <template #actions>
        <SButton size="sm" variant="secondary" @click="pending++">登记复核</SButton>
      </template>
      <template #panel="{ tab }">
        <p><SMotionText :value="panelBody[tab.value]" /></p>
      </template>
    </STabs>
  </section>
</template>

<style scoped>
.tab-scenarios { min-inline-size: 0; display: grid; gap: var(--sy-space-5); }
.tab-scenarios p { margin: 0; }
.tab-scenarios :deep(.sy-badge) { padding: 2px 6px; }
</style>
