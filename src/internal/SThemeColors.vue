<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from './theme-context'

const { mode, name, tokens } = useTheme()
const colors = computed(() => Object.entries(tokens.value).filter(([, value]) => /^#[a-f\d]{6}$/i.test(value)))
</script>

<template>
  <dl class="sy-theme-preview__colors" :data-theme-name="name" :data-theme-mode="mode">
    <div v-for="[token, value] in colors" :key="token">
      <span :style="{ background: value }" aria-hidden="true" />
      <dt>{{ token }}</dt><dd>{{ value }}</dd>
    </div>
  </dl>
</template>
