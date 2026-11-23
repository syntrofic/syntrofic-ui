<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import {
  SButton, SCard, SLayout, SLayoutContent, SLayoutFooter, SLayoutHeader, SLayoutPanel, SMotionText, SResizeHandle,
  SSection, SSelect, SStack, SSwitch, pixel, useResizable,
} from '../src'
import { useShellMeasurement } from '../src/internal/shell-layout'

const modes = [{ value: 'plain', label: '仅正文' }, { value: 'single', label: '左侧栏' }, { value: 'dual', label: '双侧栏' }]
const mode = ref('dual')
const constrain = ref(false)
const flush = ref(false)
const category = ref('简报')
const saved = ref('简报')
const status = ref('')
const dragging = ref(false)
const container = useTemplateRef<HTMLDivElement>('container')
const width = useShellMeasurement(container, node => node.clientWidth)
const panelId = useId()
const dividerWidth = 12
const maximum = computed(() => {
  const frame = Math.min(width.value ?? 1200, constrain.value ? 360 : Infinity)
  const fraction = mode.value === 'dual' ? .3 : .36
  return Math.max(0, frame * fraction - dividerWidth)
})
const minimum = computed(() => Math.min(76, maximum.value))
const resize = useResizable(() => ({
  containerRef: container, defaultSize: pixel(144), minSize: pixel(minimum.value),
  maxSize: pixel(maximum.value), collapsible: true, collapsedSize: 38, snaps: [minimum.value, 96, 144, 176, maximum.value],
}))
const leftTrack = computed(() => resize.size.value + dividerWidth)
const cards = ['版本归档', '交接清单', '渠道与权限', '回滚说明', '文档索引', '上线时间']
function pick(name: string) {
  category.value = name
  status.value = ''
}
</script>

<template>
  <section class="layout-regions-review" aria-label="工作台布局演示">
    <div class="review__row">
      <SSelect v-model="mode" label="布局模式" :options="modes" />
      <SSwitch v-model="constrain">限制正文宽度</SSwitch>
      <SSwitch v-model="flush">内容贴边</SSwitch>
    </div>
    <SCard :padding="0" class="layout-regions-review__frame">
      <div ref="container">
        <SLayout :height="292" :content-width="constrain ? 360 : undefined" :start-width="leftTrack" :end-width="116"
          :padding="2" :animate="!dragging" label="发布资料工作台">
          <template #header>
            <SLayoutHeader v-if="mode !== 'plain'" has-divider>
              <SStack direction="horizontal" :gap="8" h-align="between" :v-align="'center'" wrap>
                <strong>发布资料</strong>
                <SButton size="sm" variant="ghost" @click="resize.isCollapsed.value ? resize.expand() : resize.collapse()">收放分类</SButton>
              </SStack>
            </SLayoutHeader>
          </template>
          <template #start>
            <div v-if="mode !== 'plain'" class="layout-regions-review__dock">
              <SLayoutPanel :id="panelId" :resizable="resize" height="100%" :padding-inline=".5" role="navigation" label="发布资料分类">
                <SStack :gap="4">
                  <SButton v-for="item in ['简报', '待办', '归档']" :key="item" size="sm" :variant="category === item ? 'secondary' : 'ghost'"
                    :aria-current="category === item ? 'true' : undefined" @click="pick(item)">{{ item }}</SButton>
                </SStack>
              </SLayoutPanel>
              <SResizeHandle class="layout-regions-review__handle" :resizable="resize" :controls="panelId" edge="start" label="调整分类宽度"
                position="inline" :has-divider="false" pill-placement="center"
                :value-text="resize.isCollapsed.value ? '已收起' : undefined"
                @dragging="dragging = $event" />
            </div>
          </template>
          <SLayoutContent role="region" label="发布资料正文" :padding="flush ? 0 : undefined">
            <SSection as="section" title="当前资料" :variant="flush ? 'muted' : 'transparent'" :padding="2">
              <SMotionText :value="`${category} · ${cards.length} 项资料`" motion="roll" />
            </SSection>
            <ul class="layout-regions-review__list">
              <li v-for="document in cards" :key="document"><SMotionText :value="`${category} · ${document}`" /></li>
            </ul>
          </SLayoutContent>
          <template #end>
            <SLayoutPanel v-if="mode === 'dual'" has-divider role="complementary" label="发布审核记录">
              <SStack :gap="5">
                <strong>审核记录</strong>
                <span v-for="item in 10" :key="item">检查 {{ item }}</span>
              </SStack>
            </SLayoutPanel>
          </template>
          <template #footer>
            <SLayoutFooter v-if="mode !== 'plain'">
              <div class="review__row layout-regions-review__footer">
                <SMotionText v-if="status" :value="status" announce />
                <SButton size="sm" variant="ghost" @click="pick(saved)">还原分类</SButton>
                <SButton size="sm" variant="secondary" @click="saved = category; status = `已保存${saved}`">保存视图</SButton>
              </div>
            </SLayoutFooter>
          </template>
        </SLayout>
      </div>
    </SCard>
  </section>
</template>

<style scoped>
.layout-regions-review { display: grid; min-inline-size: 0; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); }
.layout-regions-review__frame { overflow: clip; }
.layout-regions-review__dock { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 12px; block-size: 100%; }
.layout-regions-review :deep(.sy-layout__start > .sy-layout__region-body:has(> .layout-regions-review__dock)) { padding: 0; block-size: 100%; }
.layout-regions-review__handle.sy-shell-resize { position: relative; inset: auto; inline-size: 12px; block-size: 100%; }
.layout-regions-review__handle::after { content: ''; position: absolute; inset-block: 0; inset-inline-start: 50%; inline-size: 1px; background: var(--sy-border); }
.layout-regions-review__footer { justify-content: end; }
.layout-regions-review__list { display: grid; gap: .5rem; padding-inline: 1.25rem .5rem; overflow-wrap: anywhere; }
.layout-regions-review :deep(.sy-motion-text__visual) { max-inline-size: 100%; flex-wrap: wrap; }
</style>
