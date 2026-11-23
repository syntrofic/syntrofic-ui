<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SClickableCard, SForm, SFormLayout, SGrid, SImage, SInput, SSearchField, SSegment, SSelect, STextArea } from '../src'
import CheckoutWizardTemplate from './CheckoutWizardTemplate.vue'
import deliveryArea from '../preview/assets/delivery-area.png'

const props = defineProps<{ kind: string }>()
const message = ref('')
const topic = ref('setup')
const topics = [{ value: 'setup', label: '组件接入' }, { value: 'feedback', label: '体验反馈' }, { value: 'other', label: '其他' }]
const groups = [{ value: 'studio', label: '工作室' }, { value: 'product', label: '产品团队' }, { value: 'engineering', label: '工程团队' }]
const organization = ref('studio')
const formatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const price = (cents: number) => formatter.format(cents / 100)
const search = ref('')
const category = ref('all')
const categories = [{ value: 'all', label: '全部' }, { value: 'ref', label: '参考' }, { value: 'examples', label: '示例' }]
const library = [
  { id: 'tokens', label: '语义颜色', detail: '配色和不同表面的 Token。', kind: 'ref', href: '/docs/theming/' },
  { id: 'motion', label: '通用动效', detail: '按压反馈、拖拽吸附和动画节奏。', kind: 'ref', href: '/docs/vue/components/motion/' },
  { id: 'table', label: '交付资料表', detail: '排序、筛选和保存视图。', kind: 'examples', href: '/templates/table-page/' },
  { id: 'checkout', label: '订单结账', detail: '配送、账单地址和订单金额。', kind: 'examples', href: '/templates/payment-form/' },
]
const products = [
  { id: 'leaflet', label: '折页园区地图', detail: '适合活动签到和来访者分发。', cents: 4800, focus: 'left center' },
  { id: 'desk', label: '桌面园区地图', detail: '将常用入口和交付点放在会议区。', cents: 6800, focus: 'center center' },
  { id: 'poster', label: '园区导览海报', detail: '适合展陈和公共区域导览。', cents: 12800, focus: 'right center' },
]
const filtered = computed(() => library.filter(item => (category.value === 'all' || item.kind === category.value) &&
  (item.label + ' ' + item.detail).toLowerCase().includes(search.value.trim().toLowerCase())))
const showGallery = computed(() => props.kind === 'library' || props.kind === 'product-gallery')
function submitContact(_event: SubmitEvent, form: FormData) {
  message.value = `${String(form.get('name'))}，已保存演示联系记录。`
}
</script>

<template>
  <section class="collection-template">
    <template v-if="showGallery">
      <template v-if="kind === 'library'">
        <div class="collection-template__toolbar">
          <SSearchField v-model="search" label="搜索资料库" />
          <SSegment v-model="category" :items="categories" label="资料分类" />
        </div>
        <SGrid v-if="filtered.length" min-column-width="12rem">
          <SClickableCard v-for="item in filtered" :key="item.id" :href="item.href" :label="item.label" class="collection-template__card">
            <SBadge tone="accent">{{ item.kind === 'ref' ? '参考' : '示例' }}</SBadge><h3>{{ item.label }}</h3><p>{{ item.detail }}</p>
          </SClickableCard>
        </SGrid>
        <p v-else role="status">没有符合条件的资料。</p>
      </template>
      <SGrid v-else min-column-width="11rem">
        <SClickableCard v-for="product in products" :key="product.id" class="collection-template__card" :label="product.label"
          @activate="message = '已选中' + product.label">
          <SImage :src="deliveryArea" :alt="product.label" :ratio="3 / 2" placeholder :style="{ '--sy-image-position': product.focus }" />
          <h3>{{ product.label }}</h3><p>{{ product.detail }}</p><strong>{{ price(product.cents) }}</strong>
        </SClickableCard>
      </SGrid>
    </template>

    <CheckoutWizardTemplate v-else-if="kind === 'checkout-wizard'" />

    <div v-else :class="kind === 'form-two-column' ? 'collection-template__split' : 'collection-template__single'">
      <header v-if="kind === 'form-two-column'" class="collection-template__intro">
        <h2>提交接入需求</h2><p>填写项目资料，便于团队安排接入评审。</p>
      </header>
      <SForm class="collection-template__form" @submit="submitContact">
        <h2 v-if="kind !== 'form-two-column'">联系组件团队</h2>
        <SFormLayout :layout="kind === 'form-two-column' ? 'horizontal-labels' : 'vertical'">
          <SInput name="name" label="姓名" autocomplete="name" required />
          <SInput name="email" label="工作邮箱" type="email" autocomplete="email" required />
          <SSegment v-model="topic" :items="topics" name="topic" label="咨询主题" />
          <SSelect v-model="organization" name="team" :options="groups" label="团队类型" required />
          <STextArea name="message" label="需求说明" placeholder="请描述你在接入中遇到的问题。" :rows="4" required />
        </SFormLayout>
        <SButton type="submit">保存演示联系记录</SButton>
      </SForm>
      <aside v-if="kind === 'form-two-column'" class="collection-template__card collection-template__aside">
        <h3>准备接入资料</h3><p>说明项目框架、目标平台和希望使用的组件，以便团队安排评审。</p>
        <a href="/docs/quick-start/">查看 Vue 接入步骤</a>
      </aside>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.collection-template, .collection-template__form, .collection-template__card { display: grid; min-width: 0; gap: var(--sy-space-3); align-content: start; }
.collection-template { container-type: inline-size; }
.collection-template :is(h2, h3, p) { margin: 0; }
.collection-template__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: var(--sy-space-2); }
.collection-template__split { display: grid; grid-template-columns: minmax(0, 3fr) minmax(12rem, 2fr); gap: var(--sy-space-4); align-items: start; }
.collection-template__intro { grid-column: 1 / -1; display: grid; gap: var(--sy-space-2); }
.collection-template__intro p { color: var(--sy-text-muted); }
.collection-template__single { width: min(100%, 32rem); margin-inline: auto; }
.collection-template__card { border-radius: var(--sy-radius-md); padding: var(--sy-space-3); background: var(--sy-surface-subtle); }
.collection-template__card.sy-card { --sy-card-fill: var(--sy-brand-card-background, var(--sy-surface-subtle)); }
.collection-template__card .sy-badge { justify-self: start; }
.collection-template__aside { position: sticky; inset-block-start: var(--sy-collection-sticky-top, 4.3rem); background: var(--sy-surface); }
@container (max-width: 620px) {
  .collection-template__split { grid-template-columns: minmax(0, 1fr); }
  .collection-template__aside { position: static; }
}
</style>
