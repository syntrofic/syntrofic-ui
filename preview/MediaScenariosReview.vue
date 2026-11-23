<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import {
  SAspectRatio, SBadge, SButton, SIcon, SImage, SLightbox, SMediaTheme, SMotionText,
  SOverlay, SSkeleton, SSwitch, useLightbox, useOverlay,
} from '../src'
import type { LightboxMedia } from '../src'
import deliveryArea from './assets/delivery-area.png'
import linPortrait from './assets/profile-lin.jpg'
import chenPortrait from './assets/profile-chen.jpg'

defineProps<{ kind: 'aspect' | 'overlay' | 'lightbox' }>()
const photos = [
  { id: 'lin', src: linPortrait, alt: '浅绿色背景的林舟肖像', caption: '林舟 · 设计' },
  { id: 'chen', src: chenPortrait, alt: '深蓝色背景的陈远肖像', caption: '陈远 · 工程' },
  { id: 'area', src: deliveryArea, alt: '每日交付量面积图', caption: '交付量趋势' },
]
const proportions = [
  { label: '1 : 1', ratio: 1, image: photos[0]! },
  { label: '4 : 3', ratio: 4 / 3, image: photos[1]! },
  { label: '16 : 9', ratio: 16 / 9, image: photos[2]! },
]
const blockImage = ref(true)
const failImage = ref(false)
const uploadSource = computed(() => failImage.value ? 'data:image/jpeg;base64,AA==' : chenPortrait)
const replacementPhotos = [
  { src: linPortrait + '?view=image-switch-portrait', alt: '交付成员照片', label: '载入成员照片' },
  { src: deliveryArea + '?view=image-switch-plan', alt: '配送范围图', label: '载入配送范围图' },
  { src: chenPortrait + '?view=image-switch-team', alt: '工程成员照片', label: '载入工程照片' },
  { src: 'data:image/jpeg;base64,AA==', alt: '未能读取的交付照片', label: '模拟替换失败' },
] as const
const replacement = ref<(typeof replacementPhotos)[number]>(replacementPhotos[0])
const replacementStatus = ref('正在加载照片')
function replacePhoto(photo: (typeof replacementPhotos)[number]) {
  if (replacement.value === photo) return
  replacement.value = photo
  replacementStatus.value = '正在加载照片'
}
const areaCaption = '这张面积图对照一周内两类资料的每日交付量。横轴从周一到周日，绿线表示使用规范，蓝线表示源文件。源文件从周三到周五增长，周六略有回落，周日达到一周最高。使用规范在周四接近 40，周五和周六略低，周日回升。'
const gallery: LightboxMedia[] = photos.map(item => ({
  ...item, src: item.src + '?view=gallery',
  caption: item.id === 'area' ? areaCaption : item.caption,
}))
const galleryLabels = {
  loadingLabel: '正在加载媒体', errorLabel: '无法加载当前媒体。', retryLabel: '重试加载',
  closeLabel: '关闭项目图集', previousLabel: '上一张项目照片', nextLabel: '下一张项目照片',
  zoomInLabel: '放大项目照片', zoomOutLabel: '缩小项目照片', captionLabel: '图片说明',
  expandCaptionLabel: '查看完整说明', collapseCaptionLabel: '收起说明',
}
const zoomGallery = useLightbox({ media: gallery, label: '项目照片图集', fullscreen: true, ...galleryLabels })
const overlayMessage = ref('')
const scrims = [
  { value: 'dark', photo: photos[0]!, label: '团队成员', action: '查看成员资料' },
  { value: 'light', photo: photos[1]!, label: '交付评审', action: '查看评审资料' },
] as const
const ProductOverlay = defineComponent({
  setup() {
    const { containerRef, containerProps, renderOverlay } = useOverlay({
      showOn: 'hover-or-focus', position: 'bottom', align: 'end', scrim: 'dark', delay: 100,
    })
    return () => h('article', {
      ...containerProps, ref: containerRef, class: [containerProps.class, 'media-review__frame', 'media-review__strip'],
      role: 'region', 'aria-label': '图层工具示例', tabindex: 0,
    }, [
      h(SAspectRatio, { ratio: 16 / 9, fit: 'cover' }, { default: () => h('img', { src: deliveryArea, alt: '交付区域细节' }) }),
      renderOverlay(h(SMediaTheme, { mode: 'dark' }, { default: () => h(SButton, {
        size: 'sm', variant: 'secondary', onClick: () => { overlayMessage.value = '已添加交付区域图' },
      }, { default: () => '添加到交付清单' }) })),
    ])
  },
})
</script>

