<script setup lang="ts" generic="Item">
defineProps<{
  items: readonly Item[]
  itemKey: (item: Item, index: number) => string | number
}>()
defineSlots<{ default?: (props: { item: Item; index: number }) => unknown }>()
</script>

<template>
  <template v-for="(item, index) in items" :key="itemKey(item, index)">
    <slot :item="item" :index="index" />
  </template>
</template>
