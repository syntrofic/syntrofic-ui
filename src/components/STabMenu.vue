<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { Primitive, RovingFocusItem } from 'reka-ui'
import type { TabItem } from '../types'
import SIcon from './SIcon.vue'
import SMenu from './SMenu.vue'
import SMenuRadioGroup from './SMenuRadioGroup.vue'
import SMenuRadioItem from './SMenuRadioItem.vue'
import SMenuSection from './SMenuSection.vue'
import SMotionText from './SMotionText.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ label: string; options: readonly TabItem[]; inTabList?: boolean; direction?: 'ltr' | 'rtl' }>()
const value = defineModel<string>()
const open = defineModel<boolean>('open')
const attrs = useAttrs()
const active = computed(() => props.options.find(option => option.value === value.value && !option.disabled))
const disabled = computed(() => !props.options.some(option => !option.disabled))

function triggerAttrs() {
  const own = new Set(['role', 'tabindex', 'tabIndex', 'type', 'aria-haspopup', 'aria-expanded', 'aria-controls'])
  return Object.fromEntries(Object.entries(attrs).filter(([name]) => !own.has(name)))
}
</script>

<template>
  <SMenu v-model:open="open" :menu-label="label" :direction="direction" :disabled="disabled">
    <template #trigger>
      <component :is="inTabList ? RovingFocusItem : Primitive" as-child
        :active="inTabList ? Boolean(active) : undefined" :focusable="inTabList ? !disabled : undefined">
        <button v-bind="triggerAttrs()" type="button" class="sy-tabs__trigger sy-tab-menu" :disabled="disabled"
          :data-tab-selected="Boolean(active) || undefined" :data-disabled="disabled ? '' : undefined">
          <SIcon v-if="active?.selectedIcon ?? active?.icon" :name="active?.selectedIcon ?? active?.icon" size="sm" />
          <SMotionText :value="active?.label ?? label" /><SIcon name="chevron" class="sy-top-nav-menu__chevron" />
        </button>
      </component>
    </template>
    <SMenuSection :label="label">
      <SMenuRadioGroup v-model="value">
        <SMenuRadioItem v-for="option in options" :key="option.value" :value="option.value" :label="option.label"
          :disabled="option.disabled" close-on-select />
      </SMenuRadioGroup>
    </SMenuSection>
  </SMenu>
</template>
