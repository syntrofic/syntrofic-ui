<script setup lang="ts">
import { parseDate, parseDateTime } from '@internationalized/date'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import EmptyAlertScenariosReview from './EmptyAlertScenariosReview.vue'
import CarouselScenariosReview from './CarouselScenariosReview.vue'
import {
  SAgenda, SAvatar, SAvatarGroup, SButton, SCarousel, SDialog, SEmptyState, SMotionText, SSegment, SSwitch,
  useSnapPaging, type AgendaEvent, type AgendaInterval, type AgendaLabels, type CarouselSlide,
} from '../src'

defineProps<{ id: string }>()
const agendaDate = shallowRef(parseDate('2026-11-18'))
const clock = parseDateTime('2026-11-18T10:25')
const agendaLabels: AgendaLabels = {
  today: '今天', previous: '上页', next: '下页', view: '日程视图', day: '日', week: '周', month: '月',
  allDay: '全天', addEvent: '新增日程', empty: '这段时间暂无日程。',
  count: count => count ? `${count} 项` : '—', more: count => `另有 ${count} 项`, currentTime: '当前时间',
}
const events = shallowRef<AgendaEvent[]>([
  { id: 'release', title: '设计交付周', start: parseDate('2026-11-16'), end: parseDate('2026-11-21'), color: 'sage' },
  { id: 'review', title: '组件评审', start: parseDateTime('2026-11-18T09:15'), end: parseDateTime('2026-11-18T11:00'), color: 'blue' },
  { id: 'walk', title: '可访问性走查', start: parseDateTime('2026-11-18T10:25'), end: parseDateTime('2026-11-18T12:00'), status: 'unconfirmed' },
  { id: 'sync', title: '项目同步', start: parseDateTime('2026-11-17T11:00'), end: parseDateTime('2026-11-17T12:00'), color: 'sand', isReadOnly: true },
  { id: 'copy', title: '文案确认', start: parseDateTime('2026-11-19T13:00'), end: parseDateTime('2026-11-19T14:30'), color: 'rose' },
  { id: 'night', title: '发布观察', start: parseDateTime('2026-11-18T16:00'), end: parseDateTime('2026-11-19T09:45'), color: 'sand' },
  { id: 'retrospective', title: '交付复盘', start: parseDateTime('2026-11-20T10:00'), end: parseDateTime('2026-11-20T11:00'), status: 'declined' },
])
const activeEvent = ref<string | null>(null)
let added = 0
function addEvent(interval: AgendaInterval) {
  const id = `event-${++added}`
  events.value = [...events.value, { id, title: '新日程', ...interval, color: 'rose' }]
  activeEvent.value = id
}
function updateEvent(event: AgendaEvent, interval: AgendaInterval) {
  events.value = events.value.map(item => item.id === event.id ? { ...item, ...interval } : item)
}

interface PaletteSlide extends CarouselSlide { colors: [string, string, string]; detail: string }
const palettes: PaletteSlide[] = [
  { id: 'fog', label: '苔绿', detail: '灰绿 · 米白 · 浅苔', colors: ['#c9d4c5', '#eef0e7', '#6c7c6a'] },
  { id: 'coast', label: '雾蓝', detail: '青灰 · 雾白 · 沉蓝', colors: ['#cad7df', '#e5ebf0', '#617887'] },
  { id: 'clay', label: '陶土', detail: '陶粉 · 灰白 · 暖褐', colors: ['#dfc8c1', '#f1e5df', '#8e665a'] },
  { id: 'sand', label: '麦色', detail: '灰黄 · 亚麻 · 淡棕', colors: ['#e1d7bb', '#f1eadc', '#897954'] },
]
const galleryLayout = ref('single')
const galleryItems = [{ value: 'single', label: '单张' }, { value: 'rail', label: '并排' }]
const galleryIndex = ref(0)
const galleryModal = ref(false)
const galleryAuto = ref(false)
const pageLabel = (index: number, count: number) => `第 ${index + 1} 张，共 ${count} 张`
const galleryLabels = {
  previousLabel: '上一张', nextLabel: '下一张', playLabel: '播放', pauseLabel: '暂停',
  navigationLabel: '选择配色', carouselDescription: '轮播', slideDescription: '配色方案', pageLabel,
}
function palette(id: string) { return palettes.find(slide => slide.id === id) ?? palettes[0] }
const snapMode = ref<'view' | 'item'>('view')
const carouselPaging = useSnapPaging(() => ({ pages: snapMode.value }))
const snapModeOptions = [{ value: 'view', label: '每次一屏' }, { value: 'item', label: '每次一项' }]
const snapDirection = ref(false)
const snapSlides = Array.from({ length: 8 }, (_, index) => ({
  ...palettes[index % palettes.length], id: 'variant-' + (index + 1), label: '色板 ' + (index + 1),
}))

