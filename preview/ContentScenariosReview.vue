<script setup lang="ts">
import { ref, useId } from 'vue'
import {
  SBadge, SBlockquote, SButton, SCard, SCode, SGrid, SIcon, SMotionText, SSeparator, SText, STypography, SVisuallyHidden,
} from '../src'

defineProps<{ kind: 'separator' | 'typography' | 'quote' | 'hidden' }>()
const teamHeading = 'sy-review-stats-' + useId()
const count = ref(4)
const topics = [
  { title: '品牌交付与数字标识系统的跨端适配验证', description: '集中核对不同设备、主题和语言中的视觉标识。' },
  { title: '网站发布与多语言目录的长期维护记录', description: '按场景记录交付规则、改版说明和归档约束。' },
  { title: '素材授权与外部合作交付资料的复用规范', description: '复核字体、图表、图片和源文件的授予范围。' },
]
const testimonials = [
  { quote: '接手发布任务时，能够直接找到上一版的变更原因。', attribution: '林舟，品牌设计' },
  { quote: '评审结束后可以顺着目录查到最终稿与签字记录。', attribution: '周昱，交付管理' },
]
</script>

<template>
  <section v-if="kind === 'separator'" class="content-scenarios" aria-label="横向和纵向分隔线">
    <SCard :padding="4" aria-label="交付费用">
      <div class="content-scenarios__paired"><span>资料复核</span><span>¥320</span></div>
      <SSeparator tone="subtle" />
      <div class="content-scenarios__paired"><span>文件归档</span><span>¥80</span></div>
      <SSeparator tone="strong" full-bleed />
      <div class="content-scenarios__paired"><strong>费用合计</strong><strong>¥400</strong></div>
    </SCard>
    <div class="content-scenarios__paired" aria-label="交付指标" role="group">
      <div><strong>16</strong><div>待交付文件</div></div>
      <SSeparator orientation="vertical" decorative />
      <div><strong>8</strong><div>已复核文件</div></div>
    </div>
    <div class="content-scenarios__stack">
      <SButton size="sm" variant="secondary" href="#发布费用">查看已保存清单</SButton>
      <SSeparator label="或" />
      <SButton id="发布费用" size="sm" variant="ghost" href="#发布费用">手动核对费用</SButton>
    </div>
  </section>

  <section v-else-if="kind === 'quote'" class="content-scenarios" aria-label="引文与来源">
    <SBlockquote>每次发布都从同一份交付资料清单开始。</SBlockquote>
    <SGrid min-column-width="13rem" :gap="3">
      <SCard v-for="item in testimonials" :key="item.attribution" variant="default">
        <SBlockquote :attribution="item.attribution">{{ item.quote }}</SBlockquote>
      </SCard>
    </SGrid>
    <SBlockquote cite="#发布流程来源">
      归档前，先确认可见范围与保留时间。
      <template #attribution><a href="#发布流程来源">发布流程说明</a></template>
    </SBlockquote>
    <p id="发布流程来源">文件主管可在归档详情中核对权限。</p>
  </section>

  <section v-else-if="kind === 'typography'" class="content-scenarios" aria-label="标题和行内代码">
    <section class="content-scenarios__stack" aria-label="发布手册标题">
      <STypography variant="h1">发布手册</STypography>
      <STypography variant="h2">准备 <SCode>release</SCode> 目录</STypography>
      <STypography variant="h3">核对发布入口</STypography>
      <SText as="p" type="body">在 <SCode>docs/releases/index.md</SCode> 更新版本记录，并执行 <SCode>pnpm check:catalog</SCode>。</SText>
      <SText as="p" type="supporting">通过 <SCode>--sy-canvas</SCode> 设置画布底色。</SText>
      <SText type="label">常用检索命令 <SCode>rg</SCode></SText>
    </section>
    <SGrid min-column-width="14rem" :gap="3" aria-label="截断标题卡片">
      <SCard v-for="(topic, index) in topics" :key="topic.title">
        <STypography variant="h3" class="content-scenarios__clamp" :max-lines="index ? 2 : 1" has-truncate-tooltip>{{ topic.title }}</STypography>
        <SText as="p" type="supporting" :max-lines="2">{{ topic.description }}</SText>
      </SCard>
    </SGrid>
  </section>

  <section v-else class="content-scenarios" :aria-labelledby="teamHeading">
    <SVisuallyHidden :id="teamHeading" as="h3">发布进度统计</SVisuallyHidden>
    <div class="review__row">
      <strong>本周完成</strong>
      <SBadge tone="success" aria-hidden="true"><SMotionText :value="String(count)" motion="roll" /></SBadge>
      <SButton size="sm" variant="secondary" @click="count++">登记完成项</SButton>
    </div>
    <SVisuallyHidden role="status" aria-live="polite" aria-atomic="true">本周已完成 {{ count }} 项交付</SVisuallyHidden>
    <div class="review__row">
      <strong>较上周</strong><SIcon name="arrowUp" size="sm" /><span aria-hidden="true">12%</span>
      <SVisuallyHidden>比上周增加 12%</SVisuallyHidden>
    </div>
  </section>
</template>

<style scoped>
.content-scenarios, .content-scenarios__stack { display: grid; min-inline-size: 0; gap: var(--sy-space-3); }
.content-scenarios :where(p, h1, h2, h3) { margin: 0; }
.content-scenarios__paired { display: flex; align-items: center; justify-content: space-between; min-inline-size: 0; gap: var(--sy-space-3); }
.content-scenarios__clamp { max-inline-size: 14rem; }
</style>
