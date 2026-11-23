<script setup lang="ts">
import SAccordion from '../components/SAccordion.vue'
import SButton from '../components/SButton.vue'
import SCheckbox from '../components/SCheckbox.vue'
import SIcon from '../components/SIcon.vue'
import SRadio from '../components/SRadio.vue'
import SRadioGroup from '../components/SRadioGroup.vue'
import SSeparator from '../components/SSeparator.vue'
import { replaceMenuSelection, toggleMenuSelection } from './menu-presentation'
import type { MenuEntry } from '../types'

const props = defineProps<{ items: readonly MenuEntry[]; selected: readonly string[] }>()
const emit = defineEmits<{ action: [id: string]; change: [value: string[]] }>()

function choose(items: readonly { id: string }[], id?: string) {
  if (id !== undefined) emit('change', replaceMenuSelection(props.selected, items, id))
}
</script>

<template>
  <div class="sy-menu-sheet__items">
    <template v-for="entry in items" :key="entry.id">
      <SSeparator v-if="entry.kind === 'separator'" class="sy-menu__separator" />
      <section v-else-if="entry.kind === 'section'" class="sy-menu-sheet__section" :aria-label="entry.label">
        <div v-if="entry.label" class="sy-menu-sheet__label" aria-hidden="true">{{ entry.label }}</div>
        <SMenuSheetItems :items="entry.items" :selected="selected" @action="emit('action', $event)" @change="emit('change', $event)" />
      </section>
      <SAccordion v-else-if="entry.kind === 'submenu'" :items="[{ value: entry.id, label: entry.label, disabled: entry.disabled }]">
        <template #content>
          <SMenuSheetItems :items="entry.items" :selected="selected" @action="emit('action', $event)" @change="emit('change', $event)" />
        </template>
      </SAccordion>
      <SRadioGroup v-else-if="entry.kind === 'radio-group'" :label="entry.label"
        :model-value="entry.items.find(item => selected.includes(item.id))?.id" @update:model-value="choose(entry.items, $event)">
        <SRadio v-for="item in entry.items" :key="item.id" :label="item.label" :value="item.id" :disabled="item.disabled" />
      </SRadioGroup>
      <SCheckbox v-else-if="entry.kind === 'checkbox'" :label="entry.label" :disabled="entry.disabled" :model-value="selected.includes(entry.id)"
        @update:model-value="emit('change', toggleMenuSelection(selected, entry.id, $event === true))" />
      <SButton v-else class="sy-menu-sheet__action" :variant="entry.tone === 'danger' ? 'danger' : 'ghost'"
        :disabled="entry.disabled" @click="emit('action', entry.id)">
        <template v-if="entry.icon" #start><SIcon :name="entry.icon" /></template>
        {{ entry.label }}
      </SButton>
    </template>
  </div>
</template>
