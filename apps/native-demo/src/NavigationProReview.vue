<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import {
  SNativeButton, SNativeDescription, SNativeMorphTabs, SNativeMotionText, SNativeSegment, SNativeSplitView,
  SNativeStepper, SNativeSurface, SNativeSwipeableTabs, SNativeText,
  type NativeCollectionKey, type NativeStepItem, type NativeTabItem,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const morph = useTemplateRef<InstanceType<typeof SNativeMorphTabs>>('morph')
const page = useTemplateRef<InstanceType<typeof SNativeSwipeableTabs>>('page')
const split = useTemplateRef<InstanceType<typeof SNativeSplitView>>('split')
const steps = useTemplateRef<InstanceType<typeof SNativeStepper>>('steps')
const morphItems = [
  { id: 'summary', label: '项目总览', shortLabel: '总览' },
  { id: 'materials', label: '交付文件', shortLabel: '文件' },
  { id: 'notes', label: '复核批注', shortLabel: '批注' },
] satisfies NativeTabItem[]
const segments = [
  { id: 'all', label: '全部' }, { id: 'flagged', label: '重点' }, { id: 'locked', label: '锁定', disabled: true },
] satisfies NativeTabItem[]
const portfolio = [
  { id: 'intake', label: '新接收材料' }, { id: 'working', label: '正在整理' }, { id: 'reviewing', label: '等待复核' },
  { id: 'preparation', label: '正在归档' }, { id: 'history', label: '历史归档' },
] satisfies NativeTabItem[]
const stepItems = [
  { id: 'receive', label: '接收', description: '核对交付材料' },
  { id: 'verify', label: '复核', description: '检查文件与说明' },
  { id: 'archive', label: '归档', description: '保存确认版本' },
  { id: 'send', label: '外发', description: '权限尚未开通', disabled: true },
] satisfies NativeStepItem[]
const swipeItems = [
  { id: 'brief', label: '交付说明' },
  { id: 'assets', label: '文件与素材' },
  { id: 'locked', label: '冻结页', disabled: true },
  { id: 'delivery', label: '确认归档' },
] satisfies NativeTabItem[]
const docs = ['说明摘要', '文件摘要', '字体授权', '版本记录', '复核结论', '附录链接', '归档说明']
const morphKey = ref<NativeCollectionKey>('summary')
const segment = ref<NativeCollectionKey>('all')
const records = ref<NativeCollectionKey>('intake')
const selectedPane = ref('设计稿')
const snap = ref(1)
const stepKey = ref<NativeCollectionKey>('receive')
const completed = ref<NativeCollectionKey[]>([])
const horizontal = ref(false)
const pageKey = ref<NativeCollectionKey>('brief')
const activeMorph = computed(() => morphItems.find(item => item.id === morphKey.value)?.label ?? '')
const activeStep = computed(() => stepItems.find(item => item.id === stepKey.value)?.label ?? '')
const title = computed(() => swipeItems.find(item => item.id === pageKey.value)?.label ?? '')
</script>

<template>
  <StackLayout v-if="id === 'NP.morph-tabs'">
    <SNativeMorphTabs ref="morph" v-model="morphKey" :items="morphItems" label="项目分区" :pager-height="176">
      <template #default="{ item }">
        <SNativeSurface tone="blue" :padding="10" height="176">
          <StackLayout>
            <SNativeText :text="item.id === 'summary' ? '总览内容' : item.id === 'materials' ? '文件内容' : '批注内容'" heading />
            <SNativeDescription :text="item.id === 'summary' ? '交付批次及复核状态' : item.id === 'materials' ? '版本记录及源文件' : '待解决的复核意见'" marginTop="5" />
          </StackLayout>
        </SNativeSurface>
      </template>
    </SNativeMorphTabs>
    <SNativeMotionText :value="`当前 ${activeMorph}`" announce marginTop="7" />
    <SNativeButton label="返回项目总览" size="sm" variant="secondary" marginTop="6" @tap="morph?.goTo('summary')" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.segment'">
    <SNativeSegment v-model="segment" :items="segments" label="材料筛选" separators />
    <SNativeMotionText :value="`正在查看 ${segments.find(item => item.id === segment)?.label}`" announce marginTop="7" />
    <SNativeSegment v-model="records" :items="portfolio" label="归档状态" separators scrollable marginTop="15" />
    <SNativeButton label="定位到历史归档" size="sm" variant="secondary" marginTop="7" @tap="records = 'history'" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.split-view'">
    <SNativeSplitView ref="split" v-model:snap-index="snap" label="调整分栏" :height="362"
      :snap-points="[86, .46, .73]" :min-first="65" :min-second="80">
      <template #first>
        <SNativeSurface tone="muted" :padding="8" verticalAlignment="stretch">
          <ScrollView>
            <StackLayout>
              <SNativeText text="交付材料" heading marginBottom="4" />
              <SNativeButton label="设计稿" :pressed="selectedPane === '设计稿'" variant="ghost" size="sm" fullWidth
                @tap="selectedPane = '设计稿'" />
              <SNativeButton label="交付说明" :pressed="selectedPane === '交付说明'" variant="ghost" size="sm" fullWidth
                @tap="selectedPane = '交付说明'" />
            </StackLayout>
          </ScrollView>
        </SNativeSurface>
      </template>
      <template #second>
        <SNativeSurface tone="sage" :padding="9" verticalAlignment="stretch">
          <ScrollView>
            <StackLayout>
              <SNativeMotionText :value="`详情 ${selectedPane}`" announce />
              <SNativeDescription :text="selectedPane === '设计稿' ? '矢量文件与导出图' : '交付范围和版权说明'" marginTop="5" />
              <SNativeButton label="回到材料列表" size="sm" variant="ghost" marginTop="4" @tap="split?.snapTo(2)" />
            </StackLayout>
          </ScrollView>
        </SNativeSurface>
      </template>
    </SNativeSplitView>
    <SNativeMotionText :value="`停在 ${snap + 1} / 3`" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.stepper'">
    <SNativeStepper ref="steps" v-model="stepKey" v-model:completed="completed" :items="stepItems" label="归档步骤" linear
      :orientation="horizontal ? 'horizontal' : 'vertical'" current-label="当前步骤" complete-label="已完成"
      pending-label="待处理" unavailable-label="暂不可达" />
    <SNativeMotionText :value="`当前 ${activeStep}`" announce marginTop="6" />
    <GridLayout columns="*,*" marginTop="5">
      <SNativeButton label="上一步" variant="secondary" size="sm" fullWidth @tap="steps?.previous()" />
      <SNativeButton col="1" label="完成本步" size="sm" fullWidth marginLeft="4" @tap="steps?.next()" />
    </GridLayout>
    <SNativeButton :label="horizontal ? '显示纵向' : '显示横向'" size="sm" variant="ghost" marginTop="4" @tap="horizontal = !horizontal" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.swipeable-tabs'">
    <SNativeSwipeableTabs ref="page" v-model="pageKey" :items="swipeItems" label="交付条目" variant="line" scrollable
      scroll-align="visible" :pager-height="209" separators>
      <template #default="{ item }">
        <SNativeSurface tone="muted" :padding="8" height="209">
          <ScrollView orientation="vertical" :scroll-bar-indicator-visible="false">
            <StackLayout>
              <SNativeText :text="`${item.label}内容`" heading marginBottom="5" />
              <SNativeSurface v-for="(entry, index) in docs" :key="entry" :tone="index % 2 ? 'plain' : 'base'"
                :padding="8" :radius="0" height="39">
                <SNativeText :text="entry" />
              </SNativeSurface>
            </StackLayout>
          </ScrollView>
        </SNativeSurface>
      </template>
    </SNativeSwipeableTabs>
    <SNativeMotionText :value="`当前 ${title}`" announce marginTop="6" />
    <SNativeButton label="跳到确认归档" variant="secondary" size="sm" marginTop="5" @tap="page?.goTo('delivery')" />
  </StackLayout>
</template>
