<script setup lang="ts">
import { computed, ref } from 'vue'
import SBrandTheme from '../src/components/SBrandTheme.vue'
import SCard from '../src/components/SCard.vue'
import SInput from '../src/components/SInput.vue'
import SSelect from '../src/components/SSelect.vue'
import SSwitch from '../src/components/SSwitch.vue'
import { brandRuleKey, type BrandComponentRule } from '../src/platform/brand-rules'
import type { BrandMode, BrandTheme } from '../src/platform/theme-workspace'

const props = defineProps<{ brand: BrandTheme; mode: BrandMode }>()
const options = [
  { value: 'soft', label: '淡' },
  { value: 'default', label: '标准' },
  { value: 'strong', label: '深' },
]
const levels = [
  { name: '低', elevation: 'low', geometry: '0 2px 7px', opacity: 14 },
  { name: '中', elevation: 'med', geometry: '0 6px 16px', opacity: 18 },
  { name: '高', elevation: 'high', geometry: '0 12px 28px', opacity: 22 },
] as const
const strength = ref('default')
const showBevel = ref(false)
const invalid = ref(false)
const reference = ref('PRJ-042')
const factor = computed(() => strength.value === 'soft' ? .5 : strength.value === 'strong' ? 1.5 : 1)
const theme = computed<BrandTheme>(() => {
  const shadows = Object.fromEntries(levels.map(({ elevation, geometry, opacity }) => [
    '--sy-shadow-' + elevation, `${geometry} color-mix(in srgb, var(--sy-text) ${opacity * factor.value}%, transparent)`,
  ]))
  const field: BrandComponentRule = {
    target: 'input', declarations: {
      'background-color': 'var(--sy-canvas)',
      'border-color': 'var(--sy-border)',
      'box-shadow': showBevel.value ? 'inset 1px 1px 0 var(--sy-border-strong), inset -1px -1px 0 var(--sy-surface)' : 'none',
    },
  }
  return {
    ...props.brand, id: 'shadow-example',
    design: { ...props.brand.design, shadows: { ...props.brand.design?.shadows, [props.mode]: shadows } },
    rules: { ...props.brand.rules, [brandRuleKey(field)]: field },
  }
})
</script>

<template>
  <div class="shadow-demo">
    <SSelect v-model="strength" label="阴影浓度" :options="options" />
    <SBrandTheme :theme="theme" :mode="mode" class="shadow-demo__cards" role="group" aria-label="阴影层级预览">
      <SCard v-for="level in levels" :key="level.elevation" :elevation="level.elevation" class="shadow-demo__card">
        <strong>{{ level.name }}</strong>
      </SCard>
    </SBrandTheme>
    <SBrandTheme :theme="theme" :mode="mode" class="shadow-demo__field" role="group" aria-label="输入框阴影预览">
      <div class="shadow-demo__field-controls">
        <SSwitch v-model="showBevel">内凹描边</SSwitch>
        <SSwitch v-model="invalid">模拟校验失败</SSwitch>
      </div>
      <SInput v-model="reference" label="资料编号"
        :status="invalid ? { type: 'error', message: '这个编号已被使用。', variant: 'tooltip' } : undefined" />
    </SBrandTheme>
  </div>
</template>

<style scoped>
.shadow-demo { display: grid; gap: var(--sy-space-4); }
.shadow-demo__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sy-space-4);
  padding: var(--sy-space-3);
  background-color: var(--sy-canvas);
  border-radius: var(--sy-radius-md);
}
.shadow-demo__card { background-color: var(--sy-canvas); text-align: center; }
.shadow-demo__field { display: grid; gap: var(--sy-space-3); background-color: var(--sy-canvas); }
.shadow-demo__field-controls { display: flex; flex-wrap: wrap; gap: var(--sy-space-3) var(--sy-space-4); }
</style>
