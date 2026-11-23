<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SBanner, SButton, SCard, SClickableCard, SDialog, SInput, SLayout, SLayoutContent, SLayoutFooter,
  SLayoutHeader, SMotionText, SSelectableCard, SText,
} from '../src'
import type { ButtonElevation, CardVariant } from '../src'

defineProps<{ kind: 'card' | 'clickable' | 'selectable' | 'banner' }>()

const categories: { title: string; note: string; variant: CardVariant }[] = [
  { title: '团队资料', note: '近期更新', variant: 'default' },
  { title: '已归档', note: '历史版本', variant: 'muted' },
  { title: '研发', note: '交付文档', variant: 'blue' },
  { title: '运营', note: '发布日历', variant: 'green' },
  { title: '紧急事项', note: '审批待办', variant: 'orange' },
  { title: '设计', note: '设计稿和素材', variant: 'purple' },
]
const elevations: { label: string; value: ButtonElevation }[] = [
  { label: '平面', value: 'none' }, { label: '低层', value: 'low' },
  { label: '中层', value: 'med' }, { label: '高层', value: 'high' },
]
const displayName = ref('林舟')
const draftName = ref(displayName.value)
const saving = ref(false)
const profileStatus = ref('')
function resetProfile() {
  draftName.value = displayName.value
  profileStatus.value = '已恢复上次保存的内容'
}
async function saveProfile() {
  if (saving.value || !draftName.value.trim()) return
  saving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 420))
    displayName.value = draftName.value.trim()
    profileStatus.value = `已保存 ${displayName.value}`
  } finally {
    saving.value = false
  }
}

const plans = [
  { value: 'personal', label: '个人版', price: '¥ 19 / 月', note: '独立设计与交付' },
  { value: 'studio', label: '协作版', price: '¥ 49 / 月', note: '共享团队资料' },
  { value: 'business', label: '组织版', price: '¥ 99 / 月', note: '集中管理权限' },
]
const plan = ref('studio')
const addOns: { id: string; label: string; variant: CardVariant }[] = [
  { id: 'history', label: '版本记录', variant: 'blue' },
  { id: 'review', label: '团队审阅', variant: 'cyan' },
  { id: 'backup', label: '自动备份', variant: 'green' },
  { id: 'export', label: '离线导出', variant: 'yellow' },
  { id: 'access', label: '访问审计', variant: 'orange' },
  { id: 'digest', label: '定期摘要', variant: 'teal' },
]
const chosenAddOns = ref<Record<string, boolean>>({ history: true, review: true })
const addOnCount = computed(() => addOns.filter(item => chosenAddOns.value[item.id]).length)
const submitted = ref('')
function recordAddOns(event: SubmitEvent) {
  const values = new FormData(event.currentTarget as HTMLFormElement).getAll('feature')
  submitted.value = addOns.filter(item => values.includes(item.id)).map(item => item.label).join('、') || '已清空配置'
}

const notices = [
  { tone: 'info', title: '资料库有新版本', description: '下次打开时会读取更新内容。', action: '查看迁移说明' },
  { tone: 'success', title: '本周记录已同步', description: '团队成员可以查看同步后的清单。', action: '' },
  { tone: 'warning', title: '发布包即将过期', description: '请在周五前重新导出。', action: '安排重新导出' },
  { tone: 'danger', title: '访问凭据已失效', description: '重新验证后可恢复上传。', action: '重新验证' },
] as const
const noticeOpen = ref(true)
const noticeExpanded = ref(true)
const settingsOpen = ref(false)
const noticeResult = ref('')
const noticeAction = ref('')
function reviewNotice(action: string) {
  noticeAction.value = action
  settingsOpen.value = true
}
</script>

