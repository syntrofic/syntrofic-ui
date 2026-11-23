<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { SCourseDetail, SDateField, SImage, SProductDetail, SSelect, STokenizer, SWorkItemDetail } from '../src'
import { parseCalendarDate as parseDate, type DateValue } from '../src'
import type { CommentThread, CourseDetail, CourseSession, ProductVariant, WorkItemActivity, WorkItemData } from '../src'
import deliveryArea from '../preview/assets/delivery-area.png'
import PaymentFormTemplate from './PaymentFormTemplate.vue'

defineProps<{ kind: string }>()
const action = ref('')
const assets = [
  { id: 'overview', title: '园区全图', src: deliveryArea, alt: '交付园区地图', caption: '园区总览及主要交付点' },
  { id: 'guide', title: '路线索引', src: deliveryArea, alt: '交付路线图', caption: '路线索引和到达方式' },
]
const variants = [
  { id: 'folded', label: '折页版', price: 48, stock: 10, swatch: '#b9c1ae', image: 'overview' },
  { id: 'desk', label: '桌面版', price: 68, stock: 3, swatch: '#b9bfc9', image: 'guide' },
  { id: 'poster', label: '展陈版', price: 128, stock: 0, swatch: '#c7bdae' },
] satisfies ProductVariant[]
const specifications = [
  { id: 'paper', title: '材质与尺寸', description: '采用哑光纸。折页版展开为 A3，桌面版为 A4。' },
  { id: 'delivery', title: '交付信息', description: '地图包括主要建筑、服务点和访客路线。' },
]
const course: CourseDetail = {
  title: '把组件库接进交付流程',
  summary: '面向设计师与前端工程师的实践课程，包含主题、可访问交互与验收。',
  description: '从整理设计变量开始，为两个关键页面组合基础组件，再用键盘与移动端场景验收。',
  hours: 22, price: 320, currency: 'CNY', skills: ['主题变量', 'Vue 组件', '可访问交互'],
  facts: [{ id: 'duration', label: '课时', value: '22 小时' }, { id: 'modules', label: '课程模块', value: '3 个' },
    { id: 'level', label: '适用人群', value: '设计师与前端工程师' }],
  instructor: { name: '林舟', description: '负责团队的 UI 基础设施和交付规范。' },
  modules: [
    { id: 'tokens', title: '建立设计变量', lessons: ['从现有界面拆分颜色与间距', '配置深浅配色'] },
    { id: 'forms', title: '设计可提交的表单', lessons: ['组合输入与校验', '减少动效与键盘测试'] },
    { id: 'review', title: '验收交付', lessons: ['检查移动端布局', '核对空状态和按钮权限'] },
  ],
  sessions: [
    { id: 'solo', label: '自定进度 · 11 月 22 日开始', start: '2026-11-22' },
    { id: 'group', label: '协作小组 · 12 月 1 日开始', start: '2026-12-01' },
  ],
  reviews: [{ id: 'review-1', name: '方宁', rating: 4.8, text: '跟着练习完成了两种主题，验收步骤也能复用到下一次交付。' }],
  aspects: [{ id: 'practice', label: '练习实用性', rating: 4.8 }, { id: 'clarity', label: '讲解清晰度', rating: 4.6 }],
  questions: [{ id: 'skills', question: '需要提前熟悉 Vue 吗？', answer: '了解 HTML 和 CSS 即可先完成设计部分。组件示例包含可运行代码。' }],
}
const item = ref<WorkItemData>({
  id: 'publish', title: '发布团队交付指南', status: 'review',
  description: '整理团队接入步骤和上线核对清单，邀请设计与工程负责人查看。',
  subtasks: [{ id: 'api', title: '梳理组件接入步骤', done: true }, { id: 'accessibility', title: '补充键盘验收', done: false },
    { id: 'publish', title: '确认发布链接', done: false }],
  attachments: [{ id: 'draft', name: '交付指南草稿', detail: '文档', href: '/docs/standard-design/' }],
  links: [{ id: 'start', title: 'Vue 接入指南', href: '/docs/quick-start/' }, { id: 'catalog', title: '标准设计对标', href: '/docs/standard-design/' }],
})
const statuses = [{ value: 'review', label: '评审中' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }]
const owners = [{ value: 'lin', label: '林舟' }, { value: 'fang', label: '方宁' }, { value: 'zhou', label: '周昱' }]
const tags = [{ value: 'guide', label: '指南' }, { value: 'review', label: '待发布' }, { value: 'accessibility', label: '可访问性' }]
const owner = ref('lin')
const due = shallowRef<DateValue>(parseDate('2026-11-27'))
const selectedTags = ref(['guide'])
const threads = ref<CommentThread[]>([{ id: 'note', label: '接入步骤', messages: [{ id: 'first', author: '方宁', text: '希望补充窄屏下的菜单行为。' }] }])
const activity = ref<WorkItemActivity[]>([{ id: 'created', title: '林舟建立了交付事项', time: '2026-11-21T09:30:00+08:00' }])
let sequence = 0
function record(title: string) {
  const id = String(++sequence)
  activity.value = [...activity.value, { id, title, time: new Date() }]
  return id
}
watch(() => item.value.status, status => record('状态更新为' + statuses.find(option => option.value === status)?.label))
function attach(files: readonly File[]) {
  const additions = files.map(file => ({ id: record('附加了' + file.name), name: file.name, detail: Math.ceil(file.size / 1024) + ' KB' }))
  item.value = { ...item.value, attachments: [...item.value.attachments ?? [], ...additions] }
}
function addComment(text: string) {
  const id = record('添加了评论')
  threads.value = [...threads.value, { id, label: '交付讨论', messages: [{ id, author: '我', text }] }]
}
function reply(thread: CommentThread, text: string) {
  const id = record('回复了评论')
  threads.value = threads.value.map(item => item.id === thread.id ? { ...item, messages: [...item.messages, { id, author: '我', text }] } : item)
}
function resolve(thread: CommentThread, done: boolean) {
  record(done ? '已解决讨论' : '重新打开讨论')
  threads.value = threads.value.map(item => item.id === thread.id ? { ...item, resolved: done } : item)
}

