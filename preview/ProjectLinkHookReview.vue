<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, SCard, SLink, SMotionText, useClickableContainer } from '../src'

const card = useTemplateRef<InstanceType<typeof SCard>>('card')
const starred = ref(false)
const href = '#hook-project-details'
const actions = useClickableContainer(() => ({ href, container: card.value?.$el as HTMLElement | undefined }))
</script>

<template>
  <section class="project-link-hook" aria-label="可点击项目卡片">
    <SCard ref="card" class="project-link-hook__body" v-bind="actions">
      <template #header><SLink :href="href">工作区交付计划</SLink></template>
      <p>这里记录版本规则、复核状态和交付时间。</p>
      <template #footer>
        <div class="review__row">
          <SLink href="#hook-project-owner">查看负责人</SLink>
          <SButton variant="secondary" size="sm" :aria-pressed="starred" @click="starred = !starred">
            <SMotionText :value="starred ? '已收藏计划' : '收藏计划'" />
          </SButton>
        </div>
      </template>
    </SCard>
    <p id="hook-project-details">版本规则与复核状态</p>
    <p id="hook-project-owner">负责人 · 林舟</p>
  </section>
</template>

<style scoped>
.project-link-hook { display: grid; gap: var(--sy-space-2); }
.project-link-hook p { margin: 0; }
.project-link-hook__body { cursor: pointer; }
.project-link-hook__body:focus-within { border-color: var(--sy-focus); }
.project-link-hook p:target { color: var(--sy-accent-text); }
</style>
