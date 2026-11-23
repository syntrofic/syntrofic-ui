<script setup lang="ts">
import { AccessibilityRole, AccessibilityState, Utils } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import SNativeDescription from './SNativeDescription.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  meta?: string
  href?: string
  interactive?: boolean
  selected?: boolean
  highlighted?: boolean
  disabled?: boolean
  align?: 'center' | 'start' | 'first-line'
  density?: 'compact' | 'balanced' | 'spacious'
  layout?: 'stacked' | 'inline'
}>(), { align: 'center', density: 'balanced', layout: 'stacked' })
const emit = defineEmits<{ activate: []; tap: [] }>()
const { theme, direction } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
const actionable = computed(() => Boolean(props.interactive || props.href))
const padding = computed(() => props.density === 'compact' ? theme.value.geometry.space1
  : props.density === 'spacious' ? theme.value.geometry.space3 : theme.value.geometry.space2)
const fill = computed(() => props.selected ? theme.value.colors.accentSoft
  : props.highlighted ? theme.value.colors.surfaceMuted : 'transparent')
const alignment = computed(() => props.align === 'center' ? 'middle' : 'top')
const chrome = computed(() => actionable.value ? {
  label: props.label,
  role: props.href ? AccessibilityRole.Link : AccessibilityRole.Button,
  accessibilityHint: [props.description, props.meta].filter(Boolean).join(' ') || undefined,
  accessibilityState: props.selected ? AccessibilityState.Selected : undefined,
  disabled: props.disabled,
  fill: fill.value,
  pressFill: props.selected ? theme.value.colors.accentSoft : theme.value.colors.surfaceMuted,
  paddingInline: padding.value,
  paddingBlock: padding.value,
  onTap: activate,
} : {
  padding: padding.value,
  minHeight: 44,
  opacity: props.disabled ? 0.55 : 1,
  backgroundColor: fill.value,
})
function activate() {
  if (props.disabled) return
  emit('activate')
  emit('tap')
  if (props.href && /^(https?:\/\/|mailto:|tel:)/i.test(props.href)) Utils.openUrl(props.href)
}
</script>

<template>
  <GridLayout :columns="$slots.suffix || $slots.end ? rtl ? 'auto,*' : '*,auto' : '*'" direction="ltr">
    <component
      :is="actionable ? SNativePressableFeedback : 'GridLayout'"
      :col="($slots.suffix || $slots.end) && rtl ? 1 : 0"
      v-bind="chrome"
    >
      <GridLayout columns="auto,*,auto" direction="ltr">
        <StackLayout
          v-if="$slots.prefix || $slots.start || $slots.marker"
          :col="rtl ? 2 : 0"
          :marginLeft="rtl ? theme.geometry.space2 : 0"
          :marginRight="rtl ? 0 : theme.geometry.space2"
          :verticalAlignment="alignment"
          :marginTop="align === 'first-line' ? 2 : 0"
          orientation="horizontal"
        >
          <slot name="marker" />
          <slot name="start"><slot name="prefix" /></slot>
        </StackLayout>
        <StackLayout col="1" verticalAlignment="middle">
          <slot>
            <GridLayout v-if="layout === 'inline'" :columns="rtl ? '*,auto' : 'auto,*'" direction="ltr">
              <StackLayout :col="rtl ? 1 : 0">
                <slot name="label"><SNativeText :text="label" :tone="selected ? 'accent' : 'default'" :wrap="false" emphasized /></slot>
              </StackLayout>
              <StackLayout v-if="description || $slots.description" :col="rtl ? 0 : 1" :marginLeft="rtl ? 0 : 6" :marginRight="rtl ? 6 : 0" verticalAlignment="middle">
                <slot name="description"><SNativeText :text="description ?? ''" size="caption" tone="muted" :wrap="false" /></slot>
              </StackLayout>
            </GridLayout>
            <template v-else>
              <slot name="label"><SNativeText :text="label" :tone="selected ? 'accent' : 'default'" emphasized /></slot>
              <slot name="description"><SNativeDescription v-if="description" :text="description" marginTop="2" /></slot>
            </template>
          </slot>
        </StackLayout>
        <SNativeDescription
          v-if="meta"
          :col="rtl ? 0 : 2"
          :text="meta"
          :marginLeft="rtl ? 0 : theme.geometry.space2"
          :marginRight="rtl ? theme.geometry.space2 : 0"
          :verticalAlignment="alignment"
        />
      </GridLayout>
    </component>
    <StackLayout
      v-if="$slots.suffix || $slots.end"
      :col="rtl ? 0 : 1"
      orientation="horizontal"
      :verticalAlignment="alignment"
      :isUserInteractionEnabled="!disabled"
    ><slot name="end" :disabled="disabled"><slot name="suffix" :disabled="disabled" /></slot></StackLayout>
  </GridLayout>
</template>
