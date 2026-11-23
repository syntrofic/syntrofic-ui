<script setup lang="ts">
import { computed, onScopeDispose, ref, useTemplateRef } from 'vue'
import { SAlertDialog, SButton, SCard, SEmptyState, SIcon, SInput, SMotionText, SSwitch } from '../src'

defineProps<{ kind: 'empty' | 'alert' }>()
const query = ref('草稿')
const search = useTemplateRef<InstanceType<typeof SInput>>('search')
const records = ['交付说明', '预览材料', '最终设计稿']
const visible = computed(() => records.filter(name => name.includes(query.value.trim())))
const projectName = ref('')
const project = ref('')
const creating = ref(false)
function setFilter(value: string) {
  query.value = value
  search.value?.focus()
}
function createProject() {
  const name = projectName.value.trim()
  if (!name) return
  project.value = name
  creating.value = false
}

const removal = ref(false)
const requestPending = ref(false)
const online = ref(true)
const failure = ref('')
const result = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
function resetRequest() {
  clearTimeout(timer)
  requestPending.value = false
  failure.value = ''
}
function removeRecord() {
  if (requestPending.value) return
  failure.value = ''
  requestPending.value = true
  timer = setTimeout(() => {
    requestPending.value = false
    if (!online.value) { failure.value = '交付目录暂不可用，请恢复连接后重试。'; return }
    removal.value = false
    result.value = '已删除过期记录'
  }, 550)
}
onScopeDispose(resetRequest)
</script>

<template>
  <section v-if="kind === 'empty'" class="empty-alert-scenarios" aria-label="搜索和初始化空状态">
    <section class="empty-alert-scenarios" aria-label="资料筛选结果">
      <SInput ref="search" v-model="query" label="查找归档资料" />
      <Transition name="sy-standard-fade" mode="out-in">
        <SEmptyState v-if="!visible.length" title="找不到归档资料" description="可以清除筛选或使用其他关键词。" heading="h3" align="center" status="polite">
          <template #media><SIcon name="search" size="lg" /></template>
          <template #actions>
            <SButton size="sm" @click="setFilter('')">清除资料筛选</SButton>
            <SButton size="sm" variant="secondary" @click="setFilter('交付')">查找交付资料</SButton>
          </template>
        </SEmptyState>
        <ul v-else aria-label="匹配资料"><li v-for="name in visible" :key="name">{{ name }}</li></ul>
      </Transition>
    </section>
    <div class="review__columns">
      <SCard aria-label="通知面板">
        <SEmptyState title="没有新的评审通知" description="有回复时会出现在这里。" size="sm">
          <template #media><SIcon name="bell" size="sm" /></template>
        </SEmptyState>
      </SCard>
      <SCard aria-label="项目初始化">
        <Transition name="sy-standard-fade" mode="out-in">
          <form v-if="creating" class="empty-alert-scenarios" @submit.prevent="createProject">
            <SInput v-model="projectName" label="新项目名称" required autofocus />
            <SButton type="submit" size="sm">保存项目</SButton>
          </form>
          <p v-else-if="project" role="status"><SMotionText :value="'已创建项目「' + project + '」'" /></p>
          <SEmptyState v-else title="还没有交付项目" description="创建项目后可以上传资料和设置评审人员。" size="lg" heading="h3">
            <template #media><SIcon name="folder" size="lg" /></template>
            <template #actions><SButton size="sm" @click="creating = true">创建交付项目</SButton></template>
          </SEmptyState>
        </Transition>
      </SCard>
    </div>
  </section>
  <section v-else class="empty-alert-scenarios" aria-label="异步删除确认">
    <SSwitch v-model="online">交付目录可用</SSwitch>
    <SButton size="sm" variant="danger" @click="resetRequest(); removal = true">删除过期记录</SButton>
    <SAlertDialog v-model:open="removal" title="删除过期记录？" description="该操作会移除本地示例中的过期条目。"
      :pending="requestPending" :close-on-confirm="false" confirm-label="确认删除记录" cancel-label="保留记录"
      @confirm="removeRecord" @cancel="resetRequest">
      <p class="empty-alert-scenarios__error" role="status"><SMotionText :value="failure" /></p>
      <SButton v-if="failure && !online" size="sm" variant="ghost" @click="online = true">恢复示例连接</SButton>
    </SAlertDialog>
    <p role="status" aria-label="过期记录操作结果"><SMotionText :value="result" /></p>
  </section>
</template>

<style scoped>
.empty-alert-scenarios { display: grid; justify-items: start; min-inline-size: 0; gap: var(--sy-space-3); }
.empty-alert-scenarios > :where(.review__columns, section, .sy-field) { inline-size: 100%; }
.empty-alert-scenarios :where(p, ul) { margin: 0; }
.empty-alert-scenarios__error { color: var(--sy-danger); }
.empty-alert-scenarios__error:has(.sy-visually-hidden:empty) { display: none; }
</style>
