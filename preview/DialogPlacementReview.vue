<script setup lang="ts">
import { computed, ref } from 'vue'
import SBadge from '../src/components/SBadge.vue'
import SButton from '../src/components/SButton.vue'
import SCheckbox from '../src/components/SCheckbox.vue'
import SDialog, { type DialogPosition } from '../src/components/SDialog.vue'
import SMotionText from '../src/components/SMotionText.vue'
import SSegment from '../src/components/SSegment.vue'
import SSwitch from '../src/components/SSwitch.vue'

const showChecklist = ref(true)
const editing = ref(false)
const checkedFiles = ref(false)
const checkedRecipients = ref(false)
const ready = computed(() => checkedFiles.value && checkedRecipients.value)
const side = ref<string | null>('end')
const bottom = ref(false)
const rtl = ref(false)
const sides = [
  { value: 'start', label: '起始边' },
  { value: 'end', label: '末尾边' },
]
const position = computed<DialogPosition>(() => ({
  [bottom.value ? 'bottom' : 'top']: 'var(--sy-space-4)',
  [side.value === 'start' ? 'start' : 'end']: 16,
}))
</script>

<template>
  <section class="dialog-placement-review" aria-label="发布清单与边缘定位">
    <SSwitch v-model="showChecklist">显示发布清单</SSwitch>
    <SDialog v-model:open="showChecklist" inline title="发布清单" width="26rem" :padding="3"
      style="--sy-brand-dialog-background: var(--sy-surface-muted)">
      <div class="dialog-placement-review__fields">
        <SCheckbox v-model="checkedFiles" label="核对交付附件" />
        <SCheckbox v-model="checkedRecipients" label="确认接收成员" />
      </div>
      <template #footer>
        <SBadge :tone="ready ? 'success' : 'neutral'"><SMotionText :value="ready ? '已就绪' : '待核对'" announce /></SBadge>
      </template>
    </SDialog>
    <SButton size="sm" variant="secondary" @click="editing = true">编辑对话框位置</SButton>
    <SDialog v-model:open="editing" title="对话框位置" dismiss-label="完成定位" width="28rem" :padding="3"
      :position="position" :dir="rtl ? 'rtl' : 'ltr'">
      <div class="dialog-placement-review__fields">
        <SSegment v-model="side" :items="sides" :direction="rtl ? 'rtl' : 'ltr'" label="横向位置" size="sm" />
        <SSwitch v-model="bottom">贴近底边</SSwitch>
        <SSwitch v-model="rtl">从右向左排版</SSwitch>
      </div>
    </SDialog>
  </section>
</template>

<style scoped>
.dialog-placement-review { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: start; gap: var(--sy-space-2); min-width: 0; }
.dialog-placement-review__fields { display: grid; justify-items: start; gap: var(--sy-space-2); }
</style>
