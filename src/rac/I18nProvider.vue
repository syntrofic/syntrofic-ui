<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { ConfigProvider } from 'reka-ui'
import { isRTL, localeContext, localeWithCalendar, readLocalization, resolveLocaleCatalog, type Direction, type LocaleCatalogs } from './locale'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  locale?: string
  dir?: Direction
  calendar?: string
  messages?: Readonly<Record<string, string>>
  catalogs?: LocaleCatalogs
  overrides?: LocaleCatalogs
  as?: 'div' | 'section' | 'span' | 'main' | false
}>(), { as: 'div' })
const parent = inject(localeContext, null)
const locale = computed(() => props.locale ?? parent?.locale.value ?? readLocalization()?.locale ?? 'en')
const direction = computed(() => props.dir ?? (props.locale === undefined ? parent?.direction.value : undefined) ?? (isRTL(locale.value) ? 'rtl' : 'ltr'))
const messages = computed(() => ({ ...readLocalization()?.messages, ...(parent?.locale.value === locale.value ? parent?.messages?.value : undefined),
  ...resolveLocaleCatalog(locale.value, props.catalogs, props.overrides), ...props.messages }))
const calendar = computed(() => {
  if (props.calendar || parent?.calendar?.value) return props.calendar ?? parent?.calendar?.value
  try { return new Intl.Locale(locale.value).calendar }
  catch { return undefined }
})
const calendarLocale = computed(() => props.calendar || parent?.calendar?.value ? localeWithCalendar(locale.value, calendar.value) : locale.value)
provide(localeContext, { locale, direction, messages, calendar })
</script>

<template>
  <ConfigProvider :locale="calendarLocale" :dir="direction">
    <slot v-if="as === false" />
    <component v-else :is="as" v-bind="$attrs" :lang="locale" :dir="direction"><slot /></component>
  </ConfigProvider>
</template>
