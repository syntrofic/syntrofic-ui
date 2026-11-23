<script setup lang="ts">
import { SAvatar, SCard, SCarousel, SIcon } from '../src'

const decks = [
  {
    label: '交付功能卡片', perView: 2, people: false, slides: [
      { id: 'prepare', label: '准备交付', icon: 'folder', note: '整理源文件和发布范围。' },
      { id: 'review', label: '完成复核', icon: 'check', note: '检查布局、文案和授权。' },
      { id: 'publish', label: '登记发布', icon: 'calendar', note: '记录版本和发布日期。' },
      { id: 'archive', label: '归档最终稿', icon: 'archive', note: '留下可检索的交接记录。' },
    ],
  },
  {
    label: '评审成员卡片', perView: 1, people: true, slides: [
      { id: 'lin', label: '林舟', icon: '', note: '负责品牌与图形材料。' },
      { id: 'chen', label: '陈禾', icon: '', note: '负责内容复核和发布排期。' },
      { id: 'fang', label: '方以', icon: '', note: '负责交付与归档。' },
    ],
  },
]
</script>

<template>
  <section class="carousel-scenarios" aria-label="卡片滑动与吸附">
    <SCarousel v-for="deck in decks" :key="deck.label" :label="deck.label" :slides="deck.slides" :slides-per-view="deck.perView"
      has-snap navigation="none" previous-label="前一组卡片" next-label="后一组卡片" carousel-description="轮播" slide-description="卡片">
      <template #slide="{ index }">
        <SCard class="carousel-scenarios__card" :padding="3" height="100%" :variant="deck.people ? 'default' : 'green'">
          <SAvatar v-if="deck.people" :name="deck.slides[index].label" :tooltip="false" />
          <SIcon v-else :name="deck.slides[index].icon" />
          <h3>{{ deck.slides[index].label }}</h3>
          <p>{{ deck.slides[index].note }}</p>
        </SCard>
      </template>
    </SCarousel>
  </section>
</template>

<style scoped>
.carousel-scenarios { display: grid; gap: var(--sy-space-4); min-inline-size: 0; }
.carousel-scenarios__card h3 { margin: var(--sy-space-2) 0 var(--sy-space-1); font-size: 1rem; }
.carousel-scenarios__card p { margin: 0; font-size: .85rem; }
</style>
