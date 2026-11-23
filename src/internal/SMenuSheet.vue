<script setup lang="ts">
import SSheet from '../components/SSheet.vue'
import SMenuSheetItems from './SMenuSheetItems.vue'
import type { MenuEntry } from '../types'

withDefaults(defineProps<{ id: string; label: string; items: readonly MenuEntry[]; direction?: 'ltr' | 'rtl'; dismissLabel?: string; modal?: boolean; context?: boolean }>(), {
  modal: true,
})
const open = defineModel<boolean>('open', { default: false })
const selected = defineModel<readonly string[]>('selected', { default: () => [] })
const emit = defineEmits<{ action: [id: string] }>()

function choose(id: string) {
  emit('action', id)
  open.value = false
}
</script>

<template>
  <SSheet v-model:open="open" :content-id="id" :title="label" :content-class="context ? 'sy-menu-sheet sy-context-menu__sheet' : 'sy-menu-sheet'" :dismiss-label="dismissLabel" :modal="modal" size="sm">
    <template #default="{ close }">
      <div :dir="direction">
        <slot :close="close"><SMenuSheetItems :items="items" :selected="selected" @action="choose" @change="selected = $event" /></slot>
      </div>
    </template>
  </SSheet>
</template>
