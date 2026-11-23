<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { weightedIconSpriteContext, type IconWeight, type WeightedIconDefinition } from '../internal/weighted-icon'

const props = defineProps<{ icons: readonly WeightedIconDefinition[] }>()
const id = `sy-weighted-sprite-${useId()}`
const uniqueIcons = computed(() => new Map(props.icons.map(icon => [icon.id, icon])))
const symbol = (name: string, weight: IconWeight | string) => `${id}-${name}-${weight}`
provide(weightedIconSpriteContext, (name, weight) => uniqueIcons.value.get(name)?.drawings[weight]?.length ? symbol(name, weight) : undefined)
</script>

<template>
  <svg class="sy-weighted-icon-sprite" aria-hidden="true" focusable="false">
    <defs>
      <template v-for="icon in uniqueIcons.values()" :key="icon.id">
        <symbol v-for="(drawing, weight) in icon.drawings" :id="symbol(icon.id, weight)" :key="weight" :viewBox="icon.viewBox">
          <path v-for="(path, index) in drawing" :key="index" :d="path.d" :fill="path.fill ?? 'currentColor'" :stroke="path.stroke"
            :stroke-width="path.strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
        </symbol>
      </template>
    </defs>
  </svg>
  <slot />
</template>
