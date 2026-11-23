<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SIcon, SInput, SSegment, SSpinner, SStepper, SSwitch,
  type StepperCollapsedVariant, type StepperItem } from '../src'

const step = ref('review')
const note = ref('')
const releaseSteps: StepperItem[] = [
  { value: 'prepared', label: '资料备齐', description: '交付包已通过校验', tone: 'success', density: 'compact' },
  { value: 'review', label: '签发复核', description: '确认发布说明', tone: 'warning', density: 'spacious', progress: .45 },
  { value: 'handoff', label: '补充通知', description: '通知后续协作者', optional: true, tone: 'accent' },
  { value: 'restricted', label: '受限签发', description: '需要管理员处理', disabled: true, tone: 'error' },
]
const narrow = ref(false)
const active = ref('materials')
const responsiveSteps: StepperItem[] = [
  { value: 'materials', label: '核对资料', description: '确认资源索引' },
  { value: 'migration', label: '受限迁移', description: '当前账户无访问权限', disabled: true },
  { value: 'permissions', label: '确认可见范围', description: '检查访问权限' },
  { value: 'publish', label: '签发版本', description: '同步至组件官网' },
]
const variant = ref<string | null>('withLabelAndControls')
const variants = [
  { value: 'withLabelAndControls', label: '摘要和控件' },
  { value: 'withLabel', label: '仅摘要' },
  { value: 'hiddenLabel', label: '仅指示器' },
]
const options = computed(() => ({ minimumStepWidth: 104, collapsedVariant: variant.value as StepperCollapsedVariant }))
const indicator = ref<string | null>('auto')
const indicators = [
  { value: 'auto', label: '状态' }, { value: 'number', label: '编号' },
  { value: 'none', label: '隐藏' }, { value: 'custom', label: '自定义' },
]
const indicatorSteps = computed<StepperItem[]>(() => [
  { value: 'received', label: '接收文件', tone: 'success', density: 'compact' },
  { value: 'processed', label: '校验文件', density: 'balanced' },
  { value: 'delivered', label: '送达团队', density: 'spacious' },
].map(item => ({ ...item, indicator: indicator.value === 'number' || indicator.value === 'none' ? indicator.value : 'auto' } as StepperItem)))
const statuses = { current: '当前步骤', complete: '已完成', pending: '待处理', unreachable: '暂不可达' }
const tones = { success: '校验通过', warning: '需要确认', error: '存在限制' }
</script>

<template>
  <section aria-label="签发步骤与详情" class="stepper-scenarios">
    <SStepper v-model="step" label="签发步骤" :steps="releaseSteps" interactive orientation="vertical"
      indicator-position="on-track" optional-label="可选步骤" :status-labels="statuses" :tone-labels="tones">
      <template #end="{ step: entry }">
        <SBadge v-if="entry.value === 'prepared'" label="已校验" tone="green" />
      </template>
      <template #content="{ step: entry }">
        <div v-if="entry.value === 'review'" class="stepper-scenarios__detail">
          <SInput v-model="note" label="签发说明" placeholder="记录本次变更" />
          <SButton size="sm" @click="step = 'handoff'">继续签发</SButton>
        </div>
        <div v-else-if="entry.value === 'handoff'" class="stepper-scenarios__detail">
          <span>将签发记录发送给协作者。</span>
          <SButton size="sm" variant="secondary" @click="step = 'review'">返回签发复核</SButton>
        </div>
      </template>
    </SStepper>
  </section>
  <section aria-label="自适应发布步骤" class="stepper-scenarios">
    <SSwitch v-model="narrow" label="收窄步骤容器" />
    <SSegment v-model="variant" :items="variants" label="窄屏显示方式" size="sm" />
    <SStepper v-model="active" class="stepper-scenarios__responsive" :data-narrow="narrow || undefined"
      label="自适应签发流程" :steps="responsiveSteps" interactive indicator-position="on-track" :horizontal-options="options"
      previous-label="上一道签发步骤" next-label="下一道签发步骤" :status-labels="statuses" />
  </section>
  <section aria-label="步骤指示器类型" class="stepper-scenarios">
    <SSegment v-model="indicator" :items="indicators" label="指示器类型" size="sm" />
    <SStepper label="文件传输状态" :steps="indicatorSteps" default-value="processed" orientation="vertical" :status-labels="statuses" :tone-labels="tones">
      <template v-if="indicator === 'custom'" #indicator="{ status }">
        <SSpinner v-if="status === 'current'" size="sm" decorative />
        <SIcon v-else :name="status === 'complete' ? 'check' : 'folder'" size="sm" />
      </template>
    </SStepper>
  </section>
</template>

<style scoped>
.stepper-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.stepper-scenarios__detail { display: grid; gap: var(--sy-space-2); max-inline-size: 26rem; }
.stepper-scenarios__detail > .sy-button { justify-self: start; }
.stepper-scenarios__responsive { inline-size: 100%; transition: inline-size var(--sy-motion-replace) var(--sy-ease-settle); }
.stepper-scenarios__responsive[data-narrow] { inline-size: min(100%, 20rem); }
@media (prefers-reduced-motion: reduce) { .stepper-scenarios__responsive { transition: none; } }
</style>
