<script setup lang="ts">
import { ref } from 'nativescript-vue'
import {
  SNativeAutocomplete, SNativeButton, SNativeComboBox, SNativeDescription, SNativeMotionText, SNativeNumberField,
  SNativeNumberPad, SNativeNumberStepper, SNativePhoneNumberField, SNativeSurface, SNativeText, SNativeToggleButton,
  type NativeOptionItem, type NativePhoneCountry, type NativePhoneDetails, type NativeSelectValue,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const archived: NativeOptionItem[] = [
  { id: 'archive', label: '归档清单', description: '交付批次和对应材料', keywords: ['archive', 'record'] },
  { id: 'audit', label: '复核清单', description: '文件名称、数量与签名', keywords: ['audit', 'review'] },
  { id: 'material', label: '材料索引', keywords: ['material', 'index'] },
  { id: 'external', label: '外部同步记录', keywords: ['external'], disabled: true },
]
const files: NativeOptionItem[] = [
  { id: 'brief', label: '交付说明', keywords: ['brief'] },
  { id: 'source', label: '源文件', keywords: ['source'] },
  { id: 'signed', label: '签名记录', keywords: ['signed'] },
  { id: 'deleted', label: '移除记录', disabled: true },
]
const nations: NativePhoneCountry[] = ['CN', 'US', 'DE', 'JP', 'GB']
const names: Partial<Record<NativePhoneCountry, string>> = { CN: '中国', US: '美国', DE: '德国', JP: '日本', GB: '英国' }
const query = ref('')
const choice = ref<NativeSelectValue>(null)
const file = ref<NativeSelectValue>('brief')
const groups = ref<NativeSelectValue>(['source'])
const budget = ref<number>()
const ratio = ref(.125)
const result = ref('')
const pad = ref('')
const count = ref(8)
const phone = ref('')
const country = ref<NativePhoneCountry>('CN')
const phoneState = ref<NativePhoneDetails>()
const phoneField = ref<InstanceType<typeof SNativePhoneNumberField>>()
const dial = ref(false)

function phoneChanged(value: NativePhoneDetails) {
  phoneState.value = value
  if (!value.valid || value.e164 !== result.value) result.value = ''
}

function queryArchive(value: string) {
  return new Promise<readonly NativeOptionItem[]>((resolve, reject) => {
    const query = value.trim().toLowerCase()
    setTimeout(() => {
      if (query === 'offline') { reject(new Error('Source is unavailable')); return }
      resolve(archived.filter(item => item.label.includes(query) || item.keywords?.some(word => word.includes(query))))
    }, query === 'a' ? 720 : 280)
  })
}

function validatePhone() {
  if (phoneField.value?.check()) result.value = phoneState.value?.e164 ?? ''
}
</script>

<template>
  <StackLayout v-if="id === 'NP.autocomplete'">
    <SNativeAutocomplete v-model="choice" v-model:query="query" label="搜索资料" placeholder="输入归档或复核名称"
      :load-options="queryArchive" :minimum-characters="1" :debounce="70" clear-label="清除"
      minimum-text="输入名称查找资料" loading-text="正在查找资料" empty-text="没有匹配资料" error-text="暂时无法加载资料"
      @select="item => result = item.label" @clear="result = ''" />
    <SNativeMotionText :value="result ? `已选 ${result}` : ''" announce marginTop="8" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.combo-box'">
    <SNativeComboBox v-model="file" label="随附材料" :items="files" :open-on-focus="false" placeholder="选择一项材料"
      clear-label="清除" trigger-label="选项" close-label="收起" empty-text="没有匹配的材料"
      @select="item => result = item.label" @clear="result = ''" />
    <SNativeMotionText :value="result ? `随附 ${result}` : ''" announce marginTop="5" />
    <SNativeComboBox v-model="groups" label="批量附加" :items="files" multiple :open-on-focus="false"
      clear-label="清除" trigger-label="选项" close-label="收起" placeholder="搜索或选择材料"
      empty-text="没有匹配的材料" marginTop="10" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.number-field'">
    <SNativeNumberField v-model="budget" label="复核预算" placeholder="输入金额" :min="0" :max="20" :step=".25" locale="zh-CN"
      :format-options="{ style: 'currency', currency: 'CNY' }" decrease-label="降低预算" increase-label="提高预算"
      invalid-text="请输入有效金额" @change="value => result = value === undefined ? '' : `已提交 ${value}`" />
    <SNativeMotionText :value="result" announce marginTop="6" />
    <SNativeNumberField v-model="ratio" label="抽查比例" :min="0" :max="1" :step=".005" locale="zh-CN"
      :format-options="{ style: 'percent', maximumFractionDigits: 1 }" decrease-label="降低比例" increase-label="提高比例"
      invalid-text="请输入有效比例" marginTop="14" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.number-pad'">
    <SNativeSurface tone="blue" :padding="9" marginBottom="7">
      <StackLayout>
        <SNativeText text="抄录数量" />
        <SNativeMotionText :value="pad || '0'" :reserve="5" announce />
      </StackLayout>
    </SNativeSurface>
    <SNativeToggleButton v-model:selected="dial" label="禁用键盘" size="sm" marginBottom="4" />
    <SNativeNumberPad v-model="pad" label="数量键盘" decimal="," decimal-label="小数点" delete-label="删除" :max-digits="3" :disabled="dial" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.number-stepper'">
    <SNativeText text="归档份数" heading marginBottom="6" />
    <SNativeNumberStepper v-model="count" :min="0" :max="12" label="份数" decrease-label="减少份数" increase-label="增加份数" :reserve="2" />
    <SNativeMotionText :value="count === 12 ? '达到上限' : `${count} 份待归档`" announce marginTop="8" />
    <SNativeDescription text="长按增减按钮可连续调整。" marginTop="5" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.phone-number-field'">
    <SNativePhoneNumberField ref="phoneField" v-model="phone" v-model:country="country" label="联系电话" placeholder="输入本地或国际号码"
      :countries="nations" :format-country="code => names[code] ?? code" locale="zh-CN" country-label="选择区号"
      country-placeholder="搜索国家、地区或区号" country-empty-text="没有匹配的区号" invalid-text="请输入有效电话号码"
      @change="phoneChanged" />
    <SNativeButton label="校验号码" size="sm" marginTop="8" fullWidth @tap="validatePhone" />
    <SNativeMotionText :value="result" announce marginTop="8" />
  </StackLayout>
</template>
