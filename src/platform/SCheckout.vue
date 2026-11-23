<script lang="ts">
export interface CheckoutLine { id: string; label: string; description?: string; image?: string; quantity: number; unitPrice: number }
export interface CheckoutDelivery { id: string; label: string; description?: string; price: number }
export interface CheckoutAddress {
  name: string
  street: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}
export interface CheckoutOrder {
  email: string
  shippingAddress: CheckoutAddress
  billingAddress: CheckoutAddress
  delivery: string
  lines?: readonly CheckoutLine[]
  amounts: { subtotal: number; delivery: number; tax: number; discount: number; total: number; currency: string }
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import SButton from '../components/SButton.vue'
import SCheckbox from '../components/SCheckbox.vue'
import SForm from '../components/SForm.vue'
import SImage from '../components/SImage.vue'
import SInput from '../components/SInput.vue'
import SRadioGroup from '../components/SRadioGroup.vue'
import SRadio from '../components/SRadio.vue'

const props = withDefaults(defineProps<{
  title: string
  lines: readonly CheckoutLine[]
  deliveryOptions: readonly CheckoutDelivery[]
  currency: string
  locale?: string
  factor?: number
  tax?: number
  discount?: number
  paymentReady?: boolean
  submitOrder: (order: CheckoutOrder, signal: AbortSignal) => void | Promise<void>
  labels?: Partial<Record<'contact' | 'email' | 'shipping' | 'billing' | 'sameAddress' | 'name' | 'street' | 'line2' | 'city' | 'region' |
    'postalCode' | 'country' | 'delivery' | 'payment' | 'summary' | 'subtotal' | 'tax' | 'discount' | 'total' | 'submit' | 'failed' | 'success', string>>
}>(), { factor: 100, paymentReady: false, tax: 0, discount: 0 })

const emit = defineEmits<{ complete: [order: CheckoutOrder] }>()
const delivery = defineModel<string>('delivery')
const same = ref(true)
const busy = ref(false)
const failed = ref(false)
const done = ref(false)
const id = useId()
let request: AbortController | undefined
const i18n = computed(() => ({
  contact: 'Contact', email: 'Email', shipping: 'Shipping address', billing: 'Billing address', sameAddress: 'Use shipping address for billing',
  name: 'Full name', street: 'Street address', line2: 'Apartment or suite', city: 'City', region: 'Region',
  postalCode: 'Postal code', country: 'Country', delivery: 'Delivery', payment: 'Payment', summary: 'Order summary',
  subtotal: 'Subtotal', tax: 'Tax', discount: 'Discount', total: 'Total', submit: 'Place order',
  failed: 'Unable to place the order. Try again.', success: 'Order confirmed.',
  ...props.labels,
}))
const formatter = computed(() => new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency }))
const money = (amount: number) => formatter.value.format(amount / Math.max(1, props.factor))
const clean = (value: number) => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
const shipping = computed(() => props.deliveryOptions.find(item => item.id === delivery.value) ?? props.deliveryOptions[0])
const validLines = computed(() => props.lines.filter(line => clean(line.quantity) > 0))
const amounts = computed(() => {
  const subtotal = validLines.value.reduce((sum, line) => sum + clean(line.unitPrice) * clean(line.quantity), 0)
  const delivery = clean(shipping.value?.price ?? 0)
  const tax = clean(props.tax)
  const discount = Math.min(clean(props.discount), subtotal + delivery + tax)
  return { subtotal, delivery, tax, discount, total: subtotal + delivery + tax - discount, currency: props.currency }
})
const addressFields = [
  { key: 'name', autocomplete: 'name', required: true },
  { key: 'street', autocomplete: 'address-line1', required: true },
  { key: 'line2', autocomplete: 'address-line2', required: false },
  { key: 'city', autocomplete: 'address-level2', required: true },
  { key: 'region', autocomplete: 'address-level1', required: false },
  { key: 'postalCode', autocomplete: 'postal-code', required: true },
  { key: 'country', autocomplete: 'country-name', required: true },
] as const
const sections = ['shipping', 'billing'] as const

function readAddress(data: FormData, prefix: string) {
  return Object.fromEntries(addressFields.map(({ key }) => [key, String(data.get(prefix + '-' + key) ?? '').trim()])) as unknown as CheckoutAddress
}

