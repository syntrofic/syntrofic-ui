<script setup lang="ts">
import { computed } from 'vue'
import SIcon from './SIcon.vue'
import type { TabBarItem } from './STabBar.vue'

const props = withDefaults(defineProps<{ items: readonly TabBarItem[]; label?: string }>(), { label: 'More tabs' })
const selected = defineModel<string>()
const overflow = computed(() => props.items.length > 5 ? props.items.slice(4) : [])
</script>

<template>
  <ul v-if="overflow.length" class="sy-tab-bar-more" :aria-label="label">
    <li v-for="item in overflow" :key="item.value">
      <button class="sy-tab-bar-more__row" type="button" :disabled="item.disabled" :aria-current="selected === item.value ? 'page' : undefined"
        @click="selected = item.value">
        <slot name="icon" :item="item"><SIcon :name="item.icon" size="1.25rem" /></slot>
        <span>{{ item.label }}</span>
        <span v-if="item.badge !== undefined && item.badge !== ''" class="sy-tab-bar-more__badge" :aria-label="item.badgeLabel">{{ item.badge }}</span>
        <SIcon name="chevron" size="1rem" mirror />
      </button>
    </li>
  </ul>
</template>
