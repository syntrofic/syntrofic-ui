<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { SSwitch } from '../src'
import ReviewExample from './ReviewExample.vue'
import { reviewHref, reviewItems, standardExamples, type ReviewItem } from './review-catalog'

defineProps<{ item: ReviewItem }>()
const dark = ref(false)
const navigation = useTemplateRef<HTMLElement>('navigation')
onMounted(() => {
  const nav = navigation.value
  const active = nav?.querySelector('[aria-current="page"]')
  if (!nav || !active) return
  const parent = nav.getBoundingClientRect()
  const link = active.getBoundingClientRect()
  nav.scrollLeft += Math.max(0, link.right - parent.right + 5)
  nav.scrollTop += Math.max(0, link.bottom - parent.bottom + 5)
})
</script>

<template>
  <div class="review" :data-sy-theme="dark ? 'dark' : 'light'">
    <header class="review__top">
      <div><a class="review__brand" href="./#projects">Syntrofic UI</a><a href="./#projects">项目流程</a></div>
      <SSwitch v-model="dark">深色</SSwitch>
    </header>
    <div class="review__layout">
      <nav ref="navigation" class="review__nav" aria-label="组件">
        <a
          v-for="[id, name] in reviewItems"
          :key="id"
          :href="reviewHref(id)"
          :aria-current="item[0] === id ? 'page' : undefined"
        >{{ name }}</a>
      </nav>
      <main class="review__body">
        <header>
          <h1>{{ item[1] }}</h1>
          <code>{{ item[2] }}</code>
        </header>
        <section class="review__example" :data-standard="standardExamples.has(item[0]) || undefined" aria-label="组件示例">
          <ReviewExample :id="item[0]" />
        </section>
      </main>
    </div>
  </div>
</template>
