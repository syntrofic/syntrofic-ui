<script setup lang="ts">
import { ref } from 'vue'
import Address, { emptyDemoAddress } from './DemoOrderAddress.vue'
import Discount from './DemoOrderDiscount.vue'
import Payment, { emptyDemoPayment } from './DemoPaymentFields.vue'

defineProps<{ kind: string }>()
const address = ref(emptyDemoAddress())
const discount = ref(0)
const payment = ref(emptyDemoPayment())
</script>

<template>
  <div class="checkout-block">
    <Address v-if="kind === 'checkout-address'" v-model="address" kind="shipping" />
    <Discount v-else-if="kind === 'checkout-discount'" v-model="discount" />
    <Payment v-else v-model="payment" />
  </div>
</template>

<style scoped>
.checkout-block { max-width: 36rem; margin-inline: auto; padding: clamp(1rem, 4vw, 2rem); }
</style>
