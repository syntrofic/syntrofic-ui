<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'nativescript-vue'
import {
  SNativeAlert, SNativeButton, SNativeCard, SNativeCloseButton, SNativeDescription,
  SNativeFieldError, SNativeFocusGroup, SNativeHeading, SNativeIcon, SNativeItem, SNativeThumbnail, SNativeInput, SNativeLabel, SNativeLinkButton, SNativeMotionText, SNativePressableFeedback,
  SNativeProvider, SNativeSeparator, SNativeSpinner, SNativeSurface, SNativeText, SNativeTextField, SNativeVStack,
  provideNativeIcons, type NativeAppearance,
} from '@syntrofic/ui-native'
import { actionReviews, chartProReviews, collectionReviews, dataProReviews, dateProReviews, displayProReviews, feedbackProReviews, inputProReviews, navigationProReviews, pickerProReviews, reviews, temporalProReviews, type ReviewID } from './review-items'
import ActionReview from './ActionReview.vue'
import InputProReview from './InputProReview.vue'
import PickerProReview from './PickerProReview.vue'
import DateProReview from './DateProReview.vue'
import TemporalProReview from './TemporalProReview.vue'
import NavigationProReview from './NavigationProReview.vue'
import FeedbackProReview from './FeedbackProReview.vue'
import DisplayProReview from './DisplayProReview.vue'
import DataProReview from './DataProReview.vue'
import ChartProReview from './ChartProReview.vue'
import FormReview from './FormReview.vue'
import CollectionReview from './CollectionReview.vue'
import SliderReview from './SliderReview.vue'
import OverlayReview from './OverlayReview.vue'
import ToastReview from './ToastReview.vue'
import BottomSheetReview from './BottomSheetReview.vue'
import ChoiceOverlayReview from './ChoiceOverlayReview.vue'
import MaterialReview from './MaterialReview.vue'

provideNativeIcons({ 'review:archive': { glyph: '▤', variants: { filled: '▣' } } })

const props = defineProps<{ id: ReviewID }>()
const item = computed(() => reviews.find(example => example.id === props.id)!)
const title = computed(() => `${item.value.number} ${item.value.label}`)
const collection = computed(() => collectionReviews.some(example => example.id === props.id))
const action = computed(() => actionReviews.some(example => example.id === props.id))
const inputPro = computed(() => inputProReviews.some(example => example.id === props.id))
const pickerPro = computed(() => pickerProReviews.some(example => example.id === props.id))
const datePro = computed(() => dateProReviews.some(example => example.id === props.id))
const temporalPro = computed(() => temporalProReviews.some(example => example.id === props.id))
const navigationPro = computed(() => navigationProReviews.some(example => example.id === props.id))
const feedbackPro = computed(() => feedbackProReviews.some(example => example.id === props.id))
const displayPro = computed(() => displayProReviews.some(example => example.id === props.id))
const dataPro = computed(() => dataProReviews.some(example => example.id === props.id))
const chartPro = computed(() => chartProReviews.some(example => example.id === props.id))
const choiceOverlay = computed(() => ['N.popover', 'N.menu', 'N.select', 'N.export.sub-menu'].includes(props.id))
const material = computed(() => ['N.export.glass-view', 'N.export.theme-background'].includes(props.id))
const appearance = ref<NativeAppearance | 'system'>('light')
const reduced = ref(false)
const name = ref('')
const email = ref('')
const saving = ref(false)
const count = ref(12)
const saved = ref(false)
const field = useTemplateRef<InstanceType<typeof SNativeTextField>>('field')
const plainInput = useTemplateRef<InstanceType<typeof SNativeInput>>('plainInput')
let job: ReturnType<typeof setTimeout> | undefined

function save() {
  if (saving.value) return
  saving.value = true
  job = setTimeout(() => {
    saving.value = false
    count.value++
  }, 1400)
}

function validateEmail(text: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return '请输入有效的邮箱地址。'
}

function submit() {
  saved.value = field.value?.check() ?? false
  if (!saved.value) field.value?.focus()
}

onBeforeUnmount(() => { if (job) clearTimeout(job) })
</script>

