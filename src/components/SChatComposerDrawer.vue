<script setup lang="ts">
import { computed } from 'vue'
import SChip from './SChip.vue'
import SDisclosure from './SDisclosure.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{ count?: number; label?: string; defaultCollapsed?: boolean }>(), { label: 'Items' })
const collapsed = defineModel<boolean | undefined>('collapsed', { default: undefined })
const folded = computed(() => collapsed.value ?? props.defaultCollapsed)
</script>

<template>
  <div v-if="count === undefined" class="sy-chat-composer-drawer">
    <div class="sy-chat-composer-drawer__content"><slot /></div>
  </div>
  <SDisclosure v-else class="sy-chat-composer-drawer" :open="!folded" keep-mounted @update:open="collapsed = !$event">
    <template #title>
      <slot v-if="folded" name="summary" :count="count" :label="label">
        <SMotionText :value="label" /><SChip><SMotionText :value="String(count)" motion="roll" /></SChip>
      </slot>
      <template v-else><SMotionText :value="label" /><SChip><SMotionText :value="String(count)" motion="roll" /></SChip></template>
    </template>
    <div class="sy-chat-composer-drawer__content" :inert="folded || undefined"><slot /></div>
  </SDisclosure>
</template>
