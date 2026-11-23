<script setup lang="ts">
import { defineComponent } from 'vue'
import SIcon from '../components/SIcon.vue'
import { useTranslator } from '../rac/locale'
import type { SemanticIconSize } from './icons'
import type { FieldStatus } from './status-icon'
import { useTooltip } from './tooltip'

const props = defineProps<{ id: string; status: FieldStatus; size: SemanticIconSize | number | string }>()
const label = useTranslator({
  'input.status.error': 'Validation error', 'input.status.warning': 'Validation warning',
  'input.status.success': 'Validation successful', 'input.status.info': 'Validation information',
})
const tooltip = useTooltip({ delay: 100, hideDelay: 120, touchTrigger: 'tap' })
const Tooltip = defineComponent(() => () => tooltip.renderTooltip(props.status.message, { offset: 4 }))
</script>

<template>
  <span class="sy-field-status-tip" :data-status="status.type">
    <button :ref="tooltip.ref" class="sy-field-status-icon" type="button"
      :aria-label="status.label ?? label('input.status.' + status.type)" :aria-describedby="id">
      <SIcon :name="status.type" :size="size" />
    </button>
    <span :id="id" class="sy-visually-hidden">{{ status.message }}</span>
    <Tooltip />
  </span>
</template>
