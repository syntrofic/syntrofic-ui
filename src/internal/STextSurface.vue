<script setup lang="ts">
import { useSlots, type VNode } from 'vue'
import SIcon from '../components/SIcon.vue'
import SSpinner from '../components/SSpinner.vue'
import { useTranslator } from '../rac/locale'

defineProps<{
  startIcon?: string
  clearable?: boolean
  clearVisible?: boolean
  clearLabel?: string
  reserveLoading?: boolean
  busy?: boolean
  statusIcon?: VNode | null
}>()
const emit = defineEmits<{ clear: [event: MouseEvent] }>()
const slots = useSlots()
const translate = useTranslator({ 'field.clear': 'Clear input' })
</script>

<template>
  <div class="sy-field__status-control" :data-affix="(startIcon || slots.start || slots.end || reserveLoading || clearable || statusIcon || slots.footer) ? '' : undefined"
    :data-leading="Boolean(startIcon || slots.start) || undefined" :data-footer="Boolean(slots.footer) || undefined"
    :style="{ '--sy-field-affixes': Number(Boolean(slots.end)) + Number(Boolean(reserveLoading)) + Number(Boolean(clearable)) + Number(Boolean(statusIcon)) }">
    <slot />
    <span v-if="startIcon || slots.start" class="sy-field__leading" aria-hidden="true"><slot name="start"><SIcon :name="startIcon" size="sm" /></slot></span>
    <div v-if="slots.end || reserveLoading || clearable || statusIcon" class="sy-field__actions">
      <span v-if="reserveLoading" class="sy-field__affix sy-field__load" :data-visible="busy || undefined" aria-hidden="true">
        <SSpinner size="sm" decorative />
      </span>
      <button v-if="clearable" type="button" class="sy-field__affix sy-field__clear" :data-visible="clearVisible || undefined"
        :aria-hidden="!clearVisible || undefined" :tabindex="clearVisible ? undefined : -1" :aria-label="clearLabel ?? translate('field.clear')"
        @pointerdown.prevent @click="emit('clear', $event)">
        <SIcon name="close" size="sm" />
      </button>
      <span v-if="slots.end" class="sy-field__affix"><slot name="end" /></span>
      <span v-if="statusIcon" class="sy-field__affix"><component :is="statusIcon" /></span>
    </div>
    <div v-if="slots.footer" class="sy-field__footer"><slot name="footer" /></div>
  </div>
</template>
