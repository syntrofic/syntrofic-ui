<script setup lang="ts">
import SContextMenuItem from '../components/SContextMenuItem.vue'
import SIcon from '../components/SIcon.vue'
import SMenuCheckboxItem from '../components/SMenuCheckboxItem.vue'
import SMenuItem from '../components/SMenuItem.vue'
import SMenuRadioGroup from '../components/SMenuRadioGroup.vue'
import SMenuRadioItem from '../components/SMenuRadioItem.vue'
import SMenuSection from '../components/SMenuSection.vue'
import SMenuSubmenu from '../components/SMenuSubmenu.vue'
import SSeparator from '../components/SSeparator.vue'
import type { MenuEntry } from '../types'
import { replaceMenuSelection, toggleMenuSelection } from './menu-presentation'

const props = defineProps<{
  items: readonly MenuEntry[]
  selected: readonly string[]
  context?: boolean
  target?: string | HTMLElement
  theme?: string
}>()
const emit = defineEmits<{ action: [id: string]; change: [value: string[]] }>()

function change(id: string, checked: boolean) {
  emit('change', toggleMenuSelection(props.selected, id, checked))
}

function selectRadio(items: readonly { id: string }[], id: unknown) {
  if (typeof id !== 'string') return
  emit('change', replaceMenuSelection(props.selected, items, id))
}
</script>

<template>
  <template v-for="entry in items" :key="entry.id">
    <SSeparator v-if="entry.kind === 'separator'" class="sy-menu__separator" />
    <SMenuSection v-else-if="entry.kind === 'section'" :label="entry.label">
      <SMenuItems :items="entry.items" :selected="selected" :context="context" :target="target" :theme="theme" @action="emit('action', $event)" @change="emit('change', $event)" />
    </SMenuSection>
    <SMenuSubmenu v-else-if="entry.kind === 'submenu'" :label="entry.label" :disabled="entry.disabled" :target="target" :theme="theme" :context="context">
      <SMenuItems :items="entry.items" :selected="selected" :context="context" :target="target" :theme="theme" @action="emit('action', $event)" @change="emit('change', $event)" />
    </SMenuSubmenu>
    <SMenuSection v-else-if="entry.kind === 'radio-group'" :label="entry.label">
      <SMenuRadioGroup
        :model-value="entry.items.find(item => selected.includes(item.id))?.id"
        @update:model-value="selectRadio(entry.items, $event)"
      >
        <SMenuRadioItem
          v-for="item in entry.items"
          :key="item.id"
          :value="item.id"
          :disabled="item.disabled"
          :label="item.label"
        />
      </SMenuRadioGroup>
    </SMenuSection>
    <SMenuCheckboxItem
      v-else-if="entry.kind === 'checkbox'"
      :label="entry.label"
      :disabled="entry.disabled"
      :model-value="selected.includes(entry.id)"
      @update:model-value="change(entry.id, $event === true)"
    />
    <component :is="context ? SContextMenuItem : SMenuItem"
      v-else
      :text-value="entry.label"
      :disabled="entry.disabled"
      :tone="entry.tone"
      @select="emit('action', entry.id)"
    ><SIcon v-if="entry.icon" :name="entry.icon" />{{ entry.label }}</component>
  </template>
</template>
