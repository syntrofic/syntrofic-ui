<script setup lang="ts">
import { ref } from 'nativescript-vue'
import {
  SNativeAccordion, SNativeAvatar, SNativeButton, SNativeChip, SNativeDescription, SNativeHStack, SNativeListGroup,
  SNativeMotionText, SNativeScrollShadow, SNativeSkeleton, SNativeSkeletonGroup, SNativeSurface,
  SNativeTabs, SNativeTagGroup, SNativeText, type NativeCollectionKey, type NativeTagItem,
} from '@syntrofic/ui-native'
import type { ReviewID } from './review-items'

defineProps<{ id: ReviewID }>()

const sections = [
  { id: 'delivery', label: '交付内容', text: '包含品牌标识、配色规范和社交媒体素材。源文件与导出图分开存放。' },
  { id: 'license', label: '使用授权', text: '字体仅供品牌团队内部使用。' },
  { id: 'history', label: '归档记录', disabled: true },
]
const rows = [
  { id: 'brand', label: '品牌资源库', description: '市场团队', meta: '今天' },
  { id: 'copy', label: '交付文稿', description: '设计团队', meta: '周二' },
  { id: 'draft', label: '历史草稿', meta: '已归档', disabled: true },
]
const tabs = [
  { id: 'summary', label: '概览', description: '项目摘要' },
  { id: 'assets', label: '交付文件', description: '素材名称和版本' },
  { id: 'notes', label: '修订记录', description: '近期修订内容' },
  { id: 'history', label: '归档', disabled: true },
]
const initialTags: NativeTagItem[] = [
  { id: 'design', label: '设计' },
  { id: 'brand', label: '品牌' },
  { id: 'print', label: '印刷' },
  { id: 'handoff', label: '交付' },
  { id: 'archived', label: '历史', disabled: true },
]
const timeline = ['封面图已审阅', '配色规范已更新', '素材完成同步', '字体授权已核对', '项目已创建']
const open = ref<NativeCollectionKey[]>(['delivery'])
const selected = ref<NativeCollectionKey[]>(['brand'])
const tab = ref<NativeCollectionKey>('summary')
const tags = ref([...initialTags])
const tagSelection = ref<NativeCollectionKey[]>(['brand'])
const viewed = ref(false)
const loading = ref(true)
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAXElEQVR42mPwiAymCmIYyQZ9un8Wgsg3CG4EMho4g7CagsesIWTQ4AtsaqajQZlFijqLkRHJBqHpx0REGUTQFKxmMZBnCqZZDGSbgmYWAyWmIJvFQKEpcLMGn0EAxgrOx4QePAUAAAAASUVORK5CYII='

function resetTags() {
  tags.value = [...initialTags]
  tagSelection.value = ['brand']
}
</script>

