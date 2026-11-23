<script setup lang="ts">
import ScrollHooksReview from './ScrollHooksReview.vue'
import { nextTick, onBeforeUnmount, ref } from 'vue'
import {
  SAvatarGroup, SBottomSheetSwitcher, SButton, SDialog, SDrawer, SHeading, SInput, SKbd, SMeter, SProgressBar, SProgressCircle,
  SScrollShadow, SSelect, SSheet, SSlider, SSwitch, SToastProvider, STypography, createToastQueue, useToast,
} from '../src'
import type { AvatarPerson, PanelSide, PanelSnapPoint } from '../src'
import IdentityMediaReview from './IdentityMediaReview.vue'
import OverlayPresentationReview from './OverlayPresentationReview.vue'
import MeasurementScenariosReview from './MeasurementScenariosReview.vue'
import ToastScenariosReview from './ToastScenariosReview.vue'
import AnnotationScenariosReview from './AnnotationScenariosReview.vue'
import ContentScenariosReview from './ContentScenariosReview.vue'

defineProps<{ id: string }>()
const positions: { side: PanelSide; caption: string }[] = [
  { side: 'left', caption: '左侧' }, { side: 'right', caption: '右侧' },
  { side: 'top', caption: '顶部' }, { side: 'bottom', caption: '底部' },
]
const drawerOpen = ref(false)
const drawerSide = ref<PanelSide>('right')
const sheetOpen = ref(false)
const sheetSide = ref<PanelSide>('bottom')
const sheetPoint = ref<PanelSnapPoint | null | undefined>(undefined)
const sheetFlow = ref<string | null>(null)
const deliveryAddress = ref('')
const flowSteps = [
  { id: 'details', title: '配送设置', description: '填写配送地址。', purpose: 'form' as const, size: 'md' as const },
  { id: 'confirm', title: '核对配送地址', size: 'md' as const },
]
const detached = ref(true)
const work = ref('')
const channel = ref('team')
const toastQueue = createToastQueue()
const toastStatus = ref('')
const toastDialog = ref(false)
const toastDrawer = ref(false)
const notify = useToast()
let dismissNotice: (() => void) | undefined
const progress = ref(62)
const pending = ref(false)
const quota = ref<number | number[]>([25, 65])
const temperature = ref<number | number[]>(45)
const coastCount = ref(0)
const coastCommitted = ref<number>()
const vertical = ref(false)
const avatarGrid = ref(false)
const horizontalScroll = ref(false)
const recentOnly = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const marks = [{ value: 0, label: '0' }, { value: 50, label: '50' }, { value: 100, label: '100' }]
const channels = [{ value: 'team', label: '团队资料库' }, { value: 'public', label: '公开品牌站' }]
const volumeFormat = { style: 'unit', unit: 'gigabyte', unitDisplay: 'short', maximumFractionDigits: 0 } as const
const collaborators: AvatarPerson[] = [
  { id: 'lin', name: '林舟' }, { id: 'zhou', name: '周岚', tone: 'blue' },
  { id: 'chen', name: '陈禾', tone: 'warm' }, { id: 'fang', name: '方以', tone: 'neutral' },
  { id: 'jiang', name: '江时' }, { id: 'he', name: '何音', tone: 'blue' },
]
const revisions = ['更新公开字体授权', '整理品牌配色', '补充文件命名规则', '归档旧版字标', '更新导出目录', '发布品牌手册']
const describeOverflow = (count: number) => '另有 ' + count + ' 位协作者'

function openDrawer(side: PanelSide) {
  drawerSide.value = side
  drawerOpen.value = true
}

function openSheet(side: PanelSide) {
  if (side !== sheetSide.value) sheetPoint.value = undefined
  sheetSide.value = side
  sheetOpen.value = true
}

function showToast(kind: 'success' | 'warning' | 'action' | 'short') {
  if (kind === 'short') {
    toastQueue.add({ id: 'temporary', title: '已保存临时版本', duration: 1000 })
  } else if (kind === 'success') {
    toastQueue.add({ id: 'saved', title: '已保存项目', status: 'success', duration: 0, description: '团队成员可以查看最新内容。' })
  } else if (kind === 'warning') {
    toastQueue.add({ id: 'license', title: '字体授权即将到期', status: 'warning', duration: 0, description: '请在发布前更新授权。' })
  } else {
    toastQueue.add({
      id: 'undo', title: '项目已归档', description: '可以在归档中恢复。', duration: 0,
      actionProps: { label: '撤销', altText: '在归档列表恢复项目', onClick: () => { toastStatus.value = '已恢复项目' } },
    })
  }
}

