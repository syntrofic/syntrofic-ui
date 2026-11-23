<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import {
  SNativeButton, SNativeDescription, SNativeMotionText, SNativeRadioButtonGroup, SNativeRadioButtonItem,
  SNativeText, SNativeWheelPicker, SNativeWheelPickerGroup,
  type NativeRadioValue, type NativeWheelColumn, type NativeWheelOption, type NativeWheelValue, type NativeWheelValues,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const radio = useTemplateRef<InstanceType<typeof SNativeRadioButtonGroup>>('radio')
const wheel = useTemplateRef<InstanceType<typeof SNativeWheelPicker>>('wheel')
const format = ref<NativeRadioValue>()
const radioResult = ref('')
const time = ref<NativeWheelValue>('10:00')
const settled = ref<NativeWheelValue>()
const values = ref<NativeWheelValues>({ version: '初稿', copies: 2 })
const committed = ref<NativeWheelValues>()
const times: NativeWheelOption[] = Array.from({ length: 10 }, (_, i) => ({
  value: `${String(i + 9).padStart(2, '0')}:00`,
  label: `${String(i + 9).padStart(2, '0')}:00`,
  disabled: i === 4,
}))
const columns = [
  { name: 'version', label: '文档版本', items: ['初稿', '审阅版', '归档版'].map(label => ({ value: label, label })) },
  { name: 'copies', label: '打印份数', items: [1, 2, 3, 4, 5].map(value => ({ value, label: `${value} 份` })) },
] satisfies NativeWheelColumn[]
const document = computed(() => `${values.value.version} · ${values.value.copies} 份`)
const confirmation = computed(() => {
  const rest = committed.value
  const matches = rest && rest.version === values.value.version && rest.copies === values.value.copies
  return `${matches ? '已停在' : '当前为'} ${document.value}`
})

function confirm() {
  radioResult.value = radio.value?.check() ? `已选择 ${format.value}` : ''
}
</script>

<template>
  <StackLayout v-if="id === 'NP.radio-button-group'">
    <SNativeRadioButtonGroup ref="radio" v-model="format" label="导出格式" variant="secondary" required
      required-message="请选择导出格式" @change="radioResult = ''">
      <SNativeRadioButtonItem value="可编辑文档" label="可编辑文档" description="保留段落格式，便于交接后修改" marginBottom="4" />
      <SNativeRadioButtonItem value="归档副本" label="归档副本" description="固定版式，用于提交和归档" marginBottom="4" />
      <SNativeRadioButtonItem value="高分辨率图片" label="高分辨率图片" description="原始文件同步后可用" disabled />
    </SNativeRadioButtonGroup>
    <SNativeButton label="确认格式" size="sm" fullWidth marginTop="4" @tap="confirm" />
    <SNativeMotionText :value="radioResult" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.wheel-picker'">
    <SNativeText text="收件时间" heading marginBottom="4" />
    <SNativeWheelPicker ref="wheel" v-model="time" :items="times" label="收件时间选项"
      :item-height="42" :visible-count="5" @commit="value => settled = value" />
    <SNativeDescription text="13:00 暂停收件" marginTop="4" />
    <SNativeButton label="跳到 16:00" size="sm" variant="secondary" marginTop="7" @tap="wheel?.scrollToValue('16:00')" />
    <SNativeMotionText :value="settled === time ? `已停在 ${time}` : `当前为 ${time}`" announce marginTop="8" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.wheel-picker-group'">
    <GridLayout columns="*,*" marginBottom="4">
      <SNativeText col="0" text="文档版本" textAlignment="center" emphasized />
      <SNativeText col="1" text="打印份数" textAlignment="center" emphasized />
    </GridLayout>
    <SNativeWheelPickerGroup v-model="values" :columns="columns" label="打印参数" :item-height="42" :visible-count="5"
      @commit="value => committed = { ...value }" />
    <SNativeMotionText :value="confirmation" announce marginTop="8" />
  </StackLayout>
</template>
