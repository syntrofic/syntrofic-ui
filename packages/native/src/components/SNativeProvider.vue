<script setup lang="ts">
import { nativeTextStyle, provideNativeUI, type NativeProviderOptions } from '../context'

const props = defineProps<NativeProviderOptions>()
const { theme, fontFamily } = provideNativeUI(props)
</script>

<template>
  <GridLayout :backgroundColor="theme.colors.canvas" :style="nativeTextStyle('中文', fontFamily)">
    <slot />
  </GridLayout>
</template>
