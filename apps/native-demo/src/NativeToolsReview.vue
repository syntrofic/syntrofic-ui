<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeButton, SNativePortal, SNativePortalHost, SNativeProvider, SNativeSafeArea, SNativeScope, SNativeSurface, SNativeText } from '@syntrofic/ui-native'
const open = ref(false)
</script>

<template>
  <Page>
    <ActionBar title="344 原生配置" />
    <SNativeProvider>
      <SNativePortalHost>
        <SNativeSafeArea :minimum="12" :edges="['left','right','top']">
          <SNativeScope :geometry="{ radiusMd: 18 }">
            <StackLayout>
              <SNativeText text="发布工作台" heading size="title" />
              <SNativeText text="在当前页面打开底部说明。" tone="muted" marginTop="4" />
              <SNativeButton label="打开 Portal" size="sm" marginTop="8" @tap="open = true" />
              <SNativePortal :open="open">
                <SNativeSurface tone="sage" verticalAlignment="bottom" :padding="12" margin="12">
                  <GridLayout columns="*,auto">
                    <SNativeText text="根层说明" verticalAlignment="middle" emphasized />
                    <SNativeButton col="1" label="关闭说明" size="sm" variant="secondary" @tap="open=false" />
                  </GridLayout>
                </SNativeSurface>
              </SNativePortal>
            </StackLayout>
          </SNativeScope>
        </SNativeSafeArea>
      </SNativePortalHost>
    </SNativeProvider>
  </Page>
</template>
