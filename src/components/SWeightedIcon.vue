<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'
import { nearestIconWeight, weightedIconSpriteContext, type IconWeight, type WeightedIconDefinition } from '../internal/weighted-icon'

const props = withDefaults(defineProps<{
  icon: WeightedIconDefinition
  weight?: IconWeight
  size?: number | string
  label?: string
  color?: 'primary' | 'secondary' | 'accent' | 'danger'
  sprite?: boolean
  mirror?: boolean
}>(), { size: 'md' })
const root = useTemplateRef<SVGSVGElement>('root')
const inherited = ref(400)
const sprite = inject(weightedIconSpriteContext, undefined)
const sizes = { xsm: 12, sm: 16, md: 20, lg: 24 }
const dimension = computed(() => typeof props.size === 'string' && Object.hasOwn(sizes, props.size) ? sizes[props.size as keyof typeof sizes] : props.size)
const weight = computed(() => nearestIconWeight(props.icon, props.weight ?? inherited.value))
const reference = computed(() => props.sprite ? sprite?.(props.icon.id, weight.value) : undefined)

watch([root, () => props.weight], ([node, pinned], _, cleanup) => {
  const view = node?.ownerDocument.defaultView
  if (!view || !node || pinned) return
  function read() {
    const style = view!.getComputedStyle(node!).fontWeight
    inherited.value = style === 'bold' ? 700 : Number.parseFloat(style) || 400
  }
  const observer = new view.MutationObserver(read)
  for (let parent: Element | null = node; parent; parent = parent.parentElement) {
    observer.observe(parent, { attributes: true, attributeFilter: ['style', 'class', 'data-sy-theme', 'data-sy-brand'] })
  }
  view.addEventListener('resize', read)
  read()
  cleanup(() => { observer.disconnect(); view.removeEventListener('resize', read) })
}, { flush: 'post' })
</script>

<template>
  <svg ref="root" class="sy-icon sy-weighted-icon" :width="dimension" :height="dimension" :viewBox="icon.viewBox" :data-weight="weight"
    :data-color="color" :data-mirror="mirror || undefined" :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : true" focusable="false">
    <use v-if="reference" :href="'#' + reference" />
    <path v-for="(path, index) in reference ? [] : icon.drawings[weight]" :key="index" :d="path.d" :fill="path.fill ?? 'currentColor'"
      :stroke="path.stroke" :stroke-width="path.strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
