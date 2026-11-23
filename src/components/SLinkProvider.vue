<script setup lang="ts">
import { computed, provide } from 'vue'
import { linkComponentContext, type LinkComponent } from '../internal/link-component'

const props = defineProps<{ component: LinkComponent }>()
provide(linkComponentContext, computed(() => props.component))
</script>

<template><slot /></template>
