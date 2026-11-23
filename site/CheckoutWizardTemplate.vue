<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { SButton, SCheckbox, SFormWizard, SImage, SInput, SMetadataList, SNumberStepper, SSelect, STextArea, type WizardStep } from '../src'
import DemoOrderAddress, { emptyDemoAddress } from './DemoOrderAddress.vue'
import DemoOrderDiscount from './DemoOrderDiscount.vue'
import DemoPaymentFields, { emptyDemoPayment } from './DemoPaymentFields.vue'
import deliveryArea from '../preview/assets/delivery-area.png'

const steps: WizardStep[] = [
  { id: 'cart', title: '购物车', description: '确认商品和数量。' },
  { id: 'shipping', title: '收货信息', description: '填写收件人与联系信息。' },
  { id: 'delivery', title: '配送', description: '选择配送服务和礼品选项。' },
  { id: 'payment', title: '付款', description: '核对账单地址并使用演示付款渠道。' },
]
const products = [
  { id: 'desk', label: '桌面地图', cents: 6800, focus: 'center' },
  { id: 'folded', label: '折页地图', cents: 4800, focus: 'left' },
] as const
const deliveries = [
  { value: 'standard', label: '标准配送', cents: 600 },
  { value: 'express', label: '加急配送', cents: 1800 },
  { value: 'priority', label: '次日配送', cents: 2800 },
]
const lines = ref<{ id: string; quantity: number }[]>([{ id: 'desk', quantity: 1 }])
const current = ref<string>()
const email = ref('')
const shipping = ref(emptyDemoAddress())
const billing = ref(emptyDemoAddress())
const sameAddress = ref(true)
const delivery = ref('standard')
const wrapping = ref(false)
const deliveryNote = ref('')
const discountRate = ref(0)
const payment = ref(emptyDemoPayment())
const paymentReady = ref(false)
const completed = ref(false)
const receipt = useTemplateRef<HTMLHeadingElement>('receipt')
const displayLines = computed(() => products.flatMap(product => {
  const line = lines.value.find(item => item.id === product.id)
  return line ? [{ ...product, quantity: line.quantity }] : []
}))
const amounts = computed(() => {
  const subtotal = displayLines.value.reduce((sum, item) => sum + item.cents * item.quantity, 0)
  const shipping = subtotal ? (deliveries.find(option => option.value === delivery.value)?.cents ?? 0) : 0
  const gift = subtotal && wrapping.value ? 400 : 0
  const discount = Math.round(subtotal * discountRate.value / 100)
  return { subtotal, shipping, gift, discount, total: subtotal + shipping + gift - discount }
})
const formatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const price = (cents: number) => formatter.format(cents / 100)
const summary = computed(() => [
  { id: 'subtotal', label: '商品小计', value: price(amounts.value.subtotal) },
  { id: 'shipping', label: '配送', value: price(amounts.value.shipping) },
  { id: 'gift', label: '包装', value: price(amounts.value.gift) },
  ...(amounts.value.discount ? [{ id: 'discount', label: '优惠', value: '−' + price(amounts.value.discount) }] : []),
  { id: 'total', label: '应付金额', value: price(amounts.value.total) },
])

function setQuantity(id: string, value: number | null | undefined) {
  if (!value) return
  const line = lines.value.find(item => item.id === id)
  if (line) line.quantity = value
  else lines.value.push({ id, quantity: value })
}

function validate(step: WizardStep, data: FormData) {
  if (step.id === 'cart' && !displayLines.value.length) return '请至少添加一件商品。'
  if (step.id === 'shipping' || step.id === 'payment' && !sameAddress.value) {
    const prefix = step.id === 'shipping' ? 'shipping' : 'billing'
    if (['name', 'street', 'city'].some(key => !String(data.get(prefix + '-' + key) ?? '').trim())) return '请补全地址必填项。'
  }
  if (step.id === 'payment' && !paymentReady.value) return '请填写演示付款信息。'
}

function startOver() {
  lines.value = [{ id: 'desk', quantity: 1 }]
  current.value = 'cart'
  email.value = ''
  shipping.value = emptyDemoAddress()
  billing.value = emptyDemoAddress()
  sameAddress.value = true
  delivery.value = 'standard'
  wrapping.value = false
  deliveryNote.value = ''
  discountRate.value = 0
  payment.value = emptyDemoPayment()
  paymentReady.value = false
  completed.value = false
}

watch(receipt, node => node?.focus({ preventScroll: true }))
</script>

