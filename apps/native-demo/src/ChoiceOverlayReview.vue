<script setup lang="ts">
import { ref } from 'nativescript-vue'
import {
  SNativeButton, SNativeMenu, SNativeMotionText, SNativePopover, SNativeSelect, SNativeText,
  type NativeCollectionKey, type NativeMenuItem, type NativeMenuSection, type NativeSelectValue,
} from '@syntrofic/ui-native'
import SNativeSubMenu from '@syntrofic/ui-native/sub-menu'
import type { ReviewID } from './review-items'

defineProps<{ id: ReviewID }>()
const result = ref('')
const format = ref<NativeCollectionKey[]>(['design'])
const team = ref<NativeSelectValue>(null)
const assets = ref<NativeSelectValue>(['cover'])
const formats: NativeMenuItem[] = [
  { id: 'design', label: '设计文件', description: '包含可编辑源文件' },
  { id: 'images', label: '导出图片' },
  { id: 'archive', label: '历史版本', disabled: true },
]
const teams: NativeMenuSection[] = [
  { id: 'creator', label: '制作团队', items: [{ id: 'design', label: '设计' }, { id: 'content', label: '内容' }] },
  { id: 'support', label: '支持团队', items: [{ id: 'market', label: '市场' }, { id: 'archive', label: '已归档团队', disabled: true }] },
]
const delivery: NativeMenuItem[] = [
  { id: 'cover', label: '项目封面' }, { id: 'brand', label: '品牌标识' }, { id: 'source', label: '设计源文件' },
]
const actions: NativeMenuItem[] = [
  { id: 'duplicate', label: '复制项目', meta: '保留原项目' },
  { id: 'export', label: '导出', children: formats },
  { id: 'publish', label: '直接发布', disabled: true },
  { id: 'archive', label: '归档项目', tone: 'danger' },
]
const rooms = [{ id: 'internal', label: '仅团队成员' }, { id: 'partner', label: '指定合作方' }]
function act(item: NativeMenuItem) { result.value = `已选择「${item.label}」` }
</script>

<template>
  <StackLayout v-if="id === 'N.popover'">
    <GridLayout columns="*,auto">
      <SNativePopover col="1" triggerLabel="查看同步详情" title="同步已完成" placement="right" :width="220" showClose closeLabel="关闭详情">
        <SNativeText text="品牌标识和配色规范已同步。" tone="muted" margin="2 4 6" />
        <template #footer="{ close }">
          <SNativeButton label="知道了" size="sm" variant="ghost" @tap="close('confirm')" />
        </template>
      </SNativePopover>
    </GridLayout>
    <SNativePopover triggerLabel="在面板查看" title="项目同步" description="4 项素材已更新。" presentation="bottom-sheet" :detents="['auto', 0.8]" showClose closeLabel="关闭项目同步" marginTop="8">
      <SNativeText text="封面图、品牌标识、配色规范和源文件已更新。" />
    </SNativePopover>
  </StackLayout>
  <StackLayout v-else-if="id === 'N.menu'">
    <SNativeMenu label="项目操作" :items="actions" backLabel="返回项目操作" :overlay="{ placement: 'bottom' }" @action="act" />
    <SNativeMenu label="长按打开共享操作" :items="rooms" activation="long-press" marginTop="8" @action="act" />
    <SNativeMenu
      v-model:selected="format"
      label="选择交付格式"
      title="交付格式"
      :items="formats"
      presentation="bottom-sheet"
      selectionMode="single"
      indicator="dot"
      marginTop="8"
    />
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>
  <StackLayout v-else-if="id === 'N.select'">
    <SNativeSelect
      v-model="team"
      label="负责团队"
      placeholder="请选择团队"
      description="团队成员可以访问该项目。"
      :sections="teams"
      clearable
      clearLabel="清除团队"
    />
    <SNativeSelect
      v-model="assets"
      label="交付素材"
      placeholder="选择文件"
      :items="delivery"
      presentation="bottom-sheet"
      multiple
      clearable
      clearLabel="清除交付素材"
      doneLabel="完成"
      marginTop="12"
    />
    <SNativeSelect :model-value="'cover'" :items="delivery" label="归档素材" disabled marginTop="12" />
  </StackLayout>
  <StackLayout v-else-if="id === 'N.export.sub-menu'">
    <SNativePopover triggerLabel="项目权限" title="项目权限" :width="220" showClose closeLabel="关闭项目权限">
      <SNativeSubMenu label="共享范围" :items="rooms" @action="act" />
    </SNativePopover>
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>
</template>
