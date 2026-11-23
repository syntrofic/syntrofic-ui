<script lang="ts">
export interface ThemePreviewPage { id: string; label: string; kind?: 'overview' | 'components' | 'colors' | 'template' }
export interface ThemePreviewConfig { version: 1; pages: readonly ThemePreviewPage[] }
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SBrandTheme from '../components/SBrandTheme.vue'
import SBadge from '../components/SBadge.vue'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SSegment from '../components/SSegment.vue'
import SSwitch from '../components/SSwitch.vue'
import SThemeColors from '../internal/SThemeColors.vue'
import type { BrandMode, BrandTheme } from './theme-workspace'

const props = defineProps<{ theme: BrandTheme; config: ThemePreviewConfig; label?: string; embedded?: boolean }>()
const selected = defineModel<string>()
const mode = defineModel<BrandMode | 'system'>('mode', { default: 'light' })
const notify = ref(true)
const page = computed(() => props.config.pages.find(page => page.id === selected.value) ?? props.config.pages[0])
const modes = [{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '跟随系统' }]
</script>

<template>
  <SBrandTheme :theme="theme" :mode="mode" class="sy-theme-preview" v-slot="{ mode: resolved }">
    <header v-if="!embedded" class="sy-theme-preview__toolbar">
      <h2>{{ label ?? theme.name }}</h2>
      <SSegment :model-value="mode" :items="modes" label="主题模式"
        @update:model-value="next => { if (next === 'light' || next === 'dark' || next === 'system') mode = next }" />
    </header>
    <nav v-if="!embedded && config.pages.length" class="sy-theme-preview__toolbar" aria-label="预览页面">
      <SButton v-for="item in config.pages" :key="item.id" variant="secondary" size="sm"
        :aria-current="page?.id === item.id ? 'page' : undefined" @click="selected = item.id">{{ item.label }}</SButton>
    </nav>
    <div v-if="page" class="sy-theme-preview__content">
      <SThemeColors v-if="page.kind === 'colors'" />
      <slot v-else name="page" :page="page" :mode="resolved">
          <h3>{{ page.label }}</h3>
          <div class="sy-theme-preview__toolbar">
            <SButton v-for="variant in ['primary', 'secondary', 'ghost', 'danger'] as const" :key="variant" :variant="variant">{{ variant }}</SButton>
            <SButton v-if="page.kind === 'components'" disabled>不可用</SButton>
          </div>
          <SInput label="项目名称" placeholder="输入名称" :status="{ type: 'info', message: '项目名称会出现在交付通知中。' }" />
          <SSwitch v-model="notify">发送交付通知</SSwitch>
          <SProgressBar label="交付进度" :value="65" />
          <div class="sy-theme-preview__toolbar"><SBadge tone="success">已保存</SBadge><SBadge tone="warning">待评审</SBadge><SBadge tone="danger">需修复</SBadge></div>
      </slot>
    </div>
    <p v-else role="status">暂无预览页面。</p>
  </SBrandTheme>
</template>
