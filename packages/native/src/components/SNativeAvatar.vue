<script setup lang="ts">
import { AccessibilityRole, ImageSource, Utils, type Image } from '@nativescript/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeAvatarStatusDot, { type NativePresence } from './SNativeAvatarStatusDot.vue'

const props = withDefaults(defineProps<{
  src?: string | ImageSource | null
  alt?: string
  name?: string
  initials?: string
  size?: number | 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'rounded'
  tone?: 'neutral' | 'sage' | 'blue'
  presence?: NativePresence
  presenceLabel?: string
}>(), { size: 'md', shape: 'circle', tone: 'sage' })
const emit = defineEmits<{ 'status-change': [state: 'fallback' | 'loading' | 'loaded' | 'error'] }>()
const { theme, direction } = useNativeUI()
const runMotion = useNativeMotion()
const image = useTemplateRef<{ nativeView: Image }>('image')
const loaded = shallowRef<ImageSource>()
const status = shallowRef<'fallback' | 'loading' | 'loaded' | 'error'>('fallback')
const label = computed(() => props.alt ?? props.name ?? '')
const presenceNames = { online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline' }
const accessibilityLabel = computed(() => [label.value, props.presenceLabel ?? (props.presence && presenceNames[props.presence])].filter(Boolean).join(', '))
const fallback = computed(() => props.initials ?? Array.from((props.name ?? label.value).trim()).slice(0, 2).join(''))
const dimensions = { sm: 30, md: 40, lg: 54 }
const size = computed(() => typeof props.size === 'number'
  ? Number.isFinite(props.size) ? Math.max(16, props.size) : 40
  : dimensions[props.size])
const base = computed(() => props.tone === 'blue' ? theme.value.colors.surfaceBlue
  : props.tone === 'neutral' ? theme.value.colors.surfaceMuted : theme.value.colors.surfaceSage)

function report(state: typeof status.value) {
  if (state === status.value) return
  status.value = state
  emit('status-change', state)
}

function showImage() {
  const target = image.value?.nativeView
  if (!target?.isLoaded || status.value !== 'loaded') return
  runMotion(() => [{ target, opacity: 1, scale: { x: 1, y: 1 } }], 'enter')
}

async function read(source: string | ImageSource) {
  if (typeof source !== 'string') return source
  const content = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/is.exec(source)?.[1]
  if (content) return ImageSource.fromBase64(content)
  if (/^https?:\/\//i.test(source)) return ImageSource.fromUrl(source)
  if (Utils.isFileOrResourcePath(source)) return ImageSource.fromFileOrResourceSync(source)
}

watch(() => props.src, async (source, _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  report(source ? 'loading' : 'fallback')
  const result = source ? read(source).catch(() => undefined) : undefined
  if (loaded.value) {
    await runMotion(() => {
      const target = image.value?.nativeView
      return target?.isLoaded ? [{ target, opacity: 0, scale: { x: 1.03, y: 1.03 } }] : []
    }, 'exit')
    if (stale) return
    loaded.value = undefined
  }
  const decoded = await result
  if (stale || !source) return
  if (!decoded?.width || !decoded.height) {
    report('error')
    return
  }
  loaded.value = decoded
  report('loaded')
  await nextTick()
  if (!stale) showImage()
}, { immediate: true })
</script>

<template>
  <GridLayout
    :width="size"
    :height="size"
    :borderRadius="shape === 'circle' ? size / 2 : theme.geometry.radiusMd"
    :clipToBounds="!presence"
    :backgroundColor="base"
    :accessible="Boolean(accessibilityLabel)"
    :accessibilityHidden="!accessibilityLabel"
    :accessibilityLabel="accessibilityLabel || undefined"
    :accessibilityRole="AccessibilityRole.Image"
  >
    <GridLayout horizontalAlignment="center" verticalAlignment="middle" :accessibilityHidden="true">
      <slot :initials="fallback" :status="status">
        <SNativeMotionText :value="fallback" :color="theme.colors.text" :size="Math.min(24, Math.round(size * 0.39))" />
      </slot>
    </GridLayout>
    <Image
      ref="image"
      :src="loaded"
      :opacity="0"
      :borderRadius="shape === 'circle' ? size / 2 : theme.geometry.radiusMd"
      stretch="aspectFill"
      :accessibilityHidden="true"
      :isUserInteractionEnabled="false"
      @loaded="showImage"
    />
    <SNativeAvatarStatusDot v-if="presence" :presence="presence" :size="Math.min(14, Math.max(8, size * .28))"
      :horizontalAlignment="direction === 'rtl' ? 'left' : 'right'" verticalAlignment="bottom" />
  </GridLayout>
</template>
