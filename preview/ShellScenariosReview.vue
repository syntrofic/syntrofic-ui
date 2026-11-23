<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { SAppLayout, SBanner, SButton, SMotionText, SNavbar, SSidebar, SSideNavHeading, type NavigationItem } from '../src'

const props = defineProps<{ layout: string }>()
const surface = useTemplateRef<HTMLElement>('surface')
const basePath = '/review/releases/'
const route = ref(basePath + 'summary')
const bannerOpen = ref(true)
const destinations: NavigationItem[] = [
  { id: 'summary', label: '进度概览', icon: 'home', href: basePath + 'summary' },
  { id: 'schedule', label: '交付日历', icon: 'calendar', href: basePath + 'schedule' },
  { id: 'partners', label: '协作团队', icon: 'users', href: basePath + 'partners' },
]
const details: Record<string, string> = {
  summary: '本周完成了品牌手册复核，三份交付材料正在等待确认。',
  schedule: '设计评审安排在周四下午，交付文件将在周五归档。',
  partners: '设计团队维护品牌素材，交付团队负责公开发布。',
}
const group = [{ id: 'release', label: '发布管理', items: destinations }]
const hasTop = computed(() => props.layout === 'top' || props.layout === 'paired' || props.layout === 'notice')
const hasSide = computed(() => props.layout === 'side' || props.layout === 'paired' || props.layout === 'notice')
const title = computed(() => props.layout === 'content' ? '交付说明' : destinations.find(item => item.href === route.value)?.label ?? '进度概览')
const detail = computed(() => details[route.value.slice(basePath.length)] ?? details.summary)
function focusContent() {
  surface.value?.querySelector<HTMLElement>('.sy-app-layout__main')?.focus({ preventScroll: true })
}
</script>

<template>
  <section ref="surface" class="shell-scenarios" aria-label="应用布局组合">
    <SAppLayout :breakpoint="510" :sidebar-size="170" :sidebar-min="144" :content-padding="4" :navigate="href => { route = href }"
      main-label="发布页面" sidebar-title="发布导航" dismiss-label="关闭发布导航">
      <template v-if="hasTop" #navbar>
        <SNavbar brand="交付台" brand-icon="folder" label="交付顶部导航" :items="destinations" :current-path="route" menu-label="页面菜单" />
      </template>
      <template v-if="hasSide" #sidebar>
        <SSidebar label="发布管理侧栏" :groups="group" :current-path="route">
          <template #start>
            <SSideNavHeading heading="交付空间" :heading-href="basePath + 'summary'" icon="folder" subheading="设计协作" />
          </template>
        </SSidebar>
      </template>
      <template v-if="layout === 'notice'" #banner>
        <SBanner v-model:open="bannerOpen" variant="section" title="发布窗口调整" description="周五 18:00 后暂停提交，次日恢复。"
          dismissible dismiss-label="关闭发布公告" @dismiss="focusContent" />
      </template>
      <h3><SMotionText :value="title" /></h3>
      <p v-if="layout === 'content'">发布完成后，请将原始文件和版本说明一同归档。</p>
      <p v-else><SMotionText :value="detail" /></p>
      <SButton v-if="layout === 'notice' && !bannerOpen" size="sm" variant="secondary" @click="bannerOpen = true; focusContent()">重新显示公告</SButton>
    </SAppLayout>
  </section>
</template>

<style scoped>
.shell-scenarios {
  min-inline-size: 0; border: 1px solid var(--sy-border); border-radius: var(--sy-radius-lg);
}
.shell-scenarios h3, .shell-scenarios p { margin: 0 0 var(--sy-space-3); }
.shell-scenarios p :deep(.sy-motion-text__visual) { max-inline-size: 100%; flex-wrap: wrap; }
</style>
