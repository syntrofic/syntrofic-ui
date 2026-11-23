<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, SInput } from '../src'

defineProps<{ disabled?: boolean }>()
const rate = defineModel<number>({ required: true })
const control = useTemplateRef('control')
const code = ref('')
const error = ref('')
const codes = { MAP10: 10, TEAM20: 20 }

function apply() {
  const value = code.value.trim().toUpperCase()
  const discount = Object.hasOwn(codes, value) ? codes[value as keyof typeof codes] : 0
  error.value = discount ? '' : '该优惠码不可用。'
  if (!discount) return
  rate.value = discount
}

function remove() {
  rate.value = 0
  code.value = ''
  error.value = ''
  control.value?.focus()
}
</script>

<template>
  <div class="demo-order-discount">
    <SInput ref="control" v-model="code" label="优惠码" placeholder="MAP10" :error="error || undefined" :disabled="disabled"
      @update:model-value="error = ''" @keydown.enter.prevent="apply" />
    <SButton variant="secondary" :disabled="disabled || !code.trim()" @click="apply">应用优惠码</SButton>
    <Transition name="discount">
      <div v-if="rate" class="demo-order-discount__disclosure">
        <div class="demo-order-discount__applied">
          <span role="status">
            <Transition name="discount-text" mode="out-in">
              <span :key="rate">{{ rate === 10 ? 'MAP10' : 'TEAM20' }} · 减免 {{ rate }}%</span>
            </Transition>
          </span>
          <SButton variant="ghost" size="sm" :disabled="disabled" @click="remove">移除优惠码</SButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.demo-order-discount { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sy-space-2); align-items: start; }
.demo-order-discount > button { margin-top: 1.4rem; }
.demo-order-discount__disclosure { grid-column: 1 / -1; display: grid; grid-template-rows: 1fr; }
.demo-order-discount__applied { min-height: 0; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.discount-enter-active, .discount-leave-active {
  transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle);
}
.discount-enter-from, .discount-leave-to { grid-template-rows: 0fr; opacity: 0; }
.discount-text-enter-active, .discount-text-leave-active { transition: opacity var(--sy-duration) var(--sy-ease-settle); }
.discount-text-enter-from, .discount-text-leave-to { opacity: 0; }
</style>
