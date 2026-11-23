<script setup lang="ts">
import { computed, defineAsyncComponent, h, ref } from 'vue'
import {
  SAlert, SBadge, SButton, SButtonGroup, SCard, SCheckbox, SCheckboxGroup, SChip, SCloseButton,
  SDescription, SDialog, SDisclosure, SErrorMessage, SFieldset, SFocusGroup, SForm, SIcon, SInput, SInputGroup, SInputGroupText, SLabel,
  SMotionText, SRadio, SRadioGroup, SSelect, SSeparator, SSkeleton, SSurface, SSwitch,
  SSwitchGroup, STabBar, STabBarMoreList, STable, STabs, STextArea, STextField, STooltip, useImperativeAlertDialog, useImperativeDialog,
} from '../src'
import type { TabBarItem, TableColumn, TableKey } from '../src'
import TooltipReview from './TooltipReview.vue'
import TabScenariosReview from './TabScenariosReview.vue'
import ContentScenariosReview from './ContentScenariosReview.vue'
import CollectionsReview from './CollectionsReview.vue'
import ComboboxToolsReview from './ComboboxToolsReview.vue'
import ChoiceReview from './ChoiceReview.vue'
import EditableFieldReview from './EditableFieldReview.vue'
import FieldHooksReview from './FieldHooksReview.vue'
import OverlayHooksReview from './OverlayHooksReview.vue'
import FieldScenariosReview from './FieldScenariosReview.vue'
import OverlayPresentationReview from './OverlayPresentationReview.vue'
import DialogPlacementReview from './DialogPlacementReview.vue'
import deliveryArea from './assets/delivery-area.png'
import { proChatActionExamples, proPromptExamples, standardExamples } from './review-catalog'
import { colorExamples, dateInputExamples, overlayFeedbackExamples, proActivityExamples, proAppShellExamples, proCardsBoardExamples, proChartExamples, proChatExamples, proCollectionsExamples, proComposedExamples, proContentExamples, proDataDisplayExamples, proFeedbackExamples, proFormControlsExamples, proItemKpiExamples, proNavigationExamples, proSettingsExamples } from './review-catalog'

defineProps<{ id: string }>()

const StandardReview = defineAsyncComponent(() => import('./StandardReview.vue'))
const AnnotationScenariosReview = defineAsyncComponent(() => import('./AnnotationScenariosReview.vue'))
const SelectorScenariosReview = defineAsyncComponent(() => import('./SelectorScenariosReview.vue'))
const SelectorHooksReview = defineAsyncComponent(() => import('./SelectorHooksReview.vue'))
const IdentityMediaReview = defineAsyncComponent(() => import('./IdentityMediaReview.vue'))
const SurfaceReview = defineAsyncComponent(() => import('./SurfaceReview.vue'))
const LoadingScenariosReview = defineAsyncComponent(() => import('./LoadingScenariosReview.vue'))
const TableExpansionReview = defineAsyncComponent(() => import('./TableExpansionReview.vue'))
const TableLoadingReview = defineAsyncComponent(() => import('./TableLoadingReview.vue'))
const TableScenariosReview = defineAsyncComponent(() => import('./TableScenariosReview.vue'))
const DateInputsReview = defineAsyncComponent(() => import('./DateInputsReview.vue'))
const OverlayFeedbackReview = defineAsyncComponent(() => import('./OverlayFeedbackReview.vue'))
const ColorReview = defineAsyncComponent(() => import('./ColorReview.vue'))
const RacReview = defineAsyncComponent(() => import('./RacReview.vue'))
const ProFeedbackReview = defineAsyncComponent(() => import('./ProFeedbackReview.vue'))
const ProSettingsReview = defineAsyncComponent(() => import('./ProSettingsReview.vue'))
const ProFormControlsReview = defineAsyncComponent(() => import('./ProFormControlsReview.vue'))
const ProContentReview = defineAsyncComponent(() => import('./ProContentReview.vue'))
const ProNavigationReview = defineAsyncComponent(() => import('./ProNavigationReview.vue'))
const ProAppShellReview = defineAsyncComponent(() => import('./ProAppShellReview.vue'))
const ProComposedReview = defineAsyncComponent(() => import('./ProComposedReview.vue'))
const ProDataDisplayReview = defineAsyncComponent(() => import('./ProDataDisplayReview.vue'))
const ProCollectionsReview = defineAsyncComponent(() => import('./ProCollectionsReview.vue'))
const ProCardsBoardReview = defineAsyncComponent(() => import('./ProCardsBoardReview.vue'))
const ProItemKpiReview = defineAsyncComponent(() => import('./ProItemKpiReview.vue'))
const ProActivityReview = defineAsyncComponent(() => import('./ProActivityReview.vue'))
const ProMapReview = defineAsyncComponent(() => import('./ProMapReview.vue'))
const ProChartsReview = defineAsyncComponent(() => import('./ProChartsReview.vue'))
const ProChatReview = defineAsyncComponent(() => import('./ProChatReview.vue'))
const ProChatActionsReview = defineAsyncComponent(() => import('./ProChatActionsReview.vue'))
const ProPromptReview = defineAsyncComponent(() => import('./ProPromptReview.vue'))
const name = ref('品牌资源库')
const price = ref('')
const website = ref('release')
const note = ref('')
const textError = computed(() => name.value.trim() ? undefined : '请输入项目名称。')
const topics = ref<readonly string[]>(['design'])
const visibility = ref('team')
const notices = ref<readonly string[]>(['email'])
const open = ref(false)
const heroOpen = ref(false)
const heroFullscreen = ref(false)
const notesDialog = useImperativeDialog()
const verifyDialog = useImperativeAlertDialog()
let previewRequests = 0
const buttonStyles = [{ variant: 'primary', label: '发布' }, { variant: 'secondary', label: '预览草稿' },
  { variant: 'ghost', label: '查看详情' }, { variant: 'danger', label: '移除草稿' }] as const
