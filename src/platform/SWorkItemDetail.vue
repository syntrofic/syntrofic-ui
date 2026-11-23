<script lang="ts">
import type { SelectOption } from '../types'
import type { MetadataEntry } from '../components/SMetadataList.vue'

export interface WorkSubtask { id: string; title: string; done: boolean }
export interface WorkAttachment { id: string; name: string; href?: string; detail?: string }
export interface WorkItemData {
  id: string
  title: string
  status: string
  description: string
  subtasks: readonly WorkSubtask[]
  attachments?: readonly WorkAttachment[]
  properties?: readonly MetadataEntry[]
  links?: readonly { id: string; title: string; href: string }[]
}
export interface WorkItemActivity { id: string; title: string; time?: Date | string | number }
export type WorkItemOption = SelectOption
</script>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import SButton from '../components/SButton.vue'
import SCheckbox from '../components/SCheckbox.vue'
import SComments, { type CommentThread } from '../components/SComments.vue'
import SFileInput from '../components/SFileInput.vue'
import SLink from '../components/SLink.vue'
import SMetadataList from '../components/SMetadataList.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SSelect from '../components/SSelect.vue'
import STimestamp from '../components/STimestamp.vue'
import STextArea from '../components/STextArea.vue'

const props = withDefaults(defineProps<{
  statuses: readonly WorkItemOption[]
  threads?: readonly CommentThread[]
  activity?: readonly WorkItemActivity[]
  locale?: string
  labels?: Partial<Record<'status' | 'description' | 'change' | 'save' | 'cancel' | 'checklist' | 'attachments' | 'properties' |
    'activity' | 'comments' | 'relations' | 'browse' | 'add', string>>
  labelsComments?: InstanceType<typeof SComments>['$props']['labels']
}>(), { activity: () => [], threads: () => [] })
const item = defineModel<WorkItemData>({ required: true })
const emit = defineEmits<{ attach: [files: readonly File[]]; comment: [value: string]; reply: [thread: CommentThread, value: string]; resolve: [thread: CommentThread, done: boolean] }>()
const id = useId()
const editing = ref(false)
const draft = ref<string>()
const uploads = ref<File[]>([])
const completed = computed(() => item.value.subtasks.filter(task => task.done).length)
const i18n = computed(() => ({
  status: 'Status', description: 'Description', change: 'Edit description', save: 'Save', cancel: 'Cancel',
  checklist: 'Subtasks', attachments: 'Attachments', properties: 'Details', activity: 'Activity', comments: 'Comments',
  relations: 'Related work', browse: 'Choose files', add: 'Attach files', ...props.labels,
}))
function taskChange(id: string, checked?: boolean) {
  item.value = { ...item.value, subtasks: item.value.subtasks.map(task => task.id === id ? { ...task, done: checked === true } : task) }
}
function edit() {
  draft.value = item.value.description
  editing.value = true
}
function save() {
  item.value = { ...item.value, description: draft.value?.trim() ?? '' }
  editing.value = false
}
function attach() {
  if (uploads.value.length) {
    emit('attach', [...uploads.value])
    uploads.value = []
  }
}
</script>

<template>
  <section class="sy-work-item" :aria-labelledby="id">
    <header class="sy-work-item__header">
      <h2 :id="id">{{ item.title }}</h2>
      <SSelect :label="i18n.status" :options="statuses" :model-value="item.status"
        @update:model-value="$event && (item = { ...item, status: $event })" />
    </header>
    <div class="sy-work-item__layout">
      <div class="sy-work-item__main">
        <section class="sy-work-item__panel">
          <h3>{{ i18n.description }}</h3>
          <form v-if="editing" @submit.prevent="save">
            <STextArea v-model="draft" :label="i18n.description" :rows="3" auto-grow />
            <div class="sy-work-item__actions">
              <SButton type="submit" size="sm">{{ i18n.save }}</SButton>
              <SButton size="sm" variant="secondary" @click="editing = false">{{ i18n.cancel }}</SButton>
            </div>
          </form>
          <template v-else>
            <slot name="description" :item="item"><p class="sy-work-item__description">{{ item.description }}</p></slot>
            <SButton size="sm" variant="ghost" @click="edit">{{ i18n.change }}</SButton>
          </template>
        </section>
        <section v-if="item.subtasks.length" class="sy-work-item__panel">
          <h3>{{ i18n.checklist }} · {{ completed }}/{{ item.subtasks.length }}</h3>
          <SProgressBar :value="completed" :max="item.subtasks.length" :label="i18n.checklist" size="sm" />
          <div class="sy-work-item__tasks">
            <SCheckbox v-for="task in item.subtasks" :key="task.id" :model-value="task.done"
              @update:model-value="taskChange(task.id, $event)">{{ task.title }}</SCheckbox>
          </div>
        </section>
        <section class="sy-work-item__panel">
          <h3>{{ i18n.attachments }}</h3>
          <ul v-if="item.attachments?.length" role="list">
            <li v-for="file in item.attachments" :key="file.id">
              <SLink v-if="file.href" :href="file.href">{{ file.name }}</SLink><span v-else>{{ file.name }}</span>
              <span v-if="file.detail">{{ file.detail }}</span>
            </li>
          </ul>
          <SFileInput v-model="uploads" :label="i18n.attachments" :browse-label="i18n.browse" multiple />
          <SButton size="sm" variant="secondary" :disabled="!uploads.length" @click="attach">{{ i18n.add }}</SButton>
        </section>
        <section v-if="activity.length" class="sy-work-item__panel">
          <h3>{{ i18n.activity }}</h3>
          <ul>
            <li v-for="event in activity" :key="event.id">{{ event.title }}
              <STimestamp v-if="event.time" :value="event.time" :locale="locale" :tooltip="false" format="date_time" />
            </li>
          </ul>
        </section>
        <section class="sy-work-item__panel">
          <h3>{{ i18n.comments }}</h3>
          <SComments :threads="threads" :label="i18n.comments" :labels="labelsComments" @create="emit('comment', $event)"
            @reply="(thread, value) => emit('reply', thread, value)" @resolve="(thread, done) => emit('resolve', thread, done)" />
        </section>
      </div>
      <aside class="sy-work-item__panel" :aria-label="i18n.properties">
        <h3>{{ i18n.properties }}</h3>
        <SMetadataList v-if="item.properties?.length" :items="item.properties" />
        <slot name="properties" :item="item" />
        <template v-if="item.links?.length">
          <h4>{{ i18n.relations }}</h4>
          <ul><li v-for="link in item.links" :key="link.id"><SLink :href="link.href">{{ link.title }}</SLink></li></ul>
        </template>
      </aside>
    </div>
  </section>
</template>
