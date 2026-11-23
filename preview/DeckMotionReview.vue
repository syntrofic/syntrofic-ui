<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import { SButton, SCard, SMotionText, createAnimator, createPanGesture, prefersReducedMotion, solveDecay, solveSpring, useAnimator, usePanGesture } from '../src'

const props = defineProps<{ api: 'createAnimator' | 'useAnimator' | 'usePanGesture' }>()
const cards = ['版式复核', '目录校验', '签发记录']
const index = ref(0)
const card = computed(() => cards[index.value])
const result = ref('')
const dealing = ref(false)
const tile = useTemplateRef<HTMLElement>('tile')
const hook = props.api === 'useAnimator' ? useAnimator(tile) : undefined
let animator: ReturnType<typeof createAnimator> | undefined
let origin = 0
let position = 0
let active = true

function set(x: number) {
  position = x
  if (hook) hook.set({ x })
  else if (tile.value) tile.value.style.translate = x + 'px'
}
function start() {
  if (!tile.value) return
  const translate = getComputedStyle(tile.value).translate
  origin = hook?.get().x ?? (Number.parseFloat(translate) || 0)
  animator?.cancel('position')
  set(origin)
}
function drag(x: number) { set(origin + x) }
function springBack(velocity: number) {
  if (hook) { void hook.animate({ x: 0 }, { velocity: { x: velocity } }); return }
  const settle = solveSpring({ from: position, to: 0, velocity })
  const frames = Array.from({ length: 38 }, (_, frame) => ({ translate: settle(frame / 60).value + 'px' }))
  frames.push({ translate: '0px' })
  set(0)
  animator?.animate('position', frames, { role: 'move', duration: 620, easing: 'linear' })
}

async function discard(velocity = 1500) {
  const node = tile.value
  if (dealing.value || !node || !animator) return
  dealing.value = true
  start()
  const removed = card.value
  const direction = Math.sign(velocity) || 1
  const speed = direction * Math.min(3200, Math.max(1400, Math.abs(velocity)))
  if (prefersReducedMotion(node)) {
    await animator.animate('card', [{ opacity: 1 }, { opacity: 0 }], { reducedMotion: 'fade', fill: 'forwards' }).finished.catch(() => {})
  } else if (hook) {
    await hook.decay({ x: speed }, .995)
  } else {
    const decay = solveDecay({ from: position, velocity: speed, rate: .995 })
    const frames = Array.from({ length: 30 }, (_, frame) => ({
      translate: decay.value(frame / 60).toFixed(2) + 'px', opacity: 1 - (frame / 29) ** 2,
    }))
    await animator.animate('position', frames, { role: 'exit', duration: 480, easing: 'linear', fill: 'forwards' }).finished.catch(() => {})
  }
  if (!active || !animator) return
  index.value = (index.value + 1) % cards.length
  result.value = '已移除' + removed + '，下一项为' + card.value
  set(0)
  animator.cancel('position')
  await nextTick()
  animator?.animate('card', [{ opacity: 0, scale: .97 }, { opacity: 1, scale: 1 }], { role: 'enter', reducedMotion: 'fade' })
  dealing.value = false
}

function release(x: number, velocity: number, cancelled: boolean) {
  if (!cancelled && Math.abs(x) > 12 && Math.abs(velocity) >= 900) void discard(velocity)
  else springBack(cancelled ? 0 : velocity)
}
watch(tile, (element, _, cleanup) => {
  if (!element) return
  const driver = createAnimator(element)
  animator = driver
  const detach = props.api === 'usePanGesture' ? undefined : createPanGesture(element, {
    axis: 'horizontal', shouldStart: () => !dealing.value,
    onStart: start, onMove: ({ x }) => drag(x),
    onEnd: ({ x, velocityX }, _, cancelled) => release(x, velocityX * 1000, cancelled),
  })
  cleanup(() => { detach?.(); driver.dispose(); animator = undefined })
}, { flush: 'post' })
if (props.api === 'usePanGesture') usePanGesture(tile, {
  axis: 'x', shouldStart: () => !dealing.value,
  onPan({ state, translation, velocity }) {
    if (state === 'began') start()
    if (state === 'changed') drag(translation.x)
    if (state === 'ended' || state === 'cancelled') release(translation.x, velocity.x, state === 'cancelled')
  },
})
onScopeDispose(() => { active = false })
</script>

<template>
  <section class="deck-motion-review" :aria-label="api + ' 卡片'">
    <code>{{ api }}</code>
    <div class="deck-motion-review__track">
      <div ref="tile" class="deck-motion-review__tile" data-deck-tile>
        <SCard padding="sm"><SMotionText :value="card" wrap /></SCard>
      </div>
    </div>
    <SButton size="sm" variant="secondary" :aria-disabled="dealing || undefined" @click="discard()">移除当前卡片</SButton>
    <p><SMotionText :value="result" announce wrap /></p>
  </section>
</template>

<style scoped>
.deck-motion-review { display: grid; gap: var(--sy-space-2); min-inline-size: 0; align-content: start; }
.deck-motion-review__track { display: grid; place-items: center; overflow: clip; min-block-size: 5rem; background: var(--sy-surface-muted); border-radius: var(--sy-radius-md); }
.deck-motion-review__tile { cursor: grab; user-select: none; touch-action: pan-y; }
.deck-motion-review__tile:active { cursor: grabbing; }
.deck-motion-review__tile :deep(.sy-card) { min-inline-size: 7rem; text-align: center; }
.deck-motion-review > button { justify-self: start; }
.deck-motion-review > p { margin: 0; min-block-size: 1.4em; color: var(--sy-text-muted); }
</style>