async function submit(_event: SubmitEvent, data: FormData) {
  if (!props.paymentReady || !shipping.value || !validLines.value.length || busy.value || done.value) return
  const email = String(data.get('email') ?? '').trim()
  const shippingAddress = readAddress(data, 'shipping')
  const billingAddress = same.value ? { ...shippingAddress } : readAddress(data, 'billing')
  const order = { email, shippingAddress, billingAddress, delivery: shipping.value.id, amounts: { ...amounts.value },
    lines: validLines.value.map(line => ({ ...line, quantity: clean(line.quantity), unitPrice: clean(line.unitPrice) })) }
  const controller = new AbortController()
  request = controller
  busy.value = true
  failed.value = false
  try {
    await props.submitOrder(order, controller.signal)
    if (!controller.signal.aborted) {
      done.value = true
      emit('complete', order)
    }
  } catch {
    if (!controller.signal.aborted) failed.value = true
  } finally {
    if (request === controller) { request = undefined; busy.value = false }
  }
}
onBeforeUnmount(() => request?.abort())
</script>

<template>
  <section class="sy-checkout" :aria-labelledby="id">
    <h2 :id="id">{{ title }}</h2>
    <SForm class="sy-checkout__layout" :aria-busy="busy" @submit="submit">
      <div class="sy-checkout__fields">
        <fieldset :disabled="busy || done">
          <legend>{{ i18n.contact }}</legend>
          <SInput name="email" type="email" autocomplete="email" :label="i18n.email" required />
          <slot name="contact" :disabled="busy || done" />
        </fieldset>
        <template v-for="part in sections" :key="part">
          <fieldset v-show="part !== 'billing' || !same" :disabled="busy || done || part === 'billing' && same">
            <legend>{{ i18n[part] }}</legend>
            <div class="sy-checkout__address">
              <SInput v-for="field in addressFields" :key="field.key" :name="part + '-' + field.key" :label="i18n[field.key]"
                :autocomplete="part + ' ' + field.autocomplete" :required="field.required" />
            </div>
          </fieldset>
        </template>
        <SCheckbox v-model="same" :disabled="busy || done">{{ i18n.sameAddress }}</SCheckbox>
        <fieldset v-if="deliveryOptions.length" :disabled="busy || done">
          <legend>{{ i18n.delivery }}</legend>
          <SRadioGroup :model-value="shipping?.id" :aria-label="i18n.delivery" @update:model-value="delivery = $event">
            <SRadio v-for="option in deliveryOptions" :key="option.id" :value="option.id">
              <strong>{{ option.label }} · {{ money(option.price) }}</strong>
              <small v-if="option.description">{{ option.description }}</small>
            </SRadio>
          </SRadioGroup>
        </fieldset>
        <fieldset :disabled="busy || done">
          <legend>{{ i18n.payment }}</legend>
          <slot name="payment" :amount="amounts.total" :currency="currency" :disabled="busy || done" />
        </fieldset>
        <slot name="extras" :disabled="busy || done" />
      </div>
      <aside class="sy-checkout__summary" :aria-label="i18n.summary">
        <h3>{{ i18n.summary }}</h3>
        <ul role="list">
          <li v-for="line in lines" :key="line.id">
            <SImage v-if="line.image" class="sy-checkout__thumbnail" :src="line.image" alt="" :width="44" :height="44" placeholder />
            <span><strong>{{ line.label }}</strong><small v-if="line.description">{{ line.description }}</small>
              <small v-if="!$slots.quantity">× {{ clean(line.quantity) }}</small></span>
            <span>{{ money(clean(line.unitPrice) * clean(line.quantity)) }}</span>
            <div v-if="$slots.quantity" class="sy-checkout__quantity"><slot name="quantity" :line="line" :disabled="busy || done" /></div>
          </li>
        </ul>
        <slot name="discount" :disabled="busy || done" />
        <dl>
          <div><dt>{{ i18n.subtotal }}</dt><dd>{{ money(amounts.subtotal) }}</dd></div>
          <div><dt>{{ i18n.delivery }}</dt><dd>{{ money(amounts.delivery) }}</dd></div>
          <div><dt>{{ i18n.tax }}</dt><dd>{{ money(amounts.tax) }}</dd></div>
          <div v-if="amounts.discount"><dt>{{ i18n.discount }}</dt><dd>−{{ money(amounts.discount) }}</dd></div>
          <div class="sy-checkout__total"><dt>{{ i18n.total }}</dt><dd>{{ money(amounts.total) }}</dd></div>
        </dl>
        <p v-if="failed" class="sy-sign-in__error" role="alert">{{ i18n.failed }}</p>
        <p v-if="done" role="status">{{ i18n.success }}</p>
        <SButton type="submit" :loading="busy" :disabled="done || !paymentReady || !shipping || !validLines.length">
          {{ i18n.submit }} · {{ money(amounts.total) }}
        </SButton>
        <slot v-if="done" name="complete" />
      </aside>
    </SForm>
  </section>
</template>
