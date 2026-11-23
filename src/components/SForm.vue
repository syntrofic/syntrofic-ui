<script setup lang="ts">
import { useTemplateRef } from 'vue'

const props = defineProps<{ native?: boolean; noValidate?: boolean }>()
const emit = defineEmits<{
  submit: [event: SubmitEvent, data: FormData]
  reset: [event: Event]
}>()
const form = useTemplateRef<HTMLFormElement>('form')
defineExpose({ form })

function submit(event: SubmitEvent) {
  if (!props.native) event.preventDefault()
  if (form.value) emit('submit', event, new FormData(form.value, event.submitter ?? undefined))
}
</script>

<template>
  <form ref="form" class="sy-form" :novalidate="noValidate" @submit="submit" @reset="emit('reset', $event)">
    <slot />
  </form>
</template>
