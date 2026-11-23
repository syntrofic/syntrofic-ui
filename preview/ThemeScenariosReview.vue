<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBrandTheme, SSegment, createBrandTheme } from '../src'
import ThemeScopeCard from './ThemeScopeCard.vue'

const themes = [
  createBrandTheme('studio-sage', '灰绿', 'matcha'),
  createBrandTheme('studio-ink', '灰紫', 'gothic'),
  createBrandTheme('studio-clay', '陶土', 'chocolate'),
]
const selected = ref<string | null>(themes[0].id)
const active = computed(() => themes.find(theme => theme.id === selected.value) ?? themes[0])
const choices = themes.map(theme => ({ value: theme.id, label: theme.name }))
</script>

<template>
  <section class="theme-scenarios" aria-label="应用与切换主题">
    <SSegment v-model="selected" :items="choices" label="示例主题" size="sm" />
    <SBrandTheme :theme="active" mode="light" class="theme-scenarios__nested">
      <ThemeScopeCard title="外层工作区" />
      <SBrandTheme :theme="themes[1]" mode="light">
        <ThemeScopeCard title="局部出版区" />
      </SBrandTheme>
    </SBrandTheme>
  </section>
  <section class="theme-scenarios theme-scenarios__compare" aria-label="并列主题对照">
    <SBrandTheme v-for="theme in themes.slice(0, 2)" :key="theme.id" :theme="theme" mode="light">
      <ThemeScopeCard :title="theme.name + '工作区'" />
    </SBrandTheme>
  </section>
</template>

<style scoped>
.theme-scenarios, .theme-scenarios__nested { display: grid; gap: var(--sy-space-3); min-inline-size: 0; grid-template-columns: minmax(0, 1fr); }
.theme-scenarios__compare, .theme-scenarios__nested { grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
</style>
