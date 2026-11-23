<script setup lang="ts">
import { computed, ref } from 'nativescript-vue'
import {
  SNativeButton, SNativeNumberValue, SNativeProgressBar, SNativeProgressCircle,
  SNativeRating, SNativeSurface, SNativeText, SNativeTrendChip, type NativeProgressState,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const amount = ref(999.98)
const records = ref(12300)
const bar = ref<NativeProgressState>('determinate')
const circle = ref<NativeProgressState>('determinate')
const rating = ref(2.5)
const trend = ref(.082)

const currency = { style: 'currency', currency: 'CNY' } as const
const quantity = { notation: 'compact', maximumFractionDigits: 1 } as const
const percent = computed(() => bar.value === 'error' ? 68 : 40)
const variants = [
  { label: '等待响应', state: 'indeterminate' }, { label: '标为完成', state: 'complete' }, { label: '演示失败', state: 'error' },
] as const
const trends = [
  { label: '环比增长', value: .082 }, { label: '环比回落', value: -.034 }, { label: '环比持平', value: 0 },
] as const
</script>

<template>
  <StackLayout v-if="id === 'NP.number-value'">
    <SNativeSurface tone="sage" :padding="12">
      <GridLayout columns="*,auto" rows="auto,auto">
        <SNativeText text="入账金额" size="caption" tone="muted" />
        <SNativeText col="1" text="处理记录" size="caption" tone="muted" />
        <SNativeNumberValue row="1" :value="amount" :formatOptions="currency" locale="zh-CN" :reserveFor="-1000.02"
          :size="24" label="入账金额" announce />
        <SNativeNumberValue row="1" col="1" :value="records" :formatOptions="quantity" locale="zh-CN" suffix=" 条"
          :reserveFor="9820" :size="18" label="处理记录" verticalAlignment="middle" announce />
      </GridLayout>
    </SNativeSurface>
    <GridLayout columns="*,*" marginTop="8">
      <SNativeButton label="增加入账金额" size="sm" variant="secondary" marginRight="4"
        @tap="amount = amount === 999.98 ? 1000.02 : 999.98" />
      <SNativeButton col="1" label="更新处理记录" size="sm" variant="secondary" marginLeft="4"
        @tap="records = records === 12300 ? 9820 : 12300" />
    </GridLayout>
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.progress-bar'">
    <SNativeSurface tone="muted" :padding="12">
      <SNativeProgressBar :value="percent" :state="bar" label="上传进度" waitingLabel="等待响应"
        completeLabel="已完成" errorLabel="上传失败" announce />
    </SNativeSurface>
    <GridLayout columns="*,*,*" marginTop="8">
      <SNativeButton v-for="(variant, index) in variants" :key="variant.state" :col="index" :label="variant.label"
        size="sm" variant="secondary" margin="2" fullWidth @tap="bar = variant.state" />
    </GridLayout>
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.progress-circle'">
    <SNativeSurface tone="sage" :padding="12">
      <GridLayout columns="*,*">
        <SNativeProgressCircle :value="62" size="lg" :state="circle" label="校验进度" waitingLabel="校验中" completeLabel="校验完成" announce />
        <SNativeProgressCircle col="1" :value="83" size="md" label="索引进度" verticalAlignment="middle" />
      </GridLayout>
    </SNativeSurface>
    <GridLayout columns="*,*" marginTop="8">
      <SNativeButton label="等待校验" size="sm" variant="secondary" marginRight="4" @tap="circle = 'indeterminate'" />
      <SNativeButton col="1" label="完成校验" size="sm" variant="secondary" marginLeft="4" @tap="circle = 'complete'" />
    </GridLayout>
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.rating'">
    <SNativeSurface :padding="11">
      <SNativeRating v-model="rating" label="材料评分" :step=".5" allowClear />
    </SNativeSurface>
    <SNativeSurface :padding="11" tone="muted" marginTop="8">
      <SNativeRating :modelValue="4.5" label="上次评审" :step=".5" readOnly />
    </SNativeSurface>
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.trend-chip'">
    <SNativeSurface :padding="12">
      <GridLayout columns="*,auto">
        <SNativeText text="出库量环比" emphasized verticalAlignment="middle" />
        <SNativeTrendChip col="1" :value="trend" locale="zh-CN" :reserveFor="-.145" :reserve="3"
          upLabel="上升" downLabel="下降" flatLabel="持平" announce />
      </GridLayout>
    </SNativeSurface>
    <GridLayout columns="*,*,*" marginTop="8">
      <SNativeButton v-for="(choice, index) in trends" :key="choice.value" :col="index" :label="choice.label"
        size="sm" variant="secondary" margin="2" fullWidth @tap="trend = choice.value" />
    </GridLayout>
  </StackLayout>
</template>
