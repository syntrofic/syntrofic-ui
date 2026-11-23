<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { SLink, SMotionText, STextArea, STooltip, useLinkify } from '../src'

const anchor = useId()
const note = ref('访问 https://www.w3.org/WAI/ 或联系 design@example.org，交付进度见 #248。')
const issue = ref('')
const issueAnchor = computed(() => anchor + '-issue-' + issue.value)
const target = useTemplateRef<HTMLElement>('issue')
const parts = useLinkify(note, {
  patterns: [{ pattern: /#(\d+)\b/g, href: match => '#' + anchor + '-issue-' + match[1] }],
})
const plain = useLinkify('这条评论已记录复核结果。')
const external = [
  { label: '无障碍参考', href: 'https://www.w3.org/WAI/' },
  { label: 'Web 开发文档', href: 'https://developer.mozilla.org/' },
]
async function selectIssue(href: string, event: MouseEvent) {
  const prefix = '#' + anchor + '-issue-'
  if (!href.startsWith(prefix) || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  issue.value = href.slice(prefix.length)
  await nextTick()
  target.value?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <section class="link-review" aria-label="链接交互示例">
    <p>交付前请检查 <SLink :href="`#${anchor}-notes`">发布要求</SLink>，确保共享权限正确。</p>
    <ul class="link-review__external">
      <li v-for="link in external" :key="link.href">
        <SLink :href="link.href" target="_blank" external-indicator external-label="在新标签页打开">{{ link.label }}</SLink>
      </li>
    </ul>
    <div class="review__row">
      <STooltip text="查询发布前的审核和授权要求。">
        <template #trigger><SLink :href="`#${anchor}-notes`">交付规则</SLink></template>
      </STooltip>
      <STooltip text="查看截稿日期。">
        <template #trigger><SLink :href="`#${anchor}-schedule`">发布时间</SLink></template>
      </STooltip>
    </div>
    <div class="link-review__comment">
      <STextArea v-model="note" label="交付评论" :rows="2" />
      <p class="link-review__matches">
        <template v-for="(part, index) in parts" :key="index">
          <SLink v-if="part.href" :href="part.href" :target="part.external ? '_blank' : undefined" :external-indicator="part.external"
            external-label="在新标签页打开" @click="selectIssue(part.href, $event)">{{ part.text }}</SLink>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
      <p>{{ plain[0]?.text }}</p>
    </div>
    <p :id="anchor + '-notes'"><strong>发布要求</strong> 已审核资产和共享权限。</p>
    <p :id="anchor + '-schedule'"><strong>发布时间</strong> 每周三下午。</p>
    <Transition name="sy-standard-fade">
      <p v-if="issue" :id="issueAnchor" ref="issue" role="status"><SMotionText :value="`已查看任务 #${issue}`" /></p>
    </Transition>
  </section>
</template>

<style scoped>
.link-review, .link-review__comment { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.link-review { inline-size: min(100%, 38rem); margin-block-start: var(--sy-space-3); }
.link-review p { margin: 0; overflow-wrap: anywhere; }
.link-review__external { display: grid; gap: 4px; margin: 0; padding-inline-start: 1.2em; }
.link-review__comment { padding: var(--sy-space-2); border-radius: var(--sy-radius-md); background: var(--sy-surface-muted); }
.link-review p[id] { scroll-margin-block-start: 6rem; }
</style>
