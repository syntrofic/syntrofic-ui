<script setup lang="ts">
import { useLayerCollisionPadding } from './layer-context'
import { noteOutsidePress } from './backdrop-press'
import { computed, useId, useTemplateRef } from 'vue'
import { ComboboxContent, ComboboxGroup, ComboboxItem, ComboboxLabel, ComboboxViewport } from 'reka-ui'
import { groupOptions } from './collection'
import { useCollectionContentMotion } from './collection-motion'
import type { SelectOption } from '../types'
import SEmptyState from '../components/SEmptyState.vue'
import SSpinner from '../components/SSpinner.vue'
import STypeaheadItem from '../components/STypeaheadItem.vue'

const props = defineProps<{
  options: readonly SelectOption[]
  loading?: boolean
  loadingText: string
  emptyText: string
  useLabelForValue?: boolean
}>()
const groups = computed(() => groupOptions(props.options))
const id = `sy-candidate-${useId()}`
const emit = defineEmits<{ select: [option: SelectOption] }>()
defineSlots<{ option?(scope: { option: SelectOption }): unknown }>()
const collisionPadding = useLayerCollisionPadding(10)
const resultFrame = useTemplateRef<HTMLElement>('resultFrame')
const noOptions: readonly SelectOption[] = []
useCollectionContentMotion(resultFrame, () => props.loading ? `loading:${props.loadingText}` : props.options.length ? 'results' : `empty:${props.emptyText}`,
  { items: () => props.loading ? noOptions : props.options })
</script>

<template>
  <ComboboxContent
    class="sy-floating-panel sy-candidates"
    position="popper"
    :side-offset="6"
    :collision-padding="collisionPadding"
    :aria-busy="loading || undefined"
    @pointer-down-outside="noteOutsidePress($event, resultFrame)"
  >
    <ComboboxViewport>
      <div ref="resultFrame" class="sy-collection-content">
        <div class="sy-collection-content__body">
          <SEmptyState v-if="loading" role="status" :title="loadingText">
            <template #media><SSpinner decorative size="sm" /></template>
          </SEmptyState>
          <SEmptyState v-else-if="!options.length" role="status" :title="emptyText" />
          <ComboboxGroup v-for="([heading, items], index) in groups" v-else :key="heading ?? index" class="sy-collection__section">
            <ComboboxLabel v-if="heading" class="sy-collection-header">{{ heading }}</ComboboxLabel>
            <ComboboxItem
              v-for="option in items"
              :key="option.value"
              :value="useLabelForValue ? option.label : option.value"
              :disabled="option.disabled"
              :aria-label="option.label"
              :aria-describedby="option.description ? `${id}-${encodeURIComponent(option.value)}` : undefined"
              class="sy-collection__option"
              @select="emit('select', option)"
            >
              <slot name="option" :option="option"><STypeaheadItem :item="option" /></slot>
              <span v-if="option.description" :id="`${id}-${encodeURIComponent(option.value)}`" hidden>{{ option.description }}</span>
              <span class="sy-collection__mark" aria-hidden="true"></span>
            </ComboboxItem>
          </ComboboxGroup>
        </div>
      </div>
    </ComboboxViewport>
  </ComboboxContent>
</template>
