<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { writeClipboard } from '../internal/clipboard'
import SButton from './SButton.vue'
import SCode from './SCode.vue'
import SMotionText from './SMotionText.vue'
const props = withDefaults(defineProps<{ value: string; copyLabel?: string; copiedLabel?: string; errorLabel?: string }>(),
  { copyLabel: 'Copy', copiedLabel: 'Copied', errorLabel: 'Copy failed' })
const state = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  clearTimeout(timer)
  try { await writeClipboard(props.value, document); state.value = props.copiedLabel }
  catch { state.value = props.errorLabel }
  timer = setTimeout(() => { state.value = '' }, 1600)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <div class="sy-snippet">
    <SCode>{{ value }}</SCode>
    <SButton variant="ghost" size="sm" :aria-label="copyLabel" @click="copy">
      <SMotionText :value="state || copyLabel" announce />
    </SButton>
  </div>
</template>
