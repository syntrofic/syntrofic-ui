<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { SButton, SMotionText, SSwitch, SToggleButton, SToggleButtonGroup, provideIcons } from '../src'

defineProps<{ group?: boolean }>()
const filled = (path: string) => ({ path, variants: { filled: { path, fill: 'currentColor' } } })
provideIcons({
  star: filled('m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z'),
  bookmark: filled('M6 3h12v18l-6-3.5L6 21z'),
  heart: filled('M12 20 4.3 12.3C.5 8.5 6 2.7 10 6.4l2 1.8 2-1.8c4-3.7 9.5 2.1 5.7 5.9z'),
})

const saved = ref(false)
const favorite = ref(false)
const liked = ref(false)
const muted = ref(false)
const freeze = ref(true)
const sync = ref(false)
const committed = ref(false)
const protect = ref(false)
const error = ref(false)
const aborted = ref(0)
const order = ref<string[]>([])
const requests = shallowRef<{ resolve: () => void; reject: (error: Error) => void }[]>([])
function beforeChange(_value: boolean, event: MouseEvent) {
  order.value.push('change')
  if (protect.value) event.preventDefault()
}
function savePin(_value: boolean, _event: MouseEvent, signal: AbortSignal) {
  order.value.push('action')
  error.value = false
  signal.addEventListener('abort', () => { aborted.value++ }, { once: true })
  // Let the example settle an earlier request after a newer click has superseded it.
  return new Promise<void>((resolve, reject) => { requests.value = [...requests.value, { resolve, reject }] })
}
function settle(fails: boolean) {
  const [request, ...remaining] = requests.value
  if (!request) return
  requests.value = remaining
  if (fails) request.reject(new Error('固定失败'))
  else request.resolve()
}
const view = ref('list')
const customView = ref('timeline')
const customActions = ref(0)
const marks = ref<string[]>(['strong'])
const selectedQueue = ref('mine')
const selectedLower = ref<string[]>(['layout'])
const queues = [{ value: 'mine', label: '我负责的记录' }, { value: 'all', label: '全部交付记录' }]
const details = [{ value: 'layout', label: '检查布局' }, { value: 'text', label: '检查文案' }, { value: 'archive', label: '检查归档' }]
const views = [{ value: 'list', label: '列表视图' },
  { value: 'board', label: '看板视图', icon: 'viewColumns', size: 'lg', elevation: 'low' }] as const
const formatting = [{ value: 'strong', label: '加粗' }, { value: 'italic', label: '斜体' }, { value: 'underline', label: '下划线' }]
</script>

<template>
  <section v-if="group" class="toggle-review" aria-label="按钮组操作示例">
    <SToggleButtonGroup v-model="view" label="视图切换" :items="views" size="sm" />
    <SToggleButtonGroup v-model="marks" label="正文格式" :items="formatting" multiple />
    <SToggleButtonGroup v-model="customView" label="自定义视图" :data-actions="customActions" size="sm">
      <SToggleButton value="timeline" icon="calendar">时间线</SToggleButton>
      <SToggleButton value="archive" disabled>归档</SToggleButton>
      <SToggleButton value="table" :model-value="true" :pressed-change-action="() => { customActions++ }" @pressed-change="customActions++">表格</SToggleButton>
    </SToggleButtonGroup>
    <p class="toggle-review__text" :data-view="view" :data-bold="marks.includes('strong') || undefined"
      :data-italic="marks.includes('italic') || undefined" :data-underline="marks.includes('underline') || undefined">
      <SMotionText :value="view === 'list' ? '列表视图 · 发布清单' : '看板视图 · 待办和已完成'" announce />
    </p>
    <div class="review__columns">
      <SToggleButtonGroup v-model="selectedQueue" label="侧栏记录范围" :items="queues" orientation="vertical" />
      <SToggleButtonGroup v-model="selectedLower" label="交付检查项" :items="details" orientation="vertical" multiple />
    </div>
  </section>
  <section v-else class="toggle-review" aria-label="切换操作示例">
    <div class="review__row">
      <SToggleButton v-model="favorite" label="收藏当前资料" icon="star" pressed-icon-variant="filled" pressed-tone="warning" icon-only />
      <SToggleButton v-model="liked" label="喜欢当前资料" icon="heart" pressed-icon-variant="filled" pressed-tone="danger" icon-only />
      <SToggleButton v-model="muted" label="静音交付提醒" icon="bell" pressed-icon="eyeSlash" icon-only />
      <SToggleButton v-model="saved" label="保存书签" pressed-label="已保存书签" icon="bookmark" pressed-icon-variant="filled" pressed-tone="info" />
    </div>
    <div class="review__row">
      <SToggleButton label="共享已锁定" icon="link" disabled />
      <SToggleButton v-model="sync" label="同步状态" pressed-label="同步已开启" icon="checkDouble" :loading="freeze" />
      <SSwitch v-model="freeze">模拟同步等待</SSwitch>
    </div>
    <form class="toggle-review" aria-label="异步固定示例" :data-aborted="aborted" :data-order="order.join(' ')" @submit.prevent>
      <div class="review__row">
        <SToggleButton v-model="committed" label="固定共享资料" pressed-label="已固定共享资料" icon="plus" pressed-icon="check"
          :pressed-change-action="savePin" @click="order = ['click']" @pressed-change="beforeChange" @action-error="error = true" />
        <SSwitch v-model="protect">禁止切换</SSwitch>
      </div>
      <div class="review__row">
        <SButton size="sm" variant="secondary" :disabled="!requests.length" @click="settle(false)">确认请求</SButton>
        <SButton size="sm" variant="ghost" :disabled="!requests.length" @click="settle(true)">拒绝请求</SButton>
        <SButton size="sm" variant="ghost" type="reset">重置请求</SButton>
        <span role="status" aria-label="已保存状态"><SMotionText :value="committed ? '已固定' : '未固定'" /></span>
      </div>
      <span v-if="error" role="alert">固定失败，请重试</span>
    </form>
  </section>
</template>

<style scoped>
.toggle-review { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.toggle-review__text { margin: 0; padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); background: var(--sy-surface-muted); transition: background-color var(--sy-duration) var(--sy-ease-settle), font-weight var(--sy-duration) var(--sy-ease-settle); }
.toggle-review__text[data-view='board'] { background: var(--sy-accent-soft); }
.toggle-review__text[data-bold] { font-weight: 750; }
.toggle-review__text[data-italic] { font-style: italic; }
.toggle-review__text[data-underline] { text-decoration: underline; }
</style>
