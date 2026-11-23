<script lang="ts">
export interface WidgetLegendItem {
  id: string
  label: string
  color?: string
}
</script>

<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  title?: string
  label?: string
  description?: string
  heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  as?: 'article' | 'section' | 'div'
  tone?: 'neutral' | 'sage' | 'blue' | 'sand'
  state?: 'ready' | 'loading' | 'empty' | 'error'
  statusLabel?: string
  minContentHeight?: string
  legend?: readonly WidgetLegendItem[]
  legendLabel?: string
  flush?: boolean
}>(), {
  heading: 'h3', as: 'section', tone: 'neutral', state: 'ready', legend: () => [], legendLabel: 'Legend',
  minContentHeight: '5rem',
})

const id = `sy-widget-${useId()}`
const messages = { ready: '', loading: 'Loading', empty: 'No data', error: 'Unable to load data' }
const root = useTemplateRef<HTMLElement>('root')
const body = useTemplateRef<HTMLDivElement>('body')

watch(() => props.state, () => {
  const node = root.value
  if (!node || !body.value?.contains(node.ownerDocument.activeElement)) return
  void nextTick(() => node.focus({ preventScroll: true }))
})
</script>

<template>
  <component :is="as" ref="root" class="sy-widget" :data-tone="tone" :data-state="state" tabindex="-1"
    :aria-label="label" :aria-labelledby="!label && (title || $slots.title) ? id : undefined"
    :aria-describedby="description || $slots.description ? `${id}-description` : undefined">
    <header v-if="title || description || $slots.title || $slots.description || $slots.actions || legend.length || $slots.legend"
      class="sy-widget__header">
      <div class="sy-widget__name">
        <component :is="heading" v-if="title || $slots.title" :id="id" class="sy-widget__title"><slot name="title">{{ title }}</slot></component>
        <p v-if="description || $slots.description" :id="`${id}-description`" class="sy-widget__description">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions || legend.length || $slots.legend" class="sy-widget__tools">
        <slot name="legend">
          <ul v-if="legend.length" class="sy-widget__legend" :aria-label="legendLabel" role="list">
            <li v-for="item in legend" :key="item.id"><span aria-hidden="true" :style="{ '--sy-widget-color': item.color }" />{{ item.label }}</li>
          </ul>
        </slot>
        <div v-if="$slots.actions" class="sy-widget__actions"><slot name="actions" /></div>
      </div>
    </header>
    <div ref="body" class="sy-widget__body" :data-flush="flush || undefined" :aria-busy="state === 'loading' || undefined"
      :style="{ '--sy-widget-min': minContentHeight }">
      <div class="sy-widget__data" :data-obscured="state !== 'ready' || undefined" :inert="state !== 'ready'"><slot /></div>
      <Transition name="sy-widget-state">
        <div v-if="state !== 'ready'" :key="state" class="sy-widget__state" :data-status="state">
          <slot :name="state" :label="statusLabel ?? messages[state]">
            <SSpinner v-if="state === 'loading'" decorative />
            <span>{{ statusLabel ?? messages[state] }}</span>
          </slot>
        </div>
      </Transition>
    </div>
    <span class="sy-visually-hidden" role="status">{{ state === 'ready' ? '' : statusLabel ?? messages[state] }}</span>
    <footer v-if="$slots.footer" class="sy-widget__footer"><slot name="footer" /></footer>
  </component>
</template>
