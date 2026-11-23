<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { SAgentUI, SButton, SCalendar, SInput, SMotionText, SPromptInput, SSelect, SSwitch } from '../src'
import { legacyReviews } from './legacy-review'

const props = defineProps<{ selected: string }>()
const item = computed(() => legacyReviews.find(entry => entry.id === props.selected))
const result = ref('')
const email = ref('')
const password = ref('')
const search = ref('')
const paused = ref(false)
const draft = ref('')
const date = shallowRef<DateValue | DateValue[]>(new CalendarDate(2026, 11, 21))
const shipping = ref('studio')
const quantity = ref('1')
const category = ref('all')
const labels = ['打开交付文件', '查看复核项目', '打开历史记录', '管理工作台']
const commands = computed(() => labels.filter(label => label.includes(search.value.trim())))
const items = [
  { name: '工作记录本', category: '文具', price: 49 }, { name: '颜色样卡', category: '样品', price: 32 },
  { name: '档案文件夹', category: '文具', price: 24 },
]
const products = computed(() => items.filter(item => category.value === 'all' || item.category === category.value))
function signin() { result.value = '已进入演示工作台'; password.value = '' }
</script>
<template>
  <div class="workbench">
    <header class="workbench__top"><a class="workbench__brand" href="./">Syntrofic UI</a><a href="?legacy=all">页面区块验收</a></header>
    <main class="workbench__main">
      <article v-if="item" :data-legacy-review="item.id">
        <h1>{{ item.number }} {{ item.label }}</h1>
        <SCalendar v-if="item.slug === 'calendar'" v-model="date" label="交付日历" locale="zh-CN" />
        <form v-else-if="item.slug === 'authentication'" class="sy-agent-fields" @submit.prevent="signin">
          <SInput v-model="email" label="邮箱" type="email" required />
          <SInput v-model="password" label="密码" type="password" required />
          <SButton type="submit" size="sm">登录</SButton>
        </form>
        <div v-else-if="item.slug === 'command-menus'" class="sy-agent-fields">
          <SInput v-model="search" label="搜索命令" />
          <SButton v-for="name in commands" :key="name" variant="secondary" size="sm" @click="result = name">{{ name }}</SButton>
        </div>
        <div v-else-if="item.slug === 'scrolling-banners'" class="sy-agent-fields">
          <SSwitch v-model="paused">暂停</SSwitch>
          <div class="legacy-marquee" :data-paused="paused"><span>交付截止 · 周五 16:00　　图稿与使用许可统一归档　　交付截止 · 周五 16:00</span></div>
        </div>
        <SPromptInput v-else-if="item.slug === 'prompt-inputs'" v-model="draft" label="输入交付问题" placeholder="核对本周交付清单"
          :labels="{send:'发送'}" @submit="result = $event.text" />
        <div v-else-if="item.slug === 'filters'" class="sy-agent-fields">
          <SSelect v-model="category" label="商品分类" :options="[{label:'全部',value:'all'},{label:'文具',value:'文具'},{label:'样品',value:'样品'}]" />
          <p v-for="product in products" :key="product.name">{{ product.name }} · ¥{{ product.price }}</p>
        </div>
        <form v-else-if="item.slug === 'checkouts'" class="sy-agent-fields" @submit.prevent="result = '演示订单已提交'">
          <SInput v-model="quantity" inputmode="numeric" label="份数" required />
          <SSelect v-model="shipping" label="送达方式" :options="[{ label:'工作室自取',value:'studio' },{ label:'配送',value:'delivery' }]" />
          <SMotionText :value="'合计 ¥' + (Number(quantity) * 49 || 0)" />
          <SButton type="submit" size="sm">提交订单</SButton>
        </form>
        <template v-else>
          <SAgentUI :document="item.document" @action="result = { necessary: '已保存必要项', all: '已允许统计', choose: '已选择当前项' }[$event.action] ?? $event.action" />
          <SPromptInput v-if="item.slug === 'playgrounds' || item.slug === 'prompt-containers'" v-model="draft"
            label="继续讨论" :labels="{send:'发送'}" @submit="result = $event.text" />
        </template>
        <SMotionText v-if="result" :value="result" announce />
      </article>
      <template v-else>
        <h1>页面区块验收</h1>
        <ul><li v-for="example in legacyReviews" :key="example.id"><a :href="'?legacy=' + example.id">{{ example.number }} {{ example.label }}</a></li></ul>
      </template>
    </main>
  </div>
</template>
<style scoped>
.legacy-marquee { overflow: hidden; padding: .75rem; background: var(--sy-surface-sage, #e0e6db); border-radius: .75rem; }
.legacy-marquee span { display: inline-block; white-space: nowrap; animation: scroll-banner 14s ease-in-out infinite alternate; }
.legacy-marquee[data-paused='true'] span { animation-play-state: paused; }
@keyframes scroll-banner { to { transform: translateX(-48%); } }
@media (prefers-reduced-motion: reduce) { .legacy-marquee span { animation: none; } }
</style>
