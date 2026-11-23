<script setup lang="ts">
import { reactive } from 'vue'
import SButton from '../components/SButton.vue'
import SCheckbox from '../components/SCheckbox.vue'
import SInput from '../components/SInput.vue'
import SSelect from '../components/SSelect.vue'
import SSwitch from '../components/SSwitch.vue'
import SToggleButton from '../components/SToggleButton.vue'
import type { AgentActionEvent, AgentField, AgentNode, AgentValue } from './schema'
const props = defineProps<{ node: AgentNode }>()
const emit = defineEmits<{ action: [event: AgentActionEvent] }>()
const values = reactive<Record<string, AgentValue>>(Object.create(null))
function put(field: AgentField, value: AgentValue | undefined) {
  if (field.type === 'number') values[field.id] = value !== '' && value !== null && Number.isFinite(Number(value)) ? Number(value) : null
  else values[field.id] = value ?? null
}
function send(action: string) {
  emit('action', { node: props.node.id, action, values: { ...values } })
}
function submit() { send(props.node.actions?.[0]?.id ?? 'submit') }
</script>

<template>
  <form class="sy-agent-fields" @submit.prevent="submit">
    <template v-for="field in node.fields" :key="field.id">
      <SSwitch v-if="node.kind === 'switch-group'" :model-value="Boolean(values[field.id])"
        @update:model-value="put(field, $event); send(field.id)">{{ field.label }}</SSwitch>
      <SToggleButton v-else-if="node.kind === 'toggle-group'" :model-value="Boolean(values[field.id])"
        @update:model-value="put(field, $event); send(field.id)">{{ field.label }}</SToggleButton>
      <SCheckbox v-else-if="field.type === 'checkbox'" :model-value="Boolean(values[field.id])" :required="field.required"
        @update:model-value="put(field, $event === true)">{{ field.label }}</SCheckbox>
      <SSelect v-else-if="field.type === 'select'" :label="field.label" :model-value="typeof values[field.id] === 'string' ? values[field.id] as string : undefined"
        :options="field.options?.map(value => ({ label: value, value })) ?? []" :required="field.required"
        @update:model-value="put(field, String($event ?? ''))" />
      <SInput v-else :label="field.label" :type="field.type === 'number' ? 'text' : field.type" :inputmode="field.type === 'number' ? 'decimal' : undefined" :model-value="String(values[field.id] ?? '')" :required="field.required"
        @update:model-value="put(field, $event)" />
    </template>
    <div v-if="node.kind === 'form'" class="sy-agent-actions">
      <SButton type="submit" size="sm">{{ node.actions?.[0]?.label ?? '提交' }}</SButton>
      <SButton v-for="action in node.actions?.slice(1)" :key="action.id" variant="secondary" size="sm" @click="send(action.id)">{{ action.label }}</SButton>
    </div>
  </form>
</template>
