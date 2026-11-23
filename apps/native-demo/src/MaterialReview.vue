<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeButton, SNativeCard, SNativeDialog, SNativeMotionText, SNativeProvider, SNativeSurface, SNativeText } from '@syntrofic/ui-native'
import SNativeGlassView, { type NativeGlassEffect } from '@syntrofic/ui-native/glass-view'
import SNativeThemeBackground from '@syntrofic/ui-native/theme-background'
import type { ReviewID } from './review-items'

defineProps<{ id: ReviewID }>()
const solid = ref(false)
const effect = ref<NativeGlassEffect>('regular')
const material = ref<'solid' | 'glass'>('solid')
const count = ref(12)
const states = { regular: '常规玻璃', clear: '通透玻璃', blur: '原生模糊', solid: '实色表面' }
</script>

<template>
  <StackLayout v-if="id === 'N.export.glass-view'">
    <GridLayout columns="*,*" :height="112">
      <SNativeSurface tone="sage" :padding="0" />
      <SNativeSurface col="1" tone="blue" :padding="0" marginLeft="4" />
      <SNativeGlassView colSpan="2" :effect="effect" :forceSolid="solid" :radius="18" :padding="12" tone="muted" margin="22 32">
        <template #default="{ effect: rendered }">
          <SNativeText text="同步状态" emphasized />
          <SNativeMotionText :value="states[rendered]" :size="13" marginTop="2" />
        </template>
      </SNativeGlassView>
    </GridLayout>
    <FlexboxLayout flexWrap="wrap" marginTop="8">
      <SNativeButton label="常规" size="sm" variant="ghost" :pressed="effect === 'regular'" @tap="effect = 'regular'" />
      <SNativeButton label="通透" size="sm" variant="ghost" :pressed="effect === 'clear'" @tap="effect = 'clear'" />
      <SNativeButton label="模糊" size="sm" variant="ghost" :pressed="effect === 'blur'" @tap="effect = 'blur'" />
      <SNativeButton label="模拟实色降级" size="sm" variant="secondary" :pressed="solid" @tap="solid = !solid" />
    </FlexboxLayout>
    <SNativeDialog triggerLabel="打开模糊遮罩" title="项目同步" description="素材已经同步。" backdrop="blur" showClose closeLabel="关闭同步详情" marginTop="8">
      <template #footer="{ close }"><SNativeButton label="完成" size="sm" @tap="close('confirm')" /></template>
    </SNativeDialog>
  </StackLayout>
  <StackLayout v-else-if="id === 'N.export.theme-background'">
    <FlexboxLayout flexWrap="wrap" marginBottom="8">
      <SNativeButton label="实色主题" size="sm" variant="ghost" :pressed="material === 'solid'" @tap="material = 'solid'" />
      <SNativeButton label="启用玻璃背景" size="sm" variant="ghost" :pressed="material === 'glass'" @tap="material = 'glass'" />
    </FlexboxLayout>
    <SNativeProvider :material="material">
      <StackLayout>
        <SNativeCard title="交付清单" description="封面图与源文件" tone="sage">
          <StackLayout orientation="horizontal">
            <SNativeMotionText :value="String(count)" :reserve="3" />
            <SNativeText text="项素材" verticalAlignment="middle" marginLeft="4" />
          </StackLayout>
          <template #footer>
            <SNativeButton label="添加一项" size="sm" variant="secondary" @tap="count++">
              <template #background="{ radius, color }">
                <SNativeThemeBackground :radius="radius" :fallbackColor="color" always />
              </template>
            </SNativeButton>
          </template>
        </SNativeCard>
        <SNativeSurface marginTop="8" :padding="10" material="solid">
          <template #background="{ radius }">
            <SNativeThemeBackground tone="blue" :radius="radius" material="solid" always />
          </template>
          <SNativeText text="自定义实色背景" />
        </SNativeSurface>
      </StackLayout>
    </SNativeProvider>
  </StackLayout>
</template>
