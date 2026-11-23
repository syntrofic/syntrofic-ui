<script lang="ts">
export interface MegaMenuLink { id: string; label: string; href: string; description?: string }
export interface MegaMenuGroup { id: string; title: string; links: readonly MegaMenuLink[] }
export interface MegaMenuFeature extends MegaMenuLink { image?: string; imageAlt?: string }
</script>

<script setup lang="ts">
import SButton from './SButton.vue'
import SClickableCard from './SClickableCard.vue'
import SGrid from './SGrid.vue'
import SLink from './SLink.vue'
import SPopover from './SPopover.vue'

defineProps<{
  label: string
  groups: readonly MegaMenuGroup[]
  feature?: MegaMenuFeature
}>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <SPopover v-model:open="open" align="start">
    <template #trigger>
      <slot name="trigger"><SButton size="sm" variant="ghost">{{ label }}</SButton></slot>
    </template>
    <nav :aria-label="label" class="sy-mega-menu">
      <SGrid min-column-width="10rem">
        <div v-for="group in groups" :key="group.id" class="sy-mega-menu__group">
          <h3>{{ group.title }}</h3>
          <ul role="list">
            <li v-for="link in group.links" :key="link.id">
              <SLink :href="link.href" @click="open = false"><strong>{{ link.label }}</strong>
                <small v-if="link.description">{{ link.description }}</small></SLink>
            </li>
          </ul>
        </div>
        <SClickableCard v-if="feature" :label="feature.label" :href="feature.href" @activate="open = false">
          <img v-if="feature.image" :src="feature.image" :alt="feature.imageAlt ?? ''" class="sy-mega-menu__feature">
          <strong>{{ feature.label }}</strong>
          <small v-if="feature.description">{{ feature.description }}</small>
        </SClickableCard>
      </SGrid>
    </nav>
  </SPopover>
</template>
