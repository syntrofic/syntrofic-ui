<script setup lang="ts">
import { useDirection } from '../src'

const direction = useDirection()
</script>

<template>
  <svg class="locale-direction-chart" role="img" aria-label="按阅读方向显示的发布量趋势" viewBox="0 0 208 64" :data-direction="direction">
    <g aria-hidden="true">
      <path d="M12 50 38 37 64 43 90 30 116 33 142 19 168 25 196 11" />
      <circle cx="196" cy="11" r="4" />
    </g>
  </svg>
</template>

<style scoped>
.locale-direction-chart { display: block; max-inline-size: 100%; inline-size: 13rem; border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); color: var(--sy-accent-text); }
.locale-direction-chart g { transform-origin: 50% 50%; transition: transform var(--sy-motion-replace) var(--sy-ease-settle); }
.locale-direction-chart[data-direction='rtl'] g { transform: scaleX(-1); }
.locale-direction-chart path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; }
.locale-direction-chart circle { fill: currentColor; }
</style>
