<script lang="ts">
import type { SelectOption } from '../types'

export type SettingValue = string | boolean
interface SettingBase {
  id: string
  label: string
  description?: string
  keywords?: readonly string[]
  disabled?: boolean
}
export type SettingField = SettingBase & (
  | { type: 'text' | 'email' | 'url' | 'password' | 'switch' | 'shortcut' }
  | { type: 'select'; options: readonly SelectOption[] }
  | { type: 'custom' }
)
export interface SettingSection { id: string; label: string; description?: string; fields: readonly SettingField[] }
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import SKbd from '../components/SKbd.vue'
import SSearchField from '../components/SSearchField.vue'
import SSelect from '../components/SSelect.vue'
import SSwitch from '../components/SSwitch.vue'

const props = withDefaults(defineProps<{
  label: string
  sections: readonly SettingSection[]
  layout?: 'stack' | 'sidebar'
  labels?: Partial<Record<'search' | 'sections' | 'empty' | 'record' | 'recording' | 'clear' | 'conflict', string>>
}>(), { layout: 'stack' })
const value = defineModel<Record<string, SettingValue>>({ default: () => ({}) })
const active = defineModel<string>('section')
const emit = defineEmits<{ change: [field: SettingField, value: SettingValue] }>()
const query = ref('')
const recording = ref<string>()
const status = ref('')
const root = useTemplateRef<HTMLElement>('root')
const base = useId()
const i18n = computed(() => ({
  search: 'Search settings', sections: 'Settings sections', empty: 'No settings found',
  record: 'Record', recording: 'Press a shortcut', clear: 'Clear shortcut', conflict: 'This shortcut is already assigned.',
  ...props.labels,
}))
const fold = (text: string) => text.normalize('NFKC').toLocaleLowerCase().trim()
const found = computed(() => {
  const term = fold(query.value)
  if (!term) return props.sections
  return props.sections.flatMap(section => {
    if (fold([section.label, section.description].join(' ')).includes(term)) return [section]
    const fields = section.fields.filter(field => fold([field.label, field.description, ...field.keywords ?? []].join(' ')).includes(term))
    return fields.length ? [{ ...section, fields }] : []
  })
})
const selected = computed(() => found.value.find(section => section.id === active.value) ?? found.value[0])
const visible = computed(() => props.layout === 'stack' || query.value.trim() ? found.value : selected.value ? [selected.value] : [])

function update(field: SettingField, next: SettingValue | undefined) {
  if (field.disabled) return
  value.value = { ...value.value, [field.id]: next ?? '' }
  emit('change', field, next ?? '')
}
function stringValue(field: SettingField): string {
  const item = value.value[field.id]
  return typeof item === 'string' ? item : ''
}

async function navigate(id: string) {
  active.value = id
  query.value = ''
  await nextTick()
  root.value?.ownerDocument.getElementById(`${base}-${id}`)?.focus()
}

function record(event: KeyboardEvent, field: SettingField) {
  if (recording.value !== field.id || event.isComposing) return
  if (event.key === 'Tab') { recording.value = undefined; return }
  event.preventDefault()
  event.stopPropagation()
  if (event.key === 'Escape') { recording.value = undefined; return }
  if (['Control', 'Alt', 'Shift', 'Meta', 'Unidentified', 'Dead'].includes(event.key)) return
  const modifiers = [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta'].filter(Boolean)
  if (!modifiers.length) return
  const chord = [...modifiers, event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key].join(' + ')
  const conflict = props.sections.some(section => section.fields.some(other =>
    other.type === 'shortcut' && other.id !== field.id && stringValue(other) === chord))
  if (conflict) { status.value = i18n.value.conflict; return }
  status.value = ''
  recording.value = undefined
  update(field, chord)
}
</script>

<template>
  <section ref="root" class="sy-settings-workspace" :data-layout="layout" :aria-label="label">
    <SSearchField v-model="query" :label="i18n.search" />
    <div class="sy-settings-workspace__layout">
      <nav v-if="layout === 'sidebar' && !query.trim()" :aria-label="i18n.sections">
        <SButton v-for="section in sections" :key="section.id" variant="ghost" size="sm"
          :aria-current="selected?.id === section.id ? 'true' : undefined" @click="navigate(section.id)">
          {{ section.label }}
        </SButton>
      </nav>
      <div class="sy-settings-workspace__content">
        <p v-if="!visible.length" role="status">{{ i18n.empty }}</p>
        <section v-for="section in visible" :key="section.id" :aria-labelledby="`${base}-${section.id}`">
          <h3 :id="`${base}-${section.id}`" tabindex="-1">{{ section.label }}</h3>
          <p v-if="section.description">{{ section.description }}</p>
          <div v-for="field in section.fields" :key="field.id" class="sy-settings-workspace__row">
            <SSwitch v-if="field.type === 'switch'" :model-value="value[field.id] === true" :disabled="field.disabled"
              :aria-describedby="field.description ? `${base}-${field.id}-help` : undefined" @update:model-value="update(field, $event)">{{ field.label }}</SSwitch>
            <SSelect v-else-if="field.type === 'select'" :model-value="stringValue(field)" :options="field.options" :label="field.label"
              :description="field.description" :disabled="field.disabled" @update:model-value="update(field, $event)" />
            <div v-else-if="field.type === 'shortcut'" class="sy-settings-workspace__shortcut">
              <span>{{ field.label }}</span>
              <SKbd v-if="stringValue(field)">{{ stringValue(field) }}</SKbd>
              <SButton size="sm" variant="secondary" :disabled="field.disabled" :aria-label="`${i18n.record} · ${field.label}`"
                :aria-pressed="recording === field.id" @click="recording = field.id; status = ''"
                @keydown="record($event, field)" @blur="recording = undefined">
                {{ recording === field.id ? i18n.recording : i18n.record }}
              </SButton>
              <SButton v-if="stringValue(field)" size="sm" variant="ghost" :disabled="field.disabled"
                :aria-label="`${i18n.clear} · ${field.label}`" @click="update(field, '')">{{ i18n.clear }}</SButton>
            </div>
            <slot v-else-if="field.type === 'custom'" name="field" :field="field" :value="value[field.id]" :update="(next: SettingValue) => update(field, next)" />
            <SInput v-else :model-value="stringValue(field)" :label="field.label" :type="field.type"
              :description="field.description" :disabled="field.disabled" @update:model-value="update(field, $event)" />
            <p v-if="field.type === 'switch' && field.description" :id="`${base}-${field.id}-help`">{{ field.description }}</p>
          </div>
          <slot name="section" :section="section" />
        </section>
      </div>
    </div>
    <span class="sy-visually-hidden" role="status">{{ status }}</span>
  </section>
</template>
