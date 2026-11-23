<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  SAspectRatio, SAvatar, SButton, SCard, SMotionText, SOverlay, SSkeleton, SSpinner, SSwitch,
} from '../src'
import deliveryArea from './assets/delivery-area.png'
import linPortrait from './assets/profile-lin.jpg'

defineProps<{ kind: 'skeleton' | 'spinner' }>()
const loading = ref(true)
const exporting = ref(false)
const exported = ref(false)
const rows = [
  { name: '设计规范', phase: '复核中', owner: '林舟' },
  { name: '产品简报', phase: '已完成', owner: '陈远' },
  { name: '上线记录', phase: '待发布', owner: '顾川' },
]
const widths = ['82%', '57%', '74%', '46%']
const text = ['当前优先事项', '发布范围已确认', '本期上线需要协调两个团队', '发布时间待同步']
const sizes = ['sm', 'md', 'lg', 'xl'] as const
let timer: ReturnType<typeof setTimeout> | undefined
function startExport() {
  if (exporting.value) return
  exporting.value = true
  exported.value = false
  timer = setTimeout(() => {
    exporting.value = false
    exported.value = true
  }, 1100)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div v-if="kind === 'skeleton'" class="loading-review">
    <SSwitch v-model="loading">加载资料清单</SSwitch>
    <section class="loading-review__grid" aria-label="卡片和列表占位">
      <SCard :padding="3">
        <div class="loading-review__profile">
          <SSkeleton :loading="loading" :width="44" :height="44" shape="circle">
            <SAvatar :src="linPortrait" alt="" size="lg" />
          </SSkeleton>
          <div class="loading-review__lines">
            <SSkeleton :loading="loading" :index="1" width="70%" shape="line"><strong>林舟</strong></SSkeleton>
            <SSkeleton :loading="loading" :index="2" width="100%" shape="line">交付负责人</SSkeleton>
          </div>
        </div>
        <div class="loading-review__lines loading-review__details">
          <SSkeleton :loading="loading" :index="3" width="95%" shape="line">资料版本与发布排期</SSkeleton>
          <SSkeleton :loading="loading" :index="4" width="82%" shape="line">已同步交接信息</SSkeleton>
          <SSkeleton :loading="loading" :index="5" width="65%" shape="line">上次更新今天</SSkeleton>
        </div>
      </SCard>
      <SCard :padding="3">
        <div class="loading-review__lines">
          <SSkeleton v-for="(note, index) in text" :key="note" :index="index * 2" :width="widths[index]" :loading="loading" shape="line">
            {{ note }}
          </SSkeleton>
        </div>
      </SCard>
    </section>
    <table class="loading-review__table" aria-label="交付表格占位">
      <thead><tr><th scope="col">文件</th><th scope="col">状态</th><th scope="col">负责人</th></tr></thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.name">
          <td><SSkeleton :loading="loading" :index="index * 3" width="94%" radius="rounded">{{ row.name }}</SSkeleton></td>
          <td><SSkeleton :loading="loading" :index="index * 3 + 1" width="76%" radius="rounded">{{ row.phase }}</SSkeleton></td>
          <td><SSkeleton :loading="loading" :index="index * 3 + 2" width="67%" radius="rounded">{{ row.owner }}</SSkeleton></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-else class="loading-review">
    <section class="review__row loading-review__spinners" aria-label="四种加载尺寸">
      <div v-for="size in sizes" :key="size" class="loading-review__spinner">
        <SSpinner :size="size" shade="default" decorative />
        <span>{{ size.toUpperCase() }}</span>
      </div>
    </section>
    <div class="loading-review__grid" aria-label="浅背景和媒体加载指示">
      <div class="loading-review__plain"><SSpinner size="lg" shade="subtle" label="正在读取清单" show-label /></div>
      <SOverlay position="full" align="center" class="loading-review__media">
        <SAspectRatio :ratio="16 / 9" fit="cover"><img :src="deliveryArea" alt="交付区域"></SAspectRatio>
        <template #overlay><SSpinner size="lg" shade="on-media" label="正在读取地图" show-label /></template>
      </SOverlay>
    </div>
    <div class="loading-review__job">
      <SButton size="sm" variant="secondary" :loading="exporting" @click="startExport">生成交付包</SButton>
      <Transition name="sy-standard-fade">
        <SSpinner v-if="exporting" size="xl" label="交付包生成中">
          <strong>正在准备交付包</strong><br><small>正在汇总版本和说明文件</small>
        </SSpinner>
        <SMotionText v-else-if="exported" value="交付包已生成" announce />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.loading-review { display: grid; min-inline-size: 0; grid-template-columns: minmax(0, 1fr); align-items: start; gap: var(--sy-space-3); }
.loading-review__grid { display: grid; min-inline-size: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: var(--sy-space-2); }
.loading-review__profile { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: var(--sy-space-2); }
.loading-review__lines { display: grid; gap: .5rem; font-size: .875rem; }
.loading-review__details { margin-block-start: var(--sy-space-2); }
.loading-review__table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: .85rem; }
.loading-review__table :is(th, td) { padding: var(--sy-space-2); border-block-end: 1px solid var(--sy-border); text-align: start; }
.loading-review__spinners { gap: var(--sy-space-4); }
.loading-review__spinner { display: grid; grid-template-rows: 32px auto; justify-items: center; align-items: center; gap: var(--sy-space-2); font-size: .8rem; }
.loading-review__plain { display: grid; min-block-size: 90px; place-items: center; border-radius: var(--sy-radius-sm); background: var(--sy-surface); }
.loading-review__media { border-radius: var(--sy-radius-sm); }
.loading-review__media :deep(.sy-overlay__content) { place-items: center; }
.loading-review__job { display: grid; min-inline-size: 0; justify-items: start; align-content: start; gap: var(--sy-space-2); min-block-size: 132px; }
.loading-review__job :deep(.sy-spinner__label) { text-align: start; }
</style>