const emptyScene = ref('initial')
const emptyScenes = [{ value: 'initial', label: '初始' }, { value: 'filter', label: '无结果' }, { value: 'error', label: '异常' }]
const ready = ref<string>()
const loading = ref(false)
const emptyView = ref<HTMLElement | null>(null)
let resend: ReturnType<typeof setTimeout> | undefined
const people = [
  { id: 'lin', name: '林芷', initials: '林' },
  { id: 'chen', name: '陈明', initials: '陈' },
]
const emptyCopy = computed(() => {
  if (emptyScene.value === 'filter') return {
    title: '没有匹配的成员', description: '清除筛选可查看团队的全部成员。', action: '清除筛选',
    appearance: 'outline', tone: 'neutral',
  } as const
  if (emptyScene.value === 'error') return {
    title: '资料暂时无法载入', description: '连接恢复后，可以继续查看资料。', action: '重试',
    appearance: 'surface', tone: 'danger',
  } as const
  return {
    title: '项目还没有资料', description: '添加第一份资料，和团队一起协作。', action: '添加资料',
    appearance: 'surface', tone: 'sage',
  } as const
})

function setScene(value: string | null | undefined) {
  if (!value) return
  clearTimeout(resend)
  loading.value = false
  ready.value = undefined
  emptyScene.value = value
}

function recover() {
  if (emptyScene.value === 'error') {
    loading.value = true
    resend = setTimeout(() => {
      loading.value = false
      ready.value = '品牌手册'
    }, 520)
  } else {
    ready.value = emptyScene.value === 'filter' ? '林芷' : '新项目资料'
  }
}
watch(ready, async () => {
  const node = emptyView.value
  if (!node?.contains(node.ownerDocument.activeElement)) return
  await nextTick()
  node.querySelector<HTMLElement>(':scope > :not([inert]) button')?.focus({ preventScroll: true })
})
onBeforeUnmount(() => clearTimeout(resend))
</script>

