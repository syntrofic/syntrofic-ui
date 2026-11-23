<script setup lang="ts">
import { computed } from 'vue'
import SAvatar from './SAvatar.vue'
import type { AvatarShape, AvatarSize } from './SAvatar.vue'
import type { LinkDestination } from '../internal/link-component'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{ count: number; label?: string; size?: AvatarSize; shape?: AvatarShape; interactive?: boolean; href?: LinkDestination }>(), { size: 'md' })
const emit = defineEmits<{ activate: [] }>()
const visible = computed(() => Number.isFinite(props.count) ? Math.max(0, Math.trunc(props.count)) : 0)
const accessible = computed(() => props.label ?? `${visible.value} more people`)
</script>

<template>
  <SAvatar class="sy-avatar-group__count" :alt="accessible" :size="size" :shape="shape" :href="href" :actionable="interactive" :tooltip="false"
    @activate="emit('activate')">
    <slot><SMotionText :value="`+${visible}`" motion="roll" /></slot>
  </SAvatar>
</template>
