<script setup lang="ts">
import MenuPressReview from './MenuPressReview.vue'
import MenuPresentationReview from './MenuPresentationReview.vue'
import PopoverScenariosReview from './PopoverScenariosReview.vue'
import DisclosureScenariosReview from './DisclosureScenariosReview.vue'
import LinkScenariosReview from './LinkScenariosReview.vue'
import ToggleScenariosReview from './ToggleScenariosReview.vue'
import ToolbarScenariosReview from './ToolbarScenariosReview.vue'
import BreadcrumbScenariosReview from './BreadcrumbScenariosReview.vue'
import MoreMenuScenariosReview from './MoreMenuScenariosReview.vue'
import TypeaheadScenariosReview from './TypeaheadScenariosReview.vue'
import PaginationScenariosReview from './PaginationScenariosReview.vue'
import EmptyAlertScenariosReview from './EmptyAlertScenariosReview.vue'
import CompoundMenuScenariosReview from './CompoundMenuScenariosReview.vue'
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import {
  SAccordion, SAlertDialog, SAutocomplete, SBreadcrumbs, SButton, SCheckbox, SComboBox,
  SDialog, SDisclosure, SDisclosureGroup, SDropdown, SEmptyState, SHeader, SInput,
  SLink, SListBox, SMenu, SMenuItem, SMenuSection, SMotionText, SPagination, SPopover, SSurface,
  STag, STagGroup, SToggleButton, SToggleButtonGroup, SToolbar, usePopover,
} from '../src'
import type { MenuEntry, SelectOption, TagItem } from '../src'
import CollectionFocusReview from './CollectionFocusReview.vue'
import LinkContextReview from './LinkContextReview.vue'
import ComboboxToolsReview from './ComboboxToolsReview.vue'

defineProps<{ id: string }>()

const enabled = ref(false)
const single = ref('team')
const multi = ref<string[]>(['design'])
const panel = ref('overview')
const disclosures = ref<readonly string[]>(['assets'])
const page = ref(1)
const choices = ref<readonly string[]>(['author', 'asc'])
const note = ref('')
const open = ref(false)
const popup = ref(false)
const anchorVisible = ref(false)
const recordAnchor = useTemplateRef<HTMLSpanElement>('recordAnchor')
const fileAnchor = useTemplateRef<HTMLSpanElement>('fileAnchor')
const recordPopover = usePopover({ anchor: () => recordAnchor.value, label: '记录详情', dismissOnOutside: false,
  tabBehavior: 'contain', closeButton: true, closeLabel: '关闭记录详情' })
const showLongList = ref(false)
const picked = ref<string[]>(['design'])
const combo = ref('design')
const autoText = ref('')
const autoResults = ref<readonly SelectOption[]>([])
const loading = ref(false)
const tagOn = ref(false)
const showTag = ref(true)
const tags = ref<readonly TagItem[]>([
  { value: 'design', label: '设计' },
  { value: 'brand', label: '品牌' },
  { value: 'assets', label: '素材' },
])
const tagKeys = ref<readonly string[]>(['design'])
let search: ReturnType<typeof setTimeout> | undefined

const crumbs = [
  { id: 'teams', label: '团队', href: './#projects' },
  { id: 'projects', label: '项目', href: './#projects' },
  { id: 'current', label: '品牌资源库' },
]
const toggleItems = [
  { value: 'team', label: '团队' },
  { value: 'shared', label: '共享' },
  { value: 'all', label: '全部' },
]
const groups = [
  { value: 'design', label: '设计', group: '协作' },
  { value: 'product', label: '产品', group: '协作' },
  { value: 'engineering', label: '工程', group: '交付' },
  { value: 'archive', label: '归档', group: '交付', disabled: true },
]
const singleGroup = [
  { value: 'design', label: '设计' },
  { value: 'archive', label: '归档', disabled: true },
]
const sections = [
  { value: 'overview', label: '项目概况', description: '维护品牌手册和对外发布资料。' },
  { value: 'files', label: '文件管理', description: '可按类型筛选文件并查看版本记录。' },
  { value: 'contract', label: '授权信息', disabled: true, description: '此分组暂不可编辑。' },
]
const toolbar = [
  { id: 'copy', label: '复制' },
  { id: 'move', label: '移动' },
  { id: 'line', separator: true },
  { id: 'export', label: '导出' },
  { id: 'archive', label: '归档', disabled: true },
]
const longOptions = Array.from({ length: 800 }, (_, index) => ({ value: `doc-${index+1}`, label: `设计文档 ${index+1}` }))
const items: MenuEntry[] = [
  { id: 'view', kind: 'section', label: '显示列', items: [
    { id: 'author', kind: 'checkbox', label: '负责人' },
    { id: 'size', kind: 'checkbox', label: '文件大小' },
  ] },
  { id: 'sort', kind: 'radio-group', label: '排序方向', items: [
    { id: 'asc', label: '升序' },
    { id: 'desc', label: '降序' },
  ] },
  { id: 'line', kind: 'separator' },
  { id: 'export', kind: 'submenu', label: '导出', items: [
    { id: 'csv', label: 'CSV 表格' },
    { id: 'json', label: 'JSON 文件' },
  ] },
  { id: 'archive', label: '归档项目', disabled: true, tone: 'danger' },
]
const records = [
  { value: 'brand', label: '品牌资源库' },
  { value: 'design', label: '设计规范' },
  { value: 'colors', label: '品牌配色' },
]
autoResults.value = records
watch(autoText, text => {
  clearTimeout(search)
  loading.value = true
  search = setTimeout(() => {
    autoResults.value = records.filter(record => record.label.includes(text.trim()))
    loading.value = false
  }, 350)
})
onBeforeUnmount(() => clearTimeout(search))

