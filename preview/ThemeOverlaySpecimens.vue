<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import SButton from '../src/components/SButton.vue'
import SDialog from '../src/components/SDialog.vue'
import SDrawer from '../src/components/SDrawer.vue'
import SDropdown from '../src/components/SDropdown.vue'
import SHoverCard from '../src/components/SHoverCard.vue'
import SListBox from '../src/components/SListBox.vue'
import SPopover from '../src/components/SPopover.vue'
import SSheet from '../src/components/SSheet.vue'
import STooltip from '../src/components/STooltip.vue'
import type { MenuEntry } from '../src/types'

const panel = ref(true)
const dialog = ref(true)
const drawer = ref(true)
const sheet = ref(true)
const hoverFrame = useTemplateRef<HTMLElement>('hoverFrame')
const drawerFrame = useTemplateRef<HTMLElement>('drawerFrame')
const sheetFrame = useTemplateRef<HTMLElement>('sheetFrame')
const options = [{ value: 'all', label: '所有评审者', description: '允许外部评审者查看' },
  { value: 'team', label: '仅项目成员', description: '只共享给参与交付的团队' },
  { value: 'private', label: '仅自己', disabled: true }]
const audience = ref('team')
const actions: MenuEntry[] = [{ id: 'copy', label: '复制链接' }, { id: 'download', label: '下载资料' },
  { id: 'remove', label: '移除资料', tone: 'danger' }]
</script>

<template>
  <div class="theme-overlay-examples">
    <section class="theme-overlay-example" aria-labelledby="theme-menu-title">
      <h3 id="theme-menu-title">菜单</h3>
      <SDropdown open label="资料操作" :items="actions" :autofocus="false" />
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-tooltip-title">
      <h3 id="theme-tooltip-title">工具提示</h3>
      <STooltip open side="bottom" align="start" text="发布后会通知所有评审者。">
        <template #trigger><SButton variant="secondary">发布说明</SButton></template>
      </STooltip>
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-popover-title">
      <h3 id="theme-popover-title">弹出面板</h3>
      <SPopover v-model:open="panel" label="预计交付" :autofocus="false" :dismiss-on-outside="false">
        <template #trigger><SButton variant="secondary">交付安排</SButton></template>
        <p>本周五开始评审。</p>
        <SButton size="sm" @click="panel = false">完成</SButton>
      </SPopover>
    </section>
    <section ref="hoverFrame" class="theme-overlay-example" aria-labelledby="theme-hover-title">
      <h3 id="theme-hover-title">悬浮卡</h3>
      <SHoverCard v-if="hoverFrame" default-open label="负责评审" trigger-label="周岚" :open-on-focus="false" :portal-target="hoverFrame">
        <strong>周岚</strong>
        <p>交付负责人</p>
        <a href="#theme-dialog-title">查看发布流程</a>
      </SHoverCard>
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-list-title">
      <h3 id="theme-list-title">列表框</h3>
      <SListBox v-model="audience" label="可见范围" :options="options" />
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-dialog-title">
      <h3 id="theme-dialog-title">对话框</h3>
      <div class="theme-overlay-preview theme-overlay-preview--dialog" :data-open="dialog || undefined">
        <SButton class="theme-overlay-preview__opener" :inert="dialog" variant="secondary" @click="dialog = true">准备发布</SButton>
        <SDialog v-model:open="dialog" inline title="发布交付资料" width="100%" :padding="2">
          <p>评审者将收到通知。</p>
          <template #footer="{ close }">
            <SButton size="sm" variant="secondary" @click="close">取消</SButton>
            <SButton size="sm" @click="close">发布</SButton>
          </template>
        </SDialog>
      </div>
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-drawer-title">
      <h3 id="theme-drawer-title">抽屉</h3>
      <SDrawer v-if="drawerFrame" v-model:open="drawer" :modal="false" :autofocus="false" :draggable="false"
        :portal-target="drawerFrame" extent="12rem" title="交付详情" dismiss-label="关闭">
        <template #trigger><SButton variant="secondary">查看详情</SButton></template>
        <dl><dt>负责人</dt><dd>周岚</dd><dt>交付版本</dt><dd>v2.4</dd></dl>
      </SDrawer>
      <div ref="drawerFrame" class="theme-overlay-preview" />
    </section>
    <section class="theme-overlay-example" aria-labelledby="theme-sheet-title">
      <h3 id="theme-sheet-title">底部面板</h3>
      <SSheet v-if="sheetFrame" v-model:open="sheet" :modal="false" :autofocus="false" :draggable="false"
        :portal-target="sheetFrame" height="hug" title="可见范围" dismiss-label="关闭">
        <template #trigger><SButton variant="secondary">共享资料</SButton></template>
        <label>选择接收人
          <select v-model="audience">
            <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
          </select>
        </label>
      </SSheet>
      <div ref="sheetFrame" class="theme-overlay-preview" />
    </section>
  </div>
</template>
