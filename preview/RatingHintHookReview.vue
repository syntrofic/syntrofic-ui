<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SIcon, SMotionText, useKeyboardHint, useListFocus } from '../src'

const rating = ref(0)
const range = [1, 2, 3, 4, 5]
const hint = useKeyboardHint({ label: '选择评分', orientation: 'horizontal' })
const { listRef, handleFocus, handleKeyDown } = useListFocus({ orientation: 'horizontal', itemSelector: 'button', hasRovingTabIndex: true })
function key(event: KeyboardEvent) {
  hint.onKeyDown(event)
  handleKeyDown(event)
}
</script>

<template>
  <section class="rating-hint" aria-label="评分键盘提示">
    <div ref="listRef" class="rating-hint__stars" role="toolbar" aria-label="选择交付评分" data-sy-keyboard-hint-scope
      @focusin="event => { handleFocus(event); hint.onFocus(event) }" @focusout="hint.onBlur" @keydown="key">
      <SButton v-for="(value, index) in range" :key="value" size="sm" variant="ghost" icon-only
        :aria-label="value + ' 分'" :aria-pressed="rating === value" :tabindex="index === 0 ? 0 : -1"
        @click="rating = value">
        <template #start><SIcon name="star" :color="value <= rating ? 'accent' : 'secondary'" /></template>
      </SButton>
    </div>
    <hint.HintElement />
    <output aria-label="选中的交付评分"><SMotionText :value="rating ? rating + ' 分' : '尚未评分'" /></output>
  </section>
</template>

<style scoped>
.rating-hint { display: grid; gap: var(--sy-space-2); }
.rating-hint__stars { display: flex; flex-wrap: wrap; }
.rating-hint__stars button[aria-pressed='true'] { background: var(--sy-accent-soft); }
</style>
