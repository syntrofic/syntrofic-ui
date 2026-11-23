<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SCard, SMotionText, useTheme, useThemeName } from '../src'

defineProps<{ title: string }>()
const themeName = useThemeName()
const { token } = useTheme()
const accent = computed(() => token('--sy-accent') ?? '')
const saved = ref(false)
</script>

<template>
  <SCard class="theme-scope-card" :aria-label="title" role="region">
    <template #header>
      <div class="theme-scope-card__header">
        <h3>{{ title }}</h3>
        <SBadge label="可发布" tone="green" />
      </div>
    </template>
    <dl class="theme-scope-card__tokens">
      <div><dt>主题名称</dt><dd><SMotionText :value="themeName ?? '默认'" /></dd></div>
      <div>
        <dt>强调色</dt>
        <dd>
          <span class="theme-scope-card__swatch" aria-hidden="true" :style="{ backgroundColor: accent }" />
          <SMotionText :value="accent" />
        </dd>
      </div>
    </dl>
    <template #footer>
      <SButton size="sm" :aria-pressed="saved" aria-label="保存此主题示例" @click="saved = !saved">
        <SMotionText :value="saved ? '已保存' : '保存示例'" />
      </SButton>
    </template>
  </SCard>
</template>

<style scoped>
.theme-scope-card { min-inline-size: 0; --sy-card-fill: var(--sy-canvas); }
.theme-scope-card__header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sy-space-1); }
.theme-scope-card h3 { font-size: 1rem; margin: 0; }
.theme-scope-card__tokens { display: grid; gap: var(--sy-space-2); margin: 0; }
.theme-scope-card__tokens > div { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sy-space-2); }
.theme-scope-card__tokens :is(dt, dd) { margin: 0; }
.theme-scope-card__tokens dt { color: var(--sy-text-muted); }
.theme-scope-card__tokens dd { display: flex; align-items: center; gap: var(--sy-space-1); font-variant-numeric: tabular-nums; }
.theme-scope-card__swatch {
  inline-size: .9em; block-size: .9em; border-radius: var(--sy-radius-sm);
  transition: background-color var(--sy-motion-replace) var(--sy-ease-settle);
}
</style>
