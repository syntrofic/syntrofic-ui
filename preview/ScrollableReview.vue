<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, SCard, SGrid, SScrollableArea, SSection, SStack, SSwitch, SText } from '../src'
import ScrollHooksReview from './ScrollHooksReview.vue'

const folders = ['产品简报', '设计规范', '版本清单', '组件接口', '验收记录', '交接手册']
const groups = [
  { id: 'shared', label: '团队共用' },
  { id: 'templates', label: '发布模板' },
  { id: 'archived', label: '已归档' },
]
const stages = ['排期待办', '正在处理', '等待验收', '完成归档']
const reminders = ['下个版本已开始整理', '共用资料会保留历史版本', '归档时间记录在发布清单中', '工作区资料每周同步']
const rail = useTemplateRef<InstanceType<typeof SScrollableArea>>('rail')
const compact = ref(false)
const onlyBlock = ref(false)
</script>

<template>
  <div class="scrollable-review">
    <ScrollHooksReview kind="log" />
    <section class="scrollable-review" aria-label="横向资料带">
      <SSection variant="transparent" :padding="0" :padding-inline="3">
        <div class="review__row">
          <SButton size="sm" variant="secondary" @click="rail?.scrollToStart('inline')">回到资料带开头</SButton>
          <SSwitch v-model="compact">仅展示最近资料</SSwitch>
        </div>
        <SScrollableArea ref="rail" axis="inline" role="region" label="最近资料" full-bleed :padding-block="2" :padding-inline="3">
          <SStack direction="horizontal" :gap="8">
            <SCard v-for="name in (compact ? folders.slice(0, 1) : folders)" :key="name" :width="118" :padding="2" variant="blue">
              <SText type="label">{{ name }}</SText>
            </SCard>
          </SStack>
        </SScrollableArea>
      </SSection>
    </section>

    <section class="scrollable-review" aria-label="双轴交付看板">
      <SSwitch v-model="onlyBlock">仅纵向滚动</SSwitch>
      <SScrollableArea :axis="onlyBlock ? 'block' : 'both'" :height="176" :padding="2" role="region" label="交付看板"
        class="scrollable-review__frame">
        <SGrid :columns="onlyBlock ? 2 : 4" :gap="8" :row-gap="12" :width="onlyBlock ? undefined : 588">
          <SStack v-for="(stage, stageIndex) in stages" :key="stage" :gap="8">
            <strong>{{ stage }}</strong>
            <SCard v-for="(task, taskIndex) in folders.slice(stageIndex, stageIndex + 3)" :key="task" :padding="2" variant="muted">
              <SText type="label" display="block">{{ task }}</SText>
              <SText type="supporting" display="block">任务 {{ stageIndex * 3 + taskIndex + 1 }}</SText>
            </SCard>
          </SStack>
        </SGrid>
      </SScrollableArea>
    </section>

    <SScrollableArea :height="238" :padding="2" role="region" label="独立滚动资料组" class="scrollable-review__frame">
      <SText variant="h3" class="scrollable-review__caption">工作区资料</SText>
      <section v-for="group in groups" :key="group.id" class="scrollable-review__group">
        <h3 class="scrollable-review__sticky">{{ group.label }}</h3>
        <SGrid :columns="2" :gap="7">
          <SCard v-for="folder in folders" :key="folder" :padding="2" variant="muted">{{ folder }}</SCard>
        </SGrid>
      </section>
    </SScrollableArea>

    <SScrollableArea :height="210" :padding="2" role="region" label="粘性标题边界对比" class="scrollable-review__frame">
      <p class="scrollable-review__note">滚动下方资料组，比较标题停留的位置。</p>
      <SScrollableArea label="标题可随外层固定的资料组" class="scrollable-review__compare">
        <h3 class="scrollable-review__sticky">随外层固定</h3>
        <ul class="scrollable-review__list"><li v-for="item in folders" :key="item">{{ item }}</li></ul>
      </SScrollableArea>
      <SScrollableArea label="限制在内层的资料组" sticky-containment="always" class="scrollable-review__compare">
        <h3 class="scrollable-review__sticky">限制在内层</h3>
        <ul class="scrollable-review__list"><li v-for="item in folders" :key="item">{{ item }}</li></ul>
      </SScrollableArea>
      <ul class="scrollable-review__list"><li v-for="note in reminders" :key="note">{{ note }}</li></ul>
    </SScrollableArea>

    <SScrollableArea :height="226" :padding="2" role="region" label="滚动传递对比" class="scrollable-review__frame">
      <div class="scrollable-review__nested">
        <div v-for="policy in (['allow', 'contain'] as const)" :key="policy">
          <strong>{{ policy === 'allow' ? '到边缘后继续滚动外层' : '滚动限制在内层' }}</strong>
          <SScrollableArea :height="93" :padding-inline="2" :label="policy === 'allow' ? '允许继续滚动' : '限制继续滚动'"
            :overscroll="policy" class="scrollable-review__inner-frame">
            <ul class="scrollable-review__list"><li v-for="name in folders" :key="name">{{ name }}</li></ul>
          </SScrollableArea>
        </div>
        <ul class="scrollable-review__list"><li v-for="note in reminders" :key="note">{{ note }}</li></ul>
      </div>
    </SScrollableArea>
  </div>
</template>

<style scoped>
.scrollable-review { display: grid; min-inline-size: 0; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); }
.scrollable-review__frame { border: 1px solid var(--sy-border); border-radius: var(--sy-radius-sm); background: var(--sy-canvas); }
.scrollable-review__group { min-inline-size: 0; padding-block-end: var(--sy-space-2); }
.scrollable-review__sticky {
  position: sticky; inset-block-start: 0; z-index: 1; margin: 0; padding: .5rem .25rem;
  background: var(--sy-canvas); font-size: .9rem; box-shadow: 0 1px var(--sy-border);
}
.scrollable-review__inner-frame { margin-block-start: .375rem; border-inline-start: 1px solid var(--sy-border); }
.scrollable-review__nested { display: grid; gap: var(--sy-space-3); }
.scrollable-review__compare { margin-block-end: var(--sy-space-2); }
.scrollable-review__note { color: var(--sy-text-muted); margin-block: .25rem .75rem; }
.scrollable-review__caption { padding-block: .25rem .75rem; }
.scrollable-review__list { display: grid; gap: .5rem; margin: 0; padding: .5rem .5rem .5rem 1.5rem; }
</style>
