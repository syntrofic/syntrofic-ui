<script setup lang="ts">
import { onMounted, onScopeDispose, onUpdated, useTemplateRef, watch } from 'vue'
import { useAnnounce } from '../internal/interaction'
import { createAnimator } from '../internal/motion'
import SIcon from './SIcon.vue'
import type { FieldStatusLive, FieldStatusType, FieldStatusVariant } from '../internal/status-icon'

const props = withDefaults(defineProps<{ type?: FieldStatusType; message?: string; live?: FieldStatusLive; variant?: FieldStatusVariant }>(), {
  type: 'info', variant: 'attached',
})
const root = useTemplateRef<HTMLElement>('root')
const messageText = useTemplateRef<HTMLElement>('messageText')
const announce = useAnnounce(() => root.value)
let previous = ''
let visibility: MutationObserver | undefined

watch([() => props.message, () => props.type], ([message, type], [, previous], cleanup) => {
  if (!message || typeof messageText.value?.animate !== 'function') return
  const animator = createAnimator(messageText.value)
  animator.animate('validation-message', [{ opacity: .45, translate: '0 2px' }, { opacity: 1, translate: '0 0' }], { role: 'enter' })
  const icon = type !== previous && root.value?.querySelector<SVGElement>(':scope > .sy-icon')
  const iconAnimation = icon && createAnimator(icon)
  if (iconAnimation) iconAnimation.animate('validation-icon', [{ opacity: .4, scale: .85 }, { opacity: 1, scale: 1 }], { role: 'enter', reducedMotion: 'fade' })
  cleanup(animator.dispose)
  if (iconAnimation) cleanup(iconAnimation.dispose)
}, { flush: 'post' })

function announceChange() {
  if (!root.value || root.value.closest('dialog:not([open]), [role="dialog"][data-state="closed"], [hidden], [inert]')) {
    previous = ''
    return
  }
  const { type, message, live = type === 'error' ? 'assertive' : 'polite' } = props
  const value = message ?? root.value?.querySelector('.sy-input-status__message')?.textContent?.trim()
  const next = value && live !== 'off' ? `${type}\n${live}\n${value}` : ''
  if (next && next !== previous && live !== 'off') announce(value!, live)
  previous = next
}
onMounted(() => {
  announceChange()
  const dialog = root.value?.closest('dialog, [role="dialog"]')
  const view = dialog?.ownerDocument.defaultView
  if (!dialog || !view) return
  visibility = new view.MutationObserver(announceChange)
  visibility.observe(dialog, { attributes: true, attributeFilter: ['open', 'data-state', 'hidden'] })
})
onUpdated(announceChange)
onScopeDispose(() => visibility?.disconnect())
</script>

<template>
  <span ref="root" class="sy-input-status" :data-status="type" :data-variant="variant">
    <slot v-if="variant === 'detached'" name="icon"><SIcon :name="type" /></slot>
    <span ref="messageText" class="sy-input-status__message"><slot>{{ message }}</slot></span>
  </span>
</template>
