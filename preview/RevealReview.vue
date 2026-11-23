<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { SButton, SCheckbox, SMotionText, useContainerReveal, useIndicatorFocusRing } from '../src'

defineProps<{ variant: 'reveal' | 'ring' }>()
const enabled = ref(true)
const forced = ref(false)
const ringDisabled = ref(false)
const wrapper = useTemplateRef('wrapper')
const { focusProps } = useIndicatorFocusRing(wrapper, ringDisabled)
const reveal = useContainerReveal(() => ({ isEnabled: enabled.value }))
const files = ref(['交付附件清单', '版本复核记录'])
const fileArea = useTemplateRef<HTMLElement>('fileArea')
const notice = ref('')
async function removeFile(name: string) {
  const index = files.value.indexOf(name)
  if (index < 0) return
  files.value.splice(index, 1)
  notice.value = '已移除' + name
  await nextTick()
  const remaining = fileArea.value?.querySelectorAll<HTMLButtonElement>('.reveal-review__file:not([inert]) .reveal-review__edit')
  ;(remaining?.[Math.min(index, files.value.length - 1)] ?? fileArea.value)?.focus({ preventScroll: true })
}
function keepFilePosition(element: Element) {
  if (!(element instanceof HTMLElement)) return
  element.style.insetBlockStart = element.offsetTop + 'px'
  element.style.inlineSize = element.offsetWidth + 'px'
  element.inert = true
}
</script>

<template>
  <section v-if="variant === 'reveal'" class="review__stack" aria-label="延迟显示操作示例">
    <div class="review__row">
      <SCheckbox v-model="enabled">悬停显示操作</SCheckbox>
      <SCheckbox v-model="forced">锁定外层操作</SCheckbox>
    </div>
    <div class="reveal-review" v-bind="reveal.getContainerProps({ hoverDelay: 260, forceState: forced ? 'active' : undefined })">
      <div class="reveal-review__row">
        <span>工作区图片</span>
        <SButton size="sm" v-bind="reveal.getContentRevealProps({ isLayoutPreserved: true })">管理工作区图片</SButton>
      </div>
      <div class="reveal-review__row reveal-review__nested" v-bind="reveal.getContainerProps()">
        <span>单张图片</span>
        <SButton size="sm" variant="secondary" v-bind="reveal.getContentRevealProps()">管理单张图片</SButton>
      </div>
    </div>
    <section ref="fileArea" class="reveal-review__files" aria-label="悬停显示的文件操作" tabindex="-1">
      <TransitionGroup name="reveal-review-file" @before-leave="keepFilePosition">
        <div v-for="name in files" :key="name" class="reveal-review__file" v-bind="reveal.getContainerProps()">
          <span>{{ name }}</span>
          <div class="review__row">
            <SButton class="reveal-review__edit" size="sm" variant="secondary" :aria-label="'编辑' + name"
              v-bind="reveal.getContentRevealProps({ isLayoutPreserved: true })" @click="notice = '正在编辑' + name">编辑</SButton>
            <SButton size="sm" variant="ghost" :aria-label="'移除' + name"
              v-bind="reveal.getContentRevealProps({ isLayoutPreserved: true })" @click="removeFile(name)">移除</SButton>
          </div>
        </div>
      </TransitionGroup>
      <output aria-label="附件操作结果"><SMotionText :value="notice" wrap /></output>
    </section>
  </section>
  <section v-else class="review__stack" aria-label="自定义指示图形焦点">
    <label class="reveal-review__row" v-bind="focusProps">
      <input type="checkbox" class="sy-visually-hidden" :disabled="ringDisabled">
      <span ref="wrapper" aria-hidden="true"><span class="reveal-review__marker">✓</span></span>
      附件已审核
    </label>
    <SCheckbox v-model="ringDisabled">禁用自定义指示器</SCheckbox>
  </section>
</template>

<style scoped>
.reveal-review { display: grid; gap: var(--sy-space-2); padding: var(--sy-space-2); background: var(--sy-surface); border-radius: var(--sy-radius-sm); }
.reveal-review__row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-2); min-block-size: 42px; }
.reveal-review__nested { background: var(--sy-canvas); border-radius: var(--sy-radius-sm); padding: var(--sy-space-2); }
.reveal-review__marker { display: inline-grid; place-items: center; inline-size: 20px; block-size: 20px; border-radius: 7px; background: var(--sy-accent-soft); }
.reveal-review__files { position: relative; display: grid; gap: var(--sy-space-1); outline-offset: -2px; }
.reveal-review__file { display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; gap: var(--sy-space-1); flex-wrap: wrap; padding: .25rem .5rem; border: 1px solid var(--sy-border); border-radius: var(--sy-radius-sm); }
.reveal-review-file-enter-active, .reveal-review-file-leave-active, .reveal-review-file-move { transition: transform var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.reveal-review-file-leave-active { position: absolute; inset-inline-start: 0; pointer-events: none; }
.reveal-review-file-enter-from, .reveal-review-file-leave-to { opacity: 0; transform: translateY(4px); }
</style>
