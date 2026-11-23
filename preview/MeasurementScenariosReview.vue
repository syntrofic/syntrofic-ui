<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { SButton, SMotionText, SProgressBar, SSlider, type FieldStatus } from '../src'

defineProps<{ kind: 'progress' | 'slider' }>()

const value = ref<number | null>(0)
const phase = ref<'ready' | 'prepare' | 'transfer' | 'done'>('ready')
const busy = computed(() => phase.value === 'prepare' || phase.value === 'transfer')
const copy = { ready: '等待开始', prepare: '正在准备资料', transfer: '正在上传资料', done: '上传完成' }
const quota = ref(3.2)
const decimal = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })
const formatBytes = (value: number, maximum: number) => `${decimal.format(value)} GB / ${decimal.format(maximum)} GB`
let timer: ReturnType<typeof setTimeout> | undefined

function upload() {
  if (busy.value) return
  phase.value = 'prepare'
  value.value = null
  timer = setTimeout(() => {
    phase.value = 'transfer'
    value.value = 20
    const advance = () => {
      value.value = Math.min(100, (value.value ?? 0) + 20)
      if (value.value === 100) phase.value = 'done'
      else timer = setTimeout(advance, 210)
    }
    timer = setTimeout(advance, 210)
  }, 750)
}
onBeforeUnmount(() => clearTimeout(timer))

const measurements = [
  { label: '素材归档', tone: 'accent', value: 60 }, { label: '验证通过', tone: 'success', value: 80 },
  { label: '接近容量上限', tone: 'warning', value: 50 }, { label: '部分同步失败', tone: 'danger', value: 92 },
  { label: '基准容量', tone: 'neutral', value: 35 },
] as const

const target = ref(50)
const temperature = ref(72)
const cpu = ref(95)
const ram = ref(50)
const disk = ref(75)
const formatTemperature = (value: number) => `${value} °F`
const formatPercent = (value: number) => `${value}%`
const cpuStatus = computed<FieldStatus>(() => {
  if (cpu.value >= 90) return { type: 'error', message: '处理器占用过高，请降低上限。' }
  if (cpu.value >= 70) return { type: 'warning', message: '处理器接近建议上限。' }
  return { type: 'success', message: '处理器分配正常。' }
})
</script>

<template>
  <section v-if="kind === 'progress'" class="measurement-review" aria-label="进度示例">
    <div class="measurement-review__layout">
      <div class="measurement-review__column">
        <SProgressBar label="资料上传进度" :value="value" :tone="phase === 'done' ? 'success' : 'accent'" />
        <div class="review__row">
          <SButton size="sm" variant="secondary" :loading="busy" @click="upload">模拟上传</SButton>
          <span class="measurement-review__status"><SMotionText :value="copy[phase]" announce /></span>
        </div>
        <SProgressBar label="磁盘用量" :value="quota" :max="5" :format-value="formatBytes" :tone="quota >= 4.5 ? 'warning' : 'accent'" />
        <div class="review__row">
          <SButton size="sm" variant="ghost" :disabled="quota >= 5" @click="quota = Math.min(5, Math.round(quota * 10 + 5) / 10)">分配 0.5 GB</SButton>
          <span><SMotionText :value="'剩余 ' + decimal.format(5 - quota) + ' GB'" /></span>
        </div>
      </div>
      <div class="measurement-review__column">
        <SProgressBar v-for="item in measurements" :key="item.label" v-bind="item" size="sm" />
      </div>
    </div>
  </section>
  <section v-else class="measurement-review" aria-label="滑块示例">
    <div class="measurement-review__layout">
      <div class="measurement-review__column">
        <SSlider v-model="target" label="上传限速" :format-value="formatPercent" :marks="[{ value: 0, label: '最低' }, { value: 100, label: '最高' }]" />
        <SSlider v-model="temperature" label="室内温度" :min="40" :max="100" :step="2" :format-value="formatTemperature" />
      </div>
      <div class="measurement-review__column">
        <SSlider v-model="cpu" label="处理器占用上限" :step="5" :format-value="formatPercent" :status="cpuStatus" />
        <SSlider v-model="ram" label="内存分配" :format-value="formatPercent" :status="{ type: 'warning', message: '已使用一半缓冲区。' }" />
        <SSlider v-model="disk" label="磁盘缓存" :format-value="formatPercent" :status="{ type: 'success', message: '缓存空间充足。' }" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.measurement-review { inline-size: min(100%, 46rem); min-inline-size: 0; margin-block-start: var(--sy-space-2); }
.measurement-review__layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: var(--sy-space-4); }
.measurement-review__column { display: grid; align-content: start; min-inline-size: 0; gap: var(--sy-space-3); }
.measurement-review__status, .measurement-review .review__row > span { color: var(--sy-text-muted); font-size: .85rem; }
</style>
