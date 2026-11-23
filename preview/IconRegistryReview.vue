<script setup lang="ts">
import { defineComponent, h, onMounted, onScopeDispose } from 'vue'
import { SBrandTheme, SButton, SIcon, createBrandTheme, registerIcons, useIcon } from '../src'

const theme = createBrandTheme('review-mark', '品牌图标')
const supplied = { 'review:mark': 'M4 20L12 4l8 16Z' }
const Orb = defineComponent(() => () => h('svg', { viewBox: '0 0 24 24' }, [h('circle', { cx: 12, cy: 12, r: 7 })]))
const Headless = defineComponent(() => {
  const icon = useIcon('review:mark')
  return () => h('svg', { viewBox: '0 0 24 24', width: '1em', height: '1em', role: 'img', 'aria-label': '组合式图标' },
    [h('path', { d: icon.value?.path, stroke: 'currentColor', fill: 'none' })])
})
let restore: (() => void) | undefined
onMounted(() => {
  const root = document.documentElement
  const previous = root.dataset.syBrand
  const unregisterDefault = registerIcons({ 'review:mark': 'M5 12h14' })
  const unregisterBrand = registerIcons({
    'review:mark': ({ size, variant }) => variant === 'filled' && size === 'lg'
      ? { path: 'M4 4h16v16H4z', fill: 'currentColor' }
      : 'M12 4v16',
    'review:orb': () => ({ component: Orb }),
  }, { theme: theme.id })
  restore = () => {
    if (root.dataset.syBrand === theme.id) {
      if (previous === undefined) delete root.dataset.syBrand
      else root.dataset.syBrand = previous
    }
    unregisterBrand()
    unregisterDefault()
  }
})
onScopeDispose(() => restore?.())
function themeRoot() { document.documentElement.dataset.syBrand = theme.id }
</script>

<template>
  <section class="review__row" aria-label="图标注册与主题">
    <SIcon name="review:mark" label="全局标记" size="lg" variant="filled" />
    <Headless />
    <SBrandTheme :theme="theme" class="review__row">
      <SIcon name="review:mark" label="主题标记" size="lg" variant="filled" />
      <SIcon name="review:mark" label="小号主题标记" size="sm" variant="filled" />
      <SIcon name="review:orb" label="主题图形组件" size="sm" />
      <SBrandTheme :theme="theme" :icons="supplied">
        <SIcon name="review:mark" label="局部标记" size="sm" />
      </SBrandTheme>
    </SBrandTheme>
    <SButton size="sm" variant="secondary" @click="themeRoot">应用根部图标主题</SButton>
  </section>
</template>
