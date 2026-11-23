<script setup lang="ts">
import { defineComponent } from 'vue'
import SButton from '../components/SButton.vue'
import SIcon from '../components/SIcon.vue'
import { useTooltip } from './tooltip'

const props = defineProps<{ label: string; text: string }>()
const tooltip = useTooltip({ delay: 340, hideDelay: 100, touchTrigger: 'tap' })
const Tip = defineComponent(() => () => tooltip.renderTooltip(props.text))
</script>

<template>
  <SButton :ref="tooltip.ref" icon-only size="sm" variant="ghost" class="sy-field__label-tip"
    :aria-label="label" :aria-describedby="tooltip.isOpen.value ? tooltip.describedBy : undefined">
    <template #start><SIcon name="info" /></template>
  </SButton>
  <Tip />
</template>