<template>
  <section class="checkout-wizard">
    <div class="checkout-wizard__layout">
      <div v-if="completed" class="checkout-wizard__card" role="status">
        <h2 ref="receipt" tabindex="-1">已生成 {{ price(amounts.total) }} 的演示订单。</h2>
        <p>{{ shipping.name }} · {{ shipping.city }} · {{ deliveries.find(option => option.value === delivery)?.label }}</p>
        <SButton variant="secondary" @click="startOver">创建新订单</SButton>
      </div>
      <SFormWizard v-else v-model="current" :steps="steps" :validate="validate" validate-forward-navigation label="创建演示订单"
        previous-label="上一步" next-label="继续" finish-label="确认订单" @finish="completed = true">
        <template #default="{ step }">
          <template v-if="step.id === 'cart'">
            <ul v-if="displayLines.length" class="checkout-wizard__lines" role="list">
              <li v-for="item in displayLines" :key="item.id">
                <SImage class="checkout-wizard__thumbnail" :src="deliveryArea" alt="" :width="44" :height="44" placeholder
                  :style="{ '--sy-image-position': item.focus }" />
                <span><strong>{{ item.label }}</strong><small>{{ price(item.cents) }}</small></span>
                <SNumberStepper :model-value="item.quantity" :name="'quantity-' + item.id" :min="1" :max="8" :label="item.label + '数量'"
                  :increase-label="item.id === 'desk' ? '增加数量' : '增加折页数量'" :decrease-label="item.id === 'desk' ? '减少数量' : '减少折页数量'"
                  required @update:model-value="setQuantity(item.id, $event)" />
                <SButton variant="ghost" size="sm" @click="lines = lines.filter(line => line.id !== item.id)">移除{{ item.label }}</SButton>
              </li>
            </ul>
            <p v-else>购物车为空。请选择要购买的地图。</p>
            <div v-if="displayLines.length < products.length" class="checkout-wizard__add">
              <template v-for="product in products" :key="product.id">
                <SButton v-if="!lines.some(line => line.id === product.id)" size="sm" variant="secondary"
                  @click="setQuantity(product.id, 1)">添加{{ product.label }}</SButton>
              </template>
            </div>
            <DemoOrderDiscount v-model="discountRate" />
          </template>
          <template v-else-if="step.id === 'shipping'">
            <SInput v-model="email" name="email" label="联系邮箱" type="email" autocomplete="email" required />
            <DemoOrderAddress v-model="shipping" kind="shipping" />
          </template>
          <template v-else-if="step.id === 'delivery'">
            <SSelect v-model="delivery" :options="deliveries" name="delivery" label="配送方式" required />
            <SCheckbox v-model="wrapping" name="wrapping">增加礼品包装 · ¥4.00</SCheckbox>
            <STextArea v-model="deliveryNote" name="delivery-note" :label="wrapping ? '礼品留言' : '配送备注'" :rows="2" maxlength="160" />
          </template>
          <template v-else>
            <DemoPaymentFields v-model="payment" v-model:ready="paymentReady" />
            <SCheckbox v-model="sameAddress">账单使用配送地址</SCheckbox>
            <fieldset v-if="!sameAddress" class="checkout-wizard__billing"><legend>账单地址</legend><DemoOrderAddress v-model="billing" kind="billing" /></fieldset>
          </template>
        </template>
      </SFormWizard>
      <aside class="checkout-wizard__card checkout-wizard__summary" aria-label="订单摘要">
        <h3>订单摘要</h3>
        <ul aria-label="订单商品" class="checkout-wizard__summary-lines" role="list">
          <li v-for="item in displayLines" :key="item.id"><span>{{ item.label }} × {{ item.quantity }}</span><span>{{ price(item.cents * item.quantity) }}</span></li>
        </ul>
        <SMetadataList :items="summary" />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.checkout-wizard { container-type: inline-size; }
.checkout-wizard__layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(12rem, 2fr); gap: var(--sy-space-3); align-items: start; }
.checkout-wizard__card { display: grid; align-content: start; gap: var(--sy-space-2); min-width: 0; padding: var(--sy-space-3); background: var(--sy-surface-subtle); border-radius: var(--sy-radius-md); }
.checkout-wizard__card :is(h2, h3, p) { margin: 0; }
.checkout-wizard__card > button { justify-self: start; }
.checkout-wizard__summary { position: sticky; inset-block-start: var(--sy-checkout-sticky-top, 4.3rem); }
.checkout-wizard__lines, .checkout-wizard__summary-lines { display: grid; gap: var(--sy-space-2); margin: 0; padding: 0; list-style: none; }
.checkout-wizard__lines li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--sy-space-2); }
.checkout-wizard__lines li > button { grid-column: 2 / -1; justify-self: end; }
.checkout-wizard__thumbnail { inline-size: 44px; border-radius: var(--sy-radius-sm); overflow: clip; }
.checkout-wizard__lines small { display: block; color: var(--sy-text-muted); font-size: .9375rem; }
.checkout-wizard__summary-lines li, .checkout-wizard__add { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--sy-space-2); }
.checkout-wizard__billing { min-width: 0; margin: 0; padding: var(--sy-space-2) 0; border: 0; }
@container (max-width: 620px) {
  .checkout-wizard__layout { grid-template-columns: minmax(0, 1fr); }
  .checkout-wizard__summary { position: static; grid-row: 1; }
}
</style>