function added({ variant, quantity }: { variant: ProductVariant; quantity: number }) {
  action.value = `已将 ${quantity} 件${variant.label}加入演示订单。`
}
function enrolled(selection: { session: CourseSession; weeklyHours: number; estimatedFinish: Date }) {
  action.value = '已选择' + selection.session.label + '，每周 ' + selection.weeklyHours + ' 小时。'
}
</script>

<template>
  <SProductDetail v-if="kind === 'product-detail'" title="交付园区地图" description="帮助项目成员与访客定位交付点、服务窗口和主要通道。"
    :assets="assets" :variants="variants" :specifications="specifications" currency="CNY" locale="zh-CN" :rating="4.8" :rating-count="23"
    :labels="{ variants: '版本', quantity: '数量', view: '放大查看', previous: '上一张', next: '下一张', close: '关闭',
      add: '加入订单', save: '收藏', saved: '已收藏', unavailable: '暂时无货', rating: '评分', specifications: '产品信息' }" @add="added" />
  <SCourseDetail v-else-if="kind === 'course-detail'" :course="course" locale="zh-CN"
    :labels="{ about: '课程介绍', syllabus: '课程大纲', instructor: '授课人', reviews: '学员评价', faq: '常见问题',
      session: '开始时间', pace: '每周学习时长', hours: '小时', finish: '预计学完', enroll: '选择课程', facts: '课程信息' }" @enroll="enrolled">
    <template #media><SImage :src="deliveryArea" alt="课程示例中的交付园区地图" :ratio="4 / 3" placeholder /></template>
  </SCourseDetail>
  <PaymentFormTemplate v-else-if="kind === 'payment-form'" />
  <SWorkItemDetail v-else v-model="item" :statuses="statuses" :threads="threads" :activity="activity" locale="zh-CN"
    :labels="{ status: '状态', description: '事项描述', change: '编辑描述', save: '保存', cancel: '取消', checklist: '子任务', attachments: '附件',
      properties: '事项详情', activity: '变更记录', comments: '评论', relations: '关联资料', browse: '选择文件', add: '添加附件' }"
    :labels-comments="{ newThread: '发布评论', newPlaceholder: '新增评论', reply: '回复', replyPlaceholder: '填写回复', resolve: '标记解决',
      reopen: '重新打开', resolved: '已解决' }" @attach="attach" @comment="addComment" @reply="reply" @resolve="resolve">
    <template #properties>
      <SSelect v-model="owner" :options="owners" label="负责人" />
      <SDateField v-model="due" label="预计交付日期" locale="zh-CN" />
      <STokenizer v-model="selectedTags" :options="tags" label="分类标签" />
    </template>
  </SWorkItemDetail>
  <p v-if="action" role="status">{{ action }}</p>
</template>
