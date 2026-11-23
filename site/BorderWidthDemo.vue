<script setup lang="ts">
import { computed, ref } from 'vue'
import SBrandTheme from '../src/components/SBrandTheme.vue'
import SButton from '../src/components/SButton.vue'
import SCard from '../src/components/SCard.vue'
import SInput from '../src/components/SInput.vue'
import SSelect from '../src/components/SSelect.vue'
import SSwitch from '../src/components/SSwitch.vue'
import { brandRuleKey, type BrandComponentRule } from '../src/platform/brand-rules'
import type { BrandMode, BrandTheme } from '../src/platform/theme-workspace'

const props = defineProps<{ brand: BrandTheme; mode: BrandMode }>()
const options = [1, 2, 3, 4].map(width => ({ value: width + 'px', label: width + ' px' }))
const width = ref('1px')
const keepInput = ref(false)
const name = ref('品牌资料')
const theme = computed(() => {
  const input: BrandComponentRule = {
    target: 'input', declarations: {
      'border-color': 'var(--sy-border)',
      ...(keepInput.value && { '--sy-border-width': '1px' }),
    },
  }
  const key = brandRuleKey(input)
  return {
    ...props.brand, id: 'border-width-example',
    design: { ...props.brand.design, tokens: { ...props.brand.design?.tokens, '--sy-border-width': width.value } },
    rules: { ...props.brand.rules, [key]: { ...input, declarations: { ...props.brand.rules?.[key]?.declarations, ...input.declarations } } },
  }
})
</script>

<template>
  <div class="border-width-demo">
    <div class="border-width-demo__controls">
      <SSelect v-model="width" label="全局边框厚度" :options="options" />
      <SSwitch v-model="keepInput">保留输入框的 1 px 边框</SSwitch>
    </div>
    <SBrandTheme :theme="theme" :mode="mode" role="group" aria-label="边框预览">
      <SCard class="border-width-demo__card">
        <template #header><strong>资料评审</strong></template>
        <SInput v-model="name" label="评审名称" />
        <template #footer><SButton variant="secondary" class="border-width-demo__action">查看详情</SButton></template>
      </SCard>
    </SBrandTheme>
  </div>
</template>

<style scoped>
.border-width-demo, .border-width-demo__controls { display: grid; gap: var(--sy-space-3); }
.border-width-demo__controls {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  align-items: end;
}
.border-width-demo__card { background: var(--sy-canvas); }
.border-width-demo__action { --sy-button-border: var(--sy-border); }
</style>
