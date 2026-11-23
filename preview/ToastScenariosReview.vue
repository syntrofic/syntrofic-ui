<script setup lang="ts">
import { h, ref, useId } from 'vue'
import { SButton, SInput, SLink, SMotionText, SSwitch, useToast } from '../src'

const toast = useToast()
const name = ref('林舟')
const saved = ref(name.value)
const undo = ref(saved.value)
const fails = ref(false)
const reportOpen = ref(false)
const reportId = `delivery-report-${useId()}`

function save() {
  if (fails.value) {
    toast({ body: '保存交付偏好失败', type: 'error', uniqueID: 'demo-settings' })
    return
  }
  if (name.value !== saved.value) undo.value = saved.value
  saved.value = name.value
  const previous = undo.value
  const dismiss = toast({ body: '交付偏好已保存', uniqueID: 'demo-settings', endContent: h(SButton, {
    size: 'sm', variant: 'ghost', onClick: () => { name.value = saved.value = previous; dismiss() },
  }, () => '撤销保存') })
}

function notify() {
  toast({ body: '交付摘要已就绪。' })
  toast({ body: '资源校验失败，请检查授权。', type: 'error' })
}

function report() {
  toast({ body: '交付报告已生成。', isAutoHide: false, uniqueID: 'demo-report', endContent: h(SLink, {
    href: '#' + reportId,
    onClick: () => { reportOpen.value = true },
  }, () => '阅读报告') })
}
</script>

<template>
  <section class="toast-review" aria-label="通知操作示例">
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="notify">发送普通与错误通知</SButton>
      <SButton size="sm" variant="secondary" @click="report">生成交付报告</SButton>
    </div>
    <div class="toast-review__preferences">
      <SInput v-model="name" label="通知显示名称" />
      <SSwitch v-model="fails">模拟保存失败</SSwitch>
      <div class="review__row">
        <SButton size="sm" :disabled="!name.trim()" @click="save">保存交付偏好</SButton>
        <span><SMotionText :value="'已保存 ' + saved" announce /></span>
      </div>
    </div>
    <div :id="reportId" class="toast-review__report" :data-open="reportOpen || undefined" :inert="!reportOpen">
      <div><strong>交付报告</strong><p>已检查素材清单与品牌授权。</p></div>
    </div>
  </section>
</template>

<style scoped>
.toast-review, .toast-review__preferences { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.toast-review__preferences { max-inline-size: 25rem; }
.toast-review__report { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-duration) var(--sy-ease-settle); }
.toast-review__report[data-open] { grid-template-rows: 1fr; opacity: 1; }
.toast-review__report > div { min-block-size: 0; overflow: clip; }
.toast-review__report p { margin: 3px 0 0; color: var(--sy-text-muted); }
@media (prefers-reduced-motion: reduce) { .toast-review__report { transition: none; } }
</style>