function menuAction(key: string) {
  note.value = key === 'csv' ? '已选择 CSV 表格' : key === 'json' ? '已选择 JSON 文件' : key
}

function removeTag(key: string) {
  tags.value = tags.value.filter(item => item.value !== key)
  tagKeys.value = tagKeys.value.filter(value => value !== key)
}
</script>

<template>
  <template v-if="id === 'W.link'">
    <div class="review__row">
      <SLink href="./#projects">查看项目列表</SLink>
      <SLink href="./#projects" target="_blank">在新窗口打开项目</SLink>
      <SLink href="./#projects" disabled>归档受限</SLink>
    </div>
    <LinkContextReview />
    <LinkScenariosReview />
  </template>
  <template v-else-if="id === 'W.breadcrumbs'">
    <SBreadcrumbs :items="crumbs" label="项目位置" />
    <BreadcrumbScenariosReview />
  </template>
  <template v-else-if="id === 'W.pagination'">
    <SPagination
      v-model="page"
      :total="36"
      label="文件分页"
      previous-label="上一页"
      next-label="下一页"
      :page-label="number => `第 ${number} 页`"
      :jump-label="number => `跳到第 ${number} 页`"
    />
    <p class="review__result"><SMotionText :value="`当前为第 ${page} 页`" motion="roll" announce /></p>
    <PaginationScenariosReview />
  </template>
  <template v-else-if="id === 'W.toggle-button'">
    <div class="review__row">
      <SToggleButton v-model="enabled">只看收藏</SToggleButton>
      <SToggleButton :model-value="true" disabled>团队可见</SToggleButton>
    </div>
    <ToggleScenariosReview />
  </template>
  <div v-else-if="id === 'W.toggle-button-group'" class="review__stack">
    <SToggleButtonGroup v-model="single" :items="toggleItems" label="可见范围" />
    <SToggleButtonGroup v-model="multi" multiple :items="groups" label="订阅分类" />
    <ToggleScenariosReview group />
  </div>
  <template v-else-if="id === 'W.toolbar'">
    <SToolbar label="文件操作" :items="toolbar" @action="key => note = toolbar.find(item => item.id === key)?.label ?? ''" />
    <p class="review__result"><SMotionText :value="note" announce /></p>
    <ToolbarScenariosReview />
  </template>
  <SAccordion v-else-if="id === 'W.accordion'" v-model="panel" :items="sections" label="项目详情" />
  <template v-else-if="id === 'W.disclosure'">
    <SDisclosure title="文档说明" default-open>这里保存品牌手册和素材的更新记录。</SDisclosure>
    <DisclosureScenariosReview kind="disclosure" />
  </template>
  <template v-else-if="id === 'W.disclosure-group'">
    <SDisclosureGroup v-model="disclosures" label="品牌资源库">
      <SDisclosure title="发布资料" value="assets">标志、字体、电邮签名和社交媒体素材。</SDisclosure>
      <SDisclosure title="字体授权" value="license">团队可查看到期时间和续期记录。</SDisclosure>
    </SDisclosureGroup>
    <DisclosureScenariosReview kind="group" />
  </template>
  <template v-else-if="id === 'W.alert-dialog'">
    <SButton variant="danger" @click="open = true">删除草稿</SButton>
    <SAlertDialog
      v-model:open="open"
      title="删除草稿？"
      description="删除后无法恢复。"
      confirm-label="删除"
      cancel-label="取消"
      @confirm="note = '草稿已删除'"
      @cancel="note = '草稿已保留'"
    />
    <p class="review__result"><SMotionText :value="note" announce /></p>
    <EmptyAlertScenariosReview kind="alert" />
  </template>
  <template v-else-if="id === 'W.popover'">
    <div class="review__row">
      <SPopover>
        <template #trigger><SButton variant="secondary">筛选项目</SButton></template>
        <template #default="{ close }">
          <div class="review__stack">
            <SCheckbox v-model="enabled">仅显示设计项目</SCheckbox>
            <SButton size="sm" @click="close">应用</SButton>
          </div>
        </template>
      </SPopover>
      <SButton variant="ghost" @click="open = true">在弹窗中试用</SButton>
    </div>
    <SDialog v-model:open="open" dismiss-label="关闭" title="项目筛选">
      <SPopover v-model:open="popup">
        <template #trigger><SButton variant="secondary" size="sm">打开筛选详情</SButton></template>
        <SInput label="负责人" placeholder="输入姓名" />
      </SPopover>
    </SDialog>
    <div class="review__row">
      <SButton size="sm" variant="secondary" aria-haspopup="dialog" :aria-expanded="recordPopover.isOpen.value"
        @click="anchorVisible = true; recordPopover.show(() => recordAnchor)">查看记录详情</SButton>
      <SButton size="sm" variant="ghost" @click="recordPopover.show(() => fileAnchor)">移动到文件标记</SButton>
    </div>
    <div class="review__row">
      <span v-if="anchorVisible" ref="recordAnchor">交付记录标记</span>
      <span ref="fileAnchor">待审文件标记</span>
    </div>
    <component :is="recordPopover.element">
      <SInput label="记录说明" />
    </component>
    <PopoverScenariosReview />
  </template>
  <template v-else-if="id === 'W.dropdown'">
    <div class="review__row"><SDropdown v-model="choices" label="文件操作" :items="items" @action="menuAction" /></div>
    <p class="review__result"><SMotionText :value="note" announce /></p>
    <MenuPresentationReview kind="dropdown" />
    <MoreMenuScenariosReview />
    <CompoundMenuScenariosReview kind="dropdown" />
    <MenuPressReview />
  </template>
  <template v-else-if="id === 'W.export.menu' || id === 'W.export.menu-item' || id === 'W.export.menu-section'">
    <div class="review__row">
      <SMenu menu-label="文件操作">
        <template #trigger><SButton variant="secondary">文件操作</SButton></template>
        <template v-if="id === 'W.export.menu-item'">
          <SMenuItem @select="note = '已创建副本'">复制文件</SMenuItem>
          <SMenuItem disabled tone="danger">删除文件</SMenuItem>
        </template>
        <template v-else>
          <SMenuSection label="当前资源">
            <SMenuItem @select="note = '已创建副本'">复制文件</SMenuItem>
            <SMenuItem @select="note = '已打开详情'">查看详情</SMenuItem>
            <SMenuItem disabled>移动文件</SMenuItem>
          </SMenuSection>
          <SMenuSection v-if="id === 'W.export.menu-section'" label="共享">
            <SMenuItem @select="note = '已复制分享链接'">复制链接</SMenuItem>
          </SMenuSection>
        </template>
      </SMenu>
    </div>
    <MenuPressReview v-if="id === 'W.export.menu'" />
    <p class="review__result"><SMotionText :value="note" announce /></p>
  </template>
  <SSurface v-else-if="id === 'W.export.header'" class="review__block" tone="sage">
    <SHeader as="h3">项目资料</SHeader>
    <span>设计规范、发布记录与字体档案。</span>
  </SSurface>
  <SEmptyState v-else-if="id === 'W.export.empty-state'" title="暂无匹配的资料" description="可调整筛选条件或返回查看完整列表。">
    <template #actions><SLink href="./#projects">返回项目列表</SLink></template>
  </SEmptyState>
  <template v-else-if="id === 'W.list-box' || id === 'W.export.list-box-item' || id === 'W.export.list-box-section'">
    <div v-if="id === 'W.list-box'" class="review__row"><SCheckbox v-model="showLongList">查看 800 项</SCheckbox></div>
    <SListBox
      :key="String(showLongList)"
      v-model="picked"
      multiple
      :options="showLongList ? longOptions : id === 'W.export.list-box-item' ? singleGroup : groups"
      :virtual="showLongList"
      label="项目分类"
      empty-text="暂无分类"
    />
    <CollectionFocusReview v-if="id === 'W.list-box'" variant="list" />
  </template>
  <template v-else-if="id === 'W.combo-box'">
    <SComboBox v-model="combo" label="项目分类" :options="groups" placeholder="搜索分类" clear-label="清除分类"
      trigger-label="显示分类" empty-text="暂无匹配分类" clearable />
    <ComboboxToolsReview />
  </template>
  <template v-else-if="id === 'W.autocomplete'">
    <SAutocomplete
      v-model="autoText"
      label="搜索资料"
      placeholder="输入资料名称"
      :options="autoResults"
      :loading="loading"
      loading-text="正在搜索"
      empty-text="没有匹配的资料"
      clear-label="清除搜索"
      remote
      clearable
      @select="record => note = record.label"
    />
    <p class="review__result"><SMotionText :value="note" announce /></p>
    <TypeaheadScenariosReview />
  </template>
  <template v-else-if="id === 'W.export.tag'">
    <div class="review__row">
      <STag v-if="showTag" label="设计" selectable :selected="tagOn" removable remove-label="移除设计" @toggle="tagOn = !tagOn" @remove="showTag = false" />
      <SButton variant="ghost" size="sm" @click="showTag = true">恢复标签</SButton>
    </div>
  </template>
  <STagGroup
    v-else-if="id === 'W.tag-group'"
    v-model="tagKeys"
    :items="tags"
    label="资料标签"
    selectable
    removable
    multiple
    :remove-label="item => `移除${item.label}`"
    @remove="removeTag"
  />
</template>
