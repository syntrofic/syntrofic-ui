<script setup lang="ts">
import { computed, inject } from 'vue'
import { sidebarControls, useAppLayout } from '../internal/shell-layout'
import { useTranslator } from '../rac/locale'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{ expandLabel?: string; collapseLabel?: string; iconOnly?: boolean }>(), { iconOnly: true })
const sidebar = inject(sidebarControls, null)
const layout = useAppLayout()
const translate = useTranslator({ 'sidebar.expand': 'Expand navigation', 'sidebar.collapse': 'Collapse navigation' })
const open = computed(() => sidebar?.open.value ?? layout?.sidebarOpen.value ?? false)
const disabled = computed(() => sidebar?.disabled.value ?? (!layout?.sidebarAvailable?.value || layout.compact.value))
const controls = computed(() => sidebar?.controls.value ?? layout?.sidebarId.value)
const label = computed(() => open.value ? props.collapseLabel ?? translate('sidebar.collapse') : props.expandLabel ?? translate('sidebar.expand'))
const toggle = sidebar?.toggle ?? layout?.toggleSidebar
</script>

<template>
  <SButton class="sy-side-nav-collapse" size="sm" variant="ghost" :icon-only="iconOnly"
    :aria-label="label" :aria-controls="controls" :aria-expanded="open" :disabled="disabled" @click="toggle?.()">
    <template #start>
      <slot name="icon" :open="open"><SIcon name="chevronsLeft" class="sy-side-nav-collapse__icon" /></slot>
    </template>
    <slot v-if="!iconOnly" :open="open" :label="label">{{ label }}</slot>
  </SButton>
</template>