<template>
  <SAgenda
    v-if="id === 'WP.agenda'" v-model:date="agendaDate" v-model:selected="activeEvent" :events="events" :labels="agendaLabels"
    label="项目日程" locale="zh-CN" time-zone="Asia/Shanghai" first-day-of-week="mon"
    :hour-cycle="24" :reference-time="clock" :start-hour="8" :end-hour="18" :compact-week-days="3"
    :snap-minutes="15" allows-swipe editable @create="addEvent" @move="updateEvent" @resize="updateEvent"
    @delete="event => { events = events.filter(item => item.id !== event.id) }"
  />
  <div v-else-if="id === 'WP.carousel'" class="review-gallery">
    <div class="review-gallery__options">
      <SSegment v-model="galleryLayout" :items="galleryItems" label="轮播排列" size="sm" />
      <SSwitch v-model="galleryAuto">自动播放</SSwitch>
      <SButton size="sm" variant="secondary" @click="galleryModal = true">放大</SButton>
    </div>
    <SCarousel
      v-model="galleryIndex" v-bind="galleryLabels" :slides="palettes" label="莫兰迪配色"
      :slides-per-view="galleryLayout === 'rail' ? 2 : 1" :navigation="galleryLayout === 'rail' ? 'dots' : 'thumbnails'"
      :type="galleryLayout === 'rail' ? 'miniatures' : 'in-place'" :autoplay="galleryAuto" :delay="1400"
    >
      <template #slide="{ slide }">
        <article class="review-gallery__palette" :style="{ '--palette-base': palette(slide.id).colors[0], '--palette-light': palette(slide.id).colors[1], '--palette-dark': palette(slide.id).colors[2] }">
          <div class="review-gallery__color-field" aria-hidden="true"><span /><span /></div>
          <div class="review-gallery__caption"><strong>{{ slide.label }}</strong><small>{{ palette(slide.id).detail }}</small></div>
        </article>
      </template>
      <template #pagination="{ slide }">
        <span v-if="galleryLayout === 'single' && slide" class="review-gallery__thumbnail"
          :style="{ background: palette(slide.id).colors[0], '--palette-dark': palette(slide.id).colors[2] }" aria-hidden="true" />
        <span v-else class="sy-carousel__dot" aria-hidden="true" />
      </template>
    </SCarousel>
    <SDialog v-model:open="galleryModal" title="配色预览" size="lg" dismiss-label="关闭" show-close-button>
      <SCarousel v-model="galleryIndex" v-bind="galleryLabels" :slides="palettes" label="放大配色" type="modal" loop>
        <template #slide="{ slide }">
          <article class="review-gallery__palette" :style="{ '--palette-base': palette(slide.id).colors[0], '--palette-light': palette(slide.id).colors[1], '--palette-dark': palette(slide.id).colors[2] }">
            <div class="review-gallery__color-field" aria-hidden="true"><span /><span /></div>
            <div class="review-gallery__caption"><strong>{{ slide.label }}</strong><small>{{ palette(slide.id).detail }}</small></div>
          </article>
        </template>
      </SCarousel>
    </SDialog>
    <div class="review-gallery__snap">
      <div class="review-gallery__options">
        <SSegment :model-value="snapMode" :items="snapModeOptions" label="滑动步幅" size="sm"
          @update:model-value="snapMode = $event === 'item' ? 'item' : 'view'" />
        <SSwitch v-model="snapDirection">从右向左分页</SSwitch>
      </div>
      <SCarousel :slides="snapSlides" :slides-per-view="2" :has-snap="carouselPaging" :direction="snapDirection ? 'rtl' : 'ltr'"
        v-bind="galleryLabels" label="按距离吸附轮播">
        <template #slide="{ index, slide }">
          <article class="review-gallery__snap-slide" :style="{ '--palette-base': snapSlides[index].colors[0] }">{{ slide.label }}</article>
        </template>
      </SCarousel>
    </div>
    <CarouselScenariosReview />
  </div>
  <div v-else class="review-empty">
    <SSegment :model-value="emptyScene" :items="emptyScenes" label="空状态场景" size="sm" @update:model-value="setScene" />
    <div ref="emptyView" class="review-empty__view">
      <Transition name="sy-empty-reveal" @before-leave="node => node.setAttribute('inert', '')">
      <SEmptyState
        v-if="!ready" :title="emptyCopy.title" :description="emptyCopy.description" heading="h3"
        :tone="emptyCopy.tone" :appearance="emptyCopy.appearance" :status="emptyScene === 'error' ? 'polite' : undefined"
        :align="emptyScene === 'filter' ? 'center' : 'start'" :size="emptyScene === 'initial' ? 'md' : 'sm'"
      >
        <template v-if="emptyScene === 'filter'" #media><SAvatarGroup :items="people" size="sm" /></template>
        <template #title><SMotionText :value="emptyCopy.title" /></template>
        <template #actions>
          <SButton size="sm" :variant="emptyScene === 'error' ? 'danger' : 'secondary'" :loading="loading" @click="recover">
            <SMotionText :value="emptyCopy.action" />
          </SButton>
        </template>
      </SEmptyState>
      <div v-else class="review-empty__ready">
        <SAvatar v-if="emptyScene === 'filter'" name="林芷" size="sm" />
        <SMotionText :value="ready" announce />
        <SButton size="sm" variant="secondary" @click="ready = undefined">返回</SButton>
      </div>
      </Transition>
    </div>
    <EmptyAlertScenariosReview kind="empty" />
  </div>
</template>
