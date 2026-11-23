<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ title?: string; subtitle?: string; headerHidden?: boolean }>()
const id = `sy-side-nav-section-${useId()}`
</script>

<template>
  <section class="sy-side-nav-section" :aria-labelledby="title ? id : undefined" :aria-describedby="subtitle ? `${id}-note` : undefined">
    <header v-if="title || subtitle || $slots.end" class="sy-side-nav-section__header" :class="{ 'sy-visually-hidden': headerHidden }">
      <div>
        <h3 v-if="title" :id="id" class="sy-sidebar__label">{{ title }}</h3>
        <p v-if="subtitle" :id="`${id}-note`" class="sy-side-nav-section__subtitle">{{ subtitle }}</p>
      </div>
      <slot v-if="!headerHidden" name="end" />
    </header>
    <ul class="sy-sidebar__list" role="list"><slot /></ul>
  </section>
</template>