function saveToast() {
  if (timer) return
  const save = new Promise<void>(resolve => {
    timer = setTimeout(() => {
      timer = undefined
      resolve()
    }, 950)
  })
  void toastQueue.promise(save, {
    loading: { id: 'sync', title: '正在同步', description: '正在上传团队更改。' },
    success: { title: '同步完成', description: '团队内容已更新。', duration: 0 },
    error: '同步失败',
  })
}

function showNotice() {
  dismissNotice = notify({ body: '连接检查通过', uniqueID: 'connection-check', isAutoHide: false,
    onHide: reason => { toastStatus.value = reason === 'manual' ? '已关闭连接提示' : '连接提示已自动关闭' } })
  notify({ body: '重复的连接提示', uniqueID: 'connection-check', collisionBehavior: 'ignore', isAutoHide: false })
}

function replaceNotice() {
  notify({ body: '连接复核已完成', uniqueID: 'connection-check', isAutoHide: false,
    onHide: () => { toastStatus.value = '已关闭复核提示' } })
}

async function finishNoticeWithDuplicate() {
  const dismiss = notify({ body: '正在完成退出', uniqueID: 'leaving-toast', isAutoHide: false })
  await nextTick()
  dismiss()
  notify({ body: '应忽略正在退出的重复提示', uniqueID: 'leaving-toast', collisionBehavior: 'ignore', isAutoHide: false })
}

