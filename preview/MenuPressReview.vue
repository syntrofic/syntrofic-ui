<script setup lang="ts">
import { defineComponent, h, nextTick, ref, shallowRef, type ComponentPublicInstance } from 'vue'
import { SMotionText, isMenuPressActivation, useLayer, useListFocus, useMenuPress } from '../src'

const trigger = shallowRef<HTMLButtonElement | null>(null)
const status = ref('')
const actions = ref(0)
const layer = useLayer({ lightDismiss: true, lazyMount: true, onHide: () => press.cancel() })
const panel = () => trigger.value?.ownerDocument.getElementById(layer.id) ?? null
const list = useListFocus({ hasPaging: true, onEscape: closeAndReturn })
const press = useMenuPress({
  triggerRef: trigger,
  menuRef: panel,
  itemSelector: '[role="menuitem"]',
  longPressDelayMs: 70,
  onTriggerPress: () => {
    if (layer.open.value) { layer.hide(); return false }
    layer.show()
    return true
  },
  onDismiss: layer.hide,
})
const Menu = defineComponent(() => () => layer.render(() => Array.from({ length: 20 }, (_, index) =>
  h('button', { type: 'button', role: 'menuitem', tabindex: -1, class: 'sy-menu__item',
    disabled: index === 1, 'aria-disabled': index === 1 || undefined,
    onClick(event: MouseEvent) {
      actions.value++
      status.value = `动作 ${index + 1} · ${isMenuPressActivation(event) && event.shiftKey ? '释放与 Shift' : '选择'} · ${actions.value}`
      closeAndReturn()
    },
  }, '动作 ' + (index + 1))), {
  ...press.menuProps, role: 'menu', tabindex: -1, label: '逐项操作列表', class: 'sy-menu',
  style: { maxHeight: '160px', overflowY: 'auto' },
  onKeydown: event => {
    list.listRef.value = panel()
    list.handleKeyDown(event)
  },
}))
function closeAndReturn() {
  layer.hide()
  trigger.value?.focus({ preventScroll: true })
}
function openWithKeyboard(event: KeyboardEvent) {
  const first = event.key === 'ArrowDown'
  if (!first && event.key !== 'ArrowUp') return
  event.preventDefault()
  layer.show()
  void nextTick(() => {
    list.listRef.value = panel()
    if (first) list.focusFirst()
    else list.focusLast()
  })
}
function click(event: MouseEvent) {
  if (event.detail && press.isTriggerClickFromPress()) return
  if (layer.open.value) layer.hide()
  else {
    layer.show()
    if (event.detail === 0) void nextTick(() => {
      list.listRef.value = panel()
      list.focusFirst()
    })
  }
}
function attach(node: Element | ComponentPublicInstance | null) {
  layer.ref(node)
  trigger.value = node instanceof HTMLButtonElement ? node : null
}
</script>

<template>
  <section class="review__stack" aria-label="按下拖动选择">
    <button :ref="attach" type="button" class="sy-button" data-size="sm" data-variant="secondary"
      aria-haspopup="menu" :aria-expanded="layer.open.value" :aria-controls="layer.id" v-bind="press.triggerProps"
      @click="click" @keydown="openWithKeyboard">打开逐项操作</button>
    <Menu />
    <output class="review-menu-result"><SMotionText :value="status" truncate /></output>
  </section>
</template>

<style scoped>
.review-menu-result { justify-self: stretch; min-block-size: 1lh; min-inline-size: 0; }
</style>
