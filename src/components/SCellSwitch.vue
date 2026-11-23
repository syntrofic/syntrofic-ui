<script setup lang="ts">
import { useId } from 'vue'
import SSwitch from './SSwitch.vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  label: string
  description?: string
  name?: string
  form?: string
  value?: string | number
  disabled?: boolean
  required?: boolean
  variant?: 'default' | 'secondary'
}>(), { variant: 'default' })
const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ change: [checked: boolean] }>()
const id = useId()

function focusOnPress(event: MouseEvent) {
  const input = event.currentTarget as HTMLInputElement
  if (event.detail > 0 && input.ownerDocument.activeElement !== input) input.focus({ preventScroll: true })
}
</script>

<template>
  <div class="sy-settings-cell sy-cell-switch" :data-variant="variant">
    <SSwitch v-model="model" v-bind="$attrs" :name="name" :form="form" :value="value" :disabled="disabled" :required="required"
      :aria-labelledby="id" :aria-describedby="description ? id + '-hint' : undefined"
      @click="focusOnPress" @change="emit('change', ($event.target as HTMLInputElement).checked)">
      <span :id="id" class="sy-settings-cell__label">{{ label }}</span>
      <span v-if="description" :id="id + '-hint'" class="sy-settings-cell__hint">{{ description }}</span>
    </SSwitch>
  </div>
</template>