const buttonSizes = [{ size: 'sm', label: '小尺寸' }, { size: 'md', label: '中尺寸' }, { size: 'lg', label: '大尺寸' }] as const
const buttonStates = [{ value: 'ready', label: '默认' }, { value: 'disabled', label: '不可用' }, { value: 'loading', label: '加载中' }]
const buttonState = ref('ready')
const iconActions = [{ icon: 'copy', label: '复制当前选区', result: '已复制当前选区' },
  { icon: 'link', label: '查看共享链接', result: '已查看共享链接' }, { icon: 'wrench', label: '打开编辑工具', result: '已打开编辑工具' }]
const showing = ref(true)
const result = ref('')
const tab = ref('overview')
const mobileTab = ref('today')
const kind = ref('design')
const categories = ref<string[]>(['design'])
const selection = ref<readonly TableKey[]>([])
const virtualTable = ref(false)
const tablePageSize = ref(2)
const nameEdit = ref('设计文件 1')
const date = ref('2026-11-20')

const options = [
  { value: 'design', label: '设计', group: '项目分类' },
  { value: 'product', label: '产品', group: '项目分类' },
  { value: 'engineering', label: '工程', group: '项目分类' },
  { value: 'archive', label: '归档分类', group: '其他', disabled: true },
]
const tabs = [
  { value: 'overview', label: '概况' }, { value: 'files', label: '文件' }, { value: 'activity', label: '动态', disabled: true },
]
const mobileTabs: TabBarItem[] = [
  { value: 'today', label: '今日', icon: 'menu' }, { value: 'assets', label: '素材', icon: 'file' },
  { value: 'review', label: '评审', icon: 'check', badge: 3, badgeLabel: '3 项待评审' }, { value: 'delivery', label: '交付', icon: 'link', disabled: true },
  { value: 'history', label: '历史记录', icon: 'info' }, { value: 'drafts', label: '草稿箱', icon: 'file', disabled: true },
]
const activeMobileTab = computed(() => mobileTabs.find(item => item.value === mobileTab.value))
const files = [
  { id: 1, name: '品牌规范', editor: '林舟', size: 1.3 },
  { id: 2, name: '组件规范', editor: '周昱', size: 2.6 },
  { id: 3, name: '产品说明', editor: '许然', size: 0.8 },
]
const columns: TableColumn<(typeof files)[number]>[] = [
  { key: 'name', label: '文件名', rowHeader: true, value: row => row.name, sortable: true },
  { key: 'editor', label: '负责人', value: row => row.editor },
  { key: 'size', label: '大小（MB）', value: row => row.size, sortable: true, align: 'end' },
]
const longList = Array.from({ length: 2_000 }, (_, index) => ({
  id: index + 1,
  name: `设计文件 ${index + 1}`,
  editor: files[index % files.length].editor,
  size: (index % 80 + 1) / 10,
}))

