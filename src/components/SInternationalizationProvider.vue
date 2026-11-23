<script setup lang="ts">
import I18nProvider from '../rac/I18nProvider.vue'
import type { Direction, LocaleCatalogs } from '../rac/locale'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  locale: string
  messages?: LocaleCatalogs
  overrides?: LocaleCatalogs
  dir?: Direction
  calendar?: string
  as?: 'div' | 'section' | 'span' | 'main' | false
}>(), { calendar: 'gregory', as: false })
</script>

<template>
  <I18nProvider v-bind="$attrs" :as="as" :locale="locale" :catalogs="messages" :overrides="overrides" :dir="dir" :calendar="calendar"><slot /></I18nProvider>
</template>
