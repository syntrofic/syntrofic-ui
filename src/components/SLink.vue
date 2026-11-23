<script setup lang="ts">
import { useAttrs } from 'vue'
import { useLinkComponent, validLinkDestination, type LinkComponent, type LinkDestination } from '../internal/link-component'
import SIcon from './SIcon.vue'
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  href?: LinkDestination
  to?: LinkDestination
  as?: LinkComponent
  disabled?: boolean
  target?: string
  rel?: string
  externalIndicator?: boolean
  externalLabel?: string
}>()
const attrs = useAttrs()
const Link = useLinkComponent(() => props.as)
</script>

<template>
  <Link
    v-bind="attrs"
    class="sy-link"
    :href="href"
    :to="to"
    :disabled="disabled"
    :target="target"
    :rel="rel"
  >
    <slot />
    <template v-if="externalIndicator && (href || to) && !disabled && validLinkDestination(href) && validLinkDestination(to)">
      <span class="sy-link__indicator"><SIcon name="externalLink" size=".9em" /></span>
      <span v-if="target === '_blank'" class="sy-visually-hidden"> {{ externalLabel ?? 'Opens in a new tab' }}</span>
    </template>
  </Link>
</template>
