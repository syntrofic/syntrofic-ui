<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SAdaptiveDialog, SBottomSheetSwitcher, SButton, SCheckbox, SDrawer, SDropdown, SIcon, SInput, SMotionText, SSelect,
  SSheet, SSlider, SSwitch, STextArea, type MenuEntry, type PanelSnapPoint, type SheetHeight,
} from '../src'

defineProps<{ kind: 'dialog' | 'drawer' | 'sheet' }>()

const open = ref(false)
const note = ref('')
const deliveryActions: MenuEntry[] = [
  { id: 'review', label: '登记复核' },
  { id: 'archive', label: '标记归档' },
]
function recordDelivery(action: string) {
  note.value = action === 'review' ? '已登记复核' : '已标记归档'
}
const pageEdits = ref(0)
const direction = ref(false)
const drawerDetails = ref(false)
const host = ref('刘晓')
const drawerWidth = ref<PanelSnapPoint>(320)
const drawerMode = ref<'form' | 'nonmodal' | 'start' | 'width'>('form')
const widthOptions = [
  { value: 320, label: '320 像素' }, { value: '26rem', label: '26 rem' }, { value: '50%', label: '视口宽度的 50%' },
] as const
function showDrawer(mode: typeof drawerMode.value) {
  drawerDetails.value = false
  drawerMode.value = mode
  open.value = true
}

const dialogMode = ref<'profile' | 'full' | 'scroll' | 'required' | 'info'>('profile')
const profileName = ref('林舟')
const profileEmail = ref('lin@example.com')
const profileNotes = ref('')
const presentationOptions = [
  { value: 'auto', label: '跟随设备' }, { value: 'dialog', label: '居中对话框' },
  { value: 'fullscreen', label: '全屏对话框' }, { value: 'bottom-sheet', label: '底部面板' },
] as const
const profileMode = ref<typeof presentationOptions[number]['value']>('auto')
const dialogs = {
  profile: { title: '联系人资料', description: '更新交付通知的接收信息。' },
  full: { title: '全屏交付预览', description: '核对资料范围与授权。' },
  scroll: { title: '交付条款', description: '在独立区域内滚动阅读。' },
  required: { title: '确认发布权限', description: '请确认你有权发布这些资料。' },
  info: { title: '交付说明', description: '确认文件名称与发布版本。' },
}
const dialogPresentation = computed(() => {
  if (dialogMode.value === 'full') return 'fullscreen'
  if (dialogMode.value !== 'profile') return 'dialog'
  return profileMode.value === 'auto' ? undefined : profileMode.value
})
function showDialog(mode: typeof dialogMode.value) {
  dialogMode.value = mode
  open.value = true
}

const sheetMode = ref<'hug' | 'capped' | 'tall' | 'nonmodal' | 'peek' | 'filter' | 'gesture'>('hug')
const sheets: Record<typeof sheetMode.value, { title: string; height: SheetHeight }> = {
  hug: { title: '当前交付状态', height: 'hug' }, capped: { title: '更新记录', height: 'capped' },
  tall: { title: '收件信息', height: 'tall' }, nonmodal: { title: '无需遮罩的备注', height: 'hug' },
  peek: { title: '配送进度', height: 'tall' }, filter: { title: '筛选交付记录', height: 'hug' },
  gesture: { title: '交付历史', height: '82%' },
}
const detents = ['96px', '50%'] as const
const sheetStops = computed(() => sheetMode.value === 'peek' ? detents : sheetMode.value === 'gesture' ? ['48%'] as const : undefined)
const sheetStop = ref<PanelSnapPoint | null | undefined>()
const revision = ref(85)
const urgentOnly = ref(false)
const recipient = ref({ name: '', company: '', street: '', city: '', region: '', postal: '', phone: '' })
const recipientFields = [
  { key: 'name', label: '收件人' }, { key: 'company', label: '机构' }, { key: 'street', label: '街道' },
  { key: 'city', label: '城市' }, { key: 'region', label: '省份' }, { key: 'postal', label: '邮编' }, { key: 'phone', label: '收件电话' },
] as const
const flow = ref<string | null>(null)
const release = ref('')
const flowSteps = [
  { id: 'edit', title: '填写发布说明', snapPoints: [.34], purpose: 'form' },
  { id: 'review', title: '核对发布说明', snapPoints: [.51], purpose: 'form' },
  { id: 'done', title: '已准备发布', snapPoints: [.26], purpose: 'info' },
] as const
function showSheet(mode: typeof sheetMode.value) {
  sheetMode.value = mode
  sheetStop.value = undefined
  open.value = true
}
function finish(comment: string) {
  note.value = comment
  open.value = false
}

