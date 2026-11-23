<script setup lang="ts">
import { ref } from 'vue'
import { SAvatar, SBadge, SButton, SChip, SIcon, SLink, SMetadataList, SMetadataListItem, SMotionText, STimestamp, type MetadataEntry } from '../src'

const count = ref(14)
const expanded = ref(false)
const details: MetadataEntry[] = [
  { id: 'name', label: '交付名称', value: '工作区组件' },
  { id: 'state', label: '发布状态', value: '通过复核' },
  { id: 'version', label: '版本', value: 'v2.14.0' },
  { id: 'owner', label: '维护人', value: '陈禾' },
  { id: 'repository', label: '文档入口', value: '发布目录' },
  { id: 'time', label: '发布时间', value: '2026-11-22T15:00:00+08:00' },
]
</script>

<template>
  <section class="metadata-list-scenarios" aria-label="元数据布局示例">
    <SMetadataList title="发布详情" :items="details" :limit="3" v-model:expanded="expanded" expand-label="展开发布详情" collapse-label="收起发布详情">
      <template #label="{ item }"><SIcon v-if="item.id === 'repository'" name="link" size="sm" />{{ item.label }}</template>
      <template #value="{ item }">
        <SBadge v-if="item.id === 'state'" :label="item.value" tone="success" />
        <span v-else-if="item.id === 'owner'" class="review__row"><SAvatar name="陈禾" size="sm" :tooltip="false" />陈禾</span>
        <SLink v-else-if="item.id === 'repository'" href="/docs/standard-design/examples/">发布目录</SLink>
        <STimestamp v-else-if="item.id === 'time'" :value="item.value" locale="zh-CN" format="date" time-zone="Asia/Shanghai" :tooltip="false" />
        <template v-else>{{ item.value }}</template>
      </template>
    </SMetadataList>
    <SMetadataList title="交付摘要字段" orientation="horizontal">
      <SMetadataListItem label="发布渠道" value="官网" />
      <SMetadataListItem label="状态"><SBadge label="已就绪" tone="green" /></SMetadataListItem>
      <SMetadataListItem label="组件数"><SMotionText :value="String(count)" motion="roll" /></SMetadataListItem>
    </SMetadataList>
    <SButton variant="secondary" size="sm" @click="count++">增加交付组件数</SButton>
    <SMetadataList title="资料归档字段" columns="multi">
      <SMetadataListItem label="环境" value="正式发布区" icon="folder" />
      <SMetadataListItem label="责任组" value="体验设计组" />
      <SMetadataListItem label="分类">
        <div class="review__row"><SChip label="组件" tone="blue" /><SChip label="说明" tone="teal" /></div>
      </SMetadataListItem>
      <SMetadataListItem label="优先级"><SBadge label="高" tone="red" /></SMetadataListItem>
    </SMetadataList>
  </section>
</template>

<style scoped>
.metadata-list-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-4); min-inline-size: 0; }
.metadata-list-scenarios > .sy-button { justify-self: start; }
</style>
