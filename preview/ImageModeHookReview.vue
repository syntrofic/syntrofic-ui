<script setup lang="ts">
import { computed, ref } from 'vue'
import { SMediaTheme, SMotionText, SSwitch, useImageMode } from '../src'
import chen from './assets/profile-chen.jpg'
import lin from './assets/profile-lin.jpg'

const daylight = ref(false)
const portrait = computed(() => (daylight.value ? lin : chen) + '?caption-sample')
const name = computed(() => daylight.value ? '林舟' : '陈禾')
const appearance = useImageMode(portrait, { region: { x: .02, y: .1, width: .19, height: .18 }, fallback: 'dark' })
</script>

<template>
  <section class="image-mode-hook" aria-label="相片文字颜色取样">
    <SSwitch v-model="daylight" label="切换至浅背景相片" />
    <figure>
      <Transition name="portrait-fade">
        <img :key="portrait" :src="portrait" :alt="name + '的头像'" width="384" height="384">
      </Transition>
      <figcaption class="image-mode-hook__caption">
        <SMediaTheme :mode="appearance ?? 'dark'"><SMotionText :value="name" /></SMediaTheme>
      </figcaption>
    </figure>
  </section>
</template>

<style scoped>
.image-mode-hook { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.image-mode-hook figure {
  position: relative; inline-size: min(100%, 15rem); aspect-ratio: 1; margin: 0;
  border-radius: var(--sy-radius-md); overflow: hidden; background: #252d3b;
}
.image-mode-hook img { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; object-fit: cover; }
.image-mode-hook__caption { position: absolute; inset: 13% auto auto 6%; z-index: 1; font-weight: 650; }
.image-mode-hook__caption > div { color: var(--sy-text); transition: color var(--sy-motion-replace) var(--sy-ease-settle); }
.portrait-fade-enter-active, .portrait-fade-leave-active { transition: opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.portrait-fade-enter-from, .portrait-fade-leave-to { opacity: 0; }
</style>
