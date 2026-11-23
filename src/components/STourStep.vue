<script setup lang="ts">
import { computed, inject, onScopeDispose, useId, useSlots } from 'vue'
import { tourContext, type TourStep } from '../internal/tour'

const props = defineProps<Omit<TourStep, 'id'> & { id?: string }>()
const id = useId()
const slots = useSlots()
const register = inject(tourContext, undefined)
if (register) onScopeDispose(register({ step: computed(() => ({ ...props, id: props.id ?? id })), content: slots.default }))
</script>

<template><span hidden aria-hidden="true" /></template>
