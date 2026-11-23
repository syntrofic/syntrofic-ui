<script setup lang="ts">
import { computed, provide } from 'vue'
import { Primitive, RovingFocusGroup, RovingFocusItem } from 'reka-ui'
import { avatarGroupContext } from '../internal/avatar-context'
import type { LinkDestination } from '../internal/link-component'
import SAvatar from './SAvatar.vue'
import type { AvatarShape, AvatarSize } from './SAvatar.vue'
import SAvatarGroupOverflow from './SAvatarGroupOverflow.vue'

export interface AvatarPerson {
  id: string | number
  name: string
  initials?: string
  src?: string
  fallbackSrc?: string
  href?: LinkDestination
  actionable?: boolean
  tone?: 'sage' | 'blue' | 'neutral' | 'warm'
}

const props = withDefaults(defineProps<{
  items: readonly AvatarPerson[]
  label?: string
  size?: AvatarSize
  shape?: AvatarShape
  max?: number
  total?: number
  layout?: 'stack' | 'grid'
  seam?: 'cutout' | 'ring'
  overflowLabel?: (count: number) => string
  overflowInteractive?: boolean
  interactive?: boolean
  dir?: 'ltr' | 'rtl'
  loop?: boolean
}>(), { size: 'md', shape: 'circle', layout: 'stack', seam: 'cutout', loop: true })
const emit = defineEmits<{ activate: [person: AvatarPerson, event: MouseEvent]; overflow: [count: number] }>()
provide(avatarGroupContext, () => ({ size: props.size, shape: props.shape }))

const shown = computed(() => props.items.slice(0, Number.isFinite(props.max) ? Math.max(0, Math.floor(props.max!)) : props.items.length))
const total = computed(() => Math.max(props.items.length, Number.isFinite(props.total) ? Math.floor(props.total!) : 0))
const overflow = computed(() => total.value - shown.value.length)
const overflowName = computed(() => props.overflowLabel?.(overflow.value) ?? `${overflow.value} more people`)
const roving = computed(() => props.interactive || shown.value.some(person => person.href !== undefined || person.actionable)
  || overflow.value > 0 && props.overflowInteractive)
const groupSize = computed(() => typeof props.size === 'number' && Number.isFinite(props.size) && props.size > 0 ? {
  '--sy-avatar-group-size': `${props.size}px`, '--sy-avatar-overlap': `${Math.round(props.size * .2)}px`,
} : undefined)
</script>

<template>
  <component :is="roving ? RovingFocusGroup : 'div'" class="sy-avatar-group" :data-layout="layout" :data-size="size" :data-seam="seam" :style="groupSize"
    :role="label || roving ? 'group' : undefined" :aria-label="label" :dir="dir" v-bind="roving ? { orientation: 'horizontal', loop } : {}">
    <TransitionGroup name="sy-avatar-stack">
      <div v-for="person in shown" :key="`person:${typeof person.id}:${person.id}`" class="sy-avatar-group__item">
        <component :is="roving ? RovingFocusItem : Primitive" as-child
          v-bind="roving ? { focusable: Boolean(interactive || $slots.avatar || person.href !== undefined || person.actionable) } : {}">
          <slot name="avatar" :person="person" :size="size">
            <SAvatar :name="person.name" :initials="person.initials" :src="person.src" :fallback-src="person.fallbackSrc" :href="person.href"
              :actionable="person.actionable" :size="size" :shape="shape" :data-avatar-tone="person.tone ?? 'sage'" @activate="emit('activate', person, $event)" />
          </slot>
        </component>
      </div>
      <div v-if="overflow > 0" key="overflow" class="sy-avatar-group__item">
        <component :is="roving ? RovingFocusItem : Primitive" as-child
          v-bind="roving ? { focusable: Boolean(overflowInteractive || $slots.count) } : {}">
          <slot name="count" :count="overflow" :size="size" :label="overflowName">
            <SAvatarGroupOverflow :count="overflow" :label="overflowName" :size="size" :shape="shape" :interactive="overflowInteractive"
              @activate="emit('overflow', overflow)" />
          </slot>
        </component>
      </div>
    </TransitionGroup>
  </component>
</template>
