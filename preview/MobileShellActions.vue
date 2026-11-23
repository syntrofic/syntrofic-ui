<script setup lang="ts">
import { SButton, useAppShellMobile } from '../src'

defineProps<{ variant: 'trigger' | 'close' }>()
const { isMobile, isMobileNavEnabled, isMobileNavOpen, mobileNavId, hasAutoToggle, openMobileNav, closeMobileNav } = useAppShellMobile()
</script>

<template>
  <SButton v-if="isMobile && variant === 'trigger'" size="sm" variant="secondary" aria-haspopup="dialog"
    :disabled="!isMobileNavEnabled" :aria-expanded="isMobileNavOpen" :aria-controls="isMobileNavOpen ? mobileNavId : undefined"
    :data-auto-toggle="String(hasAutoToggle)" @click="openMobileNav">打开应用导航</SButton>
  <SButton v-if="isMobileNavOpen && variant === 'close'" size="sm" variant="ghost" @click="closeMobileNav">返回应用内容</SButton>
</template>
