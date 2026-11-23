<script lang="ts">
export interface ChatReaction {
  emoji: string
  count: number
  selected?: boolean
  label?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import type { EmojiCategory, EmojiLocale } from '../internal/emoji-data'
import SButton from './SButton.vue'
import SEmojiPicker from './SEmojiPicker.vue'
import SEmojiReactionButton from './SEmojiReactionButton.vue'
import SIcon from './SIcon.vue'
import STooltip from './STooltip.vue'

withDefaults(defineProps<{
  reactions: readonly ChatReaction[]
  label?: string
  addable?: boolean
  addLabel?: string
  size?: 'sm' | 'md' | 'lg'
  locale?: EmojiLocale
  categories?: readonly EmojiCategory[]
  disabled?: boolean
}>(), { label: 'Reactions', addLabel: 'Add reaction', size: 'sm' })
const emit = defineEmits<{ toggle: [emoji: string, selected: boolean]; add: [emoji: string] }>()
</script>

<template>
  <div class="sy-chat-reaction-bar" role="group" :aria-label="label">
    <STooltip v-for="reaction in reactions" :key="reaction.emoji" :disabled="!reaction.label || reaction.disabled || disabled" :text="reaction.label">
      <template #trigger>
        <SEmojiReactionButton controlled :emoji="reaction.emoji" :label="reaction.label ?? reaction.emoji" :size="size"
          :count="reaction.count" :selected="reaction.selected ?? false" :disabled="disabled || reaction.disabled"
          @toggle="emit('toggle', reaction.emoji, $event.selected)" />
      </template>
    </STooltip>
    <SEmojiPicker v-if="addable" :label="addLabel" :size="size" :locale="locale" :categories="categories" :disabled="disabled" @select="emit('add', $event.glyph)">
      <template #trigger>
        <SButton :aria-label="addLabel" variant="ghost" :size="size" :disabled="disabled"><SIcon icon="plus" size="sm" /></SButton>
      </template>
    </SEmojiPicker>
  </div>
</template>