<template>
  <Page>
    <ActionBar>
      <SNativeText :text="title" size="title" heading verticalAlignment="middle" />
    </ActionBar>
    <SNativeProvider :appearance="appearance" :motion="reduced ? 'reduced' : 'system'">
      <ToastReview v-if="id === 'N.toast'" />
      <component v-else :is="id === 'N.scroll-shadow' ? 'ContentView' : 'ScrollView'">
        <StackLayout padding="16">
          <GridLayout columns="*,*,*" marginBottom="12">
            <SNativeButton col="0" label="浅色" size="sm" variant="ghost" :pressed="appearance === 'light'" fullWidth @tap="appearance = 'light'" />
            <SNativeButton col="1" label="深色" size="sm" variant="ghost" :pressed="appearance === 'dark'" fullWidth @tap="appearance = 'dark'" />
            <SNativeButton col="2" label="减少动效" size="sm" variant="ghost" :pressed="reduced" fullWidth @tap="reduced = !reduced" />
          </GridLayout>

          <StackLayout v-if="id === 'N.button'">
            <SNativeButton label="保存项目" :loading="saving" loadingLabel="正在保存" @tap="save" />
            <SNativeMotionText :value="`${count}`" :reserve="3" marginTop="8" announce />
            <SNativeButton label="取消" variant="secondary" size="sm" marginTop="8" />
            <SNativeButton label="归档项目" variant="danger" marginTop="8" disabled />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.icon'" orientation="horizontal">
            <SNativeIcon name="check" label="已完成" color="success" marginRight="10" />
            <SNativeIcon name="search" label="搜索" color="secondary" size="sm" marginRight="10" />
            <SNativeIcon name="review:archive" variant="filled" label="已归档" color="accent" size="lg" marginRight="10" />
            <SNativeIcon name="chevron" label="下一页" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.item'">
            <SNativeItem label="交付资料" description="待评审" density="compact" layout="inline" interactive :selected="saved" @activate="saved = !saved">
              <template #marker><SNativeText text="1." size="caption" tone="muted" marginRight="6" /></template>
              <template #start><SNativeIcon name="check" /></template>
              <template #end><SNativeButton label="详情" size="sm" variant="ghost" @tap="count++" /></template>
            </SNativeItem>
            <SNativeItem label="项目归档" description="仅项目负责人可访问" density="spacious" interactive disabled />
            <SNativeText :text="`详情打开 ${count} 次`" tone="muted" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.thumbnail'">
            <SNativeThumbnail v-if="!saved" label="文件预览" removeLabel="移除文件预览" :loading="saving" actionable removable
              @tap="save" @remove="saved = true" />
            <SNativeButton v-else label="恢复文件预览" @tap="saved = false" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.close-button'">
            <SNativeSurface tone="muted" :padding="9">
              <GridLayout columns="*,auto">
                <SNativeText :text="saved ? '已关闭提示' : '同步完成'" verticalAlignment="middle" />
                <SNativeCloseButton col="1" label="关闭同步提示" :disabled="saved" @tap="saved = true" />
              </GridLayout>
            </SNativeSurface>
          </StackLayout>
          <SNativeLinkButton
            v-else-if="id === 'N.link-button'"
            label="查看项目文档"
            href="https://kb.syntrofic.com/?id=20261120144442-j5v9ov3"
            variant="secondary"
          />
          <SNativePressableFeedback
            v-else-if="id === 'N.pressable-feedback'"
            label="标记已处理"
            :pressed="saved"
            horizontalAlignment="left"
            @tap="saved = !saved"
          >
            <SNativeText text="标记已处理" emphasized verticalAlignment="middle" />
          </SNativePressableFeedback>
          <SNativeFocusGroup v-else-if="id === 'N.input'">
            <SNativeInput v-model="name" label="项目名称" placeholder="输入项目名称" returnKeyType="next" />
            <SNativeInput v-model="email" label="通知邮箱" placeholder="name@example.com" keyboardType="email" returnKeyType="done" marginTop="8" />
          </SNativeFocusGroup>
          <StackLayout v-else-if="id === 'N.text-field'">
            <SNativeTextField
              ref="field"
              v-model="email"
              label="通知邮箱"
              placeholder="name@example.com"
              description="发布完成后发送通知。"
              required
              requiredLabel="必填"
              requiredMessage="请输入通知邮箱。"
              keyboardType="email"
              autofillType="email"
              returnKeyType="done"
              :autocorrect="false"
              :validate="validateEmail"
              @submit="saved = true"
            />
            <SNativeButton label="保存设置" size="sm" marginTop="8" @tap="submit" />
            <SNativeText :text="saved ? '设置已保存' : ''" tone="success" minHeight="24" marginTop="4" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.label'">
            <SNativeLabel text="项目名称" required requiredLabel="必填" @tap="plainInput?.focus()" />
            <SNativeInput ref="plainInput" v-model="name" label="项目名称" placeholder="输入项目名称" marginTop="4" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.description'">
            <SNativeInput v-model="name" label="项目名称" hint="此名称会显示在项目列表中。" placeholder="品牌资源库" />
            <SNativeDescription text="此名称会显示在项目列表中。" marginTop="4" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.field-error'">
            <SNativeInput v-model="email" label="通知邮箱" hint="请输入有效的邮箱地址。" keyboardType="email" invalid />
            <SNativeFieldError text="请输入有效的邮箱地址。" marginTop="4" />
          </StackLayout>
          <StackLayout v-else-if="id === 'N.text'">
            <SNativeHeading text="品牌资源库" :level="1" />
            <SNativeText text="交付前可在这里核对最新资源。" marginTop="4" />
            <StackLayout orientation="horizontal" marginTop="4">
              <SNativeDescription text="已整理" marginRight="6" verticalAlignment="middle" />
              <SNativeMotionText :value="String(count)" :reserve="3" announce />
            </StackLayout>
            <SNativeButton label="增加一项" variant="secondary" size="sm" marginTop="8" @tap="count++" />
          </StackLayout>
          <SNativeVStack v-else-if="id === 'N.surface'" align="stretch" :gap="8">
            <SNativeSurface tone="sage"><SNativeText text="待发布" emphasized /></SNativeSurface>
            <SNativeSurface tone="blue"><SNativeText text="待校对" emphasized /></SNativeSurface>
            <SNativeSurface tone="muted"><SNativeText text="已归档" emphasized /></SNativeSurface>
          </SNativeVStack>
          <SNativeSurface v-else-if="id === 'N.separator'">
            <SNativeText text="品牌资源库" emphasized />
            <SNativeSeparator marginTop="10" marginBottom="10" />
            <SNativeText text="交付文稿" emphasized />
          </SNativeSurface>
          <SNativeCard v-else-if="id === 'N.card'" title="品牌资源库">
            <SNativeText text="12 份素材 · 3 份规范" />
            <template #footer>
              <SNativeButton label="同步项目" size="sm" :loading="saving" loadingLabel="正在同步" @tap="save" />
            </template>
          </SNativeCard>
          <SNativeSurface v-else-if="id === 'N.spinner'" tone="muted">
            <StackLayout orientation="horizontal">
              <SNativeSpinner :size="20" label="正在同步" marginRight="8" />
              <SNativeText text="正在同步" verticalAlignment="middle" />
            </StackLayout>
          </SNativeSurface>
          <StackLayout v-else-if="id === 'N.alert'">
            <SNativeAlert title="同步完成" description="品牌资源库已更新。" tone="success" />
            <SNativeAlert title="发布前需要核对" description="两个素材的授权将在本周到期。" tone="warning" marginTop="8">
              <SNativeButton label="标记已读" variant="ghost" size="sm" :pressed="saved" @tap="saved = true" />
            </SNativeAlert>
          </StackLayout>
          <SliderReview v-else-if="id === 'N.slider'" />
          <OverlayReview v-else-if="id === 'N.dialog'" :id="id" />
          <BottomSheetReview v-else-if="id === 'N.bottom-sheet'" />
          <ChoiceOverlayReview v-else-if="choiceOverlay" :id="id" />
          <MaterialReview v-else-if="material" :id="id" />
          <CollectionReview v-else-if="collection" :id="id" />
          <ActionReview v-else-if="action" :id="id" />
          <InputProReview v-else-if="inputPro" :id="id" />
          <PickerProReview v-else-if="pickerPro" :id="id" />
          <DateProReview v-else-if="datePro" :id="id" />
          <TemporalProReview v-else-if="temporalPro" :id="id" />
          <NavigationProReview v-else-if="navigationPro" :id="id" />
          <FeedbackProReview v-else-if="feedbackPro" :id="id" />
          <DisplayProReview v-else-if="displayPro" :id="id" />
          <DataProReview v-else-if="dataPro" :id="id" />
          <ChartProReview v-else-if="chartPro" :id="id" />
          <FormReview v-else :id="id" />
        </StackLayout>
      </component>
    </SNativeProvider>
  </Page>
</template>
