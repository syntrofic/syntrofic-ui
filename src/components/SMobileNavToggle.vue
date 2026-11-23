<script setup lang="ts">
import { computed } from 'vue'
import { useAppShellMobile } from '../internal/shell-layout'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{ label?: string; controlsId?: string; icon?: string }>(), { label: 'Toggle navigation', icon: 'menu' })
const open = defineModel<boolean | undefined>('open', { default: undefined })
const layout = useAppShellMobile()
const visible = computed(() => open.value !== undefined || layout.isMobile.value && layout.isMobileNavEnabled.value)
const expanded = computed(() => open.value ?? layout.isMobileNavOpen.value)
const controls = computed(() => props.controlsId ?? layout.mobileNavId.value)

function toggle(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (!expanded.value && event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
  if (open.value === undefined) layout.toggleMobileNav()
  else open.value = !expanded.value
}
</script>

<template>
  <SButton v-if="visible" icon-only size="sm" variant="ghost" :aria-label="label" aria-haspopup="dialog"
    :aria-expanded="expanded" :aria-controls="expanded ? controls : undefined" @click="toggle">
    <template #start><slot><SIcon :name="icon" /></slot></template>
  </SButton>
</template>
