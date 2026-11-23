<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SInput, SProgressBar, SRating, applyBrandPatch, brandThemeStyle, createBrandTheme, type BrandMode } from '../src'
const props = defineProps<{ query: string }>()
const params = new URLSearchParams(props.query)
const mode: BrandMode = params.get('theme') === 'dark' ? 'dark' : 'light'
const theme = createBrandTheme('phone')
const change = (key: 'accent'|'canvas'|'surface'|'text'|'accent-on'|'focus'|'danger'|'border') => {
  const value = params.get(key)
  return value && /^#[0-9a-f]{6}$/i.test(value) ? [{type:'color' as const, mode, key, value}] : []
}
const radius = params.get('radius')
const phone = applyBrandPatch(theme, { revision:0, changes:[
  ...(['accent','canvas','surface','text','accent-on','focus','danger','border'] as const).flatMap(change),
  ...(radius && Number(radius) >= 0 && Number(radius) <= 45 ? [{type:'settings' as const,value:{radius:Number(radius)}}] : []),
] })
const styles = computed(() => brandThemeStyle(phone,mode))
const value = ref(52)
const rating = ref(3.5)
</script>
<template>
  <main class="workbench__main sy-agent-section" :data-sy-theme="mode" :style="{...styles, background:'var(--sy-canvas)',color:'var(--sy-text)'}">
    <h1>手机主题预览</h1>
    <SInput label="资料项目" model-value="品牌规范" />
    <SProgressBar :value="value" label="复核进度" />
    <SRating v-model="rating" label="材料评分" :step=".5" />
    <SButton size="sm" @click="value = value===52?78:52">更新进度</SButton>
  </main>
</template>
