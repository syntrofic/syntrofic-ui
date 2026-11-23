<script setup lang="ts">
import { ref, useTemplateRef } from 'nativescript-vue'
import {
  getNativeBottomSheet, SNativeBottomSheet, SNativeButton, SNativeListGroup, SNativeMotionText, SNativeTextField,
  type NativeCollectionKey, type NativeSheetDetent,
} from '@syntrofic/ui-native'

const detent = ref(1)
const selected = ref<NativeCollectionKey[]>(['cover'])
const note = ref('')
const result = ref('')
const sheet = useTemplateRef<InstanceType<typeof SNativeBottomSheet>>('sheet')
const shortcut = useTemplateRef<InstanceType<typeof SNativeButton>>('shortcut')
const stops: readonly NativeSheetDetent[] = ['peek', 0.48, 0.86]
const items = [
  { id: 'cover', label: '项目封面', description: '市场团队', meta: '今天' },
  { id: 'theme', label: '配色规范', description: '设计团队', meta: '周二' },
  { id: 'logo', label: '品牌标识', description: '设计团队', meta: '周二' },
  { id: 'copy', label: '交付文稿', description: '内容团队', meta: '周一' },
  { id: 'fonts', label: '字体授权', description: '法务团队', meta: '上周' },
  { id: 'photos', label: '影像源文件', description: '品牌团队', meta: '上周' },
  { id: 'archive', label: '旧版素材', description: '品牌团队', meta: '已归档', disabled: true },
]
</script>

<template>
  <StackLayout>
    <SNativeBottomSheet
      ref="sheet"
      v-model:detent="detent"
      name="review-project-assets"
      title="交付素材"
      description="选择要放入交付包的内容。"
      triggerLabel="选择交付素材"
      closeLabel="关闭交付素材"
      :detents="stops"
    >
      <SNativeListGroup v-model:selected="selected" :items="items" selectionMode="multiple" separators />
      <template #footer="{ resize, dismiss }">
        <FlexboxLayout flexWrap="wrap" justifyContent="space-between">
          <SNativeButton label="缩到预览" variant="ghost" size="sm" @tap="resize(0)" />
          <SNativeButton label="展开列表" variant="ghost" size="sm" @tap="resize(2)" />
          <SNativeButton label="确认选择" size="sm" @tap="result = `已选择 ${selected.length} 项素材`; dismiss('confirm')" />
        </FlexboxLayout>
        <SNativeBottomSheet
          title="交付说明"
          triggerLabel="添加说明"
          closeLabel="关闭交付说明"
          :detents="['auto']"
          marginTop="4"
        >
          <SNativeTextField v-model="note" label="说明" placeholder="可选" returnKeyType="done" />
          <template #footer="{ dismiss }">
            <FlexboxLayout justifyContent="flex-end">
              <SNativeButton label="关闭上层" size="sm" variant="ghost" @tap="sheet?.dismissStack()" />
              <SNativeButton label="保存说明" size="sm" @tap="dismiss('confirm')" />
            </FlexboxLayout>
          </template>
        </SNativeBottomSheet>
      </template>
    </SNativeBottomSheet>
    <SNativeButton
      ref="shortcut"
      label="直接打开完整列表"
      variant="ghost"
      size="sm"
      marginTop="4"
      @tap="getNativeBottomSheet('review-project-assets')?.present(2, () => shortcut?.focus())"
    />
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>
</template>
