<script setup lang="ts">
import { $navigateTo } from 'nativescript-vue'
import { SNativeButton, SNativeProvider, SNativeText } from '@syntrofic/ui-native'
import ReviewScene from './ReviewScene.vue'
import NativeTemplateReview from './NativeTemplateReview.vue'
import NativeToolsReview from './NativeToolsReview.vue'
import NativeThemeReview from './NativeThemeReview.vue'
import NativeProductivityReview from './NativeProductivityReview.vue'
import { reviews, type ReviewID } from './review-items'

function openTemplate(kind: 'wallet' | 'fitness', label: string) {
  void $navigateTo(NativeTemplateReview, { props: { kind, label } })
}
function open(id: ReviewID) {
  void $navigateTo(ReviewScene, { props: { id } })
}

const entries = [
  { label: '386 移动工作台', open: () => $navigateTo(NativeProductivityReview) },
  ...reviews.map(item => ({ label: `${item.number} ${item.label}`, open: () => open(item.id) })),
  { label: '344 原生配置', open: () => $navigateTo(NativeToolsReview) },
  { label: '348 原生主题预览', open: () => $navigateTo(NativeThemeReview) },
  { label: '365 模拟钱包', open: () => openTemplate('wallet', '365 模拟钱包') },
  { label: '366 健身工作台', open: () => openTemplate('fitness', '366 健身工作台') },
]
</script>

<template>
  <Frame>
    <Page>
      <ActionBar title="Syntrofic UI Native" />
      <SNativeProvider>
        <GridLayout rows="auto,*" padding="16">
          <SNativeText text="组件验收" size="headline" heading marginBottom="12" />
          <ListView row="1" :items="entries" rowHeight="54" separatorColor="transparent">
            <template #default="{ item }">
              <GridLayout paddingBottom="6">
                <SNativeButton :label="item.label" variant="secondary" fullWidth @tap="item.open()" />
              </GridLayout>
            </template>
          </ListView>
        </GridLayout>
      </SNativeProvider>
    </Page>
  </Frame>
</template>
