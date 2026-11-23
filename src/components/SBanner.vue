<script setup lang="ts">
import { useId } from 'vue'
import type { ButtonElevation } from '../types'
import SButton from './SButton.vue'
import SCloseButton from './SCloseButton.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

withDefaults(defineProps<{
  title?: string
  description?: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
  variant?: 'card' | 'section'
  elevation?: ButtonElevation
  dismissible?: boolean
  collapsible?: boolean
  announcement?: 'polite' | 'assertive'
  dismissLabel?: string
  expandLabel?: string
  collapseLabel?: string
}>(), { tone: 'info', variant: 'card', elevation: 'none', collapsible: true, expandLabel: 'Show details', collapseLabel: 'Hide details' })
const open = defineModel<boolean>('open', { default: true })
const expanded = defineModel<boolean>('expanded', { default: false })
const emit = defineEmits<{ dismiss: [] }>()
const id = useId()
const icons = { info: 'info', success: 'success', warning: 'warning', danger: 'error' }
</script>

<template>
  <Transition name="sy-banner">
    <section v-if="open" class="sy-banner" :data-tone="tone" :data-variant="variant" :data-elevation="elevation">
      <div class="sy-banner__inner">
        <div class="sy-banner__header">
          <span class="sy-banner__icon" aria-hidden="true"><slot name="icon"><SIcon :name="icons[tone]" size="sm" /></slot></span>
          <div class="sy-banner__message" :role="announcement === 'assertive' ? 'alert' : announcement === 'polite' ? 'status' : undefined">
            <strong><slot name="title">{{ title }}</slot></strong>
            <p v-if="description || $slots.description"><slot name="description">{{ description }}</slot></p>
          </div>
          <div v-if="$slots.actions || $slots.default && collapsible || dismissible" class="sy-banner__actions">
            <slot name="actions" />
            <SButton v-if="$slots.default && collapsible" size="sm" variant="ghost" :aria-expanded="expanded"
              :aria-controls="id" @click="expanded = !expanded">
              <SMotionText :value="expanded ? collapseLabel : expandLabel" />
              <SIcon name="chevronDown" size="xsm" class="sy-banner__chevron" />
            </SButton>
            <SCloseButton v-if="dismissible" :label="dismissLabel ?? (title ? `Dismiss ${title}` : 'Dismiss')" @click="open = false; emit('dismiss')" />
          </div>
        </div>
        <Transition name="sy-standard-expand">
          <div v-if="$slots.default" v-show="!collapsible || expanded" :id="id" class="sy-banner__details"
            :inert="collapsible && !expanded || undefined"><div><slot /></div></div>
        </Transition>
      </div>
    </section>
  </Transition>
</template>
