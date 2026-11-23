<script setup lang="ts">
import { ref } from 'vue'
import { CalendarDate } from '@internationalized/date'
import { SCalendar, SCheckbox, SCommandInput, SInternationalizationProvider, SSwitch, type LocaleCatalogs } from '../src'
import { I18nProvider } from '../src/rac'
import RacReviewContents from './RacReviewContents.vue'

const rtl = ref(false)
const alternateLanguage = ref(false)
const alternateCalendar = ref(false)
const sample = new CalendarDate(2026, 3, 21)
const catalogs: LocaleCatalogs = {
  en: { 'command.search': 'Find commands', 'command.placeholder': 'Filter commands' },
  fr: { 'command.search': 'Rechercher une commande', 'command.placeholder': 'Filtrer les commandes' },
  'fr-CA': { 'command.search': 'Chercher une commande' },
}
const overrides: LocaleCatalogs = { 'fr-ca': { 'command.search': 'Trouver une commande' } }
</script>

<template>
  <div class="review__stack">
    <SSwitch v-model="rtl">从右往左阅读</SSwitch>
    <I18nProvider :locale="rtl ? 'ar' : 'zh-CN'" style="inline-size: 100%">
      <RacReviewContents />
    </I18nProvider>
    <section class="review__stack" aria-label="多语言目录示例">
      <SCheckbox v-model="alternateLanguage">切换至波斯语</SCheckbox>
      <SCheckbox v-model="alternateCalendar">使用波斯日历</SCheckbox>
      <SInternationalizationProvider :locale="alternateLanguage ? 'fa-IR-u-ca-persian' : 'fr-CA'" :messages="catalogs" :overrides="overrides"
        :calendar="alternateCalendar ? 'persian' : undefined">
        <div :dir="alternateLanguage ? 'rtl' : 'ltr'" data-catalog-sample>
          <SCommandInput :autofocus="false" />
          <SCalendar label="项目日期" :model-value="sample" readonly />
        </div>
      </SInternationalizationProvider>
    </section>
  </div>
</template>
