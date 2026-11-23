<script setup lang="ts">
import { computed } from 'vue'
import SCloseButton from './SCloseButton.vue'
import SMediaTheme from './SMediaTheme.vue'

const props = withDefaults(defineProps<{
  title: string
  titleId?: string
  titleHidden?: boolean
  mediaMode?: 'light' | 'dark'
  closeLabel?: string
  closable?: boolean
  divider?: boolean
  maxLines?: number
}>(), { closeLabel: 'Close' })
const emit = defineEmits<{ close: [] }>()
const clamp = computed(() => Number.isFinite(props.maxLines) ? Math.max(1, Math.trunc(props.maxLines ?? 1)) : undefined)
</script>

<template>
  <header class="sy-dialog-hero" :data-divider="divider || undefined">
    <div class="sy-dialog-hero__media">
      <slot name="media" />
      <SMediaTheme v-if="closable && mediaMode" class="sy-dialog-hero__close" :mode="mediaMode">
        <SCloseButton :label="closeLabel" @click="emit('close')" />
      </SMediaTheme>
      <SCloseButton v-else-if="closable" class="sy-dialog-hero__close" :label="closeLabel" @click="emit('close')" />
    </div>
    <div class="sy-dialog-hero__heading" :class="{ 'sy-visually-hidden': titleHidden }">
      <slot name="leading" />
      <h2 :id="titleId" class="sy-dialog__title" :class="{ 'sy-line-clamp': clamp }" :style="{ '--sy-clamp-lines': clamp }"
        :tabindex="titleHidden ? undefined : -1" :data-dialog-hero-focus="!titleHidden || undefined">
        <slot name="title">
          <Transition name="sy-dialog-title" @before-leave="node => node.setAttribute('aria-hidden', 'true')">
            <span :key="title">{{ title }}</span>
          </Transition>
        </slot>
      </h2>
    </div>
    <slot />
  </header>
</template>
