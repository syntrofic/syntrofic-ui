<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { createBrandTheme, SButton, SComparisonMatrix, SDialog, SImage, SLink, SPageScaffold, SSettingsWorkspace, SSignIn, SThemePreview } from '../src'
import type { BrandTheme, ComparisonCandidate, ComparisonGroup, SettingSection, SettingValue, SignInLayout, SignInRequest, ThemePreviewConfig } from '../src'
import deliveryArea from '../preview/assets/delivery-area.png'

const props = defineProps<{ kind: string; theme?: BrandTheme }>()
const demoStatus = ref('')
const dialog = ref(false)
const account = ref(false)
const settings = ref<Record<string, SettingValue>>({
  name: '林舟', email: 'lin@example.com', language: 'zh-CN', currency: 'CNY', timeZone: 'Asia/Shanghai', appearance: 'light', privacy: true,
  digest: true, daily: false, securityKey: true, apiEndpoint: '', search: 'Meta + K', help: 'Alt + H',
})
const provider = { id: 'team', label: '使用团队账号继续' }
const workspaceProvider = { id: 'redirect-to-workspace', label: '前往团队工作区' }
const previewTheme = createBrandTheme('studio-preview', '工作区主题预览', 'matcha')
const gallery = defineAsyncComponent(() => import('./CollectionTemplateDemo.vue'))
const checkout = defineAsyncComponent(() => import('./OfferingTemplateDemo.vue'))
const chat = defineAsyncComponent(() => import('./CommunicationTemplateDemo.vue'))
const activity = defineAsyncComponent(() => import('./OperationsTemplateDemo.vue'))
const inventory = defineAsyncComponent(() => import('./TableTemplateDemo.vue'))
const previewConfig: ThemePreviewConfig = { version: 1, pages: [
  { id: 'store', label: '商店' }, { id: 'checkout', label: '结账' }, { id: 'chat', label: '对话' },
  { id: 'activity', label: '活动' }, { id: 'inventory', label: '库存' }, { id: 'colors', label: '语义颜色', kind: 'colors' },
] }
const authLayouts: Record<string, SignInLayout> = { login: 'plain', 'login-card': 'card', 'login-split': 'split', 'login-sso': 'sso' }
const loginLayout = computed(() => authLayouts[props.kind])
const scope = [
  { id: 'profile', label: '个人资料', fields: [{ id: 'name', type: 'text', label: '显示名称' }, { id: 'email', type: 'email', label: '账号邮箱' }] },
  { id: 'security', label: '安全', fields: [{ id: 'securityKey', type: 'switch', label: '登录验证', description: '在新设备上登录时要求验证。' }] },
  { id: 'appearance', label: '外观', fields: [{ id: 'appearance', type: 'select', label: '配色', options: [
    { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '跟随系统' },
  ] }] },
  { id: 'notifications', label: '通知', fields: [{ id: 'digest', type: 'switch', label: '每周摘要' }, { id: 'daily', type: 'switch', label: '每日更新' }] },
  { id: 'privacy', label: '隐私', fields: [{ id: 'privacy', type: 'switch', label: '在团队目录中显示资料' }] },
  { id: 'locale', label: '语言与地区', fields: [
    { id: 'language', type: 'select', label: '界面语言', options: [{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }] },
    { id: 'currency', type: 'select', label: '货币', options: [{ value: 'CNY', label: '人民币' }, { value: 'USD', label: '美元' }] },
    { id: 'timeZone', type: 'select', label: '时区', options: [{ value: 'Asia/Shanghai', label: '上海' }, { value: 'UTC', label: '世界协调时' }] },
  ] },
  { id: 'keyboard', label: '快捷键', fields: [{ id: 'search', type: 'shortcut', label: '打开搜索' }, { id: 'help', type: 'shortcut', label: '打开帮助' }] },
  { id: 'developer', label: '开发者', fields: [{ id: 'apiEndpoint', type: 'url', label: '事件回调地址', keywords: ['Webhook'] }] },
] satisfies SettingSection[]
const prefs = {
  search: '搜索设置', sections: '设置分类', empty: '没有找到匹配的设置。', record: '录制', recording: '按下快捷键',
  clear: '清除', conflict: '这个快捷键已分配给其他操作。',
}
const candidates: ComparisonCandidate[] = [
  { id: 'basic', label: '协作版', description: '适合小团队', values: { members: 12, storage: 20, cost: 39, guides: true } },
  { id: 'project', label: '项目版', description: '适合跨组项目', values: { members: 35, storage: 180, cost: 85, guides: true } },
  { id: 'enterprise', label: '开放版', description: '适合多项目归档', values: { members: 100, storage: 800, cost: 160, guides: true } },
  { id: 'solo', label: '个人版', description: '适合独立创作', values: { members: 1, storage: 10, cost: 15, guides: false } },
]
const groups: ComparisonGroup[] = [
  { id: 'capacity', label: '空间与成员', criteria: [
    { id: 'members', title: '成员数', direction: 'higher' },
    { id: 'storage', title: '存储空间', direction: 'higher', format: value => value + ' GB' },
  ] },
  { id: 'support', label: '计费与服务', criteria: [
    { id: 'cost', title: '月费', direction: 'lower', format: value => '¥' + value },
    { id: 'guides', title: '团队接入指南' },
  ] },
]

