<script setup lang="ts">
import { defineComponent, ref } from 'vue'
import { SAlertDialog, SButton, SMotionText, STooltip, useTooltip } from '../src'

const controlledOpen = ref(false)
const signal = ref('')
const result = ref('')
const removing = ref(false)
const hint = useTooltip({ placement: 'below', delay: 45, hideDelay: 100, touchTrigger: 'tap' })
const command = useTooltip({ placement: 'end', focusTrigger: 'never', touchTrigger: 'none' })
const controlled = useTooltip(() => ({
  isOpen: controlledOpen.value, onShow: () => { signal.value = '请求显示提示' },
  onHide: () => { controlledOpen.value = false },
}))
const Hint = defineComponent(() => () => hint.renderTooltip('默认保留最近三次发布。'))
const Command = defineComponent(() => () => command.renderTooltip('负责人可随时更改。'))
const Controlled = defineComponent(() => () => controlled.renderTooltip('附加说明由外部状态控制。'))
</script>

<template>
  <section class="review__row" aria-label="自定义提示行为">
    <SButton :ref="hint.ref" variant="secondary" size="sm" :aria-describedby="hint.describedBy">发布保留规则</SButton>
    <Hint />
    <SButton :ref="command.ref" variant="secondary" size="sm" :aria-describedby="command.describedBy" :aria-controls="command.describedBy"
      :aria-expanded="command.isOpen.value" @click="command.isOpen.value ? command.hide() : command.show()">查看负责规则</SButton>
    <Command />
    <SButton :ref="controlled.ref" variant="secondary" size="sm" :aria-describedby="controlled.describedBy"
      @click="controlledOpen = !controlledOpen">控制附加说明</SButton>
    <Controlled />
    <output>{{ signal }}</output>
  </section>
  <section class="tooltip-review" aria-label="文字与操作提示示例">
    <p>
      共享资料采用
      <STooltip text="每次修改都保留一个可恢复的副本。">
        <template #trigger><abbr class="tooltip-review__term" tabindex="0">版本留存</abbr></template>
      </STooltip>
      ，方便核对修改记录。
    </p>
    <div class="review__row">
      <STooltip text="保存当前交付说明。">
        <template #trigger><SButton size="sm" @click="result = '已保存交付说明'">保存说明</SButton></template>
      </STooltip>
      <STooltip text="取消本次编辑并保留已发布内容。">
        <template #trigger><SButton size="sm" variant="secondary" @click="result = '已取消编辑'">取消编辑</SButton></template>
      </STooltip>
      <STooltip text="确认后删除这份演示草稿。">
        <template #trigger><SButton size="sm" variant="danger" @click="removing = true">移除草稿</SButton></template>
      </STooltip>
    </div>
    <SAlertDialog v-model:open="removing" title="移除说明草稿？" description="请确认不再需要这次修改。" cancel-label="保留草稿"
      confirm-label="移除草稿" @confirm="result = '已移除说明草稿'" />
    <p><SMotionText :value="result" announce /></p>
  </section>
</template>

<style scoped>
.tooltip-review { display: grid; gap: var(--sy-space-2); }
.tooltip-review p { margin: 0; }
.tooltip-review__term { text-decoration: underline dotted; text-underline-offset: .2em; cursor: help; }
</style>
