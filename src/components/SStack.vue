<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { layoutDimensions, layoutPadding, layoutPaddingContext, layoutSize, type LayoutDimensions, type LayoutPadding } from '../internal/layout-spacing'

type CrossAlignment = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type AxisAlignment = CrossAlignment | 'between' | 'around' | 'evenly'
const mainAlignment = { between: 'space-between', around: 'space-around', evenly: 'space-evenly' } as const
const props = withDefaults(defineProps<LayoutDimensions & LayoutPadding & {
  as?: string
  direction?: 'horizontal' | 'vertical'
  gap?: number | string
  align?: CrossAlignment
  justify?: AxisAlignment | 'space-between' | 'space-around' | 'space-evenly'
  hAlign?: AxisAlignment
  vAlign?: AxisAlignment
  wrap?: boolean | 'nowrap' | 'wrap' | 'wrap-reverse'
  scrollable?: boolean
}>(), { as: 'div', direction: 'vertical' })
const horizontal = computed(() => props.direction === 'horizontal')
const insets = computed(() => layoutPadding(props))
const outerInsets = inject(layoutPaddingContext, undefined)
const ownsPadding = computed(() => Object.keys(insets.value).some(property => props[property as keyof LayoutPadding] !== undefined)
  || props.padding !== undefined || props.paddingInline !== undefined || props.paddingBlock !== undefined)
provide(layoutPaddingContext, computed(() => ownsPadding.value ? insets.value : outerInsets?.value ?? insets.value))
const style = computed(() => {
  const main = props.justify ?? (horizontal.value ? props.hAlign : props.vAlign)
  const cross = props.align ?? (horizontal.value ? props.vAlign : props.hAlign)
  return {
    ...layoutDimensions(props), ...(ownsPadding.value ? insets.value : {}), gap: layoutSize(props.gap),
    justifyContent: main && (mainAlignment[main as keyof typeof mainAlignment] ?? main),
    alignItems: cross,
  }
})
</script>

<template>
  <component :is="as" class="sy-stack" :data-direction="direction" :data-wrap="wrap === true ? 'wrap' : wrap || undefined"
    :data-scrollable="scrollable || undefined" :style="style">
    <slot />
  </component>
</template>
