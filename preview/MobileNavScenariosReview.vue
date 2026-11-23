<script setup lang="ts">
import { ref, useId } from 'vue'
import { SAppLayout, SMobileNav, SMobileNavToggle, SMotionText, SNavbar, SSidebar, SSideNavItem, SSideNavSection } from '../src'

const key = 'review-mobile-nav-' + useId()
const leadingOpen = ref(false)
const trailingOpen = ref(false)
const current = ref('releases')
const menu = [
  { id: 'releases', label: '发布计划', icon: 'calendar' },
  { id: 'assets', label: '设计资料', icon: 'file' },
]
const embedded = ref('releases')
</script>

<template>
  <section class="mobile-nav-scenarios" aria-label="移动导航呈现与触发器">
    <div class="review__row">
      <SMobileNavToggle v-model:open="leadingOpen" :controls-id="key + '-lean'" label="打开无标题导航抽屉" />
      <SMobileNavToggle v-model:open="trailingOpen" :controls-id="key + '-right'" label="从右侧打开目录抽屉" icon="sidebar" />
    </div>
    <SMobileNav v-model:open="leadingOpen" :controls-id="key + '-lean'" label="交付目录" side="start" dismiss-label="关闭目录">
      <SSideNavSection title="交付导航">
        <SSideNavItem v-for="item in menu" :key="item.id" :label="item.label" :icon="item.icon" :current="current === item.id" @activate="current = item.id" />
      </SSideNavSection>
      <SSideNavSection title="帮助">
        <SSideNavItem label="归档规范" icon="book" :current="current === 'rules'" @activate="current = 'rules'" />
      </SSideNavSection>
    </SMobileNav>
    <SMobileNav v-model:open="trailingOpen" :controls-id="key + '-right'" title="资源目录" side="end" dismiss-label="关闭资源目录"
      :items="menu" :current-id="current" @activate="current = $event.id" />
    <output aria-label="移动导航当前项"><SMotionText :value="menu.find(item => item.id === current)?.label ?? '归档规范'" /></output>
    <SAppLayout :breakpoint="1400" sidebar-title="交付应用导航" main-label="移动工作区内容" :content-padding="3"
      :mobile-nav="{ hasToggle: false }" dismiss-label="关闭应用导航" class="mobile-nav-scenarios__embedded">
      <template #navbar>
        <SNavbar brand="交付应用" label="移动工作区工具栏">
          <template #start><SMobileNavToggle label="打开交付应用导航" icon="folder" /></template>
        </SNavbar>
      </template>
      <template #sidebar>
        <SSidebar v-model="embedded" label="应用目录" :groups="[{ id: 'resources', label: '资源', items: menu }]" />
      </template>
      <p><SMotionText :value="menu.find(item => item.id === embedded)?.label ?? ''" /></p>
    </SAppLayout>
  </section>
</template>

<style scoped>
.mobile-nav-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.mobile-nav-scenarios__embedded { border: 1px solid var(--sy-border); }
.mobile-nav-scenarios__embedded p { margin: 0; }
</style>