function auth(request: SignInRequest) {
  demoStatus.value = ''
  if (request.method === 'password' && request.password.length < 8) throw new Error('Invalid demo password')
  if (request.method === 'provider' && request.provider.id === workspaceProvider.id) return { redirect: '/templates/shell-nav/' }
}
function resolveProvider(email: string) {
  const domain = email.toLowerCase().split('@').at(-1)
  return domain === 'team.example' ? provider : domain === 'workspace.example' ? workspaceProvider : null
}
function finished(method: SignInRequest['method']) {
  demoStatus.value = method === 'provider' ? '已进入演示团队工作区。' : '演示登录成功。'
}
function previewMode(value: SettingValue | undefined) {
  return value === 'dark' || value === 'system' ? value : 'light'
}
</script>

<template>
  <template v-if="loginLayout">
    <SSignIn title="登录工作区" :layout="loginLayout"
      :description="loginLayout === 'sso' ? '用 @team.example 邮箱体验单点登录，或用 @workspace.example 邮箱前往演示工作区。' : '使用示例邮箱和至少八位的演示密码。'"
      :providers="loginLayout === 'card' || loginLayout === 'split' ? [{ id: 'workspace', label: '工作区账号' }, { id: 'guest', label: '访客账号' }] : []"
      :authenticate="auth" :resolve-provider="resolveProvider" :signup-href="loginLayout === 'card' ? '/docs/quick-start/' : undefined"
      :terms-href="loginLayout === 'card' ? '/docs/quick-start/' : undefined" :privacy-href="loginLayout === 'card' ? '/docs/standard-design/' : undefined"
      :labels="{ email: '账号邮箱', password: '密码', submit: '登录', next: '继续', back: '更换邮箱', signup: '了解如何开通',
        providers: '也可以通过以下方式登录', terms: '使用说明', privacy: '数据说明', error: '演示密码至少需要八位，请重试。' }"
      @success="finished">
      <template #media><SImage class="sign-in-media" :src="deliveryArea" alt="交付园区地图" :ratio="1056 / 477" placeholder /></template>
    </SSignIn>
    <p v-if="demoStatus" role="status">{{ demoStatus }}</p>
  </template>

  <template v-else-if="kind.startsWith('settings')">
    <SButton v-if="kind === 'settings-dialog'" @click="dialog = true">打开设置</SButton>
    <component :is="kind === 'settings-dialog' ? SDialog : 'div'" v-bind="kind === 'settings-dialog'
      ? { title: '团队设置', open: dialog, size: 'lg', showCloseButton: true, dismissLabel: '关闭' } : {}"
      @update:open="dialog = $event">
      <SSettingsWorkspace v-model="settings" label="团队设置" :sections="scope" :labels="prefs" :layout="kind === 'settings' ? 'stack' : 'sidebar'">
        <template #section="{ section }">
          <div v-if="section.id === 'appearance'" class="sy-demo-appearance" :data-sy-theme="previewMode(settings.appearance)">
            <strong>交付工作台</strong>
            <span>3 项待评审</span>
            <SButton size="sm" variant="secondary" @click="demoStatus = '已预览当前配色。'">预览操作</SButton>
          </div>
        </template>
      </SSettingsWorkspace>
    </component>
    <p v-if="demoStatus" role="status">{{ demoStatus }}</p>
  </template>

  <SComparisonMatrix v-else-if="kind === 'table-comparison'" label="方案对照" :candidates="candidates" :groups="groups"
    :labels="{ criterion: '对比项目', add: '可添加方案', addAction: '添加比较列', swap: '更换方案', remove: '移除', best: '本项最优',
      enableBest: '高亮最优数据', empty: '没有可比较的方案。' }" />

  <SThemePreview v-else-if="kind === 'theme-showcase'" :theme="theme ?? previewTheme" :config="previewConfig">
    <template #page="{ page }">
      <template v-if="page.id === 'store'">
        <SButton size="sm" variant="secondary" @click="account = true">打开账号</SButton>
        <component :is="gallery" kind="product-gallery" />
        <SDialog v-model:open="account" title="商店账号" dismiss-label="关闭" show-close-button>
          <SSignIn title="登录商店" :authenticate="auth" :labels="{ email: '账号邮箱', password: '密码', submit: '登录', error: '请输入至少八位的演示密码。' }"
            @success="finished" />
          <p v-if="demoStatus" role="status">{{ demoStatus }}</p>
        </SDialog>
      </template>
      <component v-else-if="page.id === 'checkout'" :is="checkout" kind="payment-form" />
      <component v-else-if="page.id === 'chat'" :is="chat" kind="ai-chat" />
      <component v-else-if="page.id === 'activity'" :is="activity" kind="dashboard-alert-rail" />
      <component v-else-if="page.id === 'inventory'" :is="inventory" kind="table-page" />
    </template>
  </SThemePreview>

  <SPageScaffold v-else-if="kind === 'centered-hero'" heading="h2" layout="hero" title="用一处空间协作交付"
    description="从团队资料开始组织项目，按当前进度安排下一次交付。">
    <template #actions>
      <SLink class="sy-button" data-variant="primary" href="/templates/dashboard/">查看交付仪表盘</SLink>
      <SLink class="sy-button" data-variant="secondary" href="/docs/quick-start/">查看接入文档</SLink>
    </template>
    <template #media><SImage :src="deliveryArea" alt="交付园区地图" :ratio="1056 / 477" placeholder /></template>
  </SPageScaffold>

  <SPageScaffold v-else heading="h2" title="新建工作区页面" />
</template>

<style scoped>
.sign-in-media { min-block-size: 0; grid-template-rows: minmax(0, 1fr); }
.sign-in-media :deep(:is(img, .sy-image__placeholder, .sy-image__fallback)) { block-size: 100%; border-radius: 0; }
.sy-demo-appearance {
  display: grid;
  justify-items: start;
  gap: var(--sy-space-2);
  padding: var(--sy-space-3);
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-md);
  background: var(--sy-canvas);
  color: var(--sy-text);
}
</style>
