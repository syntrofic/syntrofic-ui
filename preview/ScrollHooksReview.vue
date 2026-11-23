<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { SButton, SChip, SSwitch, useScrollableArea, useScrollOverflow } from '../src'

const props = defineProps<{ kind: 'strip' | 'log' }>()
const all = ['发布状态', '负责人', '历史记录', '复核附件', '共享范围', '完成时间']
const count = ref(1)
const rtl = ref(false)
const strip = useTemplateRef<HTMLDivElement>('strip')
const content = useTemplateRef<HTMLElement>('content')
const { overflowStart, overflowEnd } = useScrollOverflow(strip, { content })

const entries = ref(['已创建交付记录'])
const { viewport, content: logContent, state, viewportAttrs } = useScrollableArea({ overscroll: 'contain' })
const changes = ['更新了版本说明', '补充复核人', '确认共享范围', '准备发布预览', '完成归档']
function append() {
  const line = changes[(entries.value.length - 1) % changes.length]
  entries.value.push((entries.value.length + 1) + '. ' + line)
}
</script>

<template>
  <section v-if="props.kind === 'strip'" class="scroll-hooks" aria-label="筛选条件横向滚动">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :disabled="count === all.length" @click="count++">增加筛选条件</SButton>
      <SButton size="sm" variant="secondary" :disabled="count === 1" @click="count--">移除筛选条件</SButton>
      <SSwitch v-model="rtl" label="反转筛选条件方向" />
    </div>
    <div class="scroll-hooks__frame" :dir="rtl ? 'rtl' : 'ltr'">
      <div ref="strip" role="region" aria-label="当前筛选条件" class="scroll-hooks__strip" :dir="rtl ? 'rtl' : 'ltr'"
        :tabindex="overflowStart || overflowEnd ? 0 : -1">
        <ul ref="content">
          <TransitionGroup name="scroll-hook-add">
            <li v-for="filter in all.slice(0, count)" :key="filter"><SChip :label="filter" /></li>
          </TransitionGroup>
        </ul>
      </div>
      <span class="scroll-hooks__edge" data-edge="start" :data-visible="overflowStart || undefined" aria-hidden="true" />
      <span class="scroll-hooks__edge" data-edge="end" :data-visible="overflowEnd || undefined" aria-hidden="true" />
    </div>
  </section>
  <section v-else class="scroll-hooks" aria-label="交付活动日志滚动">
    <SButton size="sm" variant="secondary" @click="append">添加活动日志</SButton>
    <div class="scroll-hooks__frame">
      <div ref="viewport" v-bind="viewportAttrs" class="scroll-hooks__log" role="region" aria-label="交付活动日志">
        <ol ref="logContent">
          <TransitionGroup name="scroll-hook-add">
            <li v-for="entry in entries" :key="entry">{{ entry }}</li>
          </TransitionGroup>
        </ol>
      </div>
      <span class="scroll-hooks__edge" data-edge="top" :data-visible="state.blockStart || undefined" aria-hidden="true" />
      <span class="scroll-hooks__edge" data-edge="bottom" :data-visible="state.blockEnd || undefined" aria-hidden="true" />
    </div>
  </section>
</template>

<style scoped>
.scroll-hooks { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.scroll-hooks > .sy-button { justify-self: start; }
.scroll-hooks__frame { position: relative; inline-size: min(100%, 16rem); border-radius: var(--sy-radius-md); background: var(--sy-canvas); border: 1px solid var(--sy-border); box-sizing: border-box; }
.scroll-hooks__strip, .scroll-hooks__log { overflow: auto; scrollbar-width: thin; border-radius: inherit; }
.scroll-hooks__log { block-size: 5.75rem; overscroll-behavior-block: contain; }
.scroll-hooks__strip ul, .scroll-hooks__log ol { padding: .45rem; margin: 0; list-style: none; }
.scroll-hooks__strip ul { display: flex; gap: .35rem; inline-size: max-content; }
.scroll-hooks__log li { padding: .3rem .25rem; }
.scroll-hooks__edge {
  position: absolute; pointer-events: none; border-radius: inherit; opacity: 0;
  transition: opacity var(--sy-motion-replace) var(--sy-ease-settle);
}
.scroll-hooks__edge[data-visible] { opacity: 1; }
.scroll-hooks__edge[data-edge='top'] { inset: 0 0 auto; block-size: 16px; background: linear-gradient(var(--sy-canvas), transparent); }
.scroll-hooks__edge[data-edge='bottom'] { inset: auto 0 0; block-size: 16px; background: linear-gradient(0deg, var(--sy-canvas), transparent); }
.scroll-hooks__edge:is([data-edge='start'], [data-edge='end']) { inset-block: 0; inline-size: 1.1rem; background: linear-gradient(var(--hook-fade), var(--sy-canvas), transparent); }
.scroll-hooks__edge[data-edge='start'] { inset-inline-start: 0; --hook-fade: 90deg; }
.scroll-hooks__edge[data-edge='end'] { inset-inline-end: 0; --hook-fade: 270deg; }
.scroll-hooks__edge[data-edge='start']:dir(rtl) { --hook-fade: 270deg; }
.scroll-hooks__edge[data-edge='end']:dir(rtl) { --hook-fade: 90deg; }
.scroll-hook-add-enter-active, .scroll-hook-add-leave-active, .scroll-hook-add-move { transition: transform var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.scroll-hook-add-enter-from, .scroll-hook-add-leave-to { opacity: 0; transform: translateY(4px); }
</style>
