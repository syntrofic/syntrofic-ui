<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  ratio?: number
  fit?: 'cover' | 'contain' | 'center'
  shape?: 'rectangle' | 'ellipse'
}>(), { ratio: 1, shape: 'rectangle' })

const ratio = computed(() => Number.isFinite(props.ratio) && props.ratio > 0 ? props.ratio : 1)
</script>

<template>
  <div class="sy-aspect-ratio" :data-fit="fit" :data-shape="shape" :style="{ '--sy-aspect-ratio': ratio }">
    <div class="sy-aspect-ratio__content"><slot /></div>
  </div>
</template>
