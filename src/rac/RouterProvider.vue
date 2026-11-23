<script setup lang="ts">
import { provide } from 'vue'
import { routerContext, type RouterConfig } from '../internal/router'

const props = defineProps<RouterConfig>()
provide(routerContext, props)
</script>

<template><slot /></template>
