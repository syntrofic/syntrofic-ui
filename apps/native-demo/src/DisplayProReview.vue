<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'nativescript-vue'
import {
  SNativeBadge, SNativeButton, SNativeCarousel, SNativeEmptyState, SNativeFlipCard, SNativeMotionText,
  SNativeSurface, SNativeText, type NativeCarouselItem, type NativeCollectionKey,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const count = ref(9)
const slides = [
  { id: 'brief', label: '需求简报', shortLabel: '简报', subtitle: '范围和提交清单', tone: 'sage' },
  { id: 'layout', label: '版式样张', shortLabel: '样张', subtitle: 'A4 横排 · 第 2 版', tone: 'blue' },
  { id: 'proof', label: '校对交付稿', shortLabel: '校对', subtitle: '纸张和字距记录', tone: 'base' },
] as const satisfies readonly (NativeCarouselItem & { subtitle: string; tone: 'sage' | 'blue' | 'base' })[]
const slide = ref<NativeCollectionKey>('brief')
const playing = ref(false)
const thumbnails = ref(false)
const slideDetails = computed(() => slides.find(item => item.id === slide.value))
const empty = ref<'no-results' | 'error' | 'initial'>('no-results')
const retrying = ref(false)
const flipped = ref(false)
const checked = ref(false)
let retry: ReturnType<typeof setTimeout> | undefined
const copy = computed(() => ({
  'no-results': { title: '找不到匹配的文件', message: '当前筛选仅显示已冻结的交付稿。' },
  error: { title: '读取文件失败', message: '当前文件列表暂时无法打开。' },
  initial: { title: '文件夹待接收', message: '提交后的交付文件将在这里显示。' },
}[empty.value]))
function recover() {
  if (empty.value !== 'error') { empty.value = 'initial'; return }
  retrying.value = true
  retry = setTimeout(() => { retrying.value = false; empty.value = 'initial' }, 800)
}
onBeforeUnmount(() => clearTimeout(retry))
</script>

<template>
  <StackLayout v-if="id === 'NP.badge'">
    <SNativeSurface :padding="11">
      <GridLayout columns="*,auto" rows="auto,auto">
        <SNativeText text="材料清单" heading verticalAlignment="middle" />
        <SNativeBadge col="1" :count="count" :max="99" accessibilityLabel="待复核文件" announce
          tone="accent" variant="solid" :inset="4">
          <template #anchor>
            <SNativeButton label="复核队列" variant="secondary" size="sm" marginRight="14" marginTop="10" />
          </template>
        </SNativeBadge>
        <GridLayout row="1" columns="auto,auto" marginTop="6">
          <SNativeBadge dot tone="success" verticalAlignment="middle" />
          <SNativeText col="1" text="同步成功" size="caption" tone="muted" marginLeft="6" />
        </GridLayout>
      </GridLayout>
    </SNativeSurface>
    <GridLayout columns="*,*" marginTop="8">
      <SNativeButton label="追加 118 份文件" size="sm" variant="secondary" marginRight="4" @tap="count += 118" />
      <SNativeButton col="1" label="清空待复核" size="sm" variant="secondary" marginLeft="4" @tap="count = 0" />
    </GridLayout>
  </StackLayout>
  <StackLayout v-else-if="id === 'NP.carousel'">
    <SNativeCarousel v-model="slide" v-model:playing="playing" :items="slides" :height="132" :itemsPerView="1.2" :sidePadding="3"
      :gap="9" :indicators="thumbnails ? 'thumbnails' : 'dots'" previousLabel="上一张" nextLabel="下一张"
      startLabel="开启播放" stopLabel="暂停播放" :interval="2900" autoPlay :itemLabel="item => '查看' + item.label">
      <template #default="{ item }">
        <SNativeSurface :tone="slides.find(slide => slide.id === item.id)?.tone" :padding="15" height="132">
          <StackLayout>
            <SNativeText :text="item.label" size="title" heading />
            <SNativeText :text="slides.find(slide => slide.id === item.id)?.subtitle ?? ''" tone="muted" marginTop="8" />
          </StackLayout>
        </SNativeSurface>
      </template>
    </SNativeCarousel>
    <GridLayout columns="*,auto" marginTop="5">
      <SNativeMotionText :value="'当前 ' + slideDetails?.label" verticalAlignment="middle" announce />
      <SNativeButton col="1" label="切换缩略预览" :pressed="thumbnails" size="sm" variant="ghost" @tap="thumbnails = !thumbnails" />
    </GridLayout>
  </StackLayout>
  <StackLayout v-else-if="id === 'NP.empty-state'">
    <SNativeEmptyState :state="empty" :title="copy.title" :description="copy.message"
      :actionLabel="empty === 'error' ? '重新读取' : '重置筛选'" :busy="retrying" announce @action="recover" />
    <GridLayout columns="*,*" marginTop="8">
      <SNativeButton label="显示无结果" size="sm" variant="secondary" marginRight="4" @tap="empty = 'no-results'" />
      <SNativeButton col="1" label="模拟读取失败" size="sm" variant="secondary" marginLeft="4" @tap="empty = 'error'" />
    </GridLayout>
  </StackLayout>
  <StackLayout v-else-if="id === 'NP.flip-card'">
    <SNativeFlipCard v-model="flipped" :height="132" flipLabel="翻转卡片" frontLabel="批次封面" backLabel="复核记录" swipe>
      <template #front>
        <SNativeSurface tone="sage" :padding="13" height="132">
          <StackLayout>
            <SNativeText text="批次封面" heading size="title" />
            <SNativeText text="第 11 批 · 品牌资源库" tone="muted" marginTop="6" />
          </StackLayout>
        </SNativeSurface>
      </template>
      <template #back>
        <SNativeSurface tone="blue" :padding="13" height="132">
          <StackLayout>
            <SNativeText text="复核记录" heading size="title" />
            <SNativeMotionText :value="checked ? '材料已核对' : '材料待核对'" marginTop="3" announce />
            <SNativeButton label="标记已核对" :pressed="checked" size="sm" variant="secondary" marginTop="5" @tap="checked = true" />
          </StackLayout>
        </SNativeSurface>
      </template>
    </SNativeFlipCard>
  </StackLayout>
</template>
