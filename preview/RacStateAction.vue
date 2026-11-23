<script setup lang="ts">
import { useDisclosureState, useOverlayTriggerState } from '../src/rac'
import { SButton } from '../src'

const props = defineProps<{ kind: 'disclosure' | 'overlay' }>()
const controller = props.kind === 'disclosure' ? useDisclosureState() : useOverlayTriggerState()
</script>

<template>
  <SButton v-if="controller" size="sm" variant="secondary" @click="controller.close()">
    {{ kind === 'disclosure' ? '收起说明' : '关闭快捷面板' }}
  </SButton>
</template>
