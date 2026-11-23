<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useTruncationState } from '../internal/interaction'
import STooltip from './STooltip.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ as?: string; maxLines?: number; tooltip?: boolean; tooltipSide?: 'top' | 'right' | 'bottom' | 'left' }>(), {
  as: 'div', maxLines: 2,
})
const node = useTemplateRef<HTMLElement>('node')
const { isTruncated, fullText } = useTruncationState(node)
const count = computed(() => Number.isFinite(props.maxLines) ? Math.max(1, Math.floor(props.maxLines)) : 2)
const enabled = computed(() => props.tooltip && isTruncated.value)
const open = ref(false)
watch(enabled, visible => { if (!visible && open.value) open.value = false })
</script>

<template>
  <STooltip v-model:open="open" :disabled="!enabled" :side="tooltipSide" :text="fullText">
    <template #trigger>
      <component :is="as" ref="node" :tabindex="enabled ? 0 : undefined" v-bind="$attrs" class="sy-line-clamp"
        :style="{ '--sy-clamp-lines': count }" :data-truncated="isTruncated || undefined"><slot /></component>
    </template>
  </STooltip>
</template>
