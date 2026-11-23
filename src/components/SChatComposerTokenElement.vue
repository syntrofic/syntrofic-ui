<script lang="ts">
import type { BadgeTone } from '../types'

export interface ChatComposerToken {
  id?: string
  value: string
  label?: string
  expandedText?: string
  tone?: BadgeTone | 'blue' | 'sage'
  icon?: string
}
</script>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { promptTokenAttributes } from '../chat/prompt-tokens'
import SIcon from './SIcon.vue'

const props = defineProps<{ token: ChatComposerToken }>()
const id = `sy-composer-token-${useId()}`
const bindings = computed(() => promptTokenAttributes({ ...props.token, id: props.token.id ?? id }))
</script>

<template>
  <span class="sy-prompt-input__token sy-chat-composer-token" v-bind="bindings" :data-tone="token.tone" contenteditable="false">
    <slot :token="token"><SIcon v-if="token.icon" :icon="token.icon" />{{ token.label ?? token.value }}</slot>
  </span>
</template>
