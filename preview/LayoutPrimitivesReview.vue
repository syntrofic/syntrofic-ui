<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import {
  SAvatar, SButton, SCard, SCenter, SGrid, SGridSpan, SIcon, SMotionText, SSection, SSelect,
  SStack, SStackItem, SSwitch, SText, useAnimatedLayout,
} from '../src'

defineProps<{ kind: 'stack' | 'grid' | 'section' }>()
const direction = ref<'horizontal' | 'vertical'>('horizontal')
const alignments = [{ value: 'start', label: '靠起始边' }, { value: 'center', label: '居中' }, { value: 'end', label: '靠结束边' }, { value: 'between', label: '两端对齐' }] as const
const alignment = ref<'start' | 'center' | 'end' | 'between'>('between')
const directions = [{ value: 'horizontal', label: '横向' }, { value: 'vertical', label: '纵向' }]
const spacings = [{ value: '4', label: '紧凑' }, { value: '8', label: '常规' }, { value: '14', label: '宽松' }]
const spacing = ref('8')
const stackHost = useTemplateRef<HTMLElement>('stackHost')
const galleryHost = useTemplateRef<HTMLElement>('galleryHost')
const layout = useAnimatedLayout()
const narrowGallery = ref(false)
const chosen = ref('')
const hasItems = ref(false)
const compactItem = ref(false)
const members = [
  { name: '林舟', note: '确认发布范围' },
  { name: '顾川', note: '检查归档与回退说明' },
]
const folders = [
  { name: '启动简报', note: '本期目标与交付范围' },
  { name: '版本记录', note: '变更详情与时间线' },
  { name: '验收清单', note: '跨设备与无障碍核对' },
  { name: '迁移手册', note: '部署预检与回滚' },
  { name: '指标说明', note: '统计口径和来源' },
  { name: '交接安排', note: '协作联系人' },
]
const widgets = [
  { name: '本周完成', value: '28', columns: 2, rows: 2 },
  { name: '同步', value: '96%', columns: 2, rows: 1 },
  { name: '待验收', value: '7', columns: 1, rows: 1 },
  { name: '逾期', value: '2', columns: 1, rows: 1 },
]
const sectionModes = [{ value: 'section', label: '常规' }, { value: 'muted', label: '柔和' }, { value: 'transparent', label: '透明' }] as const
const sectionTone = ref<'section' | 'muted' | 'transparent'>('muted')
const checked = ref(false)
function moveChildren(host: HTMLElement | null) {
  return layout(host?.querySelectorAll<HTMLElement>('[data-move]') ?? [])
}
async function changeDirection(value: unknown) {
  if (value !== 'horizontal' && value !== 'vertical') return
  const play = moveChildren(stackHost.value)
  direction.value = value
  if (value === 'vertical' && alignment.value === 'between') alignment.value = 'start'
  await nextTick()
  play()
}
async function changeAlignment(value: unknown) {
  if (value !== 'start' && value !== 'center' && value !== 'end' && value !== 'between') return
  const play = moveChildren(stackHost.value)
  alignment.value = value
  await nextTick()
  play()
}
async function changeSpacing(value: unknown) {
  if (typeof value !== 'string') return
  const play = moveChildren(stackHost.value)
  spacing.value = value
  await nextTick()
  play()
}
async function resizeGallery(value?: boolean) {
  const play = moveChildren(galleryHost.value)
  narrowGallery.value = Boolean(value)
  await nextTick()
  play()
}
</script>

