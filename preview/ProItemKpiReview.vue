<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  SButton, SItemCard, SItemCardGroup, SKpi, SKpiGroup, SMotionText, SProgressBar, SSelect, SSwitch, type KpiDatum,
} from '../src'

defineProps<{ id: string }>()

const sync = ref(true)
const access = ref('team')
const result = ref('')
const downloading = ref(false)
const downloadCount = ref(2)
let downloadTimer: ReturnType<typeof setTimeout> | undefined
const audiences = [
  { label: '团队成员', value: 'team' },
  { label: '指定成员', value: 'private' },
  { label: '公开', value: 'public', disabled: true },
]

function download() {
  if (downloading.value) return
  downloading.value = true
  downloadTimer = setTimeout(() => {
    downloading.value = false
    downloadCount.value += 1
    result.value = '已准备交付包'
  }, 850)
}

onBeforeUnmount(() => clearTimeout(downloadTimer))

const files = [
  { id: 'guide', title: '品牌使用规范', detail: '对外发布用 PDF', status: 'PDF' },
  { id: 'color', title: '浅色主题色板', detail: '设计工具可导入', status: 'JSON' },
  { id: 'handoff', title: '组件交付清单', detail: '包含断点与交互说明', status: 'MD' },
]
const libraries = [
  { id: 'working', title: '设计工作稿', detail: '近期评审中的版本', variant: 'secondary' },
  { id: 'release', title: '上线资源', detail: '按产品版本整理', variant: 'tertiary' },
  { id: 'archive', title: '归档记录', detail: '已移出日常交付区', variant: 'default' },
] as const

const prior = ref(false)
const connect = ref(false)
const refreshValue = computed(() => prior.value ? 1468 : 1428)
const countSeries = computed<readonly KpiDatum[]>(() => {
  const values = prior.value ? [28, 32, null, 25, 33, 37, 46] : [24, 33, null, 35, 30, 40, 42]
  return values.map((value, index) => ({ value, label: `11 月 ${(prior.value ? 7 : 14) + index} 日` }))
})
const responseSeries = [4.7, 5.3, 3.6, 4.2, 3.8, 3.6, 3.3]
const directionLabels = { up: '上升', down: '下降', neutral: '持平' }
const signed: Intl.NumberFormatOptions = { signDisplay: 'exceptZero' }
const percent: Intl.NumberFormatOptions = { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }
</script>

<template>
  <section v-if="id === 'WP.item-card'" class="review-resource">
    <SItemCard title="品牌交付包" description="允许团队下载整理后的文件。" :status="`存档 ${downloadCount} 份`"
      :reserve-status="8" pressable variant="secondary" @press="result = '已打开品牌交付包'">
      <template #action>
        <SButton size="sm" variant="secondary" :loading="downloading" @click="download">下载</SButton>
      </template>
    </SItemCard>
    <SItemCard title="自动同步" description="交付区跟随主分支更新。" variant="tertiary">
      <template #action><SSwitch v-model="sync" aria-label="自动同步" /></template>
    </SItemCard>
    <SItemCard title="共享范围" description="已发布的资源继承此权限。">
      <template #action>
        <SSelect v-model="access" aria-label="共享范围" :options="audiences" align="end" />
      </template>
    </SItemCard>
    <SItemCard title="历史快照" description="归档期间只开放下载。" href="#review-resource-result" disabled variant="transparent" />
    <output id="review-resource-result" class="review-resource__result"><SMotionText :value="result" /></output>
  </section>

  <section v-else-if="id === 'WP.item-card-group'" class="review-resource-group">
    <SItemCardGroup title="交付文件" description="当前版本可下载的文件。" class="review-resource-list">
      <SItemCard v-for="file in files" :key="file.id" :title="file.title" :description="file.detail" :status="file.status"
        :reserve-status="4" pressable @press="result = `已查看${file.title}`">
        <template #action><SButton size="sm" variant="ghost" :aria-label="`下载${file.title}`" @click="result = `已准备${file.title}`">下载</SButton></template>
      </SItemCard>
    </SItemCardGroup>
    <SItemCardGroup title="项目资料库" layout="grid" :columns="3" class="review-resource-grid">
      <SItemCard v-for="library in libraries" :key="library.id" :title="library.title" :description="library.detail"
        pressable :variant="library.variant" @press="result = `已打开${library.title}`" />
    </SItemCardGroup>
    <output class="review-resource__result"><SMotionText :value="result" /></output>
  </section>

  <section v-else-if="id === 'WP.kpi'" class="review-metric">
    <SKpi title="资源下载量" :value="refreshValue" suffix="次" locale="zh-CN" :reserve="5"
      :trend="{ value: prior ? .064 : .082, formatOptions: percent, reserve: 6, directionLabels }"
      :chart="countSeries" chart-label="每日下载趋势" chart-missing-label="无记录" :chart-connect-nulls="connect" tone="sage" divider
      class="review-metric__downloads">
      <template #actions>
        <SButton size="sm" variant="secondary" @click="prior = !prior">切换周期</SButton>
      </template>
      <SMotionText :value="prior ? '上一周期 11 月 7–13 日' : '当前周期 11 月 14–20 日'" />
      <template #footer><SSwitch v-model="connect">连接缺口</SSwitch></template>
    </SKpi>
    <SKpi title="文件校验进度" :value="72" suffix="%" locale="zh-CN" :reserve="2" tone="blue"
      :progress="{ label: '已校验文件', value: 72, showValue: false }" class="review-metric__progress">
      <template #footer>剩余 28 份待核对</template>
    </SKpi>
    <SKpi title="平均响应时间" :value="3.3" suffix="小时" locale="zh-CN" :reserve="3"
      :chart="responseSeries" chart-placement="inline" chart-label="近期响应时间趋势" :chart-inspect="false" tone="sand"
      class="review-metric__inline">
      <template #footer>最近七天</template>
    </SKpi>
  </section>

  <section v-else class="review-metric-groups">
    <SKpiGroup title="本周交付" description="11 月 14–20 日" dividers class="review-metric-groups__weekly">
      <SKpi title="已交付资源" :value="38" suffix="份" :reserve="2" tone="sage"
        :trend="{ value: 6, formatOptions: signed, reserve: 2, directionLabels }">
        <template #footer>上周 32 份</template>
      </SKpi>
      <SKpi title="已完成校验" :value="72" suffix="%" :reserve="2" tone="blue">
        <template #progress><SProgressBar aria-label="本周校验进度" :value="72" :show-value="false" size="sm" /></template>
      </SKpi>
      <SKpi title="平均响应" :value="3.3" suffix="小时" :reserve="3" tone="sand"
        :chart="responseSeries" chart-placement="inline" chart-label="响应时间趋势" :chart-inspect="false" />
    </SKpiGroup>
    <SKpiGroup title="归档情况" orientation="vertical" dividers class="review-metric-groups__archive">
      <SKpi title="待归档" :value="14" suffix="份" :reserve="2" />
      <SKpi title="本月已归档" :value="86" suffix="份" :reserve="2" tone="sage" />
    </SKpiGroup>
  </section>
</template>
