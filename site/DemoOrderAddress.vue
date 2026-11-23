<script lang="ts">
export interface DemoOrderAddress {
  name: string
  street: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}
export const emptyDemoAddress = (): DemoOrderAddress => ({ name: '', street: '', line2: '', city: '', region: '', postalCode: '', country: 'cn' })
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { SInput, SSelect } from '../src'

const props = defineProps<{ kind: 'shipping' | 'billing' }>()
const model = defineModel<DemoOrderAddress>({ required: true })
const countries = [{ value: 'cn', label: '中国' }, { value: 'us', label: '美国' }, { value: 'ca', label: '加拿大' }, { value: 'gb', label: '英国' }]
const postcodes: Record<string, { pattern: string; example: string }> = {
  cn: { pattern: '[0-9]{6}', example: '200000' },
  us: { pattern: '[0-9]{5}(-[0-9]{4})?', example: '10001' },
  ca: { pattern: '[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]', example: 'M5V 2T6' },
  gb: { pattern: '[A-Za-z][A-Za-z]?[0-9][0-9A-Za-z]? ?[0-9][A-Za-z]{2}', example: 'SW1A 1AA' },
}
const postal = computed(() => postcodes[model.value.country] ?? postcodes.cn)
const fields = [
  { key: 'name', name: '收件人', autocomplete: 'name', required: true, wide: false },
  { key: 'street', name: '街道地址', autocomplete: 'address-line1', required: true, wide: true },
  { key: 'line2', name: '楼栋或房间', autocomplete: 'address-line2', required: false, wide: true },
  { key: 'city', name: '城市', autocomplete: 'address-level2', required: true, wide: false },
  { key: 'region', name: '省份或州', autocomplete: 'address-level1', required: true, wide: false },
] as const
const autocomplete = (token: string) => `${props.kind} ${token}`

function update(key: keyof DemoOrderAddress, value: string | undefined) {
  model.value = { ...model.value, [key]: value ?? '' }
}
</script>

<template>
  <div class="demo-order-address">
    <SSelect :model-value="model.country" :options="countries" :name="kind + '-country'" label="国家或地区" required
      @update:model-value="update('country', $event)" />
    <SInput v-for="field in fields" :key="field.key" :model-value="model[field.key]" :name="kind + '-' + field.key" :label="field.name"
      :class="{ 'demo-order-address__wide': field.wide }" :autocomplete="autocomplete(field.autocomplete)"
      :required="field.required && (field.key !== 'region' || model.country !== 'gb')" @update:model-value="update(field.key, $event)" />
    <SInput :model-value="model.postalCode" :name="kind + '-postalCode'" label="邮编" :autocomplete="autocomplete('postal-code')" :pattern="postal.pattern"
      :placeholder="postal.example" :inputmode="model.country === 'cn' || model.country === 'us' ? 'numeric' : undefined" required
      @update:model-value="update('postalCode', $event)" />
  </div>
</template>

<style scoped>
.demo-order-address { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr)); gap: var(--sy-space-2); }
.demo-order-address__wide { grid-column: 1 / -1; }
</style>
