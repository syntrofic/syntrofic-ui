<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { SButton, SDisclosure, SDisclosureGroup, SMotionText, SSeparator, useCollapsible } from '../src'

defineProps<{ kind: 'disclosure' | 'group' }>()

const sections = [
  { id: 'region', title: '数据区域', body: '团队可选择资料存储和处理的位置。' },
  { id: 'retention', title: '保留期限', body: '删除的资料在保留期内仍可恢复。' },
  { id: 'log', title: '审计记录', body: '管理员可以查看访问和发布记录。' },
] as const
const densities = [
  { id: 'compact', label: '紧凑资料分组' },
  { id: 'balanced', label: '标准资料分组' },
  { id: 'spacious', label: '宽松资料分组' },
] as const
const selected = ref<readonly string[]>(['region'])
const index = computed(() => sections.findIndex(item => item.id === selected.value[0]))
const label = computed(() => sections[index.value]?.title ?? '已收起')
function move(direction: number) {
  const item = sections[index.value + direction]
  if (item) selected.value = [item.id]
}
const checklistId = `release-checklist-${useId()}`
const { isOpen: checklist, toggle } = useCollapsible({ isCollapsible: { defaultIsOpen: false } })
</script>

<template>
  <section v-if="kind === 'disclosure'" class="disclosure-review" aria-label="折叠区示例">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :disabled="index <= 0" @click="move(-1)">上一部分</SButton>
      <SButton size="sm" variant="secondary" :disabled="index === sections.length - 1" @click="move(1)">下一部分</SButton>
      <span><SMotionText :value="label" announce /></span>
    </div>
    <SDisclosureGroup v-model="selected" label="交付设置">
      <SDisclosure v-for="section in sections" :key="section.id" :value="section.id" :title="section.title" :heading-level="3">
        {{ section.body }}
      </SDisclosure>
    </SDisclosureGroup>
    <SDisclosureGroup label="并排比较" multiple :default-value="['drafts', 'published']">
      <SDisclosure value="drafts" title="草稿可见范围">仅成员可以访问尚未发布的资料。</SDisclosure>
      <SDisclosure value="published" title="已发布资料">有链接的访客可以访问公开资料。</SDisclosure>
    </SDisclosureGroup>
    <div class="disclosure-review__flat" aria-label="发布详情" role="group">
      <SDisclosure title="审核记录" variant="plain" default-open>编辑和复核时间随版本更新。<small>由项目成员维护</small></SDisclosure>
      <SSeparator />
      <SDisclosure title="共享范围" variant="plain">发布前逐项确认链接的可见范围。</SDisclosure>
    </div>
    <div class="disclosure-review__check">
      <SButton size="sm" variant="secondary" :aria-expanded="checklist" :aria-controls="checklistId" @click="toggle">
        <SMotionText :value="checklist ? '收起发布清单' : '展开发布清单'" />
      </SButton>
      <div :id="checklistId" role="region" aria-label="发布清单" class="disclosure-review__check-panel" :data-open="checklist || undefined"
        :inert="!checklist" :aria-hidden="!checklist || undefined">
        <div><p>核对使用说明、页面预览和键盘操作，再发布新版。</p></div>
      </div>
    </div>
  </section>
  <section v-else class="disclosure-review disclosure-review--densities" aria-label="分组密度示例">
    <div v-for="kind in densities" :key="kind.id">
      <h3>{{ kind.label }}</h3>
      <SDisclosureGroup :label="kind.label" dividers :density="kind.id" default-value="region">
        <SDisclosure v-for="section in sections" :key="section.id" :value="section.id" :title="section.title">{{ section.body }}</SDisclosure>
      </SDisclosureGroup>
    </div>
  </section>
</template>

<style scoped>
.disclosure-review { display: grid; min-inline-size: 0; gap: var(--sy-space-4); margin-block-start: var(--sy-space-3); }
.disclosure-review--densities { grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.disclosure-review--densities > div > h3 { margin: 0 0 var(--sy-space-1); font-size: .9rem; }
.disclosure-review__flat small { display: block; color: var(--sy-text-muted); font-size: .75rem; }
.disclosure-review__check-panel { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-duration) var(--sy-ease-settle); }
.disclosure-review__check-panel[data-open] { grid-template-rows: 1fr; opacity: 1; }
.disclosure-review__check-panel > div { min-block-size: 0; overflow: clip; }
.disclosure-review__check-panel p { margin: var(--sy-space-2) 0 0; color: var(--sy-text-muted); }
@media (prefers-reduced-motion: reduce) { .disclosure-review__check-panel { transition: none; } }
</style>
