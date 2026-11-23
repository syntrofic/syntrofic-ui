<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import SButton from '../src/components/SButton.vue'
import SChip from '../src/components/SChip.vue'
import SDialog from '../src/components/SDialog.vue'
import SInput from '../src/components/SInput.vue'
import SProgressBar from '../src/components/SProgressBar.vue'
import SSwitch from '../src/components/SSwitch.vue'
import { siteText as t } from './locale'

defineProps<{ id: string }>()
const saved = ref(false)
const notify = ref(true)
const input = ref('')
const open = ref(false)
const confirmed = ref(false)
const progress = ref(64)
const showTag = ref(true)
const chips = useTemplateRef<HTMLDivElement>('chips')
async function setTag(visible: boolean) {
  showTag.value = visible
  await nextTick()
  const target = visible ? '.chip-slot > :not([inert]) .sy-chip__remove' : '[data-restore-tag]:not([inert])'
  chips.value?.querySelector<HTMLButtonElement>(target)?.focus({ preventScroll: true })
}
</script>

<template>
  <SButton v-if="id === 'W.button'" @click="saved = !saved">{{ saved ? t('已保存', 'Saved') : t('保存更改', 'Save changes') }}</SButton>
  <SSwitch v-else-if="id === 'W.switch'" v-model="notify">{{ t('邮件通知', 'Email alerts') }}</SSwitch>
  <SInput v-else-if="id === 'W.input'" v-model="input" :aria-label="t('项目名称', 'Project name')" :placeholder="t('项目名称', 'Project name')" />
  <div v-else-if="id === 'W.progress-bar'" class="progress-sample">
    <SProgressBar :label="t('发布进度', 'Release progress')" :value="progress" />
    <SButton size="sm" variant="secondary" @click="progress = progress >= 100 ? 64 : 100">{{ progress === 100 ? t('重置', 'Reset') : t('完成', 'Finish') }}</SButton>
  </div>
  <div v-else-if="id === 'W.chip'" ref="chips" class="chips">
    <SChip tone="success">{{ t('已发布', 'Published') }}</SChip>
    <div class="chip-slot">
      <Transition name="sample-chip" @before-enter="node => (node as HTMLElement).inert = false"
        @before-leave="node => (node as HTMLElement).inert = true">
        <SChip v-if="showTag" :label="t('设计', 'Design')" removable :remove-label="t('移除设计标签', 'Remove Design tag')" @remove="setTag(false)" />
        <SButton v-else size="sm" variant="secondary" data-restore-tag @click="setTag(true)">{{ t('恢复标签', 'Restore tag') }}</SButton>
      </Transition>
    </div>
  </div>
  <div v-else>
    <SButton variant="secondary" @click="open = true">{{ confirmed ? t('再次演示', 'Try again') : t('打开弹窗', 'Open dialog') }}</SButton>
    <SDialog v-model:open="open" :title="t('发布更新？', 'Publish update?')">
      <template #footer="{ close }">
        <SButton size="sm" variant="secondary" autofocus @click="close">{{ t('取消', 'Cancel') }}</SButton>
        <SButton size="sm" @click="confirmed = true; close()">{{ t('确认', 'Confirm') }}</SButton>
      </template>
    </SDialog>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; justify-content: center; }
.chip-slot { display: grid; place-items: center; min-inline-size: 5.5rem; min-block-size: var(--sy-control-height-sm, 36px); }
.chip-slot > * { grid-area: 1 / 1; }
@media (pointer: coarse) { .chip-slot { min-block-size: 50px; } }
@media (prefers-reduced-motion: no-preference) {
  .chip-slot > :is(.sample-chip-enter-active, .sample-chip-leave-active) {
    transition: opacity var(--sy-motion-replace) var(--sy-ease-settle), translate var(--sy-motion-replace) var(--sy-ease-settle);
  }
  .sample-chip-enter-from { opacity: 0; translate: 0 3px; }
  .sample-chip-leave-to { opacity: 0; translate: 0 -3px; }
}
.progress-sample { display: grid; width: min(12rem, 100%); justify-items: start; gap: .3rem; }
.progress-sample > :first-child { width: 100%; }
</style>