function advance() {
  progress.value = progress.value >= 100 ? 20 : Math.min(100, progress.value + 12)
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div v-if="id === 'W.drawer'" class="review__stack">
    <div class="review__row">
      <SButton v-for="{ side, caption } in positions" :key="side" size="sm" variant="secondary" @click="openDrawer(side)">
        {{ caption }}抽屉
      </SButton>
    </div>
    <SDrawer v-model:open="drawerOpen" :side="drawerSide" title="项目详情" description="「品牌资源库」的发布设置。" dismiss-label="关闭">
      <div class="review__stack">
        <SInput v-model="work" label="版本说明" placeholder="输入本次发布的信息" />
        <SSelect v-model="channel" label="发布渠道" :options="channels" />
        <SSwitch>同步通知团队</SSwitch>
      </div>
      <template #footer="{ close }"><SButton size="sm" @click="close">保存设置</SButton></template>
    </SDrawer>
    <OverlayPresentationReview kind="drawer" />
  </div>

  <div v-else-if="id === 'W.sheet'" class="review__stack">
    <div class="review__row">
      <SButton v-for="{ side, caption } in positions" :key="side" size="sm" variant="secondary" @click="openSheet(side)">
        {{ caption }}面板
      </SButton>
    </div>
    <SSwitch v-model="detached">留出屏幕边距</SSwitch>
    <SSheet
      v-model:open="sheetOpen"
      v-model:snap-point="sheetPoint"
      :side="sheetSide"
      :size="sheetSide === 'left' || sheetSide === 'right' ? 'lg' : 'full'"
      title="版本记录"
      description="最近发布的素材版本。"
      :detached="detached"
      :snap-points="sheetSide === 'left' || sheetSide === 'right' ? ['38%', '55%'] : [.4, .7]"
      dismiss-label="关闭"
      resize-label="调整面板大小"
      sequential
    >
      <div class="review__stack">
        <SSheet
          side="right"
          size="md"
          title="筛选版本"
          dismiss-label="完成"
          resize-label="调整筛选面板"
          :snap-points="['190px', '60%']"
          detached
        >
          <template #trigger><SButton size="sm" variant="secondary">筛选版本</SButton></template>
          <SSwitch>仅显示稳定版</SSwitch>
        </SSheet>
        <dl class="review__versions">
          <template v-for="index in 12" :key="index">
            <dt>版本 1.{{ 13 - index }}</dt>
            <dd>{{ index === 1 ? '整理品牌配色和公开字体授权。' : '更新品牌素材与使用说明。' }}</dd>
          </template>
        </dl>
      </div>
    </SSheet>
    <SButton size="sm" variant="ghost" @click="sheetFlow = 'details'">打开配送流程</SButton>
    <SBottomSheetSwitcher v-model:active-sheet="sheetFlow" :steps="flowSteps" dismiss-label="关闭流程" detached>
      <template #default="{ step, activate, close }">
        <div v-if="step.id === 'details'" class="review__stack">
          <SInput v-model="deliveryAddress" label="街道地址" autofocus />
          <SButton size="sm" :disabled="!deliveryAddress.trim()" @click="activate('confirm')">核对地址</SButton>
        </div>
        <div v-else class="review__stack">
          <p>{{ deliveryAddress }}</p>
          <div class="review__row">
            <SButton size="sm" variant="secondary" @click="activate('details')">返回修改</SButton>
            <SButton size="sm" @click="close">完成配送设置</SButton>
          </div>
        </div>
      </template>
    </SBottomSheetSwitcher>
    <OverlayPresentationReview kind="sheet" />
  </div>

  <SToastProvider
    v-else-if="id === 'W.toast'"
    :queue="toastQueue"
    label="项目通知"
    viewport-label="项目通知（{hotkey}）"
    dismiss-label="关闭提示"
    placement="bottom-end"
    :max-visible="3"
  >
    <div class="review__stack">
      <div class="review__row">
        <SButton size="sm" variant="secondary" @click="showToast('success')">保存项目</SButton>
        <SButton size="sm" variant="secondary" @click="showToast('warning')">检查授权</SButton>
        <SButton size="sm" variant="secondary" @click="showToast('action')">归档项目</SButton>
        <SButton size="sm" variant="secondary" @click="saveToast">同步更改</SButton>
        <SButton size="sm" variant="ghost" @click="showToast('short')">短时提示</SButton>
        <SButton size="sm" variant="ghost" @click="showNotice">全局连接提示</SButton>
        <SButton size="sm" variant="ghost" @click="dismissNotice?.()">关闭全局提示</SButton>
        <SButton size="sm" variant="ghost" @click="replaceNotice">替换全局提示</SButton>
        <SButton size="sm" variant="ghost" @click="finishNoticeWithDuplicate">测试退出提示去重</SButton>
        <SButton size="sm" variant="secondary" @click="toastDialog = true">打开通知对话框</SButton>
      </div>
      <span v-if="toastStatus" class="review__result" role="status">{{ toastStatus }}</span>
      <SDialog v-model:open="toastDialog" title="通知与对话框">
        <SButton size="sm" variant="secondary" @click="toastDrawer = true">打开通知副面板</SButton>
        <SButton size="sm" variant="ghost" @click="toastDialog = false">关闭通知对话框</SButton>
        <SDrawer v-model:open="toastDrawer" title="通知副面板" modal dismiss-label="关闭通知副面板" />
      </SDialog>
      <ToastScenariosReview />
    </div>
  </SToastProvider>

  <div v-else-if="id === 'W.slider'" class="review__stack">
    <SSlider
      v-if="!vertical"
      v-model="quota"
      class="review__measurement"
      label="素材分配范围"
      name="allocation"
      :step="5"
      :marks="marks"
      :thumb-labels="['最小分配', '最大分配']"
      :min-steps-between-thumbs="2"
      show-steps
    />
    <SSlider
      v-else
      v-model="temperature"
      label="环境照度"
      orientation="vertical"
      coast
      :step="5"
      :marks="marks"
      show-steps
      @commit="coastCount++; coastCommitted = Number($event)"
    />
    <output v-if="vertical" aria-label="最终照度">{{ coastCommitted ?? '未提交' }} · {{ coastCount }}</output>
    <SSwitch v-model="vertical">纵向</SSwitch>
    <MeasurementScenariosReview kind="slider" />
  </div>

  <div v-else-if="id === 'W.meter'" class="review__stack">
    <SMeter
      class="review__measurement"
      label="资源存储"
      :value="progress"
      :max="128"
      :format-options="volumeFormat"
      locale="zh-CN"
      :tone="progress >= 85 ? 'warning' : 'accent'"
    />
    <SButton size="sm" variant="secondary" @click="advance">增加用量</SButton>
  </div>

  <div v-else-if="id === 'W.progress-bar' || id === 'W.progress-circle'" class="review__stack">
    <SProgressBar
      v-if="id === 'W.progress-bar'"
      class="review__measurement"
      label="素材上传"
      :value="progress"
      :indeterminate="pending"
      locale="zh-CN"
    />
    <SProgressCircle
      v-else
      label="同步进度"
      :value="progress"
      :indeterminate="pending"
      locale="zh-CN"
      size="lg"
      show-value
    />
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="advance">更新进度</SButton>
      <SSwitch v-model="pending">进度未知</SSwitch>
    </div>
    <MeasurementScenariosReview v-if="id === 'W.progress-bar'" kind="progress" />
  </div>

  <div v-else-if="id === 'W.avatar-group'" class="review__stack">
    <SAvatarGroup
      label="品牌协作者"
      :items="collaborators"
      :max="avatarGrid ? undefined : 4"
      :layout="avatarGrid ? 'grid' : 'stack'"
      :overflow-label="describeOverflow"
    />
    <SSwitch v-model="avatarGrid">展开协作者</SSwitch>
    <IdentityMediaReview kind="group" />
  </div>

  <div v-else-if="id === 'W.kbd'" class="review__stack">
    <div class="review__row"><span>打开项目搜索</span><SKbd :keys="['command', 'K']" label="Command 加 K" /></div>
    <div class="review__row"><span>切换搜索结果</span><SKbd :keys="['up', 'down']" separator="/" label="上或下方向键" /></div>
    <div class="review__row"><span>关闭搜索</span><SKbd :keys="['escape']" /></div>
    <AnnotationScenariosReview kind="kbd" />
  </div>

  <template v-else-if="id === 'W.typography'">
    <STypography as="article" variant="prose">
      <SHeading :level="2" type="display-2" balance>品牌资源库</SHeading>
      <STypography variant="lead">统一图形、色彩和文字素材的使用方式。</STypography>
      <SHeading :level="3">文件与授权</SHeading>
      <STypography>发布前检查素材的授权范围，并将最终版本存入 <STypography variant="code">assets/brand</STypography>。</STypography>
      <STypography variant="caption" tone="muted">更新于 2026 年 11 月 20 日</STypography>
    </STypography>
    <ContentScenariosReview kind="typography" />
  </template>

  <div v-else class="review__stack">
    <SScrollShadow
      :key="horizontalScroll ? 'horizontal' : 'vertical'"
      class="review__edge-sample"
      :label="horizontalScroll ? '资料分类' : '版本更新'"
      :orientation="horizontalScroll ? 'horizontal' : 'vertical'"
      :size="20"
      hide-scroll-bar
    >
      <div v-if="horizontalScroll" class="review__edge-row">
        <span v-for="name in ['品牌说明', '设计规范', '公开字体', '配色资料', '构图模板', '归档文件']" :key="name">{{ name }}</span>
      </div>
      <ol v-else class="review__edge-list">
        <li v-for="entry in (recentOnly ? revisions.slice(0, 1) : revisions)" :key="entry">{{ entry }}</li>
      </ol>
    </SScrollShadow>
    <div class="review__row">
      <SSwitch v-model="horizontalScroll">横向</SSwitch>
      <SSwitch v-model="recentOnly" :disabled="horizontalScroll">仅看最近</SSwitch>
    </div>
    <ScrollHooksReview kind="strip" />
  </div>
</template>

<style scoped>
.review__measurement { inline-size: min(100%, 22rem); }
.review__versions {
  display: grid;
  gap: 3px;
  margin: 0;
  color: var(--sy-text-muted);
  font-size: .875rem;
}
.review__versions dt { margin-block-start: 6px; color: var(--sy-text); font-weight: 650; }
.review__versions dd { margin: 0; }
.review__edge-sample { inline-size: min(100%, 19rem); max-block-size: 127px; }
.review__edge-list { margin: 0; padding-inline-start: 21px; }
.review__edge-list li { padding-block: 6px; }
.review__edge-row { display: flex; gap: 6px; padding-block: 2px; }
.review__edge-row span { padding: 6px 10px; background: var(--sy-surface-muted); border-radius: 8px; white-space: nowrap; }
</style>