const updates = ['更新图片使用范围', '补齐交付手册', '发布资产清单', '更新访客入口', '核对字体许可', '归档项目素材']
</script>

<template>
  <section v-if="kind === 'dialog'" class="overlay-review" aria-label="对话框展示方式">
    <div class="overlay-review__present"><SSelect v-model="profileMode" label="联系人弹窗展示" :options="presentationOptions" /></div>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="showDialog('profile')">编辑联系人</SButton>
      <SButton size="sm" variant="secondary" @click="showDialog('full')">全屏预览</SButton>
      <SButton size="sm" variant="secondary" @click="showDialog('scroll')">阅读交付条款</SButton>
      <SButton size="sm" variant="secondary" @click="showDialog('required')">确认发布权限</SButton>
      <SButton size="sm" variant="ghost" @click="showDialog('info')">打开交付说明</SButton>
    </div>
    <p class="overlay-review__result"><SMotionText :value="note" announce /></p>
    <SAdaptiveDialog v-model:open="open" v-bind="dialogs[dialogMode]" width="30rem" :max-height="dialogMode === 'scroll' ? 380 : '85dvh'"
      :presentation="dialogPresentation" touch-presentation="bottom-sheet" bottom-sheet-height="tall"
      :purpose="dialogMode === 'profile' ? 'form' : dialogMode === 'required' ? 'required' : 'info'"
      :show-close-button="dialogMode === 'info'" dismiss-label="关闭交付说明">
      <template v-if="dialogMode === 'info'" #header-start><SIcon name="info" size="sm" /></template>
      <template v-if="dialogMode === 'info'" #header-end><SButton size="sm" variant="ghost" @click="note = '已查看发布状态'">查看状态</SButton></template>
      <div v-if="dialogMode === 'profile'" class="overlay-review__body">
        <SInput v-model="profileName" label="联系人姓名" autofocus />
        <SInput v-model="profileEmail" label="联系人邮箱" type="email" />
        <STextArea v-model="profileNotes" label="交付备注" />
      </div>
      <ol v-else-if="dialogMode === 'scroll' || dialogMode === 'full'" class="overlay-review__records">
        <li v-for="index in 18" :key="index">{{ updates[(index - 1) % updates.length] }} · 第 {{ index }} 项</li>
      </ol>
      <p v-else>{{ dialogMode === 'required' ? '发布后，拥有访问权限的成员可以下载资料。' : '先检查预览，再将链接发给团队。' }}</p>
      <SDropdown v-if="dialogMode === 'info'" label="交付操作" :items="deliveryActions" @action="recordDelivery" />
      <template v-if="dialogMode !== 'info'" #footer="{ close }">
        <template v-if="dialogMode === 'profile'">
          <SButton size="sm" variant="secondary" @click="close">取消编辑</SButton>
          <SButton size="sm" :disabled="!profileName.trim()" @click="finish('已保存 ' + profileName)">保存联系人</SButton>
        </template>
        <SButton v-else-if="dialogMode === 'required'" size="sm" @click="finish('已确认发布权限')">同意并完成</SButton>
        <SButton v-else size="sm" variant="secondary" @click="close">完成阅读</SButton>
      </template>
    </SAdaptiveDialog>
  </section>

  <section v-else-if="kind === 'drawer'" class="overlay-review" aria-label="抽屉展示方式">
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="showDrawer('form')">编辑交付负责人</SButton>
      <SButton size="sm" variant="secondary" @click="showDrawer('nonmodal')">打开并列详情</SButton>
      <SButton size="sm" variant="secondary" @click="showDrawer('start')">从起始侧打开</SButton>
      <SButton size="sm" variant="secondary" @click="showDrawer('width')">比较抽屉宽度</SButton>
    </div>
    <SSwitch v-model="direction">从右到左阅读</SSwitch>
    <div class="review__row"><SButton size="sm" variant="ghost" @click="pageEdits++">登记页面变更</SButton><SMotionText :value="`已登记 ${pageEdits} 次`" motion="roll" announce /></div>
    <p class="overlay-review__result"><SMotionText :value="note" announce /></p>
    <SDrawer v-model:open="open" title="交付详情" description="发布负责人和历史记录。" dismiss-label="关闭交付详情"
      :direction="direction ? 'rtl' : 'ltr'" :side="drawerMode === 'start' ? 'start' : 'end'" :extent="drawerMode === 'width' ? drawerWidth : undefined"
      :modal="drawerMode !== 'nonmodal'" :purpose="drawerMode === 'form' ? 'form' : 'info'">
      <template #header-start><SIcon name="file" size="sm" /></template>
      <template #header-end><SButton size="sm" variant="ghost" :aria-expanded="drawerDetails" @click="drawerDetails = !drawerDetails">查看修订</SButton></template>
      <div class="overlay-review__drawer-content">
        <div class="overlay-review__revision" :data-open="drawerDetails || undefined" :inert="!drawerDetails" :aria-hidden="!drawerDetails || undefined">
          <div><p>已更新共享资料的发布范围。</p></div>
        </div>
        <SInput v-if="drawerMode === 'form'" v-model="host" label="负责人姓名" autofocus />
        <div v-else-if="drawerMode === 'width'" class="review__row">
          <SButton v-for="item in widthOptions" :key="item.label" size="sm" variant="secondary" :aria-pressed="drawerWidth === item.value"
            @click="drawerWidth = item.value">{{ item.label }}</SButton>
          <SDropdown label="交付操作" :items="deliveryActions" @action="recordDelivery" />
        </div>
        <p v-else>共享资料将在发布后发送给团队成员。</p>
      </div>
      <template v-if="drawerMode === 'form'" #footer="{ close }">
        <SButton size="sm" variant="secondary" @click="close">取消修改</SButton>
        <SButton size="sm" :disabled="!host.trim()" @click="finish('已保存负责人 ' + host)">保存负责人</SButton>
      </template>
    </SDrawer>
  </section>

  <section v-else class="overlay-review" aria-label="底部面板展示方式">
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="showSheet('hug')">按内容定高</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('capped')">限制最高高度</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('tall')">填写收件信息</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('peek')">查看停靠位置</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('gesture')">拖动与滚动</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('nonmodal')">打开无罩备注</SButton>
      <SButton size="sm" variant="secondary" @click="showSheet('filter')">筛选交付</SButton>
      <SButton size="sm" variant="ghost" @click="flow = 'edit'">打开三步发布流程</SButton>
    </div>
    <div class="review__row"><SButton size="sm" variant="ghost" @click="pageEdits++">更新页面记录</SButton><SMotionText :value="`已登记 ${pageEdits} 次`" motion="roll" announce /></div>
    <p class="overlay-review__result"><SMotionText :value="note" announce /></p>
    <SSheet v-model:open="open" v-model:snap-point="sheetStop" v-bind="sheets[sheetMode]"
      :initial-snap-point="sheetMode === 'peek' ? '50%' : undefined" :snap-points="sheetStops"
      :purpose="sheetMode === 'tall' ? 'form' : 'info'" :modal="sheetMode !== 'nonmodal'" dismiss-label="关闭底部面板" resize-label="切换配送面板高度">
      <p v-if="sheetMode === 'hug'">品牌资料已经过审核，等待交付。</p>
      <ol v-else-if="sheetMode === 'capped' || sheetMode === 'peek'" class="overlay-review__records">
        <li v-for="index in 18" :key="index">{{ updates[(index - 1) % updates.length] }} · 第 {{ index }} 项</li>
      </ol>
      <div v-else-if="sheetMode === 'tall'" class="overlay-review__body">
        <SInput v-for="field in recipientFields" :key="field.key" v-model="recipient[field.key]" :label="field.label" :autofocus="field.key === 'name'" />
      </div>
      <p v-else-if="sheetMode === 'nonmodal'">保持备注打开，继续登记页面记录。</p>
      <div v-else-if="sheetMode === 'gesture'" class="overlay-review__body">
        <ol class="overlay-review__records overlay-review__scroll" aria-label="修订记录" tabindex="0">
          <li v-for="(update, index) in updates" :key="update">{{ index + 1 }} 月 · {{ update }}</li>
        </ol>
        <div class="overlay-review__scrub"><SSlider v-model="revision" label="已阅进度" /></div>
        <div class="review__row">
          <SButton size="sm" variant="secondary" @click="revision = 100">标为已读</SButton>
          <SDropdown label="交付操作" :items="deliveryActions" @action="recordDelivery" />
        </div>
      </div>
      <SCheckbox v-else v-model="urgentOnly" label="仅显示待处理" />
      <template v-if="sheetMode === 'tall' || sheetMode === 'filter'" #footer>
        <SButton v-if="sheetMode === 'tall'" size="sm" :disabled="!recipient.name.trim()" @click="finish('已保存收件人 ' + recipient.name)">保存收件信息</SButton>
        <SButton v-else size="sm" @click="finish(urgentOnly ? '仅显示待处理记录' : '已显示所有交付记录')">应用筛选</SButton>
      </template>
    </SSheet>
    <SBottomSheetSwitcher v-model:active-sheet="flow" :steps="flowSteps" dismiss-label="关闭发布流程" detached>
      <template #default="{ step, activate, close }">
        <div v-if="step.id === 'edit'" class="overlay-review__body">
          <SInput v-model="release" label="发布摘要" autofocus />
          <SButton size="sm" :disabled="!release.trim()" @click="activate('review')">核对摘要</SButton>
        </div>
        <template v-else-if="step.id === 'review'">
          <p>{{ release }}</p>
          <div class="review__row"><SButton size="sm" variant="secondary" @click="activate('edit')">返回编辑</SButton><SButton size="sm" @click="activate('done')">确认摘要</SButton></div>
        </template>
        <div v-else class="review__row">
          <SButton size="sm" @click="close(); note = '发布摘要已确认'">结束发布流程</SButton>
          <SDropdown label="交付操作" :items="deliveryActions" @action="recordDelivery" />
        </div>
      </template>
    </SBottomSheetSwitcher>
  </section>
</template>

<style scoped>
.overlay-review { display: grid; min-inline-size: 0; gap: var(--sy-space-2); }
.overlay-review__present { inline-size: min(100%, 16rem); }
.overlay-review__result { margin: 0; min-block-size: 1em; color: var(--sy-text-muted); font-size: .85rem; }
.overlay-review__body { display: grid; gap: var(--sy-space-3); }
.overlay-review__revision { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-duration) var(--sy-ease-settle); }
.overlay-review__revision[data-open] { grid-template-rows: 1fr; opacity: 1; }
.overlay-review__revision > div { min-block-size: 0; overflow: clip; }
.overlay-review__revision p { margin-block: 0 var(--sy-space-3); }
.overlay-review__records { display: grid; gap: var(--sy-space-2); margin: 0; padding-inline-start: 1.5em; }
.overlay-review__scroll { block-size: 6.5rem; overflow: auto; overscroll-behavior-y: none; scrollbar-gutter: stable; }
.overlay-review__scrub { touch-action: none; }
@media (prefers-reduced-motion: reduce) { .overlay-review__revision { transition: none; } }
</style>
