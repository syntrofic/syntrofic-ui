<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { SButton, SMarkdown, SMotionText, SOutline, SSelect, SSwitch, useOutlineFromDOM, useOutlineFromMarkdown, type TocItem } from '../src'

const prefix = 'sy-release-guide-' + useId() + '-'
const compact = ref(false)
const selected = ref<string | null>(prefix + 'setup')
const entries: TocItem[] = [
  { id: prefix + 'overview', label: '发布指南', level: 1 },
  { id: prefix + 'setup', label: '准备工作', level: 2 },
  { id: prefix + 'assets', label: '准备素材', level: 3 },
  { id: prefix + 'fonts', label: '字体授权', level: 4 },
]
const activeTitle = computed(() => entries.find(item => item.id === selected.value)?.label)
const options = entries.map(item => ({ value: item.id, label: item.label }))
const dom = useTemplateRef<HTMLElement>('dom')
const markdown = useTemplateRef<HTMLElement>('markdown')
const domItems = useOutlineFromDOM(dom)
const domExtras = ref(0)
const markdownExtras = ref(0)
const source = computed(() => '# 交接手册\n\n收齐发布日志和接手人名单。\n\n## 接手设置\n\n检查资料的访问范围。'
  + Array.from({ length: markdownExtras.value }, (_, index) => '\n\n## 补充交接 ' + (index + 1) + '\n\n记录接手确认和回退说明。').join(''))
const markdownItems = useOutlineFromMarkdown(source, prefix + 'md-')
</script>

<template>
  <section class="outline-scenarios" aria-label="大纲密度与受控选中">
    <div class="review__row">
      <SSelect :model-value="selected ?? undefined" :options="options" label="高亮章节" @update:model-value="selected = $event ?? null" />
      <SSwitch v-model="compact">紧凑目录</SSwitch>
    </div>
    <div class="outline-scenarios__layout">
      <SOutline v-model:active="selected" :items="entries" :density="compact ? 'compact' : 'default'"
        :history="false" :scroll-on-click="false" label="受控发布大纲" />
      <p role="status" aria-label="当前大纲章节"><SMotionText :value="activeTitle ?? ''" /></p>
    </div>
  </section>
  <section class="outline-scenarios" aria-label="从正文生成目录">
    <SButton size="sm" variant="secondary" @click="domExtras++">添加正文小节</SButton>
    <div class="outline-scenarios__layout">
      <SOutline :items="domItems" :content-root="dom" :scroll-root="dom" label="实时正文目录" />
      <section ref="dom" class="outline-scenarios__scroll" aria-label="动态发布正文" tabindex="0">
        <h2 :id="prefix + 'dom-main'">整理发布材料</h2>
        <p>按版本建立目录，并保留可编辑的源文件。</p>
        <h3 :id="prefix + 'dom-review'">记录复核意见</h3>
        <p>核对共享链接、字体授权和发布日期。</p>
        <template v-for="index in domExtras" :key="index">
          <h3 :id="prefix + 'dom-extra-' + index">补充发布记录 {{ index }}</h3>
          <p>记录本次发布的变更和日期。</p>
        </template>
      </section>
    </div>
  </section>
  <section class="outline-scenarios" aria-label="从 Markdown 生成目录">
    <SButton size="sm" variant="secondary" @click="markdownExtras++">添加 Markdown 小节</SButton>
    <div class="outline-scenarios__layout">
      <SOutline :items="markdownItems" :content-root="markdown" :scroll-root="markdown" label="实时 Markdown 目录" />
      <section ref="markdown" class="outline-scenarios__scroll" aria-label="可更新的 Markdown 正文" tabindex="0">
        <SMarkdown :source="source" heading-ids :heading-prefix="prefix + 'md-'" />
      </section>
    </div>
  </section>
</template>

<style scoped>
.outline-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.outline-scenarios > .sy-button { justify-self: start; }
.outline-scenarios__layout { display: grid; align-items: start; grid-template-columns: minmax(7.5rem, .72fr) minmax(0, 1fr); gap: var(--sy-space-3); }
.outline-scenarios__scroll { max-block-size: 12rem; overflow: auto; scroll-padding-block: var(--sy-space-3); }
.outline-scenarios :where(h2, h3, p) { margin: 0; }
.outline-scenarios__scroll p { padding-block: var(--sy-space-2) var(--sy-space-5); }
</style>
