<script setup lang="ts">
import { computed } from 'vue'
import type { AvatarPerson } from './SAvatarGroup.vue'
import SAvatar from './SAvatar.vue'
import SStatusDot from './SStatusDot.vue'
import STooltip from './STooltip.vue'

const props = withDefaults(defineProps<{
  label: string
  participants: readonly AvatarPerson[]
  threadCount?: number
  unreadCount?: number
  size?: 'sm' | 'md' | 'lg'
  dimmed?: boolean
  resolved?: boolean
}>(), { size: 'sm', threadCount: 1, unreadCount: 0 })
const selected = defineModel<boolean>({ default: false })
const count = computed(() => Number.isFinite(props.threadCount) ? Math.max(1, Math.trunc(props.threadCount)) : 1)
const unique = computed(() => [...new Map(props.participants.map(person => [person.id, person])).values()])
const people = computed(() => count.value > 1 ? unique.value : unique.value.slice(0, 1))
const limit = computed(() => people.value.length > 3 ? 2 : people.value.length)
const unread = computed(() => Number.isFinite(props.unreadCount) && props.unreadCount >= 1)
</script>

<template>
  <STooltip v-if="!resolved || selected" :text="label">
    <template #trigger>
      <button class="sy-comment-pin" type="button" :aria-label="label" :aria-pressed="selected" :data-size="size"
        :data-dimmed="dimmed && !selected || undefined" @click="selected = !selected">
        <span aria-hidden="true" class="sy-comment-pin__inner">
          <span v-if="people.length" class="sy-comment-pin__people">
            <SAvatar v-for="person in people.slice(0, limit)" :key="person.id" :name="person.name" :initials="person.initials" :tooltip="false"
              :src="person.src" :data-avatar-tone="person.tone" size="sm" />
            <SAvatar v-if="people.length > limit" size="sm">…</SAvatar>
          </span>
          <span v-if="count > 1">{{ count }}</span>
          <SStatusDot v-if="unread" tone="success" />
        </span>
      </button>
    </template>
  </STooltip>
</template>