<template>
  <div v-if="kind === 'aspect'" class="media-review">
    <section class="media-review__ratios" aria-label="等高比例对照">
      <figure v-for="item in proportions" :key="item.label" :style="{ inlineSize: `min(100%, ${Math.round(90 * item.ratio)}px)` }">
        <SAspectRatio :ratio="item.ratio" fit="cover" class="media-review__frame">
          <img :src="item.image.src" :alt="item.image.alt">
        </SAspectRatio>
        <figcaption>{{ item.label }}</figcaption>
      </figure>
      <figure class="media-review__circle">
        <SAspectRatio :ratio="1" shape="ellipse" fit="cover">
          <img :src="linPortrait" alt="圆形裁切的林舟肖像">
        </SAspectRatio>
        <figcaption>圆形裁切</figcaption>
      </figure>
    </section>
    <section class="media-review__grid" aria-label="统一比例图集">
      <figure v-for="item in photos" :key="item.id">
        <SAspectRatio :ratio="4 / 3" fit="cover" class="media-review__frame">
          <img :src="item.src" :alt="item.alt">
        </SAspectRatio>
        <figcaption>{{ item.caption }}</figcaption>
      </figure>
    </section>
    <section class="media-review" aria-label="照片加载占位">
      <div class="review__row">
        <SSwitch v-model="blockImage">显示骨架占位</SSwitch>
        <SSwitch v-model="failImage">模拟图片不可用</SSwitch>
      </div>
      <SAspectRatio :ratio="4 / 3" fit="contain" class="media-review__frame media-review__loading-frame">
        <SSkeleton :loading="blockImage" class="media-review__fill" radius="none">
          <SImage :src="uploadSource" alt="工程资料肖像" :ratio="4 / 3" placeholder loading="eager" />
        </SSkeleton>
      </SAspectRatio>
    </section>
    <section class="media-review" aria-label="照片替换预览">
      <div class="review__row">
        <SButton v-for="photo in replacementPhotos" :key="photo.src" variant="secondary" size="sm" @click="replacePhoto(photo)">
          {{ photo.label }}
        </SButton>
      </div>
      <SImage class="media-review__replacement" :src="replacement.src" :alt="replacement.alt" placeholder loading="eager"
        @load="replacementStatus = '照片已更新'" @error="replacementStatus = '无法读取照片'" />
      <output class="media-review__status"><SMotionText :value="replacementStatus" /></output>
    </section>
  </div>

  <div v-else-if="kind === 'lightbox'" class="media-review">
    <section class="media-review__grid" aria-label="从任意缩略图开始浏览">
      <button v-for="(photo, position) in photos" :key="photo.id" type="button" class="media-review__opener"
        :aria-label="`预览${photo.caption}`" v-bind="zoomGallery.getTriggerProps(position)">
        <SAspectRatio :ratio="4 / 3" class="media-review__frame" fit="cover">
          <img :src="photo.src" loading="lazy" alt="">
        </SAspectRatio>
        <span>{{ photo.caption }}</span>
      </button>
    </section>
    <component :is="zoomGallery.element" />
    <SLightbox :media="gallery[2]!" label="单张图表" v-bind="galleryLabels">
      <template #trigger="{ open: show }">
        <SButton size="sm" variant="secondary" aria-haspopup="dialog" @click="show()">单张预览</SButton>
      </template>
    </SLightbox>
  </div>

  <div v-else class="media-review">
    <section class="media-review__grid" aria-label="亮暗媒体蒙层">
      <SOverlay v-for="theme in scrims" :key="theme.value" :scrim="theme.value" position="bottom" class="media-review__frame media-review__strip">
        <SAspectRatio :ratio="4 / 3" fit="cover"><img :src="theme.photo.src" :alt="theme.photo.alt"></SAspectRatio>
        <template #overlay>
          <SMediaTheme :mode="theme.value">
            <div class="media-review__overlay-actions">
              <SIcon name="image" size="sm" /><strong>{{ theme.label }}</strong><SBadge tone="accent">开放</SBadge>
              <SButton size="sm" variant="ghost" @click="overlayMessage = `已打开${theme.label}`">{{ theme.action }}</SButton>
            </div>
          </SMediaTheme>
        </template>
      </SOverlay>
    </section>
    <div class="media-review__grid">
      <SOverlay align="center" position="full" class="media-review__frame media-review__center">
        <SAspectRatio :ratio="16 / 9" fit="cover"><img :src="deliveryArea" alt="配送范围"></SAspectRatio>
        <template #overlay>
          <SMediaTheme mode="dark">
            <SButton size="sm" variant="secondary" @click="overlayMessage = '已确认配送范围'">确认配送范围</SButton>
          </SMediaTheme>
        </template>
      </SOverlay>
      <ProductOverlay />
    </div>
    <SMotionText v-if="overlayMessage" :value="overlayMessage" announce />
  </div>
</template>

<style scoped>
.media-review { display: grid; min-inline-size: 0; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); }
.media-review__grid { display: grid; min-inline-size: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: var(--sy-space-2); }
.media-review__grid > * { min-inline-size: 0; }
.media-review__ratios { display: flex; flex-wrap: wrap; gap: var(--sy-space-2); }
.media-review :is(figure, figcaption) { margin: 0; }
.media-review :is(figcaption, .media-review__opener > span) { padding-block-start: .35rem; color: var(--sy-text-muted); font-size: .8rem; }
.media-review__circle { inline-size: 90px; }
.media-review__frame { border-radius: var(--sy-radius-sm); overflow: clip; background: var(--sy-surface-muted); }
.media-review__loading-frame { inline-size: min(100%, 18rem); }
.media-review__replacement { inline-size: min(100%, 18rem); }
.media-review__replacement :deep(img), .media-review__replacement :deep(.sy-image__fallback) { inline-size: 100%; }
.media-review__status { color: var(--sy-text-muted); font-size: .875rem; }
.media-review__fill, .media-review__fill :deep(.sy-skeleton__content), .media-review__fill :deep(.sy-image),
.media-review__fill :deep(.sy-image > *) { block-size: 100%; inline-size: 100%; border-radius: 0; }
.media-review__opener { border: 0; padding: 0; background: transparent; font: inherit; text-align: start; cursor: pointer; min-inline-size: 0; }
.media-review__opener > span { display: block; }
.media-review__opener:focus-visible, .media-review__strip:focus-visible { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.media-review__overlay-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-1); }
.media-review__strip :deep(.sy-overlay__content[data-scrim='dark']) { background: linear-gradient(transparent, rgb(17 23 20 / 90%) 45%); }
.media-review__strip :deep(.sy-overlay__content[data-scrim='light']) { background: linear-gradient(transparent, rgb(255 255 255 / 91%) 45%); }
.media-review__center :deep(.sy-overlay__content) { place-items: center; }
</style>
