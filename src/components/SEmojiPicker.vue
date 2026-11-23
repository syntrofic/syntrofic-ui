<script setup lang="ts">
import { noteOutsidePress } from '../internal/backdrop-press'
import { useLayerCollisionPadding } from '../internal/layer-context'
import { ThemePortalOrigin, usePortalTheme } from '../internal/portal-theme'
import { inject, onMounted, useTemplateRef, watch } from 'vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { dialogContainer } from '../internal/dialog-container'
import type { EmojiCategory, EmojiChoice, EmojiLocale, EmojiTone } from '../internal/emoji-data'
import SButton from './SButton.vue'
import SEmojiPickerPanel from './SEmojiPickerPanel.vue'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

const props = withDefaults(defineProps<{
  inline?: boolean
  size?: 'sm' | 'md' | 'lg'
  locale?: EmojiLocale
  label?: string
  categories?: readonly EmojiCategory[]
  storageKey?: string
  disabled?: boolean
}>(), { size: 'md', locale: 'en' })
defineSlots<{ trigger(): unknown }>()
const emit = defineEmits<{ select: [choice: EmojiChoice] }>()
const open = defineModel<boolean>('open', { default: false })
const recent = defineModel<string[]>('recent', { default: () => [] })
const tone = defineModel<EmojiTone>('tone', { default: 0 })
const container = inject(dialogContainer, null)
const themeOrigin = useTemplateRef<{ $el: Comment }>('themeOrigin')
const portalTheme = usePortalTheme(() => container?.value ?? 'body', () => themeOrigin.value?.$el.parentElement)
let storageReady = false

onMounted(() => {
  watch(() => props.storageKey, key => {
    storageReady = false
    if (!key) return
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (Array.isArray(saved) && saved.every(entry => typeof entry === 'string') && saved.length) {
        recent.value = saved.slice(0, 24)
      }
      storageReady = true
    } catch {
      // Recents remain available for this session if storage is blocked.
    }
  }, { immediate: true })
})

function select(choice: EmojiChoice) {
  const next = [choice.glyph, ...recent.value.filter(glyph => glyph !== choice.glyph)].slice(0, 24)
  recent.value = next
  if (storageReady && props.storageKey) {
    try { localStorage.setItem(props.storageKey, JSON.stringify(next)) } catch { /* Keep in-memory recents. */ }
  }
  emit('select', choice)
  if (!props.inline) open.value = false
}

const collisionPadding = useLayerCollisionPadding(10)
</script>

<template>
  <SEmojiPickerPanel v-if="inline" :locale="locale" :size="size" :categories="categories" :recent="recent" :tone="tone"
    @select="select" @tone="tone = $event" />
  <PopoverRoot v-else :open="open" @update:open="open = $event">
    <ThemePortalOrigin ref="themeOrigin" />
    <PopoverTrigger as-child :disabled="disabled">
      <slot name="trigger">
        <SButton variant="secondary" :size="size" :disabled="disabled">{{ label ?? (locale === 'zh' ? '添加表情' : 'Add emoji') }}</SButton>
      </slot>
    </PopoverTrigger>
    <PopoverPortal :to="container ?? 'body'">
      <SThemePortalScope :theme="portalTheme" persistent>
        <PopoverContent class="sy-floating-panel sy-emoji-picker-popover" :data-size="size"
          align="start" :side-offset="6" :collision-padding="collisionPadding"
          @pointer-down-outside="noteOutsidePress($event, themeOrigin?.$el.parentElement)"
          :aria-label="label ?? (locale === 'zh' ? '添加表情' : 'Add emoji')">
          <SEmojiPickerPanel :locale="locale" :size="size" :categories="categories" :recent="recent" :tone="tone"
            autofocus @select="select" @tone="tone = $event" />
        </PopoverContent>
      </SThemePortalScope>
    </PopoverPortal>
  </PopoverRoot>
</template>
