<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { SCard, createPanGesture, useAnimator, usePanGesture } from '../src'

const vue = useTemplateRef<HTMLElement>('vue')
const vanilla = useTemplateRef<HTMLElement>('vanilla')
const vueDriver = useAnimator(vue)
const vanillaDriver = useAnimator(vanilla)
function bind(driver: typeof vueDriver) {
  let origin = { x: 0, y: 0 }
  return {
    start() { origin = driver.get(); driver.stop() },
    move(x: number, y: number) { driver.set({ x: origin.x + x, y: origin.y + y }) },
    end(x: number, y: number) { void driver.animate({ x: 0, y: 0 }, { velocity: { x, y } }) },
  }
}
const hook = bind(vueDriver)
const factory = bind(vanillaDriver)
usePanGesture(vue, {
  shouldStart: () => true,
  onPan({ state, translation, velocity }) {
    if (state === 'began') hook.start()
    if (state === 'changed') hook.move(translation.x, translation.y)
    if (state === 'ended' || state === 'cancelled') hook.end(velocity.x, velocity.y)
  },
})
watch(vanilla, (element, _, cleanup) => {
  if (element) cleanup(createPanGesture(element, {
    onStart: factory.start,
    onMove: ({ x, y }) => factory.move(x, y),
    onEnd: ({ velocityX, velocityY }, _, cancelled) => factory.end(cancelled ? 0 : velocityX * 1000, cancelled ? 0 : velocityY * 1000),
  }))
}, { flush: 'post' })
</script>

<template>
  <section aria-label="手势 API 对照" class="pan-tiles-motion">
    <div class="pan-tiles-motion__track">
      <div ref="vue" data-pan-tile="hook"><SCard padding="sm"><code>usePanGesture</code></SCard></div>
    </div>
    <div class="pan-tiles-motion__track">
      <div ref="vanilla" data-pan-tile="factory"><SCard padding="sm"><code>createPanGesture</code></SCard></div>
    </div>
  </section>
</template>

<style scoped>
.pan-tiles-motion { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: var(--sy-space-3); }
.pan-tiles-motion__track { display: grid; place-items: center; min-block-size: 6.5rem; overflow: clip; border-radius: var(--sy-radius-md); background: var(--sy-surface-muted); }
.pan-tiles-motion__track > div { touch-action: none; cursor: grab; user-select: none; }
.pan-tiles-motion__track code { user-select: none; }
.pan-tiles-motion__track > div:active { cursor: grabbing; }
</style>