<template>
  <SNativeAccordion
    v-if="id === 'N.accordion'"
    v-model="open"
    :items="sections"
    expandedLabel="已展开"
    collapsedLabel="已折叠"
    variant="surface"
    multiple
  />

  <StackLayout v-else-if="id === 'N.list-group'">
    <SNativeListGroup v-model:selected="selected" :items="rows" selectionMode="single" separators>
      <template #suffix="{ item, disabled }">
        <SNativeButton v-if="item.id === 'brand'" label="查看" variant="ghost" size="sm" :disabled="disabled" @tap="viewed = true" />
      </template>
    </SNativeListGroup>
    <SNativeMotionText :value="viewed ? '已查看品牌资源库' : ''" minHeight="24" marginTop="6" announce />
  </StackLayout>

  <SNativeTabs v-else-if="id === 'N.tabs'" v-model="tab" :items="tabs" label="品牌资源库" scrollable>
    <template #default="{ item }">
      <SNativeSurface v-if="item.id === 'summary'" tone="sage" :padding="10">
        <SNativeText text="品牌资源库" emphasized />
        <SNativeDescription text="市场团队" marginTop="2" />
      </SNativeSurface>
      <SNativeSurface v-else-if="item.id === 'assets'" tone="blue" :padding="10">
        <SNativeText text="标识源文件" emphasized />
        <SNativeDescription text="配色规范" marginTop="5" />
        <SNativeDescription text="社交媒体素材" marginTop="5" />
      </SNativeSurface>
      <SNativeSurface v-else-if="item.id === 'notes'" tone="muted" :padding="10">
        <SNativeDescription text="周二 · 更新品牌配色规范" />
        <SNativeDescription text="周一 · 增补封面图" marginTop="5" />
      </SNativeSurface>
    </template>
  </SNativeTabs>

  <StackLayout v-else-if="id === 'N.tag-group'">
    <SNativeTagGroup
      v-model:items="tags"
      v-model:selected="tagSelection"
      label="素材分类"
      emptyText="没有分类"
      selectionMode="multiple"
      removable
      :removeLabel="item => `移除${item.label}`"
    />
    <SNativeButton label="恢复分类" size="sm" variant="secondary" @tap="resetTags" />
  </StackLayout>

  <FlexboxLayout v-else-if="id === 'N.chip'" flexWrap="wrap">
    <SNativeChip label="草稿" marginRight="6" marginBottom="6" />
    <SNativeChip label="可交付" tone="success" marginRight="6" marginBottom="6" />
    <SNativeChip label="待授权" tone="warning" variant="outline" marginRight="6" marginBottom="6" />
    <SNativeChip label="已退回" tone="danger" variant="solid" marginBottom="6" />
  </FlexboxLayout>

  <StackLayout v-else-if="id === 'N.skeleton'">
    <SNativeSkeleton :loading="loading" :height="24" variant="pulse">
      <SNativeText text="品牌资源库" size="headline" heading />
    </SNativeSkeleton>
    <SNativeButton label="切换加载状态" :pressed="loading" variant="secondary" size="sm" marginTop="8" @tap="loading = !loading" />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.skeleton-group'">
    <SNativeSkeletonGroup :loading="loading" label="正在读取最近项目">
      <SNativeSurface tone="base" :padding="10">
        <GridLayout columns="42,*">
          <SNativeSkeleton :height="36" shape="circle" verticalAlignment="middle">
            <SNativeAvatar name="李青" :size="36" />
          </SNativeSkeleton>
          <StackLayout col="1" verticalAlignment="middle">
            <SNativeSkeleton width="84%" :height="20"><SNativeText text="最近项目" emphasized /></SNativeSkeleton>
            <SNativeSkeleton width="60%" :height="16" marginTop="4"><SNativeDescription text="市场团队" /></SNativeSkeleton>
          </StackLayout>
        </GridLayout>
      </SNativeSurface>
    </SNativeSkeletonGroup>
    <SNativeButton label="切换加载状态" :pressed="loading" variant="secondary" size="sm" marginTop="8" @tap="loading = !loading" />
  </StackLayout>

  <SNativeHStack v-else-if="id === 'N.avatar'" :gap="8" align="center">
    <SNativeAvatar :src="photo" name="李青" alt="李青的头像" size="lg" presence="online" presence-label="在线" />
    <SNativeAvatar name="顾宁" shape="rounded" tone="blue" size="lg" presence="away" presence-label="离开" />
    <SNativeAvatar src="data:image/png;base64,AA==" name="宋然" tone="neutral" size="lg" />
  </SNativeHStack>

  <StackLayout v-else-if="id === 'N.scroll-shadow'">
    <SNativeScrollShadow :height="144" label="项目活动">
      <SNativeText v-for="entry in timeline" :key="entry" :text="entry" minHeight="39" verticalAlignment="middle" />
    </SNativeScrollShadow>
    <SNativeScrollShadow orientation="horizontal" label="文件分类" marginTop="8">
      <SNativeChip
        v-for="label in ['项目封面', '配色规范', '图形素材', '品牌标识', '历史版本', '交付源文件']"
        :key="label"
        :label="label"
        marginRight="6"
      />
    </SNativeScrollShadow>
  </StackLayout>
</template>
