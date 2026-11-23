<script setup lang="ts">
import { provideNativeUI, type NativeProviderOptions } from '../context'
const props = defineProps<NativeProviderOptions>()
provideNativeUI(props)
</script>
<template><slot /></template>
