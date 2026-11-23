<script setup lang="ts">
import { computed } from 'nativescript-vue'
import type { NativeCollectionItem } from '../collection-state'
import { useNativeUI } from '../context'
import SNativeText from './SNativeText.vue'

export interface NativeTimelineItem extends NativeCollectionItem {
  time?: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  status?: string
}
const props = withDefaults(defineProps<{
  items: readonly NativeTimelineItem[]
  label?: string
  orientation?: 'vertical' | 'horizontal'
  compact?: boolean
  itemWidth?: number
}>(), { orientation: 'vertical', itemWidth: 132 })
defineSlots<{
  leading(props: { item: NativeTimelineItem }): unknown
  marker(props: { item: NativeTimelineItem; color: string }): unknown
  item(props: { item: NativeTimelineItem }): unknown
}>()
const { theme, direction } = useNativeUI()
const horizontal = computed(() => props.orientation === 'horizontal')
const reversed = computed(() => direction.value === 'rtl')
const time = computed(() => props.items.some(item => item.time))
const entries = computed(() => horizontal.value && reversed.value ? [...props.items].reverse() : props.items)
function color(item: NativeTimelineItem) {
  return !item.tone || item.tone === 'neutral' ? theme.value.colors.borderStrong : theme.value.colors[item.tone]
}
</script>

<template>
  <StackLayout>
    <SNativeText v-if="label" :text="label" heading marginBottom="6" />
    <component :is="horizontal ? 'ScrollView' : 'ContentView'" :orientation="horizontal ? 'horizontal' : undefined">
      <StackLayout :orientation="orientation">
        <GridLayout v-for="(item, index) in entries" :key="item.id" :width="horizontal ? itemWidth : undefined"
          :columns="horizontal ? '*' : reversed ? '*,18,auto' : 'auto,18,*'"
          :rows="horizontal ? 'auto,18,auto' : '*'" :minHeight="compact ? 47 : 57">
          <GridLayout :row="0" :col="!horizontal && reversed ? 2 : 0" :minWidth="!horizontal && time ? 46 : 0">
            <slot name="leading" :item="item"><SNativeText v-if="item.time" :text="item.time" tone="muted" size="caption" marginTop="4" /></slot>
          </GridLayout>
          <GridLayout :row="horizontal ? 1 : 0" :col="horizontal ? 0 : 1" :accessibilityHidden="true">
            <GridLayout v-if="index < entries.length - 1 || index > 0"
              :width="horizontal ? undefined : 1" :height="horizontal ? 1 : undefined" :marginTop="!horizontal && index === 0 ? 13 : 0"
              :verticalAlignment="horizontal ? 'middle' : 'stretch'" :horizontalAlignment="horizontal ? 'stretch' : 'center'"
              :visibility="!horizontal && index === entries.length - 1 ? 'hidden' : 'visible'" :backgroundColor="theme.colors.borderStrong" />
            <GridLayout v-if="!horizontal && index === entries.length - 1 && index > 0" width="1" height="12" verticalAlignment="top"
              horizontalAlignment="center" :backgroundColor="theme.colors.borderStrong" />
            <GridLayout :verticalAlignment="horizontal ? 'middle' : 'top'" :horizontalAlignment="horizontal ? 'left' : 'center'"
              :marginTop="horizontal ? 0 : 8">
              <slot name="marker" :item="item" :color="color(item)">
                <ContentView width="9" height="9" borderRadius="5" :backgroundColor="color(item)" />
              </slot>
            </GridLayout>
          </GridLayout>
          <StackLayout :row="horizontal ? 2 : 0" :col="horizontal || reversed ? 0 : 2" :paddingBottom="compact ? 4 : 8">
            <slot name="item" :item="item">
              <SNativeText :text="item.label" emphasized />
              <SNativeText v-if="item.status || item.description" :text="[item.status, item.description].filter(Boolean).join(' · ')" tone="muted" size="caption" />
            </slot>
          </StackLayout>
        </GridLayout>
      </StackLayout>
    </component>
  </StackLayout>
</template>
