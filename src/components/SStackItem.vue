<script setup lang="ts">
import { computed } from 'vue'
import { useScrollableArea } from '../internal/scroll-layout'

const props = withDefaults(defineProps<{
  as?: string
  size?: 'static' | 'fill'
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  scrollable?: boolean
  label?: string
}>(), { as: 'div', size: 'static' })
const { viewport, content, state, viewportAttrs } = useScrollableArea({ axis: 'both', keyboardOwner: 'content-or-viewport' })
const namedViewport = computed(() => props.scrollable && (state.value.block || state.value.inline))
</script>

<template>
  <component :is="as" ref="viewport" class="sy-stack-item" :data-size="size"
    :style="{ alignSelf }" :data-scrollable="scrollable || undefined"
    v-bind="scrollable ? viewportAttrs : {}"
    :role="namedViewport && (as === 'div' || as === 'span') ? 'group' : undefined"
    :aria-label="label || (namedViewport ? 'Content' : undefined)">
    <div v-if="scrollable" ref="content"><slot /></div>
    <slot v-else />
  </component>
</template>
