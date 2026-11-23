<script setup lang="ts">
import { AccessibilityState, type Label } from '@nativescript/core'
import { computed, useTemplateRef, watch } from 'nativescript-vue'
import { isSelected, toggleCollectionSelection, type NativeAccordionItem, type NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { nativeIconFont, nativeIconGlyphs } from '../icon-glyphs'
import SNativeDescription from './SNativeDescription.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeAccordionItem[]
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  variant?: 'plain' | 'surface'
  expandedLabel?: string
  collapsedLabel?: string
}>(), { collapsible: true, variant: 'plain', expandedLabel: 'Expanded', collapsedLabel: 'Collapsed' })
const value = defineModel<NativeCollectionKey[]>({ default: () => [] })
const emit = defineEmits<{ change: [value: NativeCollectionKey[]] }>()
const { theme, direction } = useNativeUI()
const runMotion = useNativeMotion()
const indicators = new Map<NativeCollectionKey, Label>()
const rtl = computed(() => direction.value === 'rtl')
const expanded = computed(() => props.multiple ? value.value : value.value.slice(0, 1))
const initial = new Set(expanded.value)

function record(id: NativeCollectionKey, element: unknown) {
  if (element && typeof element === 'object' && 'nativeView' in element) {
    const label = element.nativeView as Label
    if (!indicators.has(id)) label.rotate = isSelected(expanded.value, id) ? 180 : 0
    indicators.set(id, label)
  } else indicators.delete(id)
}

watch(expanded, next => {
  runMotion(() => [...indicators].map(([key, target]) => ({
    target, rotate: isSelected(next, key) ? 180 : 0,
  })), 'state')
})

function toggle(item: NativeAccordionItem) {
  if (item.disabled || props.disabled) return
  const current = expanded.value
  const next = toggleCollectionSelection(current, item.id, props.multiple ? 'multiple' : 'single', props.collapsible)
  if (next.length === current.length && next.every((key, index) => Object.is(key, current[index]))) return
  value.value = next
  emit('change', next)
}
</script>

<template>
  <StackLayout>
    <StackLayout
      v-for="(item, index) in items"
      :key="item.id"
      :backgroundColor="variant === 'surface' ? theme.colors.surfaceMuted : 'transparent'"
      :borderRadius="theme.geometry.radiusMd" cornerShape="squircle"
      :marginTop="index && variant === 'surface' ? theme.geometry.space1 : 0"
    >
      <SNativePressableFeedback
        :label="item.label"
        :disabled="disabled || item.disabled"
        :accessibilityHint="item.description"
        :accessibilityState="isSelected(expanded, item.id) ? AccessibilityState.Selected : undefined"
        :accessibilityValue="isSelected(expanded, item.id) ? expandedLabel : collapsedLabel"
        :paddingInline="theme.geometry.space2"
        fill="transparent"
        @tap="toggle(item)"
      >
        <GridLayout :columns="rtl ? 'auto,*' : '*,auto'" direction="ltr">
          <StackLayout :col="rtl ? 1 : 0" verticalAlignment="middle">
            <slot name="trigger" :item="item" :expanded="isSelected(expanded, item.id)">
              <SNativeText :text="item.label" emphasized />
              <SNativeDescription v-if="item.description" :text="item.description" />
            </slot>
          </StackLayout>
          <GridLayout :col="rtl ? 0 : 1" :width="26" verticalAlignment="middle">
            <slot name="indicator" :item="item" :expanded="isSelected(expanded, item.id)">
              <Label
                :ref="(view: unknown) => record(item.id, view)"
                :text="nativeIconGlyphs.chevronDown"
                :fontFamily="nativeIconFont"
                :rotate="initial.has(item.id) ? 180 : 0"
                :color="theme.colors.textMuted"
                :fontSize="17"
                textAlignment="center"
              />
            </slot>
          </GridLayout>
        </GridLayout>
      </SNativePressableFeedback>
      <SNativeReveal :open="isSelected(expanded, item.id)">
        <StackLayout :paddingLeft="theme.geometry.space2" :paddingRight="theme.geometry.space2">
          <slot :item="item" :expanded="isSelected(expanded, item.id)">
            <SNativeText v-if="item.text" :text="item.text" :marginBottom="theme.geometry.space2" />
          </slot>
        </StackLayout>
      </SNativeReveal>
    </StackLayout>
  </StackLayout>
</template>
