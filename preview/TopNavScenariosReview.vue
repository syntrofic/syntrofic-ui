<script setup lang="ts">
import { computed, defineComponent, h, ref, useId } from 'vue'
import { SButton, SDialog, SIcon, SInput, SMotionText, SNavbar, SPopover, STopNavMegaMenu, STopNavMegaMenuFeaturedCard,
  STopNavMegaMenuItem, STopNavMenu, type NavigationItem, type TopNavMenuItem } from '../src'
import mark from '../site/public/mark.svg?url'

const scene = useId()
const contentId = `${scene}-nav-content`
const WorkspaceLink = defineComponent({
  inheritAttrs: false,
  props: { to: String },
  setup(_, { attrs, slots }) {
    return () => h('a', { ...attrs, 'data-workspace-link': '' }, slots.default?.())
  },
})
const pages = [
  { id: 'overview', label: '总览', icon: 'viewColumns', iconOnly: true, href: `#${contentId}` },
  { id: 'assets', label: '资产', icon: 'file', as: WorkspaceLink, href: `#${contentId}` },
  { id: 'billing', label: '账单', href: `#${contentId}`, disabled: true },
] satisfies NavigationItem[]
const products = [
  { id: 'assets', title: '品牌资料', icon: 'file', description: '查看共享规范和素材', href: `#${contentId}` },
  { id: 'calendar', title: '发布日历', icon: 'calendar', description: '跟踪下次发布时间', href: `#${contentId}` },
] satisfies TopNavMenuItem[]
const support = [
  { id: 'help', title: '帮助中心', icon: 'info', description: '查看工作区常见问题', href: `#${contentId}` },
  { id: 'profile', title: '个人设置', icon: 'user', description: '管理通知偏好', href: `#${contentId}` },
] satisfies TopNavMenuItem[]
const active = ref('overview')
const destination = ref('总览')
const searchOpen = ref(false)
const query = ref('')
const notices = ref(true)
const recent = ref(['品牌规范', '图标库', '发布清单'])
const matches = computed(() => recent.value.filter(name => name.includes(query.value.trim())))

function show(label: string) { destination.value = label }
function find(label: string) {
  active.value = 'assets'
  show(label)
  searchOpen.value = false
}
function addProject() {
  const label = `项目草稿 ${recent.value.length - 2}`
  recent.value = [label, ...recent.value]
  active.value = 'assets'
  show(label)
}
</script>

<template>
  <section class="top-nav-review" aria-label="居中导航示例">
    <SNavbar v-model="active" centered brand="交付中心" :brand-href="`#${contentId}`" label="团队交付导航"
      menu-label="导航" :breakpoint="740" :items="pages" @activate="show($event.label)">
      <template #brand-icon><img class="top-nav-review__logo" :src="mark" width="22" height="22" alt=""></template>
      <template #menus>
        <li><STopNavMenu label="资源" :items="products" @select="show($event.title)" /></li>
        <li><STopNavMenu label="支持" :items="support" @select="show($event.title)" /></li>
        <li>
          <STopNavMegaMenu label="平台">
            <template #items>
              <STopNavMegaMenuItem title="组件文档" description="浏览团队可用组件" icon="file" :href="`#${contentId}`" @select="show('组件文档')" />
              <STopNavMegaMenuItem title="测试环境" description="查看待验证的版本" icon="wrench" :href="`#${contentId}`" @select="show('测试环境')" />
            </template>
            <template #featured>
              <STopNavMegaMenuFeaturedCard title="交付更新" description="查看本周已发布的组件和说明。" action-label="阅读交付更新"
                :href="`#${contentId}`" @select="show('交付更新')" />
            </template>
          </STopNavMegaMenu>
        </li>
      </template>
      <template #end="{ compact }">
        <SButton size="sm" variant="ghost" icon-only @click="searchOpen = true">
          <template #start><SIcon name="search" /></template>搜索资料
        </SButton>
        <SPopover label="最近通知" align="end">
          <template #trigger>
            <SButton size="sm" variant="ghost" icon-only class="top-nav-review__notice">
              <template #start>
                <SIcon name="bell" /><Transition name="sy-standard-fade"><span v-if="notices" class="top-nav-review__unread" /></Transition>
              </template>查看通知
            </SButton>
          </template>
          <p class="top-nav-review__note"><SMotionText :value="notices ? '品牌规范已更新。' : '通知已读'" announce /></p>
          <SButton size="sm" variant="secondary" :disabled="!notices" @click="notices = false">标记已读</SButton>
        </SPopover>
        <SButton v-if="!compact" class="top-nav-review__create" size="sm" @click="addProject">新建项目</SButton>
      </template>
    </SNavbar>
    <div :id="contentId" class="top-nav-review__content">
      <h3><SMotionText :value="destination" announce /></h3>
      <SButton class="top-nav-review__mobile-create" size="sm" variant="secondary" @click="addProject">新建项目</SButton>
    </div>
    <SNavbar label="品牌标题示例" brand="发布平台" brand-icon="calendar">
      <template #end>
        <SButton size="sm" variant="ghost" icon-only @click="show('个人资料')">
          <template #start><SIcon name="user" /></template>查看个人资料
        </SButton>
      </template>
    </SNavbar>
    <SDialog v-model:open="searchOpen" title="搜索交付资料">
      <div class="top-nav-review__search">
        <SInput v-model="query" label="资料名称" />
        <TransitionGroup name="sy-standard-fade" tag="ul" class="top-nav-review__search-results">
          <li v-for="name in matches" :key="name"><SButton size="sm" variant="ghost" @click="find(name)">{{ name }}</SButton></li>
          <li v-if="!matches.length" key="empty">没有匹配的资料</li>
        </TransitionGroup>
      </div>
    </SDialog>
  </section>
</template>

<style scoped>
.top-nav-review { display: grid; min-inline-size: 0; gap: var(--sy-space-2); }
.top-nav-review__content { display: flex; align-items: center; justify-content: space-between; gap: var(--sy-space-2); padding: var(--sy-space-2); }
.top-nav-review__content h3 { margin: 0; font-size: 1rem; }
.top-nav-review__logo { flex: none; object-fit: contain; }
.top-nav-review__notice { position: relative; }
.top-nav-review__unread { position: absolute; inset-block-start: 5px; inset-inline-end: 4px; inline-size: 6px; block-size: 6px; background: var(--sy-accent); border-radius: 50%; }
.top-nav-review__create { flex-shrink: 0; white-space: nowrap; padding-inline: var(--sy-space-2); }
.top-nav-review__note { margin-block: 0 var(--sy-space-2); }
.top-nav-review__search { display: grid; gap: var(--sy-space-2); }
.top-nav-review__search-results { display: grid; gap: 3px; margin: 0; padding: 0; min-block-size: 7rem; list-style: none; align-content: start; }
.top-nav-review__mobile-create { display: none; }
.top-nav-review :deep(.sy-navbar[data-compact]) + .top-nav-review__content .top-nav-review__mobile-create { display: inline-flex; }
@media (max-width: 390px) {
  .top-nav-review :deep(.sy-navbar__actions) { gap: 2px; }
  .top-nav-review :deep(.sy-navbar__toggle) { padding-inline: 6px; }
}
</style>
