<script setup lang="ts">
import { computed, watch } from 'nativescript-vue'
import { useOptionalNativeToast } from '../toast'
import SNativeToast from './SNativeToast.vue'

const props = defineProps<{ root?: boolean; overlay?: boolean }>()
const manager = useOptionalNativeToast()
const layer = Symbol('Toast viewport')
const active = computed(() => manager && (
  props.root ? manager.overlay.value === undefined : props.overlay && manager.overlay.value === layer
))

watch(() => props.overlay, (visible, _, cleanup) => {
  if (visible && manager) cleanup(manager.activate(layer))
}, { immediate: true })
</script>

<template>
  <template v-if="active && manager">
    <StackLayout
      v-for="placement in (['top', 'bottom'] as const)"
      :key="placement"
      :isPassThroughParentEnabled="true"
      :verticalAlignment="placement"
      :margin="manager.settings.inset"
      :maxWidth="420"
    >
      <SNativeToast
        v-for="item in manager.groups.value[placement]"
        :key="item.id"
        :item="item"
        :controls="manager.toast"
        :placement="placement"
        :closeLabel="manager.settings.closeLabel"
        @pause="(key, paused) => manager?.pause(item.id, key, paused)"
        @entered="manager?.entered(item.id)"
        @exited="manager?.exited(item.id)"
        @error="manager?.error($event)"
      />
    </StackLayout>
  </template>
</template>
