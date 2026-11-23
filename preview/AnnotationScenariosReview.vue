<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SChip, SKbd, SMenu, SMenuItem, SMotionText, type AnnotationTone } from '../src'

defineProps<{ kind: 'badge' | 'chip' | 'kbd' }>()
const categories: { label: string; tone: AnnotationTone }[] = [
  { label: '紧急', tone: 'red' }, { label: '待分派', tone: 'orange' }, { label: '待复核', tone: 'yellow' },
  { label: '后端', tone: 'green' }, { label: '研究', tone: 'teal' }, { label: '运维', tone: 'cyan' },
  { label: '设计', tone: 'blue' }, { label: '工程', tone: 'purple' }, { label: '推广', tone: 'pink' },
]
const palette = [{ label: '默认', tone: 'neutral' as const }, ...categories, { label: '归档', tone: 'gray' as const }]
const statuses: { label: string; tone: AnnotationTone }[] = [
  { label: '已发布', tone: 'success' }, { label: '待处理', tone: 'warning' }, { label: '发布失败', tone: 'danger' },
  { label: '草稿', tone: 'neutral' }, { label: '评审中', tone: 'info' },
]
const unread = ref(5)
const contributions = ref(['视觉', '文案', '交付'])
const selected = ref(false)
const message = ref('')
const shortcuts = [
  { label: '创建发布草稿', keys: 'mod+shift+n' },
  { label: '查找文件', keys: 'mod+k' },
  { label: '复制文件链接', keys: 'mod+shift+c' },
]
const count = computed(() => unread.value ? unread.value + ' 条未读回复' : '没有未读回复')
</script>

<template>
  <section v-if="kind === 'badge'" class="annotation-scenarios" aria-label="状态和分类徽标">
    <div class="review__row" aria-label="发布状态" role="group">
      <SBadge v-for="item in statuses" :key="item.tone" v-bind="item" dot />
    </div>
    <div class="review__row" aria-label="团队和优先级" role="group">
      <SBadge v-for="item in categories" :key="item.tone" v-bind="item" />
    </div>
    <div class="review__row">
      <span>未读回复</span>
      <SBadge tone="accent" role="status" :aria-label="count"><SMotionText :value="String(unread)" /></SBadge>
      <SButton size="sm" variant="secondary" @click="unread = 0">标记为已读</SButton>
    </div>
  </section>
  <section v-else-if="kind === 'chip'" class="annotation-scenarios" aria-label="标签颜色和操作">
    <div class="review__row" aria-label="标签颜色" role="group">
      <SChip v-for="item in palette" :key="item.tone" v-bind="item" />
    </div>
    <div class="review__row" aria-label="禁用标签颜色" role="group">
      <SChip v-for="item in palette" :key="item.tone" v-bind="item" clickable disabled />
    </div>
    <div class="review__row" aria-label="标签操作" role="group">
      <SChip label="品牌文件" icon="folder" tone="blue" clickable :selected="selected" @activate="selected = !selected; message = selected ? '已启用品牌文件筛选' : '已关闭品牌文件筛选'">
        <template #end><SBadge :label="3" tone="info" aria-hidden="true" /></template>
      </SChip>
      <SChip label="评审负责人" icon="users" tone="teal" clickable @activate="message = '林舟负责品牌文件评审'" />
    </div>
    <TransitionGroup name="sy-standard-fade" tag="div" class="review__row" role="group" aria-label="可移除标签">
      <SChip v-for="item in contributions" :key="item" :label="item" tone="purple" removable :remove-label="'移除贡献标签' + item"
        @remove="contributions = contributions.filter(value => value !== item); message = '已移除' + item + '标签'" />
    </TransitionGroup>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="contributions = ['视觉', '文案', '交付']; message = '已恢复贡献标签'">恢复贡献标签</SButton>
      <p role="status"><SMotionText :value="message" /></p>
    </div>
  </section>
  <section v-else class="annotation-scenarios" aria-label="组合键和菜单快捷键">
    <p>按 <SKbd keys="mod+k" /> 查找品牌文件。按 <SKbd keys="shift+return" variant="light" /> 在备注中换行。</p>
    <div class="review__row" role="group" aria-label="修饰键和特殊键">
      <SKbd v-for="key in ['mod+shift+z', 'ctrl+alt+delete', 'alt+tab', 'backspace', 'space']" :key="key" :keys="key" />
    </div>
    <div class="review__row">
      <SMenu>
        <template #trigger><SButton size="sm" variant="secondary">文件指令</SButton></template>
        <SMenuItem v-for="action in shortcuts" :key="action.keys" :text-value="action.label" @select="message = '已选择' + action.label">
          <span>{{ action.label }}</span><SKbd :keys="action.keys" variant="light" />
        </SMenuItem>
      </SMenu>
      <p role="status"><SMotionText :value="message" /></p>
    </div>
  </section>
</template>

<style scoped>
.annotation-scenarios { min-inline-size: 0; display: grid; gap: var(--sy-space-3); }
.annotation-scenarios p { margin: 0; }
</style>
