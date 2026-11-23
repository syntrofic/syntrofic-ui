<script setup lang="ts">
import { provideNativePortal } from '../portal'
const entries = provideNativePortal()
</script>
<template>
  <GridLayout>
    <GridLayout><slot /></GridLayout>
    <GridLayout v-if="entries.length">
      <component v-for="entry in entries" :key="entry.id" :is="entry.render" />
    </GridLayout>
  </GridLayout>
</template>
