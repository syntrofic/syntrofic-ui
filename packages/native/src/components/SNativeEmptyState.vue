<script setup lang="ts">
import { AccessibilityLiveRegion } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { useNativeUI } from '../context'
import type { NativeBackgroundTone } from '../material-state'
import { nativeGraphemeWidth } from '../text-platform'
import SNativeButton from './SNativeButton.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  actionLabel?: string
  secondaryLabel?: string
  tone?: NativeBackgroundTone
  state?: 'initial' | 'empty' | 'no-results' | 'error'
  align?: 'start' | 'center'
  padding?: number
  busy?: boolean
  announce?: boolean
}>(), { state: 'empty', align: 'start', padding: 12 })
const emit = defineEmits<{ action: []; 'secondary-action': [] }>()
defineSlots<{
  media(): unknown
  title(): unknown
  description(): unknown
  actions(): unknown
  default(): unknown
}>()
const { direction } = useNativeUI()
const fill = computed(() => props.tone ?? (props.state === 'error' ? 'muted' : 'base'))
const axis = computed(() => props.align === 'center' ? 'center' : direction.value === 'rtl' ? 'right' : 'left')
function buttonWidth(text = '') {
  return Math.min(190, Math.max(70, nativeGraphemeWidth(text, 13, false) + 28))
}
const primaryWidth = useActionMeter(computed(() => buttonWidth(props.actionLabel)), computed(() => false))
const secondaryWidth = useActionMeter(computed(() => buttonWidth(props.secondaryLabel)), computed(() => false))
const region = computed(() => !props.announce ? AccessibilityLiveRegion.None
  : props.state === 'error' ? AccessibilityLiveRegion.Assertive : AccessibilityLiveRegion.Polite)
</script>

<template>
  <SNativeSurface :tone="fill" :padding="padding">
    <StackLayout :horizontalAlignment="align === 'center' ? 'center' : 'stretch'">
      <GridLayout :columns="$slots.media ? 'auto,*' : '*'" :horizontalAlignment="align === 'center' ? 'center' : 'stretch'">
        <GridLayout v-if="$slots.media" verticalAlignment="middle" marginLeft="4" marginRight="8">
          <slot name="media" />
        </GridLayout>
        <StackLayout :col="$slots.media ? 1 : 0" :horizontalAlignment="align === 'center' ? 'center' : 'stretch'">
          <slot name="title">
            <SNativeText v-if="title" :text="title" :textAlignment="axis" :accessibilityLiveRegion="region" size="title" heading />
          </slot>
          <slot name="description">
            <SNativeText v-if="description" :text="description" :textAlignment="axis" tone="muted" marginTop="3" />
          </slot>
        </StackLayout>
      </GridLayout>
      <slot />
      <GridLayout v-if="$slots.actions || actionLabel || secondaryLabel" marginTop="9" :horizontalAlignment="axis">
        <slot name="actions">
          <WrapLayout orientation="horizontal">
            <SNativeButton v-if="actionLabel" :width="primaryWidth" :label="actionLabel" size="sm" :loading="busy" @tap="emit('action')">
              <template v-if="nativeGraphemeWidth(actionLabel, 13, false) <= 162" #label="{ label, color, size }"><SNativeMotionText :value="label" :color="color" :size="size" /></template>
            </SNativeButton>
            <SNativeButton v-if="secondaryLabel" :width="secondaryWidth" :label="secondaryLabel" size="sm" variant="ghost"
              :marginLeft="actionLabel && direction !== 'rtl' ? 6 : 0" :marginRight="actionLabel && direction === 'rtl' ? 6 : 0"
              @tap="emit('secondary-action')" />
          </WrapLayout>
        </slot>
      </GridLayout>
    </StackLayout>
  </SNativeSurface>
</template>
