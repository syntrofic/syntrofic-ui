<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useIndicatorFocusRing } from '../internal/element-behavior'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  kind?: 'checkbox' | 'radio' | 'check'
  state?: 'off' | 'on' | 'mixed'
  size?: 16 | 20 | 24
  disabled?: boolean
}>(), { kind: 'checkbox', state: 'off', size: 20 })
const root = useTemplateRef<HTMLElement>('indicator')
const ring = useIndicatorFocusRing(root, () => Boolean(props.disabled))
</script>

<template>
  <span ref="indicator" v-bind="ring" class="sy-indicator" :data-kind="kind" :data-state="state" :data-disabled="disabled || undefined"
    :style="{ '--sy-indicator-size': size + 'px' }" aria-hidden="true">
    <slot :state="state">
      <SIcon v-if="state !== 'off' && kind !== 'radio'" :name="state === 'mixed' ? 'minus' : 'check'" />
      <span v-else-if="state !== 'off'" />
    </slot>
  </span>
</template>