<template>
  <div v-if="kind === 'card'" class="review__stack surface-review__stack">
    <section class="surface-review__grid" aria-label="卡片色调">
      <SCard v-for="category in categories" :key="category.variant" :variant="category.variant" :padding="3">
        <strong>{{ category.title }}</strong>
        <SText type="supporting" display="block">{{ category.note }}</SText>
      </SCard>
    </section>
    <section class="surface-review__grid" aria-label="卡片层级">
      <SCard v-for="depth in elevations" :key="depth.value" :elevation="depth.value" :padding="3">
        <strong>{{ depth.label }}</strong>
      </SCard>
    </section>
    <SCard variant="muted" :max-width="420" role="note" :padding="3">
      <template #header><strong>素材使用提示</strong></template>
      <SText type="body" color="secondary">交付前把字体许可证和图片来源一并归档。</SText>
    </SCard>
    <SCard :width="420" :padding="0">
      <form aria-label="编辑公开资料" @submit.prevent="saveProfile" @reset.prevent="resetProfile">
        <SLayout :padding="3" default-has-dividers>
          <template #header><SLayoutHeader has-divider><strong>编辑公开资料</strong></SLayoutHeader></template>
          <SLayoutContent>
            <SInput v-model="draftName" label="显示名称" required :readonly="saving" />
            <div v-if="profileStatus" class="surface-review__readout" role="status"><SMotionText :value="profileStatus" /></div>
          </SLayoutContent>
          <template #footer>
            <SLayoutFooter has-divider>
              <div class="surface-review__actions">
                <SButton type="reset" size="sm" variant="ghost" :disabled="saving">取消修改</SButton>
                <SButton type="submit" size="sm" :loading="saving">保存资料</SButton>
              </div>
            </SLayoutFooter>
          </template>
        </SLayout>
      </form>
    </SCard>
  </div>

  <div v-else-if="kind === 'clickable'" class="review__stack surface-review__stack">
    <div class="surface-review__grid">
      <SClickableCard label="打开交付报告" href="#review-delivery-report" elevation="med" variant="blue" :padding="3">
        <strong>双周交付报告</strong><SText type="supporting" display="block">版本完成率与发布安排</SText>
      </SClickableCard>
      <SClickableCard label="打开成员权限" href="#review-member-permissions" disabled :padding="3">
        <strong>成员权限</strong><SText type="supporting" display="block">仅管理员可编辑</SText>
      </SClickableCard>
    </div>
    <p id="review-delivery-report" class="surface-review__readout" tabindex="-1">交付报告已同步，共完成 12 个版本。</p>
  </div>

  <div v-else-if="kind === 'selectable'" class="review__stack surface-review__stack">
    <fieldset class="surface-review__fieldset">
      <legend>选择订阅方案</legend>
      <div class="surface-review__grid">
        <SSelectableCard v-for="item in plans" :key="item.value" :label="item.label" :model-value="plan === item.value"
          :elevation="item.value === 'studio' ? 'low' : 'none'" :padding="3" @update:model-value="plan = item.value">
          <strong>{{ item.label }}</strong>
          <SText type="large" display="block" tabular-numbers>{{ item.price }}</SText>
          <SText type="supporting" display="block">{{ item.note }}</SText>
        </SSelectableCard>
      </div>
    </fieldset>
    <form aria-label="配置附加功能" class="review__stack" @submit.prevent="recordAddOns" @reset="submitted = ''">
      <fieldset class="surface-review__fieldset">
        <legend>附加功能</legend>
        <div class="surface-review__grid">
          <SSelectableCard v-for="item in addOns" :key="item.id" v-model="chosenAddOns[item.id]" :label="item.label"
            :variant="item.variant" :padding="3" name="feature" :value="item.id">{{ item.label }}</SSelectableCard>
        </div>
      </fieldset>
      <div class="review__row">
        <SMotionText :value="`已选 ${addOnCount} 项`" motion="roll" announce />
        <SButton size="sm" type="reset" variant="ghost">恢复默认功能</SButton>
        <SButton size="sm" type="submit" variant="secondary">保存附加功能</SButton>
      </div>
      <output v-if="submitted" class="surface-review__readout"><SMotionText :value="submitted" /></output>
    </form>
  </div>

  <div v-else class="review__stack surface-review__stack">
    <section class="review__stack" aria-label="通知状态">
      <SBanner v-for="notice in notices" :key="notice.tone" :title="notice.title" :description="notice.description" :tone="notice.tone"
        dismissible :dismiss-label="`关闭${notice.title}`">
        <template v-if="notice.action" #actions>
          <SButton v-if="notice.tone === 'info'" size="sm" variant="secondary" href="#review-archive-migration">{{ notice.action }}</SButton>
          <SButton v-else size="sm" variant="secondary" @click="reviewNotice(notice.action)">{{ notice.action }}</SButton>
        </template>
      </SBanner>
    </section>
    <SBanner title="还有修改需要保存" description="离开前保存本地草稿可保留编辑内容。" elevation="med" />
    <section class="review__stack" aria-label="通栏与操作">
      <SBanner id="review-archive-migration" variant="section" title="将归档迁移至新位置" :collapsible="false" tone="info">
        <template #actions><SButton size="sm" variant="secondary" @click="reviewNotice('迁移设置')">查看迁移设置</SButton></template>
        <p>旧地址保留至迁移完成。</p>
      </SBanner>
      <SBanner v-model:open="noticeOpen" v-model:expanded="noticeExpanded" title="同步设置有变更" tone="warning" dismissible
        dismiss-label="关闭同步通知" expand-label="展开同步详情" collapse-label="收起同步详情">
        <template #actions><SButton size="sm" variant="secondary" @click="reviewNotice('同步设置')">复核同步设置</SButton></template>
        <ul><li>默认同步范围为当前团队。</li><li>自动同步时间为每天上午九点。</li></ul>
      </SBanner>
      <SButton v-if="!noticeOpen" class="surface-review__restore" size="sm" variant="secondary" @click="noticeOpen = true">恢复同步通知</SButton>
      <div v-if="noticeResult" class="surface-review__readout" role="status"><SMotionText :value="noticeResult" /></div>
    </section>
    <SDialog v-model:open="settingsOpen" :title="noticeAction" description="确认将操作加入工作区记录。" dismiss-label="关闭设置">
      <template #footer="{ close }"><SButton size="sm" autofocus @click="noticeResult = `已确认${noticeAction}`; close()">确认设置</SButton></template>
    </SDialog>
  </div>
</template>

<style scoped>
.surface-review__stack { min-inline-size: 0; grid-template-columns: minmax(0, 1fr); }
.surface-review__stack > :is(.review__stack, .surface-review__fieldset, .sy-banner) { justify-self: stretch; }
.surface-review__grid { display: grid; justify-self: stretch; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: var(--sy-space-2); }
.surface-review__grid > * { min-inline-size: 0; }
.surface-review__actions { display: flex; justify-content: end; gap: var(--sy-space-2); flex-wrap: wrap; }
.surface-review__fieldset { min-inline-size: 0; margin: 0; padding: 0; border: 0; }
.surface-review__fieldset legend { margin-block-end: var(--sy-space-2); font-weight: 630; }
.surface-review__readout { margin: .45rem 0 0; color: var(--sy-text-muted); font-size: .875rem; }
.surface-review__restore { justify-self: start; }
</style>
