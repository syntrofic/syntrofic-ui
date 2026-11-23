<script lang="ts">
export type AvatarSize = 'xsm' | 'sm' | 'md' | 'lg' | 'xl' | number
export type AvatarShape = 'circle' | 'rounded' | 'square'
</script>

<script setup lang="ts">
import { computed, defineComponent, inject, provide, shallowReactive, shallowRef, useAttrs, useTemplateRef, watch, watchPostEffect, type ComponentPublicInstance } from 'vue'
import { avatarGroupContext, avatarStatusContext } from '../internal/avatar-context'
import { joinIds } from '../internal/field'
import { useLinkComponent, type LinkDestination } from '../internal/link-component'
import { useTooltip } from '../internal/tooltip'
import SAvatarStatusDot from './SAvatarStatusDot.vue'
import SIcon from './SIcon.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  src?: string
  srcset?: string
  sizes?: string
  fallbackSrc?: string
  alt?: string
  name?: string
  initials?: string
  size?: AvatarSize
  shape?: AvatarShape
  status?: 'success' | 'neutral' | 'error'
  statusLabel?: string
  tooltip?: boolean | string
  href?: LinkDestination
  target?: string
  rel?: string
  actionable?: boolean
  disabled?: boolean
}>(), { size: 'md', shape: 'circle', tooltip: true })
const emit = defineEmits<{ activate: [event: MouseEvent] }>()
const attrs = useAttrs()
const group = inject(avatarGroupContext, null)
const appearance = computed(() => group?.() ?? { size: props.size, shape: props.shape })
const statusLabels = shallowReactive(new Map<symbol, string>())
provide(avatarStatusContext, (key, value) => {
  if (value?.trim()) statusLabels.set(key, value.trim())
  else statusLabels.delete(key)
})
const Link = useLinkComponent()
const root = useTemplateRef<HTMLElement | ComponentPublicInstance>('root')
const image = useTemplateRef<HTMLImageElement>('image')
const displayed = shallowRef<HTMLImageElement | null>(null)
const failed = shallowRef({ primary: false, fallback: false })
const label = computed(() => (props.alt ?? props.name)?.trim() ?? '')
const accessibleName = computed(() => {
  const status = props.statusLabel?.trim() || [...new Set(statusLabels.values())].join(', ')
  return [label.value, status].filter(Boolean).join(', ')
})
const fallback = computed(() => {
  if (props.initials !== undefined) return props.initials.trim()
  const words = props.name?.match(/[\p{Letter}\p{Number}][\p{Letter}\p{Number}\p{Mark}]*/gu) ?? []
  if (words.length > 1) return `${Array.from(words[0]!)[0]}${Array.from(words.at(-1)!)[0]}`.toUpperCase()
  return Array.from(words[0] ?? '').slice(0, 2).join('').toUpperCase()
})
const imageKind = computed(() => {
  if ((props.src || props.srcset) && !failed.value.primary) return 'primary'
  if (props.fallbackSrc && !failed.value.fallback) return 'fallback'
})
const imageKey = computed(() => imageKind.value === 'primary' ? `primary:${props.src ?? ''}\n${props.srcset ?? ''}` : `fallback:${props.fallbackSrc ?? ''}`)
const visible = computed(() => Boolean(image.value && displayed.value === image.value))
const pixels = computed(() => {
  const { size } = appearance.value
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? `${size}px` : undefined
})
const tipText = computed(() => props.tooltip === false || attrs['aria-hidden'] === true || attrs['aria-hidden'] === 'true' ? undefined
  : typeof props.tooltip === 'string' ? props.tooltip.trim() : label.value ? props.name?.trim() : undefined)
const tip = useTooltip(() => ({ isEnabled: Boolean(tipText.value) }))
const AvatarTip = defineComponent(() => () => tipText.value ? tip.renderTooltip(tipText.value) : null)

function tag() { return props.href !== undefined ? Link : props.actionable || attrs.onClick ? 'button' : 'span' }
function activate(event: MouseEvent) { if (!props.disabled && tag() !== 'span') emit('activate', event) }
function ready(node: HTMLImageElement) { if (node === image.value) displayed.value = node }
function fail(node: HTMLImageElement) {
  if (node !== image.value || !imageKind.value) return
  displayed.value = null
  failed.value = { ...failed.value, [imageKind.value]: true }
}
watch(() => [props.src, props.srcset], () => { failed.value = { ...failed.value, primary: false, fallback: false } }, { flush: 'sync' })
watch(() => props.fallbackSrc, () => { failed.value = { ...failed.value, fallback: false } }, { flush: 'sync' })
watchPostEffect(() => {
  const node = image.value
  if (!node?.complete) return
  if (node.naturalWidth > 0) ready(node)
  else fail(node)
})
watchPostEffect(() => tip.ref(tipText.value ? root.value : null))
</script>

<template>
  <component :is="tag()" ref="root" class="sy-avatar"
    :data-size="appearance.size" :data-shape="appearance.shape" :data-loaded="visible || undefined" :data-image-source="imageKind"
    :data-loading="Boolean(imageKind && !visible) || undefined" :data-status="status || Boolean($slots.status) || undefined"
    :data-interactive="tag() !== 'span' || undefined" :style="{ '--sy-avatar-size': pixels }"
    :role="tag() === 'span' && accessibleName ? 'img' : undefined"
    :aria-label="accessibleName || undefined" :aria-hidden="tag() === 'span' && !accessibleName || undefined"
    :aria-busy="Boolean(label && imageKind && !visible) || undefined"
    :tabindex="tag() === 'span' && tipText && !group ? 0 : undefined"
    :type="tag() === 'button' ? 'button' : undefined" :disabled="tag() !== 'span' ? disabled : undefined"
    :href="href" :target="target" :rel="rel" v-bind="attrs"
    :aria-describedby="joinIds(attrs['aria-describedby'], typeof tooltip === 'string' && tipText && tip.isOpen.value && tip.describedBy)"
    @click="activate">
    <span class="sy-avatar__fallback" aria-hidden="true">
      <slot><span v-if="fallback">{{ fallback }}</span><SIcon v-else name="user" class="sy-avatar__person" /></slot>
    </span>
    <img v-if="imageKind" :key="imageKey" ref="image" alt="" aria-hidden="true"
      :src="imageKind === 'primary' ? src : fallbackSrc" :srcset="imageKind === 'primary' ? srcset : undefined"
      :sizes="imageKind === 'primary' ? sizes : undefined"
      @load="ready($event.currentTarget as HTMLImageElement)" @error="fail($event.currentTarget as HTMLImageElement)">
    <span v-if="status || $slots.status" class="sy-avatar__status" aria-hidden="true">
      <slot name="status"><SAvatarStatusDot :variant="status" /></slot>
    </span>
    <AvatarTip />
  </component>
</template>