function pause(signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 700)
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
}

async function save(_event: MouseEvent, signal: AbortSignal) {
  result.value = '正在保存修改'
  await pause(signal)
  if (!signal.aborted) result.value = '已保存'
}

async function refreshPreview(_event: MouseEvent, signal: AbortSignal) {
  const request = ++previewRequests
  result.value = `正在生成第 ${request} 次预览`
  await pause(signal)
  if (!signal.aborted) result.value = `第 ${request} 次预览已就绪`
}

async function syncFiles(_event: MouseEvent, signal: AbortSignal) {
  await pause(signal)
  if (!signal.aborted) result.value = '已同步选中的文件'
}

function chooseButton({ variant, label }: (typeof buttonStyles)[number]) {
  if (variant === 'danger') {
    verifyDialog.show({ title: '移除这份草稿？', cancelLabel: '保留草稿', confirmLabel: '移除', onConfirm: () => result.value = '草稿已移除' })
  } else result.value = '已选择' + label
}

function submit(_: SubmitEvent, data: FormData) {
  const labels = data.getAll('topics').map(key => options.find(option => option.value === key)?.label ?? key)
  result.value = `${data.get('name')} · ${labels.join('、')} · ${data.get('visibility') === 'team' ? '团队可见' : '仅自己'}`
}

function submitCategories(_: SubmitEvent, data: FormData) {
  const labels = data.getAll('categories').map(key => options.find(option => option.value === key)?.label ?? key)
  result.value = `已查询：${labels.join('、') || '所有分类'}`
}

</script>

