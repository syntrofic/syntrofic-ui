<script setup lang="ts">
defineProps<{ size: number; color: string }>()
</script>

<template>
  <GridLayout :isUserInteractionEnabled="false" :accessibilityHidden="true">
    <ContentView v-for="edge in (['top', 'bottom'] as const)" :key="edge"
      :height="size" :verticalAlignment="edge" :isUserInteractionEnabled="false"
      :backgroundImage="`linear-gradient(${edge === 'top' ? 180 : 0}deg, ${color}, transparent)`" />
  </GridLayout>
</template>
