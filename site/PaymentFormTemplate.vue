<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { SCheckout, SCheckbox, SInput, SLink, SNumberStepper, STextArea, type CheckoutOrder } from '../src'
import DemoOrderDiscount from './DemoOrderDiscount.vue'
import DemoPaymentFields, { emptyDemoPayment } from './DemoPaymentFields.vue'
import deliveryArea from '../preview/assets/delivery-area.png'

const quantity = ref<number | undefined>(2)
const discountRate = ref(0)
const gift = ref(false)
const payment = ref(emptyDemoPayment())
const paymentReady = ref(false)
const complete = ref<CheckoutOrder>()
const receipt = useTemplateRef<HTMLElement>('receipt')
const delivery = [
  { id: 'regular', label: '标准配送', description: '3–5 个工作日', price: 600 },
  { id: 'express', label: '加急配送', description: '1–2 个工作日', price: 1800 },
]
const order = computed(() => [{ id: 'map', label: '交付地图 · 桌面版', image: deliveryArea, unitPrice: 6800, quantity: quantity.value ?? 0 }])
const tax = computed(() => (quantity.value ?? 0) * 160)
const discount = computed(() => 500 + Math.round((quantity.value ?? 0) * 6800 * discountRate.value / 100))
const formatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })

function submitSample(order: CheckoutOrder) { complete.value = order }
watch(receipt, node => node?.focus({ preventScroll: true }))
</script>

<template>
  <SCheckout title="确认演示订单" :lines="order" :delivery-options="delivery" currency="CNY" locale="zh-CN"
    :tax="tax" :discount="discount" :payment-ready="paymentReady" :submit-order="submitSample"
    :labels="{ contact: '联系信息', email: '联系邮箱', shipping: '配送地址', billing: '账单地址', sameAddress: '账单使用配送地址',
      name: '收件人', street: '街道地址', line2: '楼栋或房间', city: '城市', region: '省份', postalCode: '邮编',
      country: '国家或地区', delivery: '配送', payment: '付款方式', summary: '订单摘要', subtotal: '商品小计', tax: '税费',
      discount: '优惠', total: '应付金额', submit: '确认演示订单', failed: '订单生成失败，请重试。', success: '已确认演示订单。' }">
    <template #contact="{ disabled }">
      <SInput name="phone" type="tel" autocomplete="tel" label="联系电话" :disabled="disabled" />
      <SCheckbox :disabled="disabled" name="offers">接收活动和商品消息</SCheckbox>
    </template>
    <template #payment="{ disabled }"><DemoPaymentFields v-model="payment" v-model:ready="paymentReady" :disabled="disabled" /></template>
    <template #extras="{ disabled }">
      <fieldset :disabled="disabled">
        <legend>礼品选项</legend>
        <SCheckbox v-model="gift" :disabled="disabled" name="gift">添加礼品留言</SCheckbox>
        <template v-if="gift">
          <SInput label="礼品收件人" name="gift-to" required :disabled="disabled" />
          <SInput label="寄件人" name="gift-from" :disabled="disabled" />
          <STextArea label="礼品留言" name="gift-message" :rows="2" :disabled="disabled" maxlength="160" required />
        </template>
      </fieldset>
    </template>
    <template #quantity="{ disabled }">
      <SNumberStepper v-model="quantity" name="quantity" :min="1" :max="8" label="地图数量" :disabled="disabled" required
        increase-label="增加地图数量" decrease-label="减少地图数量" />
    </template>
    <template #discount="{ disabled }"><DemoOrderDiscount v-model="discountRate" :disabled="disabled" /></template>
    <template #complete>
      <div v-if="complete" ref="receipt" tabindex="-1" class="payment-form__receipt" aria-label="订单确认">
        <strong>{{ formatter.format(complete.amounts.total / 100) }}</strong>
        <span>{{ complete.shippingAddress.name }} · {{ complete.shippingAddress.city }}</span>
        <SLink class="sy-button" href="/templates/product-gallery/" data-variant="secondary">继续选购</SLink>
      </div>
    </template>
  </SCheckout>
</template>

<style scoped>
.payment-form__receipt { display: grid; justify-items: start; gap: var(--sy-space-2); }
</style>
