<script setup lang="ts">
import { computed, useTemplateRef } from 'nativescript-vue'
import { socialProviders, type NativeSocialProvider } from '../action-state'
import type { NativeButtonSize, NativeButtonVariant } from '../button'
import SNativeButton from './SNativeButton.vue'
import SNativeMotionText from './SNativeMotionText.vue'

const props = withDefaults(defineProps<{
  provider: NativeSocialProvider
  label?: string
  formatLabel?: (provider: string) => string
  loadingLabel?: string
  errorLabel?: string
  status?: 'ready' | 'loading' | 'error'
  variant?: NativeButtonVariant
  size?: NativeButtonSize
  disabled?: boolean
  fullWidth?: boolean
}>(), { variant: 'secondary', size: 'md', status: 'ready' })
const emit = defineEmits<{ authenticate: [provider: NativeSocialProvider] }>()
defineSlots<{
  start(props: { provider: NativeSocialProvider; color: string }): unknown
  label(props: { provider: NativeSocialProvider; label: string; status: 'ready' | 'loading' | 'error'; color: string; size: number }): unknown
}>()
const button = useTemplateRef<InstanceType<typeof SNativeButton>>('button')
const name = computed(() => socialProviders[props.provider])
const idle = computed(() => props.label ?? props.formatLabel?.(name.value) ?? `Continue with ${name.value}`)
const loading = computed(() => props.loadingLabel ?? `Connecting to ${name.value}`)
const error = computed(() => props.errorLabel ?? `Retry ${name.value}`)
const display = computed(() => props.status === 'loading' ? loading.value : props.status === 'error' ? error.value : idle.value)
defineExpose({ focus: () => button.value?.focus() ?? false })
</script>

<template>
  <SNativeButton ref="button" :label="display" :accessibilityValue="status === 'error' ? error : undefined"
    :disabled="disabled" :size="size" :variant="variant" :fullWidth="fullWidth" :loading="status === 'loading'" :loadingLabel="loading"
    @tap="emit('authenticate', provider)">
    <template v-if="$slots.start" #start="{ color }"><slot name="start" :provider="provider" :color="color" /></template>
    <template #label="{ color, size: textSize }">
      <GridLayout>
        <Label v-for="(text, index) in [idle, loading, error]" :key="index" :text="text" :fontSize="textSize"
          fontWeight="600" textWrap="true" opacity="0" :accessibilityHidden="true" :iosAccessibilityAdjustsFontSize="true" />
        <slot name="label" :provider="provider" :label="display" :status="status" :color="color" :size="textSize">
          <SNativeMotionText :value="display" :size="textSize" :color="color" horizontalAlignment="center" verticalAlignment="middle" />
        </slot>
      </GridLayout>
    </template>
  </SNativeButton>
</template>
