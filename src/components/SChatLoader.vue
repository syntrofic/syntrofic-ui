<script setup lang="ts">
import { computed } from 'vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'
import SMotionText from './SMotionText.vue'
import type { ChatLoaderVariant } from '../chat/types'

const props = withDefaults(defineProps<{
  label?: string
  variant?: ChatLoaderVariant
  size?: 'sm' | 'md'
  active?: boolean
  lines?: number
  showLabel?: boolean
  avatar?: boolean
  decorative?: boolean
}>(), { label: 'Preparing response', variant: 'dots', size: 'md', active: true, lines: 3 })
defineSlots<{ label(): unknown; skeleton(): unknown }>()
const widths = ['92%', '76%', '57%', '82%', '67%', '54%']
const count = computed(() => Math.min(widths.length, Math.max(1, Number.isFinite(props.lines) ? Math.floor(props.lines) : 3)))
</script>

<template>
  <div class="sy-chat-loader" :data-variant="variant" :data-size="size" :data-active="active || undefined"
    :aria-hidden="decorative || undefined" :data-labeled="showLabel || undefined">
    <span v-if="!decorative" class="sy-visually-hidden" role="status">{{ active ? label : '' }}</span>
    <Transition name="sy-chat-loader-motion">
      <div v-show="active" class="sy-chat-loader__visual" aria-hidden="true">
        <div v-if="variant === 'skeleton'" class="sy-chat-loader__skeleton">
          <SSkeleton v-if="avatar" shape="circle" width="24px" height="24px" />
          <slot name="skeleton">
            <div class="sy-chat-loader__lines">
              <SSkeleton v-for="line in count" :key="line" shape="line" :width="widths[line - 1]" height="9px" />
            </div>
          </slot>
        </div>
        <SSpinner v-else-if="variant === 'spinner'" size="sm" decorative />
        <span v-else-if="variant === 'pulse'" class="sy-chat-loader__pulse" />
        <span v-else class="sy-chat-loader__dots"><i /><i /><i /></span>
        <span v-if="showLabel" class="sy-chat-loader__label"><slot name="label"><SMotionText :value="label" /></slot></span>
      </div>
    </Transition>
  </div>
</template>
