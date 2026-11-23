<script setup lang="ts">
import { AccessibilityState } from '@nativescript/core'
import { computed, nextTick } from 'nativescript-vue'
import type { NativeCollectionNavigation } from '../collection-keys'
import { isSelected, type NativeCollectionKey, type NativeSelectionMode } from '../collection-state'
import { useNativeUI } from '../context'
import { nativeIconGlyphs } from '../icon-glyphs'
import { adjacentMenuItem, type NativeMenuItem, type NativeMenuSection } from '../menu-state'
import SNativeDescription from './SNativeDescription.vue'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeSeparator from './SNativeSeparator.vue'
import SNativeText from './SNativeText.vue'

const props = defineProps<{
  groups: readonly NativeMenuSection[]
  selected: readonly NativeCollectionKey[]
  selectionMode: NativeSelectionMode
  indicator: 'check' | 'dot' | 'none'
}>()
const emit = defineEmits<{
  activate: [item: NativeMenuItem, group: NativeMenuSection]
  back: []
}>()
const { theme, direction } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
const controls = new Map<NativeCollectionKey, InstanceType<typeof SNativePressableFeedback>>()
const entries = computed(() => props.groups.flatMap(group => group.disabled ? [] : group.items))
const presentation = computed(() => props.indicator !== 'none' || entries.value.some(item => Boolean(item.children?.length)))

function indicatorGlyph(item: NativeMenuItem, group: NativeMenuSection) {
  if (item.children?.length) return nativeIconGlyphs[rtl.value ? 'chevron-left' : 'chevron-right']
  if (item.action || (group.selectionMode ?? props.selectionMode) === 'none' || !isSelected(props.selected, item.id)) return ''
  if (props.indicator === 'none') return ''
  return nativeIconGlyphs[props.indicator]
}

function record(id: NativeCollectionKey, instance: unknown) {
  if (instance) controls.set(id, instance as InstanceType<typeof SNativePressableFeedback>)
  else controls.delete(id)
}

async function focus(id?: NativeCollectionKey) {
  await nextTick()
  const target = entries.value.find(item => !item.disabled && Object.is(item.id, id))
    ?? entries.value.find(item => !item.disabled && isSelected(props.selected, item.id))
    ?? adjacentMenuItem(entries.value, undefined, 'first')
  if (target) controls.get(target.id)?.focus()
}

function navigate(item: NativeMenuItem, group: NativeMenuSection, key: NativeCollectionNavigation) {
  if (key === 'escape' || key === (rtl.value ? 'right' : 'left')) {
    emit('back')
    return true
  }
  if (key === (rtl.value ? 'left' : 'right')) {
    if (item.children?.length) emit('activate', item, group)
    return Boolean(item.children?.length)
  }
  if (key === 'left' || key === 'right') return false
  const target = adjacentMenuItem(entries.value, item.id, key)
  if (target) void focus(target.id)
  return Boolean(target)
}

defineExpose({ focus })
</script>

<template>
  <StackLayout>
    <StackLayout v-for="(group, groupIndex) in groups" :key="group.id">
      <SNativeSeparator v-if="groupIndex" marginTop="4" marginBottom="4" />
      <SNativeDescription v-if="group.label" :text="group.label" padding="5 8" />
      <SNativePressableFeedback
        v-for="item in group.items"
        :key="item.id"
        :ref="(instance: unknown) => record(item.id, instance)"
        :label="item.label"
        :disabled="group.disabled || item.disabled"
        :accessibilityHint="item.description"
        :accessibilityState="!item.action && (group.selectionMode ?? selectionMode) !== 'none' && isSelected(selected, item.id) ? AccessibilityState.Selected : undefined"
        :fill="!item.action && (group.selectionMode ?? selectionMode) !== 'none' && isSelected(selected, item.id) ? theme.colors.accentSoft : 'transparent'"
        :pressFill="item.tone === 'danger' ? theme.colors.dangerSoft : theme.colors.surfaceMuted"
        :paddingInline="theme.geometry.space2"
        :navigate="key => navigate(item, group, key)"
        @tap="emit('activate', item, group)"
      >
        <GridLayout :columns="presentation ? rtl ? '20,auto,*' : '*,auto,20' : rtl ? 'auto,*' : '*,auto'" direction="ltr">
          <StackLayout :col="rtl ? presentation ? 2 : 1 : 0" verticalAlignment="middle">
            <slot :item="item" :selected="isSelected(selected, item.id)">
              <SNativeText :text="item.label" :tone="item.tone ?? 'default'" />
              <SNativeDescription v-if="item.description" :text="item.description" marginTop="2" />
            </slot>
          </StackLayout>
          <SNativeDescription v-if="item.meta" :col="rtl && !presentation ? 0 : 1" :text="item.meta" margin="0 6" verticalAlignment="middle" />
          <GridLayout
            v-if="presentation"
            :col="rtl ? 0 : 2"
            :accessibilityHidden="true"
            verticalAlignment="middle"
          >
            <SNativeMotionGlyph
              :text="indicatorGlyph(item, group)"
              :color="theme.colors.accentText"
              :cellWidth="20"
              :size="15"
              :numeric="false"
              vector
              horizontalAlignment="center"
            />
          </GridLayout>
        </GridLayout>
      </SNativePressableFeedback>
    </StackLayout>
  </StackLayout>
</template>
