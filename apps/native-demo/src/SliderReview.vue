<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeButton, SNativeSlider, SNativeSurface, type NativeSliderValue } from '@syntrofic/ui-native'

const volume = ref<NativeSliderValue>(35)
const budget = ref<NativeSliderValue>([120, 380])
const speed = ref<NativeSliderValue>(1.5)
const cny = { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 } as const
const marks = [{ value: 0, label: '静音' }, { value: 50 }, { value: 100, label: '最大' }]
const speeds = [{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }]
</script>

<template>
  <StackLayout>
    <SNativeSlider v-model="volume" label="播放音量" :step="5" :marks="marks" showSteps />
    <SNativeSurface tone="sage" :padding="12" marginTop="8">
      <SNativeSlider
        v-model="budget"
        label="素材预算"
        locale="zh-CN"
        :max="500"
        :step="10"
        :minStepsBetweenThumbs="2"
        :formatOptions="cny"
        :thumbLabels="['最低预算', '最高预算']"
      />
      <SNativeButton label="恢复默认" variant="secondary" size="sm" @tap="budget = [120, 380]" />
    </SNativeSurface>
    <SNativeSlider
      v-model="speed"
      label="预览速度"
      orientation="vertical"
      :min="0.5"
      :max="2"
      :step="0.25"
      :trackLength="136"
      :marks="speeds"
      showSteps
      marginTop="12"
    />
    <SNativeSlider :model-value="40" label="已锁定的进度" disabled marginTop="4" />
  </StackLayout>
</template>
