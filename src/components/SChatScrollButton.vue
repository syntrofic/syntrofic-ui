<script setup lang="ts">
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

withDefaults(defineProps<{ visible?: boolean; label?: string; accessibleLabel?: string; controls?: string }>(), { visible: true })
const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <Transition name="sy-chat-control">
    <SButton v-if="visible" class="sy-chat-scroll-button" size="sm" variant="secondary" :aria-controls="controls" :aria-label="accessibleLabel ?? label ?? 'Back to latest'"
      :data-compact="!label || undefined" @click="emit('click', $event)">
      <template #start><SIcon name="chevron" class="sy-chat-scroll-button__icon" size=".9em" /></template>
      <SMotionText v-if="label" :value="label" />
    </SButton>
  </Transition>
</template>
