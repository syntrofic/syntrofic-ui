<script setup lang="ts">
import { computed, provide } from 'vue'
import { contentUrl } from '../internal/content-url'
import { navMenuCommit } from '../internal/shell-layout'
import SIcon from './SIcon.vue'
import SLink from './SLink.vue'
import SMotionText from './SMotionText.vue'
import SNavIcon from './SNavIcon.vue'
import SPopover from './SPopover.vue'

const props = defineProps<{
  heading: string
  headingHref?: string
  superheading?: string
  superheadingHref?: string
  subheading?: string
  subheadingHref?: string
  icon?: string
  menuLabel?: string
  collapsed?: boolean
}>()
const open = defineModel<boolean>('open', { default: false })
const headingLink = computed(() => contentUrl(props.headingHref))
const superLink = computed(() => props.superheading && contentUrl(props.superheadingHref))
const subLink = computed(() => props.subheading && contentUrl(props.subheadingHref))
provide(navMenuCommit, () => { open.value = false })
</script>

<template>
  <div v-if="!collapsed || icon || $slots.icon" class="sy-side-nav-heading" :data-collapsed="collapsed || undefined">
    <SLink v-if="headingLink && (collapsed || (!$slots.menu && !superLink && !subLink))"
      class="sy-side-nav-heading__cover" :href="headingLink" :aria-label="heading" />
    <SPopover v-else-if="$slots.menu" v-model:open="open" menu>
      <template #trigger>
        <button type="button" class="sy-side-nav-heading__cover" aria-haspopup="menu" :aria-label="menuLabel ?? heading">
          <SIcon v-if="!collapsed" name="chevron" class="sy-top-nav-menu__chevron" />
        </button>
      </template>
      <template #default="state"><slot name="menu" v-bind="state" /></template>
    </SPopover>
    <SNavIcon v-if="icon || $slots.icon" :icon="icon" class="sy-side-nav-heading__mark">
      <template v-if="$slots.icon" #default><slot name="icon" /></template>
    </SNavIcon>
    <div v-if="!collapsed" class="sy-side-nav-heading__text">
      <template v-if="superheading">
        <SLink v-if="superLink" :href="superLink"><SMotionText :value="superheading" /></SLink>
        <span v-else><SMotionText :value="superheading" /></span>
      </template>
      <strong class="sy-side-nav-heading__title">
        <SLink v-if="headingLink && ($slots.menu || superLink || subLink)" :href="headingLink"><SMotionText :value="heading" /></SLink>
        <span v-else><SMotionText :value="heading" /></span>
      </strong>
      <template v-if="subheading">
        <SLink v-if="subLink" :href="subLink"><SMotionText :value="subheading" /></SLink>
        <span v-else><SMotionText :value="subheading" /></span>
      </template>
    </div>
    <div v-if="!collapsed && $slots.end" class="sy-side-nav-heading__end"><slot name="end" /></div>
  </div>
</template>
