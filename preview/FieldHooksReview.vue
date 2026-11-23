<script setup lang="ts">
import { computed, ref, shallowRef, useId, useTemplateRef } from 'vue'
import { SButton, SFieldStatus, SIcon, SSegment, useInputContainer, useInputStatusIcon, type FieldStatus, type FieldStatusVariant } from '../src'
import AutoGrowNote from './AutoGrowNote.vue'

const props = defineProps<{ kind: 'input' | 'status' }>()
const id = useId()
const value = ref('')
const wrapper = useTemplateRef<HTMLDivElement>('wrapper')
const search = useTemplateRef<HTMLInputElement>('search')
const searchProps = useInputContainer({ containerRef: wrapper, inputRef: search })
const memo = ref('设计资源已归档。')
const forwarded = shallowRef<HTMLTextAreaElement | null>(null)
function forward(node: HTMLTextAreaElement | null) { forwarded.value = node }

const code = ref('')
const result = ref<FieldStatus>()
const display = ref<string | null>('attached')
const options = [
  { value: 'attached', label: '附着图标' }, { value: 'detached', label: '仅消息' }, { value: 'tooltip', label: '图标提示' },
]
const { statusIcon, describedBy } = useInputStatusIcon(() => ({
  status: result.value, statusVariant: display.value as FieldStatusVariant, size: 'sm',
}))
const messageId = computed(() => result.value ? describedBy.value ?? id + '-message' : undefined)
function validate() {
  result.value = code.value.trim().toUpperCase() === 'STUDIO20'
    ? { type: 'success', message: '工作室优惠已生效。', label: '查看优惠成功说明' }
    : { type: 'error', message: '此优惠码无效。', label: '查看优惠错误说明' }
}
</script>

<template>
  <template v-if="props.kind === 'input'">
    <section class="field-hooks" aria-label="自定义搜索输入区">
      <label :for="id">搜索归档</label>
      <div ref="wrapper" class="field-hooks__wrapper" v-bind="searchProps">
        <span data-search-affix><SIcon name="search" size="sm" color="secondary" /></span>
        <input :id="id" ref="search" v-model="value" type="search" />
        <SButton type="button" size="sm" variant="ghost" @click="value = ''">清空归档搜索</SButton>
      </div>
    </section>
    <section class="field-hooks" aria-label="自动增高便笺">
      <AutoGrowNote v-model="memo" :forward="forward" />
      <SButton size="sm" variant="secondary" @click="forwarded?.focus()">聚焦交付便笺</SButton>
    </section>
  </template>
  <section v-else class="field-hooks" aria-label="优惠码校验">
    <SSegment v-model="display" :items="options" label="优惠验证反馈位置" size="sm" />
    <form class="field-hooks" @submit.prevent="validate">
      <label :for="id">工作室优惠码</label>
      <div class="field-hooks__wrapper" :data-invalid="result?.type === 'error' || undefined">
        <input :id="id" v-model="code" placeholder="STUDIO20" :aria-describedby="messageId" :aria-invalid="result?.type === 'error' || undefined" />
        <Transition name="field-hook-status" mode="out-in">
          <component :is="statusIcon" v-if="statusIcon" :key="display + (result?.type ?? '')" />
        </Transition>
      </div>
      <SFieldStatus v-if="result && !describedBy" :id="messageId" :type="result.type" :message="result.message" variant="detached" />
      <SButton type="submit" size="sm">应用优惠码</SButton>
    </form>
  </section>
</template>

<style scoped>
.field-hooks { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.field-hooks > .sy-button { justify-self: start; }
.field-hooks__wrapper {
  display: flex; align-items: center; padding: .3rem .5rem; gap: .35rem; min-inline-size: 0;
  inline-size: min(100%, 24rem); box-sizing: border-box; background: var(--sy-canvas); border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-md);
  transition: border-color var(--sy-duration) var(--sy-ease-settle), box-shadow var(--sy-duration) var(--sy-ease-settle);
}
.field-hooks__wrapper:focus-within { border-color: var(--sy-focus); box-shadow: inset 0 0 0 1px var(--sy-focus); }
.field-hooks__wrapper[data-invalid] { border-color: var(--sy-danger); }
.field-hooks__wrapper input { flex: 1 1 auto; min-inline-size: 0; border: 0; background: transparent; color: inherit; font: inherit; padding: .4rem .15rem; outline: none; }
.field-hooks__wrapper input::-webkit-search-cancel-button { display: none; }
.field-hook-status-enter-active, .field-hook-status-leave-active { transition: opacity var(--sy-motion-replace) var(--sy-ease-settle); }
.field-hook-status-enter-from, .field-hook-status-leave-to { opacity: 0; }
</style>