<template>
  <div v-if="kind === 'stack'" class="layout-primitives">
    <section class="layout-primitives" aria-label="堆叠方向与对齐">
      <div class="review__row">
        <SSelect :model-value="direction" label="排列方向" :options="directions" @update:model-value="changeDirection" />
        <SSelect :model-value="alignment" label="水平对齐" :options="alignments.filter(item => direction === 'horizontal' || item.value !== 'between')"
          @update:model-value="changeAlignment" />
        <SSelect :model-value="spacing" label="项目间距" :options="spacings" @update:model-value="changeSpacing" />
      </div>
      <div ref="stackHost" class="layout-primitives__stack-plane">
        <SStack :direction="direction" :gap="Number(spacing)" :h-align="alignment" padding="8px">
          <SCard v-for="name in ['规划', '构建', '交付']" :key="name" variant="muted" :padding="2" data-move>{{ name }}</SCard>
        </SStack>
      </div>
    </section>
    <SStack :gap="8" aria-label="固定与填充项">
      <SStack v-for="person in members" :key="person.name" direction="horizontal" :gap="8" :v-align="'center'">
        <SStackItem><SAvatar :name="person.name" alt="" /></SStackItem>
        <SStackItem size="fill">
          <strong>{{ person.name }}</strong>
          <SText type="supporting" display="block">{{ person.note }}</SText>
        </SStackItem>
        <SStackItem><SButton size="sm" variant="secondary" :aria-label="`联系${person.name}`" @click="chosen = person.name">联系</SButton></SStackItem>
      </SStack>
      <SMotionText v-if="chosen" :value="`已选择${chosen}`" announce />
    </SStack>
    <section class="layout-primitives" aria-label="固定栏与可伸展栏">
      <SSwitch v-model="compactItem">收窄交付边栏</SSwitch>
      <SStack direction="horizontal" :gap="6" :v-align="'stretch'">
        <SStackItem size="static" class="layout-primitives__fixed" :data-compact="compactItem || undefined">
          <SCard :padding="2" height="100%" variant="muted">交付侧栏</SCard>
        </SStackItem>
        <SStackItem size="fill">
          <SCard :padding="2" height="100%" variant="green">文档填充其余空间</SCard>
        </SStackItem>
      </SStack>
    </section>
    <SCenter mode="horizontal" aria-label="水平居中示例">
      <SStack direction="horizontal" :gap="5" :v-align="'center'">
        <SIcon name="check" /><SText>同步完成</SText>
      </SStack>
    </SCenter>
    <SCard :padding="0">
      <SCenter :height="154" aria-label="卡片中的双轴居中">
        <SStack :gap="5" h-align="center">
          <SIcon name="file" size="lg" />
          <strong><SMotionText :value="hasItems ? '已放入一份资料' : '交付资料为空'" /></strong>
          <SButton size="sm" variant="secondary" @click="hasItems = !hasItems">
            <SMotionText :value="hasItems ? '清空资料' : '放入示例资料'" />
          </SButton>
        </SStack>
      </SCenter>
    </SCard>
  </div>

  <div v-else-if="kind === 'grid'" class="layout-primitives">
    <section class="layout-primitives" aria-label="响应式资料网格">
      <SSwitch :model-value="narrowGallery" @update:model-value="resizeGallery">使用窄栏宽度</SSwitch>
      <div ref="galleryHost" class="layout-primitives__gallery-host">
        <SGrid :width="narrowGallery ? 276 : '100%'" :max-width="'100%'" :min-column-width="122" :row-gap="9" :column-gap="8">
          <SCard v-for="folder in folders" :key="folder.name" variant="muted" :padding="2" data-move>
            <SText type="label" display="block">{{ folder.name }}</SText>
            <SText type="supporting" display="block">{{ folder.note }}</SText>
          </SCard>
        </SGrid>
      </div>
    </section>
    <SGrid :columns="3" :gap="8" aria-label="三列跨栏布局">
      <SGridSpan :columns="2"><SCard :padding="2" variant="blue">版本说明</SCard></SGridSpan>
      <SCard :padding="2" variant="muted">审核</SCard>
      <SCard :padding="2" variant="muted">交接</SCard>
      <SGridSpan :columns="2"><SCard :padding="2" variant="green">发布安排</SCard></SGridSpan>
    </SGrid>
    <SGrid :columns="4" :row-height="62" :gap="8" aria-label="跨行与跨列的交付面板">
      <SGridSpan v-for="widget in widgets" :key="widget.name" :columns="widget.columns" :rows="widget.rows">
        <SCard :padding="2" height="100%" :variant="widget.rows === 2 ? 'green' : 'default'">
          <SText type="supporting" display="block">{{ widget.name }}</SText>
          <SText type="large" display="block" tabular-numbers>{{ widget.value }}</SText>
        </SCard>
      </SGridSpan>
      <SGridSpan columns="full">
        <SCard :padding="2" variant="blue"><SText type="label">汇总 · 数据来自当前交付周期</SText></SCard>
      </SGridSpan>
    </SGrid>
  </div>

  <div v-else class="layout-primitives">
    <div class="review__row">
      <SSelect :model-value="sectionTone" label="区域表面" :options="sectionModes"
        @update:model-value="value => { if (value === 'section' || value === 'muted' || value === 'transparent') sectionTone = value }" />
    </div>
    <SSection :variant="sectionTone" :padding="4" :dividers="['bottom']" aria-label="本期交付提示">
      <SCenter mode="both" :min-height="120">
        <SStack :gap="6" h-align="center">
          <SIcon name="info" size="lg" />
          <strong>本期交付已进入验收</strong>
          <SText type="supporting" align="center">核对归档资料与发布日期后即可确认。</SText>
          <SButton size="sm" variant="secondary" @click="checked = !checked"><SMotionText :value="checked ? '已确认验收' : '确认验收'" /></SButton>
        </SStack>
      </SCenter>
    </SSection>
    <SStack :gap="0" aria-label="段落分隔线">
      <SSection title="内容归档" variant="section" :dividers="['bottom']" :padding="3">保存当前版和上一版中的有效条目。</SSection>
      <SSection title="发布时间" variant="muted" :dividers="['bottom']" :padding="3">团队同步后即可对外发布。</SSection>
      <SSection title="联系方式" variant="transparent" :padding="3">发布期间由资料负责人协调。</SSection>
    </SStack>
  </div>
</template>

<style scoped>
.layout-primitives { display: grid; min-inline-size: 0; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); }
.layout-primitives__stack-plane { min-block-size: 9.5rem; border: 1px solid var(--sy-border); border-radius: var(--sy-radius-sm); overflow: clip; }
.layout-primitives__gallery-host { min-inline-size: 0; overflow: clip; }
.layout-primitives__fixed { inline-size: 7rem; transition: inline-size var(--sy-motion-replace) var(--sy-ease-settle); }
.layout-primitives__fixed[data-compact] { inline-size: 4.5rem; }
</style>