<template>
  <template v-if="id === 'W.button'">
    <div class="review__row">
      <SButton :click-action="save">保存修改</SButton>
      <SButton variant="secondary" @click="result = '已打开预览'">预览</SButton>
      <SButton variant="ghost" :click-action="refreshPreview" interruptible>刷新预览</SButton>
      <SButton variant="danger" disabled>删除项目</SButton>
    </div>
    <div class="review__row" role="group" aria-label="按钮变体">
      <SSelect v-model="buttonState" label="演示状态" :options="buttonStates" />
      <SButton v-for="item in buttonStyles" :key="item.variant" :variant="item.variant"
        :loading="buttonState === 'loading'" :disabled="buttonState === 'disabled'" @click="chooseButton(item)">
        {{ item.label }}
      </SButton>
    </div>
    <div class="review__row" role="group" aria-label="按钮尺寸">
      <SButton v-for="{ size, label } in buttonSizes" :key="size" :size="size" variant="secondary" @click="result = '已选择' + label">{{ label }}</SButton>
    </div>
    <div class="review__row" role="group" aria-label="浮起、图标与角标">
      <SButton elevation="med" @click="result = '已添加一份草稿'">
        <template #start><SIcon name="plus" /></template>
        添加草稿
      </SButton>
      <SButton variant="secondary" @click="result = '有 12 项待评审'">
        待评审
        <template #end><SBadge tone="accent">12</SBadge></template>
      </SButton>
    </div>
    <div class="review__row" role="group" aria-label="图标操作">
      <SButton icon-only elevation="high" @click="result = '已添加一份草稿'">
        <template #start><SIcon name="plus" /></template>快速添加草稿
      </SButton>
      <STooltip v-for="item in iconActions" :key="item.icon" :text="item.label">
        <template #trigger>
          <SButton icon-only variant="ghost" @click="result = item.result"><template #start><SIcon :name="item.icon" /></template>{{ item.label }}</SButton>
        </template>
      </STooltip>
      <SButton icon-only variant="secondary" :click-action="syncFiles"><template #start><SIcon name="upload" /></template>同步文件</SButton>
    </div>
    <component :is="verifyDialog.element" />
    <p class="review__result"><SMotionText :value="result" announce /></p>
  </template>

  <template v-else-if="id === 'W.button-group'">
    <SButtonGroup label="对齐方式" variant="secondary" size="sm" joined>
      <SButton @click="result = '左对齐'">左对齐</SButton>
      <SButton @click="result = '居中'">居中</SButton>
      <SButton @click="result = '右对齐'">右对齐</SButton>
    </SButtonGroup>
    <SButtonGroup label="浮起的编辑工具" variant="secondary" size="sm" elevation="med" joined>
      <SButton elevation="high" @click="result = '已复制选区'">复制选区</SButton>
      <SButton @click="result = '已创建副本'">创建副本</SButton>
      <SButton icon-only @click="result = '已查看创建记录'"><template #start><SIcon name="info" /></template>查看创建记录</SButton>
    </SButtonGroup>
    <p class="review__result"><SMotionText :value="result" announce /></p>
  </template>

  <template v-else-if="id === 'W.close-button'">
    <div class="review__row">
      <span>预览窗口</span>
      <SCloseButton label="关闭预览窗口" @click="result = '预览窗口已关闭'" />
    </div>
    <p class="review__result"><SMotionText :value="result" announce /></p>
  </template>

  <ChoiceReview v-else-if="id === 'W.checkbox'" kind="checkbox" />

  <ChoiceReview v-else-if="id === 'W.checkbox-group'" kind="checkbox-group" />

  <template v-else-if="id === 'W.description'">
    <SInput v-model="name" label="项目名称" aria-describedby="review-description" />
    <SDescription id="review-description">名称将出现在团队项目列表。</SDescription>
  </template>

  <template v-else-if="id === 'W.error-message'">
    <SButton variant="secondary" @click="result = '保存失败，请重试。'">模拟保存失败</SButton>
    <div class="review__result"><SErrorMessage v-if="result" announce>{{ result }}</SErrorMessage></div>
  </template>

  <STextField v-else-if="id === 'W.field-error'" label="项目名称" error="项目名称已存在。">
    <SInput v-model="name" />
  </STextField>

  <SFieldset v-else-if="id === 'W.fieldset'" legend="项目基本信息" description="归档期间暂停修改。" disabled>
    <SInput v-model="name" label="名称" />
    <SInput v-model="date" label="归档日期" />
  </SFieldset>

  <SForm v-else-if="id === 'W.form'" @submit="submit" @reset="result = ''">
    <SFocusGroup class="review__stack">
      <STextField label="项目名称" description="用于团队列表。" :error="textError" required>
        <SInput v-model="name" name="name" />
      </STextField>
      <STextArea v-model="note" label="项目备注" name="note" auto-grow :rows="2" :max-rows="5" />
    </SFocusGroup>
    <SCheckboxGroup v-model="topics" label="订阅内容" name="topics" required required-message="至少选择一项。">
      <SCheckbox value="design">设计更新</SCheckbox>
      <SCheckbox value="product">产品公告</SCheckbox>
    </SCheckboxGroup>
    <SRadioGroup v-model="visibility" label="可见范围" name="visibility" required orientation="horizontal">
      <SRadio value="team">团队可见</SRadio>
      <SRadio value="private">仅自己</SRadio>
    </SRadioGroup>
    <div class="review__row">
      <SButton type="submit">保存</SButton>
      <SButton type="reset" variant="secondary">重置</SButton>
    </div>
    <p class="review__result">{{ result }}</p>
  </SForm>

  <EditableFieldReview v-else-if="id === 'W.input'" kind="text" />

  <div v-else-if="id === 'W.input-group'" class="review__editable">
    <STextField label="工作区路径">
      <SInputGroup>
        <template #start>syntrofic.com/</template>
        <SInput v-model="name" />
        <template #end><SButton variant="ghost" size="sm" @click="name = ''">清除</SButton></template>
      </SInputGroup>
    </STextField>
    <SInputGroup label="单次授权价格" description="按美元记录，可输入两位小数。">
      <template #start><SInputGroupText>$</SInputGroupText></template>
      <SInput v-model="price" label="授权金额" hide-label inputmode="decimal" placeholder="0.00" />
      <template #end><SInputGroupText>USD</SInputGroupText></template>
    </SInputGroup>
    <SInputGroup label="交付站点" description="编辑发布子域名。">
      <template #start><SInputGroupText>https://</SInputGroupText></template>
      <SInput v-model="website" label="站点名称" hide-label placeholder="release" />
      <template #end><SInputGroupText>.example.com</SInputGroupText></template>
    </SInputGroup>
    <FieldHooksReview kind="input" />
  </div>

  <template v-else-if="id === 'W.label'">
    <SLabel for="review-name">项目名称</SLabel>
    <SInput id="review-name" v-model="name" />
    <FieldScenariosReview kind="label" />
  </template>

  <ChoiceReview v-else-if="id === 'W.radio-group'" kind="radio" />

  <SRadioGroup v-else-if="id === 'W.export.radio'" v-model="visibility" label="可见范围" name="visibility">
    <SRadio value="team">团队可见</SRadio>
    <SRadio value="private">仅自己</SRadio>
    <SRadio value="external" disabled>公开</SRadio>
  </SRadioGroup>

  <EditableFieldReview v-else-if="id === 'W.text-area'" kind="textarea" />

  <FieldScenariosReview v-else-if="id === 'W.text-field'" kind="field" />

  <template v-else-if="id === 'W.tabs'">
    <STabs v-model="tab" label="项目详情" :tabs="tabs" activation="manual">
      <template #panel="{ tab: panel }">
        <SSurface class="review__block" tone="sage">
          {{ panel.value === 'overview' ? '本项目保存品牌设计规范及发布资料。' : '品牌手册、字体授权和发布素材。' }}
        </SSurface>
      </template>
    </STabs>
    <div v-if="mobileTab === 'more' || activeMobileTab" id="demo-mobile-tab-panel" role="tabpanel" :aria-label="activeMobileTab?.label ?? '更多功能'">
      <STabBarMoreList v-if="mobileTab === 'more'" v-model="mobileTab" :items="mobileTabs" label="更多功能" />
      <p v-else>{{ activeMobileTab?.label }}</p>
    </div>
    <STabBar v-model="mobileTab" :items="mobileTabs.map(item => ({ ...item, panelId: 'demo-mobile-tab-panel' }))" label="移动导航"
      more-label="更多" more-panel-id="demo-mobile-tab-panel" inline />
    <TabScenariosReview />
  </template>

  <template v-else-if="id === 'W.modal'">
    <SButton @click="open = true">归档项目</SButton>
    <SDialog v-model:open="open" title="归档项目？" description="「品牌资源库」归档后可恢复。">
      <template #footer="{ close }">
        <SButton variant="secondary" size="sm" autofocus @click="close">取消</SButton>
        <SButton variant="danger" size="sm" @click="close(); result = '项目已归档'">归档项目</SButton>
      </template>
    </SDialog>
    <SButton variant="secondary" @click="heroFullscreen = false; heroOpen = true">查看交付量</SButton>
    <SDialog v-model:open="heroOpen" title="每日交付量" dismiss-label="关闭交付量预览"
      :variant="heroFullscreen ? 'fullscreen' : 'standard'" size="md" hero-mode="light" show-close-button>
      <template #hero><img :src="deliveryArea" alt="使用规范与源文件的每日交付量趋势图"></template>
      <template #footer="{ close }">
        <SButton variant="ghost" size="sm" @click="heroFullscreen = !heroFullscreen">
          <SMotionText :value="heroFullscreen ? '退出全屏' : '全屏查看'" />
        </SButton>
        <SButton variant="secondary" size="sm" @click="close">完成</SButton>
      </template>
    </SDialog>
    <SButton variant="ghost" @click="notesDialog.show(h('p', '交付前请核对地址和接收人。'), { title: '配送须知', dismissLabel: '关闭须知' })">打开配送须知</SButton>
    <component :is="notesDialog.element" />
    <SButton variant="ghost" @click="verifyDialog.show({ title: '确认配送信息？', cancelLabel: '稍后确认', confirmLabel: '确认信息', onConfirm: () => result = '配送信息已确认' })">确认配送方案</SButton>
    <component :is="verifyDialog.element" />
    <p class="review__result"><SMotionText :value="result" announce /></p>
    <OverlayPresentationReview kind="dialog" />
    <DialogPlacementReview />
    <OverlayHooksReview />
  </template>

  <template v-else-if="id === 'W.tooltip'">
    <STooltip text="保留历史记录，可在归档中恢复。" side="bottom">
      <template #trigger><SButton variant="secondary">归档说明</SButton></template>
    </STooltip>
    <TooltipReview />
  </template>

  <ChoiceReview v-else-if="id === 'W.switch'" kind="switch" />

  <SAlert v-else-if="id === 'W.alert'" tone="warning" title="授权即将到期" description="字体授权将于 11 月 30 日到期。">
    <template #actions>
      <SButton size="sm" variant="ghost" class="review__wide-action" @click="result = '已请求续期'">
        <SMotionText :value="result || '申请续期'" />
      </SButton>
    </template>
  </SAlert>

  <template v-else-if="id === 'W.skeleton'">
    <SButton variant="secondary" size="sm" @click="showing = !showing">
      <SMotionText :value="showing ? '显示内容' : '显示占位'" />
    </SButton>
    <SSkeleton :loading="showing" shape="block">
      <SSurface class="review__block" tone="sage">项目包含品牌手册与授权文件。</SSurface>
    </SSkeleton>
    <LoadingScenariosReview kind="skeleton" />
  </template>

  <LoadingScenariosReview v-else-if="id === 'W.spinner'" kind="spinner" />

  <template v-else-if="id === 'W.card'">
    <SCard>
      <template #header><strong>品牌资源库</strong></template>
      标志、字体和发布素材。
      <template #footer>
        <SButton size="sm" variant="secondary" class="review__wide-action" @click="result = '已打开资料'">
          <SMotionText :value="result || '打开资料'" />
        </SButton>
      </template>
    </SCard>
    <SurfaceReview kind="card" />
  </template>

  <template v-else-if="id === 'W.separator'">
    <div class="review__row">团队资料 <SSeparator orientation="vertical" decorative /> 品牌资源库</div>
    <ContentScenariosReview kind="separator" />
  </template>

  <div v-else-if="id === 'W.surface'" class="review__columns">
    <SSurface class="review__block" tone="sage">品牌资源库</SSurface>
    <SSurface class="review__block" tone="blue">项目文档</SSurface>
  </div>

  <IdentityMediaReview v-else-if="id === 'W.avatar'" kind="avatar" />

  <template v-else-if="id === 'W.badge'">
    <div class="review__row"><span>未读通知</span><SBadge tone="accent">3</SBadge></div>
    <AnnotationScenariosReview kind="badge" />
  </template>

  <template v-else-if="id === 'W.chip'">
    <div class="review__row">
      <SChip label="项目规范" selected />
      <SChip v-if="showing" label="设计" removable remove-label="移除设计标签" @remove="showing = false" />
    </div>
    <div class="review__result">
      <SButton variant="ghost" size="sm" :aria-disabled="showing || undefined" @click="showing = true">恢复标签</SButton>
    </div>
    <AnnotationScenariosReview kind="chip" />
  </template>

  <SSwitchGroup v-else-if="id === 'W.export.switch-group'" v-model="notices" label="通知渠道" name="channel">
    <SSwitch value="email">邮件通知</SSwitch>
    <SSwitch value="inbox">站内通知</SSwitch>
  </SSwitchGroup>

  <template v-else-if="id === 'W.select'">
    <SForm @submit="submitCategories" @reset="result = ''">
      <div class="review__columns">
        <SSelect v-model="kind" name="category" label="项目分类" :options="options" locale="zh-CN" />
        <SSelect v-model="categories" name="categories" multiple clearable clear-label="清除分类" label="浏览分类" :options="options" placeholder="选择分类" locale="zh-CN" />
      </div>
      <div class="review__row">
        <SButton size="sm" type="submit">查询</SButton>
        <SButton size="sm" type="reset" variant="secondary">重置</SButton>
      </div>
      <p class="review__result">{{ result }}</p>
    </SForm>
    <ComboboxToolsReview multiple />
    <SelectorScenariosReview />
    <SelectorHooksReview />
    <SelectorHooksReview multiple />
  </template>

  <template v-else-if="id === 'W.table'">
    <SCheckbox v-model="virtualTable">查看 2,000 行</SCheckbox>
    <STable
      :key="String(virtualTable)"
      v-model:selected="selection"
      label="文件列表"
      :rows="virtualTable ? longList : files"
      :columns="columns"
      :row-key="row => virtualTable ? `long:${row.id}` : row.id"
      :row-label="row => `选择${row.name}`"
      selection-mode="multiple"
      multi-sort
      :sort-priority-label="(priority, direction) => `第 ${priority} 排序优先级，${direction === 'ascending' ? '升序' : '降序'}`"
      allow-unsorted
      select-all-label="选择当前列表所有文件"
      :page-size="virtualTable ? undefined : tablePageSize"
      :page-size-options="virtualTable ? undefined : [1, 2, 3]"
      page-size-label="每页文件数"
      :is-row-selectable="row => virtualTable || row.id !== 2"
      @update:page-size="tablePageSize = $event"
      :virtual="virtualTable ? { height: 310, estimatedRowHeight: 39, minWidth: 415 } : undefined"
      previous-label="上一页"
      next-label="下一页"
      locale="zh-CN"
    >
      <template #cell="{ row, column, value }">
        <SInput v-if="virtualTable && row.id === 1 && column.key === 'name'" v-model="nameEdit" aria-label="编辑第一行文件名" />
        <template v-else>{{ value }}</template>
      </template>
    </STable>
    <SDisclosure title="树形表格与详情行"><TableExpansionReview /></SDisclosure>
    <SDisclosure title="加载更多的表格"><TableLoadingReview /></SDisclosure>
    <SDisclosure title="表格样式、筛选与批量操作"><TableScenariosReview /></SDisclosure>
  </template>
  <StandardReview v-else-if="standardExamples.has(id)" :id="id" />
  <DateInputsReview v-else-if="dateInputExamples.has(id)" :id="id" />
  <OverlayFeedbackReview v-else-if="overlayFeedbackExamples.has(id)" :id="id" />
  <ColorReview v-else-if="colorExamples.has(id)" :id="id" />
  <ProFeedbackReview v-else-if="proFeedbackExamples.has(id)" :id="id" />
  <ProSettingsReview v-else-if="proSettingsExamples.has(id)" :id="id" />
  <ProFormControlsReview v-else-if="proFormControlsExamples.has(id)" :id="id" />
  <ProContentReview v-else-if="proContentExamples.has(id)" :id="id" />
  <ProNavigationReview v-else-if="proNavigationExamples.has(id)" :id="id" />
  <ProAppShellReview v-else-if="proAppShellExamples.has(id)" :id="id" />
  <ProComposedReview v-else-if="proComposedExamples.has(id)" :id="id" />
  <ProDataDisplayReview v-else-if="proDataDisplayExamples.has(id)" :id="id" />
  <ProCollectionsReview v-else-if="proCollectionsExamples.has(id)" :id="id" />
  <ProCardsBoardReview v-else-if="proCardsBoardExamples.has(id)" :id="id" />
  <ProItemKpiReview v-else-if="proItemKpiExamples.has(id)" :id="id" />
  <ProMapReview v-else-if="id === 'WP.map'" />
  <ProActivityReview v-else-if="proActivityExamples.has(id)" :id="id" />
  <ProChartsReview v-else-if="proChartExamples.has(id)" :id="id" />
  <ProChatReview v-else-if="proChatExamples.has(id)" :id="id" />
  <ProChatActionsReview v-else-if="proChatActionExamples.has(id)" :id="id" />
  <ProPromptReview v-else-if="proPromptExamples.has(id)" :id="id" />
  <RacReview v-else-if="id === 'W.export.rac'" />
  <CollectionsReview v-else :id="id" />
</template>
