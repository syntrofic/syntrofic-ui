<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef } from 'vue'
import { SButton, SInput, SMotionText, useFocusTrap, useScrollLock } from '../src'

const panel = ref<'edit' | 'menu'>()
const title = ref('设计交付记录')
const draft = ref('')
const output = ref('')
const target = useTemplateRef<HTMLElement>('target')
const uid = useId()
function close() { panel.value = undefined }
const trap = useFocusTrap({ container: target, isActive: () => Boolean(panel.value), onEscape: close })
useScrollLock(() => panel.value === 'menu')
async function show(event: MouseEvent, next: 'edit' | 'menu') {
  const opener = event.currentTarget as HTMLElement
  opener.focus({ preventScroll: true })
  if (next === 'edit') draft.value = title.value
  panel.value = next
  await nextTick()
  trap.focusFirst()
}
function save() {
  title.value = draft.value.trim() || title.value
  output.value = '已更新为' + title.value
  close()
}
</script>

<template>
  <section class="overlay-hooks" aria-label="自定义浮层行为">
    <p><SMotionText :value="title" wrap /></p>
    <div class="review__row">
      <SButton variant="secondary" size="sm" @click="show($event, 'edit')">快速编辑名称</SButton>
      <SButton variant="secondary" size="sm" @click="show($event, 'menu')">打开全屏资料菜单</SButton>
    </div>
    <output aria-label="自定义浮层结果"><SMotionText :value="output" wrap /></output>
    <Teleport to="body">
      <Transition name="overlay-hooks">
        <div v-if="panel" class="overlay-hooks__backdrop" @click.self="close">
          <section ref="target" class="overlay-hooks__dialog" role="dialog" aria-modal="true" :aria-labelledby="uid" tabindex="-1"
            :data-full="panel === 'menu' || undefined">
            <template v-if="panel === 'edit'">
              <h2 :id="uid">快速编辑交付名称</h2>
              <form class="overlay-hooks__form" @submit.prevent="save">
                <SInput v-model="draft" label="新的交付名称" />
                <div class="review__row">
                  <SButton type="submit" size="sm">保存交付名称</SButton>
                  <SButton variant="secondary" size="sm" @click="close">退出快速编辑</SButton>
                </div>
              </form>
            </template>
            <template v-else>
              <h2 :id="uid">全屏资料菜单</h2>
              <SButton variant="secondary" size="sm" @click="close">关闭资料菜单</SButton>
              <nav aria-label="资料菜单目的地">
                <ul>
                  <li v-for="item in ['设计规范', '版本记录', '待办复核']" :key="item">
                    <SButton variant="ghost" @click="output = '已查看' + item; close()">{{ item }}</SButton>
                  </li>
                </ul>
              </nav>
            </template>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.overlay-hooks, .overlay-hooks__form { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.overlay-hooks > p { margin: 0; }
.overlay-hooks__backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 1rem; background: color-mix(in srgb, var(--sy-text) 40%, transparent); }
.overlay-hooks__dialog { display: grid; align-content: start; justify-items: start; box-sizing: border-box; inline-size: min(100%, 26rem); max-block-size: 100%; overflow: auto; gap: var(--sy-space-3); padding: 1.25rem; background: var(--sy-canvas); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-lg); box-shadow: 0 10px 36px color-mix(in srgb, var(--sy-text) 18%, transparent); }
.overlay-hooks__dialog[data-full] { inline-size: 100%; block-size: 100%; }
.overlay-hooks__dialog h2 { margin: 0; font-size: 1.125rem; }
.overlay-hooks__form { inline-size: 100%; }
.overlay-hooks__dialog nav ul { list-style: none; margin: 0; padding: 0; }
.overlay-hooks-enter-active, .overlay-hooks-leave-active { transition: opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.overlay-hooks-enter-active .overlay-hooks__dialog, .overlay-hooks-leave-active .overlay-hooks__dialog {
  transition: transform var(--sy-motion-replace) var(--sy-ease-settle);
}
.overlay-hooks-enter-from, .overlay-hooks-leave-to { opacity: 0; }
.overlay-hooks-enter-from .overlay-hooks__dialog, .overlay-hooks-leave-to .overlay-hooks__dialog { transform: translateY(.45rem) scale(.99); }
.overlay-hooks-leave-active { pointer-events: none; }
</style>
