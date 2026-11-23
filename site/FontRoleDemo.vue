<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, useTemplateRef, watch } from 'vue'
import SBrandTheme from '../src/components/SBrandTheme.vue'
import SSelect from '../src/components/SSelect.vue'
import { holdLayoutSwap, playLayoutSwap } from '../src/internal/layout-content'
import type { BrandFontRole, BrandMode, BrandTheme } from '../src/platform/theme-workspace'

const props = defineProps<{ brand: BrandTheme; mode: BrandMode }>()
const roles = [
  { value: 'body', label: '正文字体', tag: 'p', text: 'Delivery notes' },
  { value: 'heading', label: '标题字体', tag: 'h3', text: 'Project review' },
  { value: 'code', label: '代码字体', tag: 'code', text: 'status = ready' },
] as const
const options = [
  { value: '', label: '主题默认' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: '"Courier New", monospace', label: 'Courier New' },
]
const selection = reactive<Record<BrandFontRole, string>>({ body: '', heading: '', code: '' })
const boundary = useTemplateRef<HTMLElement>('preview')
const theme = computed(() => ({
  ...props.brand, id: 'font-roles-example',
  design: { ...props.brand.design, fonts: {
    ...props.brand.design?.fonts,
    ...Object.fromEntries(Object.entries(selection).filter(([, family]) => family)),
  } },
}))

for (const { value } of roles) {
  let swap: ReturnType<typeof playLayoutSwap>
  let revision = 0
  function cancelSwap() {
    swap?.incoming.cancel()
    swap?.outgoing.cancel()
    swap = undefined
  }
  onBeforeUnmount(() => { revision++; cancelSwap() })
  watch(() => selection[value], async () => {
    const panel = boundary.value
    const sample = panel?.querySelector<HTMLElement>(`[data-font-example="${value}"]`)
    const previous = sample && holdLayoutSwap(sample, panel ?? undefined)
    const current = ++revision
    cancelSwap()
    if (!previous) return
    await nextTick()
    if (current === revision) swap = playLayoutSwap(previous, sample)
    else previous.dispose()
  })
}
</script>

<template>
  <div class="font-role-demo">
    <div class="font-role-demo__controls">
      <SSelect v-for="role in roles" :key="role.value" v-model="selection[role.value]" :label="role.label" :options="options" />
    </div>
    <div ref="preview" class="font-role-demo__sample">
      <SBrandTheme :theme="theme" :mode="mode" role="group" aria-label="字体预览" class="font-role-demo__theme">
        <component :is="role.tag" v-for="role in roles" :key="role.value" :data-font-example="role.value">{{ role.text }}</component>
      </SBrandTheme>
    </div>
  </div>
</template>

<style scoped>
.font-role-demo, .font-role-demo__controls { display: grid; gap: var(--sy-space-3); }
.font-role-demo__controls { grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); }
.font-role-demo__sample { position: relative; }
.font-role-demo__theme {
  display: grid;
  justify-items: start;
  gap: var(--sy-space-2);
  padding: var(--sy-space-4);
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-md);
  background: var(--sy-canvas);
  color: var(--sy-text);
}
.font-role-demo__theme > :is(p, h3, code) { margin: 0; line-height: 1.4; }
@media (prefers-reduced-motion: no-preference) {
  .font-role-demo__theme { transition: background-color var(--sy-motion-replace) var(--sy-ease-settle), color var(--sy-motion-replace) var(--sy-ease-settle); }
}
</style>
