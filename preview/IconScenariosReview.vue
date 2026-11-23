<script setup lang="ts">
import { SIcon } from '../src'

const semantic = [
  { color: 'primary', icon: 'search', label: '主要' },
  { color: 'secondary', icon: 'menu', label: '次要' },
  { color: 'tertiary', icon: 'info', label: '弱提示' },
  { color: 'disabled', icon: 'clock', label: '禁用' },
  { color: 'accent', icon: 'calendar', label: '强调' },
  { color: 'success', icon: 'success', label: '成功' },
  { color: 'error', icon: 'error', label: '错误' },
  { color: 'warning', icon: 'warning', label: '警告' },
] as const
const colors = [
  ['blue', '蓝色'], ['red', '红色'], ['green', '绿色'], ['gray', '灰色'], ['cyan', '青色'],
  ['teal', '蓝绿色'], ['yellow', '黄色'], ['orange', '橙色'], ['pink', '粉色'], ['purple', '紫色'],
] as const
const sizes = [['xsm', '特小'], ['sm', '小'], ['md', '中'], ['lg', '大']] as const
const statuses = [
  { icon: 'success', color: 'success', label: '发布成功' },
  { icon: 'warning', color: 'warning', label: '构建有警告' },
  { icon: 'error', color: 'error', label: '校验失败' },
  { icon: 'info', color: 'accent', label: '有新版本可用' },
] as const
</script>

<template>
  <section class="icon-scenarios" aria-label="图标颜色、尺寸与状态">
    <div class="icon-scenarios__samples">
      <h3>语义颜色</h3>
      <ul role="list" aria-label="语义颜色">
        <li v-for="{ icon, color, label } in semantic" :key="color"><SIcon :name="icon" :color="color" size="md" />{{ label }}</li>
      </ul>
    </div>
    <div class="icon-scenarios__samples">
      <h3>指定颜色</h3>
      <ul role="list" aria-label="指定颜色">
        <li v-for="[color, label] in colors" :key="color"><SIcon name="search" :color="color" size="md" />{{ label }}</li>
      </ul>
    </div>
    <div class="icon-scenarios__samples">
      <h3>图标尺寸</h3>
      <ul role="list" aria-label="图标尺寸">
        <li v-for="[size, label] in sizes" :key="size"><SIcon name="search" color="primary" :size="size" />{{ label }}</li>
      </ul>
    </div>
    <div class="icon-scenarios__samples">
      <h3>发布状态</h3>
      <ul role="list" aria-label="发布状态">
        <li v-for="{ icon, color, label } in statuses" :key="color"><SIcon :name="icon" :color="color" size="sm" />{{ label }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.icon-scenarios { display: grid; flex: 1 1 100%; gap: var(--sy-space-4); min-inline-size: 0; }
.icon-scenarios__samples { display: grid; gap: var(--sy-space-2); }
.icon-scenarios h3 { font-size: 1rem; margin: 0; }
.icon-scenarios ul { display: flex; flex-wrap: wrap; gap: var(--sy-space-2) var(--sy-space-3); margin: 0; padding: 0; list-style: none; }
.icon-scenarios li { display: inline-flex; align-items: center; gap: var(--sy-space-1); min-block-size: 1.75rem; color: var(--sy-text-muted); font-size: .85rem; }
</style>
