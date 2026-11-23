<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useContainerReveal, useDevWarning } from '../internal/element-behavior'
import SAspectRatio from './SAspectRatio.vue'
import SCloseButton from './SCloseButton.vue'
import SImage from './SImage.vue'
import SIcon from './SIcon.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  label?: string
  loading?: boolean
  loadingLabel?: string
  actionable?: boolean
  removable?: boolean
  revealRemove?: boolean
  showRemoveOn?: 'always' | 'hover'
  removeLabel?: string
  removeTone?: 'auto' | 'dark' | 'light'
  showLabel?: boolean
  disabled?: boolean
  ratio?: number
  fit?: 'cover' | 'contain'
}>(), { ratio: 1, fit: 'cover', revealRemove: undefined, showRemoveOn: 'hover', loadingLabel: 'Loading', removeTone: 'auto' })
const emit = defineEmits<{ activate: [event: MouseEvent]; remove: [] }>()
const reveal = useContainerReveal(() => props.revealRemove ?? props.showRemoveOn === 'hover')
const root = useTemplateRef<HTMLDivElement>('root')
const sampledTone = shallowRef<'dark' | 'light'>('dark')
const tone = computed(() => props.removeTone === 'auto' ? sampledTone.value : props.removeTone)
useDevWarning(() => !props.alt && !props.label, 'Give SThumbnail an alt or label.')

function sampleTone() {
  const container = root.value
  const image = container?.querySelector<HTMLImageElement>('.sy-thumbnail__frame img[data-image-layer="current"]')
  if (!props.removable || props.removeTone !== 'auto' || !container || !image?.naturalWidth) return
  const width = image.clientWidth
  const height = image.clientHeight
  if (!width || !height) return
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const patch = Math.min(32, width, height)
  const rtl = container.ownerDocument.defaultView?.getComputedStyle(container).direction === 'rtl'
  const x = (image.naturalWidth - width / scale) / 2 + (rtl ? 0 : (width - patch) / scale)
  const y = (image.naturalHeight - height / scale) / 2
  try {
    const canvas = container.ownerDocument.createElement('canvas')
    canvas.width = canvas.height = 8
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, x, y, patch / scale, patch / scale, 0, 0, 8, 8)
    const pixels = context.getImageData(0, 0, 8, 8).data
    let brightness = 0
    let weight = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255
      brightness += (pixels[index] * .2126 + pixels[index + 1] * .7152 + pixels[index + 2] * .0722) * alpha
      weight += alpha
    }
    sampledTone.value = weight && brightness / weight < 112 ? 'light' : 'dark'
  } catch {
    sampledTone.value = 'dark'
  }
}
watch(() => props.src, () => { sampledTone.value = 'dark' })
watch(() => [props.removeTone, props.removable, props.ratio], sampleTone, { flush: 'post' })
</script>

<template>
  <div ref="root" class="sy-thumbnail" v-bind="reveal.getContainerProps()" :data-disabled="disabled || undefined">
    <component :is="actionable ? 'button' : 'div'" class="sy-thumbnail__frame" :type="actionable ? 'button' : undefined"
      :role="!actionable && !alt && label ? 'img' : undefined" :aria-label="actionable || !alt ? label || alt : undefined"
      :aria-disabled="actionable && disabled || undefined" :aria-busy="loading || undefined"
      :tabindex="actionable && disabled ? 0 : undefined" :title="label"
      @click="actionable && !disabled && emit('activate', $event)">
      <SAspectRatio :ratio="ratio" :fit="fit">
        <SImage v-if="src" :src="src" :alt="actionable ? '' : alt ?? ''" :ratio="ratio" placeholder @load="sampleTone" />
        <SSkeleton v-else-if="loading" class="sy-thumbnail__placeholder" />
        <div v-else class="sy-thumbnail__placeholder"><slot name="fallback"><SIcon name="image" size="1.5rem" /></slot></div>
        <Transition name="sy-thumbnail-loading">
          <div v-if="loading && src" class="sy-thumbnail__loading"><SSpinner decorative size="sm" /></div>
        </Transition>
      </SAspectRatio>
    </component>
    <span v-if="showLabel && label" class="sy-thumbnail__label" aria-hidden="true">{{ label }}</span>
    <span v-if="loading" role="status" class="sy-visually-hidden">{{ loadingLabel }}</span>
    <SCloseButton v-if="removable" class="sy-thumbnail__remove" v-bind="reveal.getContentRevealProps()"
      :data-tone="tone" :label="removeLabel ?? (label || alt ? `Remove ${label || alt}` : 'Remove')" :aria-disabled="disabled || undefined"
      :tabindex="disabled ? 0 : undefined"
      @click="!disabled && emit('remove')" />
  </div>
</template>
