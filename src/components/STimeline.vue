<script setup lang="ts">
withDefaults(defineProps<{
  axis?: 'start' | 'center'
  placement?: 'start' | 'end' | 'alternate'
  orientation?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  density?: 'compact' | 'comfortable'
  itemAlign?: 'start' | 'center'
}>(), { axis: 'start', placement: 'end', orientation: 'vertical', size: 'md', density: 'comfortable', itemAlign: 'start' })
</script>

<template>
  <TransitionGroup tag="ol" name="sy-timeline-event" class="sy-timeline" role="list"
    :data-axis="axis" :data-placement="placement" :data-orientation="orientation"
    :data-size="size" :data-density="density" :data-align="itemAlign">
    <slot />
  </TransitionGroup>
</template>
