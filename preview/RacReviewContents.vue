<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { Collection, Focusable, ListBoxLoadMoreItem, ListLayout, Pressable, RouterProvider, useFilter, useLocale } from '../src/rac'
import { SButton, SDisclosure, SInput, SLink, SPopover } from '../src'
import RacStateAction from './RacStateAction.vue'

const { locale, direction } = useLocale()
const { contains } = useFilter({ sensitivity: 'base' })
const query = ref('')
const total = ref(120)
const marked = ref(false)
const route = ref(false)
const result = ref('')
const viewport = useTemplateRef<InstanceType<typeof Focusable>>('viewport')
let timer: ReturnType<typeof setTimeout> | undefined
const entries = computed(() => Array.from({ length: total.value }, (_, index) =>
  ({ id: index + 1, label: (direction.value === 'rtl' ? 'ملف ' : '品牌文档 ') + (index + 1) }))
  .filter(item => !query.value || contains(item.label, query.value)))
const { items, size } = ListLayout({ items: entries, viewport: () => viewport.value?.element, estimateSize: () => 27, itemKey: item => item.id })

function load(signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const complete = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      resolve()
    }
    signal.addEventListener('abort', complete, { once: true })
    timer = setTimeout(() => {
      signal.removeEventListener('abort', complete)
      if (!signal.aborted) total.value += 40
      complete()
    }, 220)
  })
}

function navigate() {
  route.value = !route.value
  result.value = route.value ? '已打开文档详情' : '已返回文档列表'
}
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="review__stack rac-review">
    <SInput v-model="query" label="查找文档" :placeholder="direction === 'rtl' ? 'ملف' : '输入名称'" />
    <Focusable ref="viewport" as="div" class="rac-review__viewport rac-review__scroll" role="region" aria-label="虚拟文档列表">
        <ul :style="{ blockSize: size + 'px' }">
          <Collection v-slot="{ item: row }" :items="items" :item-key="row => row.item.id">
            <li :style="{ top: row.start + 'px' }">{{ row.item.label }}</li>
          </Collection>
        </ul>
    </Focusable>
    <div class="review__row">
      <ListBoxLoadMoreItem :load-more="load" :has-more="total < 240" label="加载更多文档" />
      <span class="review__result" aria-live="polite">{{ new Intl.NumberFormat(locale).format(total) }} 份文档</span>
    </div>
    <div class="review__row">
      <RouterProvider :navigate="navigate">
        <SLink href="./documents">{{ route ? '返回文档列表' : '打开文档详情' }}</SLink>
      </RouterProvider>
      <Pressable as-child @press="marked = !marked">
        <SButton size="sm" variant="secondary" :aria-pressed="marked">标记文档</SButton>
      </Pressable>
      <SPopover>
        <template #trigger><SButton size="sm" variant="ghost">快捷面板</SButton></template>
        <RacStateAction kind="overlay" />
      </SPopover>
    </div>
    <SDisclosure title="文档说明"><RacStateAction kind="disclosure" /></SDisclosure>
    <p v-if="result" class="review__result" role="status">{{ result }}</p>
  </div>
</template>

<style scoped>
.rac-review { inline-size: min(100%, 22rem); }
.rac-review__viewport { inline-size: 100%; border-radius: 8px; background: var(--sy-surface-muted); }
.rac-review__viewport:focus-visible { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.rac-review__scroll { block-size: 100px; overflow: auto; }
.rac-review__scroll ul { position: relative; padding: 0; margin: 0; list-style: none; }
.rac-review__scroll li { position: absolute; inset-inline: 0; padding-inline: 8px; line-height: 27px; font-size: .875rem; }
</style>
